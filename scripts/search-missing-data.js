const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 30;
const SEARCH_TYPE = process.argv[2] || 'logo'; // 'logo' or 'hours'
const BATCH_NUM = parseInt(process.argv[3]) || 1;

async function getUniqueRestaurantsMissingData(type) {
  if (type === 'logo') {
    const { data } = await supabase
      .from('mall_outlets')
      .select('name')
      .is('thumbnail_url', null)
      .order('name');
    return [...new Set(data.map(o => o.name.trim()))].sort();
  } else {
    const { data } = await supabase
      .from('mall_outlets')
      .select('name')
      .is('opening_hours', null)
      .order('name');
    return [...new Set(data.map(o => o.name.trim()))].sort();
  }
}

async function searchGoogle(page, query) {
  try {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Extract search results
    const results = await page.evaluate(() => {
      const items = [];

      // Get featured snippet or knowledge panel info
      const knowledgePanel = document.querySelector('[data-attrid="kc:/location/location:hours"]');
      if (knowledgePanel) {
        items.push({ type: 'hours', text: knowledgePanel.innerText });
      }

      // Get image results
      const images = document.querySelectorAll('img[data-src], g-img img');
      images.forEach(img => {
        const src = img.getAttribute('data-src') || img.src;
        if (src && src.startsWith('http') && !src.includes('google')) {
          items.push({ type: 'image', url: src });
        }
      });

      // Get text snippets for hours
      const snippets = document.querySelectorAll('.VwiC3b, .lEBKkf');
      snippets.forEach(el => {
        const text = el.innerText;
        if (text.match(/\d{1,2}[:.]\d{2}\s*(am|pm|AM|PM)/i) ||
            text.match(/open|close|hours|daily/i)) {
          items.push({ type: 'hours', text: text.substring(0, 200) });
        }
      });

      return items;
    });

    return results;
  } catch (e) {
    console.log(`  Error searching: ${e.message.substring(0, 50)}`);
    return [];
  }
}

async function searchForLogo(page, restaurantName) {
  const query = `${restaurantName} Singapore logo`;
  console.log(`  Searching: ${query}`);

  // Use Bing Images
  try {
    await page.goto(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Get actual image source URLs from the data attributes
    const imageUrl = await page.evaluate(() => {
      const elements = document.querySelectorAll('.iusc');
      for (const el of elements) {
        try {
          const m = el.getAttribute('m');
          if (m) {
            const data = JSON.parse(m);
            if (data.murl && data.murl.startsWith('http')) {
              // Skip very small images or icons
              return data.murl;
            }
          }
        } catch (e) {}
      }
      return null;
    });

    return imageUrl;
  } catch (e) {
    console.log(`  Error: ${e.message.substring(0, 50)}`);
    return null;
  }
}

async function searchForHours(page, restaurantName) {
  const query = `${restaurantName} Singapore opening hours`;
  console.log(`  Searching: ${query}`);

  try {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Try to find hours in knowledge panel or search results
    const hours = await page.evaluate(() => {
      // Check knowledge panel
      const hoursEl = document.querySelector('[data-attrid*="hours"], .wDYxhc');
      if (hoursEl) {
        const text = hoursEl.innerText;
        if (text.match(/\d{1,2}[:.]\d{2}/)) {
          return text.substring(0, 100);
        }
      }

      // Check snippets
      const snippets = document.querySelectorAll('.VwiC3b');
      for (const el of snippets) {
        const text = el.innerText;
        if (text.match(/\d{1,2}[:.]\d{2}\s*(am|pm|AM|PM|-)/i)) {
          return text.substring(0, 100);
        }
      }

      return null;
    });

    return hours;
  } catch (e) {
    console.log(`  Error: ${e.message.substring(0, 50)}`);
    return null;
  }
}

async function updateDatabase(restaurantName, type, value) {
  if (!value) return 0;

  const field = type === 'logo' ? 'thumbnail_url' : 'opening_hours';
  const condition = type === 'logo'
    ? { thumbnail_url: null }
    : { opening_hours: null };

  // Update all outlets with this name that are missing the data
  const { data, error } = await supabase
    .from('mall_outlets')
    .update({ [field]: value })
    .eq('name', restaurantName)
    .is(field, null)
    .select();

  if (error) {
    console.log(`  DB Error: ${error.message}`);
    return 0;
  }

  return data?.length || 0;
}

async function main() {
  console.log(`=== SEARCHING FOR MISSING ${SEARCH_TYPE.toUpperCase()}S - BATCH ${BATCH_NUM} ===\n`);

  const restaurants = await getUniqueRestaurantsMissingData(SEARCH_TYPE);
  const startIdx = (BATCH_NUM - 1) * BATCH_SIZE;
  const batch = restaurants.slice(startIdx, startIdx + BATCH_SIZE);

  console.log(`Total missing: ${restaurants.length}`);
  console.log(`Processing batch ${BATCH_NUM}: items ${startIdx + 1} to ${startIdx + batch.length}\n`);

  if (batch.length === 0) {
    console.log('No more items to process!');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set user agent to avoid bot detection
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  let found = 0;
  let updated = 0;

  for (let i = 0; i < batch.length; i++) {
    const name = batch[i];
    console.log(`[${i + 1}/${batch.length}] ${name}`);

    let result;
    if (SEARCH_TYPE === 'logo') {
      result = await searchForLogo(page, name);
    } else {
      result = await searchForHours(page, name);
    }

    if (result) {
      found++;
      console.log(`  Found: ${result.substring(0, 60)}...`);

      const count = await updateDatabase(name, SEARCH_TYPE, result);
      updated += count;
      console.log(`  Updated ${count} outlets`);
    } else {
      console.log(`  Not found`);
    }

    // Small delay to avoid rate limiting
    await page.waitForTimeout(1500);
  }

  await browser.close();

  console.log(`\n=== COMPLETE ===`);
  console.log(`Found: ${found}/${batch.length}`);
  console.log(`Outlets updated: ${updated}`);
  console.log(`\nRun next batch: node scripts/search-missing-data.js ${SEARCH_TYPE} ${BATCH_NUM + 1}`);
}

main().catch(console.error);

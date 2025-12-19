const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'orchard-gateway';

function getCategory(name, originalCategory) {
  const nameLower = name.toLowerCase();
  const catLower = (originalCategory || '').toLowerCase();

  // If original category indicates it's not F&B, skip
  if (catLower && !catLower.includes('food') && !catLower.includes('beverage')) {
    return null; // Not F&B
  }

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('coffeesmith')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('tonkatsu')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('kimchi')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('bar') || nameLower.includes('beer') || nameLower.includes('wine') ||
      nameLower.includes('pub') || nameLower.includes('cocktail')) {
    return 'bar, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-orchard-gateway';
}

async function findExistingThumbnail(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('thumbnail_url, name')
    .not('thumbnail_url', 'is', null)
    .limit(1000);

  if (data) {
    // Exact match first
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.thumbnail_url) {
        return outlet.thumbnail_url;
      }
    }
    // Partial match
    for (const outlet of data) {
      const outletName = outlet.name.toLowerCase().trim();
      if ((searchName.includes(outletName) || outletName.includes(searchName)) &&
          outlet.thumbnail_url && searchName.length > 3 && outletName.length > 3) {
        return outlet.thumbnail_url;
      }
    }
  }
  return null;
}

async function findExistingOpeningHours(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('opening_hours, name')
    .not('opening_hours', 'is', null)
    .limit(1000);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.opening_hours) {
        return outlet.opening_hours;
      }
    }
  }
  return null;
}

async function scrapeOrchardGateway() {
  console.log('=== SCRAPING ORCHARD GATEWAY ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Orchard Gateway directory...');
    await page.goto('https://orchardgateway.sg/directory', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Click on category dropdown and select Food & Beverage
    console.log('Filtering by Food & Beverage...');
    try {
      const categoryBtn = await page.locator('text=All Category').first();
      await categoryBtn.click();
      await page.waitForTimeout(1000);

      const fnbOption = await page.locator('text=Food & Beverage').first();
      await fnbOption.click();
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Could not filter by category, continuing with all stores...');
    }

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Extract stores from the page - each store card is a flex-col div with bg-[#F8F8F8]
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find all store cards
      document.querySelectorAll('div.cursor-pointer').forEach(card => {
        // Get store name from the bold span
        const nameEl = card.querySelector('span.font-bold');
        const name = nameEl?.textContent?.trim();
        if (!name || name.length < 2) return;

        // Get image
        const img = card.querySelector('img[alt]:not([alt="Location"])');
        const imageUrl = img?.src && !img.src.startsWith('data:') ? img.src : null;

        // Get unit number - it's in a span after the map-pin icon
        const spans = card.querySelectorAll('span');
        let level = '';
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (text && text.startsWith('#')) {
            level = text;
            break;
          }
        }

        // Get category - it's in the rounded-full div
        const categoryEl = card.querySelector('div.rounded-full');
        const category = categoryEl?.textContent?.trim() || '';

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name,
            level,
            category,
            imageUrl
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} F&B stores`);

    // All stores are already F&B since we filtered
    const fnbStores = stores;

    if (fnbStores.length === 0) {
      console.log('No F&B stores found, saving debug...');
      await page.screenshot({ path: 'orchardgateway-debug.png', fullPage: true });
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.level}) [${store.category}] ${store.imageUrl ? '✓img' : ''}`);
    }

    // Delete existing outlets for this mall
    console.log('\nRemoving existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import new outlets
    console.log('\nImporting outlets...');
    let imported = 0;
    for (const store of fnbStores) {
      let thumbnail = store.imageUrl;
      let hours = null;

      // Try to find existing thumbnail if none scraped
      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      // Try to find existing opening hours
      hours = await findExistingOpeningHours(store.name);
      if (hours) console.log(`    Found existing hours for ${store.name}`);

      const category = getCategory(store.name, store.category);

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.level || '',
          category: category,
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  ✓ ${store.name} (${store.level || 'no unit'})`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}/${fnbStores.length} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'orchardgateway-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeOrchardGateway();

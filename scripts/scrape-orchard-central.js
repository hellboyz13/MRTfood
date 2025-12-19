const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'orchard-central';

function getCategory(name, originalCategory) {
  const nameLower = name.toLowerCase();
  const catLower = (originalCategory || '').toLowerCase();

  // Check if it's F&B based on original category
  const isFnB = catLower.includes('food') || catLower.includes('beverage') ||
                catLower.includes('cafe') || catLower.includes('restaurant') ||
                catLower.includes('dessert') || catLower.includes('dining');

  if (!isFnB) {
    return null; // Not F&B
  }

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      catLower.includes('cafe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie') ||
      catLower.includes('bakery')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop') ||
      catLower.includes('fast food')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('tonkatsu') || nameLower.includes('aburi') ||
      catLower.includes('japanese')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('kimchi') ||
      catLower.includes('korean')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao') ||
      catLower.includes('chinese')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum') || catLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('bar') || nameLower.includes('beer') || nameLower.includes('wine') ||
      nameLower.includes('pub') || nameLower.includes('cocktail') ||
      catLower.includes('bar')) {
    return 'bar, drinks';
  }
  if (catLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('gelato')) {
    return 'dessert, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-orchard-central';
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

async function scrapeOrchardCentral() {
  console.log('=== SCRAPING ORCHARD CENTRAL ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Orchard Central directory...');
    await page.goto('https://www.fareastmalls.com.sg/en/orchard-central/shops?s=', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Click Load More to load all stores
    console.log('Loading all stores (clicking Load More)...');
    for (let i = 0; i < 15; i++) {
      try {
        const loadMore = await page.locator('.b-load-more-shops').first();
        if (await loadMore.isVisible()) {
          await loadMore.click();
          console.log(`  Loaded page ${i + 2}...`);
          await page.waitForTimeout(2000);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Extract all stores - use .b-store-details as the anchor
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const baseUrl = 'https://www.fareastmalls.com.sg';

      document.querySelectorAll('.b-store-details').forEach(details => {
        const titleEl = details.querySelector('.b-store-title');
        const unitEl = details.querySelector('.b-store-unit');
        const typeEl = details.querySelector('.b-store-type');

        // Find the parent card to get the image
        const card = details.closest('a') || details.parentElement;
        const imgEl = card?.querySelector('.b-store-image img');

        // Get name - remove the voucher icon div text
        let name = titleEl?.textContent?.trim() || '';
        // Clean up the name (remove extra whitespace)
        name = name.replace(/\s+/g, ' ').trim();

        if (!name || name.length < 2) return;

        const level = unitEl?.textContent?.trim() || '';
        const category = typeEl?.textContent?.trim() || '';

        let imageUrl = imgEl?.src || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = baseUrl + imageUrl;
        }

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name,
            level,
            category,
            imageUrl: imageUrl || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} total stores`);

    // Filter for F&B only
    const fnbStores = stores.filter(s => {
      const cat = getCategory(s.name, s.category);
      return cat !== null;
    });

    console.log(`Found ${fnbStores.length} F&B stores`);

    if (fnbStores.length === 0) {
      console.log('No F&B stores found, saving debug...');
      await page.screenshot({ path: 'orchard-central-debug.png', fullPage: true });
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

      // Try to find existing thumbnail if none scraped or if it's a placeholder
      if (!thumbnail || thumbnail.includes('fem-logo-resizing')) {
        const existingThumb = await findExistingThumbnail(store.name);
        if (existingThumb) {
          thumbnail = existingThumb;
          console.log(`    Found existing thumbnail for ${store.name}`);
        }
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
    await page.screenshot({ path: 'orchard-central-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeOrchardCentral();

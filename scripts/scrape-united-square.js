const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'united-square';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chicha') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('gong cha') ||
      nameLower.includes('tea')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast box')) {
    return 'cafe, food';
  }
  if (nameLower.includes('breadtalk') || nameLower.includes('bakery') || nameLower.includes('duke') ||
      nameLower.includes('old chang kee') || nameLower.includes('polar') || nameLower.includes('bengawan') ||
      nameLower.includes('cone')) {
    return 'bakery, food';
  }
  if (nameLower.includes('burger king') || nameLower.includes('kfc') || nameLower.includes('mcdonald') ||
      nameLower.includes('subway') || nameLower.includes('long john')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('genki') || nameLower.includes('japanese') ||
      nameLower.includes('ramen') || nameLower.includes('yakiniku')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('k-') ||
      nameLower.includes('ajumma')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('pot noodle') ||
      nameLower.includes('chinese') || nameLower.includes('tradition')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('laksa') || nameLower.includes('katong') || nameLower.includes('redhill') ||
      nameLower.includes('local') || nameLower.includes('kopitiam')) {
    return 'local, food';
  }
  if (nameLower.includes('brauhaus') || nameLower.includes('western') || nameLower.includes('grill') ||
      nameLower.includes('pub') || nameLower.includes('bottle shop')) {
    return 'western, food';
  }
  if (nameLower.includes('food dynasty') || nameLower.includes('food court') || nameLower.includes('kopitiam') ||
      nameLower.includes('koufu')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-united-square';
}

async function scrapeAndImport() {
  console.log('=== SCRAPING UNITED SQUARE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allStores = [];

  try {
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
      const url = pageNum === 1
        ? 'https://www.unitedsquare.com.sg/stores-category/food-beverages/'
        : `https://www.unitedsquare.com.sg/stores-category/food-beverages/page/${pageNum}/`;

      console.log(`Fetching page ${pageNum}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);

      const stores = await page.evaluate(() => {
        const results = [];
        // Look for store items
        const items = document.querySelectorAll('.store-item, .tenant-item, article, [class*="store"]');

        items.forEach(item => {
          const nameEl = item.querySelector('h2, h3, h4, .store-name, .title, [class*="name"], [class*="title"]');
          const name = nameEl?.textContent?.trim();
          const unitEl = item.querySelector('.unit, .location, [class*="unit"], [class*="level"]');
          const unit = unitEl?.textContent?.trim() || '';
          const img = item.querySelector('img');
          const imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 1 && name.length < 100) {
            results.push({ name, unit, imageUrl: imgUrl || null });
          }
        });

        return results;
      });

      console.log(`Found ${stores.length} stores on page ${pageNum}`);
      allStores.push(...stores);

      // Check if there's a next page
      const nextExists = await page.evaluate(() => {
        const nextLink = document.querySelector('.next, a[rel="next"], .pagination a:last-child');
        return nextLink && !nextLink.classList.contains('disabled');
      });

      if (stores.length === 0 || !nextExists || pageNum >= 10) {
        hasMore = false;
      } else {
        pageNum++;
      }
    }

    // Dedupe
    const uniqueStores = [];
    const seenNames = new Set();

    for (const store of allStores) {
      const normalizedName = store.name.toLowerCase().trim();
      if (!seenNames.has(normalizedName) && normalizedName.length > 1) {
        seenNames.add(normalizedName);
        uniqueStores.push(store);
      }
    }

    console.log(`\nTotal unique stores: ${uniqueStores.length}\n`);
    uniqueStores.forEach(s => console.log(`- ${s.name} (${s.unit})`));

    if (uniqueStores.length < 3) {
      console.log('\nToo few stores found.');
      await page.screenshot({ path: 'united-square-debug.png', fullPage: true });
      return;
    }

    // Delete existing
    console.log('\nStep 1: Removing existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing && existing.length > 0) {
      console.log(`Found ${existing.length} existing outlets to remove`);
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
    }

    // Import
    console.log('\nStep 2: Importing outlets...');
    let imported = 0;
    let failed = 0;

    for (const store of uniqueStores) {
      const category = getCategory(store.name);
      const id = generateId(store.name);

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: id,
          name: store.name,
          mall_id: MALL_ID,
          level: store.unit,
          category: category,
          thumbnail_url: store.imageUrl,
          tags: []
        });

      if (error) {
        console.log(`Error: ${store.name} - ${error.message}`);
        failed++;
      } else {
        console.log(`Imported: ${store.name} (${category})`);
        imported++;
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}, Failed: ${failed}`);

    const { data: final } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);
    console.log(`Total outlets at United Square: ${final?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeAndImport();

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'vista-point';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('gong cha') ||
      nameLower.includes('tea') || nameLower.includes('juice')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('cafe') ||
      nameLower.includes('café') || nameLower.includes('toast box') || nameLower.includes('ya kun')) {
    return 'cafe, food';
  }
  if (nameLower.includes('breadtalk') || nameLower.includes('bakery') || nameLower.includes('bengawan') ||
      nameLower.includes('old chang kee') || nameLower.includes('polar') || nameLower.includes('cake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('pizza hut')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('k-')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('noodle')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('western') || nameLower.includes('grill') || nameLower.includes('steak')) {
    return 'western, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('koufu') ||
      nameLower.includes('food junction')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-vista-point';
}

async function scrapeAndImport() {
  console.log('=== SCRAPING VISTA POINT ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.hdb.gov.sg/residential/where2shop/explore/woodlands/vista-point', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Scroll to load content
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }

    // Get stores from the page
    const stores = await page.evaluate(() => {
      const results = [];

      // Look for shop listings
      const items = document.querySelectorAll('[class*="shop"], [class*="store"], [class*="tenant"], .card, article, li');

      items.forEach(item => {
        const nameEl = item.querySelector('h2, h3, h4, h5, [class*="name"], [class*="title"], strong');
        const name = nameEl?.textContent?.trim();
        const unitEl = item.querySelector('[class*="unit"], [class*="address"], small');
        const unit = unitEl?.textContent?.trim() || '';

        if (name && name.length > 2 && name.length < 100 &&
            !name.includes('Vista Point') && !name.includes('Where2Shop')) {
          results.push({ name, unit, imageUrl: null });
        }
      });

      // Also try to get from any tables
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 1) {
            const name = cells[0]?.textContent?.trim();
            const unit = cells[1]?.textContent?.trim() || '';
            if (name && name.length > 2 && name.length < 100) {
              results.push({ name, unit, imageUrl: null });
            }
          }
        });
      });

      return results;
    });

    console.log(`Found ${stores.length} stores`);

    // Dedupe
    const uniqueStores = [];
    const seenNames = new Set();

    for (const store of stores) {
      const normalizedName = store.name.toLowerCase().trim();
      if (!seenNames.has(normalizedName) && normalizedName.length > 2) {
        seenNames.add(normalizedName);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique stores: ${uniqueStores.length}\n`);
    uniqueStores.forEach(s => console.log(`- ${s.name}`));

    if (uniqueStores.length < 3) {
      console.log('\nToo few stores found. Saving screenshot...');
      await page.screenshot({ path: 'vista-point-debug.png', fullPage: true });

      // Get page text for debugging
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('\nPage text preview:', pageText.substring(0, 2000));
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

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'vista-point-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeAndImport();

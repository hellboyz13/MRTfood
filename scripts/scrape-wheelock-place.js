const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'wheelock-place';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chicha') || nameLower.includes('starbucks')) {
    return 'cafe, food';
  }
  if (nameLower.includes('breadtalk') || nameLower.includes('toast box') || nameLower.includes('délifrance')) {
    return 'bakery, food';
  }
  if (nameLower.includes('café') || nameLower.includes('cafe') || nameLower.includes('cedele') || nameLower.includes('privé')) {
    return 'cafe, food';
  }
  if (nameLower.includes('kaisendon') || nameLower.includes('sun with moon') || nameLower.includes('uya') || nameLower.includes('japanese')) {
    return 'japanese, food';
  }
  if (nameLower.includes('namnam') || nameLower.includes('vietnamese') || nameLower.includes('noodle bar')) {
    return 'vietnamese, food';
  }
  if (nameLower.includes('mediterranean') || nameLower.includes('pistachio') || nameLower.includes('grill')) {
    return 'western, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-wheelock-place';
}

async function scrapeAndImport() {
  console.log('=== SCRAPING WHEELOCK PLACE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://wheelockplacemall.com/store-category/food-drink/', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for the store listings to load
    await page.waitForSelector('.store', { timeout: 10000 });

    // Get all store items using the correct selector
    const stores = await page.evaluate(() => {
      const results = [];
      const storeElements = document.querySelectorAll('.store');

      storeElements.forEach(el => {
        const nameEl = el.querySelector('.storename');
        const name = nameEl?.textContent?.trim();
        const img = el.querySelector('img');
        const imgUrl = img?.src || img?.getAttribute('data-src');

        if (name && name.length > 0 && !name.includes('Food + Drink')) {
          results.push({
            name: name,
            imageUrl: imgUrl || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores\n`);

    // Delete existing outlets at Wheelock Place
    console.log('Step 1: Removing existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing && existing.length > 0) {
      console.log(`Found ${existing.length} existing outlets to remove`);
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    } else {
      console.log('No existing outlets found');
    }

    // Import new outlets
    console.log('\nStep 2: Importing outlets...');
    let imported = 0;
    let failed = 0;

    // Track unique names to avoid duplicates
    const seenNames = new Set();

    for (const store of stores) {
      // Skip duplicates
      if (seenNames.has(store.name.toLowerCase())) {
        continue;
      }
      seenNames.add(store.name.toLowerCase());

      const category = getCategory(store.name);
      const id = generateId(store.name);

      const { error: insertError } = await supabase
        .from('mall_outlets')
        .insert({
          id: id,
          name: store.name,
          mall_id: MALL_ID,
          level: '',
          category: category,
          thumbnail_url: store.imageUrl,
          tags: []
        });

      if (insertError) {
        console.log(`Error inserting ${store.name}: ${insertError.message}`);
        failed++;
        continue;
      }

      console.log(`Imported: ${store.name} (${category}) - ${store.imageUrl ? 'with image' : 'no image'}`);
      imported++;
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Failed: ${failed}`);

    // Get final count
    const { data: finalCount } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    console.log(`\nTotal outlets at Wheelock Place: ${finalCount?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeAndImport();

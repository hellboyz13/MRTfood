const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'waterway-point';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('chagee')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('cedele')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger king') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('jollibee') ||
      nameLower.includes('pizza hut') || nameLower.includes('popeyes')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('ajumma')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('ma la')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('fish & co')) {
    return 'western, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-waterway-point';
}

async function scrapeAndImport() {
  console.log('=== SCRAPING WATERWAY POINT ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.waterwaypoint.com.sg/stores?tag=cafe,fast-food,restaurant', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait longer for page to fully load
    await page.waitForTimeout(5000);

    // Scroll to load all stores
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Get all store items - look for store listing items
    const stores = await page.evaluate(() => {
      const results = [];

      // Try multiple selectors
      const selectors = [
        '.store-listing .item',
        '.storelisting .item',
        '[class*="store-listing"] [class*="item"]',
        '.listing .item',
        'a[href*="/stores/"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // For links, extract name from href or text
          if (el.tagName === 'A') {
            const href = el.getAttribute('href');
            if (href && href.includes('/stores/')) {
              const name = el.textContent?.trim() || href.split('/stores/')[1]?.replace(/-/g, ' ');
              const img = el.querySelector('img') || el.closest('.item')?.querySelector('img');
              const imgUrl = img?.src;
              if (name && name.length > 2 && name.length < 80) {
                results.push({ name, imageUrl: imgUrl || null });
              }
            }
          } else {
            const nameEl = el.querySelector('h2, h3, h4, .store-name, [class*="title"], [class*="name"]');
            const name = nameEl?.textContent?.trim();
            const img = el.querySelector('img');
            const imgUrl = img?.src;
            if (name && name.length > 2 && name.length < 80) {
              results.push({ name, imageUrl: imgUrl || null });
            }
          }
        });
      }

      return results;
    });

    console.log(`Found ${stores.length} stores from selectors`);

    // If still no results, try to get all store links
    const storeLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const storeUrls = [];
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('/stores/') && !href.endsWith('/stores') && !href.endsWith('/stores/')) {
          const storeName = href.split('/stores/')[1]?.split('?')[0]?.replace(/-/g, ' ');
          if (storeName && storeName.length > 2) {
            const img = link.querySelector('img');
            storeUrls.push({
              name: storeName.charAt(0).toUpperCase() + storeName.slice(1),
              imageUrl: img?.src || null,
              href: href
            });
          }
        }
      });
      return storeUrls;
    });

    console.log(`Found ${storeLinks.length} store links`);

    // Combine and dedupe
    const allStores = [...stores, ...storeLinks];
    const uniqueStores = [];
    const seenNames = new Set();

    for (const store of allStores) {
      const normalizedName = store.name.toLowerCase().trim();
      // Filter out junk
      if (seenNames.has(normalizedName) ||
          normalizedName.includes('skip') ||
          normalizedName.includes('accessibility') ||
          normalizedName.includes('filter') ||
          normalizedName.includes('clear') ||
          normalizedName.length < 3) {
        continue;
      }
      seenNames.add(normalizedName);
      uniqueStores.push(store);
    }

    console.log(`Total unique stores: ${uniqueStores.length}\n`);

    // List found stores
    uniqueStores.forEach(s => console.log(`- ${s.name}`));

    if (uniqueStores.length < 5) {
      console.log('\nToo few stores found. Saving screenshot for debugging...');
      await page.screenshot({ path: 'waterway-debug.png', fullPage: true });

      // Get page HTML for debugging
      const html = await page.content();
      require('fs').writeFileSync('waterway-debug.html', html);
      console.log('Saved debug files');
      return;
    }

    // Delete existing outlets
    console.log('\nStep 1: Removing existing outlets...');
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

    for (const store of uniqueStores) {
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

    console.log(`\nTotal outlets at Waterway Point: ${finalCount?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeAndImport();

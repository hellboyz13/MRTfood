const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'ion-orchard';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('tea') || nameLower.includes('juice')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('royce') ||
      nameLower.includes('godiva') || nameLower.includes('chocolate')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('long john')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki') ||
      nameLower.includes('ippudo') || nameLower.includes('gyoza') || nameLower.includes('tempura')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('canton') || nameLower.includes('chinese')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steakhouse') || nameLower.includes('steak') ||
      nameLower.includes('italian') || nameLower.includes('french') || nameLower.includes('grill')) {
    return 'western, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food opera') ||
      nameLower.includes('food republic')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-ion-orchard';
}

async function scrapeAndImport() {
  console.log('=== SCRAPING ION ORCHARD ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Go to the brands A-Z page which has a complete list
    await page.goto('https://www.ionorchard.com/en/brands/a-z.html', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Click on Food & Beverage / Dining filter if available
    try {
      const filterBtn = await page.$('text=Food');
      if (filterBtn) await filterBtn.click();
      await page.waitForTimeout(2000);
    } catch(e) {}

    // Scroll to load all stores
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Get all store items - look for brand cards/items
    const stores = await page.evaluate(() => {
      const results = [];

      // Look for brand listing items - ION uses specific structures
      const brandItems = document.querySelectorAll('[class*="brand-item"], [class*="brand-card"], .brand, [data-brand]');
      brandItems.forEach(el => {
        const nameEl = el.querySelector('[class*="name"], [class*="title"], h2, h3, h4, span');
        const name = nameEl?.textContent?.trim();
        const img = el.querySelector('img');
        const imgUrl = img?.src || img?.getAttribute('data-src');
        if (name && name.length > 2 && name.length < 80) {
          results.push({ name, imageUrl: imgUrl || null, level: '' });
        }
      });

      // Also try links that go to store pages
      const storeLinks = document.querySelectorAll('a[href*="/store/"], a[href*="/brand/"], a[href*="/tenant/"]');
      storeLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const name = link.textContent?.trim() || link.querySelector('[class*="name"], span')?.textContent?.trim();
        const img = link.querySelector('img');
        const imgUrl = img?.src;

        // Extract store name from URL if no text
        let storeName = name;
        if (!storeName || storeName.length < 2) {
          const match = href.match(/\/(store|brand|tenant)\/([^\/\?]+)/);
          if (match) {
            storeName = match[2].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
        }

        if (storeName && storeName.length > 2 && storeName.length < 80) {
          results.push({ name: storeName, imageUrl: imgUrl || null, level: '' });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from brands page`);

    // Now go to dine page for F&B specific
    await page.goto('https://www.ionorchard.com/en/dine.html', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Scroll to load all
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Get dining stores
    const diningStores = await page.evaluate(() => {
      const results = [];

      // Look for store cards on dine page
      const cards = document.querySelectorAll('[class*="card"], [class*="item"], [class*="store"], [class*="listing"] > div');
      cards.forEach(card => {
        const nameEl = card.querySelector('[class*="name"], [class*="title"], h2, h3, h4');
        let name = nameEl?.textContent?.trim();

        // Skip navigation/category items
        if (!name || name.length < 2 || name.length > 80) return;
        const lowerName = name.toLowerCase();
        if (lowerName.includes('view all') || lowerName.includes('load more') ||
            lowerName.includes('see all') || lowerName.includes('filter') ||
            lowerName.includes('category') || lowerName.includes('search') ||
            lowerName === 'shop' || lowerName === 'dine' || lowerName === 'deals' ||
            lowerName.includes('watches') || lowerName.includes('jewellery') ||
            lowerName.includes('fashion') || lowerName.includes('beauty') ||
            lowerName.includes('lifestyle') || lowerName.includes('wellness') ||
            lowerName.includes('handbag') || lowerName.includes('luxury') ||
            lowerName.includes('featured') || lowerName.includes('brands a')) return;

        const img = card.querySelector('img');
        const imgUrl = img?.src || img?.getAttribute('data-src');
        const levelEl = card.querySelector('[class*="level"], [class*="unit"], [class*="location"]');
        const level = levelEl?.textContent?.trim() || '';

        results.push({ name, imageUrl: imgUrl || null, level });
      });

      // Also get from links
      const links = document.querySelectorAll('a[href*="/store/"]');
      links.forEach(link => {
        const href = link.getAttribute('href') || '';
        let name = link.querySelector('[class*="name"], h3, h4, span')?.textContent?.trim();

        if (!name || name.length < 2) {
          const match = href.match(/\/store\/([^\/\?]+)/);
          if (match) {
            name = match[1].replace(/-/g, ' ').toUpperCase();
          }
        }

        if (!name || name.length < 2 || name.length > 80) return;
        const lowerName = name.toLowerCase();
        if (lowerName === 'shop' || lowerName === 'dine' || lowerName === 'deals' ||
            lowerName.includes('category') || lowerName.includes('featured')) return;

        const img = link.querySelector('img');
        const imgUrl = img?.src;

        results.push({ name, imageUrl: imgUrl || null, level: '' });
      });

      return results;
    });

    console.log(`Found ${diningStores.length} stores from dine page`);

    // Combine all results
    const allStores = [...stores, ...diningStores];
    const uniqueStores = [];
    const seenNames = new Set();

    // Filter garbage entries
    const garbagePatterns = ['shop', 'dine', 'deals', 'watches', 'jewellery', 'fashion',
      'beauty', 'lifestyle', 'wellness', 'handbag', 'luxury', 'featured', 'brands a',
      'category', 'see all', 'view all', 'load more', 'filter', 'search', 'no results',
      'casual dining', 'restaurants and'];

    for (const store of allStores) {
      const normalizedName = store.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;
      if (normalizedName.length < 3) continue;
      if (garbagePatterns.some(p => normalizedName.includes(p) || normalizedName === p)) continue;
      if (store.name.includes('#')) continue; // Skip duplicates with unit numbers

      seenNames.add(normalizedName);
      uniqueStores.push(store);
    }

    console.log(`Total unique stores: ${uniqueStores.length}\n`);

    if (uniqueStores.length > 0) {
      uniqueStores.slice(0, 20).forEach(s => console.log(`- ${s.name}`));
      if (uniqueStores.length > 20) console.log(`... and ${uniqueStores.length - 20} more`);
    }

    if (uniqueStores.length < 5) {
      console.log('\nToo few stores found. Saving debug info...');
      await page.screenshot({ path: 'ion-debug.png', fullPage: true });

      // Log page structure
      const pageInfo = await page.evaluate(() => {
        const body = document.body;
        const classes = new Set();
        body.querySelectorAll('*').forEach(el => {
          if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(c => {
              if (c.includes('store') || c.includes('shop') || c.includes('dine') ||
                  c.includes('tenant') || c.includes('list') || c.includes('grid') ||
                  c.includes('card') || c.includes('item') || c.includes('brand')) {
                classes.add(c);
              }
            });
          }
        });
        return {
          title: document.title,
          classes: Array.from(classes),
          bodyLength: body.innerText.length
        };
      });

      console.log('Page info:', pageInfo);
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
          level: store.level || '',
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

    console.log(`\nTotal outlets at ION Orchard: ${finalCount?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeAndImport();

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'singpost-centre';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('luckin') || nameLower.includes('kaffe')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('beard papa') ||
      nameLower.includes('déli') || nameLower.includes('prima') || nameLower.includes('swee heng') ||
      nameLower.includes('châteraisé') || nameLower.includes('tarts')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('texas chicken') || nameLower.includes('carl') || nameLower.includes('wingstop')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('tamoya') || nameLower.includes('yakiniku')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('manna')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('claypot') || nameLower.includes('putien') || nameLower.includes('pu tien') ||
      nameLower.includes('malatang')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('chatramue')) {
    return 'thai, food';
  }
  if (nameLower.includes('malay') || nameLower.includes('nasi') || nameLower.includes('maimunah') ||
      nameLower.includes('encik tan') || nameLower.includes('bebek') || nameLower.includes('goreng')) {
    return 'malay, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer') ||
      nameLower.includes('liquor')) {
    return 'bar, food';
  }
  if (nameLower.includes('acai') || nameLower.includes('dessert') || nameLower.includes('ice cream') ||
      nameLower.includes('swensen')) {
    return 'desserts, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea')) {
    return 'drinks, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-singpost';
}

async function scrapeSingpost() {
  console.log('=== SCRAPING SINGPOST CENTRE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Use the F&B category filtered URL
    console.log('Loading Singpost Centre F&B stores page...');
    await page.goto('https://www.singpostcentre.com/stores/?category=cafes-restaurants-food-court', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(8000);

    // Scroll to load all
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(3000);

    // Extract stores from DOM
    const stores = await page.evaluate(() => {
      const results = [];

      // Try various selectors for store cards
      const selectors = [
        '.store-card',
        '.store-item',
        '.col',
        '[class*="store"]',
        'article',
        '.card'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          const nameEl = el.querySelector('h2, h3, h4, .title, [class*="title"], [class*="name"], a');
          const name = nameEl?.textContent?.trim();

          const levelEl = el.querySelector('[class*="level"], [class*="location"], [class*="unit"]');
          const level = levelEl?.textContent?.trim() || '';

          const img = el.querySelector('img');
          const imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 2 && name.length < 100) {
            results.push({ name, level, imageUrl: imgUrl || null });
          }
        });
      }

      // Also try finding store links
      document.querySelectorAll('a[href*="/stores/"]').forEach(link => {
        const name = link.textContent?.trim();
        if (name && name.length > 2 && name.length < 80) {
          const img = link.querySelector('img') || link.closest('.col, .card, article')?.querySelector('img');
          results.push({
            name,
            level: '',
            imageUrl: img?.src || null
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from DOM`);

    // Deduplicate and filter
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = [
      'stores', 'home', 'about', 'contact', 'view all', 'load more',
      'food & beverage', 'cafes, restaurants & food court', 'filter',
      'all stores', 'search', 'directory', 'convenience & services',
      'beauty & wellness', 'fashion & accessories', 'food kiosk / takeaway',
      'digital/electronics', 'entertainment / lifestyle', 'home & furnishing',
      'supermarket', 'enrichment'
    ];

    for (const store of stores) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) &&
          key.length > 2 &&
          !junkNames.includes(key) &&
          !junkNames.some(junk => key.includes(junk)) &&
          !key.startsWith('view ')) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique F&B stores: ${uniqueStores.length}`);

    if (uniqueStores.length < 3) {
      console.log('Too few stores found, saving debug...');
      await page.screenshot({ path: 'singpost-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('singpost-debug.html', html);
      console.log('Saved singpost-debug.png and singpost-debug.html');
      await browser.close();
      return;
    }

    // Delete existing
    console.log('\nRemoving existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import
    console.log('\nImporting outlets...');
    let imported = 0;
    for (const store of uniqueStores) {
      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.level || '',
          category: getCategory(store.name),
          thumbnail_url: store.imageUrl,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  Imported: ${store.name}`);
      } else {
        console.log(`  Error: ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'singpost-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeSingpost();

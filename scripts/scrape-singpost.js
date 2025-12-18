const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'singpost-centre';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('luckin') || nameLower.includes('kaffe') || nameLower.includes('fun toast') ||
      nameLower.includes('pang pang') || nameLower.includes('tea leaf') || nameLower.includes('mr teh')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('beard papa') ||
      nameLower.includes('déli') || nameLower.includes('prima') || nameLower.includes('swee heng') ||
      nameLower.includes('châteraisé') || nameLower.includes('tarts') || nameLower.includes('kopi &')) {
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
      nameLower.includes('malatang') || nameLower.includes('lau wang') || nameLower.includes('thunder tea')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('chatramue')) {
    return 'thai, food';
  }
  if (nameLower.includes('malay') || nameLower.includes('nasi') || nameLower.includes('maimunah') ||
      nameLower.includes('encik tan') || nameLower.includes('bebek') || nameLower.includes('goreng') ||
      nameLower.includes('malaysia chiak')) {
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

    await page.waitForTimeout(5000);

    // Scroll and click Load More to load all stores
    console.log('Loading all stores...');
    for (let round = 0; round < 15; round++) {
      // Scroll down
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(200);
      }

      // Try clicking Load More
      try {
        const loadMore = await page.$('button:has-text("Load More"), .load-more, [class*="load-more"], a:has-text("Load More")');
        if (loadMore) {
          await loadMore.click();
          console.log(`  Clicked Load More (${round + 1})`);
          await page.waitForTimeout(2000);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
    await page.waitForTimeout(2000);

    // Extract stores from DOM - SingPost uses Bootstrap cards
    const stores = await page.evaluate(() => {
      const results = [];

      // SingPost structure: .stores-section .row > .col > .card
      const cards = document.querySelectorAll('.stores-section .col .card');

      cards.forEach(card => {
        // Get name from .card-title
        const titleEl = card.querySelector('.card-title');
        const name = titleEl?.textContent?.trim();

        // Get image
        const img = card.querySelector('img.card-img-top, img.wp-post-image');
        let imgUrl = img?.src || img?.getAttribute('data-src');

        if (name && name.length > 2 && name.length < 100) {
          results.push({
            name,
            imageUrl: imgUrl || null
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
      'all stores', 'search', 'directory'
    ];

    for (const store of stores) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) &&
          key.length > 2 &&
          !junkNames.includes(key) &&
          !key.startsWith('view ')) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique F&B stores: ${uniqueStores.length}`);

    // Print found stores
    console.log('\nFound F&B outlets:');
    for (const store of uniqueStores) {
      console.log(`  - ${store.name} ${store.imageUrl ? '✓img' : ''}`);
    }

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
          level: '',
          category: getCategory(store.name),
          thumbnail_url: store.imageUrl,
          opening_hours: null,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  ✓ ${store.name}`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}/${uniqueStores.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'singpost-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeSingpost();

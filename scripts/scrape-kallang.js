const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'kallang-wave-mall';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer')) {
    return 'bar, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-kallang-wave';
}

async function scrapeKallang() {
  console.log('=== SCRAPING THE KALLANG (KALLANG WAVE MALL) ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const allStores = [];
    const baseUrl = 'https://www.thekallang.com.sg/shop-dine/stores?store_id=181';

    // Function to extract stores from current page using correct selectors
    const extractStores = async () => {
      return await page.evaluate(() => {
        const results = [];
        // The Kallang uses .event-card structure
        document.querySelectorAll('.event-card').forEach(card => {
          const titleEl = card.querySelector('.event-card__title');
          const name = titleEl?.textContent?.trim();

          const locationEl = card.querySelector('.event-card__location');
          const level = locationEl?.textContent?.trim() || '';

          const img = card.querySelector('.event-card__img');
          const imgUrl = img?.src || img?.getAttribute('data-src');

          if (name && name.length > 2 && name.length < 100) {
            results.push({ name, level, imageUrl: imgUrl || null });
          }
        });
        return results;
      });
    };

    // Navigate through all 5 pages (page=0 through page=4)
    for (let pageNum = 0; pageNum <= 4; pageNum++) {
      const pageUrl = pageNum === 0 ? baseUrl : `${baseUrl}&page=${pageNum}`;
      console.log(`Loading page ${pageNum + 1}...`);

      await page.goto(pageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await page.waitForTimeout(5000);

      // Scroll to ensure all content loaded
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 300));
        await page.waitForTimeout(200);
      }

      const pageStores = await extractStores();
      allStores.push(...pageStores);
      console.log(`  Page ${pageNum + 1}: ${pageStores.length} stores`);
    }

    console.log(`\nTotal from all pages: ${allStores.length}`);

    // Deduplicate and filter out junk
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = [
      'beauty & wellness', 'education & enrichment', 'fashion', 'food & beverage',
      'hobbies & leisure', 'services', 'sports', 'supermarket & specialty marts',
      'view details', 'load more', 'view all', 'filter', 'search', 'home',
      'shop & dine', 'stores', 'about', 'contact'
    ];
    for (const store of allStores) {
      const key = store.name.toLowerCase().trim();
      if (!seenNames.has(key) &&
          key.length > 2 &&
          !junkNames.includes(key) &&
          !key.startsWith('view ')) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique stores: ${uniqueStores.length}`);

    if (uniqueStores.length < 3) {
      console.log('Too few stores found, saving debug...');
      await page.screenshot({ path: 'kallang-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('kallang-debug.html', html);
      console.log('Saved kallang-debug.png and kallang-debug.html');
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
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'kallang-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeKallang();

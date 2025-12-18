const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'sun-plaza';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('luckin') || nameLower.includes('kaffe') || nameLower.includes('kopi')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('beard papa') ||
      nameLower.includes('déli') || nameLower.includes('prima') || nameLower.includes('swee heng') ||
      nameLower.includes('châteraisé') || nameLower.includes('chateraise') || nameLower.includes('tarts') ||
      nameLower.includes('bengawan') || nameLower.includes('four leaves') || nameLower.includes('breadtalk') ||
      nameLower.includes('dough culture') || nameLower.includes('dunkin') || nameLower.includes('bakeinc')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('texas chicken') || nameLower.includes('carl') || nameLower.includes('wingstop') ||
      nameLower.includes('mos burger') || nameLower.includes('4 fingers')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('tamoya') || nameLower.includes('yakiniku') ||
      nameLower.includes('gyoza') || nameLower.includes('yoshinoya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('manna') || nameLower.includes('gogi')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('hot pot') || nameLower.includes('claypot') || nameLower.includes('putien') ||
      nameLower.includes('pu tien') || nameLower.includes('malatang') || nameLower.includes('crystal jade') ||
      nameLower.includes('hai di lao') || nameLower.includes('teochew') || nameLower.includes('fishball')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('chatramue')) {
    return 'thai, food';
  }
  if (nameLower.includes('malay') || nameLower.includes('nasi') || nameLower.includes('maimunah') ||
      nameLower.includes('encik tan') || nameLower.includes('bebek') || nameLower.includes('goreng')) {
    return 'malay, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('prata') ||
      nameLower.includes('biryani')) {
    return 'indian, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer') ||
      nameLower.includes('liquor')) {
    return 'bar, food';
  }
  if (nameLower.includes('acai') || nameLower.includes('dessert') || nameLower.includes('ice cream') ||
      nameLower.includes('swensen') || nameLower.includes('llaollao')) {
    return 'desserts, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('chicha') ||
      nameLower.includes('gong cha') || nameLower.includes('koi') || nameLower.includes('liho') ||
      nameLower.includes('boost') || nameLower.includes('juice')) {
    return 'drinks, food';
  }
  if (nameLower.includes('7-eleven') || nameLower.includes('cheers') || nameLower.includes('fairprice')) {
    return 'convenience, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic')) {
    return 'food court, food';
  }
  if (nameLower.includes('bak kwa') || nameLower.includes('fragrance')) {
    return 'snacks, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-sun-plaza';
}

async function scrapeSunPlaza() {
  console.log('=== SCRAPING SUN PLAZA ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Sun Plaza store directory...');
    await page.goto('https://www.sunplaza.com.sg/store-directory', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Function to extract stores from current page
    const extractStores = async () => {
      return await page.evaluate(() => {
        const results = [];
        const figures = document.querySelectorAll('figure.gallery-grid-item');

        figures.forEach(figure => {
          const classes = figure.className || '';
          const isFood = classes.includes('category-food-and-beverages');

          const img = figure.querySelector('img');
          let imgUrl = img?.getAttribute('data-src') || img?.getAttribute('data-image') || img?.src;

          const captionEl = figure.querySelector('.gallery-caption, .gallery-caption-content');
          let captionText = captionEl?.textContent?.trim() || '';
          const altText = img?.alt || '';

          const captionHtml = figure.querySelector('.gallery-caption')?.innerHTML || '';
          const bMatch = captionHtml.match(/<b>([^<]+)<\/b>/);
          let name = bMatch ? bMatch[1].trim() : '';

          const unitMatch = (captionText + ' ' + altText).match(/#\d{1,2}-\d{1,3}[A-Z]?/);
          const unit = unitMatch ? unitMatch[0] : '';

          if (!name && altText) {
            const parts = altText.split('#')[0].trim();
            name = parts;
          }

          if (!name || name.length < 2) return;

          results.push({
            name,
            unit,
            isFood,
            imageUrl: imgUrl || null
          });
        });

        return results;
      });
    };

    // Collect all stores across all pages
    let allStores = [];

    // Get total pages from pagination
    const totalPages = await page.$$eval('.pagination-item.page-number', els => els.length);
    console.log(`Found ${totalPages} pages of stores`);

    // Collect from all pages
    for (let pageNum = 1; pageNum <= Math.max(totalPages, 1); pageNum++) {
      console.log(`Collecting page ${pageNum}...`);

      // Click page number if not first page
      if (pageNum > 1) {
        try {
          const pageBtn = await page.$(`.pagination-item-${pageNum} a, .pagination-item a[data-index="${pageNum}"]`);
          if (pageBtn) {
            await pageBtn.click();
            await page.waitForTimeout(2000);
          }
        } catch (e) {
          console.log(`Could not click page ${pageNum}`);
        }
      }

      // Scroll to ensure images load
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(200);
      }

      // Extract stores from this page
      const pageStores = await extractStores();
      console.log(`  Found ${pageStores.length} stores on page ${pageNum}`);
      allStores = allStores.concat(pageStores);
    }

    const stores = allStores;

    console.log(`Found ${stores.length} raw stores`);

    // Filter for F&B only
    const uniqueStores = [];
    const seenNames = new Set();
    const junkNames = [
      'stores', 'home', 'about', 'contact', 'view all', 'load more',
      'food & beverages', 'filter', 'all stores', 'search', 'directory',
      'sun plaza', 'store directory', 'categories', 'fashion', 'services',
      'beauty', 'lifestyle', 'home & living', 'all'
    ];

    for (const store of stores) {
      const key = store.name.toLowerCase().trim();
      // Only keep F&B items
      if (!store.isFood) continue;

      if (!seenNames.has(key) &&
          key.length > 2 &&
          !junkNames.includes(key) &&
          !junkNames.some(junk => key === junk) &&
          !key.startsWith('view ')) {
        seenNames.add(key);
        uniqueStores.push(store);
      }
    }

    console.log(`Unique stores after dedup: ${uniqueStores.length}`);

    // Debug: save screenshot if too few
    if (uniqueStores.length < 5) {
      console.log('Too few stores found, saving debug files...');
      await page.screenshot({ path: 'sun-plaza-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('sun-plaza-debug.html', html);
      console.log('Saved debug files');

      // Try alternate method - get all text and images
      const altData = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('img').forEach(img => {
          const parent = img.closest('a, div, article, section');
          const text = parent?.textContent?.trim()?.substring(0, 200);
          items.push({ src: img.src, text });
        });
        return items;
      });
      console.log('Alt image data:', JSON.stringify(altData.slice(0, 10), null, 2));
    }

    // Print found stores
    console.log('\nFound F&B outlets:');
    for (const store of uniqueStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) ${store.imageUrl ? '✓img' : ''}`);
    }

    if (uniqueStores.length === 0) {
      console.log('\nNo stores found. Please check debug files.');
      await browser.close();
      return;
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
    for (const store of uniqueStores) {
      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.unit || '',
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
    await page.screenshot({ path: 'sun-plaza-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeSunPlaza();

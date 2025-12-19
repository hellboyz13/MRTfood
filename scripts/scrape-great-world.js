const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'great-world';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('convenience') || nameLower.includes('cheers')) {
    return 'convenience, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopi') || nameLower.includes('espresso') || nameLower.includes('awfully chocolate')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('baguette') || nameLower.includes('donut') || nameLower.includes('croissant') ||
      nameLower.includes('baker') || nameLower.includes('breadtalk') || nameLower.includes('beard papa')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea house') ||
      nameLower.includes('chicha') || nameLower.includes('liho') || nameLower.includes('koi') ||
      nameLower.includes('juice') || nameLower.includes('boost') || nameLower.includes('mr bean')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('gelato') ||
      nameLower.includes('baskin') || nameLower.includes('candy') || nameLower.includes('chocolate')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('mos burger') || nameLower.includes('pizza') || nameLower.includes('yoshinoya') ||
      nameLower.includes('jollibee')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('izakaya') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('sukiya') || nameLower.includes('ichiban') ||
      nameLower.includes('yakiniku') || nameLower.includes('sashimi')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim') ||
      nameLower.includes('seoul') || nameLower.includes('bulgogi') || nameLower.includes('bibimbap')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('chinese') ||
      nameLower.includes('haidilao') || nameLower.includes('putien') || nameLower.includes('crystal jade') ||
      nameLower.includes('canton') || nameLower.includes('szechuan') || nameLower.includes('teochew') ||
      nameLower.includes('song fa') || nameLower.includes('bak kut teh') || nameLower.includes('mala') ||
      nameLower.includes('yum cha') || nameLower.includes('tim ho wan')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('bangkok') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('saizeriya') || nameLower.includes('pastamania')) {
    return 'italian, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('tandoor') ||
      nameLower.includes('naan') || nameLower.includes('biryani')) {
    return 'indian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steak') || nameLower.includes('grill') ||
      nameLower.includes('astons') || nameLower.includes('collin') || nameLower.includes('fish') ||
      nameLower.includes('battercatch')) {
    return 'western, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('local') || nameLower.includes('hawker') ||
      nameLower.includes('kopitiam') || nameLower.includes('nanyang') || nameLower.includes('crave') ||
      nameLower.includes('heritage') || nameLower.includes('bee cheng hiang')) {
    return 'local, food';
  }
  if (nameLower.includes('vegetarian') || nameLower.includes('veggie') || nameLower.includes('vegan')) {
    return 'vegetarian, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer') ||
      nameLower.includes('wine') || nameLower.includes('bottles')) {
    return 'bar, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-great-world';
}

async function findExistingThumbnail(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('thumbnail_url, name')
    .not('thumbnail_url', 'is', null)
    .limit(1000);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.thumbnail_url) {
        return outlet.thumbnail_url;
      }
    }
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

async function scrapeGreatWorld() {
  console.log('=== SCRAPING GREAT WORLD ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect all stores from all pages
  const allStores = new Map();

  try {
    console.log('Loading Great World Dine page...');
    await page.goto('https://shop.greatworld.com.sg/dine/', {
      waitUntil: 'networkidle',
      timeout: 90000
    });

    await page.waitForTimeout(5000);

    // Find total pages
    let totalPages = 1;
    try {
      const paginationText = await page.textContent('.pagination, .page-numbers, nav[aria-label*="pagination"]');
      const pageMatch = paginationText?.match(/of\s+(\d+)/i) || paginationText?.match(/(\d+)\s*$/);
      if (pageMatch) {
        totalPages = parseInt(pageMatch[1]);
      }
    } catch (e) {
      // Try to find page buttons
      const pageButtons = await page.$$('.page-numbers:not(.prev):not(.next), .pagination a');
      if (pageButtons.length > 0) {
        totalPages = pageButtons.length;
      }
    }

    // Try to determine pages from navigation
    const lastPageLink = await page.$('a.page-numbers:last-of-type:not(.next)');
    if (lastPageLink) {
      const lastPageNum = await lastPageLink.textContent();
      const num = parseInt(lastPageNum?.trim());
      if (num && num > totalPages) {
        totalPages = num;
      }
    }

    console.log(`Found ${totalPages} pages to scrape`);

    // Scrape each page
    for (let pageNum = 1; pageNum <= 8; pageNum++) { // Max 8 pages based on WebFetch
      console.log(`\nScraping page ${pageNum}...`);

      if (pageNum > 1) {
        await page.goto(`https://shop.greatworld.com.sg/dine/page/${pageNum}/`, {
          waitUntil: 'networkidle',
          timeout: 60000
        });
        await page.waitForTimeout(3000);
      }

      // Scroll to load content
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(2000);

      // Extract stores from this page - Great World uses .shopbox class
      const pageStores = await page.evaluate(() => {
        const results = [];

        // Great World specific selectors
        const storeCards = document.querySelectorAll('.shopbox');

        storeCards.forEach(card => {
          // Get store name from .shoptitle
          let name = '';
          const nameEl = card.querySelector('.shoptitle');
          if (nameEl) {
            name = nameEl.textContent?.trim();
          }

          if (!name || name.length < 2) return;

          // Get unit number from .shopunit
          let unit = '';
          const unitEl = card.querySelector('.shopunit');
          if (unitEl) {
            unit = unitEl.textContent?.trim();
          }

          // Get image
          let imageUrl = null;
          const img = card.querySelector('.shopimage img');
          if (img) {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
            if (src && !src.startsWith('data:') && !src.includes('placeholder') && !src.includes('shopbg.png')) {
              imageUrl = src;
            }
          }

          const key = name.toLowerCase();
          results.push({
            key,
            name,
            unit,
            imageUrl
          });
        });

        return results;
      });

      console.log(`  Found ${pageStores.length} stores on page ${pageNum}`);

      // Add to collection (deduplicating)
      for (const store of pageStores) {
        if (!allStores.has(store.key)) {
          allStores.set(store.key, store);
        }
      }

      // Check if there's a next page
      const nextPage = await page.$('a.next.page-numbers, a:has-text("Next")');
      if (!nextPage && pageNum >= 8) {
        console.log('  No more pages');
        break;
      }
    }

    // Convert map to array
    const stores = Array.from(allStores.values());

    console.log(`\nTotal unique stores found: ${stores.length}`);

    // Filter valid F&B stores
    const junkNames = ['home', 'about', 'contact', 'store directory', 'events', 'news', 'stores',
                       'shop', 'eat', 'dine', 'play', 'wellness', 'family', 'community', 'map', 'visit',
                       'sign in', 'download app', 'learn more', 'find a property', 'about us',
                       'accessibility', 'search', 'view all', 'next', 'previous', 'category', 'all',
                       'page', 'great world'];

    const fnbStores = stores.filter(s => {
      const nameLower = s.name.toLowerCase().trim();
      if (junkNames.some(j => nameLower === j)) return false;
      if (s.name.length < 3) return false;
      return true;
    });

    if (fnbStores.length === 0) {
      console.log('No F&B stores found via scraping, saving debug...');
      await page.screenshot({ path: 'great-world-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('great-world-debug.html', html);
      await browser.close();
      return;
    }

    // Print found stores
    console.log(`\nF&B outlets: ${fnbStores.length}`);
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) ${store.imageUrl ? '✓img' : ''}`);
    }

    // Delete existing outlets
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
      let thumbnail = store.imageUrl || null;
      let hours = null;

      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      hours = await findExistingOpeningHours(store.name);
      if (hours) console.log(`    Found existing hours for ${store.name}`);

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.unit || '',
          category: getCategory(store.name),
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  ✓ ${store.name} (${store.unit || 'no unit'})`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}/${fnbStores.length} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'great-world-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeGreatWorld();

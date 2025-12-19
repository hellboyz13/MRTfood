const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'hougang-mall';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('convenience') || nameLower.includes('cheers')) {
    return 'convenience, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopi') || nameLower.includes('espresso')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('baguette') || nameLower.includes('donut') || nameLower.includes('croissant')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea house') ||
      nameLower.includes('chicha') || nameLower.includes('liho') || nameLower.includes('koi') ||
      nameLower.includes('juice')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('gelato')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('mos burger')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('izakaya') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('sukiya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim') ||
      nameLower.includes('seoul')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('chinese') ||
      nameLower.includes('haidilao') || nameLower.includes('putien') || nameLower.includes('crystal jade') ||
      nameLower.includes('canton') || nameLower.includes('szechuan') || nameLower.includes('teochew')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai')) {
    return 'thai, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('saizeriya')) {
    return 'italian, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('tandoor')) {
    return 'indian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steak') || nameLower.includes('grill') ||
      nameLower.includes('astons') || nameLower.includes('collin')) {
    return 'western, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('local') || nameLower.includes('hawker') ||
      nameLower.includes('kopitiam') || nameLower.includes('nanyang') || nameLower.includes('crave')) {
    return 'local, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('food republic') || nameLower.includes('kopitiam') ||
      nameLower.includes('koufu')) {
    return 'food court, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('beer') ||
      nameLower.includes('wine')) {
    return 'bar, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-hougang-mall';
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

async function scrapeHougangMall() {
  console.log('=== SCRAPING HOUGANG MALL ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // All stores collected across multiple category pages
  const allStores = new Map();

  // F&B category URLs - using tag filters from the official site + eat page
  const categoryUrls = [
    'https://www.hougangmall.com.sg/content/frasersexperience/hm/en/eat.html',
    'https://www.hougangmall.com.sg/content/frasersexperience/hm/en/stores.html?tag=cafe,fast-food,restaurant',
    'https://www.hougangmall.com.sg/content/frasersexperience/hm/en/stores.html?tag=snacks,quick-bites,drinks'
  ];

  try {
    for (let urlIndex = 0; urlIndex < categoryUrls.length; urlIndex++) {
      const url = categoryUrls[urlIndex];
      console.log(`\nLoading category page ${urlIndex + 1}/${categoryUrls.length}...`);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 90000
      });

      await page.waitForTimeout(3000);

      // Accept cookie consent if present (only on first page)
      if (urlIndex === 0) {
        console.log('Checking for cookie consent...');
        try {
          const cookieSelectors = [
            '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
            '#CybotCookiebotDialogBodyButtonAccept',
            'button:has-text("Allow all")',
            'button:has-text("Accept all")',
            '[id*="accept"]'
          ];

          for (const selector of cookieSelectors) {
            const btn = await page.$(selector);
            if (btn) {
              await btn.click();
              console.log(`  Clicked cookie consent: ${selector}`);
              await page.waitForTimeout(2000);
              break;
            }
          }
        } catch (e) {
          console.log('  No cookie consent or already dismissed');
        }
      }

      await page.waitForTimeout(5000);

      // Wait for store listing to load
      try {
        await page.waitForSelector('a[href*="/stores/"]', { timeout: 30000 });
      } catch (e) {
        console.log('  No store links found, skipping...');
        continue;
      }

      await page.waitForTimeout(3000);

      // Scroll to load all stores
      console.log('Scrolling to load all stores...');
      for (let i = 0; i < 40; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(3000);

      // Try clicking "Load More" if exists
      for (let i = 0; i < 10; i++) {
        try {
          const loadMore = await page.$('button:has-text("Load More"), a:has-text("Load More")');
          if (loadMore) {
            await loadMore.click();
            console.log(`  Clicked Load More (${i + 1})`);
            await page.waitForTimeout(2000);
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      }

      await page.waitForTimeout(2000);

      // Extract stores from this page
      const pageStores = await page.evaluate(() => {
        const results = [];

        document.querySelectorAll('a[href*="/stores/"]').forEach(link => {
          const href = link.getAttribute('href') || '';

          if (!href.includes('.html') || href === '/content/frasersexperience/hm/en/stores.html') return;
          if (href.includes('?tag=')) return;

          const urlMatch = href.match(/\/stores\/([^.#?]+)\.html/);
          if (!urlMatch) return;

          const slugName = urlMatch[1];
          let name = slugName.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');

          name = name.replace(/ And /g, ' & ');

          let unit = '';
          const parent = link.closest('.card, .store-card, .item, article, div[class*="listing"], div[class*="card"], li');
          if (parent) {
            const unitMatch = parent.textContent?.match(/#[B\d][0-9-A-Za-z\/&\s]+/);
            if (unitMatch) {
              unit = unitMatch[0].trim();
            }
          }

          let imageUrl = null;
          const img = link.querySelector('img') || (parent && parent.querySelector('img'));
          if (img) {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
            if (src && !src.startsWith('data:')) {
              imageUrl = src.startsWith('http') ? src : 'https://www.hougangmall.com.sg' + src;
            }
          }

          results.push({
            key: slugName.toLowerCase(),
            name,
            unit,
            category: 'food',
            imageUrl
          });
        });

        return results;
      });

      console.log(`  Found ${pageStores.length} stores on this page`);

      // Add to our collection (deduplicating)
      for (const store of pageStores) {
        if (!allStores.has(store.key)) {
          allStores.set(store.key, store);
        }
      }
    }

    // Convert map to array
    const stores = Array.from(allStores.values());

    console.log(`Found ${stores.length} stores`);

    // Filter out non-F&B and junk entries
    const junkNames = ['home', 'about', 'contact', 'store directory', 'events', 'news', 'stores',
                       'shop', 'eat', 'play', 'wellness', 'family', 'community', 'map', 'visit',
                       'sign in', 'download app', 'learn more', 'find a property', 'about us',
                       'accessibility', 'search', 'view all'];

    // Non-food stores to exclude
    const nonFoodStores = ['fairprice', 'guardian', 'watsons', 'unity', 'ntuc', 'cold storage'];

    const fnbStores = stores.filter(s => {
      const nameLower = s.name.toLowerCase();
      if (junkNames.some(j => nameLower === j || nameLower.includes(j))) return false;
      if (nonFoodStores.some(nf => nameLower.includes(nf))) return false;
      if (s.name.length < 3) return false;
      // Skip items that look like navigation elements
      if (nameLower.includes('copyright') || nameLower.includes('privacy')) return false;
      return true;
    });

    if (fnbStores.length === 0) {
      console.log('No F&B stores found via scraping, saving debug...');
      await page.screenshot({ path: 'hougang-mall-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('hougang-mall-debug.html', html);
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
    await page.screenshot({ path: 'hougang-mall-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeHougangMall();

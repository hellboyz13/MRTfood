/**
 * Generic Frasers Property Mall Scraper
 * Works with: Waterway Point, White Sands, Tiong Bahru Plaza, Tampines 1,
 *             Century Square, Hougang Mall, and other Frasers malls
 *
 * Usage: node scripts/scrape-frasers-mall.js <mall-key>
 * Example: node scripts/scrape-frasers-mall.js white-sands
 */

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mall configurations
const FRASERS_MALLS = {
  'waterway-point': {
    mallId: 'waterway-point',
    name: 'Waterway Point',
    baseUrl: 'https://www.waterwaypoint.com.sg',
    categoryUrls: [
      '/stores?tag=cafe,fast-food,restaurant',
      '/stores?tag=snacks,quick-bites,drinks'
    ]
  },
  'white-sands': {
    mallId: 'white-sands',
    name: 'White Sands',
    baseUrl: 'https://www.whitesands.com.sg',
    categoryUrls: [
      '/stores?tag=cafe,fast-food,restaurant',
      '/stores?tag=halal',
      '/stores?tag=snacks,quick-bites,drinks'
    ]
  },
  'tiong-bahru-plaza': {
    mallId: 'tiong-bahru-plaza',
    name: 'Tiong Bahru Plaza',
    baseUrl: 'https://www.tiongbahruplaza.com.sg',
    categoryUrls: [
      '/stores?tag=cafe,fast-food,restaurant',
      '/stores?tag=quick-bite,snack,snacks,quick-bites,drinks',
      '/stores?tag=halal'
    ]
  },
  'tampines-1': {
    mallId: 'tampines-1',
    name: 'Tampines 1',
    baseUrl: 'https://www.tampines1.com.sg',
    categoryUrls: [
      '/stores?tag=cafe,fast-food,restaurant',
      '/stores?tag=snacks,quick-bites,drinks',
      '/stores?tag=halal'
    ]
  },
  'century-square': {
    mallId: 'century-square',
    name: 'Century Square',
    baseUrl: 'https://www.centurysquare.com.sg',
    categoryUrls: [
      '/stores?tag=cafe,restaurant',
      '/stores?tag=snacks,quick-bites,drinks',
      '/stores?tag=halal'
    ]
  },
  'hougang-mall': {
    mallId: 'hougang-mall',
    name: 'Hougang Mall',
    baseUrl: 'https://www.hougangmall.com.sg',
    categoryUrls: [
      '/stores?tag=cafe,fast-food,restaurant',
      '/stores?tag=snacks,quick-bites,drinks',
      '/stores?tag=halal'
    ]
  }
};

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('cheers')) {
    return 'convenience, food';
  }
  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('chagee') || nameLower.includes('gong cha') || nameLower.includes('each a cup') ||
      nameLower.includes('tiger sugar') || nameLower.includes('beutea') || nameLower.includes('r&b tea')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('kopi') || nameLower.includes('espresso') || nameLower.includes('coffee')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('cedele') ||
      nameLower.includes('four leaves') || nameLower.includes('bread')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger king') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('jollibee') ||
      nameLower.includes('pizza hut') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('mos burger') || nameLower.includes('wingstop') || nameLower.includes('4fingers')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki') ||
      nameLower.includes('don') || nameLower.includes('ichiban') || nameLower.includes('ajisen')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('ajumma') ||
      nameLower.includes('seoul') || nameLower.includes('kim')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('ma la') || nameLower.includes('mala') || nameLower.includes('bak kut teh') ||
      nameLower.includes('teochew') || nameLower.includes('canton')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('fish & co') || nameLower.includes('steak') || nameLower.includes('grill')) {
    return 'western, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic') ||
      nameLower.includes('koufu') || nameLower.includes('food junction')) {
    return 'food court, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('gelato') || nameLower.includes('dessert') ||
      nameLower.includes('llao') || nameLower.includes('sweet') || nameLower.includes('chateraise')) {
    return 'desserts, food';
  }

  return 'restaurant, food';
}

function generateId(name, mallId) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-' + mallId;
}

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`']/g, '')
    .replace(/[®™©–—]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findExistingData(name) {
  const searchName = normalizeName(name);

  const { data } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url, opening_hours')
    .limit(2000);

  let thumbnail = null;
  let hours = null;

  if (data) {
    for (const outlet of data) {
      const outletNormalized = normalizeName(outlet.name);
      if (outletNormalized === searchName) {
        if (outlet.thumbnail_url && !thumbnail) thumbnail = outlet.thumbnail_url;
        if (outlet.opening_hours && !hours) hours = outlet.opening_hours;
        if (thumbnail && hours) break;
      }
    }
    if (!thumbnail) {
      for (const outlet of data) {
        const outletNormalized = normalizeName(outlet.name);
        if ((searchName.includes(outletNormalized) || outletNormalized.includes(searchName)) &&
            outlet.thumbnail_url && searchName.length > 3 && outletNormalized.length > 3) {
          thumbnail = outlet.thumbnail_url;
          break;
        }
      }
    }
  }

  return { thumbnail, hours };
}

async function scrapeStoreDetails(page, slug, baseUrl) {
  const url = `${baseUrl}/stores/${slug}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const details = await page.evaluate(() => {
      const text = document.body.textContent || '';

      // Extract unit number - format varies by mall but generally #XX-XX
      let unit = '';
      // Try with wing prefix first (Waterway Point style)
      const wingMatch = text.match(/(East Wing|West Wing)[,\s]+(#[B]?\d{1,2}-[K]?\d{2}[A-B]?)(?=[A-Z][a-z]|[A-Z]{2,}|$)/i);
      if (wingMatch) {
        unit = wingMatch[1] + ', ' + wingMatch[2];
      } else {
        // Try simple unit format #XX-XX or #BX-XX
        const simpleMatch = text.match(/#[B]?\d{1,2}-[K]?\d{1,3}[A-B]?(?=[A-Z][a-z]|[A-Z]{2,}|$)/i);
        if (simpleMatch) {
          unit = simpleMatch[0];
        }
      }

      // Extract opening hours
      let hours = '';
      const hoursMatch = text.match(/Opening Hours\s*((?:Monday|Daily|Everyday)[^C]+?)(?:Contact|Directions|Keywords|$)/i);
      if (hoursMatch) {
        hours = hoursMatch[1].replace(/\s+/g, ' ').trim();
      }

      return { unit, hours };
    });

    return details;
  } catch (e) {
    return { unit: '', hours: '' };
  }
}

async function scrapeFrasersMall(mallKey) {
  const mallConfig = FRASERS_MALLS[mallKey];
  if (!mallConfig) {
    console.error(`Unknown mall: ${mallKey}`);
    console.log('Available malls:', Object.keys(FRASERS_MALLS).join(', '));
    return;
  }

  const { mallId, name, baseUrl, categoryUrls } = mallConfig;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SCRAPING: ${name.toUpperCase()}`);
  console.log(`Mall ID: ${mallId}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`${'='.repeat(60)}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allStores = new Map();

  try {
    // Scrape each category URL
    for (let urlIndex = 0; urlIndex < categoryUrls.length; urlIndex++) {
      const categoryPath = categoryUrls[urlIndex];
      const fullUrl = baseUrl + categoryPath;

      console.log(`\n--- Category ${urlIndex + 1}/${categoryUrls.length} ---`);
      console.log(`URL: ${fullUrl}`);

      await page.goto(fullUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await page.waitForTimeout(3000);

      // Handle cookie consent on first page
      if (urlIndex === 0) {
        try {
          const cookieSelectors = [
            '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
            '#CybotCookiebotDialogBodyButtonAccept',
            'button:has-text("Allow all")',
            'button:has-text("Accept all")'
          ];

          for (const selector of cookieSelectors) {
            const btn = await page.$(selector);
            if (btn) {
              await btn.click();
              console.log('  Clicked cookie consent');
              await page.waitForTimeout(2000);
              break;
            }
          }
        } catch (e) {
          // No cookie consent
        }
      }

      await page.waitForTimeout(3000);

      // Paginate through all pages
      let pageNum = 1;
      let hasMore = true;

      while (hasMore) {
        console.log(`  Page ${pageNum}...`);

        // Scroll to load lazy content
        for (let i = 0; i < 10; i++) {
          await page.evaluate(() => window.scrollBy(0, 500));
          await page.waitForTimeout(200);
        }
        await page.waitForTimeout(1500);

        // Extract stores from current page
        const pageStores = await page.evaluate((baseUrlParam) => {
          const results = [];
          const seen = new Set();

          document.querySelectorAll('a[href*="/stores/"]').forEach(link => {
            const href = link.getAttribute('href') || '';
            if (!href.includes('.html') && !href.endsWith('/stores') && !href.endsWith('/stores/')) {
              if (href.includes('?tag=')) return;

              const urlMatch = href.match(/\/stores\/([^?#\/]+)/);
              if (urlMatch) {
                const slug = urlMatch[1];
                let name = slug.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');

                name = name.replace(/ And /g, ' & ');

                // Get the card container
                const card = link.closest('.card, article, li, div[class*="item"], div[class*="store"]') || link;

                // Get image
                let imageUrl = null;
                const img = card.querySelector('img');
                if (img) {
                  const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
                  if (src && !src.startsWith('data:')) {
                    imageUrl = src.startsWith('http') ? src : baseUrlParam + src;
                  }
                }

                if (name && name.length > 2 && !seen.has(name.toLowerCase())) {
                  seen.add(name.toLowerCase());
                  results.push({ name, slug, imageUrl });
                }
              }
            }
          });

          return results;
        }, baseUrl);

        console.log(`    Found ${pageStores.length} stores`);

        // Add to collection
        for (const store of pageStores) {
          const key = store.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!allStores.has(key)) {
            allStores.set(key, store);
          }
        }

        // Look for Next button in pagination
        const nextButton = await page.$('.pagination .item:has-text("Next"):not([disabled])');

        if (nextButton) {
          const isDisabled = await nextButton.getAttribute('disabled');
          if (isDisabled !== null && isDisabled !== undefined) {
            hasMore = false;
          } else {
            try {
              await nextButton.click();
              await page.waitForTimeout(2500);
              pageNum++;
            } catch (e) {
              hasMore = false;
            }
          }
        } else {
          // Check for page number buttons
          const pageButtons = await page.$$('.pagination .item:not(.no-circle):not(.active)');
          if (pageButtons.length > 0) {
            const currentActive = await page.$('.pagination .item.active');
            const currentPageNum = currentActive ? parseInt(await currentActive.textContent()) : 1;

            let foundNext = false;
            for (const btn of pageButtons) {
              const btnText = await btn.textContent();
              const btnNum = parseInt(btnText);
              if (!isNaN(btnNum) && btnNum === currentPageNum + 1) {
                await btn.click();
                await page.waitForTimeout(2500);
                pageNum++;
                foundNext = true;
                break;
              }
            }

            if (!foundNext) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
      }
    }

    // Convert map to array
    const stores = Array.from(allStores.values());

    console.log(`\n=== TOTAL UNIQUE STORES: ${stores.length} ===\n`);

    // Filter out non-food and junk
    const junkNames = ['home', 'about', 'contact', 'store directory', 'events', 'news', 'stores',
                       'shop', 'eat', 'play', 'wellness', 'family', 'community', 'map', 'visit',
                       'sign in', 'download app', 'learn more', 'find a property', 'about us',
                       'accessibility', 'search', 'view all', 'filter', 'skip', 'clear'];

    const nonFoodStores = ['fairprice', 'guardian', 'watsons', 'unity', 'ntuc', 'cold storage',
                           'daiso', 'miniso', 'popular', 'best denki', 'courts', 'challenger'];

    const fnbStores = stores.filter(s => {
      const nameLower = s.name.toLowerCase();
      if (junkNames.some(j => nameLower === j || nameLower.includes(j))) return false;
      if (nonFoodStores.some(nf => nameLower.includes(nf))) return false;
      if (s.name.length < 3) return false;
      if (nameLower.includes('copyright') || nameLower.includes('privacy')) return false;
      return true;
    });

    if (fnbStores.length === 0) {
      console.log('No F&B stores found. Saving debug files...');
      await page.screenshot({ path: `${mallKey}-debug.png`, fullPage: true });
      await browser.close();
      return;
    }

    console.log(`F&B outlets to import: ${fnbStores.length}\n`);

    // Delete existing outlets
    console.log('Removing existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', mallId);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', mallId);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Fetch details from each store's page
    console.log('\nFetching store details...');

    for (let i = 0; i < fnbStores.length; i++) {
      const store = fnbStores[i];
      if (store.slug) {
        const details = await scrapeStoreDetails(page, store.slug, baseUrl);
        if (details.unit) store.unit = details.unit;
        if (details.hours) store.hours = details.hours;
        process.stdout.write(`\r  ${i + 1}/${fnbStores.length} - ${store.name.substring(0, 30).padEnd(30)}`);
      }
    }
    console.log('\n');

    // Import new outlets
    console.log('Importing outlets...');
    let imported = 0;
    let withThumbnail = 0;
    let withHours = 0;

    for (const store of fnbStores) {
      let thumbnail = store.imageUrl || null;
      let hours = store.hours || null;

      // Fall back to existing data
      if (!hours || !thumbnail) {
        const { thumbnail: existingThumb, hours: existingHours } = await findExistingData(store.name);
        if (!thumbnail && existingThumb) thumbnail = existingThumb;
        if (!hours && existingHours) hours = existingHours;
      }

      // Format hours as object
      const openingHours = hours ? (typeof hours === 'string' ? { weekdayDescriptions: [hours] } : hours) : null;

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name, mallId),
          name: store.name,
          mall_id: mallId,
          level: store.unit || '',
          category: getCategory(store.name),
          thumbnail_url: thumbnail,
          opening_hours: openingHours,
          tags: []
        });

      if (!error) {
        imported++;
        if (thumbnail) withThumbnail++;
        if (openingHours) withHours++;
        console.log(`  ✓ ${store.name} (${store.unit || 'no unit'}) ${thumbnail ? '✓img' : ''} ${openingHours ? '✓hrs' : ''}`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${name.toUpperCase()} COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Imported: ${imported}/${fnbStores.length} outlets`);
    console.log(`With thumbnails: ${withThumbnail}/${imported}`);
    console.log(`With hours: ${withHours}/${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `${mallKey}-error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node scripts/scrape-frasers-mall.js <mall-key>');
  console.log('\nAvailable malls:');
  for (const [key, config] of Object.entries(FRASERS_MALLS)) {
    console.log(`  ${key}: ${config.name}`);
  }
  console.log('\nTo scrape all malls: node scripts/scrape-frasers-mall.js all');
} else if (args[0] === 'all') {
  // Scrape all malls sequentially
  (async () => {
    for (const mallKey of Object.keys(FRASERS_MALLS)) {
      await scrapeFrasersMall(mallKey);
      console.log('\n');
    }
  })();
} else if (args[0] === 'list') {
  console.log('Available Frasers malls:');
  for (const [key, config] of Object.entries(FRASERS_MALLS)) {
    console.log(`  ${key}: ${config.name} (${config.mallId})`);
  }
} else {
  // Scrape specific mall(s)
  (async () => {
    for (const mallKey of args) {
      await scrapeFrasersMall(mallKey);
    }
  })();
}

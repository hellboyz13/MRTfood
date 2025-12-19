const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'northpoint-city';

// F&B related keywords to filter stores
const FNB_KEYWORDS = [
  'restaurant', 'cafe', 'coffee', 'food', 'eat', 'dining', 'kitchen',
  'grill', 'bakery', 'toast', 'noodle', 'rice', 'chicken', 'fish',
  'meat', 'pork', 'beef', 'sushi', 'ramen', 'pizza', 'burger',
  'tea', 'juice', 'drink', 'bar', 'pub', 'dessert', 'ice cream',
  'cake', 'bread', 'dim sum', 'hotpot', 'bbq', 'korean', 'japanese',
  'thai', 'chinese', 'indian', 'western', 'italian', 'mexican',
  'hawker', 'kopitiam', 'foodcourt', 'snack', 'boba', 'bubble',
  'acai', 'onigiri', 'ajumma', 'signature', 'bistro', 'deli'
];

// Known F&B chain names
const FNB_CHAINS = [
  '4fingers', 'a-one', 'ajisen', 'astons', 'boon tong kee', 'breadtalk',
  'burger king', 'carl\'s jr', 'chagee', 'chicha', 'coffeebean', 'coldstorage',
  'crystal jade', 'din tai fung', 'domino', 'don don donki', 'each a cup',
  'eighteen chefs', 'fish & co', 'genki sushi', 'gong cha', 'hai di lao',
  'kfc', 'kopitiam', 'koufu', 'liho', 'mcdonald', 'mos burger', 'mr bean',
  'nando', 'old chang kee', 'pastamania', 'pepper lunch', 'pizza hut',
  'poulet', 'putien', 'sakae sushi', 'seoul garden', 'starbucks', 'subway',
  'sushi express', 'sushi tei', 'swensen', 'the coffee bean', 'tim ho wan',
  'toast box', 'wingstop', 'ya kun', 'yoshinoya', 'an acai', 'mr. onigiri',
  'seoul noodle', 'alley', 'tuk tuk', 'yum sing', 'encik tan', 'jollibee',
  'shake shack', 'jollibean', 'fun toast', 'soup spoon', 'popeyes',
  'auntie anne', 'baskin', 'beard papa', 'bee cheng hiang', 'bengawan',
  'beutea', 'boost', 'bugis xin', 'cantine', 'cat & the fiddle', 'chapanda',
  'chateraise', 'chocolate origin', 'coconutnut', 'collin', 'country brot',
  'crave', 'crolo', 'delifrance', 'dian xiao er', 'dough culture', 'dough magic',
  'dunkin', 'famous amos', 'fragrance', 'fruit box', 'gelare', 'gokoku',
  'hockhua', 'i mango', 'itea', 'ji de chi', 'jianghu', 'jinjja', 'kuriya',
  'luckin', 'mei heong', 'munchi', 'nakhon', 'polar puffs', 'saizeriya',
  'secret recipe', 'sheng siong', 'srisun', 'starbucks', 'subway', 'stuff\'d',
  'super sarap', 'takagi ramen', 'texas chicken', 'the soup spoon', 'tori-q',
  'wang cafe', 'wok hey', 'xin wang', 'yong tau foo', 'ayam penyet', 'ban heng',
  'cellarbration', 'cheers', 'fairprice', '7-eleven', 'don don'
];

function isFnB(name) {
  const nameLower = name.toLowerCase();

  // Check against known chains
  for (const chain of FNB_CHAINS) {
    if (nameLower.includes(chain)) return true;
  }

  // Check against keywords
  for (const keyword of FNB_KEYWORDS) {
    if (nameLower.includes(keyword)) return true;
  }

  return false;
}

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('onigiri')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('seoul') ||
      nameLower.includes('ajumma')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao') ||
      nameLower.includes('signature')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha') || nameLower.includes('each a cup')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('acai') || nameLower.includes('juice') || nameLower.includes('smoothie')) {
    return 'healthy, drinks';
  }
  if (nameLower.includes('bar') || nameLower.includes('beer') || nameLower.includes('wine') ||
      nameLower.includes('pub') || nameLower.includes('cocktail')) {
    return 'bar, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-northpoint';
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

async function scrapeNorthpointCity() {
  console.log('=== SCRAPING NORTHPOINT CITY ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Northpoint City directory...');
    await page.goto('https://www.northpointcity.com.sg/stores', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(15000);

    // Filter by Food & Restaurants category
    console.log('Filtering by Food & Restaurants category...');
    try {
      // Find and click the Category dropdown
      const categoryFilter = await page.locator('.store-filters select, [class*="category"] select').nth(1);
      await categoryFilter.selectOption('9'); // Category ID 9 = Food & Restaurants
      await page.waitForTimeout(5000);
      console.log('  Category filter applied');
    } catch (e) {
      console.log('  Could not apply category filter via select, trying click method...');
      try {
        // Try clicking on the dropdown
        await page.click('text=Category');
        await page.waitForTimeout(1000);
        await page.click('text=Food & Restaurants');
        await page.waitForTimeout(5000);
        console.log('  Category filter applied via click');
      } catch (e2) {
        console.log('  Could not apply category filter:', e2.message);
      }
    }

    // Collect stores from all pages
    const allStores = [];
    const seenNames = new Set();

    // Helper to extract stores from current page
    const extractStores = async () => {
      return await page.evaluate(() => {
        const results = [];
        const baseUrl = 'https://www.northpointcity.com.sg';

        document.querySelectorAll('.store-listing .item').forEach(item => {
          const nameEl = item.querySelector('a.name');
          const thumbEl = item.querySelector('a.thumb img');
          const levelEl = item.querySelector('.location .level .text');

          const name = nameEl?.textContent?.trim();
          if (!name || name.length < 2) return;

          let imageUrl = thumbEl?.src || '';
          if (imageUrl && imageUrl.indexOf('http') === -1) {
            imageUrl = baseUrl + imageUrl;
          }

          const level = levelEl?.textContent?.trim() || '';

          results.push({
            name,
            level,
            imageUrl: imageUrl || null
          });
        });

        return results;
      });
    };

    // Get stores from page 1
    console.log('Collecting stores from all pages...');
    let pageStores = await extractStores();
    console.log(`  Page 1: ${pageStores.length} stores`);
    for (const store of pageStores) {
      const key = store.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allStores.push(store);
      }
    }

    // Click through remaining pages
    for (let pageNum = 2; pageNum <= 10; pageNum++) {
      try {
        const pageBtn = await page.locator(`.pagination >> text="${pageNum}"`).first();
        if (await pageBtn.isVisible()) {
          await pageBtn.click();
          await page.waitForTimeout(4000);

          pageStores = await extractStores();
          console.log(`  Page ${pageNum}: ${pageStores.length} stores`);

          for (const store of pageStores) {
            const key = store.name.toLowerCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              allStores.push(store);
            }
          }
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }

    const stores = allStores;

    console.log(`Found ${stores.length} total stores`);

    // Filter for F&B only (in case category filter didn't work)
    const fnbStores = stores.filter(s => isFnB(s.name));
    console.log(`Found ${fnbStores.length} F&B stores after keyword filtering`);

    if (fnbStores.length === 0) {
      console.log('No F&B stores found, saving debug...');
      await page.screenshot({ path: 'northpoint-debug.png', fullPage: true });
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.level}) ${store.imageUrl ? '✓img' : ''}`);
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
    for (const store of fnbStores) {
      let thumbnail = store.imageUrl;
      let hours = null;

      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      hours = await findExistingOpeningHours(store.name);
      if (hours) console.log(`    Found existing hours for ${store.name}`);

      const category = getCategory(store.name);

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.level || '',
          category: category,
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  ✓ ${store.name} (${store.level || 'no unit'})`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported}/${fnbStores.length} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'northpoint-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeNorthpointCity();

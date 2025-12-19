const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'eastpoint-mall';

// Eastpoint F&B outlets with URL slugs (from manual copy)
const EASTPOINT_FNB = [
  { name: '57 Mala Xiang Guo', slug: '57-mala-xiang-guo' },
  { name: '85 Redhill Teochew Fishball Noodles', slug: '85-redhill-teochew-fishball-noodles' },
  { name: 'A Hot Hideout', slug: 'a-hot-hideout' },
  { name: 'ANDES by ASTONS', slug: 'andes-by-astons' },
  { name: 'Antalya Taste of Turkey', slug: 'antalya-taste-of-turkey' },
  { name: 'Bibimbap/Dosirak', slug: 'bibimbap-dosirak' },
  { name: 'Boost Juice Bars', slug: 'boost-juice-bars' },
  { name: 'BreadTalk', slug: 'breadtalk' },
  { name: 'Buddy Hoagies Café & Grill', slug: 'buddy-hoagies-cafe-grill' },
  { name: 'Burger King', slug: 'burger-king' },
  { name: 'Butter & Cream', slug: 'butter-cream' },
  { name: 'Crave', slug: 'crave' },
  { name: 'Deliz Cafe', slug: 'deliz-cafe' },
  { name: 'Firefry', slug: 'firefry' },
  { name: 'Hanis Café & Bakery', slug: 'hanis-cafe-bakery' },
  { name: 'Hawkers\' Street', slug: 'hawkers-street' },
  { name: 'Heavenly Wang', slug: 'heavenly-wang' },
  { name: 'iTEA', slug: 'itea' },
  { name: 'KFC', slug: 'kfc' },
  { name: 'KOI Thé', slug: 'koi-the' },
  { name: 'Koo Kee', slug: 'koo-kee' },
  { name: 'Kopi & Tarts x The Jelly Hearts', slug: 'kopi-tarts-x-the-jelly-hearts' },
  { name: 'Lizoo', slug: 'lizoo' },
  { name: 'Long John Silver\'s', slug: 'long-john-silvers' },
  { name: 'Luckin Coffee', slug: 'luckin-coffee' },
  { name: 'McDonald\'s', slug: 'mcdonald-s' },
  { name: 'Mei Heong Yuen Dessert', slug: 'mei-heong-yuen-dessert' },
  { name: 'MIXUE', slug: 'mixue' },
  { name: 'MOS Burger', slug: 'mos-burger' },
  { name: 'Mr Bean', slug: 'mr-bean' },
  { name: 'Mr. Coconut', slug: 'mr-coconut' },
  { name: 'Nam Kee Pau', slug: 'nam-kee-pau' },
  { name: 'Nandhana\'s Restaurant', slug: 'nandhana-s-restaurant' },
  { name: 'Pizza Hut', slug: 'pizza-hut' },
  { name: 'Potato Corner', slug: 'potato-corner' },
  { name: 'PrimaDéli', slug: 'primadeli' },
  { name: 'Lanwang Chicken', slug: 'lanwang-chicken' },
  { name: 'Qi Ji', slug: 'qi-ji' },
  { name: 'Saizeriya', slug: 'saizeriya' },
  { name: 'Sakura Family Restaurant', slug: 'sakura-family-restaurant' },
  { name: 'Sanook Kitchen', slug: 'sanook-kitchen' },
  { name: 'Shi Li Fang Hot Pot', slug: 'shi-li-fang-hot-pot' },
  { name: 'Starbucks', slug: 'starbucks' },
  { name: 'Subway', slug: 'subway' },
  { name: 'Super Sushi', slug: 'super-sushi' },
  { name: 'Takagi Ramen', slug: 'takagi-ramen' },
  { name: 'The Original Vadai', slug: 'the-original-vadai' },
  { name: 'The Tree Cafe', slug: 'the-tree-cafe' },
  { name: 'Toast Box', slug: 'toast-box' },
  { name: 'umisushi', slug: 'umisushi' },
  { name: 'Veggie House', slug: 'veggie-house' },
  { name: 'Wingstop', slug: 'wingstop' },
  { name: 'Xi Men Jie', slug: 'xi-men-jie' },
  { name: 'Ya Kun Kaya Toast', slug: 'ya-kun-kaya-toast' },
  { name: 'Yes Lemon', slug: 'yes-lemon' }
];

// F&B related keywords to filter stores
const FNB_KEYWORDS = [
  'restaurant', 'cafe', 'coffee', 'food', 'eat', 'dining', 'kitchen',
  'grill', 'bakery', 'toast', 'noodle', 'rice', 'chicken', 'fish',
  'meat', 'pork', 'beef', 'sushi', 'ramen', 'pizza', 'burger',
  'tea', 'juice', 'drink', 'bar', 'pub', 'dessert', 'ice cream',
  'cake', 'bread', 'dim sum', 'hotpot', 'bbq', 'korean', 'japanese',
  'thai', 'chinese', 'indian', 'western', 'italian', 'mexican',
  'hawker', 'kopitiam', 'foodcourt', 'snack', 'boba', 'bubble',
  'acai', 'bistro', 'deli', 'soup', 'salad', 'wrap', 'sandwich'
];

// Known F&B chain names
const FNB_CHAINS = [
  '4fingers', 'a-one', 'ajisen', 'astons', 'boon tong kee', 'breadtalk',
  'burger king', 'carl\'s jr', 'chagee', 'chicha', 'coffeebean',
  'crystal jade', 'din tai fung', 'domino', 'don don donki', 'each a cup',
  'eighteen chefs', 'fish & co', 'genki sushi', 'gong cha', 'hai di lao',
  'kfc', 'kopitiam', 'koufu', 'liho', 'mcdonald', 'mos burger', 'mr bean',
  'nando', 'old chang kee', 'pastamania', 'pepper lunch', 'pizza hut',
  'poulet', 'putien', 'sakae sushi', 'seoul garden', 'starbucks', 'subway',
  'sushi express', 'sushi tei', 'swensen', 'the coffee bean', 'tim ho wan',
  'toast box', 'wingstop', 'ya kun', 'yoshinoya', 'jollibee', 'shake shack',
  'jollibean', 'fun toast', 'soup spoon', 'popeyes', 'auntie anne', 'baskin',
  'beard papa', 'bee cheng hiang', 'bengawan', 'boost', 'cat & the fiddle',
  'chateraise', 'chocolate origin', 'delifrance', 'dian xiao er', 'dunkin',
  'famous amos', 'gelare', 'polar puffs', 'saizeriya', 'secret recipe',
  'stuff\'d', 'texas chicken', 'the soup spoon', 'wang cafe', 'wok hey',
  'xin wang', 'yong tau foo', 'ayam penyet', 'ichiban', 'watami', 'ippudo',
  'marche', 'thai express', 'paik\'s', 'daiso', 'hei sushi', 'maki-san',
  'salad stop', 'cedele', 'o\'coffee', 'paris baguette', 'hans', 'lenas'
];

function isFnB(name, category) {
  const nameLower = name.toLowerCase();
  const catLower = (category || '').toLowerCase();

  // Check category first
  if (catLower.includes('food') || catLower.includes('beverage') ||
      catLower.includes('dining') || catLower.includes('restaurant') ||
      catLower.includes('cafe')) {
    return true;
  }

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
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('seoul')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('gelato') || nameLower.includes('baskin') ||
      nameLower.includes('dessert') || nameLower.includes('acai')) {
    return 'dessert, food';
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
    + '-eastpoint';
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

async function scrapeEastpoint() {
  console.log('=== SCRAPING EASTPOINT MALL ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const baseUrl = 'https://www.eastpoint.sg/content/frasersexperience/epm/en/stores/';
    const fnbStores = [];

    console.log(`Scraping ${EASTPOINT_FNB.length} F&B outlets from individual pages...\n`);

    for (const outlet of EASTPOINT_FNB) {
      const url = baseUrl + outlet.slug + '.html';

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const data = await page.evaluate(() => {
          // Get unit number from page text
          const allText = document.body.innerText;
          const unitMatch = allText.match(/#[BL]?\d+-\d+[A-Z]?/i);
          const unit = unitMatch ? unitMatch[0] : '';

          // Get store logo/thumbnail - look for store-logos in the image URL
          const imgs = Array.from(document.querySelectorAll('img'));
          let thumbnail = '';
          for (const img of imgs) {
            if (img.src && img.src.includes('store-logos') && img.src.includes('.png')) {
              thumbnail = img.src;
              break;
            }
          }

          return { unit, thumbnail };
        });

        fnbStores.push({
          name: outlet.name,
          unit: data.unit,
          imageUrl: data.thumbnail
        });

        console.log(`  ✓ ${outlet.name} (${data.unit || 'no unit'}) ${data.thumbnail ? '✓img' : ''}`);

      } catch (e) {
        // Page not found or error - still add with no data
        console.log(`  ✗ ${outlet.name} - ${e.message.substring(0, 30)}`);
        fnbStores.push({
          name: outlet.name,
          unit: '',
          imageUrl: null
        });
      }
    }

    console.log(`\nFound ${fnbStores.length} F&B stores`);

    if (fnbStores.length === 0) {
      console.log('No F&B stores found, saving debug...');
      await page.screenshot({ path: 'eastpoint-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('eastpoint-debug.html', html);
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit}) ${store.imageUrl ? '✓img' : ''}`);
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
          level: store.unit || '',
          category: category,
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
    await page.screenshot({ path: 'eastpoint-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeEastpoint();

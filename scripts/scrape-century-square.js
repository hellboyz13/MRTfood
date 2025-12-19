const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'century-square';

// Century Square F&B outlets with URL slugs
const CENTURY_SQUARE_FNB = [
  { name: '50 Years Taste Of Tradition', slug: '50-years-taste-of-tradition' },
  { name: '8 Clover by Bakery Cuisine', slug: '8-clover-by-bakery-cuisine' },
  { name: 'Abundance', slug: 'abundance' },
  { name: 'Ayam Penyet President', slug: 'ayam-penyet-president' },
  { name: 'Bae.gal by Swee Heng', slug: 'bae-gal-by-swee-heng' },
  { name: "Beard Papa's", slug: 'beard-papa-s' },
  { name: 'Big Fish Small Fish', slug: 'big-fish-small-fish' },
  { name: 'Bober Tea', slug: 'bober-tea' },
  { name: 'Butahage', slug: 'butahage' },
  { name: 'Cai Ca', slug: 'cai-ca' },
  { name: 'Dickson Nasi Lemak', slug: 'dickson-nasi-lemak' },
  { name: 'EAT.', slug: 'eat' },
  { name: 'Eat 3 Bowls', slug: 'eat-3-bowls' },
  { name: 'eCreative Cake', slug: 'ecreative-cake' },
  { name: 'Four Seasons Durians', slug: 'four-seasons-durians' },
  { name: 'Fried Chicken Master', slug: 'fried-chicken-master' },
  { name: 'Golden Banana', slug: 'golden-banana' },
  { name: 'Golden Chopsticks', slug: 'golden-chopsticks' },
  { name: 'Gong Yuan Ma La Tang', slug: 'gong-yuan-ma-la-tang' },
  { name: 'HaiDiLao Hot Pot', slug: 'haidilao-hot-pot' },
  { name: 'Ichiban Boshi', slug: 'ichiban-boshi' },
  { name: 'Ji De Chi Dessert', slug: 'ji-de-chi-dessert' },
  { name: 'Jollibee', slug: 'jollibee' },
  { name: 'KAZO', slug: 'kazo' },
  { name: 'Kei Kaisendon', slug: 'kei-kaisendon' },
  { name: 'Krispy Kreme', slug: 'krispy-kreme' },
  { name: 'Luckin Coffee', slug: 'luckin-coffee' },
  { name: 'Maki-San', slug: 'maki-san' },
  { name: 'Men Men Don Don', slug: 'men-men-don-don' },
  { name: 'Ministry of Rojak', slug: 'ministry-of-rojak' },
  { name: 'Mixue', slug: 'mixue' },
  { name: 'Mr Bean', slug: 'mr-bean' },
  { name: 'Mr You Tiao', slug: 'mr-you-tiao' },
  { name: 'Mr. Coconut', slug: 'mr-coconut' },
  { name: "My Korean Mum's Kimchi", slug: 'my-korean-mum-s-kimchi' },
  { name: 'Nan Yang Dao', slug: 'nan-yang-dao' },
  { name: "Nelly's Retro Snacks", slug: 'nelly-s-retro-snacks' },
  { name: 'Nine Fresh', slug: 'nine-fresh' },
  { name: 'Old Tea Hut', slug: 'old-tea-hut' },
  { name: 'Saizeriya', slug: 'saizeriya' },
  { name: 'Starbucks', slug: 'starbucks' },
  { name: 'SUKIYA', slug: 'sukiya' },
  { name: 'Sushi Express', slug: 'sushi-express' },
  { name: 'Swee Choon', slug: 'swee-choon' },
  { name: 'Teahouse by Soup Restaurant', slug: 'teahouse-by-soup-restaurant' },
  { name: 'Texas Chicken', slug: 'texas-chicken' },
  { name: 'The Coffee Bean & Tea Leaf', slug: 'the-coffee-bean-tea-leaf' },
  { name: 'The Food Market by Food Junction', slug: 'the-food-market-by-food-junction' },
  { name: 'The MeatHouse by 18 Chefs', slug: 'the-meathouse-by-18-chefs' },
  { name: 'The Original Vadai', slug: 'the-original-vadai' },
  { name: 'The Tree Cafe', slug: 'the-tree-cafe' },
  { name: 'Tip Top Curry Puff', slug: 'tip-top-curry-puff' },
  { name: 'Tongue Tip Lanzhou Beef Noodles', slug: 'tongue-tip-lanzhou-beef-noodles' },
  { name: 'Tonkotsu Kazan Ramen', slug: 'tonkotsu-kazan-ramen' },
  { name: 'Twyst', slug: 'twyst' },
  { name: 'Wok The Fish!', slug: 'wok-the-fish' },
  { name: 'XW Plus Western Grill', slug: 'xw-plus-western-grill' },
  { name: 'Ya Kun Kaya Toast', slug: 'ya-kun-kaya-toast' },
  { name: 'Yi Fang Fruit Tea', slug: 'yi-fang-fruit-tea' }
];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('tea hut') || nameLower.includes('luckin')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie') ||
      nameLower.includes('krispy') || nameLower.includes('beard papa') || nameLower.includes('swee heng')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop') || nameLower.includes('texas chicken') ||
      nameLower.includes('fried chicken')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('ichiban') || nameLower.includes('tonkotsu') || nameLower.includes('kaisendon') ||
      nameLower.includes('sukiya') || nameLower.includes('maki')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('kimchi')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('haidilao') || nameLower.includes('swee choon') || nameLower.includes('mala') ||
      nameLower.includes('lanzhou') || nameLower.includes('chopsticks') || nameLower.includes('teahouse')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha') || nameLower.includes('bober') || nameLower.includes('yi fang') ||
      nameLower.includes('mixue')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('gelato') ||
      nameLower.includes('durian') || nameLower.includes('nine fresh') || nameLower.includes('ji de chi')) {
    return 'dessert, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('ayam penyet') || nameLower.includes('rojak')) {
    return 'local, food';
  }
  if (nameLower.includes('western') || nameLower.includes('grill') || nameLower.includes('fish') ||
      nameLower.includes('meathouse') || nameLower.includes('18 chefs')) {
    return 'western, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-century-square';
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

async function scrapeCenturySquare() {
  console.log('=== SCRAPING CENTURY SQUARE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const baseUrl = 'https://www.centurysquare.com.sg/content/frasersexperience/cs/en/stores/';
    const fnbStores = [];

    console.log(`Scraping ${CENTURY_SQUARE_FNB.length} F&B outlets from individual pages...\n`);

    for (const outlet of CENTURY_SQUARE_FNB) {
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
            if (img.src && img.src.includes('store-logos') && (img.src.includes('.png') || img.src.includes('.jpg'))) {
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
      console.log('No F&B stores found');
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
    await page.screenshot({ path: 'century-square-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeCenturySquare();

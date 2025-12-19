const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'causeway-point';

// Causeway Point F&B outlets with URL slugs
const CAUSEWAY_POINT_FNB = [
  { name: '4FINGERS Crispy Chicken', slug: '4fingers-crispy-chicken' },
  { name: 'Aburi-EN', slug: 'aburi-en' },
  { name: 'Ah Ma Chi Mian', slug: 'ah-ma-chi-mian' },
  { name: 'Ajisen Tanjiro', slug: 'ajisen-tanjiro' },
  { name: 'Annabella Patisserie', slug: 'annabella-patisserie' },
  { name: 'Bali Thai', slug: 'bali-thai' },
  { name: 'Bee Cheng Hiang', slug: 'bee-cheng-hiang' },
  { name: 'Bengawan Solo', slug: 'bengawan-solo' },
  { name: 'Boon Lay Power Nasi Lemak', slug: 'boon-lay-power-nasi-lemak' },
  { name: 'Boost Juice Bars', slug: 'boost-juice-bars' },
  { name: 'BreadTalk', slug: 'breadtalk' },
  { name: 'Butter & Cream', slug: 'butter-cream' },
  { name: 'Cantine', slug: 'cantine' },
  { name: 'CHAGEE', slug: 'chagee' },
  { name: 'Chateraise', slug: 'chateraise' },
  { name: 'Chicken Ka Kee', slug: 'chicken-ka-kee' },
  { name: 'Crave', slug: 'crave' },
  { name: 'Crystal Jade Hong Kong Kitchen', slug: 'crystal-jade-hong-kong-kitchen' },
  { name: 'Délifrance', slug: 'delifrance' },
  { name: 'Dian Xiao Er', slug: 'dian-xiao-er' },
  { name: 'Dough Culture', slug: 'dough-culture' },
  { name: 'Duke Bakery', slug: 'duke-bakery' },
  { name: "Dunkin' Donuts", slug: 'dunkin-donuts' },
  { name: 'Each-a-Cup', slug: 'each-a-cup' },
  { name: 'Eat 3 Bowls', slug: 'eat-3-bowls' },
  { name: 'Famous Amos', slug: 'famous-amos' },
  { name: 'Fish & Co.', slug: 'fish-co' },
  { name: 'Food Republic', slug: 'food-republic' },
  { name: 'Four Leaves', slug: 'four-leaves' },
  { name: 'Geláre', slug: 'gelare' },
  { name: 'Ho Kee Pau', slug: 'ho-kee-pau' },
  { name: 'Hokkaido Baked Cheese Tart', slug: 'hokkaido-baked-cheese-tart' },
  { name: 'Hot Tomato', slug: 'hot-tomato' },
  { name: 'HUGABO', slug: 'hugabo' },
  { name: 'Ichiban Boshi', slug: 'ichiban-boshi' },
  { name: 'KFC', slug: 'kfc' },
  { name: 'Laaziiz', slug: 'laaziiz' },
  { name: 'Lao Huo Tang', slug: 'lao-huo-tang' },
  { name: "McDonald's", slug: 'mcdonald-s' },
  { name: 'MOS Burger', slug: 'mos-burger' },
  { name: 'Mr Bean', slug: 'mr-bean' },
  { name: 'Mr. Coconut', slug: 'mr-coconut' },
  { name: 'MUNCHI PANCAKES / ALC RICEBOWLS', slug: 'munchi-pancakes-alc-ricebowls' },
  { name: "Nelly's Retro Snacks", slug: 'nelly-s-retro-snacks' },
  { name: 'NiKU iKU', slug: 'niku-iku' },
  { name: 'Nine Fresh', slug: 'nine-fresh' },
  { name: 'Nomad Ventures', slug: 'nomad-ventures' },
  { name: 'Old Chang Kee', slug: 'old-chang-kee' },
  { name: 'PastaMania', slug: 'pastamania' },
  { name: 'Pezzo', slug: 'pezzo' },
  { name: 'Playmade', slug: 'playmade' },
  { name: 'Poke Theory', slug: 'poke-theory' },
  { name: 'Polar Puffs & Cakes', slug: 'polar-puffs-cakes' },
  { name: 'Poulet', slug: 'poulet' },
  { name: 'PrimaDéli', slug: 'primadeli' },
  { name: 'Red Ginger', slug: 'red-ginger' },
  { name: 'rrooll', slug: 'rrooll' },
  { name: 'SF Fruits & Juices', slug: 'sf-fruits-juices' },
  { name: 'Shabu Sai', slug: 'shabu-sai' },
  { name: 'Snackz It!', slug: 'snackz-it' },
  { name: "Stuff'd", slug: 'stuff-d' },
  { name: 'Sushiro', slug: 'sushiro' },
  { name: 'Swee Heng 1989 Signature', slug: 'swee-heng-1989-signature' },
  { name: "Swensen's", slug: 'swensen-s' },
  { name: 'Tenderfresh Xpress', slug: 'tenderfresh-xpress' },
  { name: 'Teppan-Yaki', slug: 'teppan-yaki' },
  { name: 'Texas Chicken', slug: 'texas-chicken' },
  { name: 'The Coffee Bean & Tea Leaf', slug: 'the-coffee-bean-tea-leaf' },
  { name: 'The Dim Sum Place', slug: 'the-dim-sum-place' },
  { name: 'Tiong Bahru Jian Bo Shui Kueh', slug: 'tiong-bahru-jian-bo-shui-kueh' },
  { name: 'Toast Box', slug: 'toast-box' },
  { name: 'Tokyo Shokudo', slug: 'tokyo-shokudo' },
  { name: 'Tonkatsu ENbiton', slug: 'tonkatsu-enbiton' },
  { name: 'Wang Lu Hotpot', slug: 'wang-lu-hotpot' },
  { name: 'Wok Hey', slug: 'wok-hey' },
  { name: 'Xiang Xiang Hunan Cuisine', slug: 'xiang-xiang-hunan-cuisine' },
  { name: 'Ya Kun Kaya Toast', slug: 'ya-kun-kaya-toast' },
  { name: 'Yolé', slug: 'yole' },
  { name: 'Yoshinoya', slug: 'yoshinoya' },
  { name: 'Zhang Liang Mala Tang', slug: 'zhang-liang-mala-tang' }
];

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie') ||
      nameLower.includes('polar') || nameLower.includes('prima') || nameLower.includes('bengawan') ||
      nameLower.includes('four leaves') || nameLower.includes('duke') || nameLower.includes('swee heng') ||
      nameLower.includes('dough') || nameLower.includes('famous amos') || nameLower.includes('hokkaido')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop') || nameLower.includes('texas chicken') ||
      nameLower.includes('old chang kee') || nameLower.includes('tenderfresh')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('ichiban') || nameLower.includes('tonkatsu') || nameLower.includes('aburi') ||
      nameLower.includes('yoshinoya') || nameLower.includes('ajisen') || nameLower.includes('sushiro') ||
      nameLower.includes('tokyo')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('niku')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('haidilao') || nameLower.includes('crystal jade') || nameLower.includes('mala') ||
      nameLower.includes('dian xiao') || nameLower.includes('lao huo') || nameLower.includes('wang lu') ||
      nameLower.includes('xiang xiang') || nameLower.includes('wok hey') || nameLower.includes('shabu')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum') || nameLower.includes('bali')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha') || nameLower.includes('each a cup') || nameLower.includes('playmade')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('gelato') ||
      nameLower.includes('gelare') || nameLower.includes('swensen') || nameLower.includes('yole') ||
      nameLower.includes('nine fresh') || nameLower.includes('chateraise')) {
    return 'dessert, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('local') || nameLower.includes('crave') ||
      nameLower.includes('shui kueh') || nameLower.includes('chi mian')) {
    return 'local, food';
  }
  if (nameLower.includes('western') || nameLower.includes('grill') || nameLower.includes('fish & co') ||
      nameLower.includes('pasta') || nameLower.includes('poulet') || nameLower.includes('hot tomato')) {
    return 'western, food';
  }
  if (nameLower.includes('juice') || nameLower.includes('boost') || nameLower.includes('fruit')) {
    return 'healthy, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-causeway-point';
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

async function scrapeCausewayPoint() {
  console.log('=== SCRAPING CAUSEWAY POINT ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const baseUrl = 'https://www.causewaypoint.com.sg/content/frasersexperience/cwp/en/stores/';
    const fnbStores = [];

    console.log(`Scraping ${CAUSEWAY_POINT_FNB.length} F&B outlets from individual pages...\n`);

    for (const outlet of CAUSEWAY_POINT_FNB) {
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
    await page.screenshot({ path: 'causeway-point-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeCausewayPoint();

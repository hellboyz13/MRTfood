const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CapitaLand mall configurations
const CAPITALAND_MALLS = {
  'aperia': {
    url: 'https://www.capitaland.com/sg/malls/aperia/en/stores.html?category=foodandbeverage',
    mallId: 'aperia-mall',
    name: 'Aperia Mall'
  },
  'bedokmall': {
    url: 'https://www.capitaland.com/sg/malls/bedokmall/en/stores.html?category=foodandbeverage',
    mallId: 'bedok-mall',
    name: 'Bedok Mall'
  },
  'bugisplus': {
    url: 'https://www.capitaland.com/sg/malls/bugisplus/en/stores.html?category=foodandbeverage',
    mallId: 'bugis',
    name: 'Bugis+'
  },
  'bugisjunction': {
    url: 'https://www.capitaland.com/sg/malls/bugisjunction/en/stores.html?category=foodandbeverage',
    mallId: 'bugis-junction',
    name: 'Bugis Junction'
  },
  'clarkequay': {
    url: 'https://www.capitaland.com/sg/malls/clarkequay/en/stores.html?category=foodandbeverage',
    mallId: 'clarke-quay',
    name: 'Clarke Quay'
  },
  'bukitpanjangplaza': {
    url: 'https://www.capitaland.com/sg/malls/bukitpanjangplaza/en/stores.html?category=foodandbeverage',
    mallId: 'bukit-panjang-plaza',
    name: 'Bukit Panjang Plaza'
  },
  'funan': {
    url: 'https://www.capitaland.com/sg/malls/funan/en/stores.html?category=foodandbeverage',
    mallId: 'funan',
    name: 'Funan'
  },
  'imm': {
    url: 'https://www.capitaland.com/sg/malls/imm/en/stores.html?category=foodandbeverage',
    mallId: 'imm',
    name: 'IMM'
  },
  'junction8': {
    url: 'https://www.capitaland.com/sg/malls/junction8/en/stores.html?category=foodandbeverage',
    mallId: 'junction-8',
    name: 'Junction 8'
  },
  'plazasingapura': {
    url: 'https://www.capitaland.com/sg/malls/plazasingapura/en/stores.html?category=foodandbeverage',
    mallId: 'plaza-singapura',
    name: 'Plaza Singapura'
  },
  'rafflescity': {
    url: 'https://www.capitaland.com/sg/malls/rafflescity/en/stores.html?category=foodandbeverage',
    mallId: 'raffles-city',
    name: 'Raffles City'
  },
  'sengkanggrandmall': {
    url: 'https://www.sengkanggrandmall.com.sg/en/stores.html?category=foodandbeverage',
    mallId: 'sengkang-grand-mall',
    name: 'Sengkang Grand Mall'
  },
  'tampinesmall': {
    url: 'https://www.capitaland.com/sg/malls/tampinesmall/en/stores.html?category=foodandbeverage',
    mallId: 'tampines-mall',
    name: 'Tampines Mall'
  },
  'lotone': {
    url: 'https://www.capitaland.com/sg/malls/lotone/en/stores.html?category=foodandbeverage',
    mallId: 'lot-one',
    name: 'Lot One'
  }
};

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('chagee') || nameLower.includes('gong cha') || nameLower.includes('each a cup') ||
      nameLower.includes('tealive') || nameLower.includes('tiger sugar') || nameLower.includes('beutea')) {
    return 'drinks, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('espresso') || nameLower.includes('coffee')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('cedele') ||
      nameLower.includes('old chang kee') || nameLower.includes('bread') || nameLower.includes('chewy') ||
      nameLower.includes('krispy') || nameLower.includes('four leaves') || nameLower.includes('lavender')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger king') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('jollibee') ||
      nameLower.includes('pizza hut') || nameLower.includes('popeyes') || nameLower.includes('wendy') ||
      nameLower.includes('texas chicken') || nameLower.includes('mos burger') || nameLower.includes('yoshinoya')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki') ||
      nameLower.includes('tempura') || nameLower.includes('don') || nameLower.includes('ichiran') ||
      nameLower.includes('ippudo') || nameLower.includes('ajisen') || nameLower.includes('itacho')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('ajumma') ||
      nameLower.includes('kimchi') || nameLower.includes('bbq') || nameLower.includes('seoul')) {
    return 'korean, food';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('ma la') || nameLower.includes('hai di lao') || nameLower.includes('szechuan') ||
      nameLower.includes('xiaolongkan')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook') || nameLower.includes('nara')) {
    return 'thai, food';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('fish & co') || nameLower.includes('pasta') || nameLower.includes('steak') ||
      nameLower.includes('grill')) {
    return 'western, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic') ||
      nameLower.includes('koufu') || nameLower.includes('foodcourt') || nameLower.includes('food junction')) {
    return 'food court, food';
  }
  if (nameLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('gelato') ||
      nameLower.includes('llao llao') || nameLower.includes('sweet')) {
    return 'desserts, food';
  }

  return 'restaurant, food';
}

// Generate slug ID
function generateId(name, mallId) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-' + mallId;
}

async function scrapeMall(mallKey) {
  const mallConfig = CAPITALAND_MALLS[mallKey];
  if (!mallConfig) {
    console.error(`Unknown mall: ${mallKey}`);
    console.log('Available malls:', Object.keys(CAPITALAND_MALLS).join(', '));
    return { success: false, count: 0 };
  }

  const { url, mallId, name } = mallConfig;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`SCRAPING: ${name} (${mallId})`);
  console.log(`${'='.repeat(50)}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture API responses
  const apiStores = [];
  page.on('response', async (response) => {
    const responseUrl = response.url();
    if (responseUrl.includes('tenants') && responseUrl.includes('foodandbeverage')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();

          if (json.properties && Array.isArray(json.properties)) {
            json.properties.forEach(item => {
              if (item['jcr:title'] && item.entityType === 'tenants') {
                let unit = '';
                if (item.unitnumber && Array.isArray(item.unitnumber) && item.unitnumber[0]) {
                  const unitPath = item.unitnumber[0];
                  const unitMatch = unitPath.match(/\/([^\/]+)$/);
                  if (unitMatch) {
                    unit = '#' + unitMatch[1].toUpperCase();
                  }
                }

                let category = 'restaurant, food';
                if (item.marketingcategory && Array.isArray(item.marketingcategory)) {
                  const cat = item.marketingcategory[0] || '';
                  if (cat.includes('cafe')) category = 'cafe, food';
                  else if (cat.includes('bakery')) category = 'bakery, food';
                  else if (cat.includes('fastfood')) category = 'fast food, food';
                  else if (cat.includes('kiosk')) category = 'snacks, food';
                }

                const thumbnail = item.thumbnail
                  ? (item.thumbnail.startsWith('http') ? item.thumbnail : 'https://www.capitaland.com' + item.thumbnail)
                  : null;

                apiStores.push({
                  name: item['jcr:title'],
                  unit: unit,
                  imageUrl: thumbnail,
                  category: category
                });
              }
            });
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  try {
    console.log('Loading page...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Waiting for API responses...');
    await page.waitForTimeout(12000);

    // Scroll to trigger more API calls
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(3000);

    console.log(`Captured ${apiStores.length} stores from API`);

    if (apiStores.length === 0) {
      console.log('No stores found via API, skipping...');
      await browser.close();
      return { success: false, count: 0 };
    }

    // Deduplicate
    const uniqueStores = [];
    const seenNames = new Set();

    for (const store of apiStores) {
      const normalizedName = store.name.toLowerCase().trim();
      if (seenNames.has(normalizedName) ||
          normalizedName === 'singapore' ||
          normalizedName.includes(mallId) ||
          normalizedName.length < 2) {
        continue;
      }
      seenNames.add(normalizedName);
      uniqueStores.push(store);
    }

    console.log(`Unique stores: ${uniqueStores.length}`);

    // Check if mall exists in database
    const { data: mallExists } = await supabase
      .from('malls')
      .select('id')
      .eq('id', mallId)
      .single();

    if (!mallExists) {
      console.log(`Mall ${mallId} not found in database, skipping import...`);
      await browser.close();
      return { success: false, count: 0, stores: uniqueStores };
    }

    // Delete existing outlets
    console.log('Removing existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', mallId);

    if (existing && existing.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', mallId);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import new outlets
    console.log('Importing outlets...');
    let imported = 0;
    let failed = 0;

    for (const store of uniqueStores) {
      const category = store.category || getCategory(store.name);
      const id = generateId(store.name, mallId);

      const { error: insertError } = await supabase
        .from('mall_outlets')
        .insert({
          id: id,
          name: store.name,
          mall_id: mallId,
          level: store.unit || '',
          category: category,
          thumbnail_url: store.imageUrl,
          tags: []
        });

      if (insertError) {
        failed++;
      } else {
        imported++;
      }
    }

    console.log(`\nImported: ${imported}, Failed: ${failed}`);
    await browser.close();
    return { success: true, count: imported };

  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    return { success: false, count: 0 };
  }
}

async function scrapeAllMalls(mallKeys) {
  console.log('='.repeat(60));
  console.log('CAPITALAND MALL SCRAPER - BATCH MODE');
  console.log('='.repeat(60));
  console.log(`\nMalls to scrape: ${mallKeys.length}\n`);

  const results = {};
  let totalImported = 0;

  for (const mallKey of mallKeys) {
    const result = await scrapeMall(mallKey);
    results[mallKey] = result;
    if (result.success) {
      totalImported += result.count;
    }
    // Small delay between malls
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const [mall, result] of Object.entries(results)) {
    const status = result.success ? '✓' : '✗';
    console.log(`${status} ${CAPITALAND_MALLS[mall]?.name || mall}: ${result.count} outlets`);
  }
  console.log(`\nTotal imported: ${totalImported}`);

  return results;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'all') {
  // Scrape all malls
  const allMallKeys = Object.keys(CAPITALAND_MALLS);
  scrapeAllMalls(allMallKeys).catch(console.error);
} else if (args[0] === 'list') {
  console.log('Available malls:');
  for (const [key, config] of Object.entries(CAPITALAND_MALLS)) {
    console.log(`  ${key}: ${config.name} (${config.mallId})`);
  }
} else {
  // Scrape specific malls
  scrapeAllMalls(args).catch(console.error);
}

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('convenience') || nameLower.includes('cheers')) {
    return 'convenience, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopi') || nameLower.includes('espresso') || nameLower.includes('cedele')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('baguette') || nameLower.includes('donut') || nameLower.includes('croissant') ||
      nameLower.includes('breadtalk') || nameLower.includes('prima deli') || nameLower.includes('four leaves')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea house') ||
      nameLower.includes('chicha') || nameLower.includes('liho') || nameLower.includes('koi') ||
      nameLower.includes('juice') || nameLower.includes('mr bean') || nameLower.includes('each a cup')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('gelato') ||
      nameLower.includes('baskin') || nameLower.includes('candy') || nameLower.includes('sweet')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('mos burger') || nameLower.includes('pizza hut') || nameLower.includes('burger')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('izakaya') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('sukiya') || nameLower.includes('ichiban') ||
      nameLower.includes('yakiniku') || nameLower.includes('sashimi') || nameLower.includes('a-one')) {
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
      nameLower.includes('yum cha') || nameLower.includes('din tai fung')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('bangkok') || nameLower.includes('tom yum') ||
      nameLower.includes('chilchil')) {
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
      nameLower.includes('astons') || nameLower.includes('collin') || nameLower.includes('fish')) {
    return 'western, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('local') || nameLower.includes('hawker') ||
      nameLower.includes('kopitiam') || nameLower.includes('nanyang') || nameLower.includes('crave') ||
      nameLower.includes('peranakan')) {
    return 'local, food';
  }
  if (nameLower.includes('vegetarian') || nameLower.includes('veggie') || nameLower.includes('vegan')) {
    return 'vegetarian, food';
  }
  if (nameLower.includes('food court') || nameLower.includes('food republic') || nameLower.includes('koufu')) {
    return 'food court, food';
  }

  return 'restaurant, food';
}

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`']/g, '')
    .replace(/[®™©–—]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateId(name, mallSuffix) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-' + mallSuffix;
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

async function scrapeFarEastMall(mallId, mallName, url, mallSuffix) {
  console.log(`\n=== SCRAPING ${mallName.toUpperCase()} ===\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Loading ${mallName} shops page...`);
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 90000
    });

    await page.waitForTimeout(3000);

    // Click "Load More" until all shops are loaded
    let loadMoreClicks = 0;
    while (loadMoreClicks < 10) {
      try {
        const loadMore = await page.$('a.load-more-button, button:has-text("Load More"), a:has-text("Load More")');
        if (loadMore && await loadMore.isVisible()) {
          await loadMore.click();
          loadMoreClicks++;
          console.log(`  Clicked Load More (${loadMoreClicks})`);
          await page.waitForTimeout(2000);
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Extract all shops - Far East Mall uses b-store-* classes
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Far East Mall specific selectors - each store is in a div with b-col-* class
      document.querySelectorAll('section.shop-list .b-col-xs-6').forEach(card => {
        let name = '';
        let unit = '';
        let category = '';
        let imageUrl = null;

        // Get store name from b-store-title
        const nameEl = card.querySelector('.b-store-title');
        if (nameEl) {
          // Get only the first text node, not the voucher icon
          const textNodes = [];
          for (const node of nameEl.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              textNodes.push(node.textContent.trim());
            }
          }
          name = textNodes.join(' ').replace(/\s+/g, ' ').trim();
          if (!name) {
            name = nameEl.textContent?.replace(/\s+/g, ' ').trim();
          }
        }

        // Get unit from b-store-unit
        const unitEl = card.querySelector('.b-store-unit');
        if (unitEl) {
          unit = unitEl.textContent?.trim();
        }

        // Get category from b-store-type
        const catEl = card.querySelector('.b-store-type');
        if (catEl) {
          category = catEl.textContent?.trim().toLowerCase();
        }

        // Get image from b-store-image
        const img = card.querySelector('.b-store-image img');
        if (img) {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
            imageUrl = src.startsWith('http') ? src : 'https://www.fareastmalls.com.sg' + src;
          }
        }

        if (name && name.length > 2) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ name, unit, category, imageUrl });
          }
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} total stores`);

    // F&B categories to include
    const fnbCategories = ['restaurant', 'cafe', 'food', 'beverage', 'bakery', 'dessert',
                           'fast food', 'dining', 'f&b', 'snack', 'drink'];

    // Filter for F&B outlets
    const fnbStores = stores.filter(s => {
      const cat = s.category.toLowerCase();
      return fnbCategories.some(fc => cat.includes(fc)) ||
             cat.includes('convenience') ||
             s.name.toLowerCase().includes('7-eleven');
    });

    if (fnbStores.length === 0) {
      console.log('No F&B stores found, saving debug...');
      await page.screenshot({ path: `${mallSuffix}-debug.png`, fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync(`${mallSuffix}-debug.html`, html);
      await browser.close();
      return;
    }

    console.log(`\nF&B outlets: ${fnbStores.length}`);
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) [${store.category}]`);
    }

    // Delete existing outlets
    console.log('\nRemoving existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', mallId);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', mallId);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import outlets
    console.log('\nImporting outlets...');
    let imported = 0;
    let withThumbnail = 0;
    let withHours = 0;

    for (const store of fnbStores) {
      let thumbnail = store.imageUrl || null;
      const { thumbnail: existingThumb, hours } = await findExistingData(store.name);

      if (!thumbnail && existingThumb) {
        thumbnail = existingThumb;
      }

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name, mallSuffix),
          name: store.name,
          mall_id: mallId,
          level: store.unit || '',
          category: getCategory(store.name),
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        if (thumbnail) withThumbnail++;
        if (hours) withHours++;
        console.log(`  ✓ ${store.name} (${store.unit || 'no unit'}) ${thumbnail ? '✓img' : ''} ${hours ? '✓hrs' : ''}`);
      } else {
        console.log(`  ✗ ${store.name} - ${error.message}`);
      }
    }

    console.log(`\n=== ${mallName.toUpperCase()} COMPLETE ===`);
    console.log(`Imported: ${imported}/${fnbStores.length} outlets`);
    console.log(`With thumbnails: ${withThumbnail}/${imported}`);
    console.log(`With hours: ${withHours}/${imported}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `${mallSuffix}-error.png`, fullPage: true });
  } finally {
    await browser.close();
  }
}

async function main() {
  // Scrape HillV2
  await scrapeFarEastMall(
    'hillv2',
    'HillV2',
    'https://www.fareastmalls.com.sg/en/hillv2/shops?s=',
    'hillv2'
  );

  // Scrape Greenwich V
  await scrapeFarEastMall(
    'greenwich-v',
    'Greenwich V',
    'https://www.fareastmalls.com.sg/en/greenwich-v/shops?s=',
    'greenwich-v'
  );
}

main();

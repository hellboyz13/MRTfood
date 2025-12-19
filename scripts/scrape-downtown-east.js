const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'downtown-east';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('coffee') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('starbucks') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopifellas')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('croissant') || nameLower.includes('patisserie') ||
      nameLower.includes('pancake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger') ||
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes') ||
      nameLower.includes('4fingers') || nameLower.includes('wingstop') || nameLower.includes('pizza')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('ajiya') || nameLower.includes('yakiniku') || nameLower.includes('okonomiyaki')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('seoul')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao') ||
      nameLower.includes('mala') || nameLower.includes('haha hotpot') || nameLower.includes('nasi padang') ||
      nameLower.includes('heritage')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha') || nameLower.includes('mixue')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('gelato') || nameLower.includes('baskin') ||
      nameLower.includes('dessert') || nameLower.includes('acai') || nameLower.includes('açaí') ||
      nameLower.includes('delato')) {
    return 'dessert, food';
  }
  if (nameLower.includes('bar') || nameLower.includes('beer') || nameLower.includes('wine') ||
      nameLower.includes('pub') || nameLower.includes('cocktail') || nameLower.includes('live music')) {
    return 'bar, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-downtown-east';
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

async function scrapeDowntownEast() {
  console.log('=== SCRAPING DOWNTOWN EAST ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Collect stores from all pages
    const allStores = [];
    const seenNames = new Set();

    // The page has 5 pages of F&B outlets
    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      console.log(`Loading page ${pageNum}...`);

      const url = pageNum === 1
        ? 'https://www.downtowneast.com.sg/experience/eat/food-beverage'
        : `https://www.downtowneast.com.sg/experience/eat/food-beverage?page=${pageNum}`;

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await page.waitForTimeout(3000);

      // Extract stores from this page using the correct selectors
      const stores = await page.evaluate(() => {
        const results = [];

        // Downtown East uses Bootstrap cards with specific classes
        document.querySelectorAll('.card.mb-4').forEach(card => {
          // Get name from card-title or h5
          const titleEl = card.querySelector('.card-title, h5, h4');
          let name = titleEl?.textContent?.trim() || '';

          // Clean up name (remove special characters at end)
          name = name.replace(/\u200B/g, '').trim(); // Remove zero-width spaces

          if (!name || name.length < 2 || name.length > 100) return;

          // Get location from card-shopnumber
          const locEl = card.querySelector('.card-shopnumber, .card-bottom-info');
          let unit = locEl?.textContent?.trim() || '';
          unit = unit.replace(/\u200B/g, '').trim();

          // Get image
          const imgEl = card.querySelector('img.card-img-top');
          let imageUrl = imgEl?.src || null;
          if (imageUrl && imageUrl.startsWith('data:')) imageUrl = null;

          results.push({ name, unit, imageUrl });
        });

        return results;
      });

      console.log(`  Found ${stores.length} stores on page ${pageNum}`);

      // Add unique stores
      for (const store of stores) {
        const key = store.name.toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          allStores.push(store);
        }
      }
    }

    console.log(`\nTotal unique F&B stores: ${allStores.length}`);

    if (allStores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'downtown-east-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('downtown-east-debug.html', html);
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of allStores) {
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
    for (const store of allStores) {
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
    console.log(`Imported: ${imported}/${allStores.length} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'downtown-east-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeDowntownEast();

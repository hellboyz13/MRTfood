const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'millenia-walk';

function getCategory(name, desc = '') {
  const text = (name + ' ' + desc).toLowerCase();

  if (text.includes('coffee') || text.includes('cafe') || text.includes('café') ||
      text.includes('starbucks') || text.includes('espresso')) {
    return 'cafe, food';
  }
  if (text.includes('bakery') || text.includes('bread') || text.includes('pastry') ||
      text.includes('croissant')) {
    return 'bakery, food';
  }
  if (text.includes('bar') || text.includes('pub') || text.includes('wine') ||
      text.includes('beer') || text.includes('cocktail')) {
    return 'bar, food';
  }
  if (text.includes('sushi') || text.includes('japanese') || text.includes('ramen') ||
      text.includes('izakaya') || text.includes('tempura')) {
    return 'japanese, food';
  }
  if (text.includes('korean') || text.includes('bbq') || text.includes('kimchi')) {
    return 'korean, food';
  }
  if (text.includes('chinese') || text.includes('dim sum') || text.includes('cantonese') ||
      text.includes('szechuan') || text.includes('hotpot')) {
    return 'chinese, food';
  }
  if (text.includes('thai')) {
    return 'thai, food';
  }
  if (text.includes('italian') || text.includes('pizza') || text.includes('pasta')) {
    return 'italian, food';
  }
  if (text.includes('indian') || text.includes('curry') || text.includes('tandoor')) {
    return 'indian, food';
  }
  if (text.includes('western') || text.includes('steak') || text.includes('grill') ||
      text.includes('burger') || text.includes('american')) {
    return 'western, food';
  }
  if (text.includes('fast food') || text.includes('mcdonald') || text.includes('kfc')) {
    return 'fast food, food';
  }
  if (text.includes('dessert') || text.includes('ice cream') || text.includes('gelato') ||
      text.includes('cake') || text.includes('sweet')) {
    return 'desserts, food';
  }
  if (text.includes('seafood') || text.includes('fish') || text.includes('lobster') ||
      text.includes('crab') || text.includes('oyster')) {
    return 'seafood, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-millenia-walk';
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

async function scrapeMilleniaWalk() {
  console.log('=== SCRAPING MILLENIA WALK ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Millenia Walk Dine page...');
    await page.goto('https://www.milleniawalk.com/explore-mw?category=dine', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Extract stores from the page - Millenia Walk uses button cards with h3 and h6
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Millenia Walk structure: button cards containing h3 (name) and h6 (unit)
      // Also has a category badge in .rounded-full
      document.querySelectorAll('button.rounded-\\[15px\\], button[class*="aspect-"]').forEach(card => {
        // Get name from h3
        const nameEl = card.querySelector('h3');
        let name = nameEl?.textContent?.trim();

        // Clean up name - remove [New!] [Coming soon] etc
        if (name) {
          name = name.replace(/\s*\[.*?\]\s*/g, '').trim();
        }

        if (!name || name.length < 2) return;

        // Get unit number from h6
        const unitEl = card.querySelector('h6');
        const unit = unitEl?.textContent?.trim() || '';

        // Get category from the badge
        const categoryEl = card.querySelector('.rounded-full p');
        const category = categoryEl?.textContent?.trim() || '';

        // Get image
        const img = card.querySelector('img[class*="aspect-"]');
        let imageUrl = img?.src;
        if (imageUrl && imageUrl.includes('/_next/image')) {
          // Extract actual image URL from Next.js image
          const urlMatch = imageUrl.match(/url=([^&]+)/);
          if (urlMatch) {
            imageUrl = decodeURIComponent(urlMatch[1]);
          }
        }

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name,
            unit,
            category,
            imageUrl
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from page scraping`);

    // Filter stores - all should be F&B since we're on the dine page
    const junkNames = ['home', 'about', 'contact', 'explore', 'dine', 'shop', 'events', 'news', 'login', 'sign up'];
    let fnbStores = stores.filter(s =>
      s.name.length > 2 &&
      !junkNames.some(j => s.name.toLowerCase() === j)
    );

    // Update getCategory to use the scraped category
    fnbStores = fnbStores.map(s => ({
      ...s,
      scrapedCategory: s.category
    }));

    if (fnbStores.length === 0) {
      console.log('No stores found by scraping, saving debug screenshot...');
      await page.screenshot({ path: 'millenia-walk-debug.png', fullPage: true });

      // Save HTML for debugging
      const html = await page.content();
      require('fs').writeFileSync('millenia-walk-debug.html', html);
      console.log('Saved debug files');

      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'}) ${store.imageUrl ? '✓img' : ''}`);
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
      let thumbnail = store.imageUrl || null;
      let hours = null;

      // Try to find existing thumbnail if none scraped
      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      // Try to find existing opening hours
      hours = await findExistingOpeningHours(store.name);
      if (hours) console.log(`    Found existing hours for ${store.name}`);

      const category = getCategory(store.name, store.description);

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
    await page.screenshot({ path: 'millenia-walk-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeMilleniaWalk();

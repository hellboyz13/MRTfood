const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'harbourfront-centre';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('7-eleven') || nameLower.includes('convenience') || nameLower.includes('cheers')) {
    return 'convenience, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopi') || nameLower.includes('espresso') || nameLower.includes('fun toast')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('baguette') || nameLower.includes('donut') || nameLower.includes('croissant') ||
      nameLower.includes('dunkin') || nameLower.includes('four leaves') || nameLower.includes('pancake')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea house') ||
      nameLower.includes('chicha') || nameLower.includes('liho') || nameLower.includes('koi') ||
      nameLower.includes('juice') || nameLower.includes('wanpo') || nameLower.includes('mr bean')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('gelato') ||
      nameLower.includes('baskin') || nameLower.includes('candy') || nameLower.includes('bengawan')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('mos burger') || nameLower.includes('pizza hut') || nameLower.includes('yoshinoya')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('izakaya') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('sukiya') || nameLower.includes('hitoyoshi')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim') ||
      nameLower.includes('seoul')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('chinese') ||
      nameLower.includes('haidilao') || nameLower.includes('putien') || nameLower.includes('crystal jade') ||
      nameLower.includes('canton') || nameLower.includes('szechuan') || nameLower.includes('teochew') ||
      nameLower.includes('song fa') || nameLower.includes('bak kut teh') || nameLower.includes('mala') ||
      nameLower.includes('shi li fang')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('saap')) {
    return 'thai, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('saizeriya') || nameLower.includes('pastamania')) {
    return 'italian, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('tandoor')) {
    return 'indian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steak') || nameLower.includes('grill') ||
      nameLower.includes('astons') || nameLower.includes('collin') || nameLower.includes('harry')) {
    return 'western, food';
  }
  if (nameLower.includes('nasi lemak') || nameLower.includes('local') || nameLower.includes('hawker') ||
      nameLower.includes('kopitiam') || nameLower.includes('nanyang') || nameLower.includes('crave') ||
      nameLower.includes('prawn noodle') || nameLower.includes('pau') || nameLower.includes('boleh')) {
    return 'local, food';
  }
  if (nameLower.includes('vegetarian') || nameLower.includes('veggie') || nameLower.includes('elemen')) {
    return 'vegetarian, food';
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
    + '-harbourfront';
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

async function scrapeHarbourfrontCentre() {
  console.log('=== SCRAPING HARBOURFRONT CENTRE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading HarbourFront Centre F&B page...');
    // c=40 is the Food & Beverage category
    await page.goto('https://www.harbourfrontcentre.com.sg/store.php?c=40&vt=Category', {
      waitUntil: 'networkidle',
      timeout: 90000
    });

    await page.waitForTimeout(5000);

    // Scroll to load all stores
    console.log('Scrolling to load all stores...');
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Extract stores
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Look for store listings - typical mall website structure
      const storeCards = document.querySelectorAll('.store-item, .store-card, .item, [class*="store"], a[href*="store.php?id="], .listing-item');

      storeCards.forEach(card => {
        // Get store name
        let name = '';
        const nameEl = card.querySelector('h2, h3, h4, .store-name, .name, .title, strong, b');
        if (nameEl) {
          name = nameEl.textContent?.trim();
        } else if (card.textContent) {
          // If it's a link, try to get text
          name = card.textContent.trim().split('\n')[0].trim();
        }

        if (!name || name.length < 2) return;

        // Get unit number if available
        let unit = '';
        const unitMatch = card.textContent?.match(/#[B\d][0-9-A-Za-z\/&\s]+/);
        if (unitMatch) {
          unit = unitMatch[0].trim();
        }

        // Get image
        let imageUrl = null;
        const img = card.querySelector('img');
        if (img) {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
            imageUrl = src.startsWith('http') ? src : 'https://www.harbourfrontcentre.com.sg/' + src.replace(/^\//, '');
          }
        }

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name,
            unit,
            imageUrl
          });
        }
      });

      // Also try anchor links directly
      document.querySelectorAll('a[href*="store.php?id="]').forEach(link => {
        const parent = link.closest('div, li, article') || link;
        let name = '';

        const nameEl = parent.querySelector('h2, h3, h4, .store-name, .name, strong');
        if (nameEl) {
          name = nameEl.textContent?.trim();
        } else {
          // Get link text
          const linkText = link.textContent?.trim();
          if (linkText && linkText.length > 2 && linkText.length < 100) {
            name = linkText;
          }
        }

        if (!name || name.length < 2) return;

        let unit = '';
        const unitMatch = parent.textContent?.match(/#[B\d][0-9-A-Za-z\/&\s]+/);
        if (unitMatch) {
          unit = unitMatch[0].trim();
        }

        let imageUrl = null;
        const img = parent.querySelector('img');
        if (img) {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (src && !src.startsWith('data:') && !src.includes('placeholder')) {
            imageUrl = src.startsWith('http') ? src : 'https://www.harbourfrontcentre.com.sg/' + src.replace(/^\//, '');
          }
        }

        const key = name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            name,
            unit,
            imageUrl
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from scraping`);

    // Filter valid F&B stores
    const junkNames = ['home', 'about', 'contact', 'store directory', 'events', 'news', 'stores',
                       'shop', 'eat', 'play', 'wellness', 'family', 'community', 'map', 'visit',
                       'sign in', 'download app', 'learn more', 'find a property', 'about us',
                       'accessibility', 'search', 'view all', 'next', 'previous', 'category', 'all'];

    const fnbStores = stores.filter(s => {
      const nameLower = s.name.toLowerCase().trim();
      if (junkNames.some(j => nameLower === j)) return false;
      if (s.name.length < 3) return false;
      return true;
    });

    if (fnbStores.length === 0) {
      console.log('No F&B stores found via scraping, saving debug...');
      await page.screenshot({ path: 'harbourfront-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('harbourfront-debug.html', html);
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
    await page.screenshot({ path: 'harbourfront-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeHarbourfrontCentre();

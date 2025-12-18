const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'paya-lebar-quarter';

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
      nameLower.includes('subway') || nameLower.includes('jollibee') || nameLower.includes('popeyes')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee')) {
    return 'bubble tea, drinks';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-paya-lebar-quarter';
}

async function findExistingThumbnail(name) {
  const searchName = name.toLowerCase().trim();
  const { data } = await supabase
    .from('mall_outlets')
    .select('thumbnail_url, name')
    .not('thumbnail_url', 'is', null)
    .limit(500);

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
    .limit(500);

  if (data) {
    for (const outlet of data) {
      if (outlet.name.toLowerCase().trim() === searchName && outlet.opening_hours) {
        return outlet.opening_hours;
      }
    }
  }
  return null;
}

async function scrapePayaLebarQuarter() {
  console.log('=== SCRAPING PAYA LEBAR QUARTER ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Intercept API calls to find store data
  let apiData = null;
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') || url.includes('stores') || url.includes('directory')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`Found API response: ${url}`);
          if (Array.isArray(data) || (data && typeof data === 'object')) {
            apiData = data;
          }
        }
      } catch (e) {}
    }
  });

  try {
    console.log('Loading Paya Lebar Quarter food stores...');
    await page.goto('https://www.payalebarquarter.com/directory/mall/?categories=Food+%26+Restaurant', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for Vue to render
    await page.waitForTimeout(8000);

    // Try to wait for specific Vue elements
    try {
      await page.waitForSelector('[class*="store"], [class*="tenant"], [class*="card"], [class*="item"], [class*="shop"]', { timeout: 10000 });
      console.log('Found store elements');
    } catch (e) {
      console.log('No store elements found with waitForSelector, continuing...');
    }

    // Scroll to trigger lazy loading - need to scroll much more to load all stores
    console.log('Scrolling to load all stores...');
    let prevCardCount = 0;
    let sameCount = 0;

    // Scroll down to trigger lazy loading
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Check for "Load More" button and click it
      const loadMoreClicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button, a')].filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('load more') || text.includes('show more') || text.includes('view more');
        });
        if (buttons.length > 0) {
          buttons[0].click();
          return true;
        }
        return false;
      });
      if (loadMoreClicked) {
        console.log('  Clicked Load More button');
        await page.waitForTimeout(2000);
      }

      // Check how many cards we have now
      const cardCount = await page.evaluate(() => document.querySelectorAll('.directory-card').length);
      if (cardCount === prevCardCount) {
        sameCount++;
        if (sameCount >= 8) {
          console.log(`  Stopped scrolling at ${cardCount} cards (no new cards after 8 scrolls)`);
          break;
        }
      } else {
        console.log(`  Cards loaded: ${cardCount}`);
        sameCount = 0;
        prevCardCount = cardCount;
      }
    }
    await page.waitForTimeout(2000);

    // Debug: Log the page structure
    const pageInfo = await page.evaluate(() => {
      const allClasses = new Set();
      document.querySelectorAll('*').forEach(el => {
        el.classList.forEach(c => allClasses.add(c));
      });
      return {
        classesWithStore: [...allClasses].filter(c => c.toLowerCase().includes('store') || c.toLowerCase().includes('shop') || c.toLowerCase().includes('tenant') || c.toLowerCase().includes('card') || c.toLowerCase().includes('item') || c.toLowerCase().includes('directory')),
        bodyText: document.body.innerText.slice(0, 2000),
        allLinks: [...document.querySelectorAll('a')].map(a => ({ href: a.href, text: a.textContent?.trim()?.slice(0, 50) })).filter(l => l.text && l.text.length > 2).slice(0, 50)
      };
    });

    console.log('\nRelevant CSS classes found:', pageInfo.classesWithStore.slice(0, 30));
    console.log('\nPage text preview:', pageInfo.bodyText.slice(0, 500));
    console.log('\nLinks found:', pageInfo.allLinks.length);

    // Debug: Look at directory-card elements specifically
    const cardDebug = await page.evaluate(() => {
      const cards = document.querySelectorAll('.directory-card');
      return [...cards].slice(0, 3).map(card => ({
        html: card.innerHTML.slice(0, 1000),
        text: card.textContent?.trim()?.slice(0, 300)
      }));
    });
    console.log('\nDirectory cards found:', cardDebug.length);
    console.log('\nFirst card HTML:', cardDebug[0]?.html);

    // Extract stores from directory cards by parsing the text
    const stores = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('.directory-card').forEach(card => {
        const text = card.textContent?.trim() || '';

        // Parse text: "Food & Restaurant        Store Name        Opens Xam today #XX-XX, Location, Level X"
        // The store name appears after "Food & Restaurant" category
        const lines = text.split(/\s{2,}/).filter(l => l.trim());

        // Skip the category (first element like "Food & Restaurant")
        // Store name is typically the second element
        let name = '';
        let level = '';
        let openingHours = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === 'Food & Restaurant') continue;

          // Check if it's opening hours
          if (trimmed.toLowerCase().includes('open') || trimmed.includes('am') || trimmed.includes('pm')) {
            openingHours = trimmed;
            // Extract unit from opening hours line like "Opens 10am today #01-09, PLQ Parkside, Level 1"
            const unitMatch = trimmed.match(/#([0-9B]+[-][0-9K]+(?:\/[0-9K]+)*)/);
            if (unitMatch) {
              level = unitMatch[0];
            }
            continue;
          }

          // If we haven't found a name yet, this is likely the store name
          if (!name && trimmed.length > 1 && trimmed.length < 80) {
            name = trimmed;
          }
        }

        // Get image
        const imgEl = card.querySelector('img');
        const imageUrl = imgEl?.src || null;

        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          results.push({
            name,
            level,
            openingHours,
            imageUrl
          });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from main page`);

    // If no stores found, save debug
    if (stores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'paya-lebar-quarter-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('paya-lebar-quarter-debug.html', html.slice(0, 50000));
      await browser.close();
      return;
    }

    // Delete existing
    console.log('\nRemoving existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing?.length > 0) {
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    }

    // Import
    console.log('\nImporting outlets...');
    let imported = 0;
    for (const store of stores) {
      let thumbnail = store.imageUrl;
      let hours = store.openingHours || null;

      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }
      if (!hours) {
        hours = await findExistingOpeningHours(store.name);
        if (hours) console.log(`    Found existing hours for ${store.name}`);
      }

      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          id: generateId(store.name),
          name: store.name,
          mall_id: MALL_ID,
          level: store.level || '',
          category: getCategory(store.name),
          thumbnail_url: thumbnail,
          opening_hours: hours,
          tags: []
        });

      if (!error) {
        imported++;
        console.log(`  Imported: ${store.name} (${store.level || 'no unit'})`);
      } else {
        console.log(`  Error importing ${store.name}: ${error.message}`);
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Imported: ${imported} outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'paya-lebar-quarter-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapePayaLebarQuarter();

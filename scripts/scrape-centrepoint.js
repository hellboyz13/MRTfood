const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'the-centrepoint';

// Get category based on restaurant name
function getCategory(name) {
  const nameLower = name.toLowerCase();

  // Check specific restaurant names first
  if (nameLower.includes('astons') || nameLower.includes('steak')) {
    return 'Western';
  }
  if (nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('heytea') ||
      nameLower.includes('playmade') || nameLower.includes('mr coconut') || nameLower.includes('chicha') ||
      nameLower.includes('chagee') || (nameLower.includes('tea') && !nameLower.includes('steak'))) {
    return 'Drinks';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee bean') || nameLower.includes('toast') ||
      nameLower.includes('ya kun') || nameLower.includes('cafe') || nameLower.includes('café') ||
      nameLower.includes('coffee')) {
    return 'Cafe';
  }
  if (nameLower.includes('bakery') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('bengawan') || nameLower.includes('cookie') || nameLower.includes('cake') ||
      nameLower.includes('donut') || nameLower.includes('baguette') || nameLower.includes('cedele')) {
    return 'Bakery';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('burger king') ||
      nameLower.includes('subway') || nameLower.includes('long john') || nameLower.includes('jollibee') ||
      nameLower.includes('pizza hut') || nameLower.includes('popeyes') || nameLower.includes('wingstop')) {
    return 'Fast Food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('ramen') || nameLower.includes('japanese') ||
      nameLower.includes('yakiniku') || nameLower.includes('tonkatsu') || nameLower.includes('genki') ||
      nameLower.includes('don') || nameLower.includes('ichiban')) {
    return 'Japanese';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('ajumma') ||
      nameLower.includes('bbq') || nameLower.includes('seoul')) {
    return 'Korean';
  }
  if (nameLower.includes('din tai fung') || nameLower.includes('crystal jade') || nameLower.includes('paradise') ||
      nameLower.includes('putien') || nameLower.includes('hotpot') || nameLower.includes('dim sum') ||
      nameLower.includes('ma la') || nameLower.includes('chinese')) {
    return 'Chinese';
  }
  if (nameLower.includes('thai') || nameLower.includes('sanook')) {
    return 'Thai';
  }
  if (nameLower.includes('western') || nameLower.includes('astons') || nameLower.includes('collin') ||
      nameLower.includes('fish & co') || nameLower.includes('grill') || nameLower.includes('steak')) {
    return 'Western';
  }
  if (nameLower.includes('food court') || nameLower.includes('kopitiam') || nameLower.includes('food republic') ||
      nameLower.includes('foodcourt')) {
    return 'Food Court';
  }
  if (nameLower.includes('dessert') || nameLower.includes('ice cream') || nameLower.includes('llao') ||
      nameLower.includes('yogurt')) {
    return 'Desserts';
  }

  return 'Restaurant';
}

// Generate slug ID
function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-' + MALL_ID;
}

// Normalize name for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findMatchingOutlet(name) {
  const searchTerms = [
    name.toLowerCase(),
    name.toLowerCase().split(' ')[0],
    name.toLowerCase().replace(/[''s]/g, '')
  ];

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('name, thumbnail_url, opening_hours, category')
    .or('thumbnail_url.not.is.null,opening_hours.not.is.null');

  if (!outlets) return null;

  for (const term of searchTerms) {
    const match = outlets.find(o =>
      normalizeName(o.name).includes(term) ||
      term.includes(normalizeName(o.name).split(' ')[0])
    );
    if (match && (match.thumbnail_url || match.opening_hours)) {
      return match;
    }
  }

  return null;
}

async function scrapeAndImport() {
  console.log('=== SCRAPING THE CENTREPOINT ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // The Centrepoint uses Frasers Experience website
    const url = 'https://www.thecentrepoint.com.sg/content/frasersexperience/tcp/en/eat.html';
    console.log(`Loading: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait longer for page to fully load
    await page.waitForTimeout(5000);

    // Scroll to load all stores
    console.log('Scrolling to load all content...');
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(3000);

    // Try to click "Load More" buttons
    try {
      for (let i = 0; i < 10; i++) {
        const loadMore = await page.$('button:has-text("Load More"), .load-more, a:has-text("Load More"), [class*="load-more"], button:has-text("Show More")');
        if (loadMore) {
          await loadMore.click();
          await page.waitForTimeout(2000);
          console.log(`Clicked Load More (${i + 1})`);
        } else {
          break;
        }
      }
    } catch (e) {}

    // Get all store items - Frasers malls typically use teaser components
    const stores = await page.evaluate(() => {
      const results = [];

      // Try various selectors used by Frasers malls
      const selectors = [
        '.store-teaser',
        '.store-listing .item',
        '.store-card',
        '[class*="teaser"]',
        '.cmp-store-listing__item',
        'a[href*="/stores/"]',
        'a[href*="/store/"]',
        '.store-list-item',
        '[class*="store-item"]',
        '.card',
        '.listing-item'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Try to get store name
          const nameEl = el.querySelector('h2, h3, h4, .store-name, [class*="title"], [class*="name"], .cmp-teaser__title');
          let name = nameEl?.textContent?.trim();

          // If no name, try from link
          if (!name) {
            const link = el.querySelector('a[href*="/stores/"], a[href*="/store/"]') || el;
            if (link.tagName === 'A') {
              const href = link.getAttribute('href');
              if (href) {
                const match = href.match(/\/stores?\/([^/?#]+)/);
                if (match) {
                  name = match[1]
                    .replace(/\.html?$/i, '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                }
              }
            }
          }

          // Get unit/level
          const levelEl = el.querySelector('.store-level, .level, [class*="location"], [class*="unit"], .cmp-teaser__pretitle');
          const level = levelEl?.textContent?.trim() || '';

          // Get image
          const img = el.querySelector('img');
          let imgUrl = img?.src || img?.getAttribute('data-src');

          // Skip placeholder images
          if (imgUrl && (imgUrl.includes('placeholder') || imgUrl.includes('default'))) {
            imgUrl = null;
          }

          if (name && name.length > 2 && name.length < 100) {
            results.push({ name, level, imageUrl: imgUrl || null });
          }
        });
      }

      // Also try to find store names from any visible text that looks like store names
      document.querySelectorAll('h2, h3, h4').forEach(heading => {
        const name = heading.textContent?.trim();
        const parent = heading.closest('a, .card, .item, [class*="store"]');
        if (name && name.length > 2 && name.length < 60 && parent) {
          const img = parent.querySelector('img');
          const imgUrl = img?.src;
          results.push({ name, level: '', imageUrl: imgUrl || null });
        }
      });

      return results;
    });

    console.log(`Found ${stores.length} stores from selectors`);

    // Also get store links directly
    const storeLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const storeUrls = [];
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.includes('/stores/') || href.includes('/store/')) &&
            !href.endsWith('/stores') && !href.endsWith('/stores/') &&
            !href.endsWith('/store') && !href.endsWith('/store/')) {
          const match = href.match(/\/stores?\/([^/?#]+)/);
          if (match) {
            let storeName = match[1]
              .replace(/\.html?$/i, '') // Remove .html extension
              .replace(/-/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
            if (storeName && storeName.length > 2) {
              const img = link.querySelector('img');
              storeUrls.push({
                name: storeName,
                level: '',
                imageUrl: img?.src || null
              });
            }
          }
        }
      });
      return storeUrls;
    });

    console.log(`Found ${storeLinks.length} store links`);

    // Combine and dedupe
    const allStores = [...stores, ...storeLinks];
    const uniqueStores = [];
    const seenNames = new Set();

    // Common junk to filter out
    const junkNames = [
      'skip', 'accessibility', 'filter', 'clear', 'eat', 'shop', 'experience',
      'home', 'about', 'contact', 'directory', 'stores', 'all', 'view all',
      'load more', 'show more', 'see all', 'centrepoint', 'the centrepoint'
    ];

    for (const store of allStores) {
      const normalizedName = store.name.toLowerCase().trim();

      // Skip junk
      if (seenNames.has(normalizedName) ||
          junkNames.some(junk => normalizedName === junk || normalizedName.includes(junk)) ||
          normalizedName.length < 3) {
        continue;
      }
      seenNames.add(normalizedName);
      uniqueStores.push(store);
    }

    console.log(`Total unique stores: ${uniqueStores.length}\n`);

    // If too few stores, save debug
    if (uniqueStores.length < 5) {
      console.log('Too few stores found. Saving debug files...');
      await page.screenshot({ path: 'centrepoint-debug.png', fullPage: true });
      const html = await page.content();
      require('fs').writeFileSync('centrepoint-debug.html', html);
      console.log('Saved centrepoint-debug.png and centrepoint-debug.html');

      // Still continue with what we found
      if (uniqueStores.length === 0) {
        await browser.close();
        return;
      }
    }

    // List found stores
    console.log('Found stores:');
    uniqueStores.forEach(s => console.log(`  - ${s.name}${s.level ? ` (${s.level})` : ''}`));

    // Delete existing outlets
    console.log('\nStep 1: Removing existing outlets...');
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    if (existing && existing.length > 0) {
      console.log(`Found ${existing.length} existing outlets to remove`);
      await supabase.from('mall_outlets').delete().eq('mall_id', MALL_ID);
      console.log(`Deleted ${existing.length} existing outlets`);
    } else {
      console.log('No existing outlets found');
    }

    // Import new outlets
    console.log('\nStep 2: Importing outlets...');
    let imported = 0;
    let failed = 0;
    let withThumbnail = 0;
    let withHours = 0;

    for (const store of uniqueStores) {
      const category = getCategory(store.name);
      const id = generateId(store.name);

      // Try to find matching thumbnail and hours from existing database
      const match = await findMatchingOutlet(store.name);

      const outletData = {
        id: id,
        name: store.name,
        mall_id: MALL_ID,
        level: store.level || '',
        category: category,
        thumbnail_url: store.imageUrl || match?.thumbnail_url || null,
        opening_hours: match?.opening_hours || null,
        tags: [category]
      };

      const { error: insertError } = await supabase
        .from('mall_outlets')
        .insert(outletData);

      if (insertError) {
        console.log(`Error inserting ${store.name}: ${insertError.message}`);
        failed++;
        continue;
      }

      const thumbStatus = outletData.thumbnail_url ? '✓ thumb' : '✗ thumb';
      const hoursStatus = outletData.opening_hours ? '✓ hours' : '✗ hours';
      console.log(`Imported: ${store.name} (${category}) [${thumbStatus}] [${hoursStatus}]`);

      imported++;
      if (outletData.thumbnail_url) withThumbnail++;
      if (outletData.opening_hours) withHours++;
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Imported: ${imported}`);
    console.log(`With thumbnail: ${withThumbnail}`);
    console.log(`With opening hours: ${withHours}`);
    console.log(`Failed: ${failed}`);

    // Get final count
    const { data: finalCount } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID);

    console.log(`\nTotal outlets at The Centrepoint: ${finalCount?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'centrepoint-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeAndImport();

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'nex';

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
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('aburi') || nameLower.includes('genki')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu') || nameLower.includes('seoul')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('haidilao') ||
      nameLower.includes('canton') || nameLower.includes('dian xiao') || nameLower.includes('din tai')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('tom yum') || nameLower.includes('bali')) {
    return 'thai, food';
  }
  if (nameLower.includes('tea') || nameLower.includes('bubble') || nameLower.includes('boba') ||
      nameLower.includes('koi') || nameLower.includes('liho') || nameLower.includes('chagee') ||
      nameLower.includes('gong cha')) {
    return 'bubble tea, drinks';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('gelato') || nameLower.includes('baskin') ||
      nameLower.includes('dessert') || nameLower.includes('kakigori')) {
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
    + '-nex';
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

async function scrapeNEX() {
  console.log('=== SCRAPING NEX ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const baseUrl = 'https://www.nex.com.sg/Directory/Category/qbjHWjcKv2GJGewRmzGQOA_3d_3d/?Name=Restaurant%2C+Cafe+%26+Fast+Food';

    // Collect stores from all pages
    const allStores = [];
    const seenNames = new Set();

    // Helper function to extract stores from current page
    const extractStores = async () => {
      return await page.evaluate(() => {
        const results = [];

        // Get all shop links
        const links = document.querySelectorAll('a[href*="/Directory/Shop/"]');
        const images = document.querySelectorAll('img[src*="Image/Thumbnail"]');

        // Create image array
        const imgArray = Array.from(images).map(img => img.src);
        let imgIndex = 0;

        links.forEach(link => {
          const text = link.innerText?.trim();
          if (!text || text.length > 200 || text.startsWith('#')) return;

          const lines = text.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length >= 2) {
            const name = lines[0];
            const unit = lines[1];

            // Match with image (they should be in order)
            const imgSrc = imgArray[imgIndex] || '';
            imgIndex++;

            results.push({ name, unit, imgSrc });
          }
        });

        return results;
      });
    };

    // Load first page
    console.log('Loading page 1...');
    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(10000);

    // Get stores from page 1
    let pageStores = await extractStores();
    console.log(`  Found ${pageStores.length} stores on page 1`);
    for (const store of pageStores) {
      const key = store.name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allStores.push(store);
      }
    }

    // Click through pagination using NEXT button
    for (let pageNum = 2; pageNum <= 10; pageNum++) {
      try {
        // Click on NEXT link (>)
        const nextLink = await page.locator('a.page-link.next, a.next').first();
        if (await nextLink.isVisible()) {
          await nextLink.click();
          console.log(`Loading page ${pageNum}...`);
          await page.waitForTimeout(5000);

          pageStores = await extractStores();
          console.log(`  Found ${pageStores.length} stores on page ${pageNum}`);

          // Check if we got new stores
          let newStores = 0;
          for (const store of pageStores) {
            const key = store.name.toLowerCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              allStores.push(store);
              newStores++;
            }
          }

          // If no new stores found, we've reached the end
          if (newStores === 0) {
            console.log('  No new stores, reached end of pagination');
            break;
          }
        } else {
          console.log('  NEXT button not found');
          break;
        }
      } catch (e) {
        console.log(`  Pagination ended:`, e.message);
        break;
      }
    }

    console.log(`\nTotal unique F&B stores: ${allStores.length}`);

    if (allStores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'nex-debug.png', fullPage: true });
      await browser.close();
      return;
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of allStores) {
      console.log(`  - ${store.name} (${store.unit}) ${store.imgSrc ? '✓img' : ''}`);
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
      let thumbnail = store.imgSrc || null;
      let hours = null;

      // Try to find existing thumbnail if none scraped
      if (!thumbnail) {
        thumbnail = await findExistingThumbnail(store.name);
        if (thumbnail) console.log(`    Found existing thumbnail for ${store.name}`);
      }

      // Try to find existing opening hours
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
    await page.screenshot({ path: 'nex-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeNEX();

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MALL_ID = 'paya-lebar-square';

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
      nameLower.includes('don') || nameLower.includes('udon') || nameLower.includes('izakaya') ||
      nameLower.includes('keisuke')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bibim') || nameLower.includes('bbq') ||
      nameLower.includes('kimbap') || nameLower.includes('gyu')) {
    return 'korean, food';
  }
  if (nameLower.includes('chinese') || nameLower.includes('dim sum') || nameLower.includes('hotpot') ||
      nameLower.includes('tang') || nameLower.includes('nonya') || nameLower.includes('teochew')) {
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
    + '-paya-lebar-square';
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

async function scrapePayaLebarSquare() {
  console.log('=== SCRAPING PAYA LEBAR SQUARE ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Loading Paya Lebar Square food stores...');
    await page.goto('https://payalebarsquare.sg/store-category/restaurant-cafe-fast-food/?in_cat=15&directory_type=general', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Scroll to load all content
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Get all store links first
    const storeLinks = await page.evaluate(() => {
      const links = [];
      const seen = new Set();

      // Find all directory links
      document.querySelectorAll('a[href*="/directory/"]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href) || !href.includes('payalebarsquare.sg/directory/')) return;
        seen.add(href);

        // Get name from link text or parent
        let name = link.textContent?.trim();
        if (!name || name.length < 2) {
          const titleEl = link.closest('.atbd_single_listing')?.querySelector('.listing-title');
          name = titleEl?.textContent?.trim();
        }

        // Extract name from URL if still empty
        if (!name || name.length < 2) {
          const match = href.match(/\/directory\/([^\/]+)/);
          if (match) {
            name = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
        }

        if (name && name.length > 1) {
          links.push({ name, detailUrl: href });
        }
      });

      return links;
    });

    console.log(`Found ${storeLinks.length} store links`);

    // Visit each store page to get details
    const stores = [];
    for (const store of storeLinks) {
      try {
        console.log(`  Fetching details for: ${store.name}`);
        await page.goto(store.detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        const details = await page.evaluate(() => {
          let unit = '';
          let openingHours = '';
          let imageUrl = null;

          // Look for unit in the Address field - it's in a structured format
          const addressLabel = [...document.querySelectorAll('.atbd_content_module_contents p, .contact-info p')].find(p => {
            const text = p.textContent || '';
            return text.includes('Address');
          });

          // Try specific selectors for Directorist plugin
          const addressEl = document.querySelector('.atbdp_address, .atbd_listing_address span');
          if (addressEl) {
            unit = addressEl.textContent?.trim() || '';
          }

          // If no luck, look for unit pattern in content
          if (!unit) {
            const contentEl = document.querySelector('.atbd_content_module_contents, .entry-content');
            if (contentEl) {
              const text = contentEl.textContent || '';
              const match = text.match(/#?([0-9B]+[-][0-9K]+(?:\/[0-9K]+)*)/);
              if (match) {
                unit = match[0];
              }
            }
          }

          // Look for image
          const imgEl = document.querySelector('.listing-thumbnail img, .single-listing-image img, .atbd_listing_image img');
          if (imgEl) {
            imageUrl = imgEl.src || imgEl.getAttribute('data-src');
          }

          return { unit, openingHours, imageUrl };
        });

        stores.push({
          name: store.name,
          level: details.unit,
          openingHours: details.openingHours,
          imageUrl: details.imageUrl
        });
      } catch (err) {
        console.log(`    Error fetching ${store.name}: ${err.message}`);
        stores.push({ name: store.name, level: '', openingHours: '', imageUrl: null });
      }
    }

    console.log(`\nCollected ${stores.length} stores`);

    if (stores.length === 0) {
      console.log('No stores found, saving debug...');
      await page.screenshot({ path: 'paya-lebar-square-debug.png', fullPage: true });
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
      let hours = store.openingHours;

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
    await page.screenshot({ path: 'paya-lebar-square-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapePayaLebarSquare();

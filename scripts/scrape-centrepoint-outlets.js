const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== SCRAPING THE CENTREPOINT OUTLETS ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allOutlets = [];

  // Go to stores page (not eat.html)
  await page.goto('https://www.thecentrepoint.com.sg/content/frasersexperience/tcp/en/stores.html', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for content to load
  await page.waitForTimeout(5000);

  console.log('Page loaded, saving debug info...\n');

  // Save debug screenshot and HTML
  await page.screenshot({ path: 'centrepoint-stores-debug.png', fullPage: true });
  fs.writeFileSync('centrepoint-stores-debug.html', await page.content());
  console.log('Saved debug files');

  // Check pagination structure
  const paginationInfo = await page.evaluate(() => {
    const results = {
      pagination: null,
      pageItems: [],
      totalPages: 0
    };

    // Look for various pagination patterns
    const paginationSelectors = [
      '.pagination',
      '[class*="pagination"]',
      '.pager',
      '[class*="pager"]',
      '.cmp-dynamic-list-pagination-container',
      '[class*="page-number"]'
    ];

    for (const sel of paginationSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        results.pagination = sel;
        // Get page items
        const items = el.querySelectorAll('a, button, span, div.item, .item');
        items.forEach(item => {
          const text = item.textContent?.trim();
          if (text && text.length < 10) {
            results.pageItems.push(text);
          }
        });
        break;
      }
    }

    // Try to find total pages from numbered items
    const allText = document.body.innerText;
    const pageMatch = allText.match(/Page \d+ of (\d+)/i);
    if (pageMatch) {
      results.totalPages = parseInt(pageMatch[1]);
    }

    return results;
  });

  console.log('Pagination info:', paginationInfo);

  // Extract store data from the page
  // Based on Frasers Property pattern - data may be in JSON attributes
  const extractStores = async () => {
    return await page.evaluate(() => {
      const stores = [];
      const seen = new Set();

      // Method 1: Look for store config data in attributes (Frasers pattern)
      const configElements = document.querySelectorAll('[data-category-preview-storeconfigdata], [data-store-config], [data-stores]');
      configElements.forEach(el => {
        try {
          const attrs = ['data-category-preview-storeconfigdata', 'data-store-config', 'data-stores'];
          for (const attr of attrs) {
            const jsonStr = el.getAttribute(attr);
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              const items = Array.isArray(data) ? data : [data];
              items.forEach(store => {
                const name = (store.storeName || store.name || '').trim();
                const key = name.toLowerCase();
                if (name && !seen.has(key)) {
                  seen.add(key);
                  stores.push({
                    name: name,
                    unit: store.unitNo || store.unit || '',
                    website: store.website || '',
                    logo: store.storeLogo || store.logo || ''
                  });
                }
              });
            }
          }
        } catch (e) {}
      });

      // Method 2: Look for store listing cards
      const cardSelectors = [
        '.store-card',
        '.store-item',
        '.listing-item',
        '[class*="store-list"] .item',
        '.directory-item',
        '.cmp-dynamic-list-dine-shop-grid-item'
      ];

      for (const sel of cardSelectors) {
        const cards = document.querySelectorAll(sel);
        cards.forEach(card => {
          const nameEl = card.querySelector('h3, h4, .store-name, .name, .title, a.name');
          const unitEl = card.querySelector('.unit, .location, [class*="unit"], [class*="level"]');
          const imgEl = card.querySelector('img');

          const name = nameEl?.textContent?.trim();
          const unit = unitEl?.textContent?.trim();
          const logo = imgEl?.src || '';

          if (name && name.length > 1 && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            stores.push({ name, unit: unit || '', website: '', logo });
          }
        });
      }

      // Method 3: Look for store links and extract from URL
      const storeLinks = document.querySelectorAll('a[href*="/stores/"]');
      storeLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/stores\/([^/.#]+)/);
        if (match && match[1] !== 'stores') {
          const slug = match[1];
          // Try to get proper name from link content
          const img = link.querySelector('img');
          const text = link.textContent?.trim();
          let name = '';

          // Check alt text for name
          if (img?.alt && !img.alt.includes('Logo') && img.alt.length < 100) {
            name = img.alt.replace(/Logo.*$/i, '').trim();
          }
          // Use text content if short enough
          if (!name && text && text.length < 50 && text.length > 0) {
            name = text;
          }
          // Fall back to slug
          if (!name) {
            name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }

          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            stores.push({ name, unit: '', website: '', logo: img?.src || '' });
          }
        }
      });

      return stores;
    });
  };

  // First extraction
  let stores = await extractStores();
  console.log(`Found ${stores.length} stores on initial page`);
  stores.forEach(s => console.log(`  - ${s.name} ${s.unit ? '(' + s.unit + ')' : ''}`));
  allOutlets.push(...stores);

  // Try to find and click pagination if exists
  // Get total pages from pagination items
  let totalPages = 1;
  for (const item of paginationInfo.pageItems) {
    const num = parseInt(item);
    if (!isNaN(num) && num > totalPages) {
      totalPages = num;
    }
  }
  console.log(`Detected ${totalPages} pages`)

  if (paginationInfo.pagination) {
    console.log(`\n--- Navigating ${totalPages} pages ---\n`);

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      console.log(`Navigating to page ${pageNum}...`);

      // Try different pagination click strategies
      const clicked = await page.evaluate((pNum) => {
        // Strategy 1: Click numbered page item
        const items = document.querySelectorAll('.pagination a, .pagination span, .pagination div, [class*="pagination"] a, [class*="pagination"] span');
        for (const item of items) {
          if (item.textContent?.trim() === String(pNum)) {
            item.click();
            return true;
          }
        }

        // Strategy 2: Click "Next" button
        const nextBtns = document.querySelectorAll('button:has-text("Next"), a:has-text("Next"), [class*="next"]');
        for (const btn of nextBtns) {
          btn.click();
          return true;
        }

        // Strategy 3: Click arrow/caret
        const arrows = document.querySelectorAll('.ph-caret-right, [class*="arrow-right"], [class*="next-page"]');
        if (arrows.length) {
          arrows[0].click();
          return true;
        }

        return false;
      }, pageNum);

      if (clicked) {
        await page.waitForTimeout(3000);
        const newStores = await extractStores();
        console.log(`Found ${newStores.length} stores on page ${pageNum}`);

        // Add new stores
        const existingNames = new Set(allOutlets.map(o => o.name.toLowerCase()));
        for (const s of newStores) {
          if (!existingNames.has(s.name.toLowerCase())) {
            existingNames.add(s.name.toLowerCase());
            allOutlets.push(s);
          }
        }
      } else {
        console.log('Could not find pagination button');
        break;
      }
    }
  }

  await browser.close();

  // Clean and deduplicate final list
  const uniqueOutlets = [];
  const seen = new Set();

  // Bad names to filter out
  const badNames = ['map', 'a', 'a minimalist', ''];

  for (const o of allOutlets) {
    // Clean the name
    let name = o.name.trim();

    // Skip bad names
    if (badNames.includes(name.toLowerCase())) continue;
    if (name.length < 2) continue;

    // Clean unit number - remove "Map" suffix
    let unit = (o.unit || '').replace(/Map$/i, '').trim();
    // Convert "Basement 1" or "Level 1" to "#B1-" or "#01-" format if possible
    if (unit.startsWith('Basement ')) {
      unit = '#B' + unit.replace('Basement ', '');
    } else if (unit.startsWith('Level ')) {
      const lvl = unit.replace('Level ', '');
      unit = '#0' + lvl;
    }

    // Normalize name for deduplication
    const key = name.toLowerCase()
      .replace(/[&]/g, 'and')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    if (!seen.has(key) && key.length > 1) {
      seen.add(key);
      uniqueOutlets.push({
        ...o,
        name: name,
        unit: unit
      });
    }
  }

  console.log(`\n=== TOTAL: ${uniqueOutlets.length} unique outlets ===\n`);

  // Save to JSON for reference
  fs.writeFileSync('centrepoint-outlets.json', JSON.stringify(uniqueOutlets, null, 2));
  console.log('Saved outlets to centrepoint-outlets.json');

  if (uniqueOutlets.length === 0) {
    console.log('\nNo outlets found. Check debug files for page structure.');
    return;
  }

  // Check existing outlets in database
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', 'the-centrepoint');

  const existingNames = new Set(existing?.map(e => e.name.toLowerCase()) || []);
  const toInsert = uniqueOutlets.filter(o => !existingNames.has(o.name.toLowerCase()));

  console.log(`\nExisting in DB: ${existingNames.size}, To insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const records = toInsert.map(o => ({
      name: o.name,
      mall_id: 'the-centrepoint',
      level: o.unit || null
    }));

    const { data, error } = await supabase.from('mall_outlets').insert(records).select('id, name');

    if (error) {
      console.log('DB Error:', error.message);
    } else {
      console.log(`\nInserted ${data.length} outlets:`);
      data.forEach(d => console.log(`  + ${d.name}`));
    }
  }
}

main().catch(console.error);

const { chromium } = require('playwright');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MALL_ID = 'hillion-mall';

function getCategory(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('kopitiam') || nameLower.includes('food court') || nameLower.includes('foodcourt')) {
    return 'food court, food';
  }
  if (nameLower.includes('starbucks') || nameLower.includes('coffee') || nameLower.includes('café') ||
      nameLower.includes('cafe') || nameLower.includes('toast') || nameLower.includes('ya kun') ||
      nameLower.includes('kopi') || nameLower.includes('luckin')) {
    return 'cafe, food';
  }
  if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('cake') ||
      nameLower.includes('baguette') || nameLower.includes('donut') || nameLower.includes('croissant') ||
      nameLower.includes('baker') || nameLower.includes('breadtalk') || nameLower.includes('polar') ||
      nameLower.includes('chateraise')) {
    return 'bakery, food';
  }
  if (nameLower.includes('bubble tea') || nameLower.includes('boba') || nameLower.includes('tea house') ||
      nameLower.includes('chicha') || nameLower.includes('liho') || nameLower.includes('koi') ||
      nameLower.includes('juice') || nameLower.includes('boost') || nameLower.includes('mr bean') ||
      nameLower.includes('each a cup') || nameLower.includes('gong cha') || nameLower.includes('mixue') ||
      nameLower.includes('mr coconut') || nameLower.includes('i love taimei')) {
    return 'drinks, food';
  }
  if (nameLower.includes('ice cream') || nameLower.includes('dessert') || nameLower.includes('gelato') ||
      nameLower.includes('baskin') || nameLower.includes('candy') || nameLower.includes('chocolate') ||
      nameLower.includes('llaollao') || nameLower.includes('llao llao') || nameLower.includes('krispy')) {
    return 'desserts, food';
  }
  if (nameLower.includes('mcdonald') || nameLower.includes('burger king') || nameLower.includes('kfc') ||
      nameLower.includes('subway') || nameLower.includes('popeyes') || nameLower.includes('texas chicken') ||
      nameLower.includes('mos burger') || nameLower.includes('pizza') || nameLower.includes('yoshinoya') ||
      nameLower.includes('jollibee') || nameLower.includes('4fingers') || nameLower.includes('wingstop') ||
      nameLower.includes('long john')) {
    return 'fast food, food';
  }
  if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('ramen') ||
      nameLower.includes('donburi') || nameLower.includes('izakaya') || nameLower.includes('tempura') ||
      nameLower.includes('genki') || nameLower.includes('sukiya') || nameLower.includes('ichiban') ||
      nameLower.includes('yakiniku') || nameLower.includes('sashimi') || nameLower.includes('ajisen') ||
      nameLower.includes('tenya') || nameLower.includes('kaisendon') || nameLower.includes('maki-san') ||
      nameLower.includes('tori-q') || nameLower.includes('torigo') || nameLower.includes('ichikokudo')) {
    return 'japanese, food';
  }
  if (nameLower.includes('korean') || nameLower.includes('bbq') || nameLower.includes('kim') ||
      nameLower.includes('seoul') || nameLower.includes('bulgogi') || nameLower.includes('bibimbap') ||
      nameLower.includes('namu')) {
    return 'korean, food';
  }
  if (nameLower.includes('dim sum') || nameLower.includes('hotpot') || nameLower.includes('chinese') ||
      nameLower.includes('haidilao') || nameLower.includes('putien') || nameLower.includes('crystal jade') ||
      nameLower.includes('canton') || nameLower.includes('szechuan') || nameLower.includes('teochew') ||
      nameLower.includes('song fa') || nameLower.includes('bak kut teh') || nameLower.includes('mala') ||
      nameLower.includes('yum cha') || nameLower.includes('tim ho wan') || nameLower.includes('din tai fung') ||
      nameLower.includes('dian xiao') || nameLower.includes('xiao long') || nameLower.includes('lanzhou') ||
      nameLower.includes('gong yuan') || nameLower.includes('xiang xiang') || nameLower.includes('hunan') ||
      nameLower.includes('wonton') || nameLower.includes('wanton')) {
    return 'chinese, food';
  }
  if (nameLower.includes('thai') || nameLower.includes('bangkok') || nameLower.includes('tom yum') ||
      nameLower.includes('sanook')) {
    return 'thai, food';
  }
  if (nameLower.includes('italian') || nameLower.includes('pizza') || nameLower.includes('pasta') ||
      nameLower.includes('saizeriya') || nameLower.includes('pastamania') || nameLower.includes('pastago')) {
    return 'italian, food';
  }
  if (nameLower.includes('indian') || nameLower.includes('curry') || nameLower.includes('tandoor') ||
      nameLower.includes('naan') || nameLower.includes('biryani') || nameLower.includes('prata') ||
      nameLower.includes('penyet') || nameLower.includes('penyetz')) {
    return 'indian, food';
  }
  if (nameLower.includes('western') || nameLower.includes('steak') || nameLower.includes('grill') ||
      nameLower.includes('astons') || nameLower.includes('collin') || nameLower.includes('fish & co') ||
      nameLower.includes("han's")) {
    return 'western, food';
  }
  if (nameLower.includes('chicken rice') || nameLower.includes('local') || nameLower.includes('hawker') ||
      nameLower.includes('nanyang') || nameLower.includes('crave') || nameLower.includes('nasi lemak') ||
      nameLower.includes('bee cheng hiang') || nameLower.includes('old chang kee') || nameLower.includes('hainan') ||
      nameLower.includes('yong tau') || nameLower.includes('yong tao') || nameLower.includes('qiji') ||
      nameLower.includes('nan yang') || nameLower.includes('nonya') || nameLower.includes('harriann')) {
    return 'local, food';
  }
  if (nameLower.includes('snack') || nameLower.includes('biscuit') || nameLower.includes('cookie') ||
      nameLower.includes('famous amos') || nameLower.includes('churro') || nameLower.includes('auntie anne') ||
      nameLower.includes('shihlin') || nameLower.includes('nam kee pau') || nameLower.includes('stuff')) {
    return 'snacks, food';
  }
  if (nameLower.includes('acai') || nameLower.includes('fruit') || nameLower.includes('sf fruit')) {
    return 'healthy, food';
  }

  return 'restaurant, food';
}

function generateId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    + '-hillion';
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

async function scrapeHillion() {
  console.log('=== SCRAPING HILLION MALL ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allStores = new Map();

  try {
    console.log('Loading Hillion Mall store directory...');
    await page.goto('https://www.hillionmall.com.sg/store-directory/', {
      waitUntil: 'networkidle',
      timeout: 90000
    });

    // Wait for AJAX content to load
    await page.waitForTimeout(5000);

    // Find and click F&B category dropdowns to expand them
    const fbCategorySelectors = [
      'text="Café, Fast Food & Restaurants"',
      'text="Food Court"',
      'text="Snacks & Specialities"'
    ];

    for (const selector of fbCategorySelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          console.log(`Expanded: ${selector}`);
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        console.log(`Could not click: ${selector}`);
      }
    }

    // Wait for dropdowns to expand
    await page.waitForTimeout(3000);

    // Scroll to load all content
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(2000);

    // Extract stores - looking for the accordion structure
    const stores = await page.evaluate(() => {
      const results = [];

      // Look for tenant/store items within accordion panels
      // The structure appears to be: category header -> list of store names with unit numbers

      // Try to find store links or list items
      const storeElements = document.querySelectorAll('a[href*="/tenant/"], .tenant-item, .store-item, li a');

      storeElements.forEach(el => {
        const text = el.textContent?.trim() || '';
        const href = el.href || '';

        // Skip navigation items
        if (href.includes('store-directory') && !href.includes('/tenant/')) return;
        if (text.length < 3 || text.length > 100) return;

        // Get image if available
        const img = el.querySelector('img') || el.closest('li')?.querySelector('img');
        const imageUrl = img?.src || img?.getAttribute('data-src') || null;

        // Parse name and unit from text
        // Format might be "STORE NAME #XX-XX" or separate elements
        let name = text;
        let unit = '';

        const unitMatch = text.match(/(#[B]?\d{1,2}-\d{1,3}[A-Z]?(?:\/\d{1,3}[A-Z]?)?)/i);
        if (unitMatch) {
          unit = unitMatch[1];
          name = text.replace(unitMatch[0], '').trim();
        }

        // Also check for unit in href
        if (!unit && href) {
          const hrefUnitMatch = href.match(/(\d{1,2}-\d{1,3}[A-Z]?)/i);
          if (hrefUnitMatch) {
            unit = `#${hrefUnitMatch[1]}`;
          }
        }

        if (name && name.length > 2) {
          const key = name.toLowerCase();
          if (!results.find(r => r.key === key)) {
            results.push({ key, name, unit, imageUrl, link: href });
          }
        }
      });

      // Alternative: Look for visible store names in the expanded accordions
      const visibleText = document.body.innerText;
      const lines = visibleText.split('\n');

      let currentCategory = '';
      const fbCategories = ['café, fast food & restaurants', 'food court', 'snacks & specialities'];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        const lowerLine = trimmed.toLowerCase();

        // Track current category
        if (fbCategories.some(cat => lowerLine.includes(cat))) {
          currentCategory = lowerLine;
          return;
        }

        // Skip if not in F&B category context or too short/long
        if (trimmed.length < 3 || trimmed.length > 80) return;

        // Skip common junk
        const junkPatterns = [
          'store listing', 'what\'s on', 'amenities', 'concierge', 'parking',
          'subscribe', 'directory', 'happening', 'contact', 'getting here',
          'fashion', 'beauty', 'lifestyle', 'services', 'electronics',
          'entertainment', 'optical', 'childcare', 'education', 'others',
          'health', 'wellness', 'supermarket', 'department', 'home',
          'sports', 'jewellery', 'watches', 'bags', 'shoes', 'kids',
          'petir road', 'singapore', 'opening hours', 'tel:', 'fax:',
          'level', 'basement', 'floor', '@', '.com', '.sg', 'www.'
        ];

        if (junkPatterns.some(j => lowerLine.includes(j))) return;

        // Check if this looks like a store name (starts with capital or number)
        if (!/^[A-Z0-9]/.test(trimmed)) return;

        // Check for unit number format (might be on same or next line)
        let name = trimmed;
        let unit = '';

        // Check if current line has unit
        const unitMatch = trimmed.match(/(#[B]?\d{1,2}-\d{1,3}[A-Z]?(?:\/\d{1,3}[A-Z]?)?)/i);
        if (unitMatch) {
          unit = unitMatch[1];
          name = trimmed.replace(unitMatch[0], '').trim();
        }

        // Check next line for unit
        if (!unit && idx + 1 < lines.length) {
          const nextLine = lines[idx + 1].trim();
          const nextUnitMatch = nextLine.match(/^(#[B]?\d{1,2}-\d{1,3}[A-Z]?(?:\/\d{1,3}[A-Z]?)?)/i);
          if (nextUnitMatch) {
            unit = nextUnitMatch[1];
          }
        }

        // Skip if name starts with # (it's just a unit number)
        if (name.startsWith('#') || name.startsWith('/')) return;

        // Clean up name
        name = name.replace(/\s+/g, ' ').trim();

        if (name.length > 2) {
          const key = name.toLowerCase();
          if (!results.find(r => r.key === key)) {
            results.push({ key, name, unit, imageUrl: null, link: null });
          }
        }
      });

      return results;
    });

    console.log(`\nExtracted ${stores.length} stores from page`);

    // Add to map
    for (const store of stores) {
      allStores.set(store.key, store);
    }

    // Known F&B stores at Hillion Mall (from user's count: 49 + 1 + 12 = 62)
    // Filter to only F&B stores
    const fnbKeywords = [
      'fingers', 'auntie', 'ayam', 'penyet', 'chateraise', 'collin', 'crystal jade',
      'dian xiao', 'penyetz', 'cendol', 'genki', 'sushi', 'gong yuan', 'mala',
      "han's", 'cafe', 'harriann', 'nonya', 'ichikokudo', 'ramen', 'dessert',
      'kaisendon', 'prawn', 'noodle', 'kopi', 'tarts', 'llao', 'krispy',
      'long john', 'luckin', 'coffee', 'maki', 'mcdonald', 'mixue', 'mos burger',
      'munchi', 'pancake', 'namu', 'bulgogi', 'pastago', 'pontian', 'wanton',
      'qiji', 'saizeriya', 'sanook', 'kitchen', 'starbucks', 'subway', 'sukiya',
      'sushi express', 'tempura', 'tenya', 'hainan', 'soup spoon', 'tiong bahru',
      'yong tau', 'yong tao', 'tongue tip', 'lanzhou', 'beef', 'tori-q', 'torigo',
      'wingstop', 'wok', 'fish', 'ya kun', 'toast', 'nan yang', 'kopitiam',
      'acai', 'chicha', 'fragrance', 'taimei', 'koi', 'mr coconut', 'nam kee',
      'pau', 'old chang', 'sf fruit', 'shihlin', 'taiwan', 'stuff', 'uncle didi',
      'xiang xiang', 'hunan'
    ];

    const fnbStores = Array.from(allStores.values()).filter(s => {
      const nameLower = s.name.toLowerCase();
      // Must match at least one F&B keyword
      return fnbKeywords.some(kw => nameLower.includes(kw));
    });

    console.log(`Filtered to ${fnbStores.length} F&B stores`);

    if (fnbStores.length < 50) {
      console.log('\nWARNING: Found fewer stores than expected (62)');
      console.log('This may indicate the page structure has changed.');
      console.log('Check hillion-debug.png for visual reference.');

      // Save screenshot for debugging
      await page.screenshot({ path: 'hillion-debug.png', fullPage: true });
    }

    // Print found stores
    console.log('\nF&B outlets found:');
    for (const store of fnbStores) {
      console.log(`  - ${store.name} (${store.unit || 'no unit'})`);
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
    console.log(`Expected: ~62 outlets`);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'hillion-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

scrapeHillion();

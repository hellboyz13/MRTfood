const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Jewel outlets from CSV that need unit numbers
const jewelOutlets = [
  "Paradise Classic", "Potato Corner", "Sushiro", "PS.Cafe", "Soup Restaurant",
  "White Restaurant", "7Café", "ActionCity Café", "NY Char Grill", "OMEGA Pork Noodle",
  "PAUL Bakery & Restaurant", "Pizzamaru", "Pop Play Planet Cafe", "Kiwami Ramen & Gyoza Bar",
  "KOI Express", "Krispy Kreme", "Lady M", "Poulet Bijou", "Queic by Olivia",
  "Sampanman Kelong Changi", "SF Fruits & Juices", "SugarBelly", "SUKIYA",
  "Tai Er Suancai & Fish", "Talad Thai Banana", "Tambuah Mas", "Tempura Makino",
  "The 1872 Clipper Tea Co", "Tokyo Milk Cheese Factory", "TONITO", "Tutto by Da Paolo",
  "Twenty Loaf Toasties", "Wa-En Wagyu Yakiniku", "Wu Fang Zhai", "YES LEMON", "Yun Nans",
  "Dian Xiao Er", "An Acai Affair", "Arteastiq DePatio", "Auntie Anne's", "Bazil Kitchen",
  "Beauty in the Pot", "Birds of Paradise", "Boost Juice Bars", "Butter & Cream",
  "Café Kitsuné", "Cha Mulan", "CHICHA San Chen", "Chow Zan Dessert", "Coucou Hotpot",
  "Creamie Sippies", "Elfuego by COLLIN'S", "Gelatissimo", "Greendot Plus", "Gwangjang GAON",
  "HEYTEA", "Hitoyoshi Izakaya", "Hoshino Coffee", "Hot Tomato", "Imperial Treasure Super Peking Duck",
  "Ipoh Town", "JUMBO Seafood", "Kam's Roast", "KANE MOCHI", "Kantin", "LeMa Dumpling",
  "llaollao", "Mamma Mia Trattoria", "Monarchs & Milkweed", "Nasty Cookie", "Nesuto",
  "Nine Fresh", "Nong Geng Ji", "The Coach Restaurant", "The Hainan Story", "The Coffee Bean & Tea Leaf",
  "Dapur Penyet", "Din Tai Fung", "Hakka Yu", "Aburi-EN", "Monster Curry", "Song Fa Bak Kut Teh",
  "Arteastiq", "Josh's Grill", "Mr. Coconut", "Guzman y Gomez", "Old Chang Kee",
  "Shihlin Taiwan Street Food", "Kei Kaisendon", "Shake Shack", "Starbucks", "So Pho",
  "Sushi Tei", "Tonkatsu by Ma Maison", "The Original Vadai", "Toast Box", "Ya Kun Kaya Toast",
  "Paris Baguette", "Tsuta Japanese Soba Noodles", "% Arabica", "Mrs Pho", "PUTIEN", "LeNu",
  "Kenangan Coffee", "A&W", "Jinjja Chicken", "Jack's Place", "Royal Host", "Fish & Co",
  "Food Republic", "KFC", "Munchi Pancakes", "Gochi-So Shokudo", "Luckin Coffee",
  "Sanook Kitchen", "Subway", "Tim Ho Wan", "Tsui Wah", "Tun Xiang Hokkien Delights",
  "Treasures Yi Dian Xin"
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeJewelDining() {
  console.log('Starting Jewel Changi Airport scraper...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  const outlets = [];

  try {
    console.log('Navigating to Jewel dine page...');
    await page.goto('https://www.jewelchangiairport.com/en/dine.html', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait a bit for JS to execute
    await delay(5000);

    await delay(3000);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'jewel-debug.png', fullPage: true });
    console.log('Saved debug screenshot: jewel-debug.png');

    // Try to find and click "Load More" or scroll to load all content
    let loadMoreClicks = 0;
    while (loadMoreClicks < 20) {
      try {
        const loadMoreBtn = await page.$('button:has-text("Load More"), .load-more, [class*="load-more"]');
        if (loadMoreBtn && await loadMoreBtn.isVisible()) {
          console.log('Clicking Load More button...');
          await loadMoreBtn.click();
          await delay(2000);
          loadMoreClicks++;
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }

    // Scroll to bottom to trigger lazy loading
    console.log('Scrolling to load all content...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(1000);
    }

    // Get page HTML for debugging
    const html = await page.content();
    fs.writeFileSync('jewel-debug.html', html);
    console.log('Saved debug HTML: jewel-debug.html');

    // Try multiple selectors for outlet cards
    const selectors = [
      '.store-card',
      '.tenant-card',
      '.dine-card',
      '.outlet-card',
      '[class*="store"]',
      '[class*="tenant"]',
      '[class*="card"]',
      '.listing-item',
      'article',
      '.grid-item'
    ];

    let foundSelector = null;
    let cards = [];

    for (const selector of selectors) {
      const elements = await page.$$(selector);
      console.log(`Selector "${selector}": found ${elements.length} elements`);
      if (elements.length > 10) {
        foundSelector = selector;
        cards = elements;
        break;
      }
    }

    if (cards.length === 0) {
      // Try to find links that might be restaurant detail pages
      console.log('Looking for restaurant links...');
      const links = await page.$$('a[href*="/dine/"]');
      console.log(`Found ${links.length} dine links`);

      for (const link of links) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        console.log(`Link: ${text?.trim()} -> ${href}`);
      }
    }

    // Extract outlet information
    console.log(`\nProcessing ${cards.length} outlet cards...`);

    for (let i = 0; i < cards.length; i++) {
      try {
        const card = cards[i];

        // Get name
        const nameEl = await card.$('h2, h3, h4, .name, .title, [class*="name"], [class*="title"]');
        const name = nameEl ? (await nameEl.textContent())?.trim() : '';

        // Get unit number - look for patterns like #B2-209
        const cardText = await card.textContent();
        const unitMatch = cardText?.match(/#[A-Z]?\d+-\d+[A-Z]?/i) ||
                         cardText?.match(/Unit\s*#?\s*([A-Z]?\d+-\d+[A-Z]?)/i);
        const unit = unitMatch ? unitMatch[0] : '';

        // Get link for detail page
        const linkEl = await card.$('a');
        const link = linkEl ? await linkEl.getAttribute('href') : '';

        if (name) {
          outlets.push({ name, unit, link });
          console.log(`${i + 1}. ${name}: ${unit || 'No unit found'}`);
        }
      } catch (e) {
        console.log(`Error processing card ${i}: ${e.message}`);
      }
    }

    // If we didn't get unit numbers, try visiting detail pages
    console.log('\n--- Checking detail pages for unit numbers ---');

    const detailLinks = await page.$$eval('a[href*="/dine/"]', links =>
      links.map(a => ({
        href: a.href,
        text: a.textContent?.trim()
      })).filter(l => l.href && !l.href.includes('.html#'))
    );

    console.log(`Found ${detailLinks.length} detail page links`);

    // Visit each detail page to get unit number
    for (let i = 0; i < detailLinks.length; i++) {
      const { href, text } = detailLinks[i];

      // Skip if it's just the main dine page
      if (href === 'https://www.jewelchangiairport.com/en/dine.html') continue;

      try {
        console.log(`\n[${i + 1}/${detailLinks.length}] Visiting: ${href}`);
        await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(1500);

        // Get the page content
        const pageText = await page.textContent('body');

        // Look for restaurant name
        const nameEl = await page.$('h1, .store-name, .tenant-name, [class*="title"]');
        const name = nameEl ? (await nameEl.textContent())?.trim() : text;

        // Look for unit number in various formats
        const unitPatterns = [
          /#[A-Z]?\d{1,2}-\d{1,4}[A-Z]?/gi,  // #B2-209, #01-234
          /Unit\s*#?\s*([A-Z]?\d{1,2}-\d{1,4}[A-Z]?)/gi,
          /Level\s*[A-Z]?\d{1,2}\s*,?\s*#?(\d{1,4}[A-Z]?)/gi,
          /([A-Z]?\d{1,2}-\d{1,4}[A-Z]?)\s*,?\s*Jewel/gi
        ];

        let unit = '';
        for (const pattern of unitPatterns) {
          const matches = pageText?.match(pattern);
          if (matches && matches.length > 0) {
            unit = matches[0].replace(/Unit\s*/i, '').replace(/,?\s*Jewel.*/i, '').trim();
            if (!unit.startsWith('#')) unit = '#' + unit;
            break;
          }
        }

        // Also check for address section
        const addressEl = await page.$('.address, .location, [class*="address"], [class*="location"]');
        if (!unit && addressEl) {
          const addressText = await addressEl.textContent();
          const addrMatch = addressText?.match(/#[A-Z]?\d{1,2}-\d{1,4}[A-Z]?/i);
          if (addrMatch) {
            unit = addrMatch[0];
          }
        }

        if (name && name.length > 1) {
          const existing = outlets.find(o => o.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            if (!existing.unit && unit) {
              existing.unit = unit;
            }
          } else {
            outlets.push({ name, unit, link: href });
          }
          console.log(`  -> ${name}: ${unit || 'No unit found'}`);
        }

      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }

  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    await browser.close();
  }

  // Save results
  console.log(`\n\nTotal outlets scraped: ${outlets.length}`);
  fs.writeFileSync('jewel-outlets.json', JSON.stringify(outlets, null, 2));
  console.log('Saved to jewel-outlets.json');

  // Create CSV
  const csvContent = 'name,unit\n' + outlets.map(o =>
    `"${o.name.replace(/"/g, '""')}","${o.unit}"`
  ).join('\n');
  fs.writeFileSync('jewel-outlets.csv', csvContent);
  console.log('Saved to jewel-outlets.csv');

  return outlets;
}

scrapeJewelDining().catch(console.error);

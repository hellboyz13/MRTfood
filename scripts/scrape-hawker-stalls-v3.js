const { chromium } = require('playwright');
const fs = require('fs');

// Food centres with known Eatbook article slugs
const FOOD_CENTRES = [
  { name: 'Adam Road Food Centre', slug: 'adam-road-food-centre' },
  { name: 'Amoy Street Food Centre', slug: 'amoy-street-food-centre' },
  { name: 'Maxwell Food Centre', slug: 'maxwell-food-centre' },
  { name: 'Tiong Bahru Food Centre', slug: 'tiong-bahru-market' },
  { name: 'Old Airport Road Food Centre', slug: 'old-airport-road-food-centre' },
  { name: 'Newton Food Centre', slug: 'newton-food-centre' },
  { name: 'Hong Lim Food Centre', slug: 'hong-lim-food-centre' },
  { name: 'Ghim Moh Market Food Centre', slug: 'ghim-moh-food-centre' },
  { name: 'Holland Village Food Centre', slug: 'holland-village-food-centre' },
  { name: 'Kampung Admiralty Hawker Centre', slug: 'kampung-admiralty-hawker-centre' },
  { name: 'Chinatown Complex Food Centre', slug: 'chinatown-complex-food-centre' },
  { name: 'ABC Brickworks Food Centre', slug: 'abc-brickworks-food-centre' },
  { name: 'Bedok Interchange Hawker Centre', slug: 'bedok-interchange-hawker-centre' },
  { name: 'Golden Mile Food Centre', slug: 'golden-mile-food-centre' },
  { name: 'Tekka Centre', slug: 'tekka-centre' },
  { name: 'Bukit Timah Market', slug: 'bukit-timah-food-centre' }
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeEatbookArticle(page, slug, centreName) {
  // Try different URL patterns
  const urlPatterns = [
    `https://eatbook.sg/${slug}/`,
    `https://eatbook.sg/${slug}-guide/`,
    `https://eatbook.sg/best-${slug}/`,
    `https://eatbook.sg/${slug}-food/`
  ];

  for (const url of urlPatterns) {
    console.log(`  Trying: ${url}`);
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      if (response && response.status() === 200) {
        await delay(2000);

        // Check if it's an actual article (not 404)
        const title = await page.title();
        if (title.toLowerCase().includes('not found') || title.toLowerCase().includes('404')) {
          continue;
        }

        // Extract stall names from article
        const stalls = await page.evaluate(() => {
          const found = [];

          // Look for h2, h3 headings that are stall names
          document.querySelectorAll('h2, h3').forEach(h => {
            let text = h.textContent.trim();
            // Remove numbering
            text = text.replace(/^\d+[\.\)\-]\s*/, '').trim();
            // Remove trailing location/price info
            text = text.split(' – ')[0].split(' - ')[0].trim();

            // Filter criteria
            if (text.length >= 3 && text.length <= 60) {
              // Skip navigation/generic headings
              const skip = ['address', 'opening', 'location', 'price', 'menu', 'verdict',
                'conclusion', 'summary', 'related', 'share', 'comment', 'subscribe',
                'latest', 'trending', 'categories', 'what to order', 'ambience'];
              if (skip.some(s => text.toLowerCase().includes(s))) return;

              // Should look like a business name (has uppercase or is short)
              if (/[A-Z]/.test(text) || text.length < 30) {
                found.push(text);
              }
            }
          });

          return found;
        });

        if (stalls.length > 0) {
          console.log(`    Found ${stalls.length} stalls`);
          return { url, stalls };
        }
      }
    } catch (err) {
      // Try next URL pattern
    }
  }

  return { url: null, stalls: [] };
}

async function searchGoogleForArticle(page, centreName) {
  const query = `site:eatbook.sg ${centreName} food guide`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  console.log(`  Google search: ${centreName}`);

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: `hawker-search-${centreName.replace(/\s+/g, '-').substring(0, 20)}.png` });

    // Get first eatbook result
    const articleUrl = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="eatbook.sg"]');
      for (const link of links) {
        const href = link.href;
        if (href.includes('eatbook.sg/') && !href.includes('?') && !href.includes('category')) {
          // Extract actual URL
          if (href.includes('/url?q=')) {
            const match = href.match(/\/url\?q=([^&]+)/);
            if (match) return decodeURIComponent(match[1]);
          }
          return href;
        }
      }
      return null;
    });

    if (articleUrl) {
      console.log(`    Found: ${articleUrl.substring(0, 60)}...`);
      return articleUrl;
    }

    return null;
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return null;
  }
}

async function main() {
  const results = {};

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  console.log('='.repeat(60));
  console.log('SCRAPING HAWKER STALLS FROM EATBOOK');
  console.log('='.repeat(60));

  for (const centre of FOOD_CENTRES) {
    console.log(`\n--- ${centre.name} ---`);

    // First try direct slug URLs
    const result = await scrapeEatbookArticle(page, centre.slug, centre.name);

    if (result.stalls.length > 0) {
      results[centre.name] = {
        url: result.url,
        stalls: result.stalls
      };
    } else {
      // Try Google search
      const articleUrl = await searchGoogleForArticle(page, centre.name);
      if (articleUrl) {
        try {
          await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await delay(2000);

          const stalls = await page.evaluate(() => {
            const found = [];
            document.querySelectorAll('h2, h3').forEach(h => {
              let text = h.textContent.trim().replace(/^\d+[\.\)\-]\s*/, '').split(' – ')[0].trim();
              if (text.length >= 3 && text.length <= 60 && /[A-Z]/.test(text)) {
                found.push(text);
              }
            });
            return found;
          });

          results[centre.name] = { url: articleUrl, stalls };
          console.log(`    Extracted ${stalls.length} stalls`);
        } catch (err) {
          results[centre.name] = { url: null, stalls: [] };
        }
      } else {
        results[centre.name] = { url: null, stalls: [] };
      }
    }

    await delay(2000);
  }

  await browser.close();

  // Save results
  fs.writeFileSync('hawker-stalls-results.json', JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  let totalStalls = 0;
  for (const [centre, data] of Object.entries(results)) {
    console.log(`\n${centre}:`);
    if (data.stalls.length > 0) {
      data.stalls.forEach(s => console.log(`  - ${s}`));
      totalStalls += data.stalls.length;
    } else {
      console.log('  (no stalls found)');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total stalls: ${totalStalls}`);
}

main().catch(console.error);

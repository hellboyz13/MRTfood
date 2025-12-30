const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Load existing stall data
const inputPath = path.join(__dirname, '..', 'food-centre-stalls-clean.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

async function searchBurpple(page, stallName, centreName) {
  try {
    const query = encodeURIComponent(`${stallName} ${centreName} Singapore`);
    await page.goto(`https://www.burpple.com/search?q=${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      // Look for first search result
      const card = document.querySelector('.searchVenue, .venue-card, [class*="venue"], [class*="search-result"]');
      if (!card) return null;

      // Get thumbnail
      const img = card.querySelector('img');
      const thumbnail = img ? (img.src || img.dataset.src) : null;

      // Get link to venue page
      const link = card.querySelector('a');
      return { thumbnail, link: link ? link.href : null };
    });

    if (result && result.link) {
      // Visit the venue page for opening hours
      await page.goto(result.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const details = await page.evaluate(() => {
        // Look for opening hours
        const hoursEl = document.querySelector('[class*="hours"], [class*="opening"], .operation-hours');
        const hours = hoursEl ? hoursEl.textContent.trim() : null;

        // Get better thumbnail from venue page
        const heroImg = document.querySelector('.venue-hero img, .header-image img, [class*="hero"] img');
        const thumbnail = heroImg ? (heroImg.src || heroImg.dataset.src) : null;

        return { hours, thumbnail };
      });

      return {
        openingHours: details.hours,
        thumbnail: details.thumbnail || result.thumbnail
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function searchHungryGoWhere(page, stallName, centreName) {
  try {
    const query = encodeURIComponent(`${stallName} ${centreName}`);
    await page.goto(`https://www.hungrygowhere.com/search/${query}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const card = document.querySelector('.restaurant-card, .search-result, [class*="restaurant"]');
      if (!card) return null;

      const img = card.querySelector('img');
      const link = card.querySelector('a');
      return {
        thumbnail: img ? img.src : null,
        link: link ? link.href : null
      };
    });

    if (result && result.link) {
      await page.goto(result.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const details = await page.evaluate(() => {
        const hoursEl = document.querySelector('[class*="hours"], [class*="opening"], .business-hours');
        return {
          hours: hoursEl ? hoursEl.textContent.trim().replace(/\s+/g, ' ') : null
        };
      });

      return {
        openingHours: details.hours,
        thumbnail: result.thumbnail
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function searchEatbook(page, stallName) {
  try {
    const query = encodeURIComponent(stallName);
    await page.goto(`https://eatbook.sg/?s=${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate((searchName) => {
      // Find article that matches stall name
      const articles = document.querySelectorAll('article, .post, [class*="post"]');
      for (const article of articles) {
        const title = article.querySelector('h2, h3, .title, .entry-title');
        if (title && title.textContent.toLowerCase().includes(searchName.toLowerCase().split(' ')[0])) {
          const img = article.querySelector('img');
          const link = article.querySelector('a');
          return {
            thumbnail: img ? (img.src || img.dataset.src) : null,
            link: link ? link.href : null
          };
        }
      }
      // Return first result if no exact match
      const firstArticle = articles[0];
      if (firstArticle) {
        const img = firstArticle.querySelector('img');
        return { thumbnail: img ? (img.src || img.dataset.src) : null, link: null };
      }
      return null;
    }, stallName);

    if (result && result.link) {
      await page.goto(result.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const details = await page.evaluate(() => {
        const content = document.querySelector('.entry-content, .post-content, article');
        if (!content) return {};

        const text = content.textContent;

        // Look for opening hours pattern
        const hoursMatch = text.match(/Opening [Hh]ours?:?\s*([^\n]+)/);
        const hours = hoursMatch ? hoursMatch[1].trim() : null;

        // Get featured image
        const img = document.querySelector('.wp-post-image, .featured-image img, article img');
        const thumbnail = img ? img.src : null;

        return { hours, thumbnail };
      });

      return {
        openingHours: details.hours,
        thumbnail: details.thumbnail || result.thumbnail
      };
    }

    return { thumbnail: result?.thumbnail, openingHours: null };
  } catch (err) {
    return null;
  }
}

async function searchFoodAdvisor(page, stallName, centreName) {
  try {
    const query = encodeURIComponent(`${stallName}`);
    await page.goto(`https://www.foodadvisor.com.sg/search?q=${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const card = document.querySelector('.place-card, .restaurant-card, [class*="card"]');
      if (!card) return null;

      const img = card.querySelector('img');
      const link = card.querySelector('a');
      return {
        thumbnail: img ? img.src : null,
        link: link ? link.href : null
      };
    });

    if (result && result.link && !result.link.includes('javascript')) {
      await page.goto(result.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const details = await page.evaluate(() => {
        // Look for opening hours
        const hoursEl = document.querySelector('[class*="hour"], [class*="time"], .opening');
        const hours = hoursEl ? hoursEl.textContent.trim().replace(/\s+/g, ' ') : null;

        // Get main image
        const img = document.querySelector('.main-image img, .hero img, .gallery img');
        const thumbnail = img ? img.src : null;

        return { hours, thumbnail };
      });

      return {
        openingHours: details.hours,
        thumbnail: details.thumbnail || result.thumbnail
      };
    }
    return { thumbnail: result?.thumbnail };
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('SCRAPING STALL DETAILS (Opening Hours + Thumbnails)');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let totalStalls = 0;
  let foundHours = 0;
  let foundThumbs = 0;

  for (const [centreId, centre] of Object.entries(data)) {
    if (!centre.stalls || centre.stalls.length === 0) continue;

    console.log(`\n--- ${centre.name} (${centre.stalls.length} stalls) ---`);

    for (let i = 0; i < centre.stalls.length; i++) {
      const stall = centre.stalls[i];
      totalStalls++;
      process.stdout.write(`  [${i + 1}/${centre.stalls.length}] ${stall.name.substring(0, 35).padEnd(35)} `);

      // Skip if already has both
      if (stall.openingHours && stall.thumbnail) {
        console.log('✓ already has data');
        if (stall.openingHours) foundHours++;
        if (stall.thumbnail) foundThumbs++;
        continue;
      }

      // Try different sources
      let result = null;

      // Try Burpple first
      if (!result || (!result.openingHours && !result.thumbnail)) {
        result = await searchBurpple(page, stall.name, centre.name);
      }

      // Try Eatbook
      if (!result || (!result.openingHours && !result.thumbnail)) {
        const eatbookResult = await searchEatbook(page, stall.name);
        if (eatbookResult) {
          result = {
            openingHours: result?.openingHours || eatbookResult.openingHours,
            thumbnail: result?.thumbnail || eatbookResult.thumbnail
          };
        }
      }

      // Try FoodAdvisor
      if (!result || (!result.openingHours && !result.thumbnail)) {
        const faResult = await searchFoodAdvisor(page, stall.name, centre.name);
        if (faResult) {
          result = {
            openingHours: result?.openingHours || faResult.openingHours,
            thumbnail: result?.thumbnail || faResult.thumbnail
          };
        }
      }

      // Update stall data
      if (result) {
        if (result.openingHours && !stall.openingHours) {
          stall.openingHours = result.openingHours;
        }
        if (result.thumbnail && !stall.thumbnail) {
          stall.thumbnail = result.thumbnail;
        }
      }

      // Log result
      const hasHours = stall.openingHours ? '⏰' : '  ';
      const hasThumb = stall.thumbnail ? '🖼️' : '  ';
      console.log(`${hasHours} ${hasThumb}`);

      if (stall.openingHours) foundHours++;
      if (stall.thumbnail) foundThumbs++;

      // Small delay between requests
      await page.waitForTimeout(500);
    }
  }

  await browser.close();

  // Save updated data
  fs.writeFileSync(inputPath, JSON.stringify(data, null, 2));
  console.log(`\nSaved to ${inputPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total stalls: ${totalStalls}`);
  console.log(`With opening hours: ${foundHours} (${Math.round(foundHours/totalStalls*100)}%)`);
  console.log(`With thumbnails: ${foundThumbs} (${Math.round(foundThumbs/totalStalls*100)}%)`);
}

run().catch(console.error);

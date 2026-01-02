const { chromium } = require('playwright');
const fs = require('fs');

async function scrape313Somerset() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const url = 'https://www.313somerset.com.sg/store-directory/?categories=Food+%26+Beverages';
  console.log(`Navigating to ${url}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // Click "Load More" until all stores are visible
  let loadMoreVisible = true;
  while (loadMoreVisible) {
    try {
      const loadMoreBtn = await page.$('button:has-text("Load More")');
      if (loadMoreBtn) {
        const isVisible = await loadMoreBtn.isVisible();
        if (isVisible) {
          console.log('Clicking Load More...');
          await loadMoreBtn.click();
          await page.waitForTimeout(1500);
        } else {
          loadMoreVisible = false;
        }
      } else {
        loadMoreVisible = false;
      }
    } catch (e) {
      loadMoreVisible = false;
    }
  }

  console.log('All stores loaded. Extracting data...');

  // Extract store cards from directory listing
  const storeCards = await page.$$('.directory-card');
  console.log(`Found ${storeCards.length} store cards`);

  const outlets = [];

  for (let i = 0; i < storeCards.length; i++) {
    const card = storeCards[i];

    try {
      // Get store name
      const nameEl = await card.$('a.inline-flex span');
      const name = nameEl ? (await nameEl.textContent()).trim() : '';

      // Get thumbnail URL
      const imgEl = await card.$('img.object-cover');
      let thumbnail = '';
      if (imgEl) {
        thumbnail = await imgEl.getAttribute('src') || '';
        if (thumbnail && !thumbnail.startsWith('http')) {
          thumbnail = 'https://www.313somerset.com.sg' + thumbnail;
        }
      }

      // Get category
      const categoryEl = await card.$('span.border-2.border-brand-link');
      const category = categoryEl ? (await categoryEl.textContent()).trim() : 'Food & Beverages';

      // Get opening hours from card
      let opening_hours = '';
      const allSpans = await card.$$('span');
      for (const span of allSpans) {
        const text = await span.textContent();
        if (text && text.includes('Open until')) {
          opening_hours = text.trim();
          break;
        }
      }

      // Get store detail link
      const linkEl = await card.$('a[href*="/store-directory/"]');
      const detailLink = linkEl ? await linkEl.getAttribute('href') : '';

      if (name && name.length > 0 && name !== 'Store Directory') {
        outlets.push({
          name,
          level: '',
          thumbnail_url: thumbnail,
          opening_hours,
          category,
          subcategory: '',
          detail_link: detailLink,
          mall_id: '313-somerset'
        });
      }
    } catch (e) {
      console.error(`Error extracting card ${i}:`, e.message);
    }
  }

  console.log(`\nExtracted ${outlets.length} outlets from directory`);
  console.log('\nFetching unit numbers from detail pages...');

  // Now fetch unit numbers from detail pages
  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    if (outlet.detail_link) {
      try {
        console.log(`[${i + 1}/${outlets.length}] ${outlet.name}`);
        const detailUrl = outlet.detail_link.startsWith('http')
          ? outlet.detail_link
          : 'https://www.313somerset.com.sg' + outlet.detail_link;

        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);

        // Get unit number from the main content text
        const unitNumber = await page.evaluate(() => {
          const main = document.querySelector('main');
          if (!main) return null;
          const text = main.innerText;

          // Pattern: "The store is located on Level X.\n01-14/15" or "B2-20 to 23"
          const locationMatch = text.match(/The store is located on Level [B0-9]+\.\s*\n?([B0-9]+-[0-9]+(?:\/[0-9]+)?(?:\s*to\s*[0-9]+)?)/i);
          if (locationMatch) {
            return locationMatch[1].trim();
          }

          // Alternative: Look for patterns like "B2-20 to 23" or "01-14/15" near "Location" or "Find Us"
          const altMatch = text.match(/(?:Location|Find Us)[^]*?([B0-9]+-[0-9]+(?:\/[0-9]+)?(?:\s*to\s*[0-9]+)?)/i);
          if (altMatch) {
            return altMatch[1].trim();
          }

          return null;
        });

        if (unitNumber) {
          // Add # prefix
          outlet.level = '#' + unitNumber;
          console.log(`  Unit: ${outlet.level}`);
        }

        // Get subcategories from detail page
        const subcategories = await page.evaluate(() => {
          const subs = [];
          const categorySpans = document.querySelectorAll('span.border-2');
          categorySpans.forEach(span => {
            const text = span.textContent.trim();
            if (text && text !== 'Food & Beverages') {
              subs.push(text);
            }
          });
          return subs;
        });
        if (subcategories.length > 0) {
          outlet.subcategory = subcategories.join(', ');
        }

        // Get detailed opening hours
        const detailedHours = await page.evaluate(() => {
          const text = document.body.innerText;
          // Look for pattern like "Monday-Thursday: 10am-8pm"
          const hoursMatch = text.match(/(Mon[a-z]*[-–][^\n]*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)))/gi);
          if (hoursMatch) {
            return hoursMatch.join('; ').substring(0, 200);
          }
          return null;
        });
        if (detailedHours) {
          outlet.opening_hours = detailedHours;
        }

      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
  }

  // Clean up the data for final output
  const finalOutlets = outlets.map(o => ({
    name: o.name,
    level: o.level,
    thumbnail_url: o.thumbnail_url,
    opening_hours: o.opening_hours,
    category: o.category,
    subcategory: o.subcategory,
    mall_id: o.mall_id
  }));

  console.log('\n=== SAMPLE RESULTS ===');
  finalOutlets.slice(0, 10).forEach(o => {
    console.log(`- ${o.name} | ${o.level} | ${o.subcategory}`);
  });

  // Count stats
  const withUnits = finalOutlets.filter(o => o.level).length;
  console.log(`\nOutlets with units: ${withUnits}/${finalOutlets.length}`);

  // Save results
  const outputPath = '313-somerset-outlets.json';
  fs.writeFileSync(outputPath, JSON.stringify(finalOutlets, null, 2));
  console.log(`\n${finalOutlets.length} outlets saved to ${outputPath}`);

  await browser.close();
  console.log('Browser closed');

  return finalOutlets;
}

scrape313Somerset().catch(console.error);

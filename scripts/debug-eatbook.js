const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Go to a specific article to see structure
  await page.goto('https://eatbook.sg/best-char-kway-teow-singapore-ranked/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 5000));

  // Save HTML for debugging
  const html = await page.content();
  fs.writeFileSync('eatbook-debug.html', html);
  console.log('Saved eatbook-debug.html');

  // Extract restaurant info from article
  const data = await page.evaluate(() => {
    const restaurants = [];

    // EatBook uses h3 for restaurant names with numbering like "10. Lao Fu Zi Fried Kway Teow"
    document.querySelectorAll('h3').forEach(h3 => {
      const text = h3.textContent?.trim() || '';
      // Skip generic headings
      if (text.length < 3 || text.length > 150) return;
      if (/^(summary|conclusion|related|read also|you may|where to|best )/i.test(text)) return;

      // Get restaurant name (usually has numbering like "10. Restaurant Name")
      const nameMatch = text.match(/^\d+\.\s*(.+)$/);
      if (!nameMatch) return; // Must have numbering
      const name = nameMatch[1].trim();

      // Look for address in following elements
      let address = null;
      let openingHours = null;
      let element = h3.nextElementSibling;
      let attempts = 0;

      while (element && attempts < 15) {
        const content = element.textContent || '';

        // Look for Address: pattern
        if (!address) {
          const addrMatch = content.match(/Address:\s*([^<\n]+(?:Singapore\s*\d{6})?)/i);
          if (addrMatch) address = addrMatch[1].trim();
        }

        // Look for Opening Hours: pattern
        if (!openingHours) {
          const hoursMatch = content.match(/Opening [Hh]ours?:\s*([^<\n]+)/i);
          if (hoursMatch) openingHours = hoursMatch[1].trim();
        }

        element = element.nextElementSibling;
        attempts++;

        // Stop if we hit the next h3 or h2
        if (element?.tagName === 'H2' || element?.tagName === 'H3') break;
      }

      if (name.length > 2 && name.length < 100) {
        restaurants.push({ name, address, openingHours });
      }
    });

    return {
      title: document.querySelector('h1')?.textContent?.trim(),
      restaurants
    };
  });

  console.log('\nArticle:', data.title);
  console.log('\nRestaurants found:', data.restaurants.length);
  data.restaurants.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.name}`);
    console.log(`   Address: ${r.address || 'N/A'}`);
    console.log(`   Hours: ${r.openingHours || 'N/A'}`);
  });

  // Get page structure
  const structure = await page.evaluate(() => {
    const classes = new Set();
    document.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => classes.add(c));
    });
    return {
      title: document.title,
      bodyText: document.body.innerText.slice(0, 1500),
      relevantClasses: [...classes].filter(c =>
        c.includes('post') || c.includes('article') || c.includes('entry') ||
        c.includes('card') || c.includes('result')
      ).slice(0, 30)
    };
  });

  console.log('\nPage title:', structure.title);
  console.log('\nRelevant classes:', structure.relevantClasses);
  console.log('\nBody text:', structure.bodyText.slice(0, 800));

  await browser.close();
})();

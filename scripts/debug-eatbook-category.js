const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://eatbook.sg/category/food-guides/best-food-guides/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 5000));

  // Scroll to load more
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save HTML
  const html = await page.content();
  fs.writeFileSync('eatbook-category-debug.html', html);
  console.log('Saved eatbook-category-debug.html');

  // Extract structure
  const data = await page.evaluate(() => {
    const articles = [];

    // Try various selectors
    document.querySelectorAll('a').forEach(a => {
      const href = a.href || '';
      const text = a.textContent?.trim() || '';
      if (href.includes('eatbook.sg/') &&
          !href.includes('/category/') &&
          !href.includes('/page/') &&
          text.length > 20 && text.length < 150) {
        articles.push({ href, text: text.slice(0, 100), parent: a.parentElement?.className || '' });
      }
    });

    // Get unique
    const seen = new Set();
    return articles.filter(a => {
      if (seen.has(a.href)) return false;
      seen.add(a.href);
      return true;
    }).slice(0, 30);
  });

  console.log('\nFound links:');
  data.forEach((a, i) => {
    console.log(`${i + 1}. ${a.text}`);
    console.log(`   URL: ${a.href}`);
    console.log(`   Parent: ${a.parent}`);
  });

  await browser.close();
})();

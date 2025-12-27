const { chromium } = require('playwright');

async function testGoogleSearch() {
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  const searchQuery = encodeURIComponent('Bakalaki Greek Taverna Singapore restaurant price menu');
  await page.goto(`https://www.google.com/search?q=${searchQuery}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await page.waitForTimeout(5000);

  // Save screenshot and HTML
  await page.screenshot({ path: 'google-search-test.png', fullPage: true });
  const content = await page.content();
  require('fs').writeFileSync('google-search-test.html', content);

  console.log('Saved screenshot to google-search-test.png');
  console.log('Saved HTML to google-search-test.html');

  // Try to find any prices in the content
  const priceMatches = [...content.matchAll(/(?:S?\$|SGD\s*)(\d+(?:\.\d{2})?)/g)];
  console.log(`\nFound ${priceMatches.length} potential prices:`);
  priceMatches.slice(0, 20).forEach(m => console.log(`  ${m[0]}`));

  await browser.close();
}

testGoogleSearch().catch(console.error);

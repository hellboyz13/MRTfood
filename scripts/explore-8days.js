const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Go to an article page to see the structure
  await page.goto('https://www.8days.sg/eatanddrink/hawkerfood/shiifa-fiie-cafe-ayam-goreng-lucky-plaza-744676', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(3000);

  // Get article details
  const info = await page.evaluate(() => {
    const title = document.querySelector('h1')?.textContent?.trim();
    const date = document.querySelector('time, [class*="date"], [class*="publish"]')?.textContent?.trim();

    // Look for address/location info
    const bodyText = document.body.innerText;

    // Find relevant classes
    const classes = new Set();
    document.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => {
        if (c.includes('address') || c.includes('location') || c.includes('info') || c.includes('detail') || c.includes('body') || c.includes('content')) {
          classes.add(c);
        }
      });
    });

    // Look for structured info blocks
    const infoBlocks = [...document.querySelectorAll('[class*="info"], [class*="detail"], address, .address')].map(el => ({
      class: el.className,
      text: el.textContent?.trim()?.slice(0, 200)
    }));

    return {
      title,
      date,
      relevantClasses: [...classes].slice(0, 30),
      infoBlocks: infoBlocks.slice(0, 10),
      bodyText: bodyText.slice(0, 2500)
    };
  });

  console.log('Title:', info.title);
  console.log('Date:', info.date);
  console.log('\nRelevant classes:', info.relevantClasses);
  console.log('\nInfo blocks:');
  info.infoBlocks.forEach(b => console.log('  ', b.class, ':', b.text?.slice(0, 100)));
  console.log('\nBody text preview:', info.bodyText);

  await browser.close();
})();

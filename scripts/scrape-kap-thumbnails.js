const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Scraping KAP Mall website...\n');

  await page.goto('https://www.kapmall.com.sg/directory/food-and-beverage/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  // Save HTML for debugging
  const html = await page.content();
  fs.writeFileSync('kap-debug.html', html);
  console.log('Saved HTML to kap-debug.html');

  // Take screenshot
  await page.screenshot({ path: 'kap-debug.png', fullPage: true });
  console.log('Saved screenshot to kap-debug.png');

  // Extract all store info
  const stores = await page.evaluate(() => {
    const results = [];

    // Try multiple selectors
    const selectors = [
      '.directory-item',
      '.store-item',
      '.tenant-card',
      '[class*="store"]',
      '[class*="tenant"]',
      'article',
      '.card',
      'li'
    ];

    for (const selector of selectors) {
      const items = document.querySelectorAll(selector);
      items.forEach(item => {
        const text = item.innerText?.trim();
        const img = item.querySelector('img');
        const imgSrc = img ? (img.src || img.dataset.src || img.getAttribute('data-lazy-src')) : null;

        if (text && text.length < 200) {
          results.push({
            selector,
            text: text.substring(0, 100),
            imgSrc
          });
        }
      });
    }

    // Also look for all images on the page
    const allImages = [];
    document.querySelectorAll('img').forEach(img => {
      allImages.push({
        src: img.src,
        alt: img.alt,
        className: img.className
      });
    });

    return { items: results.slice(0, 30), images: allImages.slice(0, 50) };
  });

  console.log('\nFound items:', stores.items.length);
  stores.items.forEach((item, i) => {
    console.log(`${i + 1}. [${item.selector}] ${item.text.substring(0, 50)}... img: ${item.imgSrc ? 'yes' : 'no'}`);
  });

  console.log('\nImages on page:', stores.images.length);
  stores.images.forEach((img, i) => {
    if (img.src && !img.src.includes('data:')) {
      console.log(`${i + 1}. ${img.alt || 'no-alt'}: ${img.src.substring(0, 80)}`);
    }
  });

  await browser.close();
}

main().catch(console.error);

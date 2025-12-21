const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test with Raffles City guide
  await page.goto('https://eatbook.sg/raffles-city-food-guide/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 5000));

  // Save HTML
  const html = await page.content();
  fs.writeFileSync('eatbook-raffles-debug.html', html);
  console.log('Saved eatbook-raffles-debug.html');

  // Look at the structure of h3 elements and their siblings
  const data = await page.evaluate(() => {
    const results = [];

    document.querySelectorAll('h3').forEach((h3, idx) => {
      const text = h3.textContent?.trim() || '';
      if (text.length < 3 || text.length > 150) return;

      // Check if numbered
      const nameMatch = text.match(/^(\d+)\.\s*(.+)$/);
      if (!nameMatch) return;

      const name = nameMatch[2];

      // Collect all siblings until next h3
      const siblings = [];
      let el = h3.nextElementSibling;
      let count = 0;
      while (el && count < 10) {
        if (el.tagName === 'H3' || el.tagName === 'H2') break;
        siblings.push({
          tag: el.tagName,
          class: el.className,
          text: el.textContent?.trim()?.slice(0, 500)
        });
        el = el.nextElementSibling;
        count++;
      }

      results.push({
        h3Text: text,
        name,
        siblings
      });
    });

    return results.slice(0, 5); // Just first 5
  });

  console.log('\n=== Structure of first 5 restaurant entries ===\n');
  data.forEach((entry, i) => {
    console.log(`\n--- ${i + 1}. ${entry.name} ---`);
    console.log(`H3 text: ${entry.h3Text}`);
    console.log(`Siblings:`);
    entry.siblings.forEach((s, j) => {
      console.log(`  ${j + 1}. <${s.tag}> class="${s.class}"`);
      console.log(`     Text: ${s.text?.slice(0, 200)}...`);
    });
  });

  await browser.close();
})();

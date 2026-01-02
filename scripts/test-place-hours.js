const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://www.google.com/maps/place/?q=place_id:ChIJf4LAs88X2jERLmN47mvEUzg';
  console.log('Navigating to:', url);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Current URL:', page.url());

  // Check for hours button
  const hoursButton = await page.$('[data-item-id="oh"]');
  console.log('Hours button found:', !!hoursButton);

  // Check for any hours-related text
  const bodyText = await page.textContent('body');
  const hasHoursText = bodyText.includes('Hours') || bodyText.includes('Open') || bodyText.includes('Closed');
  console.log('Has hours-related text:', hasHoursText);

  // Look for specific hours patterns
  const hoursMatch = bodyText.match(/(Open|Closed)[^.]*(\d+\s*(AM|PM))/i);
  console.log('Hours pattern found:', hoursMatch ? hoursMatch[0] : 'none');

  // Save screenshot for debugging
  await page.screenshot({ path: 'test-place.png' });
  console.log('Screenshot saved to test-place.png');

  await browser.close();
}
test();

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== VERIFYING JURONG POINT OUTLETS ===\n');

  // Get all Jurong Point outlets
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name')
    .eq('mall_id', 'jurong-point');

  console.log(`Total outlets to verify: ${outlets.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const verified = [];
  const notFound = [];
  const uncertain = [];

  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    const query = `${outlet.name} jurong point`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    console.log(`[${i + 1}/${outlets.length}] ${outlet.name}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      // Check search results
      const result = await page.evaluate((outletName) => {
        const body = document.body.innerText.toLowerCase();
        const name = outletName.toLowerCase();

        // Check for strong indicators it exists at Jurong Point
        const hasJurongPoint = body.includes('jurong point') || body.includes('jp1') || body.includes('jp2');
        const hasName = body.includes(name.split(' ')[0]); // First word of name

        // Check for "permanently closed" or "closed"
        const isClosed = body.includes('permanently closed') ||
                        (body.includes('closed') && body.includes(name.split(' ')[0]));

        // Check for Google Maps listing
        const hasMapListing = body.includes('directions') || body.includes('open') || body.includes('reviews');

        // Check for menu/food indicators
        const hasFood = body.includes('menu') || body.includes('restaurant') || body.includes('cafe') ||
                       body.includes('food') || body.includes('store');

        return {
          hasJurongPoint,
          hasName,
          isClosed,
          hasMapListing,
          hasFood,
          snippet: body.substring(0, 500)
        };
      }, outlet.name);

      if (result.isClosed) {
        console.log(`  ⚠️ CLOSED`);
        notFound.push({ ...outlet, reason: 'Permanently closed' });
      } else if (result.hasJurongPoint && result.hasName && (result.hasMapListing || result.hasFood)) {
        console.log(`  ✓ Verified`);
        verified.push(outlet);
      } else if (result.hasName && result.hasFood) {
        console.log(`  ? Uncertain - exists but JP not confirmed`);
        uncertain.push({ ...outlet, reason: 'JP not confirmed' });
      } else {
        console.log(`  ✗ Not found`);
        notFound.push({ ...outlet, reason: 'Not found in search' });
      }

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      uncertain.push({ ...outlet, reason: 'Search error' });
    }

    await page.waitForTimeout(800); // Rate limiting
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log(`Verified: ${verified.length}`);
  console.log(`Not Found/Closed: ${notFound.length}`);
  console.log(`Uncertain: ${uncertain.length}`);

  if (notFound.length > 0) {
    console.log('\n=== NOT FOUND/CLOSED ===');
    notFound.forEach(o => console.log(`- ${o.name}: ${o.reason}`));
  }

  if (uncertain.length > 0) {
    console.log('\n=== UNCERTAIN ===');
    uncertain.forEach(o => console.log(`- ${o.name}: ${o.reason}`));
  }

  // Save results to JSON
  const fs = require('fs');
  fs.writeFileSync('jurong-point-verification.json', JSON.stringify({
    verified: verified.map(o => o.name),
    notFound: notFound,
    uncertain: uncertain
  }, null, 2));
  console.log('\nResults saved to jurong-point-verification.json');
}

main().catch(console.error);

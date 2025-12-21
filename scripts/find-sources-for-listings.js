const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Known food blog sources
const SOURCES = [
  { id: 'sethlui', domain: 'sethlui.com' },
  { id: 'eatbook', domain: 'eatbook.sg' },
  { id: 'danielfooddiary', domain: 'danielfooddiary.com' },
  { id: 'misstamchiak', domain: 'misstamchiak.com' },
  { id: 'ladyironchef', domain: 'ladyironchef.com' },
  { id: 'thesmartlocal', domain: 'thesmartlocal.com' },
  { id: 'burpple', domain: 'burpple.com' },
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findSourcesForListings() {
  console.log('=== FINDING SOURCES FOR LISTINGS WITHOUT source_id ===\n');

  // Get listings without source_id AND without source_url
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name')
    .is('source_id', null)
    .or('source_url.is.null,source_url.eq.')
    .order('name');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Found', listings.length, 'listings without any source\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  let processed = 0;

  for (const listing of listings) {
    processed++;
    const searchQuery = `"${listing.name}" Singapore food (site:sethlui.com OR site:eatbook.sg OR site:danielfooddiary.com OR site:misstamchiak.com OR site:ladyironchef.com)`;

    console.log(`[${processed}/${listings.length}] Searching: ${listing.name}`);

    try {
      // Use DuckDuckGo instead of Google (less rate limiting)
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await delay(2000);

      // Get page content
      const content = await page.content();

      // Check which source appears in results
      for (const source of SOURCES) {
        if (content.includes(source.domain)) {
          console.log(`  ✓ Found on ${source.id}`);

          // Try to extract the URL
          const urlMatch = content.match(new RegExp(`https?://[^"'\\s]*${source.domain}[^"'\\s]*`, 'i'));
          const sourceUrl = urlMatch ? urlMatch[0] : null;

          results.push({
            id: listing.id,
            name: listing.name,
            source_id: source.id,
            source_url: sourceUrl
          });
          break;
        }
      }

      await delay(1500); // Rate limit between searches

    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }

    // Save progress every 20 listings
    if (processed % 20 === 0) {
      console.log(`\nProgress: ${processed}/${listings.length}, Found: ${results.length}\n`);
    }
  }

  await browser.close();

  console.log('\n=== RESULTS ===');
  console.log('Found sources for', results.length, 'out of', listings.length, 'listings\n');

  // Update the listings
  let updated = 0;
  for (const r of results) {
    const updateData = { source_id: r.source_id };
    if (r.source_url) {
      updateData.source_url = r.source_url;
    }

    const { error: updateErr } = await supabase
      .from('food_listings')
      .update(updateData)
      .eq('id', r.id);

    if (!updateErr) {
      console.log(`Updated: ${r.name} -> ${r.source_id}`);
      updated++;
    } else {
      console.log(`Error updating ${r.name}: ${updateErr.message}`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}/${results.length}`);
}

findSourcesForListings().catch(console.error);

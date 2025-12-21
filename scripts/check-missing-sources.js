const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkMissingSources() {
  console.log('=== CHECKING FOOD LISTINGS WITHOUT SOURCES ===\n');

  // Fetch all listings in batches
  let allListings = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, source_id, source_url')
      .range(offset, offset + 999);
    if (error) { console.error('Error:', error); break; }
    if (!data || data.length === 0) break;
    allListings = allListings.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log('Total food listings:', allListings.length);

  // Find those without sources
  const noSourceId = allListings.filter(l => !l.source_id);
  const noSourceUrl = allListings.filter(l => !l.source_url || l.source_url === '');
  const noBoth = allListings.filter(l => !l.source_id && (!l.source_url || l.source_url === ''));

  console.log('\nBreakdown:');
  console.log('  - Missing source_id:', noSourceId.length);
  console.log('  - Missing source_url:', noSourceUrl.length);
  console.log('  - Missing BOTH:', noBoth.length);

  // Check what sources exist
  const { data: sources, error: srcErr } = await supabase
    .from('sources')
    .select('id, name');

  if (!srcErr && sources) {
    console.log('\n=== AVAILABLE SOURCES ===');
    for (const s of sources) {
      console.log('  - ' + s.id + ': ' + s.name);
    }
  }

  // Show listings missing both
  console.log('\n=== LISTINGS MISSING BOTH source_id AND source_url ===\n');
  for (const l of noBoth) {
    console.log('- ' + l.name);
  }

  // Try to infer source from source_url patterns
  console.log('\n=== LISTINGS WITH URL BUT NO source_id ===\n');
  const hasUrlNoId = allListings.filter(l => !l.source_id && l.source_url);
  for (const l of hasUrlNoId) {
    let inferredSource = 'unknown';
    if (l.source_url.includes('sethlui')) inferredSource = 'sethlui';
    else if (l.source_url.includes('eatbook')) inferredSource = 'eatbook';
    else if (l.source_url.includes('google')) inferredSource = 'google';
    else if (l.source_url.includes('burpple')) inferredSource = 'burpple';
    else if (l.source_url.includes('hungrygowhere')) inferredSource = 'hungrygowhere';
    else if (l.source_url.includes('tripadvisor')) inferredSource = 'tripadvisor';

    console.log('- ' + l.name + ' | inferred: ' + inferredSource + ' | url: ' + l.source_url.substring(0, 50) + '...');
  }

  console.log('\nTotal with URL but no source_id:', hasUrlNoId.length);
}

checkMissingSources().catch(console.error);

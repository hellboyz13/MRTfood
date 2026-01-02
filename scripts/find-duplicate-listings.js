const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findDuplicates() {
  // Fetch all food listings with station info
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select(`
      id,
      name,
      address,
      station_id,
      source_id,
      stations(name)
    `)
    .eq('is_active', true)
    .order('station_id');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Total listings: ${listings.length}\n`);

  // Group by station
  const byStation = {};
  for (const listing of listings) {
    const stationId = listing.station_id || 'no-station';
    if (!byStation[stationId]) {
      byStation[stationId] = [];
    }
    byStation[stationId].push(listing);
  }

  // Function to get words from a name (lowercase, remove common words)
  function getWords(name) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'at', 'by', 'for', 'of', 'to', 'in', 'on', '-', '&'];
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.includes(w));
  }

  // Function to count shared words between two names
  function sharedWordCount(name1, name2) {
    const words1 = getWords(name1);
    const words2 = getWords(name2);
    let shared = 0;
    const sharedWords = [];
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1 === w2) {
          shared++;
          sharedWords.push(w1);
          break;
        }
      }
    }
    return { count: shared, words: sharedWords };
  }

  const potentialDuplicates = [];

  // Check each station for duplicates
  for (const [stationId, stationListings] of Object.entries(byStation)) {
    if (stationListings.length < 2) continue;

    const stationName = stationListings[0]?.stations?.name || stationId;

    // Compare every pair
    for (let i = 0; i < stationListings.length; i++) {
      for (let j = i + 1; j < stationListings.length; j++) {
        const l1 = stationListings[i];
        const l2 = stationListings[j];

        const { count, words } = sharedWordCount(l1.name, l2.name);

        // If 2 or more shared words, flag as potential duplicate
        if (count >= 2) {
          potentialDuplicates.push({
            station: stationName,
            stationId,
            listing1: { id: l1.id, name: l1.name, address: l1.address, source: l1.source_id },
            listing2: { id: l2.id, name: l2.name, address: l2.address, source: l2.source_id },
            sharedWords: words,
            sharedCount: count
          });
        }
      }
    }
  }

  // Sort by shared word count (descending)
  potentialDuplicates.sort((a, b) => b.sharedCount - a.sharedCount);

  // Save to JSON file for review
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/potential-duplicates.json',
    JSON.stringify(potentialDuplicates, null, 2)
  );

  console.log('='.repeat(80));
  console.log('POTENTIAL DUPLICATES SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal potential duplicates found: ${potentialDuplicates.length}`);
  console.log(`\nBreakdown by shared word count:`);

  const byCount = {};
  for (const dup of potentialDuplicates) {
    byCount[dup.sharedCount] = (byCount[dup.sharedCount] || 0) + 1;
  }
  for (const [count, num] of Object.entries(byCount).sort((a, b) => b[0] - a[0])) {
    console.log(`  ${count} shared words: ${num} pairs`);
  }

  console.log('\n\nHIGH CONFIDENCE DUPLICATES (4+ shared words):');
  console.log('='.repeat(80));

  const highConfidence = potentialDuplicates.filter(d => d.sharedCount >= 4);
  for (const dup of highConfidence) {
    console.log(`\nStation: ${dup.station}`);
    console.log(`Shared: ${dup.sharedWords.join(', ')} (${dup.sharedCount} words)`);
    console.log(`  1) "${dup.listing1.name}"`);
    console.log(`     ID: ${dup.listing1.id}`);
    console.log(`     Address: ${dup.listing1.address || 'N/A'}`);
    console.log(`  2) "${dup.listing2.name}"`);
    console.log(`     ID: ${dup.listing2.id}`);
    console.log(`     Address: ${dup.listing2.address || 'N/A'}`);
  }

  console.log('\n\nFull list saved to: scripts/potential-duplicates.json');
}

findDuplicates().catch(console.error);

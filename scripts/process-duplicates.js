const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Load the duplicates JSON
const duplicates = JSON.parse(fs.readFileSync('scripts/potential-duplicates.json', 'utf8'));

// Normalize address for comparison
function normalizeAddress(addr) {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .replace(/singapore\d+/g, '') // Remove postal code
    .replace(/\d{6}/g, ''); // Remove 6-digit postal codes
}

// Check if addresses are similar (one contains the other, or high overlap)
function addressesSimilar(addr1, addr2) {
  const n1 = normalizeAddress(addr1);
  const n2 = normalizeAddress(addr2);

  if (!n1 || !n2) return false;

  // Exact match after normalization
  if (n1 === n2) return true;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check for significant overlap (80%+ of shorter string in longer)
  const shorter = n1.length < n2.length ? n1 : n2;
  const longer = n1.length < n2.length ? n2 : n1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter.substring(i, i + 5))) {
      matches += 5;
      i += 4;
    }
  }

  return matches / shorter.length > 0.7;
}

async function processDuplicates() {
  // Separate by word count
  const highConfidence = duplicates.filter(d => d.sharedCount >= 4);
  const mediumConfidence = duplicates.filter(d => d.sharedCount === 3);
  const lowConfidence = duplicates.filter(d => d.sharedCount === 2);

  console.log('='.repeat(80));
  console.log('PROCESSING DUPLICATES');
  console.log('='.repeat(80));

  // For 4+ words - delete one of each pair
  console.log(`\n4+ WORD MATCHES: ${highConfidence.length} pairs - WILL DELETE`);
  const toDelete = [];

  for (const dup of highConfidence) {
    // Keep the one with more info (longer address, or has source)
    const keep = (dup.listing1.address?.length || 0) >= (dup.listing2.address?.length || 0)
      ? dup.listing1
      : dup.listing2;
    const remove = keep === dup.listing1 ? dup.listing2 : dup.listing1;

    // Don't delete if they're clearly different stalls (Lau Pa Sat case)
    if (dup.station === 'Telok Ayer' && dup.listing1.name.includes('Lau Pa Sat') && dup.listing2.name.includes('Lau Pa Sat')) {
      // Check if they're different stalls
      const stall1 = dup.listing1.name.replace('Lau Pa Sat - ', '');
      const stall2 = dup.listing2.name.replace('Lau Pa Sat - ', '');
      if (stall1 !== stall2 && !stall1.includes(stall2) && !stall2.includes(stall1)) {
        console.log(`  SKIP (different stalls): "${dup.listing1.name}" vs "${dup.listing2.name}"`);
        continue;
      }
    }

    // Skip if names are quite different (like Kwang Kee vs Song Kee)
    const name1Words = dup.listing1.name.toLowerCase().split(/\s+/);
    const name2Words = dup.listing2.name.toLowerCase().split(/\s+/);
    const firstWordMatch = name1Words[0] === name2Words[0];
    if (!firstWordMatch && dup.sharedCount === 4) {
      console.log(`  SKIP (different first word): "${dup.listing1.name}" vs "${dup.listing2.name}"`);
      continue;
    }

    toDelete.push({
      id: remove.id,
      name: remove.name,
      keepName: keep.name,
      station: dup.station
    });
    console.log(`  DELETE: "${remove.name}" (keep: "${keep.name}")`);
  }

  // For 3-word matches - check addresses
  console.log(`\n3 WORD MATCHES: ${mediumConfidence.length} pairs - CHECKING ADDRESSES`);
  const threeWordDuplicates = [];
  const threeWordNotDuplicates = [];

  for (const dup of mediumConfidence) {
    const similar = addressesSimilar(dup.listing1.address, dup.listing2.address);
    if (similar) {
      threeWordDuplicates.push(dup);
      const keep = (dup.listing1.address?.length || 0) >= (dup.listing2.address?.length || 0)
        ? dup.listing1
        : dup.listing2;
      const remove = keep === dup.listing1 ? dup.listing2 : dup.listing1;
      toDelete.push({
        id: remove.id,
        name: remove.name,
        keepName: keep.name,
        station: dup.station
      });
      console.log(`  DUPLICATE: "${dup.listing1.name}" vs "${dup.listing2.name}"`);
    } else {
      threeWordNotDuplicates.push(dup);
    }
  }

  // For 2-word matches - check addresses
  console.log(`\n2 WORD MATCHES: ${lowConfidence.length} pairs - CHECKING ADDRESSES`);
  const twoWordDuplicates = [];
  const twoWordNotDuplicates = [];

  for (const dup of lowConfidence) {
    const similar = addressesSimilar(dup.listing1.address, dup.listing2.address);
    if (similar) {
      twoWordDuplicates.push(dup);
      const keep = (dup.listing1.address?.length || 0) >= (dup.listing2.address?.length || 0)
        ? dup.listing1
        : dup.listing2;
      const remove = keep === dup.listing1 ? dup.listing2 : dup.listing1;
      toDelete.push({
        id: remove.id,
        name: remove.name,
        keepName: keep.name,
        station: dup.station
      });
      console.log(`  DUPLICATE: "${dup.listing1.name}" vs "${dup.listing2.name}"`);
    } else {
      twoWordNotDuplicates.push(dup);
    }
  }

  // Create CSV for manual review (ones with different addresses)
  const csvRows = ['Station,Name 1,Address 1,Name 2,Address 2,Shared Words'];
  for (const dup of [...threeWordNotDuplicates, ...twoWordNotDuplicates]) {
    const row = [
      `"${dup.station}"`,
      `"${dup.listing1.name}"`,
      `"${dup.listing1.address || 'N/A'}"`,
      `"${dup.listing2.name}"`,
      `"${dup.listing2.address || 'N/A'}"`,
      `"${dup.sharedWords.join(', ')}"`
    ].join(',');
    csvRows.push(row);
  }

  fs.writeFileSync('scripts/review-duplicates.csv', csvRows.join('\n'));
  console.log(`\nCSV for manual review saved: scripts/review-duplicates.csv`);
  console.log(`  - ${threeWordNotDuplicates.length} 3-word pairs with different addresses`);
  console.log(`  - ${twoWordNotDuplicates.length} 2-word pairs with different addresses`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total duplicates to delete: ${toDelete.length}`);
  console.log(`  - From 4+ word matches: ${highConfidence.length - (highConfidence.length - toDelete.filter(d => highConfidence.some(h => h.listing2.id === d.id || h.listing1.id === d.id)).length)}`);
  console.log(`  - From 3-word matches (same address): ${threeWordDuplicates.length}`);
  console.log(`  - From 2-word matches (same address): ${twoWordDuplicates.length}`);
  console.log(`\nNeed manual review: ${threeWordNotDuplicates.length + twoWordNotDuplicates.length}`);

  // Ask for confirmation before deleting
  console.log('\n' + '='.repeat(80));
  console.log('DELETING DUPLICATES...');
  console.log('='.repeat(80));

  let deleted = 0;
  for (const item of toDelete) {
    const { error } = await supabase
      .from('food_listings')
      .delete()
      .eq('id', item.id);

    if (error) {
      console.log(`  ERROR deleting ${item.name}: ${error.message}`);
    } else {
      console.log(`  Deleted: "${item.name}" at ${item.station}`);
      deleted++;
    }
  }

  console.log(`\nDeleted ${deleted} duplicate listings.`);
}

processDuplicates().catch(console.error);

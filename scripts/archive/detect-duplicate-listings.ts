import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FoodListing {
  id: string;
  name: string;
  address: string | null;
  station_id: string | null;
  description: string | null;
}

// Normalize text for comparison
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

// Calculate similarity score between two strings (0-1)
function similarity(str1: string, str2: string): number {
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1;

  // Simple word-based similarity
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// Check if two listings are likely duplicates
function areDuplicates(listing1: FoodListing, listing2: FoodListing): boolean {
  // Same station
  if (listing1.station_id !== listing2.station_id) return false;

  // High name similarity (>0.7)
  const nameSimilarity = similarity(listing1.name, listing2.name);
  if (nameSimilarity < 0.7) return false;

  // If both have addresses, check address similarity
  if (listing1.address && listing2.address) {
    const addressSimilarity = similarity(listing1.address, listing2.address);
    if (addressSimilarity > 0.8) return true;
  }

  // Very high name similarity is enough
  if (nameSimilarity > 0.9) return true;

  return false;
}

async function detectDuplicates() {
  console.log('🔍 Detecting duplicate food listings...\n');

  // Get all active food listings
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, description')
    .eq('is_active', true)
    .order('station_id')
    .order('name');

  if (error || !listings) {
    console.error('❌ Error fetching listings:', error);
    return;
  }

  console.log(`📊 Analyzing ${listings.length} listings...\n`);

  const duplicateGroups: FoodListing[][] = [];
  const processedIds = new Set<string>();

  // Find duplicate groups
  for (let i = 0; i < listings.length; i++) {
    if (processedIds.has(listings[i].id)) continue;

    const group: FoodListing[] = [listings[i]];
    processedIds.add(listings[i].id);

    // Check remaining listings
    for (let j = i + 1; j < listings.length; j++) {
      if (processedIds.has(listings[j].id)) continue;

      // Check if it's a duplicate of any in the current group
      if (group.some(item => areDuplicates(item, listings[j]))) {
        group.push(listings[j]);
        processedIds.add(listings[j].id);
      }
    }

    // Only keep groups with 2+ items (actual duplicates)
    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Found ${duplicateGroups.length} duplicate groups`);
  console.log(`${'='.repeat(60)}\n`);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  // Display duplicate groups
  duplicateGroups.forEach((group, index) => {
    console.log(`\nGroup ${index + 1}: ${group.length} duplicates`);
    console.log('-'.repeat(50));
    group.forEach((listing, i) => {
      console.log(`  [${i + 1}] ${listing.name}`);
      if (listing.address) console.log(`      📍 ${listing.address}`);
      console.log(`      ID: ${listing.id}`);
    });
  });

  // Summary
  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`  Total duplicate groups: ${duplicateGroups.length}`);
  console.log(`  Total duplicate listings: ${totalDuplicates}`);
  console.log(`  Unique listings: ${listings.length - totalDuplicates}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('💡 To remove duplicates, review the groups above and:');
  console.log('   1. Manually merge the data (keep best sources)');
  console.log('   2. Mark duplicates as inactive (is_active = false)');
  console.log('   3. Or delete the duplicate records\n');
}

detectDuplicates();

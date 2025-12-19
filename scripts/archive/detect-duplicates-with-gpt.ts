import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

interface FoodListing {
  id: string;
  name: string;
  address: string | null;
  station_id: string | null;
  description: string | null;
}

async function detectDuplicatesWithGPT(listings: FoodListing[]): Promise<string[][]> {
  console.log(`🤖 Using ChatGPT to detect duplicates among ${listings.length} listings...\n`);

  // Prepare the listings data for GPT
  const listingsData = listings.map((listing, index) => ({
    index,
    id: listing.id,
    name: listing.name,
    address: listing.address || 'N/A',
    description: listing.description || 'N/A'
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data deduplication expert. Analyze the list of food listings and identify groups of duplicates. Return only a JSON array of arrays, where each inner array contains the indices of duplicate listings."
        },
        {
          role: "user",
          content: `Analyze these food listings and identify duplicates. Listings are duplicates if they refer to the same restaurant at the same location, even if names are slightly different (e.g., "McDonald's" vs "McDonalds", "Tim Ho Wan @ Changi" vs "Tim Ho Wan Changi Airport").

${JSON.stringify(listingsData, null, 2)}

Return ONLY a JSON array of arrays containing the indices of duplicate groups. Example format:
[[0, 5, 12], [3, 8], [15, 20, 25]]

Each inner array represents a group of duplicates. Only include groups with 2+ items.
If no duplicates found, return: []`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';
    console.log(`📝 GPT Response length: ${content.length} chars\n`);

    // Parse the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`⚠️  No JSON array found in response`);
      return [];
    }

    const duplicateGroups: number[][] = JSON.parse(jsonMatch[0]);

    // Convert indices to IDs
    const idGroups = duplicateGroups.map(group =>
      group.map(index => listings[index].id)
    );

    return idGroups;
  } catch (error) {
    console.error(`❌ Error detecting duplicates:`, error);
    return [];
  }
}

async function removeDuplicates() {
  console.log('🔍 Detecting duplicates in food_listings with ChatGPT...\n');

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

  const duplicateGroups = await detectDuplicatesWithGPT(listings);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Found ${duplicateGroups.length} duplicate groups`);
  console.log(`${'='.repeat(60)}\n`);

  // Display duplicate groups
  let totalDuplicates = 0;
  duplicateGroups.forEach((group, index) => {
    console.log(`\nGroup ${index + 1}: ${group.length} duplicates`);
    console.log('-'.repeat(50));
    group.forEach((id, i) => {
      const listing = listings.find(l => l.id === id);
      if (listing) {
        console.log(`  [${i + 1}] ${listing.name}`);
        if (listing.address) console.log(`      📍 ${listing.address}`);
        console.log(`      ID: ${listing.id}`);
      }
    });
    totalDuplicates += group.length - 1; // -1 because we keep one
  });

  // Ask for confirmation before deleting
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`  Duplicate groups: ${duplicateGroups.length}`);
  console.log(`  Total duplicates to remove: ${totalDuplicates}`);
  console.log(`  Will keep: ${duplicateGroups.length} (first in each group)`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('🗑️  Removing duplicates (keeping first in each group)...\n');

  let removedCount = 0;
  for (const group of duplicateGroups) {
    // Keep the first one, remove the rest
    const toRemove = group.slice(1);

    const { error: deleteError } = await supabase
      .from('food_listings')
      .update({ is_active: false })
      .in('id', toRemove);

    if (deleteError) {
      console.error(`❌ Error removing duplicates:`, deleteError);
    } else {
      removedCount += toRemove.length;
      console.log(`  ✅ Removed ${toRemove.length} duplicates from group`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Duplicate removal complete!`);
  console.log(`  Removed: ${removedCount} listings`);
  console.log(`  Remaining active: ${listings.length - removedCount}`);
  console.log(`${'='.repeat(60)}`);
}

removeDuplicates();

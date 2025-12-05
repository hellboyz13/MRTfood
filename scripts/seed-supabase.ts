import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { foodListings } from '../data/listings';
import { foodSources } from '../data/sources';

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
// Service role key (bypasses RLS)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4';

console.log('Using key starting with:', supabaseKey.substring(0, 20) + '...');
console.log('Key length:', supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedFoodSources() {
  console.log(`Seeding ${foodSources.length} food sources to Supabase...`);

  // Clear existing sources
  const { error: deleteError } = await supabase
    .from('food_sources')
    .delete()
    .gte('created_at', '1970-01-01');

  if (deleteError) {
    console.error('Error clearing food_sources:', deleteError);
  }

  // Insert sources
  const sourceRecords = foodSources.map(source => ({
    id: source.id,
    name: source.name,
    icon: source.icon,
    url: source.url,
    bg_color: source.bgColor,
  }));

  const { error: insertError } = await supabase
    .from('food_sources')
    .insert(sourceRecords);

  if (insertError) {
    console.error('Error inserting food_sources:', insertError);
  } else {
    console.log(`Inserted ${sourceRecords.length} food sources.`);
  }
}

async function getValidStationIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('stations')
    .select('id');

  if (error) {
    console.error('Error fetching stations:', error);
    return new Set();
  }

  return new Set(data?.map(s => s.id) || []);
}

async function seedFoodListings() {
  // First seed the sources
  await seedFoodSources();

  // Get valid station IDs
  const validStations = await getValidStationIds();
  console.log(`Found ${validStations.size} valid stations in database.`);

  console.log(`Seeding ${foodListings.length} food listings to Supabase...`);

  // Transform data to match Supabase table schema (use UUID for id)
  // Only use station_id if it exists in the stations table
  const records = foodListings.map(listing => ({
    id: randomUUID(),
    name: listing.name,
    description: listing.description,
    address: listing.address || null,
    station_id: listing.nearestMRT && validStations.has(listing.nearestMRT) ? listing.nearestMRT : null,
    image_url: listing.image || null,
    rating: listing.rating,
    source_id: listing.sourceId,
    source_url: listing.sourceUrl || null,
    tags: listing.tags,
  }));

  // Delete existing records first
  console.log('Clearing existing food_listings...');
  const { error: deleteError } = await supabase
    .from('food_listings')
    .delete()
    .gte('created_at', '1970-01-01');

  if (deleteError) {
    console.error('Error clearing existing records:', deleteError);
  } else {
    console.log('Cleared existing records.');
  }

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('food_listings')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} records (${inserted}/${records.length})`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} food listings.`);
}

seedFoodListings().catch(console.error);

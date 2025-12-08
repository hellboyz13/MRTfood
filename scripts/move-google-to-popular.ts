import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use service_role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function moveGoogleToPopular() {
  console.log('🔍 Step 1: Finding all Google Places listings...\n');

  // Find all listings that have google_places as a source
  const { data: googleListingSources } = await supabase
    .from('listing_sources')
    .select('listing_id, source_id')
    .eq('source_id', 'google_places');

  console.log(`Found ${googleListingSources?.length || 0} listings with google_places source\n`);

  // Also check if there are listings with description matching Google pattern
  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, description')
    .ilike('description', '%reviewers on Google%');

  console.log(`Found ${allListings?.length || 0} listings with Google-style descriptions\n`);

  console.log('📋 Sample Google listings:');
  allListings?.slice(0, 10).forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.name}`);
    console.log(`     ${l.description?.substring(0, 80)}...`);
  });

  console.log('\n🔄 Step 2: Creating "popular" source if it doesn\'t exist...\n');

  const { data: existingPopular } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'popular')
    .single();

  if (!existingPopular) {
    const { error } = await supabase
      .from('food_sources')
      .insert({
        id: 'popular',
        name: 'Popular',
        icon: '🔥',
        url: '',
        bg_color: '#FFF3E0',
      });

    if (error) {
      console.error('Error creating popular source:', error.message);
      return;
    }
    console.log('✅ Created "popular" source\n');
  } else {
    console.log('✅ "popular" source already exists\n');
  }

  console.log('🔄 Step 3: Moving all Google Places listings to "popular"...\n');

  let movedCount = 0;

  for (const listing of allListings || []) {
    // Check if this listing has google_places source
    const hasGoogleSource = googleListingSources?.some(ls => ls.listing_id === listing.id);

    if (hasGoogleSource) {
      // Delete the google_places source mapping
      const { error: deleteError } = await supabase
        .from('listing_sources')
        .delete()
        .eq('listing_id', listing.id)
        .eq('source_id', 'google_places');

      if (deleteError) {
        console.error(`  ❌ Error deleting google_places for ${listing.name}:`, deleteError.message);
        continue;
      }
    }

    // Add popular source mapping
    const { error: insertError } = await supabase
      .from('listing_sources')
      .insert({
        listing_id: listing.id,
        source_id: 'popular',
        source_url: null,
      });

    if (insertError) {
      console.error(`  ❌ Error adding popular source for ${listing.name}:`, insertError.message);
    } else {
      movedCount++;
      if (movedCount <= 10 || movedCount % 50 === 0) {
        console.log(`  ✅ [${movedCount}] ${listing.name} -> moved to Popular`);
      }
    }
  }

  console.log(`\n✅ Complete! Moved ${movedCount} listings from Google Places to Popular`);

  // Final verification
  console.log('\n📊 Final source counts:');
  const { data: sources } = await supabase
    .from('listing_sources')
    .select('source_id');

  const counts = new Map();
  sources?.forEach(s => {
    counts.set(s.source_id, (counts.get(s.source_id) || 0) + 1);
  });

  for (const [sourceId, count] of counts.entries()) {
    console.log(`  ${sourceId.padEnd(25)} -> ${count} listings`);
  }
}

moveGoogleToPopular();

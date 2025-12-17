const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXCLUDED_SOURCE_IDS = ['michelin-1-star', 'michelin-2-star', 'michelin-3-star'];

async function testGetFoodListingsByStation(stationId) {
  // Same logic as api.ts getFoodListingsByStation
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('*')
    .eq('station_id', stationId)
    .eq('is_active', true);

  console.log('Raw listings count:', listings?.length || 0);
  console.log('Error:', error);

  if (!listings || listings.length === 0) {
    return [];
  }

  // Get listing_sources
  const listingIds = listings.map(l => l.id);
  const { data: listingSources } = await supabase
    .from('listing_sources')
    .select('listing_id, source_url, is_primary, food_sources(*)')
    .in('listing_id', listingIds);

  console.log('Listing sources count:', listingSources?.length || 0);

  // Group sources by listing
  const sourcesByListing = new Map();
  (listingSources || []).forEach(ls => {
    if (!ls.food_sources) return;
    const sources = sourcesByListing.get(ls.listing_id) || [];
    sources.push({ source: ls.food_sources, source_url: ls.source_url, is_primary: ls.is_primary });
    sourcesByListing.set(ls.listing_id, sources);
  });

  // Combine with trust score
  const result = listings.map(listing => {
    const sources = sourcesByListing.get(listing.id) || [];
    const trust_score = sources.reduce((sum, s) => sum + (s.source.weight || 1), 0);
    return { ...listing, sources, trust_score };
  });

  console.log('\nBefore filter:');
  result.forEach(l => console.log(' -', l.name, '| sources:', l.sources.length, '| score:', l.trust_score));

  // Filter out Michelin-only listings
  const filtered = result.filter(listing => {
    const sourceIds = listing.sources.map(s => s.source.id);
    const hasValidSource = sourceIds.some(id => !EXCLUDED_SOURCE_IDS.includes(id));
    return hasValidSource || sourceIds.length === 0;
  });

  console.log('\nAfter filter:', filtered.length);

  return filtered;
}

testGetFoodListingsByStation('hillview');

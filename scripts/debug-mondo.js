const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EXCLUDED_SOURCE_IDS = ['michelin-1-star', 'michelin-2-star', 'michelin-3-star'];

async function run() {
  const stationId = 'telok-ayer';

  const { data: listings } = await supabase
    .from('food_listings')
    .select('*')
    .eq('station_id', stationId)
    .eq('is_active', true);

  const listingIds = listings.map(l => l.id);
  const { data: listingSources } = await supabase
    .from('listing_sources')
    .select('listing_id, source_url, is_primary, food_sources(*)')
    .in('listing_id', listingIds);

  // Group sources
  const sourcesByListing = new Map();
  (listingSources || []).forEach(ls => {
    if (!ls.food_sources) return;
    const sources = sourcesByListing.get(ls.listing_id) || [];
    sources.push({ source: ls.food_sources, source_url: ls.source_url || '', is_primary: ls.is_primary });
    sourcesByListing.set(ls.listing_id, sources);
  });

  // Find Mondo
  const mondo = listings.find(l => l.name === 'Mondo');
  if (mondo) {
    const mondoSources = sourcesByListing.get(mondo.id) || [];
    console.log('Mondo ID:', mondo.id);
    console.log('Mondo found in listings: YES');
    console.log('Mondo sources:', mondoSources.map(s => s.source.name));
    const sourceIds = mondoSources.map(s => s.source.id);
    console.log('Source IDs:', sourceIds);
    const hasValidSource = sourceIds.some(id => !EXCLUDED_SOURCE_IDS.includes(id));
    console.log('Has valid source:', hasValidSource);
    console.log('Source count is 0:', sourceIds.length === 0);
    console.log('Should be included:', hasValidSource || sourceIds.length === 0);
  } else {
    console.log('Mondo NOT found in listings');
  }
}

run().catch(console.error);

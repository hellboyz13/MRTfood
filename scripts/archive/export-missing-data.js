const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function exportMissingData() {
  // Get all listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, source_id, station_id, address, lat, lng, tags')
    .order('name');

  // Get all prices
  const { data: prices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const listingsWithPrices = new Set(prices.map(p => p.listing_id));

  // Find listings without prices
  const noPrices = listings.filter(l => !listingsWithPrices.has(l.id));

  // Find listings without sources
  const noSource = listings.filter(l => !l.source_id);

  // Export listings without prices
  let csv1 = 'name,station_id,source_id,address,lat,lng,tags,price_low,price_high\n';
  noPrices.forEach(l => {
    const tags = Array.isArray(l.tags) ? l.tags.join(';') : (l.tags || '');
    csv1 += `"${l.name}","${l.station_id}","${l.source_id || ''}","${l.address || ''}",${l.lat || ''},${l.lng || ''},"${tags}",,\n`;
  });

  fs.writeFileSync('c:\\Users\\Admin\\Downloads\\listings_without_prices.csv', csv1);
  console.log('Exported ' + noPrices.length + ' listings without prices to listings_without_prices.csv');

  // Export listings without sources
  let csv2 = 'name,station_id,address,lat,lng,tags,source_id\n';
  noSource.forEach(l => {
    const tags = Array.isArray(l.tags) ? l.tags.join(';') : (l.tags || '');
    csv2 += `"${l.name}","${l.station_id}","${l.address || ''}",${l.lat || ''},${l.lng || ''},"${tags}",\n`;
  });

  fs.writeFileSync('c:\\Users\\Admin\\Downloads\\listings_without_sources.csv', csv2);
  console.log('Exported ' + noSource.length + ' listings without sources to listings_without_sources.csv');
}

exportMissingData().catch(console.error);

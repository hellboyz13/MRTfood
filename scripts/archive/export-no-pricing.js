// Script to export restaurants without pricing to CSV
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // Get all active listings with full details
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, tags, description')
    .eq('is_active', true);

  // Get all listing IDs that have prices
  const { data: prices } = await supabase
    .from('listing_prices')
    .select('listing_id')
    .eq('item_name', 'Price Range');

  const pricedIds = new Set((prices || []).map(p => p.listing_id));

  const noPricing = (listings || []).filter(l => !pricedIds.has(l.id));

  // Create CSV content
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headers = ['name', 'address', 'station_id', 'tags', 'description'];
  const csvLines = [headers.join(',')];

  noPricing.forEach(l => {
    const row = [
      escapeCSV(l.name),
      escapeCSV(l.address),
      escapeCSV(l.station_id),
      escapeCSV(Array.isArray(l.tags) ? l.tags.join('; ') : l.tags),
      escapeCSV(l.description)
    ];
    csvLines.push(row.join(','));
  });

  const csvContent = csvLines.join('\n');

  // Write to file
  fs.writeFileSync('restaurants_no_pricing.csv', csvContent);
  console.log('CSV file created: restaurants_no_pricing.csv');
  console.log('Total restaurants: ' + noPricing.length);
}

main().catch(console.error);

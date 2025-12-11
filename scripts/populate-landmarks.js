const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Known malls in Singapore
const MALLS = [
  'JEM', 'Westgate', 'IMM', 'Jurong Point', 'Big Box',
  'Tampines Mall', 'Tampines 1', 'Century Square', 'Our Tampines Hub',
  'Clementi Mall', 'The Clementi Mall',
  'NEX', 'Compass One', 'White Sands',
  'Causeway Point', 'Northpoint City', 'Junction 8', 'Junction 10',
  'Lot One', 'Hillion Mall',
  'VivoCity', 'HarbourFront Centre',
  'Plaza Singapura', 'The Centrepoint', 'Paragon', 'ION Orchard', 'Ngee Ann City', 'Wisma Atria', 'Takashimaya',
  '313@Somerset', 'Orchard Central', 'Mandarin Gallery',
  'Suntec City', 'Marina Square', 'Millenia Walk', 'Raffles City',
  'Bugis Junction', 'Bugis+', 'Duo Galleria',
  'Funan', 'Capitol Piazza', 'CHIJMES',
  'City Square Mall', 'Mustafa Centre',
  'Paya Lebar Quarter', 'PLQ', 'SingPost Centre',
  'Bedok Mall', 'Bedok Point',
  'Waterway Point', 'Punggol Plaza',
  'Nex', 'AMK Hub', 'Djitsun Mall',
  'Hougang Mall', 'Heartland Mall',
  'Velocity@Novena Square', 'Square 2', 'United Square',
  'Great World', 'Valley Point', 'UE Square',
  'Star Vista', 'The Star Vista', 'Rochester Mall',
  'West Mall', 'Bukit Panjang Plaza',
  'Sun Plaza', 'Sembawang Shopping Centre',
  'Admiralty Place', 'Kampung Admiralty',
  'Jewel Changi Airport', 'Changi City Point',
  'Downtown Gallery', 'Tanjong Pagar Centre', 'Guoco Tower',
  '100AM', 'Chinatown Point', 'People\'s Park Complex', 'People\'s Park Centre',
  'Clarke Quay', 'Robertson Walk', 'Valley Point',
  'Parkway Parade', 'i12 Katong', 'Katong V', 'Parkway Parade',
  'Thomson Plaza', 'Upper Thomson',
  'Tiong Bahru Plaza',
  'Alexandra Retail Centre', 'Queensway Shopping Centre', 'Anchorpoint',
  'Novena Square', 'Velocity', 'Royal Square',
  'OneKM', 'Kinex', 'KINEX', 'Leisure Park Kallang',
  'Aperia Mall', 'City Gate',
];

// Known hawker centres
const HAWKER_CENTRES = [
  // Format: [pattern to match, landmark name]
  ['Maxwell Rd', 'Maxwell Food Centre'],
  ['Maxwell Road', 'Maxwell Food Centre'],
  ['Maxwell Food Centre', 'Maxwell Food Centre'],
  ['Maxwell Hawker', 'Maxwell Food Centre'],
  ['Chinatown Complex', 'Chinatown Complex'],
  ['Old Airport Road', 'Old Airport Road Food Centre'],
  ['Amoy Street Food Centre', 'Amoy Street Food Centre'],
  ['Lau Pa Sat', 'Lau Pa Sat'],
  ['Telok Ayer Market', 'Lau Pa Sat'],
  ['Golden Mile Food Centre', 'Golden Mile Food Centre'],
  ['Golden Mile Tower', 'Golden Mile Tower'],
  ['Tekka Centre', 'Tekka Centre'],
  ['Zion Riverside', 'Zion Riverside Food Centre'],
  ['Tiong Bahru Market', 'Tiong Bahru Market'],
  ['ABC Brickworks', 'ABC Brickworks Market'],
  ['Ghim Moh Market', 'Ghim Moh Market'],
  ['Ghim Moh Rd', 'Ghim Moh Market'],
  ['Ghim Moh Road', 'Ghim Moh Market'],
  ['Adam Road Food Centre', 'Adam Road Food Centre'],
  ['Adam Rd', 'Adam Road Food Centre'],
  ['Adam Road', 'Adam Road Food Centre'],
  ['Newton Food Centre', 'Newton Food Centre'],
  ['Newton Circus', 'Newton Food Centre'],
  ['Whampoa', 'Whampoa Makan Place'],
  ['Berseh Food Centre', 'Berseh Food Centre'],
  ['Hong Lim', 'Hong Lim Market'],
  ['People\'s Park', 'People\'s Park Food Centre'],
  ['Toa Payoh Lorong 8', 'Toa Payoh Lorong 8 Market'],
  ['Toa Payoh Lorong 4', 'Toa Payoh Lorong 4 Market'],
  ['Toa Payoh Lorong 1', 'Toa Payoh Lorong 1 Market'],
  ['Kim San Leng', 'Kim San Leng Food Centre'],
  ['Fengshan', 'Fengshan Market'],
  ['Bedok Interchange', 'Bedok Interchange Hawker Centre'],
  ['Bedok 85', 'Bedok 85 Fengshan'],
  ['East Coast Lagoon', 'East Coast Lagoon Food Village'],
  ['Changi Village', 'Changi Village Hawker Centre'],
  ['Tampines Round Market', 'Tampines Round Market'],
  ['Tampines West', 'Tampines West'],
  ['Our Tampines Hub', 'Our Tampines Hub Hawker'],
  ['Pasir Ris Central', 'Pasir Ris Central Hawker Centre'],
  ['Chomp Chomp', 'Chomp Chomp Food Centre'],
  ['Serangoon Gardens', 'Chomp Chomp Food Centre'],
  ['Kovan', 'Kovan Hougang Market'],
  ['Hougang 105', 'Hougang 105 Hainanese Village'],
  ['Ci Yuan', 'Ci Yuan Hawker Centre'],
  ['Punggol Plaza', 'Punggol Plaza Hawker Centre'],
  ['Kopitiam Square', 'Kopitiam Square'],
  ['Marine Parade', 'Marine Parade Food Centre'],
  ['Marine Terrace', 'Marine Terrace Market'],
  ['Geylang Serai', 'Geylang Serai Market'],
  ['Haig Road', 'Haig Road Market'],
  ['Sims Vista', 'Sims Vista Market'],
  ['Blk 16 Bedok South', 'Bedok South Market'],
  ['Commonwealth Crescent', 'Commonwealth Crescent Market'],
  ['Margaret Drive', 'Margaret Drive Hawker Centre'],
  ['Clementi 448', 'Clementi 448 Market'],
  ['Clementi Avenue 3', 'Clementi 448 Market'],
  ['West Coast', 'West Coast Market Square'],
  ['Ayer Rajah', 'Ayer Rajah Food Centre'],
  ['Dover Crescent', 'Dover Crescent Market'],
  ['Buona Vista', 'Buona Vista Food Centre'],
  ['Holland Drive', 'Holland Drive Market'],
  ['Holland Village', 'Holland Village Market'],
  ['Empress Road', 'Empress Road Market'],
  ['Tanglin Halt', 'Tanglin Halt Market'],
  ['Redhill', 'Redhill Food Centre'],
  ['Bukit Merah', 'Bukit Merah Food Centre'],
  ['Bukit Merah View', 'Bukit Merah View Market'],
  ['Alexandra Village', 'Alexandra Village Food Centre'],
  ['Beo Crescent', 'Beo Crescent Market'],
  ['Havelock Road', 'Havelock Road Food Centre'],
  ['Jalan Bukit Merah', 'Bukit Merah Central'],
  ['Jurong West 505', '505 Jurong West Market'],
  ['505 Jurong West', '505 Jurong West Market'],
  ['Jurong West 504', '504 Jurong West Market'],
  ['504 Jurong West', '504 Jurong West Market'],
  ['Jurong West 498', '498 Jurong West Food Centre'],
  ['Jurong East 347', 'Jurong East 347'],
  ['Yuhua', 'Yuhua Market'],
  ['Taman Jurong', 'Taman Jurong Market'],
  ['Teban Gardens', 'Teban Gardens Food Centre'],
  ['Boon Lay Place', 'Boon Lay Place Food Village'],
  ['Choa Chu Kang', 'Choa Chu Kang Market'],
  ['Bukit Panjang', 'Bukit Panjang Hawker Centre'],
  ['Yew Tee', 'Yew Tee Food Court'],
  ['Woodlands', 'Woodlands Food Centre'],
  ['Admiralty', 'Admiralty Hawker Centre'],
  ['Sembawang', 'Sembawang Hills Food Centre'],
  ['Yishun Park', 'Yishun Park Hawker Centre'],
  ['Yishun Ring', 'Yishun Ring Road'],
  ['Ang Mo Kio', 'Ang Mo Kio Market'],
  ['Bishan', 'Bishan Market'],
  ['Serangoon Central', 'Serangoon Central'],
  ['Pek Kio', 'Pek Kio Market'],
  ['Bendemeer', 'Bendemeer Market'],
  ['Lavender Food Square', 'Lavender Food Square'],
  ['Beach Road', 'Beach Road Food Centre'],
  ['Golden Shoe', 'Golden Shoe Food Centre'],
  ['Market Street', 'Market Street Hawker Centre'],
  ['Tanjong Pagar Plaza', 'Tanjong Pagar Plaza'],
  ['Smith Street', 'Chinatown Complex'],
  ['Smith St', 'Chinatown Complex'],
  ['Kreta Ayer', 'Kreta Ayer Food Centre'],
  ['Outram Park', 'Outram Park Market'],
  ['Mei Ling', 'Mei Ling Market'],
  ['Circuit Road', 'Circuit Road Hawker'],
  ['MacPherson', 'MacPherson Market'],
  ['Upper Boon Keng', 'Upper Boon Keng Market'],
  ['Geylang Bahru', 'Geylang Bahru Market'],
  ['North Bridge Road', 'North Bridge Road Market'],
  ['Albert Centre', 'Albert Centre Market'],
  ['Queen Street', 'Queen Street Food Centre'],
  ['Rochor Centre', 'Rochor Centre'],
  ['Dunman', 'Dunman Food Centre'],
  ['Liang Seah', 'Liang Seah Street'],
  ['Killiney', 'Killiney Road'],
  ['Lavender St', 'Lavender Food Square'],
  ['Lavender Street', 'Lavender Food Square'],
  ['Jurong East St', 'Jurong East'],
  ['Jurong East Street', 'Jurong East'],
  ['Bedok North', 'Bedok North'],
  ['Yung Sheng', 'Taman Jurong Market'],
];

// Extract landmark from address
function extractLandmark(address) {
  if (!address) return null;

  const addrLower = address.toLowerCase();

  // Check for malls first
  for (const mall of MALLS) {
    if (addrLower.includes(mall.toLowerCase())) {
      return mall;
    }
  }

  // Check for hawker centres
  for (const [pattern, landmark] of HAWKER_CENTRES) {
    if (addrLower.includes(pattern.toLowerCase())) {
      return landmark;
    }
  }

  // Check for "Food Centre" or "Market" or "Hawker" in address
  const hawkerMatch = address.match(/([\w\s]+(?:Food Centre|Market|Hawker Centre|Hawker|Food Village|Food Court))/i);
  if (hawkerMatch) {
    return hawkerMatch[1].trim();
  }

  // Check for block number patterns like "Blk 85" or "Block 505" or "#01-XX"
  const blkMatch = address.match(/(?:Blk|Block)\s*(\d+)/i);
  if (blkMatch) {
    // Extract area from address
    const areaPatterns = [
      /Jurong West/i, /Jurong East/i, /Tampines/i, /Bedok/i, /Ang Mo Kio/i,
      /Toa Payoh/i, /Clementi/i, /Woodlands/i, /Yishun/i, /Hougang/i,
      /Serangoon/i, /Bishan/i, /Bukit Batok/i, /Bukit Panjang/i,
      /Choa Chu Kang/i, /Punggol/i, /Pasir Ris/i, /Sengkang/i,
      /Marine Parade/i, /Geylang/i, /Kallang/i, /Queenstown/i,
      /Bukit Merah/i, /Redhill/i, /Commonwealth/i, /Tiong Bahru/i,
    ];

    for (const pattern of areaPatterns) {
      const areaMatch = address.match(pattern);
      if (areaMatch) {
        return `Blk ${blkMatch[1]} ${areaMatch[0]}`;
      }
    }

    return `Blk ${blkMatch[1]}`;
  }

  // Check for street number at start (e.g. "505 Jurong West")
  const streetNumMatch = address.match(/^(\d+)\s+([\w\s]+?)(?:,|\s+Singapore|\s+#|\s+\d{6})/i);
  if (streetNumMatch) {
    const num = streetNumMatch[1];
    let area = streetNumMatch[2].trim();
    // Clean up street/road/avenue suffixes
    area = area.replace(/\s+(Street|Road|Avenue|Drive|Lane|Crescent|Place|Way|Walk|Close)\s*\d*$/i, '');
    return `${num} ${area}`;
  }

  // Check for "#XX-XX" unit numbers in malls (try to get building name before unit)
  const unitMatch = address.match(/(.+?),?\s*#\d+-\d+/i);
  if (unitMatch && unitMatch[1].length < 50) {
    const beforeUnit = unitMatch[1].trim();
    // If there's a comma, take the part after the last comma before unit
    const parts = beforeUnit.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return beforeUnit;
  }

  // Fallback: extract first meaningful part
  const parts = address.split(',');
  if (parts.length > 0) {
    let first = parts[0].trim();
    // Remove postal code if present
    first = first.replace(/\s*Singapore\s*\d{6}$/i, '').trim();
    if (first.length < 50 && first.length > 3) {
      return first;
    }
  }

  return null;
}

async function main() {
  const mode = process.argv[2] || 'preview';

  console.log('=== Landmark Extraction ===\n');

  // Get all listings
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, landmark')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.log('Error fetching listings:', error.message);
    return;
  }

  console.log(`Found ${listings.length} active listings\n`);

  // Process and show samples
  const results = listings.map(listing => ({
    id: listing.id,
    name: listing.name,
    address: listing.address,
    currentLandmark: listing.landmark,
    extractedLandmark: extractLandmark(listing.address),
  }));

  if (mode === 'preview') {
    // Show first 20 samples
    console.log('Preview (first 20):\n');
    console.log('=' .repeat(100));

    for (let i = 0; i < Math.min(20, results.length); i++) {
      const r = results[i];
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   Address:  ${r.address || '(none)'}`);
      console.log(`   Landmark: ${r.extractedLandmark || '(could not extract)'}`);
      console.log('');
    }

    console.log('=' .repeat(100));
    console.log('\nTo apply these changes, run: node scripts/populate-landmarks.js apply');
  } else if (mode === 'apply') {
    console.log('Applying landmarks...\n');

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const r of results) {
      if (!r.extractedLandmark) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('food_listings')
        .update({ landmark: r.extractedLandmark })
        .eq('id', r.id);

      if (updateError) {
        console.log(`Failed: ${r.name} - ${updateError.message}`);
        failed++;
      } else {
        updated++;
      }
    }

    console.log(`\nDone!`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (no landmark extracted): ${skipped}`);
    console.log(`Failed: ${failed}`);
  }
}

main();

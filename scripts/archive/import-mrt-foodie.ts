/**
 * Import restaurants from mrt_foodie_with_coords.csv
 * Uses OneMap API for walking distances
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getWalkingDistance } from '../lib/onemap';

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Source mapping
const sourceMapping: Record<string, string> = {
  'sethlui.com': 'sethlui',
  'eatbook.sg': 'eatbook',
  'danielfooddiary.com': 'danielfooddiary',
  'thehoneycombers.com': 'editors-choice',
  'misstamchiak.com': 'editors-choice',
  'timeout.com': 'timeout-2025',
  'hungrygowhere.com': 'editors-choice',
  'burpple.com': 'editors-choice',
  'herworld.com': 'editors-choice',
  'womensweekly.com.sg': 'editors-choice',
  'eatandtravelwithus.com': 'editors-choice',
  'neighbourhoodshop.sg': 'editors-choice',
  'singaporeverified.com': 'editors-choice',
  'opentable.com': 'editors-choice',
  'tringapore.com': 'editors-choice',
  'burgernbacon.com': 'editors-choice',
  'tiktok.com': 'editors-choice',
};

// Station code to station_id mapping
const stationCodeMapping: Record<string, string> = {
  'EW27': 'boon-lay',
  'EW24': 'jurong-east',
  'EW16': 'outram-park',
  'EW5': 'bedok',
  'NS2': 'bukit-batok',
};

// Cuisine to tags mapping
const cuisineToTags: Record<string, string[]> = {
  'Malay': ['Malay', 'Halal'],
  'Chinese': ['Chinese'],
  'Indian-Muslim': ['Indian', 'Halal'],
  'Italian': ['Italian', 'Western'],
  'Bakery': ['Bakery', 'Cafe'],
  'American': ['American', 'Western'],
  'African': ['African'],
  'Dessert': ['Dessert'],
  'Japanese': ['Japanese', 'Ramen'],
  'Vegetarian': ['Vegetarian'],
  'Vietnamese': ['Vietnamese'],
  'Greek': ['Greek', 'Western'],
  'Seafood': ['Seafood'],
};

// Restaurant data from CSV
const restaurantData = [
  { line: "Green", code: "EW27", name: "Boon Lay Power Nasi Lemak", cuisine: "Malay", price: "$3.50-4", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "sethlui.com" },
  { line: "Green", code: "EW27", name: "Heng Huat Duck Noodles", cuisine: "Chinese", price: "$4.50-6", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "eatbook.sg" },
  { line: "Green", code: "EW27", name: "Boon Lay Satay", cuisine: "Malay", price: "$0.50-0.60/stick", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "herworld.com" },
  { line: "Green", code: "EW27", name: "Lian Yi BBQ Seafood", cuisine: "Seafood", price: "$15+", priceRange: "Mid-range", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "womensweekly.com.sg" },
  { line: "Green", code: "EW27", name: "Ho Huat Hokkien Mee", cuisine: "Chinese", price: "$4-8", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "eatandtravelwithus.com" },
  { line: "Green", code: "EW27", name: "I. Mohamed Ismail", cuisine: "Indian-Muslim", price: "$1.50+", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "sethlui.com" },
  { line: "Green", code: "EW27", name: "Chong Pang Huat", cuisine: "Chinese", price: "$1.30/pc", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "sethlui.com" },
  { line: "Green", code: "EW27", name: "Lin Ji Fish Soup", cuisine: "Chinese", price: "$6", priceRange: "Budget", address: "Boon Lay Place Food Village", lat: 1.3367, lng: 103.7037, source: "sethlui.com" },
  { line: "Green", code: "EW24", name: "Joo Siah Bak Kut Teh", cuisine: "Chinese", price: "$7-10", priceRange: "Budget", address: "Block 505 Jurong West Street 52", lat: 1.3332, lng: 103.7421, source: "sethlui.com" },
  { line: "Green", code: "EW24", name: "58 Minced Meat Noodle", cuisine: "Chinese", price: "$2.50", priceRange: "Budget", address: "Yuhua Market", lat: 1.3332, lng: 103.7421, source: "eatbook.sg" },
  { line: "Green", code: "EW24", name: "Xing Yun Chicken Rice", cuisine: "Chinese", price: "$3.50", priceRange: "Budget", address: "Yuhua Market", lat: 1.3332, lng: 103.7421, source: "danielfooddiary.com" },
  { line: "Green", code: "EW24", name: "Lai Heng Teochew Kueh", cuisine: "Chinese", price: "$0.80-1.60", priceRange: "Budget", address: "Yuhua Market", lat: 1.3332, lng: 103.7421, source: "neighbourhoodshop.sg" },
  { line: "Green", code: "EW24", name: "Fei Fei Roasted Noodles", cuisine: "Chinese", price: "$3+", priceRange: "Budget", address: "Yuhua Market", lat: 1.3332, lng: 103.7421, source: "sethlui.com" },
  { line: "Green", code: "EW24", name: "Heng Heng Cooked Food", cuisine: "Chinese", price: "$4", priceRange: "Budget", address: "Yuhua Market", lat: 1.3332, lng: 103.7421, source: "sethlui.com" },
  { line: "Green", code: "EW24", name: "Casa Vostra", cuisine: "Italian", price: "$15-30++", priceRange: "Mid-range", address: "JEM Mall", lat: 1.3332, lng: 103.7421, source: "singaporeverified.com" },
  { line: "Green", code: "EW24", name: "King of Fried Rice", cuisine: "Chinese", price: "$4.50-5.50", priceRange: "Budget", address: "Yuhua Market", lat: 1.3332, lng: 103.7421, source: "sethlui.com" },
  { line: "Green", code: "EW16", name: "Tian Tian Chicken Rice", cuisine: "Chinese", price: "$6-8", priceRange: "Budget", address: "Maxwell Food Centre", lat: 1.2802, lng: 103.8395, source: "thehoneycombers.com" },
  { line: "Green", code: "EW16", name: "Ka-Soh", cuisine: "Chinese", price: "$8-48++", priceRange: "Mid-range", address: "Keong Saik Road", lat: 1.2802, lng: 103.8395, source: "eatbook.sg" },
  { line: "Green", code: "EW16", name: "Mount Faber Nasi Lemak", cuisine: "Malay", price: "$4", priceRange: "Budget", address: "Blk 37 Telok Blangah Rise", lat: 1.2802, lng: 103.8395, source: "hungrygowhere.com" },
  { line: "Green", code: "EW16", name: "Keong Saik Bakery", cuisine: "Bakery", price: "$6-12", priceRange: "Budget", address: "Keong Saik Road", lat: 1.2802, lng: 103.8395, source: "eatbook.sg" },
  { line: "Green", code: "EW16", name: "Shake Shack", cuisine: "American", price: "$7.50-9.20", priceRange: "Budget", address: "100AM Mall", lat: 1.2802, lng: 103.8395, source: "eatbook.sg" },
  { line: "Green", code: "EW16", name: "Acqua e Farina", cuisine: "Italian", price: "$20-35", priceRange: "Mid-range", address: "Keong Saik Road", lat: 1.2802, lng: 103.8395, source: "opentable.com" },
  { line: "Green", code: "EW16", name: "Baker's Bench", cuisine: "Bakery", price: "$3.50+", priceRange: "Budget", address: "Tanjong Pagar", lat: 1.2802, lng: 103.8395, source: "eatbook.sg" },
  { line: "Green", code: "EW16", name: "Tong Ah Eating House", cuisine: "Chinese", price: "$2.40-6.20", priceRange: "Budget", address: "Keong Saik Road", lat: 1.2802, lng: 103.8395, source: "thehoneycombers.com" },
  { line: "Green", code: "EW16", name: "Utu", cuisine: "African", price: "$17-33", priceRange: "Mid-range", address: "Keong Saik Road", lat: 1.2802, lng: 103.8395, source: "thehoneycombers.com" },
  { line: "Green", code: "EW5", name: "Bedok Chwee Kueh", cuisine: "Chinese", price: "$0.50/pc", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "misstamchiak.com" },
  { line: "Green", code: "EW5", name: "Hock Hai Curry Chicken", cuisine: "Chinese", price: "$4-6", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "sethlui.com" },
  { line: "Green", code: "EW5", name: "Mei Xiang Lor Mee/Prawn", cuisine: "Chinese", price: "$3-5", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "danielfooddiary.com" },
  { line: "Green", code: "EW5", name: "Ming Hui Nasi Lemak", cuisine: "Malay", price: "$2.50", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "burgernbacon.com" },
  { line: "Green", code: "EW5", name: "Inspirasi", cuisine: "Malay", price: "$2.50", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "tringapore.com" },
  { line: "Green", code: "EW5", name: "Zhong Xing Ban Mian", cuisine: "Chinese", price: "$3", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "burgernbacon.com" },
  { line: "Green", code: "EW5", name: "Xin Mei Congee", cuisine: "Chinese", price: "$3-3.50", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "sethlui.com" },
  { line: "Green", code: "EW5", name: "99 Dessert", cuisine: "Dessert", price: "$2-2.50", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "sethlui.com" },
  { line: "Green", code: "EW5", name: "Jimmy's People's Park CKT", cuisine: "Chinese", price: "$5", priceRange: "Budget", address: "Bedok Interchange Hawker Centre", lat: 1.324, lng: 103.93, source: "misstamchiak.com" },
  { line: "Green", code: "EW5", name: "Old Airport Road Lor Mee", cuisine: "Chinese", price: "$4-5", priceRange: "Budget", address: "Block 216 Bedok", lat: 1.324, lng: 103.93, source: "sethlui.com" },
  { line: "Green", code: "EW5", name: "Low Seng Kim", cuisine: "Malay", price: "$2.50", priceRange: "Budget", address: "Block 216 Bedok", lat: 1.324, lng: 103.93, source: "burpple.com" },
  { line: "Green", code: "EW5", name: "Hong Heng Carrot Cake", cuisine: "Chinese", price: "$3-4", priceRange: "Budget", address: "Block 216 Bedok", lat: 1.324, lng: 103.93, source: "sethlui.com" },
  { line: "Green", code: "EW5", name: "Chris Kway Chap", cuisine: "Chinese", price: "$5-6", priceRange: "Budget", address: "Block 216 Bedok", lat: 1.324, lng: 103.93, source: "danielfooddiary.com" },
  { line: "Red", code: "NS2", name: "Ramen Taisho", cuisine: "Japanese", price: "$12-18", priceRange: "Mid-range", address: "Le Quest Mall", lat: 1.3491, lng: 103.7497, source: "sethlui.com" },
  { line: "Red", code: "NS2", name: "Xiang Mei Roasted Meat", cuisine: "Chinese", price: "$5", priceRange: "Budget", address: "Near Bukit Batok MRT", lat: 1.3491, lng: 103.7497, source: "eatbook.sg" },
  { line: "Red", code: "NS2", name: "The Neighbourwok", cuisine: "Chinese", price: "$5-8", priceRange: "Budget", address: "Block 288 Bukit Batok", lat: 1.3491, lng: 103.7497, source: "hungrygowhere.com" },
  { line: "Red", code: "NS2", name: "Ban Mian Fish Soup", cuisine: "Chinese", price: "$4-5", priceRange: "Budget", address: "Bukit Batok West", lat: 1.3491, lng: 103.7497, source: "eatbook.sg" },
  { line: "Red", code: "NS2", name: "Ela", cuisine: "Greek", price: "$15-20", priceRange: "Mid-range", address: "West Mall", lat: 1.3491, lng: 103.7497, source: "timeout.com" },
  { line: "Red", code: "NS2", name: "Tian Tian Chi Su", cuisine: "Vegetarian", price: "$5.50", priceRange: "Budget", address: "Bukit Batok Central", lat: 1.3491, lng: 103.7497, source: "sethlui.com" },
  { line: "Red", code: "NS2", name: "Famous JB 101", cuisine: "Chinese", price: "$4-10", priceRange: "Budget", address: "Bukit Batok West", lat: 1.3491, lng: 103.7497, source: "danielfooddiary.com" },
  { line: "Red", code: "NS2", name: "Shi Mei Chicken Rice", cuisine: "Chinese", price: "$3", priceRange: "Budget", address: "Bukit Batok Central", lat: 1.3491, lng: 103.7497, source: "hungrygowhere.com" },
  { line: "Red", code: "NS2", name: "Bei Jia BCM", cuisine: "Chinese", price: "$3", priceRange: "Budget", address: "Bukit Batok Central", lat: 1.3491, lng: 103.7497, source: "eatbook.sg" },
  { line: "Red", code: "NS2", name: "Laifaba", cuisine: "Chinese", price: "$6-8", priceRange: "Budget", address: "Bukit Batok West", lat: 1.3491, lng: 103.7497, source: "sethlui.com" },
  { line: "Red", code: "NS2", name: "Qiu Ji Carrot Cake", cuisine: "Chinese", price: "$2.50-4", priceRange: "Budget", address: "Bukit Batok Central", lat: 1.3491, lng: 103.7497, source: "hungrygowhere.com" },
  { line: "Red", code: "NS2", name: "Jue Yan Lor Mee", cuisine: "Chinese", price: "$5.50-8", priceRange: "Budget", address: "469 Bukit Batok West Ave 9", lat: 1.3491, lng: 103.7497, source: "sethlui.com" },
  { line: "Red", code: "NS2", name: "Eng Kee Chicken Wings", cuisine: "Chinese", price: "$1.50/pc", priceRange: "Budget", address: "469 Bukit Batok West Ave 9", lat: 1.3491, lng: 103.7497, source: "eatbook.sg" },
  { line: "Red", code: "NS2", name: "Petit Saigon", cuisine: "Vietnamese", price: "$4.80-8.80", priceRange: "Budget", address: "469 Bukit Batok West Ave 9", lat: 1.3491, lng: 103.7497, source: "danielfooddiary.com" },
  { line: "Red", code: "NS2", name: "777 Fried Hokkien Prawn Mee", cuisine: "Chinese", price: "$5+", priceRange: "Budget", address: "469 Bukit Batok West Ave 9", lat: 1.3491, lng: 103.7497, source: "hungrygowhere.com" },
  { line: "Red", code: "NS2", name: "Mala Master", cuisine: "Chinese", price: "$2.60/100g", priceRange: "Budget", address: "469 Bukit Batok West Ave 9", lat: 1.3491, lng: 103.7497, source: "tiktok.com" },
];

// Parse price to get low/high values
function parsePrice(priceStr: string): { low: number; high: number } {
  // Remove $ and other symbols
  const clean = priceStr.replace(/\$/g, '').replace(/\+\+/g, '').replace(/\+/g, '');

  // Handle per-piece pricing like "0.50/pc" or "1.30/pc"
  if (clean.includes('/')) {
    const num = parseFloat(clean.split('/')[0]);
    return { low: num, high: num * 10 }; // Assume ~10 pieces for a meal
  }

  // Handle ranges like "3.50-4" or "15-30"
  if (clean.includes('-')) {
    const parts = clean.split('-');
    return {
      low: parseFloat(parts[0]) || 0,
      high: parseFloat(parts[1]) || parseFloat(parts[0]) || 0
    };
  }

  // Single price
  const num = parseFloat(clean) || 0;
  return { low: num, high: num };
}

async function main() {
  console.log('Starting MRT Foodie import...\n');
  console.log(`Processing ${restaurantData.length} restaurants\n`);

  // Get all stations
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, lat, lng');

  if (stationsError || !stations) {
    console.error('Failed to fetch stations:', stationsError);
    return;
  }

  const stationMap = new Map(stations.map(s => [s.id, { lat: s.lat, lng: s.lng }]));
  console.log(`Loaded ${stations.length} stations\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of restaurantData) {
    console.log(`\nProcessing: ${r.name}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .ilike('name', r.name)
      .single();

    if (existing) {
      console.log(`  Skipped: already exists`);
      skipped++;
      continue;
    }

    // Get station ID
    const stationId = stationCodeMapping[r.code];
    if (!stationId) {
      console.log(`  Failed: unknown station code ${r.code}`);
      failed++;
      continue;
    }

    // Get walking distance from station
    const station = stationMap.get(stationId);
    let walkingDistance = 300; // Default
    let walkingTime = 4; // Default ~4 min

    if (station?.lat && station?.lng) {
      try {
        const result = await getWalkingDistance(station.lat, station.lng, r.lat, r.lng);
        if (result.success) {
          walkingDistance = result.distance;
          walkingTime = Math.max(1, result.duration);
          console.log(`  OneMap: ${walkingDistance}m, ${walkingTime} min`);
        } else {
          // Fallback to estimate
          walkingDistance = Math.round(Math.sqrt(Math.pow((r.lat - station.lat) * 111000, 2) + Math.pow((r.lng - station.lng) * 111000 * Math.cos(r.lat * Math.PI / 180), 2)));
          walkingTime = Math.max(1, Math.round(walkingDistance / 80));
          console.log(`  Fallback: ${walkingDistance}m, ${walkingTime} min`);
        }
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.log(`  OneMap error, using fallback`);
      }
    }

    // Parse price
    const { low, high } = parsePrice(r.price);
    const priceRange = low === high ? `$${low}` : `$${low} - $${high}`;

    // Get tags
    const tags = cuisineToTags[r.cuisine] || [r.cuisine];
    if (r.priceRange === 'Budget') tags.push('Budget');
    if (r.priceRange === 'Mid-range') tags.push('Mid-range');

    // Get source
    const sourceId = sourceMapping[r.source] || 'editors-choice';

    // Prepare listing
    const listing = {
      name: r.name,
      description: `${r.cuisine} food at ${r.address}`,
      address: r.address,
      station_id: stationId,
      lat: r.lat,
      lng: r.lng,
      source_id: sourceId,
      tags,
      distance_to_station: walkingDistance,
      walking_time: walkingTime,
      is_active: true,
      landmark: r.address,
    };

    // Insert
    const { data: inserted, error: insertError } = await supabase
      .from('food_listings')
      .insert(listing)
      .select('id')
      .single();

    if (insertError) {
      console.log(`  Insert failed: ${insertError.message}`);
      failed++;
      continue;
    }

    // Add price to listing_prices table
    if (inserted && low > 0) {
      await supabase
        .from('listing_prices')
        .insert({
          listing_id: inserted.id,
          item_name: 'Price Range',
          price: low,
          description: priceRange,
          is_signature: true,
          sort_order: 0
        });
    }

    console.log(`  OK: ${r.name} -> ${stationId} (${priceRange})`);
    imported++;
  }

  console.log('\n' + '='.repeat(50));
  console.log('Import Summary:');
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

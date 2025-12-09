import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Missing stations with their coordinates (lat, lng)
const missingStations: { id: string; name: string; lat: number; lng: number }[] = [
  // North-East Line (NE)
  { id: 'potong-pasir', name: 'Potong Pasir', lat: 1.3313, lng: 103.8691 },
  { id: 'woodleigh', name: 'Woodleigh', lat: 1.3392, lng: 103.8705 },
  { id: 'kovan', name: 'Kovan', lat: 1.3601, lng: 103.8851 },
  { id: 'hougang', name: 'Hougang', lat: 1.3712, lng: 103.8925 },
  { id: 'buangkok', name: 'Buangkok', lat: 1.3831, lng: 103.8929 },

  // Circle Line (CC)
  { id: 'stadium', name: 'Stadium', lat: 1.3029, lng: 103.8753 },
  { id: 'mountbatten', name: 'Mountbatten', lat: 1.3064, lng: 103.8825 },
  { id: 'tai-seng', name: 'Tai Seng', lat: 1.3359, lng: 103.8879 },
  { id: 'bartley', name: 'Bartley', lat: 1.3428, lng: 103.8799 },
  { id: 'lorong-chuan', name: 'Lorong Chuan', lat: 1.3519, lng: 103.8641 },
  { id: 'marymount', name: 'Marymount', lat: 1.3493, lng: 103.8393 },
  { id: 'caldecott', name: 'Caldecott', lat: 1.3374, lng: 103.8396 },
  { id: 'holland-village', name: 'Holland Village', lat: 1.3112, lng: 103.7961 },
  { id: 'one-north', name: 'one-north', lat: 1.2994, lng: 103.7874 },
  { id: 'kent-ridge', name: 'Kent Ridge', lat: 1.2935, lng: 103.7847 },
  { id: 'haw-par-villa', name: 'Haw Par Villa', lat: 1.2826, lng: 103.7819 },
  { id: 'pasir-panjang', name: 'Pasir Panjang', lat: 1.2762, lng: 103.7919 },
  { id: 'labrador-park', name: 'Labrador Park', lat: 1.2721, lng: 103.8026 },
  { id: 'telok-blangah', name: 'Telok Blangah', lat: 1.2707, lng: 103.8099 },

  // Downtown Line (DT)
  { id: 'bukit-panjang', name: 'Bukit Panjang', lat: 1.3784, lng: 103.7619 },
  { id: 'cashew', name: 'Cashew', lat: 1.3690, lng: 103.7644 },
  { id: 'hillview', name: 'Hillview', lat: 1.3624, lng: 103.7673 },
  { id: 'beauty-world', name: 'Beauty World', lat: 1.3415, lng: 103.7760 },
  { id: 'king-albert-park', name: 'King Albert Park', lat: 1.3355, lng: 103.7833 },
  { id: 'sixth-avenue', name: 'Sixth Avenue', lat: 1.3307, lng: 103.7971 },
  { id: 'tan-kah-kee', name: 'Tan Kah Kee', lat: 1.3259, lng: 103.8074 },
  { id: 'downtown', name: 'Downtown', lat: 1.2794, lng: 103.8528 },
  { id: 'bencoolen', name: 'Bencoolen', lat: 1.2984, lng: 103.8501 },
  { id: 'ubi', name: 'Ubi', lat: 1.3299, lng: 103.9001 },
  { id: 'kaki-bukit', name: 'Kaki Bukit', lat: 1.3349, lng: 103.9082 },
  { id: 'bedok-north', name: 'Bedok North', lat: 1.3346, lng: 103.9180 },
  { id: 'bedok-reservoir', name: 'Bedok Reservoir', lat: 1.3368, lng: 103.9323 },
  { id: 'tampines-west', name: 'Tampines West', lat: 1.3455, lng: 103.9385 },
  { id: 'tampines-east', name: 'Tampines East', lat: 1.3564, lng: 103.9545 },
  { id: 'upper-changi', name: 'Upper Changi', lat: 1.3416, lng: 103.9614 },

  // Thomson-East Coast Line (TE)
  { id: 'woodlands-north', name: 'Woodlands North', lat: 1.4488, lng: 103.7852 },
  { id: 'woodlands-south', name: 'Woodlands South', lat: 1.4270, lng: 103.7929 },
  { id: 'springleaf', name: 'Springleaf', lat: 1.3973, lng: 103.8189 },
  { id: 'lentor', name: 'Lentor', lat: 1.3846, lng: 103.8363 },
  { id: 'mayflower', name: 'Mayflower', lat: 1.3717, lng: 103.8384 },
  { id: 'bright-hill', name: 'Bright Hill', lat: 1.3634, lng: 103.8333 },
  { id: 'upper-thomson', name: 'Upper Thomson', lat: 1.3548, lng: 103.8328 },
  { id: 'mount-pleasant', name: 'Mount Pleasant', lat: 1.3275, lng: 103.8350 },
  { id: 'shenton-way', name: 'Shenton Way', lat: 1.2763, lng: 103.8469 },
  { id: 'gardens-by-the-bay', name: 'Gardens by the Bay', lat: 1.2796, lng: 103.8694 },
  { id: 'tanjong-rhu', name: 'Tanjong Rhu', lat: 1.2936, lng: 103.8733 },
  { id: 'katong-park', name: 'Katong Park', lat: 1.2974, lng: 103.8850 },
  { id: 'tanjong-katong', name: 'Tanjong Katong', lat: 1.3055, lng: 103.8944 },
  { id: 'marine-terrace', name: 'Marine Terrace', lat: 1.3068, lng: 103.9136 },
  { id: 'siglap', name: 'Siglap', lat: 1.3088, lng: 103.9282 },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

async function main() {
  console.log('='.repeat(60));
  console.log('  MRT STATION & FOOD LISTING UPDATE SCRIPT');
  console.log('='.repeat(60));

  // ============================================
  // PHASE 1: Add missing stations
  // ============================================
  console.log('\n📍 PHASE 1: Adding Missing MRT Stations\n');

  let stationsAdded = 0;
  let stationsSkipped = 0;
  const totalStations = missingStations.length;

  for (let i = 0; i < missingStations.length; i++) {
    const station = missingStations[i];
    const progress = `[${i + 1}/${totalStations}]`;

    // Check if station already exists
    const { data: existing } = await supabase
      .from('stations')
      .select('id')
      .eq('id', station.id)
      .single();

    if (existing) {
      console.log(`${progress} ⏭️  ${station.name} - already exists`);
      stationsSkipped++;
      continue;
    }

    // Insert the station
    const { error } = await supabase
      .from('stations')
      .insert({
        id: station.id,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
      });

    if (error) {
      console.log(`${progress} ❌ ${station.name} - ERROR: ${error.message}`);
    } else {
      console.log(`${progress} ✅ ${station.name} - added (${station.lat}, ${station.lng})`);
      stationsAdded++;
    }

    await sleep(50);
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Phase 1 Complete: ${stationsAdded} added, ${stationsSkipped} skipped`);
  console.log('-'.repeat(60));

  // ============================================
  // PHASE 2: Re-fetch all stations for mapping
  // ============================================
  console.log('\n📍 PHASE 2: Loading all stations for food remapping...\n');

  const { data: allStations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  if (!allStations) {
    console.log('ERROR: Could not fetch stations');
    return;
  }

  console.log(`Loaded ${allStations.length} stations for distance calculations`);

  // ============================================
  // PHASE 3: Update all food listings
  // ============================================
  console.log('\n🍜 PHASE 3: Re-mapping Food Listings to Nearest Stations\n');

  // Get all food listings with coordinates
  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, lat, lng, station_id, distance_to_station, walking_time')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (!allListings) {
    console.log('ERROR: Could not fetch listings');
    return;
  }

  console.log(`Found ${allListings.length} listings with coordinates to check\n`);

  let listingsUpdated = 0;
  let listingsUnchanged = 0;
  const totalListings = allListings.length;
  const updatedListings: { name: string; oldStation: string; newStation: string; newDistance: number }[] = [];

  for (let i = 0; i < allListings.length; i++) {
    const listing = allListings[i];
    const progress = `[${i + 1}/${totalListings}]`;

    if (!listing.lat || !listing.lng) continue;

    // Find nearest station
    let nearestStation: string | null = null;
    let minDistance = Infinity;

    for (const station of allStations) {
      if (!station.lat || !station.lng) continue;
      const distance = calculateDistance(listing.lat, listing.lng, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station.id;
      }
    }

    if (!nearestStation) continue;

    const distanceMeters = Math.round(minDistance * 1000);
    const walkingTime = Math.round((minDistance / 5) * 60); // 5km/h walking speed

    // Check if station changed
    if (listing.station_id === nearestStation &&
        listing.distance_to_station === distanceMeters) {
      listingsUnchanged++;
      continue;
    }

    // Update the listing
    const { error } = await supabase
      .from('food_listings')
      .update({
        station_id: nearestStation,
        distance_to_station: distanceMeters,
        walking_time: walkingTime,
      })
      .eq('id', listing.id);

    if (error) {
      console.log(`${progress} ❌ ${listing.name} - ERROR: ${error.message}`);
    } else {
      const oldStation = listing.station_id || 'none';
      if (oldStation !== nearestStation) {
        console.log(`${progress} ✅ ${listing.name}`);
        console.log(`         ${oldStation} → ${nearestStation} (${distanceMeters}m, ${walkingTime} min walk)`);
        updatedListings.push({
          name: listing.name,
          oldStation: oldStation,
          newStation: nearestStation,
          newDistance: distanceMeters,
        });
      }
      listingsUpdated++;
    }

    // Show progress every 50 items for unchanged ones
    if ((i + 1) % 50 === 0 && listingsUpdated === 0) {
      console.log(`${progress} Processing...`);
    }

    await sleep(20);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));

  console.log('\n📍 STATIONS:');
  console.log(`   • Added: ${stationsAdded}`);
  console.log(`   • Already existed: ${stationsSkipped}`);
  console.log(`   • Total now: ${allStations.length}`);

  console.log('\n🍜 FOOD LISTINGS:');
  console.log(`   • Updated (station changed): ${updatedListings.length}`);
  console.log(`   • Distance recalculated: ${listingsUpdated}`);
  console.log(`   • Unchanged: ${listingsUnchanged}`);
  console.log(`   • Total checked: ${totalListings}`);

  if (updatedListings.length > 0) {
    console.log('\n📋 LISTINGS MOVED TO NEW STATIONS:');
    console.log('-'.repeat(60));
    for (const item of updatedListings) {
      console.log(`   • ${item.name}`);
      console.log(`     ${item.oldStation} → ${item.newStation} (${item.newDistance}m)`);
    }
  }

  // Check DING TE LE specifically
  console.log('\n🥟 DING TE LE STATUS:');
  const { data: dingTeLe } = await supabase
    .from('food_listings')
    .select('name, station_id, distance_to_station, walking_time')
    .ilike('name', '%ding te le%');

  if (dingTeLe) {
    for (const d of dingTeLe) {
      console.log(`   • ${d.name}`);
      console.log(`     Station: ${d.station_id}, Distance: ${d.distance_to_station}m, Walk: ${d.walking_time} min`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  COMPLETE!');
  console.log('='.repeat(60));
}

main().catch(console.error);

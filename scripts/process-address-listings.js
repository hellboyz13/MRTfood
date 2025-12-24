const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

let ACCESS_TOKEN = null;

async function getToken() {
  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD
    })
  });
  const data = await response.json();
  if (data.access_token) {
    ACCESS_TOKEN = data.access_token;
    return true;
  }
  return false;
}

async function getWalkingRoute(startLat, startLng, endLat, endLng) {
  const url = 'https://www.onemap.gov.sg/api/public/routingsvc/route?' + new URLSearchParams({
    start: `${startLat},${startLng}`,
    end: `${endLat},${endLng}`,
    routeType: 'walk'
  });

  const response = await fetch(url, {
    headers: { 'Authorization': ACCESS_TOKEN }
  });

  const data = await response.json();

  if (data.status === 0 && data.route_summary) {
    return {
      distance: data.route_summary.total_distance,
      time: Math.round(data.route_summary.total_time / 60)
    };
  }
  return null;
}

async function geocodeAddress(name, address) {
  // Search using name + address
  const query = `${name} ${address} Singapore`;

  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress'
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1
    })
  });

  const data = await searchResponse.json();

  if (data.places && data.places[0] && data.places[0].location) {
    return {
      lat: data.places[0].location.latitude,
      lng: data.places[0].location.longitude,
      foundName: data.places[0].displayName?.text,
      foundAddress: data.places[0].formattedAddress
    };
  }
  return null;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Listings with addresses from CSV
const listings = [
  { id: '9d39ddf5-20ec-4b8a-ad77-13296dfc0c5c', name: 'Noodle Memories', address: 'Upper Cross St, #02-28' },
  { id: '0c44cf9e-273c-451a-8d61-ed1ccb39a975', name: 'JB Ah Meng', address: '534 Geylang Rd, Singapore 389490' },
  { id: '1e1fdc1c-10d3-4cf0-af81-7134f0aecef7', name: 'Loong Fatt Tau Sar Piah', address: '639 Balestier Rd, Singapore 329922' },
  { id: '70b84213-07ac-41de-b07c-ad48b8517a8e', name: 'Mr and Mrs Mohgan Super Crispy Roti Prata', address: '300 Joo Chiat Rd, Singapore 427551' },
  { id: 'f9903574-a671-4e8a-860b-f8ee2416263c', name: 'Ocean Curry Fish Head', address: '92 Lor 4 Toa Payoh, Singapore 310092' },
  { id: 'b927d55f-af4c-442f-93e9-399fda2920d4', name: 'Oyster Boy', address: '505 Beach Rd, Singapore 199583' },
  { id: '79b8fb21-c32a-4bdb-9f72-977d81126b9d', name: 'Pho Hanoi', address: '7 Maxwell Rd, Singapore 069111' },
  { id: 'd6af0e79-c740-442b-8838-20cfdf051287', name: 'Rajarani Thosai', address: '137 Tampines St. 11, Singapore 521137' },
  { id: '1adc83ef-eb5f-4999-8a0a-835ec2f9028b', name: 'Rayyan Waroeng Upnormal', address: '7 Maxwell Rd, Singapore 069111' },
  { id: 'a79aa406-edca-44c1-9328-f391706120d4', name: 'Soi Aroy', address: '91 Pasir Panjang Rd, Singapore 118512' },
  { id: 'c9d07a53-21b2-4fb7-98e4-d88955d8d6fa', name: 'Traditional Haig Road Putu Piring', address: '430 Upper Changi Rd, Singapore 486936' },
  { id: '093aebca-2a6d-4076-9ae0-23de4586ee59', name: 'Unagi Tei', address: '1 Keong Saik Rd, Singapore 089109' },
  { id: 'ee3e082b-7f8b-463f-8338-ac310b1998c4', name: 'Golden Nur', address: '86 Market St, Singapore 048947' },
  { id: '67851625-3085-4aa2-8250-0c9b05bd0005', name: 'Cenzo', address: '81 Club St, Singapore 069449' },
  { id: 'f62bcc3b-5f16-4a0b-bd8e-bfd0953917ad', name: 'Chi Le Mah', address: '505 Beach Rd, Singapore 199583' },
  { id: '5280fc8b-139d-4de7-8337-72bd5345e56d', name: 'Dong Ji Fried Kway Teow', address: '51 Old Airport Rd, Singapore 390051' },
  { id: '16bd6af8-f393-454c-aadd-fe90e9c4e587', name: 'La Porpo', address: 'La Porpo Singapore' },
  { id: '489a6183-1846-48eb-beab-fb5ad6e6bece', name: 'Mr Biryani', address: '11 Chander Rd, Singapore 219529' },
  { id: 'a39c1c58-bf34-4186-8ed4-3d0d46a280ab', name: 'Pepper Bowl', address: '7 Maxwell Rd, Singapore 069111' },
  { id: '03d9236a-1ea3-48fe-ba58-ca34c40dfde2', name: 'Tee Kitchen', address: '505 Beach Rd Golden Mile Food Centre, Singapore 199583' },
  { id: '98b41aea-41a7-4e1e-a820-1134bfbf009e', name: 'Yusoff Haji Jalal Satay Club', address: '121 Pasir Panjang Rd, Singapore 118543' },
  { id: 'cccf48c3-74cb-4b10-b6b0-791e27f9a973', name: 'Yanxi Palace Steamboat', address: '531 Upper Cross St Hong Lim Complex, Singapore 050531' },
  { id: '06f438c1-c832-4090-afb5-1e5dba59cabf', name: 'Generation Coffee Roasters', address: '531A Upper Cross St, Singapore 051531' },
  { id: '5f992391-11e4-4335-a725-c4677eb1de84', name: 'Cat In The Hat Bakery', address: '505 Beach Rd Golden Mile Food Centre, Singapore 199583' },
  { id: 'df6b08b8-1753-4636-9019-1756afdd832d', name: 'Tracy Sarawak Kitchen', address: '90 Lor 25A Geylang, Singapore 388265' },
];

async function main() {
  console.log('=== PROCESSING LISTINGS WITH ADDRESSES ===\n');

  await getToken();

  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationList = stations.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));

  // Find nearest station
  function findNearestStation(lat, lng) {
    let nearest = null;
    let minDist = Infinity;

    for (const station of stationList) {
      const dist = Math.sqrt(Math.pow(lat - station.lat, 2) + Math.pow(lng - station.lng, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    }
    return nearest;
  }

  const results = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`[${i + 1}/${listings.length}] ${listing.name}`);
    console.log(`  Address: ${listing.address}`);

    const geo = await geocodeAddress(listing.name, listing.address);

    if (!geo) {
      console.log(`  ⚠️ FLAGGED: Could not geocode`);
      results.push({ ...listing, status: 'FLAGGED', reason: 'Could not geocode' });
      continue;
    }

    console.log(`  Found: ${geo.foundName}`);
    console.log(`  Google Address: ${geo.foundAddress}`);
    console.log(`  Coords: ${geo.lat}, ${geo.lng}`);

    // Check if Google found name matches
    const nameLower = listing.name.toLowerCase();
    const foundLower = (geo.foundName || '').toLowerCase();
    const nameMatch = foundLower.includes(nameLower.split(' ')[0]) || nameLower.includes(foundLower.split(' ')[0]);

    if (!nameMatch) {
      console.log(`  ⚠️ FLAGGED: Name mismatch - Google found "${geo.foundName}"`);
      results.push({ ...listing, status: 'FLAGGED', reason: `Name mismatch: found "${geo.foundName}"`, lat: geo.lat, lng: geo.lng });
      await delay(200);
      continue;
    }

    // Find nearest station
    const nearestStation = findNearestStation(geo.lat, geo.lng);
    console.log(`  Nearest MRT: ${nearestStation.name}`);

    // Calculate walking distance
    const route = await getWalkingRoute(nearestStation.lat, nearestStation.lng, geo.lat, geo.lng);

    if (!route) {
      console.log(`  ⚠️ FLAGGED: Could not calculate walking distance`);
      results.push({ ...listing, status: 'FLAGGED', reason: 'Could not calculate distance', lat: geo.lat, lng: geo.lng, station: nearestStation.id });
      continue;
    }

    console.log(`  Distance: ${route.distance}m, ${route.time}min`);

    // Update database
    const { error } = await supabase
      .from('food_listings')
      .update({
        lat: geo.lat,
        lng: geo.lng,
        station_id: nearestStation.id,
        distance_to_station: route.distance,
        walking_time: route.time,
        address: listing.address
      })
      .eq('id', listing.id);

    if (error) {
      console.log(`  ✗ DB Error: ${error.message}`);
      results.push({ ...listing, status: 'ERROR', reason: error.message });
    } else {
      console.log(`  ✓ Updated - Station: ${nearestStation.name}`);
      results.push({ ...listing, status: 'OK', station: nearestStation.id, distance: route.distance, time: route.time });
    }

    console.log('');
    await delay(250);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const ok = results.filter(r => r.status === 'OK');
  const flagged = results.filter(r => r.status === 'FLAGGED');
  const errors = results.filter(r => r.status === 'ERROR');

  console.log(`OK: ${ok.length}`);
  console.log(`Flagged: ${flagged.length}`);
  console.log(`Errors: ${errors.length}`);

  if (flagged.length > 0) {
    console.log('\n=== FLAGGED LISTINGS ===');
    flagged.forEach(f => {
      console.log(`- ${f.name}: ${f.reason}`);
    });
  }
}

main().catch(console.error);

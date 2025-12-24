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
  const query = `${name} ${address} Singapore`;

  const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.regularOpeningHours,places.photos'
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
      foundAddress: data.places[0].formattedAddress,
      openingHours: data.places[0].regularOpeningHours,
      photoName: data.places[0].photos?.[0]?.name
    };
  }
  return null;
}

async function downloadAndUploadPhoto(listingId, photoName) {
  if (!photoName) return null;

  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;

    const imageBuffer = await response.arrayBuffer();
    const fileName = `${listingId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-photos')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.log(`    Photo upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.log(`    Photo download error: ${e.message}`);
    return null;
  }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Lines 109-135 from CSV with addresses
const listings = [
  { id: '6d2e0ab0-083c-40b7-a0b0-c4a889f28f53', name: "Cheeky Signature's", address: 'Rochor Canal Rd, #02-17 Sim Lim Square, Singapore 188504' },
  { id: '8def57a3-2240-47b9-a296-526ab9711065', name: 'Pawa Bakery', address: '20 Cecil St, PLUS, #01-02, Singapore 049705' },
  { id: 'b7f93b08-7306-4500-b2d6-266191da4abe', name: 'Lao Dong Bei Shi Kao', address: '24 Mosque St, Singapore 059504' },
  { id: '87064e65-3696-4414-8998-57e6923a429f', name: 'Mad Roaster', address: '7 Maxwell Rd, #02-107 Amoy Street Food Centre, Singapore 069111' },
  { id: '117c2616-fbd0-4176-91e6-40bca2c013d3', name: 'Miznon', address: '6 Stanley St, #01-01, Singapore 068725' },
  { id: 'd29387bc-7020-4c14-817f-d40045a8c7ee', name: 'San Pin Pao Fan', address: '51 Telok Ayer St, #01-18, Singapore 048441' },
  { id: '0d0cdce4-cd51-4696-91c2-2b14215099cd', name: 'SSAK3', address: '231 Bain St, #02-01, Singapore 180231' },
  { id: '48be13af-af45-4b87-a66b-82d7f3310d57', name: 'WellSmoocht', address: '319 Jurong East Street 31, #01-58, Singapore 600319' },
  { id: 'f9032b1d-f5cb-47f5-83d0-f1b4b767ed14', name: 'Hopscotch', address: '45 Malan Rd, Singapore 109455' },
  { id: '3f9133d6-038f-4261-83c5-ad5d60b9548b', name: 'Onalu', address: '60 Stamford Rd, #01-11, Singapore 178900' },
  { id: 'df4c0125-77fd-4f46-bfc4-b3fc6f7759fc', name: 'Peppermint', address: '6 Raffles Blvd, Level 4 PARKROYAL COLLECTION Marina Bay, Singapore 039594' },
  { id: '140e2a23-3177-4a81-b461-526435124125', name: 'Rappu', address: '52 Duxton Rd, Singapore 089516' },
  { id: 'f4ed9fbf-d4f6-4916-aeb0-1e12b983a3ce', name: 'Yi Xuan Handmade Banmian Eating House', address: '35 Circuit Rd, Block 35, Singapore 370035' },
];

// Multi-outlet listings - will be flagged for manual handling
const multiOutlet = [
  { id: '5cc37889-0b48-4c18-a136-00079cbc3704', name: 'Boon Tong Kee', note: 'Multiple outlets' },
  { id: 'c0ee761c-3642-44ac-8ab4-5e43de938de9', name: 'He Jia Huan Ban Mian Mee Hoon Kway', addresses: [
    '75 Lor. 5 Toa Payoh, #01-14, Singapore 310075',
    '85 Redhill Ln, #01-69, Singapore 150085',
    '90 Whampoa Dr, #01-66, Singapore 320090'
  ]},
];

async function main() {
  console.log('=== PROCESSING LISTINGS 109-135 WITH ADDRESSES ===\n');

  await getToken();

  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationList = stations.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));

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
    console.log(`  Coords: ${geo.lat}, ${geo.lng}`);

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

    // Check if listing already has image
    const { data: existing } = await supabase
      .from('food_listings')
      .select('image_url')
      .eq('id', listing.id)
      .single();

    let imageUrl = existing?.image_url;
    if (!imageUrl && geo.photoName) {
      imageUrl = await downloadAndUploadPhoto(listing.id, geo.photoName);
      if (imageUrl) console.log(`  + Photo uploaded`);
    }

    // Update database
    const updates = {
      lat: geo.lat,
      lng: geo.lng,
      station_id: nearestStation.id,
      distance_to_station: route.distance,
      walking_time: route.time,
      address: listing.address
    };

    if (geo.openingHours) {
      updates.opening_hours = geo.openingHours;
      console.log(`  + Opening hours`);
    }

    if (imageUrl && !existing?.image_url) {
      updates.image_url = imageUrl;
    }

    const { error } = await supabase
      .from('food_listings')
      .update(updates)
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

  console.log('\n=== MULTI-OUTLET LISTINGS (Need manual handling) ===');
  multiOutlet.forEach(m => {
    console.log(`- ${m.name}: ${m.note || m.addresses.length + ' outlets'}`);
  });
}

main().catch(console.error);

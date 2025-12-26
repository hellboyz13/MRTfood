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
  ACCESS_TOKEN = data.access_token;
}

async function getWalkingRoute(startLat, startLng, endLat, endLng) {
  const url = 'https://www.onemap.gov.sg/api/public/routingsvc/route?' + new URLSearchParams({
    start: `${startLat},${startLng}`,
    end: `${endLat},${endLng}`,
    routeType: 'walk'
  });
  const response = await fetch(url, { headers: { 'Authorization': ACCESS_TOKEN } });
  const data = await response.json();
  if (data.status === 0 && data.route_summary) {
    return { distance: data.route_summary.total_distance, time: Math.round(data.route_summary.total_time / 60) };
  }
  return null;
}

async function searchPlace(name, stationName) {
  // Convert station-id to readable name
  const areaName = stationName.replace(/-/g, ' ');
  const query = `${name} ${areaName} Singapore`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.regularOpeningHours,places.photos'
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
  });
  const data = await response.json();
  return data.places?.[0];
}

async function downloadAndUploadPhoto(listingId, photoName) {
  if (!photoName) return null;
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;
  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;
    const imageBuffer = await response.arrayBuffer();
    const fileName = `${listingId}.jpg`;
    const { error } = await supabase.storage.from('restaurant-photos').upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from('restaurant-photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) { return null; }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Listings with station_id but no coordinates
const listings = [
  { id: '690ffd13-8e93-4b39-a1cd-55f8d156d0b5', name: 'TopTable', station: 'fort-canning' },
  { id: 'cd8f8b65-26b1-45a2-ab29-fef3f2dc52c1', name: 'One Prawn & Co', station: 'fort-canning' },
  { id: 'f4500efb-2729-4eff-9c09-87ad23e2366d', name: 'Famous Eunos Bak Chor Mee', station: 'eunos' },
  { id: '84cc1456-1495-4625-b930-09afb5148565', name: "Allauddin's Briyani", station: 'little-india' },
  { id: '1f5c7755-2549-4194-9c97-ce27e2e1acf6', name: 'Dim Sum Express', station: 'braddell' },
  { id: 'e5401d9f-d08e-4821-a04b-d153e2300181', name: 'Jade 玉楼', station: 'raffles-place' },
  { id: '7853773c-b14a-4985-9b43-0ec29b91c296', name: 'Dearborn', station: 'fort-canning' },
  { id: '0f266d19-e677-4e3a-891b-431079ffe1d1', name: 'Hjh Maimunah', station: 'bugis' },
  { id: '1828ef9e-b671-46f2-9ca3-213a332fd7f3', name: 'Macpherson Minced Meat Noodles', station: 'potong-pasir' },
  { id: '078a8006-4771-44b0-9eb1-78982a356040', name: 'Humpback', station: 'outram-park' },
  { id: 'a0fb57c3-aaf7-411c-9863-20d2743d2d30', name: "L'eclair Patisserie", station: 'dhoby-ghaut' },
  { id: '11a3ed22-9edc-4c7f-8a60-40b7b09eeed2', name: 'Rasa Istimewa Waterfront Restaurant', station: 'woodlands' },
  { id: 'f583fe33-65ef-487d-9d23-d498997a0c63', name: 'One Fattened Calf', station: 'one-north' },
  { id: '7c5f127b-db61-490a-adfd-01dd04fbacb2', name: 'Summer Pavilion', station: 'promenade' },
  { id: 'f6a503d3-f539-4b56-9767-0455854cfc25', name: 'Shinji By Kanesaka', station: 'orchard' },
  { id: '7dbbc817-c590-4d84-93ed-391853c5504b', name: 'Simon Road Hokkien Mee', station: 'kovan' },
  { id: '79df876d-64dd-4381-a078-021d6258d525', name: 'Huevos', station: 'lavender' },
  { id: '934d7672-3fa9-46ff-b2dd-ce603262da38', name: 'Les Clos', station: 'fort-canning' },
  { id: '953987f3-4816-4522-a65a-e29b2d50030a', name: 'Odem', station: 'fort-canning' },
  { id: 'f270cd7b-2f54-44f7-8247-f823e783d61b', name: 'Keng Eng Kee', station: 'queenstown' },
  { id: '3f7c64f8-d459-406f-8566-8981dc7c41ec', name: 'GU:UM', station: 'outram-park' },
  { id: 'cd08c022-8283-4908-b3dd-1b2e785529ed', name: 'The Masses', station: 'city-hall' },
  { id: '79e89bf4-b9a5-4bb7-b949-d9bf777ff041', name: 'Equate Coffee', station: 'tanjong-pagar' },
  { id: 'e60f9eb8-14f2-45fb-a4cd-a1367e530db2', name: 'FYP Cafe', station: 'dhoby-ghaut' },
  { id: 'c08a3ef9-047a-42f0-af35-702c83ed072d', name: 'Ms Durian', station: 'rochor' },
  { id: 'ed5c6b6e-65ba-43b2-8bce-d80522a56366', name: 'Ah Kow Mushroom Minced Pork Mee', station: 'toa-payoh' },
  { id: '37a46c8e-a779-4199-a187-eebe453e95cc', name: 'Hill Street Tai Hwa Pork Noodle', station: 'lavender' },
  { id: '90298072-9cd0-4eeb-94dd-a05fdabf377c', name: 'Jin Xi Lai (Mui Siong) Minced Meat Noodle', station: 'rochor' },
  { id: '75225a92-b8c3-412a-8c23-e4879875fac4', name: 'Lai Heng Mushroom Minced Meat Noodles', station: 'toa-payoh' },
  { id: '64e97456-0def-4f3b-a07c-64ee1441f2a6', name: 'Seng Kee Mushroom Minced Meat Noodle', station: 'lorong-chuan' },
];

async function main() {
  console.log('=== PROCESSING LISTINGS WITH STATION_ID ===\n');

  await getToken();

  // Get all stations
  const { data: stations } = await supabase.from('stations').select('id, name, lat, lng');

  function findNearestStation(lat, lng) {
    let nearest = null, minDist = Infinity;
    for (const s of stations) {
      const dist = Math.sqrt(Math.pow(lat - s.lat, 2) + Math.pow(lng - s.lng, 2));
      if (dist < minDist) { minDist = dist; nearest = s; }
    }
    return nearest;
  }

  function getStationById(stationId) {
    return stations.find(s => s.id === stationId);
  }

  let success = 0, failed = 0;
  const flagged = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`[${i + 1}/${listings.length}] ${listing.name}`);

    const place = await searchPlace(listing.name, listing.station);

    if (!place || !place.location) {
      console.log('  ✗ Not found on Google');
      flagged.push({ name: listing.name, reason: 'Not found' });
      failed++;
      continue;
    }

    const lat = place.location.latitude;
    const lng = place.location.longitude;
    console.log(`  Found: ${place.displayName?.text}`);
    console.log(`  Address: ${place.formattedAddress}`);

    // Find actual nearest station
    const nearestStation = findNearestStation(lat, lng);

    // Check if found location is reasonably close to expected station
    const expectedStation = getStationById(listing.station);
    const distToExpected = expectedStation ? Math.sqrt(Math.pow(lat - expectedStation.lat, 2) + Math.pow(lng - expectedStation.lng, 2)) : Infinity;

    // If more than ~3km from expected station, flag it
    if (distToExpected > 0.03) { // roughly 3km
      console.log(`  ⚠️ FLAGGED: Found location far from expected station ${listing.station}`);
      flagged.push({ name: listing.name, reason: `Far from ${listing.station}`, foundAt: place.formattedAddress });
      failed++;
      continue;
    }

    // Calculate walking distance from nearest station
    const route = await getWalkingRoute(nearestStation.lat, nearestStation.lng, lat, lng);
    if (!route) {
      console.log('  ✗ Could not calculate route');
      flagged.push({ name: listing.name, reason: 'Route calculation failed' });
      failed++;
      continue;
    }

    console.log(`  Station: ${nearestStation.name} (${route.distance}m, ${route.time}min)`);

    // Check if listing already has image
    const { data: existing } = await supabase.from('food_listings').select('image_url').eq('id', listing.id).single();

    let imageUrl = existing?.image_url;
    if (!imageUrl && place.photos?.[0]?.name) {
      imageUrl = await downloadAndUploadPhoto(listing.id, place.photos[0].name);
      if (imageUrl) console.log('  + Photo uploaded');
    }

    // Update database
    const updates = {
      lat, lng,
      station_id: nearestStation.id,
      distance_to_station: route.distance,
      walking_time: route.time,
      address: place.formattedAddress
    };

    if (place.regularOpeningHours) {
      updates.opening_hours = place.regularOpeningHours;
    }

    if (imageUrl && !existing?.image_url) {
      updates.image_url = imageUrl;
    }

    const { error } = await supabase.from('food_listings').update(updates).eq('id', listing.id);

    if (error) {
      console.log(`  ✗ DB Error: ${error.message}`);
      failed++;
    } else {
      console.log('  ✓ Updated');
      success++;
    }

    console.log('');
    await delay(250);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);

  if (flagged.length > 0) {
    console.log('\n=== FLAGGED ===');
    flagged.forEach(f => console.log(`- ${f.name}: ${f.reason}`));
  }
}

main().catch(console.error);

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

async function fetchPlaceDetails(query) {
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

// Boon Tong Kee outlets (filtered - actual BTK outlets only)
const boonTongKeeOutlets = [
  { name: 'Boon Tong Kee (Balestier)', query: 'Boon Tong Kee Balestier Road Singapore' },
  { name: 'Boon Tong Kee (Whampoa)', query: 'Boon Tong Kee Whampoa Singapore' },
  { name: 'Boon Tong Kee (River Valley)', query: 'Boon Tong Kee River Valley Singapore' },
  { name: 'Boon Tong Kee (Chinatown)', query: 'Boon Tong Kee Smith Street Singapore' },
  { name: 'Boon Tong Kee (Ang Mo Kio)', query: 'Boon Tong Kee Ang Mo Kio Singapore' },
  { name: 'Boon Tong Kee (Bukit Timah)', query: 'Boon Tong Kee Cheong Chin Nam Road Singapore' },
  { name: 'Boon Tong Kee (one-north)', query: 'Boon Tong Kee Happynest one-north Singapore' },
  { name: 'Boon Tong Kee (Sengkang)', query: 'Boon Tong Kee Sengkang Square Singapore' },
];

// He Jia Huan outlets
const heJiaHuanOutlets = [
  { name: 'He Jia Huan Ban Mian (Toa Payoh)', query: 'He Jia Huan Ban Mian Toa Payoh Singapore' },
  { name: 'He Jia Huan Ban Mian (Redhill)', query: 'He Jia Huan Ban Mian Redhill Singapore' },
  { name: 'He Jia Huan Ban Mian (Whampoa)', query: 'He Jia Huan Ban Mian Whampoa Singapore' },
  { name: 'He Jia Huan Ban Mian (Jurong West)', query: 'He Jia Huan Ban Mian Jurong West Singapore' },
];

async function main() {
  console.log('=== CREATING MULTI-OUTLET LISTINGS ===\n');

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

  // Get existing listing IDs to update first one, create rest
  const { data: existingBTK } = await supabase.from('food_listings').select('id').ilike('name', '%Boon Tong Kee%').eq('is_active', true);
  const { data: existingHJH } = await supabase.from('food_listings').select('id').ilike('name', '%He Jia Huan%').eq('is_active', true);

  const btkExistingId = existingBTK?.[0]?.id;
  const hjhExistingId = existingHJH?.[0]?.id;

  console.log('Existing BTK ID:', btkExistingId);
  console.log('Existing HJH ID:', hjhExistingId);

  async function processOutlet(outlet, existingId, isFirst) {
    console.log(`\n${outlet.name}`);

    const place = await fetchPlaceDetails(outlet.query);
    if (!place || !place.location) {
      console.log('  ✗ Not found');
      return null;
    }

    const lat = place.location.latitude;
    const lng = place.location.longitude;
    console.log(`  Found: ${place.formattedAddress}`);

    const station = findNearestStation(lat, lng);
    console.log(`  Nearest MRT: ${station.name}`);

    const route = await getWalkingRoute(station.lat, station.lng, lat, lng);
    if (!route) {
      console.log('  ✗ Could not calculate route');
      return null;
    }
    console.log(`  Distance: ${route.distance}m, ${route.time}min`);

    const listingData = {
      name: outlet.name,
      lat, lng,
      station_id: station.id,
      distance_to_station: route.distance,
      walking_time: route.time,
      address: place.formattedAddress,
      opening_hours: place.regularOpeningHours || null,
      is_active: true,
      tags: ['Chinese']
    };

    let listingId;
    if (isFirst && existingId) {
      // Update existing listing
      const { error } = await supabase.from('food_listings').update(listingData).eq('id', existingId);
      if (error) {
        console.log(`  ✗ Update error: ${error.message}`);
        return null;
      }
      listingId = existingId;
      console.log('  ✓ Updated existing listing');
    } else {
      // Create new listing
      const { data: newListing, error } = await supabase.from('food_listings').insert(listingData).select('id').single();
      if (error) {
        console.log(`  ✗ Insert error: ${error.message}`);
        return null;
      }
      listingId = newListing.id;
      console.log('  ✓ Created new listing');
    }

    // Upload photo
    if (place.photos?.[0]?.name) {
      const imageUrl = await downloadAndUploadPhoto(listingId, place.photos[0].name);
      if (imageUrl) {
        await supabase.from('food_listings').update({ image_url: imageUrl }).eq('id', listingId);
        console.log('  + Photo uploaded');
      }
    }

    return listingId;
  }

  // Process Boon Tong Kee outlets
  console.log('\n=== BOON TONG KEE ===');
  for (let i = 0; i < boonTongKeeOutlets.length; i++) {
    await processOutlet(boonTongKeeOutlets[i], btkExistingId, i === 0);
    await delay(300);
  }

  // Process He Jia Huan outlets
  console.log('\n=== HE JIA HUAN BAN MIAN ===');
  for (let i = 0; i < heJiaHuanOutlets.length; i++) {
    await processOutlet(heJiaHuanOutlets[i], hjhExistingId, i === 0);
    await delay(300);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);

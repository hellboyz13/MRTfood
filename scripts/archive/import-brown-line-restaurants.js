const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// OneMap API for walking distance
async function getWalkingDistance(startLat, startLng, endLat, endLng) {
  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=walk`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse the Brown Line CSV
function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header
  const restaurants = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    if (fields.length < 15) continue;

    // id,name,address,rating,source_id,tags,is_active,lat,lng,food_tags,instagram_url,is_24h,landmark,price_low,price_high
    const [id, name, address, rating, source_id, tags, is_active, lat, lng, food_tags, instagram_url, is_24h, landmark, price_low, price_high] = fields;

    if (!name || !lat || !lng) continue;

    // Parse tags JSON array
    let parsedTags = [];
    try {
      if (tags) {
        parsedTags = JSON.parse(tags.replace(/""/g, '"'));
      }
    } catch (e) {
      // If parsing fails, try to extract tags manually
      const tagMatch = tags.match(/\["(.+)"\]/);
      if (tagMatch) {
        parsedTags = tagMatch[1].split('", "').map(t => t.replace(/"/g, ''));
      }
    }

    restaurants.push({
      name: name.trim(),
      address: address.trim(),
      rating: parseFloat(rating) || null,
      source_id: source_id.trim(),
      tags: parsedTags,
      is_active: is_active === 'true',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      instagram_url: instagram_url.trim() || null,
      is_24h: is_24h === 'true',
      landmark: landmark.trim() || null,
      price_low: parseFloat(price_low) || null,
      price_high: parseFloat(price_high) || null
    });
  }

  return restaurants;
}

async function importRestaurants() {
  const csvPath = 'C:/Users/Admin/Downloads/brown_line_food_spots.csv';

  console.log('Reading CSV from:', csvPath);
  const restaurants = parseCSV(csvPath);
  console.log(`Parsed ${restaurants.length} restaurants from CSV`);

  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null);

  if (!stations || stations.length === 0) {
    console.log('No stations found');
    return;
  }

  console.log(`Found ${stations.length} stations`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .eq('name', restaurant.name)
      .single();

    if (existing) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

    // Find nearest station
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const dist = haversineDistance(restaurant.lat, restaurant.lng, station.lat, station.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestStation = station;
      }
    }

    if (!nearestStation || minDistance > 2000) {
      console.log(`No nearby station for: ${restaurant.name}`);
      failed++;
      continue;
    }

    // Get walking distance
    let distanceToStation = Math.round(minDistance);
    let walkingTime = Math.round(minDistance / 80);

    const walkingData = await getWalkingDistance(
      restaurant.lat, restaurant.lng,
      nearestStation.lat, nearestStation.lng
    );

    if (walkingData) {
      distanceToStation = walkingData.distance;
      walkingTime = walkingData.time;
    }

    // Insert listing (source_id set to null since we don't want foreign key issues)
    const { data: newListing, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: restaurant.name,
        station_id: nearestStation.id,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        tags: restaurant.tags,
        source_id: null, // No foreign key reference
        distance_to_station: distanceToStation,
        walking_time: walkingTime,
        rating: restaurant.rating,
        is_24h: restaurant.is_24h
      })
      .select('id')
      .single();

    if (insertError) {
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    // Insert price
    if (restaurant.price_low !== null && restaurant.price_high !== null) {
      const priceDesc = restaurant.price_low === restaurant.price_high
        ? `$${restaurant.price_low}`
        : `$${restaurant.price_low} - $${restaurant.price_high}`;

      await supabase.from('listing_prices').insert({
        listing_id: newListing.id,
        item_name: 'Price Range',
        description: priceDesc,
        price: restaurant.price_low,
        is_signature: true,
        sort_order: 0
      });
    }

    console.log(`Imported: ${restaurant.name} -> ${nearestStation.id} (${walkingTime} min, rating: ${restaurant.rating}, price: $${restaurant.price_low}-$${restaurant.price_high})`);
    imported++;

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n=== IMPORT COMPLETE ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Get new total count
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal listings in database: ${count}`);
}

importRestaurants().catch(console.error);

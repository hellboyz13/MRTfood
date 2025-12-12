/**
 * Import curated restaurants from CSV
 * - Verifies coordinates using OneMap API
 * - Maps to nearest MRT station
 * - Inserts into food_listings table
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { haversineDistance } from '../lib/onemap';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// OneMap API for geocoding
interface OneMapSearchResult {
  results: Array<{
    SEARCHVAL: string;
    LATITUDE: string;
    LONGITUDE: string;
    ADDRESS: string;
    POSTAL: string;
  }>;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Clean the address - remove postal code in brackets and Singapore
    const cleanAddress = address
      .replace(/Singapore\s*\d*/gi, '')
      .replace(/,\s*$/, '')
      .trim();

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  OneMap API error: ${response.status}`);
      return null;
    }

    const data: OneMapSearchResult = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE)
      };
    }

    return null;
  } catch (error) {
    console.log(`  Geocode error: ${error}`);
    return null;
  }
}

interface CsvRestaurant {
  name: string;
  lat: string;
  lng: string;
  rating: string;
  source: string;
  address: string;
  station_id: string;
  description: string;
  tags: string;
  why_recommended: string;
}

interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Source mapping from CSV sources to database source_ids
const sourceMapping: Record<string, string> = {
  'eatbook': 'eatbook',
  'sethlui': 'sethlui',
  'michelin': 'michelin-hawker',
  'honeycombers': 'editors-choice',
  'danielfood': 'danielfooddiary',
  'tatler': 'tatler-2025',
  'smartlocal': 'editors-choice',
  'nani': 'editors-choice',
  'ahboylikeramen': 'editors-choice',
};

// New sources to add if they don't exist
const newSources = [
  { id: 'honeycombers', name: 'Honeycombers', icon: '🐝', bg_color: '#FEF3C7', weight: 35 },
  { id: 'smartlocal', name: 'TheSmartLocal', icon: '📱', bg_color: '#E0F2FE', weight: 30 },
];

async function findNearestStation(lat: number, lng: number, stations: Station[]): Promise<{ station: Station; distance: number } | null> {
  let nearest: Station | null = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;

    const distance = haversineDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  if (nearest) {
    return { station: nearest, distance: minDistance };
  }
  return null;
}

async function main() {
  console.log('🚀 Starting restaurant import...\n');

  // Read CSV file
  const csvPath = path.join('c:\\Users\\Admin\\Downloads', 'new_curated_restaurants_clean.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const restaurants: CsvRestaurant[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📋 Found ${restaurants.length} restaurants in CSV\n`);

  // Get all stations from database
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  if (stationsError || !stations) {
    console.error('❌ Failed to fetch stations:', stationsError);
    return;
  }

  console.log(`📍 Loaded ${stations.length} stations from database\n`);

  // Add new sources if needed
  for (const source of newSources) {
    const { error } = await supabase
      .from('food_sources')
      .upsert(source, { onConflict: 'id' });

    if (error) {
      console.log(`⚠️ Could not add source ${source.id}: ${error.message}`);
    }
  }

  // Process each restaurant
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    console.log(`\n📍 Processing: ${restaurant.name}`);

    // Check if already exists by name (case insensitive)
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', restaurant.name)
      .single();

    if (existing) {
      console.log(`  ⏭️ Already exists: ${existing.name}`);
      skipped++;
      continue;
    }

    // Parse coordinates from CSV
    let lat = parseFloat(restaurant.lat);
    let lng = parseFloat(restaurant.lng);

    // If coordinates look wrong (outside Singapore), try geocoding
    const isInSingapore = lat >= 1.2 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1;

    if (!isInSingapore && restaurant.address) {
      console.log(`  🔍 Geocoding address: ${restaurant.address.substring(0, 50)}...`);
      const geocoded = await geocodeAddress(restaurant.address);

      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        console.log(`  ✅ Geocoded: ${lat}, ${lng}`);
      } else {
        console.log(`  ⚠️ Geocoding failed, using CSV coordinates`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Find nearest station
    let stationId = restaurant.station_id;
    let distanceToStation = 0;
    let walkingTime = 0;

    const nearestResult = await findNearestStation(lat, lng, stations);

    if (nearestResult) {
      // If CSV station doesn't match nearest, use nearest
      if (nearestResult.station.id !== stationId) {
        console.log(`  📍 CSV station: ${stationId}, Nearest: ${nearestResult.station.id} (${Math.round(nearestResult.distance)}m)`);

        // Use nearest station if distance is reasonable (< 2km)
        if (nearestResult.distance < 2000) {
          stationId = nearestResult.station.id;
        }
      }

      distanceToStation = Math.round(nearestResult.distance);
      walkingTime = Math.max(1, Math.round(distanceToStation / 80)); // ~80m per minute walking, minimum 1 min

      console.log(`  📏 Distance to ${stationId}: ${distanceToStation}m (~${walkingTime} min walk)`);
    }

    // Parse tags
    let tags: string[] = [];
    try {
      // Tags in CSV are like ["Korean","Noodles","Michelin"]
      tags = JSON.parse(restaurant.tags.replace(/"/g, '"'));
    } catch {
      // If parsing fails, split by comma
      tags = restaurant.tags.split(',').map(t => t.trim().replace(/[\[\]"]/g, ''));
    }

    // Map source
    const sourceId = sourceMapping[restaurant.source.toLowerCase()] || 'editors-choice';

    // Prepare listing data
    const listing = {
      name: restaurant.name,
      description: restaurant.description || restaurant.why_recommended || null,
      address: restaurant.address || null,
      station_id: stationId,
      lat,
      lng,
      rating: restaurant.rating ? parseFloat(restaurant.rating) : null,
      source_id: sourceId,
      tags,
      distance_to_station: distanceToStation,
      walking_time: walkingTime,
      is_active: true,
      is_24h: tags.some(t => t.toLowerCase().includes('24-hour') || t.toLowerCase().includes('supper')),
    };

    // Insert into database
    const { error: insertError } = await supabase
      .from('food_listings')
      .insert(listing);

    if (insertError) {
      console.log(`  ❌ Insert failed: ${insertError.message}`);
      failed++;
    } else {
      console.log(`  ✅ Imported successfully`);
      imported++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Import Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️ Skipped (already exists): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

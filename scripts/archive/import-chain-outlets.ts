/**
 * Script to import chain restaurant outlets from Google Places API
 *
 * Usage:
 * 1. Set GOOGLE_PLACES_API_KEY in .env.local
 * 2. Run the database migration first: database_migrations/add_chain_restaurants.sql
 * 3. Run this script: npx ts-node scripts/import-chain-outlets.ts
 *
 * This will:
 * - Fetch all outlets for each chain brand in Singapore
 * - Calculate nearest MRT station and walking distance
 * - Insert outlets into chain_outlets table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!GOOGLE_PLACES_API_KEY) {
  console.error('Error: GOOGLE_PLACES_API_KEY is not set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Chain brands to search for (matching the database)
const CHAIN_BRANDS = [
  // Fast Food
  { id: 'mcdonalds', name: "McDonald's", category: 'fast-food' },
  { id: 'kfc', name: 'KFC', category: 'fast-food' },
  { id: 'subway', name: 'Subway', category: 'fast-food' },
  { id: 'jollibee', name: 'Jollibee', category: 'fast-food' },
  { id: 'burger-king', name: 'Burger King', category: 'fast-food' },

  // Chinese
  { id: 'din-tai-fung', name: 'Din Tai Fung', category: 'chinese' },
  { id: 'tim-ho-wan', name: 'Tim Ho Wan', category: 'chinese' },
  { id: 'crystal-jade', name: 'Crystal Jade', category: 'chinese' },
  { id: 'putien', name: 'Putien', category: 'chinese' },
  { id: 'xiang-xiang', name: 'Xiang Xiang Hunan Cuisine', category: 'chinese' },

  // Hotpot
  { id: 'haidilao', name: 'Haidilao', category: 'hotpot' },
  { id: 'beauty-in-the-pot', name: 'Beauty in the Pot', category: 'hotpot' },
  { id: 'suki-ya', name: 'Suki-Ya', category: 'hotpot' },
  { id: 'seoul-garden', name: 'Seoul Garden', category: 'hotpot' },

  // Bubble Tea
  { id: 'koi', name: 'KOI', category: 'bubble-tea' },
  { id: 'liho', name: 'LiHO', category: 'bubble-tea' },
  { id: 'gong-cha', name: 'Gong Cha', category: 'bubble-tea' },
  { id: 'tiger-sugar', name: 'Tiger Sugar', category: 'bubble-tea' },
  { id: 'chicha-san-chen', name: 'Chicha San Chen', category: 'bubble-tea' },
  { id: 'the-alley', name: 'The Alley', category: 'bubble-tea' },
  { id: 'each-a-cup', name: 'Each A Cup', category: 'bubble-tea' },

  // Local
  { id: 'ya-kun', name: 'Ya Kun Kaya Toast', category: 'local' },
  { id: 'toast-box', name: 'Toast Box', category: 'local' },
  { id: 'old-chang-kee', name: 'Old Chang Kee', category: 'local' },
  { id: 'mr-bean', name: 'Mr Bean', category: 'local' },
  { id: '4fingers', name: '4Fingers', category: 'local' },

  // Japanese
  { id: 'pepper-lunch', name: 'Pepper Lunch', category: 'japanese' },
  { id: 'genki-sushi', name: 'Genki Sushi', category: 'japanese' },
  { id: 'sushi-express', name: 'Sushi Express', category: 'japanese' },
  { id: 'ajisen-ramen', name: 'Ajisen Ramen', category: 'japanese' },
];

interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Find nearest station to a given lat/lng
function findNearestStation(lat: number, lng: number, stations: Station[]): {
  stationId: string;
  distance: number;
  walkTime: number;
} {
  let minDistance = Infinity;
  let nearestStation = stations[0];

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;
    const distance = calculateDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station;
    }
  }

  // Calculate walk time (assuming 80m/min walking speed)
  const walkTime = Math.ceil(minDistance / 80);

  return {
    stationId: nearestStation.id,
    distance: Math.round(minDistance),
    walkTime,
  };
}

// Fetch all MRT stations from database
async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (error) {
    console.error('Error fetching stations:', error);
    return [];
  }

  return data as Station[];
}

// Search for chain outlets using Google Places API
async function searchChainOutlets(brandName: string): Promise<any[]> {
  const query = `${brandName} in Singapore`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`API error for ${brandName}:`, data.status, data.error_message);
      return [];
    }

    return data.results || [];
  } catch (error) {
    console.error(`Error fetching ${brandName}:`, error);
    return [];
  }
}

// Main import function
async function importChainOutlets() {
  console.log('Starting chain outlets import...\n');

  // Fetch all stations
  const stations = await getStations();
  console.log(`Loaded ${stations.length} MRT stations\n`);

  let totalOutlets = 0;

  for (const brand of CHAIN_BRANDS) {
    console.log(`\nSearching for ${brand.name}...`);

    // Search Google Places
    const places = await searchChainOutlets(brand.name);
    console.log(`  Found ${places.length} results`);

    if (places.length === 0) continue;

    // Process each place
    for (const place of places) {
      const lat = place.geometry?.location?.lat;
      const lng = place.geometry?.location?.lng;

      if (!lat || !lng) continue;

      // Find nearest station
      const { stationId, distance, walkTime } = findNearestStation(lat, lng, stations);

      // Prepare outlet data
      const outlet = {
        id: `${brand.id}-${place.place_id}`,
        brand_id: brand.id,
        name: place.name,
        address: place.formatted_address || null,
        latitude: lat,
        longitude: lng,
        nearest_station_id: stationId,
        distance_to_station: distance,
        walk_time: walkTime,
        google_place_id: place.place_id,
        rating: place.rating || null,
        is_active: true,
      };

      // Insert into database
      const { error } = await supabase
        .from('chain_outlets')
        .upsert(outlet, { onConflict: 'google_place_id' });

      if (error) {
        console.error(`  Error inserting ${outlet.name}:`, error.message);
      } else {
        totalOutlets++;
        console.log(`  ✓ ${outlet.name} (${distance}m from ${stationId})`);
      }
    }

    // Rate limiting - wait 200ms between brands
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Import complete! Added ${totalOutlets} chain outlets.`);
}

// Run the import
importChainOutlets().catch(console.error);

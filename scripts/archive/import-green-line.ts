/**
 * Import Green Line restaurants from CSV with OneMap walking distances
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { getWalkingDistance } from '../lib/onemap';

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Source mapping
const sourceMapping: Record<string, string> = {
  "editor's choice": 'editors-choice',
  'eatbook': 'eatbook',
  'seth lui': 'sethlui',
  'michelin hawker': 'michelin-hawker',
  'time out singapore 2025': 'timeout-2025',
  'honeycombers': 'editors-choice',
  'danielfooddiary': 'danielfooddiary',
};

async function main() {
  console.log('🚀 Starting Green Line restaurant import...\n');

  // Read CSV file
  const csvPath = path.join('c:\\Users\\Admin\\Downloads', 'green_line_food_research (1).csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const restaurants = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📋 Found ${restaurants.length} restaurants in CSV\n`);

  // Get all stations from database
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, lat, lng');

  if (stationsError || !stations) {
    console.error('❌ Failed to fetch stations:', stationsError);
    return;
  }

  const stationMap = new Map(stations.map(s => [s.id, { lat: s.lat, lng: s.lng }]));
  console.log(`📍 Loaded ${stations.length} stations\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of restaurants) {
    const name = r.name?.trim();
    if (!name) continue;

    console.log(`\n📍 Processing: ${name}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .ilike('name', name)
      .single();

    if (existing) {
      console.log(`  ⏭️ Already exists`);
      skipped++;
      continue;
    }

    // Parse coordinates
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lng);
    const stationId = r.station_id?.trim();

    if (!stationId || isNaN(lat) || isNaN(lng)) {
      console.log(`  ❌ Missing coordinates or station`);
      failed++;
      continue;
    }

    // Get walking distance from OneMap
    const station = stationMap.get(stationId);
    let walkingDistance = parseInt(r.distance_to_station) || 500;
    let walkingTime = Math.max(1, Math.round(parseInt(r.walking_time) / 60)) || Math.max(1, Math.round(walkingDistance / 80));

    if (station?.lat && station?.lng) {
      try {
        const result = await getWalkingDistance(station.lat, station.lng, lat, lng);
        if (result.success) {
          walkingDistance = result.distance;
          walkingTime = Math.max(1, result.duration);
          console.log(`  ✅ OneMap: ${walkingDistance}m, ${walkingTime} min`);
        } else {
          console.log(`  ⚠️ Fallback: ${walkingDistance}m, ${walkingTime} min`);
        }
        // Rate limit - 200ms between calls
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.log(`  ⚠️ OneMap error, using fallback`);
      }
    }

    // Parse tags
    let tags: string[] = [];
    try {
      tags = JSON.parse(r.tags?.replace(/"/g, '"') || '[]');
    } catch {
      tags = [];
    }

    // Map source
    const sourceId = sourceMapping[r.source_id?.toLowerCase()] || 'editors-choice';

    // Check for 24h/supper
    const is24h = r.is_24h === 'true' || tags.some(t => t.toLowerCase().includes('supper'));

    // Prepare listing
    const listing = {
      name,
      description: r.description || null,
      address: r.address || null,
      station_id: stationId,
      lat,
      lng,
      rating: r.rating ? parseFloat(r.rating) : null,
      source_id: sourceId,
      tags,
      distance_to_station: walkingDistance,
      walking_time: walkingTime,
      is_active: true,
      is_24h: is24h,
      landmark: r.landmark || null,
    };

    // Insert
    const { error: insertError } = await supabase
      .from('food_listings')
      .insert(listing);

    if (insertError) {
      console.log(`  ❌ Insert failed: ${insertError.message}`);
      failed++;
    } else {
      console.log(`  ✅ Imported: ${name}`);
      imported++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Import Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️ Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

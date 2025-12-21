/**
 * Import food recommendations from CSV to database
 * - Geocodes each restaurant using OneMap API
 * - Finds nearest MRT station
 * - Calculates walking distance
 * - Reuses thumbnails and opening hours from existing entries
 * - Skips duplicates
 */

const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ONEMAP_API_KEY = process.env.ONEMAP_API_KEY;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cache stations
let stationsCache = null;

async function getStations() {
  if (stationsCache) return stationsCache;
  const { data } = await supabase.from('stations').select('id, name, lat, lng');
  stationsCache = data || [];
  return stationsCache;
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find nearest MRT station
 */
async function findNearestStation(lat, lng) {
  if (!lat || !lng) return null;
  const stations = await getStations();

  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;
    const distance = getDistanceMeters(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...station, distance: Math.round(distance) };
    }
  }

  return nearest;
}

/**
 * Get walking distance using OneMap Routing API
 */
async function getWalkingDistance(fromLat, fromLng, toLat, toLng) {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;
    const response = await fetch(url, {
      headers: { 'Authorization': ONEMAP_API_KEY }
    });
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
  } catch (error) {
    // Fall through to estimation
  }

  // Fallback: estimate from straight-line distance
  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return {
    distance: Math.round(straightLine * 1.3),
    time: Math.round((straightLine * 1.3) / 80)
  };
}

/**
 * Geocode an address using OneMap API
 */
async function geocodeAddress(address) {
  if (!address || address.length < 5 || address === 'Singapore' || address === 'Multiple outlets') return null;

  try {
    // Extract postal code for better matching
    const postalMatch = address.match(/Singapore\s*(\d{6})/i);
    let searchVal = postalMatch ? postalMatch[1] : address;

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchVal)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE)
      };
    }

    // If postal code didn't work, try with building/street name
    if (postalMatch || searchVal.length > 20) {
      const cleanAddress = address
        .replace(/,?\s*Singapore\s*\d{6}/i, '')
        .replace(/,?\s*Singapore$/i, '')
        .replace(/#[\d-]+/g, '')
        .trim();

      if (cleanAddress.length > 5) {
        const url2 = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
        const response2 = await fetch(url2);
        const data2 = await response2.json();

        if (data2.results && data2.results.length > 0) {
          const result = data2.results[0];
          return {
            lat: parseFloat(result.LATITUDE),
            lng: parseFloat(result.LONGITUDE)
          };
        }
      }
    }
  } catch (error) {
    // Silent fail
  }
  return null;
}

/**
 * Check if restaurant already exists in database
 */
async function findExistingRestaurant(name) {
  const normalizedName = name.toLowerCase().trim();

  let { data } = await supabase
    .from('food_listings')
    .select('id, name, image_url, opening_hours')
    .ilike('name', normalizedName)
    .limit(1);

  if (data && data.length > 0) {
    return data[0];
  }

  return null;
}

/**
 * Look up existing restaurant data to reuse thumbnail and opening hours
 */
async function getExistingDataForReuse(name) {
  const normalizedName = name.toLowerCase().trim();

  // Search for any restaurant with similar name that has image_url or opening_hours
  const { data } = await supabase
    .from('food_listings')
    .select('image_url, opening_hours')
    .ilike('name', `%${normalizedName}%`)
    .limit(1);

  if (data && data.length > 0) {
    return {
      image_url: data[0].image_url || null,
      opening_hours: data[0].opening_hours || null
    };
  }

  return { image_url: null, opening_hours: null };
}

/**
 * Parse CSV content
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const header = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record = {};
    header.forEach((col, idx) => {
      record[col] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

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

/**
 * Convert category string to tags array
 */
function categoryToTags(category) {
  if (!category) return null;

  const tags = [];
  const lower = category.toLowerCase();

  // Type
  if (lower.includes('hawker')) tags.push('Hawker');
  if (lower.includes('restaurant')) tags.push('Restaurant');
  if (lower.includes('cafe') || lower.includes('coffee')) tags.push('Cafe');
  if (lower.includes('bakery')) tags.push('Bakery');
  if (lower.includes('bar')) tags.push('Bar');
  if (lower.includes('buffet')) tags.push('Buffet');

  // Cuisine
  if (lower.includes('japanese') || lower.includes('ramen') || lower.includes('sushi') || lower.includes('unagi')) tags.push('Japanese');
  if (lower.includes('korean') || lower.includes('bbq')) tags.push('Korean');
  if (lower.includes('chinese') || lower.includes('dim sum') || lower.includes('zi char') || lower.includes('cantonese')) tags.push('Chinese');
  if (lower.includes('indian') || lower.includes('biryani') || lower.includes('curry')) tags.push('Indian');
  if (lower.includes('malay') || lower.includes('nasi')) tags.push('Malay');
  if (lower.includes('thai')) tags.push('Thai');
  if (lower.includes('vietnamese') || lower.includes('pho')) tags.push('Vietnamese');
  if (lower.includes('western') || lower.includes('steak') || lower.includes('pizza') || lower.includes('pasta') || lower.includes('italian') || lower.includes('french')) tags.push('Western');
  if (lower.includes('peranakan')) tags.push('Peranakan');
  if (lower.includes('seafood')) tags.push('Seafood');

  // Food type
  if (lower.includes('noodle') || lower.includes('mee') || lower.includes('ban mian')) tags.push('Noodles');
  if (lower.includes('chicken rice')) tags.push('Chicken Rice');
  if (lower.includes('laksa')) tags.push('Laksa');
  if (lower.includes('hokkien')) tags.push('Hokkien Mee');
  if (lower.includes('soup')) tags.push('Soup');
  if (lower.includes('dessert') || lower.includes('ice cream') || lower.includes('pastry')) tags.push('Desserts');

  return tags.length > 0 ? tags : null;
}

/**
 * Map source string to source_id
 * Valid IDs: michelin-hawker, editors-choice, eatbook, ieatishootipost, get-fed,
 *            timeout-2025, hungrygowhere, 8days, supper, danielfooddiary, sethlui,
 *            burpple, honeycombers, foodadvisor, misstamchiak
 */
function getSourceId(source) {
  if (!source) return 'editors-choice';
  const lower = source.toLowerCase();

  if (lower.includes('eatbook')) return 'eatbook';
  if (lower.includes('michelin')) return 'michelin-hawker';
  if (lower.includes('time out')) return 'timeout-2025';
  if (lower.includes('seth lui')) return 'sethlui';
  if (lower.includes('burpple')) return 'burpple';
  if (lower.includes('hungrygowhere')) return 'hungrygowhere';
  if (lower.includes('8 days') || lower.includes('8days')) return '8days';
  if (lower.includes('daniel')) return 'danielfooddiary';
  if (lower.includes('honeycombers')) return 'honeycombers';
  if (lower.includes('miss tam')) return 'misstamchiak';
  if (lower.includes('ieatishootipost')) return 'ieatishootipost';
  // Fallback for sources not in database (asia50best, indulgentism, rubbisheat, chope)
  if (lower.includes('asia') && lower.includes('50')) return 'editors-choice';
  if (lower.includes('rubbish')) return 'editors-choice';
  if (lower.includes('chope')) return 'eatbook';
  if (lower.includes('indulgent')) return 'editors-choice';

  return 'editors-choice';
}

async function main() {
  console.log('=== IMPORT FOOD RECOMMENDATIONS CSV ===\n');

  // Read CSV
  const csvPath = 'food_recommendations_2020_2025.csv';
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const records = parseCSV(content);

  console.log(`Loaded ${records.length} records from CSV\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  let noGeocode = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    if (!r.name || r.name.trim() === '') {
      continue;
    }

    // Check if already exists
    const existing = await findExistingRestaurant(r.name);
    if (existing) {
      skipped++;
      continue;
    }

    // Look for similar restaurants to reuse their thumbnail/hours
    const reuseData = await getExistingDataForReuse(r.name);

    // Geocode
    let lat = null, lng = null;
    if (r.address && r.address.length > 5 && r.address !== 'Singapore' && !r.address.includes('Multiple')) {
      const geo = await geocodeAddress(r.address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      } else {
        noGeocode++;
      }
    }

    // Find nearest station and walking distance
    let stationId = null;
    let distanceToStation = null;
    let walkingTime = null;

    if (lat && lng) {
      const station = await findNearestStation(lat, lng);
      if (station) {
        stationId = station.id;

        const walking = await getWalkingDistance(lat, lng, station.lat, station.lng);
        if (walking) {
          distanceToStation = walking.distance;
          walkingTime = walking.time;
        } else {
          distanceToStation = station.distance;
          walkingTime = Math.round(station.distance / 80);
        }
      }
    }

    // Build tags from category
    const tags = categoryToTags(r.category);

    // Get source_id
    const sourceId = getSourceId(r.source);

    // Build description from notes
    const description = r.notes || null;

    // Insert into database
    const { error } = await supabase
      .from('food_listings')
      .insert({
        name: r.name.trim(),
        address: r.address || null,
        station_id: stationId,
        source_id: sourceId,
        tags: tags,
        is_active: true,
        lat: lat,
        lng: lng,
        distance_to_station: distanceToStation,
        walking_time: walkingTime,
        opening_hours: reuseData.opening_hours || null,
        image_url: reuseData.image_url || null,
        description: description
      })
      .select()
      .single();

    if (error) {
      console.log(`  FAILED: ${r.name} - ${error.message}`);
      failed++;
    } else {
      const reused = [];
      if (reuseData.image_url) reused.push('thumbnail');
      if (reuseData.opening_hours) reused.push('hours');
      const reuseInfo = reused.length > 0 ? ` [reused: ${reused.join(', ')}]` : '';
      console.log(`  INSERTED: ${r.name} -> ${stationId || 'no station'} (${walkingTime || '?'} min walk)${reuseInfo}`);
      inserted++;
    }

    // Progress update
    if ((i + 1) % 50 === 0) {
      console.log(`\n  Progress: ${i + 1}/${records.length} (${inserted} inserted, ${skipped} skipped, ${failed} failed)\n`);
    }

    // Rate limiting
    await sleep(100);
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (exists): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`No geocode: ${noGeocode}`);
}

main().catch(console.error);

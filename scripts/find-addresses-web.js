/**
 * Find addresses for restaurants using web search
 * Searches Google for "restaurant name Singapore address" and extracts postal code
 */

const { chromium } = require('playwright');
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

let stationsCache = null;

async function getStations() {
  if (stationsCache) return stationsCache;
  const { data } = await supabase.from('stations').select('id, name, lat, lng');
  stationsCache = data || [];
  return stationsCache;
}

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

async function getWalkingDistance(fromLat, fromLng, toLat, toLng) {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;
    const response = await fetch(url, { headers: { 'Authorization': ONEMAP_API_KEY } });
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
  } catch (error) {}

  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return { distance: Math.round(straightLine * 1.3), time: Math.round((straightLine * 1.3) / 80) };
}

async function geocodePostal(postal) {
  try {
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postal}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      let addr = '';
      if (r.BLK_NO) addr += r.BLK_NO + ' ';
      if (r.ROAD_NAME) addr += r.ROAD_NAME;
      if (r.BUILDING && r.BUILDING !== 'NIL') addr += ', ' + r.BUILDING;
      addr += ', Singapore ' + postal;

      return {
        lat: parseFloat(r.LATITUDE),
        lng: parseFloat(r.LONGITUDE),
        address: addr.trim()
      };
    }
  } catch (error) {}
  return null;
}

async function findExistingAtStation(name, stationId) {
  const normalizedName = name.toLowerCase().trim()
    .replace(/['']/g, "'")
    .replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '')
    .trim();

  if (stationId) {
    const { data } = await supabase
      .from('food_listings')
      .select('id, name')
      .eq('station_id', stationId)
      .eq('is_active', true);

    if (data) {
      for (const listing of data) {
        const existingName = listing.name.toLowerCase().trim()
          .replace(/['']/g, "'")
          .replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '')
          .trim();

        if (existingName === normalizedName ||
            existingName.includes(normalizedName) ||
            normalizedName.includes(existingName)) {
          return listing;
        }
      }
    }
  }
  return null;
}

async function addListingSource(listingId, sourceId) {
  await supabase
    .from('listing_sources')
    .upsert({ listing_id: listingId, source_id: sourceId }, { onConflict: 'listing_id,source_id' });
}

function inferTags(name, article) {
  const tags = [];
  const lower = (name + ' ' + article).toLowerCase();

  if (lower.includes('chicken rice')) tags.push('Chicken Rice');
  if (lower.includes('nasi lemak')) tags.push('Nasi Lemak');
  if (lower.includes('prata') || lower.includes('roti')) tags.push('Prata');
  if (lower.includes('ban mian')) tags.push('Ban Mian');
  if (lower.includes('wonton') || lower.includes('wanton')) tags.push('Wonton Mee');
  if (lower.includes('char kway teow')) tags.push('Char Kway Teow');
  if (lower.includes('bak chor mee')) tags.push('Bak Chor Mee');
  if (lower.includes('hokkien mee')) tags.push('Hokkien Mee');
  if (lower.includes('laksa')) tags.push('Laksa');
  if (lower.includes('zi char')) tags.push('Zi Char');
  if (lower.includes('roast meat') || lower.includes('char siu')) tags.push('Roast Meat');
  if (lower.includes('dim sum')) tags.push('Dim Sum');
  if (lower.includes('japanese') || lower.includes('ramen')) tags.push('Japanese');
  if (lower.includes('korean') || lower.includes('kbbq')) tags.push('Korean');
  if (lower.includes('thai')) tags.push('Thai');
  if (lower.includes('vietnamese') || lower.includes('pho')) tags.push('Vietnamese');
  if (lower.includes('cafe') || lower.includes('coffee')) tags.push('Cafe');
  if (lower.includes('hawker')) tags.push('Hawker');
  if (lower.includes('michelin') || lower.includes('bib gourmand')) tags.push('Michelin');

  return [...new Set(tags)];
}

// Restaurants to search
const RESTAURANTS = [
  { name: 'Tian Tian Hainanese Chicken Rice', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Boon Tong Kee', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Chin Chin Eating House', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Five Star Hainanese Chicken Rice', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Ah Tai Hainanese Chicken Rice', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Loy Kee Best Chicken Rice', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Sin Kee Famous Cantonese Chicken Rice', source: 'eatbook', article: 'Chicken Rice' },
  { name: 'Ponggol Nasi Lemak', source: 'eatbook', article: 'Nasi Lemak' },
  { name: 'Boon Lay Power Nasi Lemak', source: 'eatbook', article: 'Nasi Lemak' },
  { name: 'Selera Rasa Nasi Lemak', source: 'eatbook', article: 'Nasi Lemak' },
  { name: 'Mizzy Corner Nasi Lemak', source: 'eatbook', article: 'Nasi Lemak' },
  { name: 'Adam Road Nasi Lemak', source: 'eatbook', article: 'Nasi Lemak' },
  { name: 'Mr and Mrs Mohgan Super Crispy Roti Prata', source: 'eatbook', article: 'Prata' },
  { name: 'Casuarina Curry', source: 'eatbook', article: 'Prata' },
  { name: 'The Roti Prata House', source: 'eatbook', article: 'Prata' },
  { name: 'Springleaf Prata Place', source: 'eatbook', article: 'Prata' },
  { name: 'Sin Ming Roti Prata', source: 'eatbook', article: 'Prata' },
  { name: 'Thasevi Food Jalan Kayu Prata', source: 'eatbook', article: 'Prata' },
  { name: 'Kok Kee Wanton Mee', source: 'eatbook', article: 'Wonton Mee' },
  { name: 'Eng Wantan Noodle', source: 'eatbook', article: 'Wonton Mee' },
  { name: 'Fei Fei Wanton Mee', source: 'eatbook', article: 'Wonton Mee' },
  { name: 'Hill Street Char Kway Teow', source: 'eatbook', article: 'Char Kway Teow' },
  { name: 'Outram Park Fried Kway Teow Mee', source: 'eatbook', article: 'Char Kway Teow' },
  { name: 'No 18 Zion Road Fried Kway Teow', source: 'eatbook', article: 'Char Kway Teow' },
  { name: 'Tai Hwa Pork Noodle', source: 'eatbook', article: 'Bak Chor Mee' },
  { name: 'Seng Kee Mushroom Minced Pork Noodle', source: 'eatbook', article: 'Bak Chor Mee' },
  { name: 'Bedok 85 Bak Chor Mee', source: 'eatbook', article: 'Bak Chor Mee' },
  { name: 'Nam Sing Hokkien Fried Mee', source: 'eatbook', article: 'Hokkien Mee' },
  { name: 'Geylang Lor 29 Hokkien Mee', source: 'eatbook', article: 'Hokkien Mee' },
  { name: 'Come Daily Fried Hokkien Prawn Mee', source: 'eatbook', article: 'Hokkien Mee' },
  { name: 'Tiong Bahru Yi Sheng Fried Hokkien Prawn Mee', source: 'eatbook', article: 'Hokkien Mee' },
  { name: 'Swee Guan Hokkien Mee', source: 'eatbook', article: 'Hokkien Mee' },
  { name: '328 Katong Laksa', source: 'eatbook', article: 'Laksa' },
  { name: 'Sungei Road Laksa', source: 'eatbook', article: 'Laksa' },
  { name: 'Janggut Laksa', source: 'eatbook', article: 'Laksa' },
  { name: 'Original Katong Laksa', source: 'eatbook', article: 'Laksa' },
  { name: 'Keng Eng Kee Seafood', source: 'eatbook', article: 'Zi Char' },
  { name: 'JB Ah Meng', source: 'eatbook', article: 'Zi Char' },
  { name: 'Kok Sen Restaurant', source: 'eatbook', article: 'Zi Char' },
  { name: 'Kay Lee Roast Meat Joint', source: 'eatbook', article: 'Roast Meat' },
  { name: 'Roast Paradise', source: 'eatbook', article: 'Roast Meat' },
  { name: 'Fatty Cheong', source: 'eatbook', article: 'Roast Meat' },
  { name: 'Ippudo', source: 'eatbook', article: 'Ramen' },
  { name: 'Santouka Ramen', source: 'eatbook', article: 'Ramen' },
  { name: 'Tsuta', source: 'eatbook', article: 'Ramen' },
  { name: 'Keisuke Tonkotsu King', source: 'eatbook', article: 'Ramen' },
  { name: 'Ramen Nagi', source: 'eatbook', article: 'Ramen' },
  { name: 'Tim Ho Wan', source: 'eatbook', article: 'Dim Sum' },
  { name: 'Din Tai Fung', source: 'eatbook', article: 'Dim Sum' },
  { name: 'Crystal Jade La Mian Xiao Long Bao', source: 'eatbook', article: 'Dim Sum' },
  { name: 'Song Fa Bak Kut Teh', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'A Noodle Story', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Liao Fan Hawker Chan', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Hong Kong Soya Sauce Chicken Rice and Noodle', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'J2 Famous Crispy Curry Puff', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Common Man Coffee Roasters', source: 'eatbook', article: 'Cafe' },
  { name: 'Chye Seng Huat Hardware', source: 'eatbook', article: 'Cafe' },
  { name: 'Plain Vanilla Bakery', source: 'eatbook', article: 'Cafe' },
  { name: 'Burnt Ends', source: 'eatbook', article: 'Steak' },
  { name: 'Wooloomooloo Steakhouse', source: 'eatbook', article: 'Steak' },
  { name: 'Nakhon Kitchen', source: 'eatbook', article: 'Thai' },
  { name: 'Soi Thai Soi Nice', source: 'eatbook', article: 'Thai' },
];

async function searchGoogle(page, name) {
  const query = `${name} Singapore address`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    // Extract postal code from page
    const text = await page.evaluate(() => document.body.innerText);

    // Look for Singapore postal code (6 digits)
    const postalMatch = text.match(/Singapore\s*(\d{6})/i);
    if (postalMatch) {
      return postalMatch[1];
    }

    // Try standalone 6-digit pattern after "Singapore"
    const standAlone = text.match(/Singapore[^0-9]*(\d{6})/i);
    if (standAlone) {
      return standAlone[1];
    }
  } catch (error) {
    console.log(`  Search error: ${error.message}`);
  }

  return null;
}

async function main() {
  console.log('=== FINDING ADDRESSES VIA WEB SEARCH ===\n');
  console.log(`Processing ${RESTAURANTS.length} restaurants...\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const stats = { found: 0, inserted: 0, linked: 0, notFound: 0 };

  for (let i = 0; i < RESTAURANTS.length; i++) {
    const r = RESTAURANTS[i];

    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${RESTAURANTS.length} ---`);
      console.log(`    Found: ${stats.found}, Inserted: ${stats.inserted}, Linked: ${stats.linked}\n`);
    }

    console.log(`🔍 ${r.name}...`);

    // Search Google for postal code
    const postal = await searchGoogle(page, r.name);

    if (!postal) {
      console.log(`   ❓ No postal code found`);
      stats.notFound++;
      await sleep(3000); // Respect rate limits
      continue;
    }

    // Geocode postal code
    const geo = await geocodePostal(postal);
    if (!geo) {
      console.log(`   ⚠️ Could not geocode ${postal}`);
      stats.notFound++;
      await sleep(3000);
      continue;
    }

    stats.found++;

    // Find station
    const station = await findNearestStation(geo.lat, geo.lng);
    if (!station) {
      console.log(`   ⚠️ No nearby station`);
      await sleep(3000);
      continue;
    }

    // Check if exists
    const existing = await findExistingAtStation(r.name, station.id);
    if (existing) {
      await addListingSource(existing.id, r.source);
      console.log(`   🔗 Linked to ${station.name}`);
      stats.linked++;
      await sleep(3000);
      continue;
    }

    // Get walking distance
    const walking = await getWalkingDistance(geo.lat, geo.lng, station.lat, station.lng);
    const walkingTime = walking ? walking.time : Math.round(station.distance / 80);
    const walkingDist = walking ? walking.distance : station.distance;

    // Infer tags
    const tags = inferTags(r.name, r.article);

    // Insert
    const { data: inserted, error } = await supabase
      .from('food_listings')
      .insert({
        name: r.name,
        address: geo.address,
        station_id: station.id,
        tags: tags.length > 0 ? tags : null,
        is_active: true,
        lat: geo.lat,
        lng: geo.lng,
        distance_to_station: walkingDist,
        walking_time: walkingTime
      })
      .select()
      .single();

    if (error) {
      console.log(`   ❌ ${error.message}`);
    } else {
      await addListingSource(inserted.id, r.source);
      console.log(`   ✅ ${station.name} (${walkingTime} min)`);
      stats.inserted++;
    }

    await sleep(3000); // Respect Google rate limits
  }

  await browser.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(50)}`);
  console.log(`Found:     ${stats.found}`);
  console.log(`✅ Inserted: ${stats.inserted}`);
  console.log(`🔗 Linked:   ${stats.linked}`);
  console.log(`❓ Not found: ${stats.notFound}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);

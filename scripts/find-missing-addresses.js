/**
 * Find addresses for restaurants that were skipped due to missing addresses
 * Uses OneMap search API to find addresses by restaurant name
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

// Cache stations
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
    // Fall through
  }

  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return {
    distance: Math.round(straightLine * 1.3),
    time: Math.round((straightLine * 1.3) / 80)
  };
}

/**
 * Search OneMap for a restaurant by name
 */
async function searchOneMap(name) {
  try {
    // Clean name for search
    const searchName = name
      .replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '') // Remove Chinese
      .replace(/['']/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchName)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Find best match - prioritize results that contain the restaurant name
      for (const result of data.results) {
        const building = (result.BUILDING || '').toLowerCase();
        const searchLower = searchName.toLowerCase();

        // Check if result building name matches restaurant name
        if (building.includes(searchLower.split(' ')[0]) ||
            searchLower.includes(building.split(' ')[0])) {
          return {
            lat: parseFloat(result.LATITUDE),
            lng: parseFloat(result.LONGITUDE),
            address: formatAddress(result),
            building: result.BUILDING
          };
        }
      }

      // Return first result if no exact match
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE),
        address: formatAddress(result),
        building: result.BUILDING
      };
    }
  } catch (error) {
    // Silent fail
  }
  return null;
}

function formatAddress(result) {
  let addr = '';
  if (result.BLK_NO) addr += result.BLK_NO + ' ';
  if (result.ROAD_NAME) addr += result.ROAD_NAME;
  if (result.BUILDING && result.BUILDING !== 'NIL') addr += ', ' + result.BUILDING;
  if (result.POSTAL) addr += ', Singapore ' + result.POSTAL;
  return addr.trim();
}

/**
 * Check if restaurant already exists at this station
 */
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

function inferTags(name, articleTitle) {
  const tags = [];
  const lower = (name + ' ' + articleTitle).toLowerCase();

  if (lower.includes('chicken rice')) tags.push('Chicken Rice');
  if (lower.includes('nasi lemak')) tags.push('Nasi Lemak');
  if (lower.includes('prata') || lower.includes('roti')) tags.push('Prata');
  if (lower.includes('ban mian') || lower.includes('ban meen')) tags.push('Ban Mian');
  if (lower.includes('wonton') || lower.includes('wanton')) tags.push('Wonton Mee');
  if (lower.includes('char kway teow') || lower.includes('char kuey teow')) tags.push('Char Kway Teow');
  if (lower.includes('bak chor mee') || lower.includes('minced meat')) tags.push('Bak Chor Mee');
  if (lower.includes('hokkien mee') || lower.includes('hokkien prawn')) tags.push('Hokkien Mee');
  if (lower.includes('laksa')) tags.push('Laksa');
  if (lower.includes('zi char') || lower.includes('tze char')) tags.push('Zi Char');
  if (lower.includes('roast meat') || lower.includes('char siu') || lower.includes('sio bak')) tags.push('Roast Meat');
  if (lower.includes('dim sum') || lower.includes('dimsum')) tags.push('Dim Sum');
  if (lower.includes('japanese') || lower.includes('ramen') || lower.includes('sushi')) tags.push('Japanese');
  if (lower.includes('korean') || lower.includes('kbbq')) tags.push('Korean');
  if (lower.includes('thai')) tags.push('Thai');
  if (lower.includes('vietnamese') || lower.includes('pho')) tags.push('Vietnamese');
  if (lower.includes('hawker') || lower.includes('food centre')) tags.push('Hawker');
  if (lower.includes('cafe') || lower.includes('coffee')) tags.push('Cafe');
  if (lower.includes('omakase')) tags.push('Omakase');
  if (lower.includes('michelin') || lower.includes('bib gourmand')) tags.push('Michelin');

  return [...new Set(tags)];
}

// Restaurants that were skipped - extracted from scraper output
const SKIPPED_RESTAURANTS = [
  // From local dishes articles
  { name: 'Tian Tian Hainanese Chicken Rice', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Boon Tong Kee', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Wee Nam Kee', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Chin Chin Eating House', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Five Star Hainanese Chicken Rice', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Ah Tai Hainanese Chicken Rice', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Loy Kee Best Chicken Rice', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Sin Kee Famous Cantonese Chicken Rice', source: 'eatbook', article: 'Best Chicken Rice' },
  { name: 'Sergeant Hainanese Chicken Rice', source: 'eatbook', article: 'Best Chicken Rice' },

  // Nasi Lemak
  { name: 'Ponggol Nasi Lemak', source: 'eatbook', article: 'Best Nasi Lemak' },
  { name: 'Boon Lay Power Nasi Lemak', source: 'eatbook', article: 'Best Nasi Lemak' },
  { name: 'Selera Rasa Nasi Lemak', source: 'eatbook', article: 'Best Nasi Lemak' },
  { name: 'Mizzy Corner Nasi Lemak', source: 'eatbook', article: 'Best Nasi Lemak' },
  { name: 'Adam Road Nasi Lemak', source: 'eatbook', article: 'Best Nasi Lemak' },
  { name: 'International Nasi Lemak', source: 'eatbook', article: 'Best Nasi Lemak' },

  // Prata
  { name: 'Mr and Mrs Mohgan\'s Super Crispy Roti Prata', source: 'eatbook', article: 'Best Prata' },
  { name: 'Casuarina Curry', source: 'eatbook', article: 'Best Prata' },
  { name: 'The Roti Prata House', source: 'eatbook', article: 'Best Prata' },
  { name: 'Rahmath Cheese Prata', source: 'eatbook', article: 'Best Prata' },
  { name: 'Springleaf Prata Place', source: 'eatbook', article: 'Best Prata' },
  { name: 'Sin Ming Roti Prata', source: 'eatbook', article: 'Best Prata' },
  { name: 'Thasevi Food Famous Jalan Kayu Prata', source: 'eatbook', article: 'Best Prata' },
  { name: 'Prata Wala', source: 'eatbook', article: 'Best Prata' },

  // Ban Mian
  { name: 'Jian Bo Shui Kueh Ban Mian', source: 'eatbook', article: 'Best Ban Mian' },
  { name: 'Shan Dong Da Bao', source: 'eatbook', article: 'Best Ban Mian' },
  { name: 'Ah Hui Big Prawn Noodle Ban Mian', source: 'eatbook', article: 'Best Ban Mian' },
  { name: 'U Mian', source: 'eatbook', article: 'Best Ban Mian' },
  { name: 'Fu Ming Cooked Food', source: 'eatbook', article: 'Best Ban Mian' },

  // Wonton Mee
  { name: 'Kok Kee Wanton Mee', source: 'eatbook', article: 'Best Wonton Mee' },
  { name: 'Eng\'s Wantan Noodle', source: 'eatbook', article: 'Best Wonton Mee' },
  { name: 'Fei Fei Wanton Mee', source: 'eatbook', article: 'Best Wonton Mee' },
  { name: 'Pontian Wanton Noodles', source: 'eatbook', article: 'Best Wonton Mee' },
  { name: 'Joo Chiat Ah Huat Wanton Mee', source: 'eatbook', article: 'Best Wonton Mee' },
  { name: 'Chilli Pan Mee', source: 'eatbook', article: 'Best Wonton Mee' },

  // Char Kway Teow
  { name: 'Hill Street Char Kway Teow', source: 'eatbook', article: 'Best Char Kway Teow' },
  { name: 'Outram Park Fried Kway Teow Mee', source: 'eatbook', article: 'Best Char Kway Teow' },
  { name: 'No. 18 Zion Road Fried Kway Teow', source: 'eatbook', article: 'Best Char Kway Teow' },
  { name: 'Hai Kee Char Kway Teow', source: 'eatbook', article: 'Best Char Kway Teow' },
  { name: 'Meng Kee Char Kway Teow', source: 'eatbook', article: 'Best Char Kway Teow' },

  // Bak Chor Mee
  { name: 'Tai Hwa Pork Noodle', source: 'eatbook', article: 'Best Bak Chor Mee' },
  { name: 'Seng Kee Mushroom Minced Pork Noodle', source: 'eatbook', article: 'Best Bak Chor Mee' },
  { name: 'Tai Wah Pork Noodle', source: 'eatbook', article: 'Best Bak Chor Mee' },
  { name: 'Ah Kow Mushroom Minced Pork Mee', source: 'eatbook', article: 'Best Bak Chor Mee' },
  { name: 'Bedok 85 Bak Chor Mee', source: 'eatbook', article: 'Best Bak Chor Mee' },

  // Hokkien Mee
  { name: 'Nam Sing Hokkien Fried Mee', source: 'eatbook', article: 'Best Hokkien Mee' },
  { name: 'Come Daily Fried Hokkien Prawn Mee', source: 'eatbook', article: 'Best Hokkien Mee' },
  { name: 'Geylang Lor 29 Hokkien Mee', source: 'eatbook', article: 'Best Hokkien Mee' },
  { name: 'Kim Keat Hokkien Mee', source: 'eatbook', article: 'Best Hokkien Mee' },
  { name: 'Tiong Bahru Yi Sheng Fried Hokkien Prawn Mee', source: 'eatbook', article: 'Best Hokkien Mee' },
  { name: 'Swee Guan Hokkien Mee', source: 'eatbook', article: 'Best Hokkien Mee' },

  // Laksa
  { name: '328 Katong Laksa', source: 'eatbook', article: 'Best Laksa' },
  { name: 'Sungei Road Laksa', source: 'eatbook', article: 'Best Laksa' },
  { name: 'Janggut Laksa', source: 'eatbook', article: 'Best Laksa' },
  { name: 'Original Katong Laksa', source: 'eatbook', article: 'Best Laksa' },
  { name: 'Depot Road Zhen Shan Mei Claypot Laksa', source: 'eatbook', article: 'Best Laksa' },

  // Zi Char
  { name: 'Keng Eng Kee Seafood', source: 'eatbook', article: 'Best Zi Char' },
  { name: 'JB Ah Meng', source: 'eatbook', article: 'Best Zi Char' },
  { name: 'Kok Sen Restaurant', source: 'eatbook', article: 'Best Zi Char' },
  { name: 'Tian Tian Fisherman Claypot', source: 'eatbook', article: 'Best Zi Char' },
  { name: 'Ru Yi Yuan', source: 'eatbook', article: 'Best Zi Char' },

  // Roast Meat
  { name: 'Kay Lee Roast Meat Joint', source: 'eatbook', article: 'Best Roast Meat' },
  { name: 'Roast Paradise', source: 'eatbook', article: 'Best Roast Meat' },
  { name: 'Fatty Cheong', source: 'eatbook', article: 'Best Roast Meat' },
  { name: 'New Lucky Claypot Rice', source: 'eatbook', article: 'Best Roast Meat' },
  { name: 'Fo Shou Roasted Delights', source: 'eatbook', article: 'Best Roast Meat' },

  // Japanese
  { name: 'Tampopo', source: 'eatbook', article: 'Best Japanese' },
  { name: 'Ichiban Boshi', source: 'eatbook', article: 'Best Japanese' },
  { name: 'Hokkaido-Ya', source: 'eatbook', article: 'Best Japanese' },
  { name: 'Ippudo', source: 'eatbook', article: 'Best Ramen' },
  { name: 'Santouka Ramen', source: 'eatbook', article: 'Best Ramen' },
  { name: 'Tsuta', source: 'eatbook', article: 'Best Ramen' },
  { name: 'Keisuke Tonkotsu King', source: 'eatbook', article: 'Best Ramen' },
  { name: 'Bari-Uma Ramen', source: 'eatbook', article: 'Best Ramen' },
  { name: 'Ramen Nagi', source: 'eatbook', article: 'Best Ramen' },

  // Korean
  { name: 'Jangsu Korean BBQ', source: 'eatbook', article: 'Best Korean' },
  { name: 'Gyukaku', source: 'eatbook', article: 'Best Korean BBQ' },
  { name: 'Seorae', source: 'eatbook', article: 'Best Korean BBQ' },
  { name: 'Kogane Yama', source: 'eatbook', article: 'Best Korean' },
  { name: 'Wang Dae Bak', source: 'eatbook', article: 'Best Korean' },
  { name: 'Masizzim', source: 'eatbook', article: 'Best Korean' },
  { name: 'Oven & Fried Chicken', source: 'eatbook', article: 'Best Korean' },

  // Thai
  { name: 'Nakhon Kitchen', source: 'eatbook', article: 'Best Thai' },
  { name: 'Soi Thai Soi Nice', source: 'eatbook', article: 'Best Thai' },
  { name: 'Sawadee Thai Cuisine', source: 'eatbook', article: 'Best Thai' },
  { name: 'Porn\'s Sexy Thai Food', source: 'eatbook', article: 'Best Thai' },

  // Vietnamese
  { name: 'Mrs Pho', source: 'eatbook', article: 'Best Vietnamese' },
  { name: 'Long Phung Vietnamese Restaurant', source: 'eatbook', article: 'Best Vietnamese' },
  { name: 'An Choi', source: 'eatbook', article: 'Best Vietnamese' },
  { name: 'So Pho', source: 'eatbook', article: 'Best Vietnamese' },

  // Dim Sum
  { name: 'Tim Ho Wan', source: 'eatbook', article: 'Best Dim Sum' },
  { name: 'Crystal Jade', source: 'eatbook', article: 'Best Dim Sum' },
  { name: 'Din Tai Fung', source: 'eatbook', article: 'Best Dim Sum' },
  { name: 'Mouth Restaurant', source: 'eatbook', article: 'Best Dim Sum' },

  // Cafes
  { name: 'Common Man Coffee Roasters', source: 'eatbook', article: 'Best Cafes' },
  { name: 'Chye Seng Huat Hardware', source: 'eatbook', article: 'Best Cafes' },
  { name: 'Tiong Bahru Bakery', source: 'eatbook', article: 'Best Cafes' },
  { name: 'Symmetry', source: 'eatbook', article: 'Best Cafes' },
  { name: 'Apartment Coffee', source: 'eatbook', article: 'Best Cafes' },
  { name: 'Plain Vanilla', source: 'eatbook', article: 'Best Cafes' },
  { name: 'The Populus', source: 'eatbook', article: 'Best Cafes' },

  // Steak
  { name: 'Burnt Ends', source: 'eatbook', article: 'Best Steak' },
  { name: 'CUT by Wolfgang Puck', source: 'eatbook', article: 'Best Steak' },
  { name: 'Wooloomooloo', source: 'eatbook', article: 'Best Steak' },
  { name: 'Morton\'s The Steakhouse', source: 'eatbook', article: 'Best Steak' },
  { name: 'Bedrock Bar & Grill', source: 'eatbook', article: 'Best Steak' },
  { name: 'Astons Specialties', source: 'eatbook', article: 'Best Steak' },

  // Seth Lui additions
  { name: 'Tong Fong Fatt Hainanese Boneless Chicken Rice', source: 'sethlui', article: 'Best Chicken Rice' },
  { name: 'Heng Heng Chicken Rice', source: 'sethlui', article: 'Best Chicken Rice' },
  { name: 'Katong Keah Kee Duck & Chicken Rice', source: 'sethlui', article: 'Best Chicken Rice' },
  { name: 'Yet Con Restaurant', source: 'sethlui', article: 'Best Chicken Rice' },
  { name: 'Kampong Glam Cafe', source: 'sethlui', article: 'Best Nasi Lemak' },
  { name: 'Village Nasi Lemak Bar', source: 'sethlui', article: 'Best Nasi Lemak' },

  // Michelin Bib Gourmand
  { name: 'A Noodle Story', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Alliance Seafood', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Hua Kee Chicken Rice', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Heng', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'J2 Famous Crispy Curry Puff', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Lao Fu Zi Fried Kway Teow', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'New Rong Liang Ge Cantonese Roast Duck', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Shi Hui Yuan', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Song Fa Bak Kut Teh', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Tai Seng Noodle House', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Hong Kong Soya Sauce Chicken Rice and Noodle', source: 'michelin', article: 'Bib Gourmand' },
  { name: 'Liao Fan Hawker Chan', source: 'michelin', article: 'Bib Gourmand' },
];

async function main() {
  console.log('=== FINDING MISSING ADDRESSES ===\n');
  console.log(`Processing ${SKIPPED_RESTAURANTS.length} restaurants...\n`);

  const stats = {
    found: 0,
    inserted: 0,
    linked: 0,
    notFound: 0,
    existing: 0
  };

  for (let i = 0; i < SKIPPED_RESTAURANTS.length; i++) {
    const r = SKIPPED_RESTAURANTS[i];

    if ((i + 1) % 20 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${SKIPPED_RESTAURANTS.length} ---`);
      console.log(`    Found: ${stats.found}, Inserted: ${stats.inserted}, Linked: ${stats.linked}\n`);
    }

    // Search OneMap for restaurant
    const result = await searchOneMap(r.name);

    if (!result) {
      console.log(`❓ ${r.name} - not found in OneMap`);
      stats.notFound++;
      await sleep(200);
      continue;
    }

    stats.found++;

    // Find nearest station
    const station = await findNearestStation(result.lat, result.lng);
    if (!station) {
      console.log(`⚠️ ${r.name} - no nearby station`);
      await sleep(200);
      continue;
    }

    // Check if already exists at this station
    const existing = await findExistingAtStation(r.name, station.id);
    if (existing) {
      await addListingSource(existing.id, r.source);
      console.log(`🔗 ${r.name} → ${station.name} (linked to ${r.source})`);
      stats.linked++;
      await sleep(150);
      continue;
    }

    // Get walking distance
    const walking = await getWalkingDistance(result.lat, result.lng, station.lat, station.lng);
    const walkingTime = walking ? walking.time : Math.round(station.distance / 80);
    const walkingDist = walking ? walking.distance : station.distance;

    // Infer tags
    const tags = inferTags(r.name, r.article);

    // Insert
    const { data: inserted, error } = await supabase
      .from('food_listings')
      .insert({
        name: r.name,
        address: result.address,
        station_id: station.id,
        tags: tags.length > 0 ? tags : null,
        is_active: true,
        lat: result.lat,
        lng: result.lng,
        distance_to_station: walkingDist,
        walking_time: walkingTime
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Duplicate
        stats.existing++;
        console.log(`⏭️ ${r.name} - already exists`);
      } else {
        console.log(`❌ ${r.name}: ${error.message}`);
      }
    } else {
      await addListingSource(inserted.id, r.source);
      console.log(`✅ ${r.name} → ${station.name} (${walkingTime} min)`);
      stats.inserted++;
    }

    await sleep(200);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(50)}`);
  console.log(`Found in OneMap: ${stats.found}`);
  console.log(`✅ Inserted:     ${stats.inserted}`);
  console.log(`🔗 Linked:       ${stats.linked}`);
  console.log(`❓ Not found:    ${stats.notFound}`);
  console.log(`⏭️  Already exist: ${stats.existing}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);

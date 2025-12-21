/**
 * Add famous hawker stalls with known addresses
 * These are the most iconic Singapore food places with verified addresses
 */

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

async function getWalkingTime(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;
    const response = await fetch(url, { headers: { 'Authorization': ONEMAP_API_KEY } });
    const data = await response.json();
    if (data.route_summary) {
      return { distance: Math.round(data.route_summary.total_distance), time: Math.round(data.route_summary.total_time / 60) };
    }
  } catch (e) {}
  const d = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return { distance: Math.round(d * 1.3), time: Math.round((d * 1.3) / 80) };
}

async function geocodePostal(postal) {
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
    return { lat: parseFloat(r.LATITUDE), lng: parseFloat(r.LONGITUDE), address: addr.trim() };
  }
  return null;
}

async function findExisting(name, stationId) {
  const norm = name.toLowerCase().replace(/['']/g, "'").replace(/[\u4e00-\u9fa5]/g, '').trim();
  const { data } = await supabase.from('food_listings').select('id, name').eq('station_id', stationId).eq('is_active', true);
  if (data) {
    for (const l of data) {
      const ex = l.name.toLowerCase().replace(/['']/g, "'").replace(/[\u4e00-\u9fa5]/g, '').trim();
      if (ex === norm || ex.includes(norm) || norm.includes(ex)) return l;
    }
  }
  return null;
}

async function addSource(listingId, sourceId) {
  await supabase.from('listing_sources').upsert({ listing_id: listingId, source_id: sourceId }, { onConflict: 'listing_id,source_id' });
}

// Famous hawkers with verified postal codes
const FAMOUS_HAWKERS = [
  // CHICKEN RICE
  { name: 'Tian Tian Hainanese Chicken Rice', postal: '048621', tags: ['Chicken Rice', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Ah Tai Hainanese Chicken Rice', postal: '048621', tags: ['Chicken Rice', 'Hawker'], source: 'eatbook' },
  { name: 'Boon Tong Kee', postal: '089510', tags: ['Chicken Rice', 'Restaurant'], source: 'eatbook' },
  { name: 'Wee Nam Kee Chicken Rice', postal: '219016', tags: ['Chicken Rice', 'Restaurant'], source: 'eatbook' },
  { name: 'Chin Chin Eating House', postal: '219894', tags: ['Chicken Rice', 'Hawker'], source: 'eatbook' },
  { name: 'Five Star Hainanese Chicken Rice', postal: '209730', tags: ['Chicken Rice', 'Hawker'], source: 'eatbook' },
  { name: 'Loy Kee Chicken Rice', postal: '059024', tags: ['Chicken Rice', 'Hawker'], source: 'eatbook' },
  { name: 'Sin Kee Famous Cantonese Chicken Rice', postal: '059456', tags: ['Chicken Rice', 'Hawker'], source: 'eatbook' },

  // NASI LEMAK
  { name: 'Ponggol Nasi Lemak', postal: '519599', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' },
  { name: 'Boon Lay Power Nasi Lemak', postal: '648168', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' },
  { name: 'Selera Rasa Nasi Lemak', postal: '270018', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' },
  { name: 'Mizzy Corner Nasi Lemak', postal: '511136', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' },
  { name: 'Adam Road Nasi Lemak', postal: '289876', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' },
  { name: 'International Nasi Lemak', postal: '050501', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' },

  // PRATA
  { name: 'Mr and Mrs Mohgan Super Crispy Roti Prata', postal: '179369', tags: ['Prata', 'Hawker'], source: 'eatbook' },
  { name: 'Casuarina Curry Restaurant', postal: '556110', tags: ['Prata', 'Indian', 'Restaurant'], source: 'eatbook' },
  { name: 'The Roti Prata House', postal: '556110', tags: ['Prata', 'Indian', 'Hawker'], source: 'eatbook' },
  { name: 'Springleaf Prata Place', postal: '787949', tags: ['Prata', 'Indian', 'Restaurant'], source: 'eatbook' },
  { name: 'Sin Ming Roti Prata', postal: '575578', tags: ['Prata', 'Hawker'], source: 'eatbook' },
  { name: 'Thasevi Food Jalan Kayu Prata', postal: '799604', tags: ['Prata', 'Hawker'], source: 'eatbook' },

  // WONTON MEE
  { name: 'Kok Kee Wanton Mee', postal: '050503', tags: ['Wonton Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Eng Wantan Noodle', postal: '050726', tags: ['Wonton Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Fei Fei Wanton Mee', postal: '069189', tags: ['Wonton Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Pontian Wanton Noodles', postal: '178891', tags: ['Wonton Mee', 'Restaurant'], source: 'eatbook' },
  { name: 'Koung Wanton Noodle', postal: '078882', tags: ['Wonton Mee', 'Hawker'], source: 'eatbook' },

  // CHAR KWAY TEOW
  { name: 'Hill Street Char Kway Teow', postal: '520016', tags: ['Char Kway Teow', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Outram Park Fried Kway Teow Mee', postal: '078882', tags: ['Char Kway Teow', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'No 18 Zion Road Fried Kway Teow', postal: '247726', tags: ['Char Kway Teow', 'Hawker'], source: 'eatbook' },
  { name: 'Hai Kee Char Kway Teow', postal: '050505', tags: ['Char Kway Teow', 'Hawker'], source: 'eatbook' },
  { name: 'Lao Fu Zi Fried Kway Teow', postal: '520724', tags: ['Char Kway Teow', 'Hawker', 'Michelin'], source: 'michelin' },

  // BAK CHOR MEE
  { name: 'Tai Hwa Pork Noodle', postal: '191466', tags: ['Bak Chor Mee', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Seng Kee Mushroom Minced Pork Noodle', postal: '050511', tags: ['Bak Chor Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Ah Kow Mushroom Minced Pork Mee', postal: '530628', tags: ['Bak Chor Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Bedok 85 Fengshan Bak Chor Mee', postal: '460085', tags: ['Bak Chor Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Tai Wah Pork Noodle', postal: '078882', tags: ['Bak Chor Mee', 'Hawker'], source: 'eatbook' },

  // HOKKIEN MEE
  { name: 'Nam Sing Hokkien Fried Mee', postal: '520724', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Geylang Lor 29 Hokkien Mee', postal: '388288', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Come Daily Fried Hokkien Prawn Mee', postal: '169631', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Tiong Bahru Yi Sheng Fried Hokkien Prawn Mee', postal: '160083', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Swee Guan Hokkien Mee', postal: '210044', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Kim Keat Hokkien Mee', postal: '310328', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' },

  // LAKSA
  { name: '328 Katong Laksa', postal: '427946', tags: ['Laksa', 'Restaurant'], source: 'eatbook' },
  { name: 'Sungei Road Laksa', postal: '208899', tags: ['Laksa', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Janggut Laksa', postal: '530628', tags: ['Laksa', 'Hawker'], source: 'eatbook' },
  { name: '928 Yishun Laksa', postal: '760928', tags: ['Laksa', 'Hawker'], source: 'eatbook' },
  { name: 'Depot Road Zhen Shan Mei Claypot Laksa', postal: '109681', tags: ['Laksa', 'Hawker'], source: 'eatbook' },

  // ZI CHAR
  { name: 'Keng Eng Kee Seafood', postal: '109681', tags: ['Zi Char', 'Restaurant'], source: 'eatbook' },
  { name: 'JB Ah Meng', postal: '169631', tags: ['Zi Char', 'Restaurant'], source: 'eatbook' },
  { name: 'Kok Sen Restaurant', postal: '088826', tags: ['Zi Char', 'Restaurant', 'Michelin'], source: 'michelin' },
  { name: 'New Ubin Seafood', postal: '787432', tags: ['Zi Char', 'Restaurant'], source: 'eatbook' },
  { name: 'Sik Bao Sin', postal: '321001', tags: ['Zi Char', 'Restaurant'], source: 'eatbook' },

  // ROAST MEAT
  { name: 'Kay Lee Roast Meat', postal: '089512', tags: ['Roast Meat', 'Hawker'], source: 'eatbook' },
  { name: 'Roast Paradise', postal: '058416', tags: ['Roast Meat', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Fatty Cheong', postal: '059024', tags: ['Roast Meat', 'Hawker'], source: 'eatbook' },
  { name: 'Lian He Ben Ji Claypot Rice', postal: '050335', tags: ['Roast Meat', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Foong Kee Coffee Shop', postal: '088826', tags: ['Roast Meat', 'Hawker'], source: 'eatbook' },

  // RAMEN
  { name: 'Ippudo', postal: '238875', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },
  { name: 'Santouka Ramen', postal: '238872', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },
  { name: 'Tsuta', postal: '179103', tags: ['Japanese', 'Ramen', 'Michelin'], source: 'michelin' },
  { name: 'Keisuke Tonkotsu King', postal: '048621', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },
  { name: 'Ramen Nagi', postal: '238875', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },
  { name: 'Marutama Ramen', postal: '238872', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },

  // DIM SUM
  { name: 'Tim Ho Wan', postal: '238872', tags: ['Dim Sum', 'Chinese', 'Michelin'], source: 'michelin' },
  { name: 'Din Tai Fung', postal: '238877', tags: ['Dim Sum', 'Chinese', 'Restaurant'], source: 'eatbook' },
  { name: 'Crystal Jade La Mian Xiao Long Bao', postal: '238875', tags: ['Dim Sum', 'Chinese', 'Restaurant'], source: 'eatbook' },

  // BIB GOURMAND / FAMOUS
  { name: 'A Noodle Story', postal: '069111', tags: ['Hawker', 'Fusion', 'Michelin'], source: 'michelin' },
  { name: 'Song Fa Bak Kut Teh', postal: '048541', tags: ['Chinese', 'Bak Kut Teh', 'Michelin'], source: 'michelin' },
  { name: 'Liao Fan Hong Kong Soya Sauce Chicken Rice', postal: '050335', tags: ['Chicken Rice', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'J2 Famous Crispy Curry Puff', postal: '069111', tags: ['Hawker', 'Snacks', 'Michelin'], source: 'michelin' },
  { name: 'Heng Carrot Cake', postal: '540073', tags: ['Hawker', 'Carrot Cake'], source: 'eatbook' },
  { name: 'Shi Hui Yuan Teochew Porridge', postal: '050048', tags: ['Chinese', 'Teochew', 'Hawker'], source: 'eatbook' },

  // CAFES
  { name: 'Common Man Coffee Roasters', postal: '049315', tags: ['Cafe', 'Coffee'], source: 'eatbook' },
  { name: 'Chye Seng Huat Hardware', postal: '388367', tags: ['Cafe', 'Coffee'], source: 'eatbook' },
  { name: 'Plain Vanilla Bakery', postal: '160079', tags: ['Cafe', 'Bakery'], source: 'eatbook' },
  { name: 'The Populus', postal: '180009', tags: ['Cafe', 'Coffee'], source: 'eatbook' },

  // KOREAN
  { name: 'Wang Dae Bak', postal: '088826', tags: ['Korean', 'BBQ', 'Restaurant'], source: 'eatbook' },
  { name: 'Seorae Korean BBQ', postal: '059456', tags: ['Korean', 'BBQ', 'Restaurant'], source: 'eatbook' },
  { name: 'Masizzim', postal: '238839', tags: ['Korean', 'Restaurant'], source: 'eatbook' },

  // THAI
  { name: 'Nakhon Kitchen', postal: '528765', tags: ['Thai', 'Restaurant'], source: 'eatbook' },
  { name: 'Soi Thai Soi Nice', postal: '089693', tags: ['Thai', 'Restaurant'], source: 'eatbook' },

  // STEAK
  { name: 'Burnt Ends', postal: '247700', tags: ['Western', 'BBQ', 'Michelin'], source: 'michelin' },
  { name: 'Wooloomooloo Steakhouse', postal: '049909', tags: ['Western', 'Steak', 'Restaurant'], source: 'eatbook' },
  { name: 'Bedrock Bar & Grill', postal: '238877', tags: ['Western', 'Steak', 'Restaurant'], source: 'eatbook' },
];

async function main() {
  console.log('=== ADDING FAMOUS HAWKERS WITH VERIFIED ADDRESSES ===\n');
  console.log(`Processing ${FAMOUS_HAWKERS.length} restaurants...\n`);

  const stats = { inserted: 0, linked: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < FAMOUS_HAWKERS.length; i++) {
    const r = FAMOUS_HAWKERS[i];

    if ((i + 1) % 20 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${FAMOUS_HAWKERS.length} ---`);
      console.log(`    Inserted: ${stats.inserted}, Linked: ${stats.linked}\n`);
    }

    // Geocode postal code
    const geo = await geocodePostal(r.postal);
    if (!geo) {
      console.log(`❌ ${r.name} - could not geocode ${r.postal}`);
      stats.failed++;
      continue;
    }

    // Find station
    const station = await findNearestStation(geo.lat, geo.lng);
    if (!station) {
      console.log(`❌ ${r.name} - no station found`);
      stats.failed++;
      continue;
    }

    // Check if exists
    const existing = await findExisting(r.name, station.id);
    if (existing) {
      await addSource(existing.id, r.source);
      console.log(`🔗 ${r.name} → ${station.name} (linked)`);
      stats.linked++;
      await sleep(100);
      continue;
    }

    // Get walking time
    const walking = await getWalkingTime(geo.lat, geo.lng, station.lat, station.lng);

    // Insert
    const { data: inserted, error } = await supabase
      .from('food_listings')
      .insert({
        name: r.name,
        address: geo.address,
        station_id: station.id,
        tags: r.tags,
        is_active: true,
        lat: geo.lat,
        lng: geo.lng,
        distance_to_station: walking.distance,
        walking_time: walking.time
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`⏭️ ${r.name} - duplicate`);
        stats.skipped++;
      } else {
        console.log(`❌ ${r.name}: ${error.message}`);
        stats.failed++;
      }
    } else {
      await addSource(inserted.id, r.source);
      console.log(`✅ ${r.name} → ${station.name} (${walking.time} min)`);
      stats.inserted++;
    }

    await sleep(150);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Inserted: ${stats.inserted}`);
  console.log(`🔗 Linked:   ${stats.linked}`);
  console.log(`⏭️  Skipped:  ${stats.skipped}`);
  console.log(`❌ Failed:   ${stats.failed}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);

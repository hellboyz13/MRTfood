/**
 * Add more famous hawker stalls - batch 2 with corrected postal codes
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

// More famous hawkers with corrected postal codes
const FAMOUS_HAWKERS = [
  // Corrected from batch 1
  { name: 'Wee Nam Kee Hainanese Chicken Rice', postal: '308215', tags: ['Chicken Rice', 'Restaurant'], source: 'eatbook' }, // United Square
  { name: 'Boon Lay Power Nasi Lemak', postal: '640221', tags: ['Nasi Lemak', 'Hawker'], source: 'eatbook' }, // Jurong West
  { name: 'Hill Street Tai Hwa Pork Noodle', postal: '191466', tags: ['Bak Chor Mee', 'Hawker', 'Michelin'], source: 'michelin' }, // Crawford Lane
  { name: 'Song Fa Bak Kut Teh', postal: '048943', tags: ['Bak Kut Teh', 'Chinese', 'Michelin'], source: 'michelin' }, // New Bridge Rd
  { name: 'Tiong Bahru Yi Sheng Hokkien Mee', postal: '160083', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' }, // Tiong Bahru
  { name: 'Kim Keat Hokkien Mee', postal: '310026', tags: ['Hokkien Mee', 'Hawker'], source: 'eatbook' }, // Whampoa
  { name: 'Kok Kee Wanton Mee', postal: '051505', tags: ['Wonton Mee', 'Hawker'], source: 'eatbook' }, // Lavender FC
  { name: 'Fei Fei Wanton Mee', postal: '069011', tags: ['Wonton Mee', 'Hawker'], source: 'eatbook' }, // Amoy Street
  { name: 'Seorae Korean Charcoal BBQ', postal: '048617', tags: ['Korean', 'BBQ', 'Restaurant'], source: 'eatbook' }, // Boat Quay

  // More iconic places
  { name: 'Old Airport Road Food Centre', postal: '390051', tags: ['Hawker'], source: 'eatbook' }, // Old Airport Rd
  { name: 'Tiong Bahru Market', postal: '160030', tags: ['Hawker'], source: 'eatbook' },
  { name: 'Maxwell Food Centre', postal: '069184', tags: ['Hawker'], source: 'eatbook' },
  { name: 'Chinatown Complex Food Centre', postal: '050335', tags: ['Hawker'], source: 'eatbook' },
  { name: 'Amoy Street Food Centre', postal: '069111', tags: ['Hawker'], source: 'eatbook' },

  // Satay
  { name: 'Lau Pa Sat Satay', postal: '048582', tags: ['Satay', 'Hawker'], source: 'eatbook' },
  { name: 'Best Satay', postal: '310007', tags: ['Satay', 'Hawker'], source: 'eatbook' },

  // Carrot Cake
  { name: 'He Zhong Carrot Cake', postal: '540073', tags: ['Carrot Cake', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Bedok Chwee Kueh', postal: '460016', tags: ['Chwee Kueh', 'Hawker'], source: 'eatbook' },
  { name: 'Jian Bo Shui Kueh', postal: '160030', tags: ['Chwee Kueh', 'Hawker', 'Michelin'], source: 'michelin' },

  // Prawn Noodles
  { name: 'Blanco Court Prawn Mee', postal: '460038', tags: ['Prawn Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Beach Road Prawn Noodle House', postal: '190270', tags: ['Prawn Mee', 'Hawker'], source: 'eatbook' },
  { name: 'Wah Kee Big Prawn Noodles', postal: '403545', tags: ['Prawn Mee', 'Hawker'], source: 'eatbook' },

  // Fish Head Curry
  { name: 'Samy\'s Curry', postal: '247700', tags: ['Indian', 'Fish Head Curry', 'Restaurant'], source: 'eatbook' },
  { name: 'Muthu\'s Curry', postal: '218087', tags: ['Indian', 'Fish Head Curry', 'Restaurant'], source: 'eatbook' },

  // Oyster Omelette
  { name: 'Ah Chuan Oyster Omelette', postal: '208899', tags: ['Oyster Omelette', 'Hawker'], source: 'eatbook' },

  // Teochew/Cantonese
  { name: 'Ng Ah Sio Bak Kut Teh', postal: '328994', tags: ['Bak Kut Teh', 'Teochew'], source: 'eatbook' },
  { name: 'Founder Bak Kut Teh', postal: '328994', tags: ['Bak Kut Teh', 'Teochew'], source: 'eatbook' },
  { name: 'Sin Heng Claypot Bak Kut Teh', postal: '160159', tags: ['Bak Kut Teh', 'Teochew'], source: 'eatbook' },

  // Western
  { name: 'Astons Specialties', postal: '238883', tags: ['Western', 'Steak', 'Restaurant'], source: 'eatbook' },
  { name: 'The Carving Board', postal: '530724', tags: ['Western', 'Steak', 'Hawker'], source: 'eatbook' },

  // More ramen/Japanese
  { name: 'Machida Shoten Ramen', postal: '238846', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },
  { name: 'Kanshoku Ramen', postal: '238872', tags: ['Japanese', 'Ramen', 'Restaurant'], source: 'eatbook' },
  { name: 'Sushiro', postal: '238863', tags: ['Japanese', 'Sushi', 'Restaurant'], source: 'eatbook' },
  { name: 'Genki Sushi', postal: '238877', tags: ['Japanese', 'Sushi', 'Restaurant'], source: 'eatbook' },

  // Thai
  { name: 'Diandin Leluk', postal: '059456', tags: ['Thai', 'Restaurant'], source: 'eatbook' },
  { name: 'Thai Express', postal: '238877', tags: ['Thai', 'Restaurant'], source: 'eatbook' },

  // Indian
  { name: 'Komala Vilas', postal: '218088', tags: ['Indian', 'Vegetarian', 'Restaurant'], source: 'eatbook' },
  { name: 'Ananda Bhavan', postal: '218087', tags: ['Indian', 'Vegetarian', 'Restaurant'], source: 'eatbook' },
  { name: 'Zam Zam Restaurant', postal: '199787', tags: ['Indian', 'Murtabak', 'Restaurant'], source: 'eatbook' },
  { name: 'Victory Restaurant', postal: '199787', tags: ['Indian', 'Murtabak', 'Restaurant'], source: 'eatbook' },

  // Peranakan
  { name: 'Candlenut', postal: '247700', tags: ['Peranakan', 'Michelin', 'Restaurant'], source: 'michelin' },
  { name: 'Violet Oon Singapore', postal: '018972', tags: ['Peranakan', 'Restaurant'], source: 'eatbook' },

  // Desserts
  { name: 'Ah Chew Desserts', postal: '209030', tags: ['Dessert', 'Chinese'], source: 'eatbook' },
  { name: 'Mei Heong Yuen Dessert', postal: '050335', tags: ['Dessert', 'Chinese'], source: 'eatbook' },
  { name: 'Ice Cream Charlie', postal: '050335', tags: ['Dessert', 'Ice Cream'], source: 'eatbook' },

  // More Michelin Bib Gourmand
  { name: 'Hock Lam Street Popular Beef Kway Teow', postal: '050531', tags: ['Beef Noodles', 'Hawker'], source: 'michelin' },
  { name: 'Shi Le Yuan', postal: '520266', tags: ['Dessert', 'Chinese', 'Michelin'], source: 'michelin' },
  { name: 'New Rong Liang Ge Cantonese Roast Duck', postal: '050335', tags: ['Roast Meat', 'Chinese'], source: 'michelin' },
  { name: 'Alliance Seafood', postal: '310044', tags: ['Zi Char', 'Seafood'], source: 'michelin' },
  { name: 'Ann Chin Popiah', postal: '310044', tags: ['Popiah', 'Hawker', 'Michelin'], source: 'michelin' },
  { name: 'Famous Sungei Road Trishaw Laksa', postal: '208899', tags: ['Laksa', 'Hawker', 'Michelin'], source: 'michelin' },
];

async function main() {
  console.log('=== ADDING MORE FAMOUS HAWKERS - BATCH 2 ===\n');
  console.log(`Processing ${FAMOUS_HAWKERS.length} restaurants...\n`);

  const stats = { inserted: 0, linked: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < FAMOUS_HAWKERS.length; i++) {
    const r = FAMOUS_HAWKERS[i];

    if ((i + 1) % 15 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${FAMOUS_HAWKERS.length} ---`);
      console.log(`    Inserted: ${stats.inserted}, Linked: ${stats.linked}\n`);
    }

    const geo = await geocodePostal(r.postal);
    if (!geo) {
      console.log(`❌ ${r.name} - could not geocode ${r.postal}`);
      stats.failed++;
      continue;
    }

    const station = await findNearestStation(geo.lat, geo.lng);
    if (!station) {
      console.log(`❌ ${r.name} - no station found`);
      stats.failed++;
      continue;
    }

    const existing = await findExisting(r.name, station.id);
    if (existing) {
      await addSource(existing.id, r.source);
      console.log(`🔗 ${r.name} → ${station.name} (linked)`);
      stats.linked++;
      await sleep(100);
      continue;
    }

    const walking = await getWalkingTime(geo.lat, geo.lng, station.lat, station.lng);

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

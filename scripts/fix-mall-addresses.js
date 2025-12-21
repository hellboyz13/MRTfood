/**
 * Fix listings with mall names but no postal codes
 * Add postal codes and geocode them
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

// Mall name to postal code mapping
const MALL_POSTAL_CODES = {
  'paya lebar quarter': '409051',
  'paya lebar square': '409051',
  'plq': '409051',
  'raffles city': '179103',
  'raffles holland v': '278967',
  'holland village': '278967',
  'the woodleigh mall': '367803',
  'woodleigh mall': '367803',
  'fortune centre': '188979',
  'bedok interchange': '462208',
  'ion orchard': '238801',
  'takashimaya': '238872',
  'ngee ann city': '238872',
  'paragon': '238859',
  'mandarin gallery': '238897',
  'plaza singapura': '238839',
  'the centrepoint': '238843',
  'centrepoint': '238843',
  'wisma atria': '238877',
  'wheelock place': '238880',
  '313@somerset': '238895',
  'somerset 313': '238895',
  'orchard central': '238896',
  'great world': '237994',
  'tanglin mall': '247911',
  'forum the shopping mall': '238884',
  'forum': '238884',
  'vivo city': '098585',
  'vivocity': '098585',
  'harbourfront centre': '098585',
  'suntec city': '038983',
  'marina square': '039594',
  'millenia walk': '039596',
  'capitol singapore': '178905',
  'funan': '179105',
  'bugis junction': '188021',
  'bugis+': '188024',
  'bugis plus': '188024',
  'jem': '608549',
  'westgate': '608532',
  'imm': '609601',
  'jurong point': '648886',
  'nex': '556083',
  'causeway point': '738099',
  'northpoint city': '769098',
  'compass one': '545078',
  'tampines mall': '529510',
  'tampines 1': '529536',
  'century square': '529509',
  'bedok mall': '467360',
  'parkway parade': '449269',
  'i12 katong': '427574',
  'katong i12': '427574',
  'city square mall': '208539',
  'mustafa centre': '208070',
  'velocity': '329563',
  'kinex': '427684',
  'paya lebar': '409051',
  'tanjong pagar': '078867',
  'chinatown point': '059413',
  'peoples park': '058357',
  "people's park": '058357',
  'clarke quay': '179024',
  'marina bay sands': '018956',
  'mbs': '018956',
  'the shoppes': '018956',
  'dempsey': '247700',
  'dempsey hill': '247700',
  'tiong bahru': '160030',
  'tiong bahru market': '160030',
  'amoy street food centre': '069111',
  'lau pa sat': '048582',
  'maxwell food centre': '069184',
  'chinatown complex': '050335',
  'telok ayer': '048617',
  'robertson quay': '238236',
  'united square': '307591',
  'square 2': '307591',
  'novena square': '307684',
  'velocity novena': '307591',
  'downtown gallery': '068815',
  'one raffles place': '048616',
  'raffles place': '048616',
  'orchard gateway': '238858',
  'the heeren': '238867',
  'far east plaza': '228213',
};

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

function findPostalCode(address) {
  const lower = address.toLowerCase();

  for (const [mall, postal] of Object.entries(MALL_POSTAL_CODES)) {
    if (lower.includes(mall)) {
      return postal;
    }
  }
  return null;
}

async function main() {
  console.log('=== FIXING MALL ADDRESSES ===\n');

  // Get listings with address but no lat/lng
  const { data } = await supabase
    .from('food_listings')
    .select('id, name, address')
    .eq('is_active', true)
    .is('lat', null)
    .not('address', 'is', null);

  console.log('Found', data.length, 'listings without geocode\n');

  let fixed = 0;
  let notFound = 0;

  for (const listing of data) {
    const postal = findPostalCode(listing.address);

    if (!postal) {
      continue;
    }

    // Geocode
    const geo = await geocodePostal(postal);
    if (!geo) {
      console.log('❌ Could not geocode', postal, 'for', listing.name);
      notFound++;
      continue;
    }

    // Find station
    const station = await findNearestStation(geo.lat, geo.lng);
    if (!station) {
      console.log('❌ No station for', listing.name);
      continue;
    }

    // Walking time
    const walking = await getWalkingTime(geo.lat, geo.lng, station.lat, station.lng);

    // Update
    const { error } = await supabase
      .from('food_listings')
      .update({
        address: geo.address,
        lat: geo.lat,
        lng: geo.lng,
        station_id: station.id,
        distance_to_station: walking.distance,
        walking_time: walking.time
      })
      .eq('id', listing.id);

    if (error) {
      console.log('❌', listing.name, '-', error.message);
    } else {
      console.log('✅', listing.name, '→', station.name, '(' + walking.time + ' min)');
      fixed++;
    }

    await sleep(150);
  }

  console.log('\n=== RESULTS ===');
  console.log('Fixed:', fixed);
  console.log('Not found in mall list:', data.length - fixed - notFound);
}

main().catch(console.error);

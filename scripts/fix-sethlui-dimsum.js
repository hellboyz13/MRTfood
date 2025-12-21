/**
 * Fix Seth Lui dim sum listings with proper addresses from the article
 * Based on data extracted from https://sethlui.com/best-dim-sums-singapore-guide/
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

// Dim sum restaurants with addresses from the article
const DIM_SUM_DATA = [
  { name: 'Ji Tuo Hong Kong Style Tim Sum', address: '2 Bukit Batok St 24, SkyTech, #09-18, Singapore 659480' },
  { name: 'Dim Sum Haus', address: '57 Jalan Besar, Singapore 208809' },
  { name: 'Yi Dian Xin Hong Kong Dim Sum', address: '973 Upper Serangoon Road, Singapore 534752' },
  { name: 'Victor\'s Kitchen', address: '91 Bencoolen St, Sunshine Plaza, #01-56, Singapore 189652' },
  { name: 'Sum Dim Sum', address: '57 Jalan Besar, Singapore 208809' },
  { name: 'Five Star Hong Kong Style Handmade Dim Sum', address: '705 Sims Drive, Shun Li Industrial Complex, #07-01, Singapore 387384' },
  { name: 'Warung Dim Sum', address: '925 Yishun Central 1, #01-211, Singapore 760925' },
  { name: 'Uncle Kun\'s Delicacies', address: '74 Lorong 4 Toa Payoh, Toa Payoh Vista Market, #01-03, Singapore 310074' },
  { name: 'Swee Choon Tim Sum Restaurant', address: '183 Jalan Besar, Singapore 208882' },
  { name: 'Bei-Ing Dim Sum Club', address: '396 East Coast Rd, The Bullion Hawker Bar, Singapore 428994' },
  { name: 'Dim Sum Express', address: 'Multiple locations' }, // Skip - no specific address
  { name: 'Chao Yue Xuan', address: '13 Stamford Rd, Capitol Singapore, #B2-51/52, Singapore 178905' },
  { name: 'Peach Garden', address: '301 Upper Thomson Rd, Thomson Plaza, #02-06, Singapore 574408' },
  { name: 'Imperial Treasure Cantonese Cuisine', address: '1 Kim Seng Promenade, Great World, #02-111, Singapore 237994' },
  { name: 'Chopsuey Cafe', address: '10 Dempsey Rd, Dempsey Hill, #01-23, Singapore 247700' },
  { name: 'Hua Ting Restaurant', address: '442 Orchard Rd, Orchard Hotel, Level 2, Singapore 238879' },
  { name: 'Wah Lok Cantonese Restaurant', address: '76 Bras Basah Road, Carlton Hotel, Level 2, Singapore 189558' },
  { name: 'Social Place', address: '583 Orchard Rd, FORUM The Shopping Mall, #01-22, Singapore 238884' },
  { name: 'Yan Ting Restaurant', address: '29 Tanglin Rd, The St. Regis Singapore, Level 1U, Singapore 247912' },
  { name: 'Man Fu Yuan', address: '80 Middle Rd, InterContinental Singapore, Level 2, Singapore 188966' },
  { name: 'Hai Tien Lo', address: '7 Raffles Blvd, Pan Pacific Singapore, Level 3, Singapore 039595' },
  { name: 'Xin Cuisine Chinese Restaurant', address: '317 Outram Rd, Holiday Inn Atrium, Singapore 169075' },
  { name: 'Jade', address: '1 Fullerton Square, The Fullerton Hotel Singapore, Ground Floor, Singapore 049178' },
  { name: 'Yum Cha Restaurant', address: '20 Trengganu St, #02-01, Singapore 058479' },
  { name: 'Peony Jade', address: '165 Tg Pagar Rd, AMARA Singapore, #2F, Singapore 088539' },
  { name: 'Jia He Chinese Restaurant', address: '1 Farrer Park Station Rd, Connexion, #01-14/15/16, Singapore 217562' },
  { name: 'Red Star Restaurant', address: '54 Chin Swee Road, #07-23, Singapore 160054' },
  { name: 'Summer Palace', address: '1 Cuscaden Rd, Conrad Singapore Orchard, Level 3, Singapore 249716' },
  { name: 'Asia Grand Restaurant', address: '252 North Bridge Rd, Fairmont Singapore South Tower, #03-22B, Singapore 179103' },
  { name: 'Spring Court', address: '52-56 Upper Cross St, Singapore 058348' },
];

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
    // Fall through to estimation
  }

  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return {
    distance: Math.round(straightLine * 1.3),
    time: Math.round((straightLine * 1.3) / 80)
  };
}

async function geocodeAddress(address) {
  if (!address || address.length < 5 || address === 'Multiple locations') return null;

  try {
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

    if (postalMatch) {
      const cleanAddress = address.replace(/,?\s*Singapore\s*\d{6}/i, '').trim();
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
  } catch (error) {
    // Silent fail
  }
  return null;
}

async function main() {
  console.log('=== FIX SETH LUI DIM SUM ADDRESSES ===\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const item of DIM_SUM_DATA) {
    if (item.address === 'Multiple locations') {
      console.log(`[SKIP] ${item.name} - Multiple locations`);
      skipped++;
      continue;
    }

    // Find the listing - try with and without Chinese characters
    const searchName = item.name.replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '').trim();

    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name, address, lat, lng, station_id')
      .or(`name.ilike.%${searchName}%,name.ilike.%${item.name}%`)
      .limit(5);

    if (!listings || listings.length === 0) {
      console.log(`[NOT FOUND] ${item.name}`);
      notFound++;
      continue;
    }

    // Pick the one without a station (newly inserted)
    const listing = listings.find(l => !l.station_id) || listings[0];

    // Geocode
    const geo = await geocodeAddress(item.address);
    if (!geo) {
      console.log(`[NO GEO] ${item.name}`);
      skipped++;
      continue;
    }

    // Find station
    const station = await findNearestStation(geo.lat, geo.lng);
    if (!station) {
      console.log(`[NO STATION] ${item.name}`);
      skipped++;
      continue;
    }

    // Get walking distance
    const walking = await getWalkingDistance(geo.lat, geo.lng, station.lat, station.lng);
    const walkingTime = walking ? walking.time : Math.round(station.distance / 80);
    const walkingDist = walking ? walking.distance : station.distance;

    // Update the listing
    const { error } = await supabase
      .from('food_listings')
      .update({
        address: item.address,
        lat: geo.lat,
        lng: geo.lng,
        station_id: station.id,
        distance_to_station: walkingDist,
        walking_time: walkingTime
      })
      .eq('id', listing.id);

    if (error) {
      console.log(`[ERROR] ${item.name}: ${error.message}`);
    } else {
      console.log(`[UPDATED] ${item.name} -> ${station.name} (${walkingTime} min)`);
      updated++;
    }

    await sleep(200);
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Not found: ${notFound}`);
}

main().catch(console.error);

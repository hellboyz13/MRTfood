import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// All station coordinates from MRTMap.tsx
const stationGeoCoordinates: { [key: string]: { lat: number, lng: number, name: string } } = {
  // Major interchange stations
  'newton': { lat: 1.3129, lng: 103.8378, name: 'Newton' },
  'orchard': { lat: 1.3041, lng: 103.8318, name: 'Orchard' },
  'dhoby-ghaut': { lat: 1.2989, lng: 103.8456, name: 'Dhoby Ghaut' },
  'city-hall': { lat: 1.2929, lng: 103.8520, name: 'City Hall' },
  'raffles-place': { lat: 1.2837, lng: 103.8512, name: 'Raffles Place' },
  'marina-bay': { lat: 1.2762, lng: 103.8541, name: 'Marina Bay' },
  'bayfront': { lat: 1.2820, lng: 103.8590, name: 'Bayfront' },
  'promenade': { lat: 1.2932, lng: 103.8611, name: 'Promenade' },
  'bugis': { lat: 1.3006, lng: 103.8560, name: 'Bugis' },
  'little-india': { lat: 1.3067, lng: 103.8494, name: 'Little India' },
  'chinatown': { lat: 1.2844, lng: 103.8441, name: 'Chinatown' },
  'outram-park': { lat: 1.2803, lng: 103.8398, name: 'Outram Park' },
  'harbourfront': { lat: 1.2653, lng: 103.8218, name: 'Harbourfront' },
  'bishan': { lat: 1.3511, lng: 103.8484, name: 'Bishan' },
  'serangoon': { lat: 1.3496, lng: 103.8733, name: 'Serangoon' },
  'paya-lebar': { lat: 1.3177, lng: 103.8926, name: 'Paya Lebar' },
  'jurong-east': { lat: 1.3332, lng: 103.7423, name: 'Jurong East' },
  'tampines': { lat: 1.3529, lng: 103.9451, name: 'Tampines' },
  'changi-airport': { lat: 1.3573, lng: 103.9886, name: 'Changi Airport' },
  'woodlands': { lat: 1.4370, lng: 103.7867, name: 'Woodlands' },
  'ang-mo-kio': { lat: 1.3700, lng: 103.8495, name: 'Ang Mo Kio' },
  'toa-payoh': { lat: 1.3327, lng: 103.8474, name: 'Toa Payoh' },
  'somerset': { lat: 1.3005, lng: 103.8389, name: 'Somerset' },
  'clementi': { lat: 1.3152, lng: 103.7655, name: 'Clementi' },
  'boon-lay': { lat: 1.3388, lng: 103.7059, name: 'Boon Lay' },
  'pasir-ris': { lat: 1.3729, lng: 103.9493, name: 'Pasir Ris' },
  'punggol': { lat: 1.4050, lng: 103.9024, name: 'Punggol' },
  'sengkang': { lat: 1.3916, lng: 103.8954, name: 'Sengkang' },
  'bedok': { lat: 1.3240, lng: 103.9300, name: 'Bedok' },
  'tanjong-pagar': { lat: 1.2764, lng: 103.8453, name: 'Tanjong Pagar' },

  // North-South Line
  'yishun': { lat: 1.4292, lng: 103.8350, name: 'Yishun' },
  'khatib': { lat: 1.4172, lng: 103.8330, name: 'Khatib' },
  'yio-chu-kang': { lat: 1.3817, lng: 103.8448, name: 'Yio Chu Kang' },
  'braddell': { lat: 1.3407, lng: 103.8477, name: 'Braddell' },
  'novena': { lat: 1.3204, lng: 103.8437, name: 'Novena' },
  'marina-south-pier': { lat: 1.2710, lng: 103.8635, name: 'Marina South Pier' },
  'bukit-batok': { lat: 1.3490, lng: 103.7496, name: 'Bukit Batok' },
  'bukit-gombak': { lat: 1.3587, lng: 103.7518, name: 'Bukit Gombak' },
  'choa-chu-kang': { lat: 1.3854, lng: 103.7443, name: 'Choa Chu Kang' },
  'yew-tee': { lat: 1.3972, lng: 103.7470, name: 'Yew Tee' },
  'kranji': { lat: 1.4251, lng: 103.7620, name: 'Kranji' },
  'marsiling': { lat: 1.4326, lng: 103.7742, name: 'Marsiling' },
  'admiralty': { lat: 1.4406, lng: 103.8009, name: 'Admiralty' },
  'sembawang': { lat: 1.4491, lng: 103.8202, name: 'Sembawang' },
  'canberra': { lat: 1.4430, lng: 103.8297, name: 'Canberra' },

  // East-West Line
  'chinese-garden': { lat: 1.3426, lng: 103.7327, name: 'Chinese Garden' },
  'lakeside': { lat: 1.3444, lng: 103.7209, name: 'Lakeside' },
  'pioneer': { lat: 1.3376, lng: 103.6974, name: 'Pioneer' },
  'joo-koon': { lat: 1.3277, lng: 103.6783, name: 'Joo Koon' },
  'gul-circle': { lat: 1.3195, lng: 103.6605, name: 'Gul Circle' },
  'tuas-crescent': { lat: 1.3210, lng: 103.6492, name: 'Tuas Crescent' },
  'tuas-west-road': { lat: 1.3303, lng: 103.6397, name: 'Tuas West Road' },
  'tuas-link': { lat: 1.3404, lng: 103.6368, name: 'Tuas Link' },
  'dover': { lat: 1.3113, lng: 103.7786, name: 'Dover' },
  'commonwealth': { lat: 1.3026, lng: 103.7979, name: 'Commonwealth' },
  'queenstown': { lat: 1.2944, lng: 103.8061, name: 'Queenstown' },
  'redhill': { lat: 1.2896, lng: 103.8175, name: 'Redhill' },
  'tiong-bahru': { lat: 1.2862, lng: 103.8270, name: 'Tiong Bahru' },
  'lavender': { lat: 1.3075, lng: 103.8631, name: 'Lavender' },
  'kallang': { lat: 1.3114, lng: 103.8715, name: 'Kallang' },
  'aljunied': { lat: 1.3164, lng: 103.8831, name: 'Aljunied' },
  'eunos': { lat: 1.3197, lng: 103.9034, name: 'Eunos' },
  'kembangan': { lat: 1.3213, lng: 103.9129, name: 'Kembangan' },
  'simei': { lat: 1.3432, lng: 103.9533, name: 'Simei' },
  'tanah-merah': { lat: 1.3276, lng: 103.9464, name: 'Tanah Merah' },
  'expo': { lat: 1.3350, lng: 103.9614, name: 'Expo' },
};

async function auditStations() {
  console.log('🔍 STATION AUDIT REPORT\n');
  console.log('=' .repeat(80));

  // Get all stations from database
  const { data: dbStations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .order('id');

  const dbStationIds = new Set(dbStations?.map(s => s.id) || []);
  const dbStationsWithCoords = dbStations?.filter(s => s.lat && s.lng) || [];
  const dbStationsWithoutCoords = dbStations?.filter(s => !s.lat || !s.lng) || [];

  console.log(`\n📊 DATABASE SUMMARY:`);
  console.log(`   Total stations in database: ${dbStations?.length || 0}`);
  console.log(`   Stations WITH coordinates: ${dbStationsWithCoords.length}`);
  console.log(`   Stations WITHOUT coordinates: ${dbStationsWithoutCoords.length}`);
  console.log(`\n   Total hardcoded coordinates available: ${Object.keys(stationGeoCoordinates).length}`);

  // Find missing stations
  const missingStations = Object.entries(stationGeoCoordinates).filter(
    ([id]) => !dbStationIds.has(id)
  );

  console.log(`\n❌ MISSING STATIONS (${missingStations.length}):`);
  console.log('   These stations exist in code but NOT in database:\n');

  if (missingStations.length > 0) {
    missingStations.forEach(([id, data]) => {
      console.log(`   ${id.padEnd(25)} | ${data.name}`);
    });
  } else {
    console.log('   ✅ None - all stations are in database!');
  }

  // Find stations without coordinates
  if (dbStationsWithoutCoords.length > 0) {
    console.log(`\n⚠️  STATIONS WITHOUT COORDINATES (${dbStationsWithoutCoords.length}):`);
    console.log('   These stations exist in database but have no lat/lng:\n');

    dbStationsWithoutCoords.forEach(station => {
      const hasHardcodedCoords = stationGeoCoordinates[station.id];
      console.log(`   ${station.id.padEnd(25)} | ${station.name.padEnd(25)} | ${hasHardcodedCoords ? '✅ Coords available' : '❌ No coords'}`);
    });
  }

  // Check for outlets assigned to missing stations
  console.log(`\n\n🔍 CHECKING OUTLETS AFFECTED...\n`);

  for (const [stationId, data] of missingStations) {
    const { data: outlets } = await supabase
      .from('chain_outlets')
      .select('id, name, address, distance_to_station')
      .eq('nearest_station_id', stationId)
      .lte('distance_to_station', 1000);

    if (outlets && outlets.length > 0) {
      console.log(`\n❗ ${stationId} - ${outlets.length} outlets affected:`);
      outlets.forEach(outlet => {
        console.log(`     - ${outlet.name} (${outlet.distance_to_station}m)`);
      });
    }
  }

  // Generate SQL to fix all missing stations
  console.log(`\n\n📝 SQL TO FIX ALL MISSING STATIONS:\n`);
  console.log('=' .repeat(80));
  console.log(`\n-- Copy and paste this into Supabase SQL Editor:\n`);

  if (missingStations.length > 0) {
    console.log(`INSERT INTO stations (id, name, lat, lng) VALUES`);
    missingStations.forEach(([id, data], index) => {
      const comma = index < missingStations.length - 1 ? ',' : ';';
      console.log(`  ('${id}', '${data.name}', ${data.lat}, ${data.lng})${comma}`);
    });
  } else {
    console.log('-- No missing stations to insert!');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Audit complete!\n');
}

auditStations();

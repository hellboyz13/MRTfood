import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkStations() {
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .order('name');

  const total = stations?.length || 0;
  const withCoords = stations?.filter(s => s.lat && s.lng) || [];
  const withoutCoords = stations?.filter(s => !s.lat || !s.lng) || [];
  const invalidCoords = stations?.filter(s => {
    if (!s.lat || !s.lng) return false;
    // Singapore bounds: lat 1.15-1.47, lng 103.6-104.1
    return s.lat < 1.15 || s.lat > 1.47 || s.lng < 103.6 || s.lng > 104.1;
  }) || [];

  console.log('📊 Station Coordinate Status:');
  console.log('=====================================');
  console.log(`Total stations: ${total}`);
  console.log(`With coordinates: ${withCoords.length}`);
  console.log(`Without coordinates: ${withoutCoords.length}`);
  console.log(`Invalid coordinates (outside Singapore): ${invalidCoords.length}`);

  if (withoutCoords.length > 0) {
    console.log('\n❌ Stations WITHOUT coordinates:');
    withoutCoords.forEach(s => console.log(`  - ${s.name} (${s.id})`));
  }

  if (invalidCoords.length > 0) {
    console.log('\n⚠️ Stations with INVALID coordinates:');
    invalidCoords.forEach(s => console.log(`  - ${s.name} lat: ${s.lat} lng: ${s.lng}`));
  }

  if (withoutCoords.length === 0 && invalidCoords.length === 0) {
    console.log('\n✅ All stations have valid Singapore coordinates!');
  }

  return withoutCoords.length === 0 && invalidCoords.length === 0;
}

checkStations();
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  // Get Yat Ka Yan - force fresh fetch
  const { data: listing, error } = await supabase
    .from('food_listings')
    .select('id, name, address, lat, lng, distance_to_station, walking_time, station_id, stations(name, lat, lng)')
    .ilike('name', '%Yat Ka Yan%')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== Yat Ka Yan ===');
  console.log('Name:', listing?.name);
  console.log('Address:', listing?.address);
  console.log('Restaurant Lat/Lng:', listing?.lat, listing?.lng);
  console.log('Assigned station:', (listing as any)?.stations?.name);
  console.log('Station lat/lng:', (listing as any)?.stations?.lat, (listing as any)?.stations?.lng);
  console.log('Distance in DB:', listing?.distance_to_station, 'm');
  console.log('Walking time in DB:', listing?.walking_time, 'seconds =', listing?.walking_time ? Math.round(listing.walking_time / 60) : null, 'min');

  // Get Bugis station
  const { data: bugis } = await supabase
    .from('stations')
    .select('*')
    .eq('name', 'Bugis')
    .single();

  console.log('\n=== Bugis Station ===');
  console.log('Lat/Lng:', bugis?.lat, bugis?.lng);

  // Calculate straight-line distance to Bugis
  if (listing?.lat && listing?.lng && bugis?.lat && bugis?.lng) {
    const R = 6371000;
    const phi1 = (listing.lat * Math.PI) / 180;
    const phi2 = (bugis.lat * Math.PI) / 180;
    const deltaPhi = ((bugis.lat - listing.lat) * Math.PI) / 180;
    const deltaLambda = ((bugis.lng - listing.lng) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    console.log('\nStraight-line distance to Bugis:', Math.round(distance), 'm');
  }
}

check();

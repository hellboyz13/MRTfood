const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Download image from Google Photos URL
  const imageUrl = 'https://lh3.googleusercontent.com/p/AF1QipO9ZJJefAWIK1OSMyFuoHAl3ow2IC0FMw615OWz=w400';
  const res = await fetch(imageUrl);

  if (res.status !== 200) {
    console.log('Failed to fetch image, status:', res.status);
    return;
  }

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/jpeg';

  // Upload to Supabase
  const fileName = 'food-listings/beth-cafe.jpg';
  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(fileName, buffer, { contentType, upsert: true });

  if (uploadError) {
    console.log('Upload error:', uploadError.message);
    return;
  }

  const { data: urlData } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(fileName);

  console.log('Uploaded thumbnail to:', urlData.publicUrl);

  // Insert Beth Cafe
  const openingHours = `Tuesday: Closed
Wednesday: 10:30am–3pm, 5:30–9pm
Thursday: 10:30am–3pm, 5:30–9pm
Friday: 10:30am–3pm, 5:30–9pm
Saturday: 9am–9pm
Sunday: 9am–9pm
Monday: 10:30am–3pm, 5:30–9pm`;

  const { data, error } = await supabase.from('food_listings').insert({
    name: 'Beth',
    address: '134 Casuarina Road, Singapore 579522',
    station_id: 'lentor',
    image_url: urlData.publicUrl,
    source_id: 'burpple',
    source_url: 'https://www.google.com/maps/place/Beth/@1.3770088,103.8279578',
    tags: ['Cafe', 'Brunch', 'Editor Pick'],
    is_active: true,
    distance_to_station: 1556,
    lat: 1.37705034622068,
    lng: 103.828090556604,
    walking_time: 19,
    opening_hours: openingHours,
  }).select();

  if (error) {
    console.log('Insert error:', error.message);
    return;
  }

  console.log('Inserted Beth Cafe:', data[0].id);
}

main().catch(console.error);

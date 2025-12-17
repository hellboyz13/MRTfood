const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id, lat, lng')
    .ilike('name', '%Tom%Palette%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Tom\'s Palette listings found:', data.length);
  data.forEach(d => {
    console.log(`\nName: ${d.name}`);
    console.log(`Address: ${d.address}`);
    console.log(`Station: ${d.station_id}`);
    console.log(`Coords: ${d.lat}, ${d.lng}`);
  });

  // Fix the address - The correct address for Tom's Palette is:
  // 31 Ah Hood Rd, #01-07, Singapore 329979 (Zhongshan Mall)
  if (data.length > 0) {
    const correctAddress = '31 Ah Hood Rd, #01-07 Zhongshan Mall, Singapore 329979';
    console.log(`\nUpdating to correct address: ${correctAddress}`);

    const { error: updateError } = await supabase
      .from('food_listings')
      .update({ address: correctAddress })
      .eq('id', data[0].id);

    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('Address updated successfully!');
    }
  }
}

check().catch(console.error);

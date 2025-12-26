const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function slugify(name) {
  return name.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function migrate() {
  const venueIds = [
    // Hawker Centres (23)
    '602913ae-83bb-48ff-aaf5-6262beaac2ed', // Blk 50 Hawker Centre
    '7255bc7a-004b-4455-bb3b-c27f9a53d91d', // Bedok Reservoir Food Centre
    'b6b96139-dc51-4e15-ba3a-fe9fb2065616', // Maxwell Food Centre
    'efbb40cb-1602-40d9-92e9-1e55d6eaad51', // Tiong Bahru Food Centre
    'ff426fa4-5bc3-4b38-a544-d854d2e8a4e6', // Newton Food Centre
    '069555e1-4dab-40fa-8cbe-97c28001efc5', // Ghim Moh Market & Food Centre
    '75ec2e20-7b7b-4133-a3d6-127b1ffc2538', // Amoy Street Food Centre
    'd6eccf03-092d-4e7a-97b2-3a2c7f97623a', // Adam Road Food Centre
    '9a5635e2-7825-42c2-82d3-e35604719e00', // Holland Village Market & Food Centre
    '4373d020-e885-436c-bf22-89b983326502', // Pek Kio Market & Food Centre
    'a49567a2-30a3-4eec-9fc1-8a923732632d', // Old Airport Road Food Centre
    '83d2ce43-5f4b-4757-9942-dd6c16e20eb8', // Bendemeer Market & Food Centre
    'c484b35e-fa98-437d-9995-2dfd5bb0c02f', // Circuit Road Hawker Centre
    '5d7210c5-a1b9-44f2-acc3-570b32ecde10', // Fernvale Hawker Centre & Market
    'bbe5a56f-95d8-4c11-b756-5aeab465ed9b', // Hong Lim Market & Food Centre
    'c90830d8-1f79-486c-8b15-e79ed97cb8bd', // Kampung Admiralty Hawker Centre
    'e54ea807-1b4c-4954-89c9-456f04b63944', // Kovan 209 Market & Food Centre
    '976c5da2-1783-4b27-98ef-cf0effc4a4e9', // Punggol Coast Hawker Centre
    'b3248f85-4dd2-48c1-9661-6e3b32fc7d93', // Old Airport Road Food Centre (dup)
    '9e1df7af-20cb-4e52-bd14-d349507b098f', // Seah Im Food Centre
    '9dd8df90-8163-46bb-b2bf-20bea96837b1', // Sembawang Hills Food Centre
    '28afe1cc-b988-43f1-be1b-89af43581609', // Telok Blangah Food Centre
    'b0327525-ebf9-433a-a3dd-a0143756fb06', // Woodleigh Village Hawker Centre
    // Additional venues (9)
    '90b61aca-490d-4055-a2ac-8b27467de20c', // Chinatown Complex
    'e38f7256-ebff-4a93-a12c-6467ecc615cd', // East Coast Lagoon Food Village
    '811771e8-4a4e-432a-b76f-046eb2473272', // Esplanade Mall Food Court
    '6b322a39-0405-427a-9a80-73dcac9e476c', // Expo Food Court
    'a5c5b002-d37b-43ea-b314-bd3b16bcd084', // Food Junction Plaza Singapura
    'd82df491-4380-4fe0-962d-d07dde63b8f3', // Hougang Hainanese Village Centre
    '46c183ed-6503-43b7-9a1f-6f5c3b5083e6', // Lau Pa Sat
    '64966265-2e34-4d38-9d98-a4e0a0282b2f', // Our Tampines Hub Hawker
    '7be8dd7d-9ea3-4879-a7a7-ac629cc278ba', // Tampines Mall Food Court
  ];

  const { data: listings, error: fetchError } = await supabase
    .from('food_listings')
    .select('*')
    .in('id', venueIds);

  if (fetchError) {
    console.error('Error fetching:', fetchError);
    return;
  }

  console.log('Found', listings.length, 'venues to migrate\n');

  let inserted = 0;
  let deleted = 0;

  for (const listing of listings) {
    const slug = slugify(listing.name);

    const { error: insertError } = await supabase
      .from('malls')
      .insert({
        id: slug,
        name: listing.name,
        address: listing.address,
        station_id: listing.station_id,
        thumbnail_url: listing.image_url
      });

    if (insertError) {
      if (insertError.message.includes('duplicate')) {
        console.log('Already exists:', listing.name);
        // Still delete from food_listings
        const { error: deleteError } = await supabase
          .from('food_listings')
          .delete()
          .eq('id', listing.id);
        if (!deleteError) {
          console.log('  Deleted from food_listings');
          deleted++;
        }
      } else {
        console.log('Error:', listing.name, '-', insertError.message);
      }
    } else {
      console.log('Inserted:', listing.name, '(' + slug + ')');
      inserted++;

      // Delete from food_listings
      const { error: deleteError } = await supabase
        .from('food_listings')
        .delete()
        .eq('id', listing.id);

      if (!deleteError) {
        deleted++;
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Inserted into malls:', inserted);
  console.log('Deleted from food_listings:', deleted);
}

migrate().catch(console.error);

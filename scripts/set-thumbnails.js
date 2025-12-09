const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function main() {
  console.log('='.repeat(60));
  console.log('  SET THUMBNAILS FROM MENU IMAGES');
  console.log('='.repeat(60));

  // Get all listings without image_url
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id')
    .is('image_url', null);

  if (error) {
    console.log('Error fetching listings:', error.message);
    return;
  }

  console.log('\nFound ' + listings.length + ' listings without thumbnails\n');

  let updated = 0;
  let noImages = 0;

  for (const listing of listings) {
    // Get the first menu image for this listing
    const { data: menuImages } = await supabase
      .from('menu_images')
      .select('image_url')
      .eq('listing_id', listing.id)
      .order('display_order', { ascending: true })
      .limit(1);

    if (menuImages && menuImages.length > 0) {
      // Update the listing with the first menu image as thumbnail
      const { error: updateError } = await supabase
        .from('food_listings')
        .update({ image_url: menuImages[0].image_url })
        .eq('id', listing.id);

      if (updateError) {
        console.log('Error updating ' + listing.name + ': ' + updateError.message);
      } else {
        console.log('✅ ' + listing.name + ' @ ' + listing.station_id);
        updated++;
      }
    } else {
      console.log('⚠️  No menu images: ' + listing.name + ' @ ' + listing.station_id);
      noImages++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log('  Thumbnails set: ' + updated);
  console.log('  No images available: ' + noImages);
  console.log('='.repeat(60));
}

main();

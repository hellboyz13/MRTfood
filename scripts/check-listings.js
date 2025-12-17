const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function checkListings() {
  console.log('=== CHECKING ALL FOOD LISTINGS ===\n');

  // Fetch all active listings
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, distance_to_station, walking_time, tags')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Total active listings: ${listings.length}\n`);

  // 1. CHECK MISSING DISTANCE/WALKING TIME
  console.log('=== 1. MISSING DISTANCE/WALKING TIME ===');
  const missingDistance = listings.filter(l => !l.distance_to_station || !l.walking_time);
  if (missingDistance.length === 0) {
    console.log('All listings have distance and walking time data!\n');
  } else {
    console.log(`Found ${missingDistance.length} listings missing distance data:\n`);
    missingDistance.forEach(l => {
      console.log(`  - ${l.name}`);
      console.log(`    Station: ${l.station_id}, Distance: ${l.distance_to_station || 'MISSING'}, Time: ${l.walking_time || 'MISSING'}`);
    });
    console.log('');
  }

  // 2. CHECK DUPLICATES
  console.log('=== 2. DUPLICATE LISTINGS ===');
  const nameCount = {};
  listings.forEach(l => {
    const key = l.name.toLowerCase().trim();
    if (!nameCount[key]) nameCount[key] = [];
    nameCount[key].push(l);
  });

  const duplicates = Object.entries(nameCount).filter(([name, items]) => items.length > 1);
  if (duplicates.length === 0) {
    console.log('No duplicate listings found!\n');
  } else {
    console.log(`Found ${duplicates.length} sets of duplicates:\n`);
    duplicates.forEach(([name, items]) => {
      console.log(`  "${items[0].name}" appears ${items.length} times:`);
      items.forEach(item => {
        console.log(`    - ID: ${item.id}, Station: ${item.station_id}`);
      });
    });
    console.log('');
  }

  // 3. CHECK DESSERT TAGS
  console.log('=== 3. DESSERT TAG ANALYSIS ===');

  // Find all currently tagged as Dessert
  const dessertTagged = listings.filter(l => l.tags && l.tags.some(t => t.toLowerCase() === 'dessert'));
  console.log(`\nCurrently tagged as Dessert: ${dessertTagged.length} listings\n`);

  // Group by first letter for easier reading
  const grouped = {};
  dessertTagged.forEach(l => {
    const letter = l.name[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(l.name);
  });

  Object.keys(grouped).sort().forEach(letter => {
    console.log(`  ${letter}: ${grouped[letter].join(', ')}`);
  });

  // Find potential dessert spots that might be missed
  console.log('\n\n=== 4. POTENTIAL MISSED DESSERT SPOTS ===');
  const dessertKeywords = ['cake', 'bakery', 'ice cream', 'gelato', 'dessert', 'pastry', 'sweet', 'tart', 'pie', 'cookie', 'chocolate', 'patisserie', 'waffle', 'crepe', 'bingsu', 'mochi'];

  const potentialDesserts = listings.filter(l => {
    // Skip if already tagged
    if (l.tags && l.tags.some(t => t.toLowerCase() === 'dessert')) return false;

    // Check name
    const nameLower = l.name.toLowerCase();
    const nameMatch = dessertKeywords.some(k => nameLower.includes(k));
    if (nameMatch) return true;

    // Check tags
    if (l.tags) {
      const tagMatch = l.tags.some(t => {
        const tLower = t.toLowerCase();
        return dessertKeywords.some(k => tLower.includes(k));
      });
      if (tagMatch) return true;
    }

    return false;
  });

  if (potentialDesserts.length === 0) {
    console.log('No potential missed dessert spots found!');
  } else {
    console.log(`Found ${potentialDesserts.length} potential missed dessert spots:\n`);
    potentialDesserts.forEach(l => {
      console.log(`  - ${l.name}`);
      console.log(`    Tags: ${l.tags ? l.tags.join(', ') : 'none'}`);
    });
  }

  console.log('\n=== CHECK COMPLETE ===');
}

checkListings();

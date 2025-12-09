const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Eatbook recommended listings that overlap with existing Michelin hawkers
const eatbookOverlaps = [
  'Tian Tian Hainanese Chicken Rice',
  'A Noodle Story',
  'Hill Street Tai Hwa Pork Noodle', // Named differently - check Tai Wah
  'Tai Wah Pork Noodle',
  'Jian Bo Tiong Bahru Shui Kueh',
  'Lian He Ben Ji Claypot Rice',
  'New Lucky Claypot Rice',
  'Ah Ter Teochew Fishball Noodles', // Check if exists
  'Eminent Frog Porridge',
  'Song Fa Bak Kut Teh',
  'Hong Heng Fried Sotong Prawn Mee',
  'Nam Sing Hokkien Fried Mee',
  'J2 Famous Crispy Curry Puff',
  'Lagnaa',
  'Fu Ming Cooked Food',
  'Chey Sua Carrot Cake',
  'Outram Park Fried Kway Teow Mee',
  'Chuan Kee Boneless Braised Duck',
  'Na Na Curry',
  'Heng Kee', // Curry chicken noodles
];

// New Eatbook-only listings to add (with ratings from Google/reviews)
const newEatbookListings = [
  {
    name: 'L32 Handmade Noodles',
    description: 'Fresh handmade ban mian made to order with springy noodles',
    address: '418 Geylang Rd, Singapore 389392',
    station_id: 'paya-lebar',
    tags: ['ban-mian', 'noodles', 'handmade', 'eatbook-2024'],
    lat: 1.3132,
    lng: 103.8872,
    distance_to_station: 650,
    walking_time: 8,
    rating: 4.3
  },
  {
    name: 'Jiak Song Mee Hoon Kway',
    description: 'Mee hoon kueh by ex-MasterChef finalist with six outlets islandwide',
    address: '11A Telok Blangah Crescent, #01-76, Singapore 091011',
    station_id: 'telok-blangah',
    tags: ['mee-hoon-kueh', 'noodles', 'eatbook-2024'],
    lat: 1.2726,
    lng: 103.8089,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Blanco Court Beef Noodles',
    description: 'Hainanese beef noodles since 1979 with signature Superior Beef Noodles',
    address: '243 Beach Rd, Singapore 189754',
    station_id: 'bugis',
    tags: ['beef-noodles', 'hainanese', 'eatbook-2024'],
    lat: 1.3012,
    lng: 103.8603,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.4
  },
  {
    name: 'Hua Kee Chicken Rice',
    description: 'Aromatic chicken rice that flies under the radar in Redhill',
    address: '85 Redhill Ln, #01-75, Singapore 150085',
    station_id: 'redhill',
    tags: ['chicken-rice', 'eatbook-2024'],
    lat: 1.2872,
    lng: 103.8167,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.1
  },
  {
    name: 'Song Kee Eating House',
    description: 'Fishball noodles with handmade dumplings in Yio Chu Kang',
    address: '415 Yio Chu Kang Rd, Singapore 787093',
    station_id: 'yio-chu-kang',
    tags: ['fishball-noodles', 'handmade', 'eatbook-2024'],
    lat: 1.3815,
    lng: 103.8445,
    distance_to_station: 800,
    walking_time: 10,
    rating: 4.3
  },
  {
    name: 'Geylang Lor 29 Hokkien Mee',
    description: 'Famous hokkien mee with house-made chilli at East Coast Road',
    address: '396 East Coast Rd, Singapore 428994',
    station_id: 'eunos',
    tags: ['hokkien-mee', 'eatbook-2024'],
    lat: 1.3088,
    lng: 103.9058,
    distance_to_station: 900,
    walking_time: 12,
    rating: 4.2
  },
  {
    name: 'Kim Keat Hokkien Mee',
    description: 'Claypot hokkien mee wet-style with prawn, squid, clam, pork belly',
    address: 'Blk 127 Lorong 1 Toa Payoh, #02-19, Singapore 310127',
    station_id: 'toa-payoh',
    tags: ['hokkien-mee', 'claypot', 'eatbook-2024'],
    lat: 1.3342,
    lng: 103.8489,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.0
  },
  {
    name: 'First Street Teochew Fish Soup',
    description: 'Fresh Teochew fish soup with sweet broth near Kovan MRT',
    address: '965 Upper Serangoon Rd, Singapore 534721',
    station_id: 'kovan',
    tags: ['fish-soup', 'teochew', 'eatbook-2024'],
    lat: 1.3601,
    lng: 103.8847,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.4
  },
  {
    name: 'Islamic Restaurant',
    description: 'Over 100 years serving briyani - mutton briyani is the best-seller',
    address: '745 North Bridge Rd, Singapore 198713',
    station_id: 'bugis',
    tags: ['briyani', 'indian', 'halal', 'eatbook-2024'],
    lat: 1.3020,
    lng: 103.8608,
    distance_to_station: 500,
    walking_time: 6,
    rating: 4.3
  },
  {
    name: 'Geylang Briyani Stall (Hamid)',
    description: 'Three-generation family briyani stall with spicier style',
    address: '26/28 Lorong 17 Geylang, Singapore 388571',
    station_id: 'aljunied',
    tags: ['briyani', 'indian', 'halal', 'eatbook-2024'],
    lat: 1.3148,
    lng: 103.8862,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.5
  },
  {
    name: 'Al-Mahboob Rojak',
    description: 'Indian rojak with 30+ ingredients and nutty sauce near Tampines',
    address: '11 Tampines St 32, #02-25, Singapore 529287',
    station_id: 'tampines',
    tags: ['rojak', 'indian', 'halal', 'eatbook-2024'],
    lat: 1.3525,
    lng: 103.9425,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Bedok Chwee Kueh',
    description: 'Generous chye poh portions with larger rice cakes',
    address: 'Blk 16 Bedok South Rd, #01-42, Singapore 460016',
    station_id: 'bedok',
    tags: ['chwee-kueh', 'breakfast', 'eatbook-2024'],
    lat: 1.3235,
    lng: 103.9302,
    distance_to_station: 550,
    walking_time: 7,
    rating: 4.1
  },
  {
    name: 'Wang Wang Crispy Curry Puff',
    description: 'Pioneering crispy curry puff with laminated dough, handmade batch-fried',
    address: '505 Beach Rd, #01-73, Singapore 199583',
    station_id: 'lavender',
    tags: ['curry-puff', 'snack', 'eatbook-2024'],
    lat: 1.3032,
    lng: 103.8622,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.4
  },
  {
    name: 'Beo Crescent Curry Rice',
    description: 'Opens 6:30am with golden-fried pork and spicy curry in Tiong Bahru',
    address: '38 Beo Crescent, #01-03, Singapore 160038',
    station_id: 'tiong-bahru',
    tags: ['curry-rice', 'breakfast', 'eatbook-2024'],
    lat: 1.2852,
    lng: 103.8268,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.3
  },
  {
    name: 'Loy Kee Chicken Rice',
    description: 'Air-conditioned chicken rice restaurant since 1953',
    address: '342 Balestier Rd, Singapore 329774',
    station_id: 'novena',
    tags: ['chicken-rice', 'restaurant', 'eatbook-2024'],
    lat: 1.3265,
    lng: 103.8522,
    distance_to_station: 600,
    walking_time: 8,
    rating: 4.0
  },
  {
    name: 'Swee Choon Tim Sum',
    description: 'Famous late-night dim sum with salted egg yolk buns and xiao long bao',
    address: '183-191 Jln Besar, Singapore 208882',
    station_id: 'jalan-besar',
    tags: ['dim-sum', 'late-night', 'eatbook-2024'],
    lat: 1.3085,
    lng: 103.8565,
    distance_to_station: 250,
    walking_time: 3,
    rating: 4.2
  },
  {
    name: 'Old Amoy Chendol',
    description: 'Charcoal-cooked azuki beans with hand-made pandan noodles and cold-pressed coconut milk',
    address: '190 Lor 6 Toa Payoh, Singapore 310190',
    station_id: 'toa-payoh',
    tags: ['chendol', 'dessert', 'eatbook-2024'],
    lat: 1.3345,
    lng: 103.8515,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.5
  },
  {
    name: '99 Old Trees',
    description: 'Durian desserts including puffs, swiss rolls, and durian chendol',
    address: '109 Killiney Rd, Singapore 239548',
    station_id: 'somerset',
    tags: ['durian', 'dessert', 'eatbook-2024'],
    lat: 1.2995,
    lng: 103.8385,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.3
  },
  {
    name: 'Johor Road Boon Kee Pork Porridge',
    description: 'Third-generation Hainanese-style pork porridge with 70+ year history',
    address: '25 Jln Besar, Singapore 208786',
    station_id: 'jalan-besar',
    tags: ['porridge', 'hainanese', 'eatbook-2024'],
    lat: 1.3075,
    lng: 103.8558,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.4
  },
  {
    name: 'Sin Heng Kee Porridge',
    description: 'Popular jook with long waiting times especially at Hougang',
    address: '682 Hougang Ave 4, #01-328, Singapore 530682',
    station_id: 'hougang',
    tags: ['porridge', 'eatbook-2024'],
    lat: 1.3718,
    lng: 103.8858,
    distance_to_station: 500,
    walking_time: 6,
    rating: 4.1
  },
  {
    name: 'JUMBO Seafood',
    description: 'Award-winning chilli crab restaurant at East Coast Park',
    address: '1206 East Coast Parkway, #01-07/08 East Coast Seafood Centre, Singapore 449883',
    station_id: 'bedok',
    tags: ['chilli-crab', 'seafood', 'restaurant', 'eatbook-2024'],
    lat: 1.3028,
    lng: 103.9305,
    distance_to_station: 2500,
    walking_time: 30,
    rating: 4.3
  },
  {
    name: 'Long Beach Seafood',
    description: 'Spicier tangier chilli crab gravy with premium crabs',
    address: '1018 East Coast Parkway, #01-04 East Coast Seafood Centre, Singapore 449877',
    station_id: 'bedok',
    tags: ['chilli-crab', 'seafood', 'restaurant', 'eatbook-2024'],
    lat: 1.3025,
    lng: 103.9302,
    distance_to_station: 2500,
    walking_time: 30,
    rating: 4.2
  },
  {
    name: 'Haidilao',
    description: 'Exceptional hotpot service with customizable dipping sauces at MBS',
    address: '2 Bayfront Ave, #01-02 The Shoppes at Marina Bay Sands, Singapore 018972',
    station_id: 'bayfront',
    tags: ['hotpot', 'restaurant', 'eatbook-2024'],
    lat: 1.2839,
    lng: 103.8592,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.5
  },
  {
    name: 'Kim Choo Kueh Chang',
    description: 'Traditional Nyonya kueh and bak chang in Cantonese, Teochew, and Nyonya varieties',
    address: '60 Joo Chiat Pl, Singapore 427784',
    station_id: 'eunos',
    tags: ['kueh', 'nyonya', 'bak-chang', 'eatbook-2024'],
    lat: 1.3145,
    lng: 103.9012,
    distance_to_station: 750,
    walking_time: 10,
    rating: 4.4
  },
  {
    name: 'Fu Zhou Poh Hwa Oyster Cake',
    description: 'Fuzhou oyster cake stuffed with meat, oysters, prawns, and Chinese parsley',
    address: '166 Jln Besar, #02-02 Berseh Food Centre, Singapore 208877',
    station_id: 'jalan-besar',
    tags: ['oyster-cake', 'fuzhou', 'eatbook-2024'],
    lat: 1.3068,
    lng: 103.8565,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.2
  }
];

async function addEatbookListings() {
  console.log('=== ADDING EATBOOK LISTINGS ===\n');

  // First, ensure eatbook source exists
  const { data: sources } = await supabase.from('food_sources').select('id');
  const sourceIds = sources.map(s => s.id);

  if (!sourceIds.includes('eatbook')) {
    console.log('Adding eatbook source...');
    await supabase.from('food_sources').insert({
      id: 'eatbook',
      name: 'Eatbook',
      weight: 55,
      is_curated: true
    });
  }

  // Part 1: Add eatbook source to existing Michelin listings
  console.log('\n--- LINKING EATBOOK TO EXISTING MICHELIN LISTINGS ---\n');

  for (const name of eatbookOverlaps) {
    // Find the listing by name (partial match)
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', '%' + name.replace(/'/g, "''") + '%');

    if (listings && listings.length > 0) {
      for (const listing of listings) {
        // Check if eatbook source already exists for this listing
        const { data: existingSources } = await supabase
          .from('listing_sources')
          .select('id')
          .eq('listing_id', listing.id)
          .eq('source_id', 'eatbook');

        if (!existingSources || existingSources.length === 0) {
          const { error } = await supabase.from('listing_sources').insert({
            listing_id: listing.id,
            source_id: 'eatbook',
            source_url: 'https://eatbook.sg/best-singapore-food/',
            is_primary: false
          });

          if (error) {
            console.log('Error linking', listing.name, ':', error.message);
          } else {
            console.log('Linked eatbook to:', listing.name);
          }
        } else {
          console.log('Already linked:', listing.name);
        }
      }
    }
  }

  // Part 2: Add new Eatbook-only listings
  console.log('\n--- ADDING NEW EATBOOK LISTINGS ---\n');

  let added = 0;
  let skipped = 0;

  for (const listing of newEatbookListings) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .eq('name', listing.name)
      .single();

    if (existing) {
      console.log('Already exists:', listing.name);
      skipped++;
      continue;
    }

    // Insert new listing
    const { data, error } = await supabase
      .from('food_listings')
      .insert({
        name: listing.name,
        description: listing.description,
        address: listing.address,
        station_id: listing.station_id,
        source_id: 'eatbook',
        tags: listing.tags,
        lat: listing.lat,
        lng: listing.lng,
        distance_to_station: listing.distance_to_station,
        walking_time: listing.walking_time,
        rating: listing.rating
      })
      .select('id')
      .single();

    if (error) {
      console.log('Error adding', listing.name, ':', error.message);
    } else {
      console.log('Added:', listing.name, '->', listing.station_id);
      added++;

      // Add to listing_sources
      await supabase.from('listing_sources').insert({
        listing_id: data.id,
        source_id: 'eatbook',
        source_url: 'https://eatbook.sg/best-singapore-food/',
        is_primary: true
      });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('New listings added:', added);
  console.log('Skipped (already exist):', skipped);

  // Get counts
  const { count: totalCount } = await supabase.from('food_listings').select('*', { count: 'exact', head: true });
  console.log('\nTotal listings now:', totalCount);

  // Count by source
  const { data: bySource } = await supabase.from('food_listings').select('source_id');
  const sourceCounts = {};
  bySource.forEach(l => {
    sourceCounts[l.source_id] = (sourceCounts[l.source_id] || 0) + 1;
  });
  console.log('\nListings by primary source:');
  Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log('  ' + s + ': ' + c));

  // Count listings with multiple sources
  const { data: multiSource } = await supabase.rpc('count_multi_source_listings');
  if (multiSource) {
    console.log('\nListings with multiple sources:', multiSource);
  }

  // Show listings that have both michelin and eatbook
  console.log('\n--- LISTINGS WITH MICHELIN + EATBOOK ---');
  const { data: michelinEatbook } = await supabase
    .from('listing_sources')
    .select('listing_id, source_id, food_listings!inner(name)')
    .eq('source_id', 'eatbook');

  if (michelinEatbook) {
    for (const ls of michelinEatbook) {
      // Check if this listing also has michelin source
      const { data: otherSources } = await supabase
        .from('listing_sources')
        .select('source_id')
        .eq('listing_id', ls.listing_id)
        .like('source_id', 'michelin%');

      if (otherSources && otherSources.length > 0) {
        console.log(ls.food_listings.name, '- Also on:', otherSources.map(s => s.source_id).join(', '));
      }
    }
  }
}

addEatbookListings();

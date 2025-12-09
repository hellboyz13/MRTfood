const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

async function addCuratedListings() {
  // Station IDs use simple names without line codes
  // Mapping: tanjong-pagar, chinatown, bugis, city-hall, holland-village, raffles-place,
  //          botanic-gardens, bishan, potong-pasir, newton, little-india, eunos

  const curatedRestaurants = [
    // Tatler 2025 Top Restaurants
    {
      name: 'Born',
      description: 'Modern European fine dining with Korean influences by chef Zor Tan',
      station_id: 'tanjong-pagar',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'european', 'korean', 'tatler-2025'],
      lat: 1.2775,
      lng: 103.8426,
      distance_to_station: 180,
      walking_time: 2
    },
    {
      name: 'Cloudstreet',
      description: 'Progressive Asian cuisine by chef Rishi Naleendra with tasting menus',
      station_id: 'tanjong-pagar',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'asian', 'tasting-menu', 'tatler-2025'],
      lat: 1.2798,
      lng: 103.8468,
      distance_to_station: 250,
      walking_time: 3
    },
    {
      name: 'Labyrinth',
      description: 'Modern Singaporean cuisine celebrating local heritage by chef LG Han',
      station_id: 'bayfront',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'singaporean', 'local', 'tatler-2025'],
      lat: 1.2899,
      lng: 103.8559,
      distance_to_station: 400,
      walking_time: 5
    },
    {
      name: 'Zen',
      description: 'Japanese-Nordic omakase by chef Tristin Farmer',
      station_id: 'city-hall',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'japanese', 'omakase', 'tatler-2025'],
      lat: 1.2903,
      lng: 103.8520,
      distance_to_station: 300,
      walking_time: 4
    },
    {
      name: 'Odette',
      description: 'Three Michelin star French fine dining at National Gallery',
      station_id: 'city-hall',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'french', 'michelin', 'tatler-2025'],
      lat: 1.2905,
      lng: 103.8515,
      distance_to_station: 280,
      walking_time: 4
    },
    // Time Out 2025 Recommended
    {
      name: 'Asu',
      description: 'Contemporary Japanese kappo dining experience',
      station_id: 'chinatown',
      source_id: 'timeout-2025',
      tags: ['japanese', 'kappo', 'timeout-2025'],
      lat: 1.2847,
      lng: 103.8438,
      distance_to_station: 350,
      walking_time: 5
    },
    {
      name: 'Birds of a Feather',
      description: 'Sichuan-inspired modern Chinese cuisine',
      station_id: 'bugis',
      source_id: 'timeout-2025',
      tags: ['chinese', 'sichuan', 'timeout-2025'],
      lat: 1.2997,
      lng: 103.8554,
      distance_to_station: 400,
      walking_time: 5
    },
    {
      name: 'Bon Broth',
      description: 'Specialty broth and noodle bar with quality ingredients',
      station_id: 'tanjong-pagar',
      source_id: 'timeout-2025',
      tags: ['noodles', 'broth', 'casual', 'timeout-2025'],
      lat: 1.2785,
      lng: 103.8445,
      distance_to_station: 200,
      walking_time: 3
    },
    {
      name: 'Carlitos',
      description: 'Authentic Mexican tacos and street food',
      station_id: 'bugis',
      source_id: 'timeout-2025',
      tags: ['mexican', 'tacos', 'casual', 'timeout-2025'],
      lat: 1.3005,
      lng: 103.8565,
      distance_to_station: 350,
      walking_time: 4
    },
    {
      name: 'Casa Cicheti',
      description: 'Venetian small plates and Italian wines',
      station_id: 'tanjong-pagar',
      source_id: 'timeout-2025',
      tags: ['italian', 'venetian', 'wine-bar', 'timeout-2025'],
      lat: 1.2792,
      lng: 103.8462,
      distance_to_station: 220,
      walking_time: 3
    },
    {
      name: 'Candlenut',
      description: 'Peranakan fine dining celebrating Straits Chinese heritage',
      station_id: 'holland-village',
      source_id: 'timeout-2025',
      tags: ['peranakan', 'fine-dining', 'local', 'timeout-2025'],
      lat: 1.3108,
      lng: 103.7958,
      distance_to_station: 450,
      walking_time: 6
    },
    {
      name: 'Burnt Ends',
      description: 'Modern Australian BBQ with open fire cooking',
      station_id: 'chinatown',
      source_id: 'timeout-2025',
      tags: ['bbq', 'australian', 'fine-dining', 'timeout-2025'],
      lat: 1.2815,
      lng: 103.8425,
      distance_to_station: 400,
      walking_time: 5
    },
    {
      name: 'Meta',
      description: 'Creative Asian-European cuisine with seasonal menus',
      station_id: 'bencoolen',
      source_id: 'timeout-2025',
      tags: ['fusion', 'asian-european', 'fine-dining', 'timeout-2025'],
      lat: 1.2985,
      lng: 103.8495,
      distance_to_station: 300,
      walking_time: 4
    },
    {
      name: 'Nouri',
      description: 'Crossroads cooking blending global culinary traditions',
      station_id: 'tanjong-pagar',
      source_id: 'timeout-2025',
      tags: ['fusion', 'fine-dining', 'creative', 'timeout-2025'],
      lat: 1.2798,
      lng: 103.8470,
      distance_to_station: 260,
      walking_time: 3
    },
    {
      name: 'Lolla',
      description: 'Mediterranean small plates and natural wines',
      station_id: 'tanjong-pagar',
      source_id: 'timeout-2025',
      tags: ['mediterranean', 'tapas', 'wine-bar', 'timeout-2025'],
      lat: 1.2800,
      lng: 103.8465,
      distance_to_station: 240,
      walking_time: 3
    },
    // More Time Out 2025 recommendations
    {
      name: 'Thevar',
      description: 'Modern Indian cuisine with bold flavors by chef Mano Thevar',
      station_id: 'chinatown',
      source_id: 'timeout-2025',
      tags: ['indian', 'fine-dining', 'modern', 'timeout-2025'],
      lat: 1.2820,
      lng: 103.8430,
      distance_to_station: 380,
      walking_time: 5
    },
    {
      name: 'Cheek by Jowl',
      description: 'Modern Australian cuisine with Asian influences',
      station_id: 'tanjong-pagar',
      source_id: 'timeout-2025',
      tags: ['australian', 'asian', 'fine-dining', 'timeout-2025'],
      lat: 1.2790,
      lng: 103.8455,
      distance_to_station: 210,
      walking_time: 3
    },
    {
      name: 'Sushi Kimura',
      description: 'Authentic Edomae sushi omakase',
      station_id: 'raffles-place',
      source_id: 'timeout-2025',
      tags: ['japanese', 'sushi', 'omakase', 'timeout-2025'],
      lat: 1.2840,
      lng: 103.8515,
      distance_to_station: 200,
      walking_time: 3
    },
    {
      name: 'Corner House',
      description: 'French gastro-botanica cuisine in Botanic Gardens',
      station_id: 'caldecott',
      source_id: 'timeout-2025',
      tags: ['french', 'fine-dining', 'botanical', 'timeout-2025'],
      lat: 1.3138,
      lng: 103.8159,
      distance_to_station: 800,
      walking_time: 10
    },
    {
      name: 'Whitegrass',
      description: 'Australian fine dining with local ingredients at CHIJMES',
      station_id: 'city-hall',
      source_id: 'timeout-2025',
      tags: ['australian', 'fine-dining', 'local', 'timeout-2025'],
      lat: 1.2955,
      lng: 103.8525,
      distance_to_station: 350,
      walking_time: 4
    },
    // HungryGoWhere popular picks
    {
      name: 'Wah Kee Big Prawn Noodle',
      description: 'Famous big prawn noodles with rich broth',
      station_id: 'bishan',
      source_id: 'hungrygowhere',
      tags: ['prawn-noodles', 'hawker', 'local', 'hungrygowhere'],
      lat: 1.3505,
      lng: 103.8485,
      distance_to_station: 300,
      walking_time: 4
    },
    {
      name: 'Tai Hwa Pork Noodle',
      description: 'Michelin starred bak chor mee with signature vinegar',
      station_id: 'potong-pasir',
      source_id: 'hungrygowhere',
      tags: ['bak-chor-mee', 'michelin', 'hawker', 'hungrygowhere'],
      lat: 1.3315,
      lng: 103.8695,
      distance_to_station: 400,
      walking_time: 5
    },
    {
      name: 'Heng Carrot Cake',
      description: 'Crispy fried carrot cake with special sauce',
      station_id: 'newton',
      source_id: 'hungrygowhere',
      tags: ['carrot-cake', 'hawker', 'local', 'hungrygowhere'],
      lat: 1.3125,
      lng: 103.8385,
      distance_to_station: 250,
      walking_time: 3
    },
    {
      name: 'Joo Chiat Kim Choo',
      description: 'Traditional Nonya rice dumplings and kueh',
      station_id: 'eunos',
      source_id: 'hungrygowhere',
      tags: ['nonya', 'dumplings', 'traditional', 'hungrygowhere'],
      lat: 1.3185,
      lng: 103.9025,
      distance_to_station: 600,
      walking_time: 8
    },
    {
      name: 'Sungei Road Laksa',
      description: 'Legendary laksa at Jalan Berseh Food Centre',
      station_id: 'little-india',
      source_id: 'hungrygowhere',
      tags: ['laksa', 'hawker', 'local', 'hungrygowhere'],
      lat: 1.3085,
      lng: 103.8555,
      distance_to_station: 350,
      walking_time: 5
    },
    // More restaurants for variety across stations
    {
      name: 'National Kitchen by Violet Oon',
      description: 'Heritage Peranakan cuisine at National Gallery',
      station_id: 'city-hall',
      source_id: 'timeout-2025',
      tags: ['peranakan', 'heritage', 'local', 'timeout-2025'],
      lat: 1.2902,
      lng: 103.8518,
      distance_to_station: 290,
      walking_time: 4
    },
    {
      name: 'Liao Fan Hong Kong Soya Sauce Chicken',
      description: 'Worlds cheapest Michelin star hawker stall',
      station_id: 'chinatown',
      source_id: 'hungrygowhere',
      tags: ['chicken-rice', 'michelin', 'hawker', 'hungrygowhere'],
      lat: 1.2835,
      lng: 103.8445,
      distance_to_station: 200,
      walking_time: 3
    },
    {
      name: 'Iggy',
      description: 'European fine dining with Japanese influences',
      station_id: 'orchard',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'european', 'japanese', 'tatler-2025'],
      lat: 1.3050,
      lng: 103.8318,
      distance_to_station: 350,
      walking_time: 5
    },
    {
      name: 'Jaan by Kirk Westaway',
      description: 'Modern British cuisine with panoramic views',
      station_id: 'city-hall',
      source_id: 'tatler-2025',
      tags: ['fine-dining', 'british', 'modern', 'tatler-2025'],
      lat: 1.2915,
      lng: 103.8530,
      distance_to_station: 400,
      walking_time: 5
    },
    {
      name: 'Rhubarb Le Restaurant',
      description: 'Classic French cuisine with modern touches',
      station_id: 'orchard',
      source_id: 'timeout-2025',
      tags: ['french', 'fine-dining', 'classic', 'timeout-2025'],
      lat: 1.3005,
      lng: 103.8365,
      distance_to_station: 450,
      walking_time: 6
    }
  ];

  console.log('Adding', curatedRestaurants.length, 'curated restaurants...\n');

  let added = 0;
  let skipped = 0;

  for (const restaurant of curatedRestaurants) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id, name')
      .eq('name', restaurant.name)
      .eq('station_id', restaurant.station_id)
      .single();

    if (existing) {
      console.log('Already exists:', restaurant.name);
      skipped++;
      continue;
    }

    // Insert new listing
    const { data, error } = await supabase
      .from('food_listings')
      .insert({
        name: restaurant.name,
        description: restaurant.description,
        station_id: restaurant.station_id,
        source_id: restaurant.source_id,
        tags: restaurant.tags,
        lat: restaurant.lat,
        lng: restaurant.lng,
        distance_to_station: restaurant.distance_to_station,
        walking_time: restaurant.walking_time
      })
      .select('id')
      .single();

    if (error) {
      console.log('Error adding', restaurant.name, ':', error.message);
    } else {
      console.log('Added:', restaurant.name, '-> Station:', restaurant.station_id);
      added++;

      // Also add to listing_sources
      await supabase.from('listing_sources').insert({
        listing_id: data.id,
        source_id: restaurant.source_id,
        is_primary: true
      });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Added:', added);
  console.log('Skipped (already exist):', skipped);

  // Get counts
  const { count: totalCount } = await supabase.from('food_listings').select('*', { count: 'exact', head: true });
  console.log('\nTotal listings now:', totalCount);

  // Count by source
  const { data: bySource } = await supabase
    .from('food_listings')
    .select('source_id');

  const sourceCounts = {};
  bySource.forEach(l => {
    sourceCounts[l.source_id] = (sourceCounts[l.source_id] || 0) + 1;
  });

  console.log('\nListings by source:');
  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log('  ' + source + ': ' + count);
    });
}

addCuratedListings();

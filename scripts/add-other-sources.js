const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Get-Fed / Food King listings (Food King renamed to Get-Fed, use get-fed tag)
const getFedListings = [
  // Golden Mile Food Centre stalls
  {
    name: 'Hainan Fried Hokkien Prawn Mee',
    description: 'Over 60 years history, driest Hokkien mee in Singapore with intense smoky flavour',
    address: '505 Beach Rd, #B1-34 Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['hokkien-mee', 'hawker', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.3
  },
  {
    name: 'Shiok Hokkien Mee',
    description: 'Young hawker Andre Ong serves generous portions at Golden Mile',
    address: '505 Beach Rd, #01-57 Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['hokkien-mee', 'hawker', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Joo Siah Bak Koot Teh',
    description: 'Famous peppery bak kut teh with premium loin ribs',
    address: 'Block 349 Jurong East Ave 1, #01-1215, Singapore 600349',
    station_id: 'jurong-east',
    tags: ['bak-kut-teh', 'hawker', 'get-fed'],
    lat: 1.3485,
    lng: 103.7425,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.4
  },
  {
    name: 'Ah Hua Teo Chew Noodle',
    description: 'Signature Bee Tai Mak and fishball noodles in Pandan Gardens',
    address: '415 Pandan Gardens, Singapore 600415',
    station_id: 'clementi',
    tags: ['fishball-noodles', 'teochew', 'get-fed'],
    lat: 1.3125,
    lng: 103.7558,
    distance_to_station: 800,
    walking_time: 10,
    rating: 4.1
  },
  {
    name: 'Chop Chop Biryani',
    description: 'Unique fusion with Siu Yoke, Pork Masala, Char Siew on biryani rice',
    address: '7 Maxwell Rd, #02-101 Amoy Street Food Centre, Singapore 069111',
    station_id: 'tanjong-pagar',
    tags: ['biryani', 'fusion', 'get-fed'],
    lat: 1.2799,
    lng: 103.8465,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.2
  },
  {
    name: 'Ri Ri Hong Mala Xiang Guo',
    description: 'Popular mala with great variety of ingredients and decent prices',
    address: '335 Smith St, #02-062 Chinatown Complex, Singapore 050335',
    station_id: 'chinatown',
    tags: ['mala', 'chinese', 'get-fed'],
    lat: 1.2825,
    lng: 103.8442,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.3
  },
  {
    name: 'Bugis Long House Lim Kee Beef Noodles',
    description: 'Tender beef slices in rich herbal soup at Golden Mile',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['beef-noodles', 'hawker', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Haji Kadir Food Chains',
    description: 'Famous for Tulang (mutton bone marrow) and Roti John',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['indian', 'halal', 'tulang', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.4
  },
  {
    name: 'Deen Tiga Rasa',
    description: 'Malay cuisine with rich curries at Golden Mile Food Centre',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['malay', 'halal', 'curry', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.1
  },
  {
    name: 'Koothurar Nasi Biryani',
    description: 'Authentic Indian biryani with tender meat at Golden Mile',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['biryani', 'indian', 'halal', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.3
  },
  {
    name: 'Azme Nasi Lemak',
    description: 'Fluffy fragrant rice with sweet chilli and crispy chicken wings',
    address: 'Changi Village Hawker Centre, Singapore 509907',
    station_id: 'tampines',
    tags: ['nasi-lemak', 'halal', 'get-fed'],
    lat: 1.3897,
    lng: 103.9878,
    distance_to_station: 3500,
    walking_time: 45,
    rating: 4.2
  },
  {
    name: 'Le Taste Bistro 8',
    description: 'Affordable Western food with Black Pepper Chicken Chop and Cereal Mayo Chicken',
    address: '8 Foch Rd, Singapore 209260',
    station_id: 'farrer-park',
    tags: ['western', 'bistro', 'get-fed'],
    lat: 1.3125,
    lng: 103.8545,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.0
  },
  // More Food King classic episodes
  {
    name: 'Yew Chuan Claypot Rice',
    description: 'Traditional claypot rice cooked over charcoal at Golden Mile',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['claypot-rice', 'hawker', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.3
  },
  {
    name: 'Charlie Peranakan Food',
    description: 'Authentic Peranakan dishes at Golden Mile Food Centre',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['peranakan', 'hawker', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Mr Baguette',
    description: 'Vietnamese baguettes and sandwiches at Golden Mile',
    address: '505 Beach Rd, Golden Mile Food Centre, Singapore 199583',
    station_id: 'lavender',
    tags: ['vietnamese', 'baguette', 'get-fed'],
    lat: 1.3028,
    lng: 103.8635,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.1
  }
];

// 8days recommended listings
const eightDaysListings = [
  {
    name: 'An Shun Seafood Soup',
    description: 'Fried Fish Bee Hoon with creamy yet light broth, 4.5 stars on Google',
    address: '124 Hougang Ave 1, #01-1446, Singapore 530124',
    station_id: 'hougang',
    tags: ['fish-soup', 'seafood', '8days'],
    lat: 1.3712,
    lng: 103.8865,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.5
  },
  {
    name: 'Aunty Lily Kitchen',
    description: 'Hidden gem with delicious Ayam Penyet and Nasi Lemak Beef Rendang',
    address: 'City Plaza, 810 Geylang Rd, Singapore 409286',
    station_id: 'paya-lebar',
    tags: ['indonesian', 'nasi-lemak', '8days'],
    lat: 1.3155,
    lng: 103.8925,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.3
  },
  {
    name: 'Lian Hup Heng',
    description: 'Atas hawker bakery with Orh Nee Tart and Lemon Meringue for $3.80',
    address: '7 Maxwell Rd, Amoy Street Food Centre, Singapore 069111',
    station_id: 'tanjong-pagar',
    tags: ['bakery', 'dessert', '8days'],
    lat: 1.2799,
    lng: 103.8465,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.2
  },
  {
    name: 'Allauddin Briyani',
    description: 'Michelin recommended chicken briyani at Tekka Centre, well balanced flavours',
    address: '665 Buffalo Rd, Tekka Centre, Singapore 210665',
    station_id: 'little-india',
    tags: ['biryani', 'indian', 'halal', 'michelin', '8days'],
    lat: 1.3065,
    lng: 103.8508,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.4
  },
  {
    name: 'Raywan Waroeng Upnormal',
    description: 'Jumbo Penyet Classic with Kampong-style deep fried chicken',
    address: '7 Maxwell Rd, Amoy Street Food Centre, Singapore 069111',
    station_id: 'tanjong-pagar',
    tags: ['indonesian', 'ayam-penyet', '8days'],
    lat: 1.2799,
    lng: 103.8465,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.1
  },
  {
    name: 'Roast Paradise',
    description: 'Excellent roast pork and char siew with Hakka Noodle',
    address: '51 Old Airport Rd, #01-121, Singapore 390051',
    station_id: 'dakota',
    tags: ['roast-meat', 'char-siew', '8days'],
    lat: 1.3085,
    lng: 103.8855,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.4
  },
  {
    name: 'Xin Mei Xiang Zheng Zong Lor Mee',
    description: 'Thick gravy lor mee at Old Airport Road Food Centre',
    address: '51 Old Airport Rd, #01-116, Singapore 390051',
    station_id: 'dakota',
    tags: ['lor-mee', 'hawker', '8days'],
    lat: 1.3085,
    lng: 103.8855,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Jin Hua Fish Head Bee Hoon',
    description: 'Fresh fish head with smooth bee hoon in milky broth',
    address: '51 Old Airport Rd, #01-120, Singapore 390051',
    station_id: 'dakota',
    tags: ['fish-soup', 'bee-hoon', '8days'],
    lat: 1.3085,
    lng: 103.8855,
    distance_to_station: 400,
    walking_time: 5,
    rating: 4.5
  },
  {
    name: 'Shang Hai Fried Xiao Long Bao',
    description: 'Freshly made pan-fried soup dumplings at Chinatown Complex',
    address: '335 Smith St, #02-205 Chinatown Complex, Singapore 050335',
    station_id: 'chinatown',
    tags: ['xiao-long-bao', 'dumplings', '8days'],
    lat: 1.2825,
    lng: 103.8442,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.3
  },
  {
    name: 'Ma La Yi Virgin Chicken',
    description: 'Mentor of Hawker Chan, succulent soya sauce chicken',
    address: '335 Smith St, #02-189 Chinatown Complex, Singapore 050335',
    station_id: 'chinatown',
    tags: ['soya-chicken', 'hawker', '8days'],
    lat: 1.2825,
    lng: 103.8442,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.2
  },
  {
    name: 'Fatty Ox HK Kitchen',
    description: 'Michelin recommended Hong Kong style dishes',
    address: '335 Smith St, #02-84 Chinatown Complex, Singapore 050335',
    station_id: 'chinatown',
    tags: ['hong-kong', 'michelin', '8days'],
    lat: 1.2825,
    lng: 103.8442,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.3
  },
  {
    name: '168 CMY Satay',
    description: 'Michelin recommended satay at Chinatown Complex',
    address: '335 Smith St, #02-168 Chinatown Complex, Singapore 050335',
    station_id: 'chinatown',
    tags: ['satay', 'michelin', '8days'],
    lat: 1.2825,
    lng: 103.8442,
    distance_to_station: 200,
    walking_time: 3,
    rating: 4.4
  },
  {
    name: 'Wow Wow West',
    description: 'Western cuisine under $10 at ABC Brickworks',
    address: '6 Jalan Bukit Merah, #01-133 ABC Brickworks, Singapore 150006',
    station_id: 'redhill',
    tags: ['western', 'budget', '8days'],
    lat: 1.2875,
    lng: 103.8165,
    distance_to_station: 500,
    walking_time: 7,
    rating: 4.0
  },
  {
    name: 'Ah Er Herbal Soup',
    description: 'Michelin Bib Gourmand nutritious soup with pumpkin rice',
    address: '6 Jalan Bukit Merah, #01-141 ABC Brickworks, Singapore 150006',
    station_id: 'redhill',
    tags: ['herbal-soup', 'michelin', '8days'],
    lat: 1.2875,
    lng: 103.8165,
    distance_to_station: 500,
    walking_time: 7,
    rating: 4.5
  },
  {
    name: 'Jin Jin Dessert',
    description: '44 hot and cold desserts including Power Chendol and Ice Jelly Soursop',
    address: '6 Jalan Bukit Merah, #01-21 ABC Brickworks, Singapore 150006',
    station_id: 'redhill',
    tags: ['dessert', 'chendol', '8days'],
    lat: 1.2875,
    lng: 103.8165,
    distance_to_station: 500,
    walking_time: 7,
    rating: 4.2
  },
  {
    name: '63 Laksa',
    description: 'Affordable laksa for $2.80 using 1960s family recipe',
    address: '20 Ghim Moh Rd, #01-20, Singapore 270020',
    station_id: 'buona-vista',
    tags: ['laksa', 'budget', '8days'],
    lat: 1.3108,
    lng: 103.7885,
    distance_to_station: 600,
    walking_time: 8,
    rating: 4.1
  }
];

// ieatishootipost recommended listings (Dr Leslie Tay)
const ieatListings = [
  {
    name: 'Mr and Mrs Mohgan Super Crispy Roti Prata',
    description: 'Super crispy roti prata at Joo Chiat, legendary breakfast spot',
    address: '300 Joo Chiat Rd, Singapore 427551',
    station_id: 'eunos',
    tags: ['roti-prata', 'breakfast', 'ieatishootipost'],
    lat: 1.3135,
    lng: 103.9025,
    distance_to_station: 800,
    walking_time: 10,
    rating: 4.5
  },
  {
    name: 'Zam Zam Restaurant',
    description: 'Over 100 years old, famous for murtabak near Sultan Mosque',
    address: '697 North Bridge Rd, Singapore 198675',
    station_id: 'bugis',
    tags: ['murtabak', 'indian', 'halal', 'ieatishootipost'],
    lat: 1.3018,
    lng: 103.8588,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.3
  },
  {
    name: 'Hillstreet Char Kway Teow',
    description: 'Dr Leslie Tay personal favourite char kway teow',
    address: '16 Bedok South Rd, Singapore 460016',
    station_id: 'bedok',
    tags: ['char-kway-teow', 'hawker', 'ieatishootipost'],
    lat: 1.3235,
    lng: 103.9302,
    distance_to_station: 550,
    walking_time: 7,
    rating: 4.4
  },
  {
    name: 'Lau Goh Teochew Chye Thow Kway',
    description: 'Pioneer of white carrot cake, rich heritage at Zion Road',
    address: '70 Zion Rd, Zion Road Food Centre, Singapore 247792',
    station_id: 'tiong-bahru',
    tags: ['carrot-cake', 'teochew', 'ieatishootipost'],
    lat: 1.2892,
    lng: 103.8305,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.3
  },
  {
    name: 'Lim Fried Oyster',
    description: 'Old school oyster omelette at Jalan Berseh Food Centre',
    address: '166 Jln Besar, Berseh Food Centre, Singapore 208877',
    station_id: 'jalan-besar',
    tags: ['oyster-omelette', 'hawker', 'ieatishootipost'],
    lat: 1.3068,
    lng: 103.8565,
    distance_to_station: 350,
    walking_time: 5,
    rating: 4.2
  },
  {
    name: 'Hock Lam Beef Noodle',
    description: 'One of Singapore oldest surviving hawker stalls at Far East Square',
    address: '45 Pekin St, Far East Square, Singapore 048775',
    station_id: 'raffles-place',
    tags: ['beef-noodles', 'heritage', 'ieatishootipost'],
    lat: 1.2845,
    lng: 103.8495,
    distance_to_station: 300,
    walking_time: 4,
    rating: 4.4
  },
  {
    name: 'Blanco Court Prawn Noodles',
    description: 'Rich prawn broth noodles, opens 7:15am to 4pm',
    address: '243 Beach Rd, Singapore 189754',
    station_id: 'bugis',
    tags: ['prawn-noodles', 'hawker', 'ieatishootipost'],
    lat: 1.3012,
    lng: 103.8603,
    distance_to_station: 450,
    walking_time: 6,
    rating: 4.3
  },
  {
    name: 'Xiao Di Hokkien Mee',
    description: 'New generation hawker with excellent wet Hokkien mee',
    address: '1 Kadayanallur St, Maxwell Food Centre, Singapore 069184',
    station_id: 'chinatown',
    tags: ['hokkien-mee', 'hawker', 'ieatishootipost'],
    lat: 1.2805,
    lng: 103.8445,
    distance_to_station: 250,
    walking_time: 3,
    rating: 4.3
  },
  {
    name: 'Hokkien Man Hokkien Mee',
    description: 'Another top Hokkien mee recommended by Dr Leslie Tay',
    address: 'Maxwell Food Centre, Singapore 069184',
    station_id: 'chinatown',
    tags: ['hokkien-mee', 'hawker', 'ieatishootipost'],
    lat: 1.2805,
    lng: 103.8445,
    distance_to_station: 250,
    walking_time: 3,
    rating: 4.2
  },
  {
    name: 'Master Prata',
    description: 'Excellent prata near town with air-conditioned seating',
    address: '21 Ghim Moh Rd, Singapore 270021',
    station_id: 'buona-vista',
    tags: ['roti-prata', 'indian', 'ieatishootipost'],
    lat: 1.3108,
    lng: 103.7885,
    distance_to_station: 600,
    walking_time: 8,
    rating: 4.1
  }
];

// Overlap names to link as secondary sources
const getFedOverlaps = [
  'Song Fa Bak Kut Teh',
  'Tian Tian Hainanese Chicken Rice',
  'A Noodle Story',
  'Lian He Ben Ji Claypot Rice',
  'Hong Heng Fried Sotong Prawn Mee'
];

const eightDaysOverlaps = [
  'Tian Tian Hainanese Chicken Rice',
  'Hong Heng Fried Sotong Prawn Mee',
  'Jian Bo Tiong Bahru Shui Kueh',
  'Tai Wah Pork Noodle',
  'Outram Park Fried Kway Teow Mee',
  'Song Fa Bak Kut Teh'
];

const ieatOverlaps = [
  'Tian Tian Hainanese Chicken Rice',
  'Hill Street Tai Hwa Pork Noodle',
  'Hong Heng Fried Sotong Prawn Mee',
  'Nam Sing Hokkien Fried Mee',
  'Outram Park Fried Kway Teow Mee',
  'Geylang Lor 29 Hokkien Mee'
];

async function addSource(id, name, weight) {
  const { data: existing } = await supabase.from('food_sources').select('id').eq('id', id).single();
  if (!existing) {
    console.log(`Adding source: ${name}...`);
    await supabase.from('food_sources').insert({ id, name, weight, is_curated: true });
  }
}

async function linkOverlaps(sourceId, overlaps, sourceName) {
  console.log(`\n--- Linking ${sourceName} to existing listings ---\n`);

  for (const name of overlaps) {
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', '%' + name.replace(/'/g, "''") + '%');

    if (listings && listings.length > 0) {
      for (const listing of listings) {
        const { data: existingSources } = await supabase
          .from('listing_sources')
          .select('id')
          .eq('listing_id', listing.id)
          .eq('source_id', sourceId);

        if (!existingSources || existingSources.length === 0) {
          const { error } = await supabase.from('listing_sources').insert({
            listing_id: listing.id,
            source_id: sourceId,
            is_primary: false
          });

          if (!error) {
            console.log(`Linked ${sourceName} to:`, listing.name);
          }
        }
      }
    }
  }
}

async function addListings(listings, sourceId, sourceName) {
  console.log(`\n--- Adding new ${sourceName} listings ---\n`);

  let added = 0;
  let skipped = 0;

  for (const listing of listings) {
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

    const { data, error } = await supabase
      .from('food_listings')
      .insert({
        name: listing.name,
        description: listing.description,
        address: listing.address,
        station_id: listing.station_id,
        source_id: sourceId,
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

      await supabase.from('listing_sources').insert({
        listing_id: data.id,
        source_id: sourceId,
        is_primary: true
      });
    }
  }

  return { added, skipped };
}

async function main() {
  console.log('=== ADDING OTHER CURATED SOURCES ===\n');

  // Add sources
  await addSource('get-fed', 'Get-Fed / Food King', 50);
  await addSource('8days', '8days', 45);
  await addSource('ieatishootipost', 'ieatishootipost', 55);

  // Link overlaps
  await linkOverlaps('get-fed', getFedOverlaps, 'Get-Fed');
  await linkOverlaps('8days', eightDaysOverlaps, '8days');
  await linkOverlaps('ieatishootipost', ieatOverlaps, 'ieatishootipost');

  // Add new listings
  const gfResult = await addListings(getFedListings, 'get-fed', 'Get-Fed');
  const edResult = await addListings(eightDaysListings, '8days', '8days');
  const ieResult = await addListings(ieatListings, 'ieatishootipost', 'ieatishootipost');

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Get-Fed: Added', gfResult.added, ', Skipped', gfResult.skipped);
  console.log('8days: Added', edResult.added, ', Skipped', edResult.skipped);
  console.log('ieatishootipost: Added', ieResult.added, ', Skipped', ieResult.skipped);

  const { count: totalCount } = await supabase.from('food_listings').select('*', { count: 'exact', head: true });
  console.log('\nTotal listings now:', totalCount);

  const { data: bySource } = await supabase.from('food_listings').select('source_id');
  const sourceCounts = {};
  bySource.forEach(l => {
    sourceCounts[l.source_id] = (sourceCounts[l.source_id] || 0) + 1;
  });
  console.log('\nListings by primary source:');
  Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log('  ' + s + ': ' + c));
}

main();

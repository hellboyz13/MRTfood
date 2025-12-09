const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Supper Spots from Time Out Singapore "25 Best Late Night Eats"
// All listings tagged with "Supper" (displayed as "Supper" in UI, stored as "24 hour" for is_24h=true)

async function addSupperSpots() {
  const supperSpots = [
    // 24/7 SPOTS (3)
    {
      name: 'Lang Nuong Vietnam',
      address: '271 Jln Besar, Singapore 208941',
      lat: 1.3095,
      lng: 103.8578,
      station_id: 'farrer-park',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Vietnamese BBQ', '24 hour'],
      description: '24hr authentic Vietnamese BBQ. Serves bun cha, pho, grilled meats',
      is_24h: true
    },
    {
      name: 'Ming Fa Fishball Noodles',
      address: '246B Upper Thomson Rd, Singapore 574370',
      lat: 1.3545,
      lng: 103.8330,
      station_id: 'upper-thomson',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Fishball Noodles', '24 hour'],
      description: '24hr fishball noodles with Fu Zhou fishballs stuffed with pork',
      is_24h: true
    },
    {
      name: 'Srisun Express',
      address: '56 Serangoon Garden Way, Singapore 555952',
      lat: 1.3630,
      lng: 103.8657,
      station_id: 'lorong-chuan',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Prata', 'Indian', '24 hour'],
      description: '24hr South and North Indian comfort food. Prata, maggi goreng, teh tarik',
      is_24h: true
    },

    // OPENS TILL 4AM+ (5)
    {
      name: 'Swee Choon',
      address: '183-193 Jln Besar, Singapore 208882',
      lat: 1.30816,
      lng: 103.85697,
      station_id: 'farrer-park',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Dim Sum', 'Late Night'],
      description: 'Cult supper hotspot known for fuss-free dim sum. Opens till 4am',
      is_24h: false
    },
    {
      name: 'Good Bites',
      address: '5 Bishan St 14, #03-01, Singapore 579783',
      lat: 1.35558,
      lng: 103.85133,
      station_id: 'bishan',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Western', 'Cafe', 'Late Night'],
      description: 'Opens till 5am. Tom yum pasta, chicken waffles, molten lava cake',
      is_24h: false
    },
    {
      name: 'Chong Pang Nasi Lemak',
      address: '447 Sembawang Rd, Singapore 758404',
      lat: 1.4305,
      lng: 103.8259,
      station_id: 'yishun',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Nasi Lemak', 'Late Night'],
      description: 'Popular nasi lemak with cai peng style selection. Opens till 6am',
      is_24h: false
    },
    {
      name: 'Joo Seng Teochew Porridge',
      address: '14 Cheong Chin Nam Rd, Singapore 599738',
      lat: 1.3430,
      lng: 103.7752,
      station_id: 'beauty-world',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Teochew Porridge', 'Late Night'],
      description: 'Opens till 4am. Famous braised duck leg and minced pork with black bean',
      is_24h: false
    },
    {
      name: 'Eminent Frog Porridge',
      address: '323 Geylang Rd, Singapore 389359',
      lat: 1.31274,
      lng: 103.87927,
      station_id: 'aljunied',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Frog Porridge', 'Michelin Bib Gourmand', 'Late Night'],
      description: 'Michelin Bib Gourmand. Famous kung pao frog legs since 2004. Opens till 3:30am',
      is_24h: false
    },

    // REGULAR LATE NIGHT (12)
    {
      name: 'Al-Azhar',
      address: '11 Cheong Chin Nam Rd, Singapore 599736',
      lat: 1.34293,
      lng: 103.77515,
      station_id: 'beauty-world',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Prata', 'Indian', 'Halal', 'Late Night'],
      description: 'Halal prata joint. Known for garlic naan and butter chicken. Opens till 3am',
      is_24h: false
    },
    {
      name: 'Yaowarat Thai Kway Chap',
      address: '945 Upper Serangoon Rd, Singapore 534711',
      lat: 1.3582,
      lng: 103.8876,
      station_id: 'kovan',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Thai', 'Kway Chap', 'Late Night'],
      description: 'Authentic Thai kway chap with rolled flat noodles and peppery broth. Opens till 3am',
      is_24h: false
    },
    {
      name: 'Beach Road Scissors Cut Curry Rice',
      address: '229 Jln Besar, Singapore 208905',
      lat: 1.30954,
      lng: 103.85777,
      station_id: 'farrer-park',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Curry Rice', 'Hainanese', 'Late Night'],
      description: 'Iconic Hainanese curry rice. Gooey curry with crispy pork chop. Opens till 2:30am',
      is_24h: false
    },
    {
      name: 'Sin Hoi Sai Eating House',
      address: '187 E Coast Rd, Singapore 428893',
      lat: 1.30708,
      lng: 103.90631,
      station_id: 'dakota',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Zi Char', 'Seafood', 'Late Night'],
      description: 'Old-school zi char. Known for chilli crab, Guinness pork ribs. Opens till 3am',
      is_24h: false
    },
    {
      name: 'The Roti Prata House',
      address: '246 Upper Thomson Rd, Singapore 574370',
      lat: 1.3545,
      lng: 103.8330,
      station_id: 'upper-thomson',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Prata', 'Late Night'],
      description: 'Long-standing prata house. Classic egg, plain to banana chocolate. Opens till 2-4am',
      is_24h: false
    },
    {
      name: 'Hong Chang Frog Porridge',
      address: '2 Braddell Rd, Singapore 359895',
      lat: 1.3392,
      lng: 103.8705,
      station_id: 'woodleigh',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Frog Porridge', 'BBQ', 'Late Night'],
      description: 'Famous for sambal stingray and kung pao frog legs. Opens till 2am',
      is_24h: false
    },
    {
      name: 'Finest Song Kee Fishball Noodles',
      address: '532 Upper Serangoon Rd, Singapore 534547',
      lat: 1.3514,
      lng: 103.8762,
      station_id: 'serangoon',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Fishball Noodles', 'Late Night'],
      description: 'Handmade fishballs with translucent chewy skin dumplings. Opens till 1am',
      is_24h: false
    },
    {
      name: 'Ponggol Nasi Lemak',
      address: '965 Upper Serangoon Rd, Singapore 534721',
      lat: 1.3582,
      lng: 103.8900,
      station_id: 'kovan',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Nasi Lemak', 'Late Night'],
      description: 'Cult following. Known for fried chicken wing and hae bee sambal. Opens till 12am',
      is_24h: false
    },
    {
      name: 'Supper Deck',
      address: '298 Bedok Rd, Singapore 469454',
      lat: 1.3269,
      lng: 103.9330,
      station_id: 'bedok',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Western', 'Mixed', 'Late Night'],
      description: 'Simpang Bedok bistro. Nasi goreng with brisket, Philly cheesesteaks. Opens till 1:30am',
      is_24h: false
    },
    {
      name: 'The Ramen Stall',
      address: '787 N Bridge Rd, Singapore 198755',
      lat: 1.3034,
      lng: 103.8610,
      station_id: 'bugis',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Japanese', 'Ramen', 'Late Night'],
      description: 'Late night ramen spot with sushi and teppanyaki options. Opens till 1-2am',
      is_24h: false
    },
    {
      name: 'The Dim Sum Place',
      address: '791 N Bridge Rd, Singapore 198759',
      lat: 1.3035,
      lng: 103.8612,
      station_id: 'bugis',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Dim Sum', 'Halal', 'Late Night'],
      description: 'Halal-certified dim sum. Xiao long bao, salted egg custard buns. Opens till 11pm-2am',
      is_24h: false
    },
    {
      name: 'Fei Fei Wonton Noodle',
      address: '45 Joo Chiat Pl, Singapore 427769',
      lat: 1.3118,
      lng: 103.9025,
      station_id: 'paya-lebar',
      source_id: 'timeout-supper',
      tags: ['Supper', 'Wonton Noodles', 'Late Night'],
      description: 'Longstanding char siew noodles. Famous homemade crispy fried wontons. Opens till 2:30am',
      is_24h: false
    }
  ];

  console.log(`Adding ${supperSpots.length} supper spots...`);

  let added = 0;
  let skipped = 0;

  for (const spot of supperSpots) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', spot.name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`SKIP (exists): ${spot.name}`);
      skipped++;
      continue;
    }

    // Insert new listing (no source_id to avoid FK constraint)
    const { error } = await supabase
      .from('food_listings')
      .insert({
        name: spot.name,
        address: spot.address,
        lat: spot.lat,
        lng: spot.lng,
        station_id: spot.station_id,
        tags: spot.tags,
        description: spot.description,
        is_24h: spot.is_24h,
        is_active: true
      });

    if (error) {
      console.error(`ERROR adding ${spot.name}:`, error.message);
    } else {
      console.log(`ADDED: ${spot.name} (${spot.station_id})`);
      added++;
    }
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}`);
}

addSupperSpots();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Names to add Dessert tag (from your tagged CSV with Y)
const DESSERT_NAMES = [
  '22 Grams Coffee',
  '99 Old Trees Durian',
  'ARTEASG',
  'AcaiGuru',
  'An Açaí Affair',
  'An Açaí Affair (Waterway Point)',
  'An Açaí Affair - Hillion Mall',
  'Apartment Coffee',
  'Apiary',
  'Arteastiq @ Mandarin Gallery',
  'Atlas Coffeehouse',
  'Bacha Coffee ION Orchard',
  'Bacha Coffee Republic Plaza',
  "Bear's Cafe",
  'Beutea 茶仙子 @ City Square Mall',
  'Blue Bottle Coffee',
  'Boost Juice @ Rivervale Mall',
  'Borderless Coffee',
  'Bosong Rice Cake',
  'Brawn & Brains Coffee',
  'Burnt Cones',
  'Burpple Cafe',
  "C Australia's Coffee Club - Millenia Walk",
  'CAFE SHOKO',
  'COFFEESARANG',
  'Cafe Bakeaholic',
  'Cafe Gui',
  'Café Carrera',
  'Café Cartisan Specialty Coffee',
  'Clayful Cafe | Art Cafe | Pottery & Glass Painting | Orchard Central',
  'Coexist Coffee Co.',
  'Coffee 168',
  'Common Man Coffee Roasters',
  'Common Man Coffee Roasters - On The Go',
  'Commune Café',
  'Compose Coffee One Raffles Place',
  'Creamed',
  'Deliz Cafe',
  'Dutch Colony Coffee Co.',
  'Eden Cafe',
  'Elijah Pies',
  'Enchanted Cafe',
  "Ernie's Coffee",
  'FYP (For You People) Cafe',
  'FYP (For You People) Cafe - Orchard Central',
  "Fiie's Cafe",
  "Fiie's Cafe (Mister Grumpy)",
  'Five Oars Coffee Roasters',
  'Fore Coffee - The Cathay',
  'GREYBOX COFFEE @ GREAT WORLD CITY',
  'GREYBOX COFFEE @ UE Square',
  'GREYBOX COFFEE @ i12 Katong',
  'Grab & Gold® Café @ GV Funan',
  'Guerilla Coffee @ Suntec',
  'Huggs Coffee',
  'Hundred Acre Creamery',
  'Hvala',
  'Hvala 111 Somerset',
  'Hvala Kissa',
  'Isle Cafe (FEP)',
  'Juice Farm (The Seletar Mall)',
  'June Coffee',
  'Kenangan Coffee AMK Hub',
  'Kenangan Coffee Compass One',
  'Kenangan Coffee IMM',
  'Kenangan Coffee Raffles City',
  'Kenangan Coffee Tampines Mall',
  'Kind Kones',
  'Knockhouse Cafe',
  'Knots Cafe & Living',
  'La Levain',
  'Little Farms Cafe, One Raffles Place',
  'Little Rogue Coffee',
  "Lola's Cafe",
  'Long Black Cafe',
  'Louisa Coffee',
  'Luckin Coffee - Marina Square',
  'M5 Coffee Singapore',
  'MAVRX COFFEE',
  'Madlygood Japanese Cafe',
  'Marimekko Cafe & Concept Store',
  'Matchaya',
  'Maxi Coffee Bar',
  'Mr Bucket Chocolaterie',
  'My Awesome Cafe',
  'Nunsaram Korean Dessert Café',
  'Nylon Coffee Roasters',
  "O'Coffee Club Indulgence (Paragon)",
  'OLLA Specialty Coffee',
  'Old Hen Coffee',
  'One@KentRidge - Huggs Coffee',
  'PS.Cafe (Harding Road)',
  'PS.Cafe Katong',
  'PS.Cafe Paragon',
  'Pinhole Coffee Bar',
  'Plain Vanilla (Tiong Bahru)',
  'Puzzle Coffee',
  "Ralph's Coffee Shaw Centre",
  "Ralph's Coffee Marina Bay Sands",
  'SOD Cafe',
  'September Coffee',
  'Sinpopo Coffee @ Funan',
  'Sugarsmith',
  'Sync Haus Café',
  'TCA Prologue (Tea. Coffee. Artisans) @ Millenia Walk',
  'TWG Tea Garden at Marina Bay Sands',
  'TWG Tea at ION Orchard',
  'TWG Tea on the Bay at Marina Bay Sands',
  'Tanamera Coffee Marina Square',
  'Tanamera Coffee Tanglin Mall',
  'Tang Tea House (Marina Square)',
  'Tea Chapter',
  'The Coffee Bean & Tea Leaf',
  'The Coffee Bean & Tea Leaf - Bedok Mall',
  'The Coffee Bean & Tea Leaf - Compass One Level 3',
  'The Coffee Bean and Tea Leaf',
  'The Coffee Bean and Tea Leaf (Waterway Point)',
  'The Coffee Bean and Tea Leaf - Causeway Point',
  'The Community Coffee',
  'The Living Cafe',
  'The Marmalade Pantry - Cafe Bistro @ Anchorpoint',
  'The Marmalade Pantry - Cafe Bistro @ ION Orchard',
  'The Populus Coffee and Food Co',
  'The Tea Party Cafe',
  'Thus Coffee',
  'Tiong Hoe Specialty Coffee (SingPost Centre)',
  "Tolido's Espresso Nook",
  'Trehaus Cafe',
  'Wanderlust Cafe Tanglin',
  'Warm Up Cafe',
  'Warm Up Cafe @ The Star Vista',
  'Whiskdom',
  'Wild Honey',
  'Wildseed Cafe',
  'Windowsill Pies',
  'Wishes Cafe',
  'YOUNIQUE Café Singapore Paragon',
  'café nesuto @ ION Orchard',
  'dal.komm COFFEE @ MS',
  'dal.komm.COFFEE @ Funan',
  'grab & Gold® Café @ GV Paya Lebar',
  'habit + matchabar (ICON)',
  'love, joy & coffee',
  'luckin coffee - One Raffles Place Tower 2',
  'luckin coffee - Parkway Lebar',
  'luckin coffee - Parkway Parade',
  'luckin coffee - Plaza Singapura',
  'luckin coffee - Rivervale Mall',
  'luckin coffee - The Poiz Centre',
  'luckin coffee - UE Square',
  'luckin coffee - VivoCity',
  'luckin coffee - West Mall',
];

async function applyDessertTags() {
  console.log('='.repeat(60));
  console.log('APPLYING DESSERT TAGS FROM CSV');
  console.log('='.repeat(60));
  console.log(`\nProcessing ${DESSERT_NAMES.length} names to add Dessert tag...\n`);

  let listingsUpdated = 0;
  let outletsUpdated = 0;
  let notFound = [];

  for (const name of DESSERT_NAMES) {
    // Try food_listings first
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name, tags')
      .ilike('name', name);

    if (listings && listings.length > 0) {
      for (const listing of listings) {
        const currentTags = listing.tags || [];
        if (!currentTags.includes('Dessert')) {
          const newTags = [...currentTags, 'Dessert'];
          const { error } = await supabase
            .from('food_listings')
            .update({ tags: newTags })
            .eq('id', listing.id);

          if (!error) {
            listingsUpdated++;
            console.log(`  + Listing: ${listing.name}`);
          }
        }
      }
    }

    // Try mall_outlets
    const { data: outlets } = await supabase
      .from('mall_outlets')
      .select('id, name, tags')
      .ilike('name', name);

    if (outlets && outlets.length > 0) {
      for (const outlet of outlets) {
        const currentTags = outlet.tags || [];
        if (!currentTags.includes('Dessert')) {
          const newTags = [...currentTags, 'Dessert'];
          const { error } = await supabase
            .from('mall_outlets')
            .update({ tags: newTags })
            .eq('id', outlet.id);

          if (!error) {
            outletsUpdated++;
            console.log(`  + Outlet: ${outlet.name}`);
          }
        }
      }
    }

    // Track if not found in either
    if ((!listings || listings.length === 0) && (!outlets || outlets.length === 0)) {
      notFound.push(name);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Listings updated: ${listingsUpdated}`);
  console.log(`Outlets updated: ${outletsUpdated}`);
  console.log(`Total: ${listingsUpdated + outletsUpdated}`);

  if (notFound.length > 0) {
    console.log(`\nNot found (${notFound.length}):`);
    notFound.forEach(n => console.log(`  - ${n}`));
  }
}

applyDessertTags().catch(console.error);

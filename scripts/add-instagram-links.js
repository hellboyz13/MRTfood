const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Instagram links from Get-Fed CSV data
const instagramLinks = {
  "Tracy's Sarawak Kitchen": "https://bit.ly/tracyssarawakkitchen",
  "Estuary Restaurant & Bar": "https://bit.ly/estuaryrestaurantandbar",
  "Kantin at Jewel": "https://bit.ly/kantinatjewel",
  "Inle Myanmar Restaurant": "https://bit.ly/inlemyanmarrestaurant",
  "Scaled by Ah Hua Kelong": "https://bit.ly/scaledbyahhuakelongig",
  "Heng Heng Boneless Duck Rice": "https://bit.ly/henghengbonelessduckrice",
  "Braise": "https://bit.ly/braisegoldenmile",
  "Legacy Pork Noodles": "https://bit.ly/legacyporknoodles",
  "Whole Earth": "https://bit.ly/wholeearthsingapore",
  "elemen": "https://bit.ly/elemenyuansu",
  "Shrimp Prawn Seafood": "https://bit.ly/shrimpprawnseafood",
  "Zhen Zheng Handmade Pau": "https://bit.ly/zhenzhenghandmadepau",
  "Soi Thai Kitchen": "https://bit.ly/soithaikitchen",
  "Hey Kee HK Seafood": "https://bit.ly/heykeeseafood",
  "Song Fa Signatures": "https://bit.ly/songfasignatures",
  "An La Ghien Buffet": "https://bit.ly/anlaghienviet",
  "Indocafe Peranakan Dining": "https://bit.ly/indocafeperanakandining",
  "Na Na Curry": "https://bit.ly/nanacurry",
  "Krapow Thai Kitchen": "https://bit.ly/krapowthaikitchen",
  "Boon Tong Kee": "https://bit.ly/boontongkeegrab",
  "Thai Village Restaurant": "https://bit.ly/thaivillagerestaurant",
  "Zhup Zhup": "https://bit.ly/zhupzhupgetfed",
  "Jason Penang Cuisine": "https://bit.ly/jasonpenangcuisine",
  "Onalu Bagel Haus": "https://bit.ly/onalusg",
  "Park's Kitchen": "https://bit.ly/parkskitchensg",
  "The Tea Party Cafe": "https://bit.ly/theteapartycafe",
  "Nasi Lemak Ayam Taliwang": "https://bit.ly/nasilemakayamtaliwang",
  "Ima Sushi": "https://bit.ly/imasushi",
  "Classic Cakes": "https://bit.ly/classiccakessg",
  "A Hot Hideout": "https://bit.ly/ahothideout",
  "Dickson Nasi Lemak": "https://bit.ly/3NvBfea",
  "Petit Pain Bakery": "https://bit.ly/3Xd4AgL",
  "SYIP": "https://bit.ly/syip",
  "XLX Modern Tze Char": "https://bit.ly/XLXTzeChar",
  "Enjoy Eating House": "https://bit.ly/EnjoyEatingHouse",
  "Charcoal Fish Head Steamboat": "https://bit.ly/CharcoalFishSteamboat",
  "Tea Chapter": "https://bit.ly/teachapterig",
  "J.B. Ah Meng Restaurant": "https://bit.ly/jbahmeng",
  "Seng Kee Black Chicken Herbal Soup": "https://bit.ly/sengkeeblackchickenherbalsoup",
  "Munchi Pancakes": "https://bit.ly/munchipancakes",
  "Thunderbolt Tea by Boon Lay Traditional Hakka Lui Cha": "https://bit.ly/thunderboltteasg",
  "Tan Ser Seng Herbs Restaurant": "https://bit.ly/tansersengherbsig",
  "Crispy Wings! Western Delights": "https://bit.ly/crispywingsig",
  "Mahmad's Tandoor": "https://bit.ly/mahmudtandoor",
  "Bistro Eminami Halal Vietnam": "https://bit.ly/eminamisg",
  "Mihrimah Restaurant": "https://bit.ly/mihrimahsg",
  "Mr Blecky Seafood": "https://bit.ly/MrBleckySeafood",
  "Ellenborough Market Cafe": "https://bit.ly/EllenboroughParadox",
  "Xin Kee Hong Kong Cheong Fun": "https://bit.ly/xinkeecheongfun",
  "Lau Wang Claypot Delights": "https://bit.ly/lauwangclaypot",
  "Jade's Chicken": "https://bit.ly/jadeschicken",
  "NiuNiu Tea & DuDu Rice": "https://bit.ly/niuniuteadudurice",
  "Pondok Selera by Nurul Hidayah": "https://bit.ly/pondokselerabynurulhidayah",
  "Long House Soon Kee Boneless Braised Duck": "https://bit.ly/longhousesoonkee",
  "8889 Ji Gong Bao": "https://bit.ly/8889jigongbao",
  "Chingu @ The Oval": "https://bit.ly/chinguoval",
  "Yakiniku Warrior": "https://bit.ly/yakinikuwarriorIG",
  "Overrice": "https://bit.ly/overriceig",
  "OUD Restaurant": "https://bit.ly/oudig",
  "Dajie Makan Place": "https://bit.ly/dajiemakanplace",
  "Phuket Town Mookata": "https://bit.ly/phukettownmookataamk",
  "The Ramen House": "https://bit.ly/theramenhouse",
  "San Shu Gong Private Dining": "https://bit.ly/sanshugongprivatedining",
  "Hamburg Steak Keisuke": "https://bit.ly/hamburgsteakkeisuke",
  "Yang Ming Seafood": "https://bit.ly/yangmingseafoodsingapore",
  "Hor Fun Premium": "https://bit.ly/horfunpremium",
  "Jin Pai Zi Char": "https://bit.ly/jinpaizichar",
  "Lau Phua Chay Authentic Roasted Delicacies": "https://bit.ly/lauphuachay",
  "Sumo Bar Happy": "https://bit.ly/sumobarhappy",
  "Gyushi": "https://bit.ly/gyushisg",
  "Standing Sushi Bar": "https://bit.ly/standingsushibar",
  "Creme by Lele Bakery": "https://bit.ly/creme_sg",
  "Yat Ka Yan": "https://bit.ly/yatkayanig",
  "Sourbombe Artisinal Bakery": "https://bit.ly/sourbombeig",
  "Cherry & Oak": "https://bit.ly/cherryandoak",
  "TANOKE": "https://bit.ly/tanoke",
  "JU95": "https://bit.ly/ju95",
  "Yao Cutlet": "https://bit.ly/yaocutletstall",
  "Sodam Korean Restaurant": "https://bit.ly/sodamkoreanrestaurant",
  "Suk's Thai Kitchen": "https://bit.ly/suksthaikitchen",
  "Mookata Eating House": "https://bit.ly/mookataeatinghouse",
  "Tien Court Restaurant": "https://bit.ly/tiencourtig",
  "Goldenroy Sourdough Pizza": "https://bit.ly/goldenroyig",
  "Cafe Gui": "https://bit.ly/cafeguiig",
  "Auntie Anne's": "https://bit.ly/auntieannesig",
  "Luna": "https://bit.ly/lunainstagram",
  "RUBATO": "https://bit.ly/rubatoig",
  "Lo Hey HK Seafood": "https://youtu.be/k6NhlHdyQ-M",
  "La Bottega Enoteca": "https://youtu.be/-o_poyKPVQM",
};

async function addInstagramLinks() {
  console.log('Adding Instagram links to food_listings...\n');

  let updated = 0;
  let notFound = 0;

  for (const [name, instagramUrl] of Object.entries(instagramLinks)) {
    // Skip NIL or empty
    if (!instagramUrl || instagramUrl === 'NIL') continue;

    // Find the listing by name
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', `%${name}%`);

    if (listings && listings.length > 0) {
      // Update the first match
      const { error } = await supabase
        .from('food_listings')
        .update({ instagram_url: instagramUrl })
        .eq('id', listings[0].id);

      if (!error) {
        console.log(`✓ ${listings[0].name}`);
        updated++;
      } else {
        console.log(`✗ ${name}: ${error.message}`);
      }
    } else {
      console.log(`? Not found: ${name}`);
      notFound++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);

  // Count total with instagram
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .not('instagram_url', 'is', null);

  console.log(`Total listings with Instagram: ${count}`);
}

addInstagramLinks();

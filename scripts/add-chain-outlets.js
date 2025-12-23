const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CSV data - parsed from the provided file
const outlets = [
  // Ah Chew Desserts (2 - only 1 in mall)
  { name: "Ah Chew Desserts", mall: "Cineleisure", address: "8 Grange Road #01-03 Singapore 239695" },
  // Birds of Paradise (6 - only 1 in mall)
  { name: "Birds of Paradise", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #01-254 Singapore 819666" },
  // Chagee (11 - most in malls)
  { name: "Chagee", mall: "Orchard Gateway", address: "277 Orchard Road #01-18 Singapore 238858" },
  { name: "Chagee", mall: "Plaza Singapura", address: "68 Orchard Road #01-58/59 Singapore 238839" },
  { name: "Chagee", mall: "Raffles City", address: "252 North Bridge Road #01-15 Singapore 179101" },
  { name: "Chagee", mall: "One Raffles Place", address: "1 Raffles Place #01-01/14/15 Singapore 048616" },
  { name: "Chagee", mall: "VivoCity", address: "1 HarbourFront Walk #01-K15 Singapore 098585" },
  { name: "Chagee", mall: "Bugis+", address: "201 Victoria Street #05-09 Singapore 188067" },
  { name: "Chagee", mall: "Wisma Atria", address: "435 Orchard Road #B1-02 Singapore 238877" },
  { name: "Chagee", mall: "Ngee Ann City", address: "391 Orchard Road #B2 Singapore 238873" },
  { name: "Chagee", mall: "Suntec City", address: "3 Temasek Boulevard Singapore 038983" },
  { name: "Chagee", mall: "ION Orchard", address: "2 Orchard Turn #B4 Singapore 238801" },
  // Ippudo (12 - most in malls)
  { name: "Ippudo", mall: "Mandarin Gallery", address: "333A Orchard Road #04-02/03/04 Singapore 238897" },
  { name: "Ippudo", mall: "Westgate", address: "3 Gateway Drive #03-03 Singapore 608532" },
  { name: "Ippudo", mall: "Shaw Centre", address: "1 Scotts Road #04-22/23 Singapore 228208" },
  { name: "Ippudo", mall: "Shoppes at Marina Bay Sands", address: "2 Bayfront Avenue #B2-54/55 Singapore 018972" },
  { name: "Ippudo", mall: "The Star Vista", address: "1 Vista Exchange Green #02-19 Singapore 138617" },
  { name: "Ippudo", mall: "Raffles City", address: "252 North Bridge Road #B1-61/62 Singapore 179101" },
  { name: "Ippudo", mall: "i12 Katong", address: "112 East Coast Road #01-04 Singapore 428802" },
  { name: "Ippudo", mall: "Clarke Quay Central", address: "6 Eu Tong Sen Street #01-61/62 Singapore 059817" },
  // Tim Ho Wan (12 - most in malls)
  { name: "Tim Ho Wan", mall: "Aperia Mall", address: "12 Kallang Avenue #01-01/02/03 Singapore 339511" },
  { name: "Tim Ho Wan", mall: "Great World", address: "1 Kim Seng Promenade #01-139 Singapore 237994" },
  { name: "Tim Ho Wan", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #02-223 Singapore 819666" },
  { name: "Tim Ho Wan", mall: "Shoppes at Marina Bay Sands", address: "2 Bayfront Avenue #B2-02/03/04 Singapore 018972" },
  { name: "Tim Ho Wan", mall: "Plaza Singapura", address: "68 Orchard Road #01-29A/52 Singapore 238839" },
  { name: "Tim Ho Wan", mall: "Waterway Point", address: "83 Punggol Central #01-62 Singapore 828761" },
  { name: "Tim Ho Wan", mall: "Westgate", address: "3 Gateway Drive #01-13/14 Singapore 608532" },
  { name: "Tim Ho Wan", mall: "Tampines 1", address: "10 Tampines Central 1 #01-43/44 Singapore 529536" },
  { name: "Tim Ho Wan", mall: "i12 Katong", address: "112 East Coast Road #02-01/02 Singapore 428802" },
  { name: "Tim Ho Wan", mall: "CityLink Mall", address: "1 Raffles Link #B1-63/63A Singapore 039393" },
  { name: "Tim Ho Wan", mall: "Suntec City", address: "3 Temasek Boulevard #02-389/390 Singapore 038983" },
  // Paris Baguette (14 - most in malls)
  { name: "Paris Baguette", mall: "313@Somerset", address: "313 Orchard Road #01-27 Singapore 238895" },
  { name: "Paris Baguette", mall: "AMK Hub", address: "53 Ang Mo Kio Avenue 3 #B1-25/26 Singapore 569933" },
  { name: "Paris Baguette", mall: "Bugis Junction", address: "200 Victoria Street #B1-24/25 Singapore 188021" },
  { name: "Paris Baguette", mall: "ION Orchard", address: "2 Orchard Turn #B1-15B Singapore 238801" },
  { name: "Paris Baguette", mall: "Jem", address: "50 Jurong Gateway Road #02-20/21 Singapore 608549" },
  { name: "Paris Baguette", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #02-200 Singapore 819666" },
  { name: "Paris Baguette", mall: "NEX", address: "23 Serangoon Central #01-67 Singapore 556083" },
  { name: "Paris Baguette", mall: "Northpoint City", address: "930 Yishun Avenue 2 #02-16/17 Singapore 769098" },
  { name: "Paris Baguette", mall: "Paya Lebar Quarter", address: "10 Paya Lebar Road #01-03/05/06 Singapore 409057" },
  { name: "Paris Baguette", mall: "Raffles City", address: "252 North Bridge Road #01-46/47/48 Singapore 179103" },
  { name: "Paris Baguette", mall: "Suntec City", address: "3 Temasek Boulevard #B1-138 Singapore 038983" },
  { name: "Paris Baguette", mall: "Bedok Mall", address: "311 New Upper Changi Road #01-31 Singapore 467360" },
  // Shake Shack (10 - some in malls)
  { name: "Shake Shack", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #02-256 Singapore 819666" },
  { name: "Shake Shack", mall: "Suntec City", address: "3 Temasek Boulevard #01-357 Singapore 038983" },
  { name: "Shake Shack", mall: "VivoCity", address: "1 HarbourFront Walk #01-163/164 Singapore 098585" },
  { name: "Shake Shack", mall: "Great World", address: "1 Kim Seng Promenade #01-101 Singapore 237994" },
  { name: "Shake Shack", mall: "Westgate", address: "3 Gateway Drive #01-K1/K2 Singapore 608532" },
  { name: "Shake Shack", mall: "Junction 8", address: "9 Bishan Place #01-51 Singapore 579837" },
  // Yakiniku Like (10 - all in malls)
  { name: "Yakiniku Like", mall: "313@Somerset", address: "313 Orchard Road #B2-01 Singapore 238895" },
  { name: "Yakiniku Like", mall: "AMK Hub", address: "53 Ang Mo Kio Avenue 3 #B1-21 Singapore 569933" },
  { name: "Yakiniku Like", mall: "Bukit Panjang Plaza", address: "1 Jelebu Road #02-16 Singapore 677743" },
  { name: "Yakiniku Like", mall: "Compass One", address: "1 Sengkang Square #04-06 Singapore 545078" },
  { name: "Yakiniku Like", mall: "Junction 8", address: "9 Bishan Place #01-40 Singapore 579837" },
  { name: "Yakiniku Like", mall: "The Clementi Mall", address: "3155 Commonwealth Avenue West #05-35/36/37 Singapore 129588" },
  { name: "Yakiniku Like", mall: "Paya Lebar Quarter", address: "10 Paya Lebar Road #B1-28 Singapore 409057" },
  { name: "Yakiniku Like", mall: "Suntec City", address: "3 Temasek Boulevard #B1-129 Singapore 038983" },
  { name: "Yakiniku Like", mall: "VivoCity", address: "1 HarbourFront Walk #02-60 Singapore 098585" },
  { name: "Yakiniku Like", mall: "Westgate", address: "3 Gateway Drive Singapore 608532" },
  // Playmade (17 - most in malls)
  { name: "Playmade", mall: "313@Somerset", address: "313 Orchard Road #B3-08 Singapore 238895" },
  { name: "Playmade", mall: "AMK Hub", address: "53 Ang Mo Kio Avenue 3 #B1-51B Singapore 569933" },
  { name: "Playmade", mall: "Jurong Point", address: "1 Jurong West Central 2 #B1-36A Singapore 648886" },
  { name: "Playmade", mall: "NEX", address: "23 Serangoon Central #04-17 Singapore 556083" },
  { name: "Playmade", mall: "Northpoint City", address: "1 Northpoint Drive #01-154 Singapore 768019" },
  { name: "Playmade", mall: "Paya Lebar Quarter", address: "10 Paya Lebar Road #B2-K5 Singapore 409057" },
  { name: "Playmade", mall: "Suntec City", address: "3 Temasek Boulevard #B1-151 Singapore 038983" },
  { name: "Playmade", mall: "Tampines 1", address: "10 Tampines Central 1 #01-59 Singapore 529536" },
  { name: "Playmade", mall: "The Seletar Mall", address: "33 Sengkang West Avenue #03-K3 Singapore 797653" },
  { name: "Playmade", mall: "Tiong Bahru Plaza", address: "302 Tiong Bahru Road #01-154 Singapore 168732" },
  { name: "Playmade", mall: "VivoCity", address: "1 HarbourFront Walk #02-118 Singapore 098585" },
  { name: "Playmade", mall: "Waterway Point", address: "83 Punggol Central #B1-K6 Singapore 828761" },
  { name: "Playmade", mall: "Westgate", address: "3 Gateway Drive #01-K1 Singapore 608532" },
  { name: "Playmade", mall: "City Square Mall", address: "180 Kitchener Road Singapore 208539" },
  // JUMBO Seafood (7 - some in malls)
  { name: "JUMBO Seafood", mall: "ION Orchard", address: "2 Orchard Turn #03-05/06 Singapore 238801" },
  { name: "JUMBO Seafood", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #03-202/203/204 Singapore 819666" },
  // Crystal Jade La Mian Xiao Long Bao (11 - most in malls)
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "Bugis Junction", address: "200 Victoria Street #B1-04A Singapore 188021" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "Jurong Point", address: "1 Jurong West Central 2 #03-96 Singapore 648886" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "i12 Katong", address: "112 East Coast Road #02-21 Singapore 428802" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "Hillion Mall", address: "17 Petir Road #01-11/12 Singapore 678278" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "Ngee Ann City", address: "391 Orchard Road #B2-36A Singapore 238873" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "Great World", address: "1 Kim Seng Promenade #02-43 Singapore 237994" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "VivoCity", address: "1 HarbourFront Walk #02-139/140 Singapore 098585" },
  { name: "Crystal Jade La Mian Xiao Long Bao", mall: "Suntec City", address: "3 Temasek Boulevard #01-649 Singapore 038983" },
  // Poulet (9 - most in malls)
  { name: "Poulet", mall: "Bugis+", address: "201 Victoria Street #04-12 Singapore 188067" },
  { name: "Poulet", mall: "Kallang Wave Mall", address: "1 Stadium Place #01-17 Singapore 397628" },
  { name: "Poulet", mall: "Raffles City", address: "252 North Bridge Road #B1-65/66 Singapore 179103" },
  { name: "Poulet", mall: "VivoCity", address: "1 HarbourFront Walk #01-175/176/177 Singapore 098585" },
  { name: "Poulet", mall: "Westgate", address: "3 Gateway Drive #B1-09 Singapore 608532" },
  { name: "Poulet", mall: "ION Orchard", address: "2 Orchard Turn #B3-21 Singapore 238801" },
  { name: "Poulet", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #01-227 Singapore 819666" },
  { name: "Poulet", mall: "Causeway Point", address: "1 Woodlands Square #B1-25 Singapore 738099" },
  { name: "Poulet", mall: "Northpoint City", address: "1 Northpoint Drive #01-101/102 Singapore 768019" },
  // Bacha Coffee (5 - most in malls)
  { name: "Bacha Coffee", mall: "ION Orchard", address: "2 Orchard Turn #01-15/16 Singapore 238801" },
  { name: "Bacha Coffee", mall: "Ngee Ann City", address: "391A Orchard Road Food Hall B2 Singapore 238873" },
  { name: "Bacha Coffee", mall: "Shoppes at Marina Bay Sands", address: "2 Bayfront Avenue #B2-68 Singapore 018972" },
  // Song Fa Bak Kut Teh (13 - most in malls)
  { name: "Song Fa Bak Kut Teh", mall: "Chinatown Point", address: "133 New Bridge Road #01-04 Singapore 059413" },
  { name: "Song Fa Bak Kut Teh", mall: "Suntec City", address: "3 Temasek Boulevard #B1-132 Singapore 038983" },
  { name: "Song Fa Bak Kut Teh", mall: "The Centrepoint", address: "176 Orchard Road #02-29/30 Singapore 238843" },
  { name: "Song Fa Bak Kut Teh", mall: "The Seletar Mall", address: "33 Sengkang West Avenue #01-39/40/41 Singapore 797653" },
  { name: "Song Fa Bak Kut Teh", mall: "Jem", address: "50 Jurong Gateway Road #B1-09 Singapore 608549" },
  { name: "Song Fa Bak Kut Teh", mall: "Jewel Changi Airport", address: "78 Airport Boulevard #B2-278/279/280 Singapore 819666" },
  { name: "Song Fa Bak Kut Teh", mall: "Velocity @ Novena Square", address: "238 Thomson Road #01-56 Singapore 307683" },
  { name: "Song Fa Bak Kut Teh", mall: "HarbourFront Centre", address: "1 Maritime Square #02-74/75 Singapore 099253" },
  { name: "Song Fa Bak Kut Teh", mall: "Northpoint City", address: "930 Yishun Avenue 2 #B1-48 Singapore 769098" },
  { name: "Song Fa Bak Kut Teh", mall: "Waterway Point", address: "83 Punggol Central #01-24 Singapore 828761" },
  { name: "Song Fa Bak Kut Teh", mall: "Bukit Panjang Plaza", address: "1 Jelebu Road #03-09A Singapore 677743" },
  // Springleaf Prata Place (13 - some in malls)
  { name: "Springleaf Prata Place", mall: "Junction 10", address: "1 Woodlands Road #01-25 Singapore 677899" },
  { name: "Springleaf Prata Place", mall: "Downtown East", address: "1 Pasir Ris Close #01-340 Singapore 519599" },
  { name: "Springleaf Prata Place", mall: "HarbourFront Centre", address: "1 Maritime Square #01-28 Singapore 099253" },
];

// Mall name to mall_id mapping
const mallMapping = {
  "Paragon": "paragon",
  "Chinatown Point": "chinatown-point",
  "City Square Mall": "city-square-mall",
  "Compass One": "compass-one",
  "Great World": "great-world",
  "IMM": "imm",
  "Jem": "jem",
  "Jewel Changi Airport": "jewel-changi-airport",
  "Junction 8": "junction-8",
  "Jurong Point": "jurong-point",
  "Marina Bay Sands": "shoppes-at-marina-bay-sands",
  "Shoppes at Marina Bay Sands": "shoppes-at-marina-bay-sands",
  "NEX": "nex",
  "Northpoint City": "northpoint-city",
  "Parkway Parade": "parkway-parade",
  "Plaza Singapura": "plaza-singapura",
  "Raffles City": "raffles-city",
  "Suntec City": "suntec-city",
  "Tampines Mall": "tampines-mall",
  "The Centrepoint": "the-centrepoint",
  "The Seletar Mall": "the-seletar-mall",
  "Waterway Point": "waterway-point",
  "Wisma Atria": "wisma-atria",
  "Velocity @ Novena Square": "velocity-novena-square",
  "VivoCity": "vivocity",
  "Hougang 1": "hougang-1",
  "One Raffles Place": "one-raffles-place",
  "Kallang Wave Mall": "kallang-wave-mall",
  "The Star Vista": "the-star-vista",
  "Junction 10": "junction-10",
  "Singpost Centre": "singpost-centre",
  "Westgate": "westgate",
  "111 Somerset": "111-somerset",
  "Tiong Bahru Plaza": "tiong-bahru-plaza",
  "Lot One": "lot-one",
  "West Coast Plaza": "west-coast-plaza",
  "Northshore Plaza": "northshore-plaza-i-ii",
  "i12 Katong": "i12-katong",
  "HarbourFront Centre": "harbourfront-centre",
  "White Sands": "white-sands",
  "The Woodleigh Mall": "the-woodleigh-mall",
  "Orchard Gateway": "orchard-gateway",
  "Oasis Terraces": "oasis-terraces",
  "Ngee Ann City": "ngee-ann-city",
  "Aperia Mall": "aperia-mall",
  "Bugis Junction": "bugis-junction",
  "Bugis+": "bugis",
  "Orchard Central": "orchard-central",
  "Hillion Mall": "hillion-mall",
  "United Square": "united-square",
  "313@Somerset": "313-somerset",
  "AMK Hub": "amk-hub",
  "Clarke Quay Central": "clarke-quay-central",
  "Eastpoint Mall": "eastpoint-mall",
  "Hougang Mall": "hougang-mall",
  "Marina Square": "marina-square",
  "Paya Lebar Quarter": "paya-lebar-quarter",
  "Tampines 1": "tampines-1",
  "Wheelock Place": "wheelock-place",
  "Bedok Mall": "bedok-mall",
  "Century Square": "century-square",
  "Downtown East": "downtown-east",
  "Sengkang Grand Mall": "sengkang-grand-mall",
  "Causeway Point": "causeway-point",
  "The Clementi Mall": "the-clementi-mall",
  "Funan": "funan",
  "Square 2": "square-2",
  "Bukit Panjang Plaza": "bukit-panjang-plaza",
  "Kinex": "kinex",
  "100 AM": "100-am",
  "Changi City Point": "changi-city-point",
  "West Mall": "west-mall",
  "Paya Lebar Square": "paya-lebar-square",
  "Thomson Plaza": "thomson-plaza",
  "ION Orchard": "ion-orchard",
  "Cineleisure": "cineleisure",
  "Mandarin Gallery": "mandarin-gallery",
  "Shaw Centre": "shaw-centre",
  "CityLink Mall": "citylink-mall",
};

function extractUnit(address) {
  const match = address.match(/#[A-Za-z0-9\-\/]+/);
  return match ? match[0] : null;
}

async function main() {
  // First, get all malls to verify mapping
  const { data: malls } = await supabase.from('malls').select('id, name');
  const mallIds = new Set(malls.map(m => m.id));

  // Check existing outlets to avoid duplicates
  const { data: existingOutlets } = await supabase
    .from('mall_outlets')
    .select('name, mall_id');

  const existingSet = new Set(existingOutlets.map(o => `${o.name}|${o.mall_id}`));

  let added = 0;
  let skipped = 0;
  let unmapped = [];

  for (const outlet of outlets) {
    const mallId = mallMapping[outlet.mall];

    if (!mallId) {
      unmapped.push(outlet.mall);
      continue;
    }

    if (!mallIds.has(mallId)) {
      console.log(`Mall ID not found: ${mallId} for ${outlet.mall}`);
      continue;
    }

    const key = `${outlet.name}|${mallId}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    const unit = extractUnit(outlet.address);

    const { error } = await supabase.from('mall_outlets').insert({
      name: outlet.name,
      mall_id: mallId,
      level: unit,
      category: 'Food & Beverage',
    });

    if (error) {
      console.log(`Error adding ${outlet.name} at ${outlet.mall}:`, error.message);
    } else {
      console.log(`Added: ${outlet.name} at ${outlet.mall} ${unit || ''}`);
      added++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Added: ${added}`);
  console.log(`Skipped (already exists): ${skipped}`);

  if (unmapped.length > 0) {
    const unique = [...new Set(unmapped)];
    console.log(`\nUnmapped malls: ${unique.join(', ')}`);
  }
}

main().catch(console.error);

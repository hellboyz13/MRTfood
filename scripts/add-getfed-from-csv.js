const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

const GOOGLE_API_KEY = 'AIzaSyB2nTAy0K17gdWwlwJ2CYs4kbO0SUxYJvs';

// Station mapping - address keywords to station IDs
const stationMapping = {
  // Central
  'orchard': 'orchard',
  'somerset': 'somerset',
  'dhoby ghaut': 'dhoby-ghaut',
  'city hall': 'city-hall',
  'raffles place': 'raffles-place',
  'marina bay': 'marina-bay',
  'bayfront': 'bayfront',
  'tanjong pagar': 'tanjong-pagar',
  'chinatown': 'chinatown',
  'clarke quay': 'clarke-quake',
  'bugis': 'bugis',
  'lavender': 'lavender',
  'kallang': 'kallang',
  'bras basah': 'bras-basah',
  'esplanade': 'esplanade',
  'promenade': 'promenade',
  'nicoll highway': 'nicoll-highway',
  'stadium': 'stadium',
  'mountbatten': 'mountbatten',
  'telok ayer': 'telok-ayer',
  'downtown': 'downtown',
  'maxwell': 'telok-ayer',
  'boat quay': 'raffles-place',
  'north bridge': 'bugis',
  'beach road': 'bugis',
  'golden mile': 'lavender',
  'arab street': 'bugis',
  'haji lane': 'bugis',
  'kampong glam': 'bugis',
  'sultan gate': 'bugis',
  'kandahar': 'bugis',
  'bussorah': 'bugis',

  // East
  'paya lebar': 'paya-lebar',
  'eunos': 'eunos',
  'kembangan': 'kembangan',
  'bedok': 'bedok',
  'tanah merah': 'tanah-merah',
  'simei': 'simei',
  'tampines': 'tampines',
  'pasir ris': 'pasir-ris',
  'expo': 'expo',
  'changi': 'changi-airport',
  'geylang': 'aljunied',
  'aljunied': 'aljunied',
  'macpherson': 'macpherson',
  'tai seng': 'tai-seng',
  'upper paya lebar': 'upper-paya-lebar',
  'joo chiat': 'eunos',
  'katong': 'marine-parade',
  'marine parade': 'marine-parade',
  'east coast': 'bedok',
  'siglap': 'kembangan',

  // North East
  'serangoon': 'serangoon',
  'lorong chuan': 'lorong-chuan',
  'bishan': 'bishan',
  'ang mo kio': 'ang-mo-kio',
  'yio chu kang': 'yio-chu-kang',
  'kovan': 'kovan',
  'hougang': 'hougang',
  'buangkok': 'buangkok',
  'sengkang': 'sengkang',
  'punggol': 'punggol',
  'potong pasir': 'potong-pasir',
  'woodleigh': 'woodleigh',
  'upper serangoon': 'serangoon',

  // North
  'yishun': 'yishun',
  'khatib': 'khatib',
  'sembawang': 'sembawang',
  'admiralty': 'admiralty',
  'woodlands': 'woodlands',
  'marsiling': 'marsiling',
  'kranji': 'kranji',
  'canberra': 'canberra',

  // West
  'jurong east': 'jurong-east',
  'jurong west': 'jurong-west',
  'clementi': 'clementi',
  'dover': 'dover',
  'buona vista': 'buona-vista',
  'holland': 'holland-village',
  'commonwealth': 'commonwealth',
  'queenstown': 'queenstown',
  'redhill': 'redhill',
  'tiong bahru': 'tiong-bahru',
  'outram': 'outram-park',
  'harbourfront': 'harbourfront',
  'vivocity': 'harbourfront',
  'telok blangah': 'telok-blangah',
  'labrador': 'labrador-park',
  'pasir panjang': 'pasir-panjang',
  'haw par villa': 'haw-par-villa',
  'kent ridge': 'kent-ridge',
  'one-north': 'one-north',
  'bukit panjang': 'bukit-panjang',
  'choa chu kang': 'choa-chu-kang',
  'yew tee': 'yew-tee',
  'boon lay': 'boon-lay',
  'lakeside': 'lakeside',
  'chinese garden': 'chinese-garden',
  'pioneer': 'pioneer',
  'joo koon': 'joo-koon',
  'gul circle': 'gul-circle',
  'tuas': 'tuas-crescent',
  'sunset way': 'clementi',

  // Central North
  'toa payoh': 'toa-payoh',
  'braddell': 'braddell',
  'novena': 'novena',
  'newton': 'newton',
  'stevens': 'stevens',
  'botanic': 'botanic-gardens',
  'farrer road': 'farrer-road',
  'balestier': 'novena',
  'whampoa': 'boon-keng',
  'boon keng': 'boon-keng',
  'bendemeer': 'bendemeer',
  'geylang bahru': 'geylang-bahru',
  'mattar': 'mattar',
  'ubi': 'ubi',
  'kaki bukit': 'kaki-bukit',

  // South
  'harbourfront': 'harbourfront',
  'sentosa': 'harbourfront',
  'bukit merah': 'redhill',
  'henderson': 'redhill',
  'alexandra': 'redhill',
  'depot road': 'redhill',

  // Circle Line
  'marymount': 'marymount',
  'caldecott': 'caldecott',
  'bukit brown': 'bukit-brown',
  'havelock': 'outram-park',
  'great world': 'great-world',
  'maxwell': 'maxwell',
  'shenton way': 'shenton-way',

  // Thomson East Coast
  'woodlands north': 'woodlands-north',
  'woodlands south': 'woodlands-south',
  'springleaf': 'springleaf',
  'lentor': 'lentor',
  'mayflower': 'mayflower',
  'bright hill': 'bright-hill',
  'upper thomson': 'upper-thomson',
  'thomson': 'upper-thomson',
  'napier': 'napier',
  'orchard boulevard': 'orchard-boulevard',
  'great world': 'great-world',
  'havelock': 'havelock',
  'outram park': 'outram-park',
  'gardens by the bay': 'gardens-by-the-bay',
  'tanjong rhu': 'tanjong-rhu',
  'katong park': 'katong-park',
  'tanjong katong': 'tanjong-katong',
  'marine terrace': 'marine-terrace',
  'siglap': 'siglap',
  'bayshore': 'bayshore',

  // Downtown Line
  'bukit timah': 'beauty-world',
  'beauty world': 'beauty-world',
  'sixth avenue': 'sixth-avenue',
  'tan kah kee': 'tan-kah-kee',
  'hillview': 'hillview',
  'haw par villa': 'haw-par-villa',
  'cashew': 'cashew',
  'king albert park': 'king-albert-park',
  'little india': 'little-india',
  'rochor': 'rochor',
  'jalan besar': 'jalan-besar',
  'bencoolen': 'bencoolen',
  'fort canning': 'fort-canning',

  // North East Line
  'harbourfront': 'harbourfront',
  'chinatown': 'chinatown',
  'clarke quay': 'clarke-quay',
  'dhoby ghaut': 'dhoby-ghaut',
  'little india': 'little-india',
  'farrer park': 'farrer-park',
};

// Get station ID from address
function getStationFromAddress(address) {
  if (!address) return null;

  const lowerAddr = address.toLowerCase();

  // Check for exact matches first
  for (const [keyword, stationId] of Object.entries(stationMapping)) {
    if (lowerAddr.includes(keyword)) {
      return stationId;
    }
  }

  // Try to extract postal code area
  const postalMatch = address.match(/Singapore\s*(\d{6})/i);
  if (postalMatch) {
    const postal = postalMatch[1];
    const district = postal.substring(0, 2);

    // Map postal districts to stations
    const postalToStation = {
      '01': 'raffles-place', '02': 'raffles-place', '03': 'raffles-place',
      '04': 'tanjong-pagar', '05': 'tanjong-pagar',
      '06': 'city-hall', '07': 'bugis',
      '08': 'little-india', '09': 'orchard',
      '10': 'orchard', '11': 'newton',
      '12': 'toa-payoh', '13': 'macpherson',
      '14': 'paya-lebar', '15': 'marine-parade',
      '16': 'bedok', '17': 'changi',
      '18': 'tampines', '19': 'serangoon',
      '20': 'ang-mo-kio', '21': 'clementi',
      '22': 'jurong-east', '23': 'bukit-panjang',
      '24': 'jurong-west', '25': 'woodlands',
      '26': 'yishun', '27': 'sembawang',
      '28': 'yishun', '29': 'admiralty',
      '30': 'redhill', '31': 'bukit-merah',
      '32': 'toa-payoh', '33': 'bishan',
      '34': 'hougang', '35': 'serangoon',
      '36': 'serangoon', '37': 'sengkang',
      '38': 'punggol', '39': 'pasir-ris',
      '40': 'pasir-ris', '41': 'tampines',
      '42': 'tampines', '43': 'punggol',
      '44': 'punggol', '45': 'tampines',
      '46': 'tampines', '47': 'simei',
      '48': 'changi', '49': 'changi',
      '50': 'bedok', '51': 'bedok',
      '52': 'bedok', '53': 'kembangan',
      '54': 'hougang', '55': 'hougang',
      '56': 'ang-mo-kio', '57': 'ang-mo-kio',
      '58': 'ang-mo-kio', '59': 'bishan',
      '60': 'clementi', '61': 'clementi',
      '62': 'jurong-east', '63': 'jurong-east',
      '64': 'jurong-west', '65': 'boon-lay',
      '66': 'jurong-west', '67': 'choa-chu-kang',
      '68': 'bukit-panjang', '69': 'yew-tee',
      '70': 'woodlands', '71': 'woodlands',
      '72': 'marsiling', '73': 'woodlands',
      '75': 'yishun', '76': 'yishun',
      '77': 'sembawang', '78': 'admiralty',
      '79': 'sengkang', '80': 'sengkang',
      '81': 'punggol', '82': 'punggol',
    };

    if (postalToStation[district]) {
      return postalToStation[district];
    }
  }

  return null;
}

// Get place details from Google Places API
async function getPlaceDetails(name, address) {
  try {
    const searchQuery = `${name} ${address}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return null;
    }

    const place = searchData.results[0];
    return {
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      rating: place.rating,
      formatted_address: place.formatted_address
    };
  } catch (error) {
    console.error(`Error getting place details for ${name}:`, error.message);
    return null;
  }
}

// Calculate walking distance (rough estimate)
function calculateWalkingInfo(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return { distance: 500, time: 7 };

  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  // Walking speed ~80m per minute
  const walkingTime = Math.ceil(distance / 80);

  return {
    distance: Math.round(distance),
    time: Math.max(1, walkingTime)
  };
}

// Station coordinates for distance calculations
const stationCoordinates = {
  'orchard': { lat: 1.3039, lng: 103.8318 },
  'somerset': { lat: 1.3006, lng: 103.8388 },
  'bugis': { lat: 1.3009, lng: 103.8558 },
  'lavender': { lat: 1.3073, lng: 103.8631 },
  'tanjong-pagar': { lat: 1.2767, lng: 103.8459 },
  'raffles-place': { lat: 1.2840, lng: 103.8514 },
  'city-hall': { lat: 1.2933, lng: 103.8521 },
  'chinatown': { lat: 1.2843, lng: 103.8439 },
  'telok-ayer': { lat: 1.2820, lng: 103.8486 },
  'redhill': { lat: 1.2896, lng: 103.8168 },
  'tiong-bahru': { lat: 1.2864, lng: 103.8270 },
  'outram-park': { lat: 1.2804, lng: 103.8393 },
  'harbourfront': { lat: 1.2653, lng: 103.8215 },
  'bedok': { lat: 1.3240, lng: 103.9300 },
  'tampines': { lat: 1.3545, lng: 103.9453 },
  'pasir-ris': { lat: 1.3730, lng: 103.9494 },
  'eunos': { lat: 1.3198, lng: 103.9031 },
  'paya-lebar': { lat: 1.3180, lng: 103.8930 },
  'aljunied': { lat: 1.3165, lng: 103.8829 },
  'serangoon': { lat: 1.3497, lng: 103.8735 },
  'ang-mo-kio': { lat: 1.3699, lng: 103.8495 },
  'bishan': { lat: 1.3513, lng: 103.8491 },
  'toa-payoh': { lat: 1.3327, lng: 103.8471 },
  'hougang': { lat: 1.3718, lng: 103.8922 },
  'kovan': { lat: 1.3601, lng: 103.8850 },
  'punggol': { lat: 1.4052, lng: 103.9023 },
  'sengkang': { lat: 1.3916, lng: 103.8952 },
  'yishun': { lat: 1.4294, lng: 103.8354 },
  'woodlands': { lat: 1.4369, lng: 103.7865 },
  'marsiling': { lat: 1.4327, lng: 103.7740 },
  'sembawang': { lat: 1.4490, lng: 103.8200 },
  'admiralty': { lat: 1.4406, lng: 103.8009 },
  'jurong-east': { lat: 1.3329, lng: 103.7422 },
  'clementi': { lat: 1.3151, lng: 103.7652 },
  'dover': { lat: 1.3113, lng: 103.7785 },
  'buona-vista': { lat: 1.3068, lng: 103.7901 },
  'holland-village': { lat: 1.3114, lng: 103.7961 },
  'novena': { lat: 1.3204, lng: 103.8439 },
  'newton': { lat: 1.3127, lng: 103.8381 },
  'little-india': { lat: 1.3066, lng: 103.8496 },
  'farrer-park': { lat: 1.3123, lng: 103.8545 },
  'jalan-besar': { lat: 1.3052, lng: 103.8555 },
  'boon-keng': { lat: 1.3194, lng: 103.8617 },
  'bendemeer': { lat: 1.3239, lng: 103.8628 },
  'macpherson': { lat: 1.3266, lng: 103.8900 },
  'marine-parade': { lat: 1.3016, lng: 103.9058 },
  'bukit-panjang': { lat: 1.3780, lng: 103.7620 },
  'choa-chu-kang': { lat: 1.3854, lng: 103.7443 },
  'boon-lay': { lat: 1.3383, lng: 103.7060 },
  'beauty-world': { lat: 1.3413, lng: 103.7760 },
  'upper-thomson': { lat: 1.3541, lng: 103.8326 },
};

// All Get-Fed listings from CSV data
const getfedListings = [
  // S1 2023 (EP 1-22) - Singapore only
  { name: 'Onalu Bagel Haus', address: '60 Stamford Rd, #01-11, Singapore 178900', category: 'Cafe' },
  { name: 'Park\'s Kitchen', address: '40 Stamford Rd, #01-02, Singapore 178908', category: 'Korean' },
  { name: 'The Tea Party Cafe', address: '90 Stamford Rd, #01-75, Singapore 178903', category: 'Western' },
  { name: 'Nasi Lemak Ayam Taliwang', address: '90 Stamford Rd, #01-73 Singapore 178903', category: 'Halal', halal: true },
  { name: 'Ima Sushi', address: '90 Stamford Rd, #01-73 Singapore 178903', category: 'Japanese' },
  { name: 'Hainan Fried Hokkien Prawn Mee', address: '505 Beach Rd, #B1-34 Golden Mile Food Center, Singapore 199583', category: 'Local' },
  { name: 'Heng Huat Fried Kway Tiao', address: '121 Pasir Panjang Rd, #01-36, Singapore 118543', category: 'Local' },
  { name: 'Classic Cakes', address: '41 Sunset Way, #01-06, Singapore 597071', category: 'Dessert' },
  { name: 'Beach Road Prawn Noodle House', address: '370/372 E Coast Rd, Singapore 428981', category: 'Local' },
  { name: 'NIE Noodle Stall', address: '1 Nanyang Walk, S637616', category: 'Local' },
  { name: 'Canteen 11 Mixed Veg Rice', address: '20 Nanyang Ave, Canteen 11, S639809', category: 'Local' },
  { name: 'Si Chuan Mei Shi', address: '20 Nanyang Ave, Canteen 11, S639809', category: 'Chinese' },
  { name: 'A Hot Hideout', address: '60 Nanyang Cres, Blk 20A, #03-02, S636957', category: 'Local' },
  { name: 'Union Farm Chee Pow Kai', address: '267A Toh Guan Rd, #01-01, Singapore 601267', category: 'Local' },
  { name: 'Joo Siah Bak Kut Teh', address: '349 JURONG EAST AVENUE 1, #01-1215 600349', category: 'Local' },
  { name: '88 Hong Kong Roast Meat Specialist', address: '308 Lavender St., Singapore 338814', category: 'Local' },
  { name: 'Azme Corner Nasi Lemak', address: '122 Bedok North Street 2, Block 122, Singapore 460122', category: 'Halal', halal: true },
  { name: 'Dunman Road Char Siew Wanton Mee', address: '271 Onan Road #02-19 Dunman Food Centre, Singapore 424768', category: 'Local' },
  { name: 'Sarawak Laksa & Kolo Mee', address: '14 Haig Road, #01-33 Haig Road Market & Food Centre, Singapore 430014', category: 'Local' },
  { name: 'Yong Chun Wan Ton Noodle', address: '115 Bukit Merah View, #01-56, Singapore 151115', category: 'Local' },
  { name: 'Dickson Nasi Lemak', address: '320 Joo Chiat Rd, Singapore 427571', category: 'Local' },
  { name: 'Petit Pain Bakery', address: '315 Joo Chiat Rd, Singapore 427566', category: 'Cafe' },
  { name: 'Krazy Kroissants', address: 'Delivery only', category: 'Western' },
  { name: 'Le Taste', address: '30 Foch Rd, Singapore 209276', category: 'Western' },
  { name: 'SYIP', address: '79 Owen Rd, Singapore 218895', category: 'Western' },
  { name: 'Hong Ji Claypot Herbal Bak Kut Teh', address: '19 Marsiling Ln, #01-329, Singapore 730019', category: 'Local' },
  { name: 'Sin Kee Seafood Soup', address: '19 Marsiling Ln, #01-329, Singapore 730019', category: 'Local' },
  { name: 'China Whampoa Home Made Noodle', address: '21 Sengkang West Ave, #03-12, Singapore 797650', category: 'Local' },
  { name: 'Ji Ji Wanton Noodle Specialist', address: '531A Upper Cross St, #02-48/49, Singapore 051531', category: 'Local' },
  { name: 'Ah Heng Curry Chicken Bee Hoon Mee', address: '531A Upper Cross Street, #02-58/59, Singapore 051531', category: 'Local' },
  { name: 'Dan Lao', address: '212 Hougang St 21, Singapore 530212', category: 'Local' },
  { name: '139 Hainan Chicken Rice', address: '254 Jurong East St 24, #01-39, Singapore 600254', category: 'Local' },
  { name: 'Zai Shun Curry Fish Head', address: '253 Jurong East St 24, #01-205, Singapore 600253', category: 'Local' },
  { name: 'XLX Modern Tze Char', address: '5 Guillemard Rd, Singapore 399685', category: 'Local' },
  { name: 'Enjoy Eating House', address: '30 Stevens Rd, #01-07, Singapore 257840', category: 'Local' },
  { name: 'Charcoal Fish Head Steamboat', address: '5 Kallang Pl, Singapore 339152', category: 'Local' },
  { name: 'Tea Chapter', address: '9 Neil Rd, Singapore 088808', category: 'Chinese' },
  { name: 'J.B. Ah Meng Restaurant', address: '534 Geylang Rd, Singapore 389490', category: 'Local' },
  { name: 'Seng Kee Black Chicken Herbal Soup', address: '475 Changi Rd, Singapore 419892', category: 'Chinese' },
  { name: 'Yuan Zhi Wei', address: 'Blk 91 Whampoa Drive, Whampoa Drive Makan Place #01-02, Singapore 320091', category: 'Local' },
  { name: 'Ming Qi Fried Hokkien Prawn Noodle', address: '925 Yishun Central 1, #01-249, Singapore 760925', category: 'Local' },
  { name: '848 Braised Duck Rice', address: '848 Yishun Ring Rd, Singapore 760848', category: 'Local' },
  { name: 'Munchi Pancakes', address: '51 Yishun Ave 11, #01-43, Singapore 768867', category: 'Dessert', halal: true },
  { name: 'Benson Salted Duck Rice', address: '168 Lor 1 Toa Payoh, Singapore 310168', category: 'Local' },
  { name: 'Hua Fong Kee Roasted Duck', address: '128 Lor 1 Toa Payoh, Block 128, Singapore 310128', category: 'Local' },
  { name: 'Da Ji Hainanese Chicken Rice', address: '75 Lor. 5 Toa Payoh, #01-31, Singapore 310075', category: 'Local' },
  { name: 'Zhi Wei Xian Zion Road Big Prawn Noodle', address: '70 Zion Road, #01-04, Zion Riverside Food Centre, Singapore 247792', category: 'Local' },
  { name: 'No. 18 Zion Road Fried Kway Teow', address: '70 Zion Road, #01-17 Zion Riverside Food Centre, Singapore 247792', category: 'Local' },
  { name: 'Lao Zhong Zhong Eating House', address: '29 Tai Thong Cres, Singapore 347858', category: 'Local' },
  { name: 'Loo\'s Hainanese Curry Rice', address: '30 Seng Poh Rd, #02-67/68, Singapore 168898', category: 'Local' },
  { name: 'Koh Brother Pig\'s Organ Soup', address: '30 Seng Poh Rd, #02-29, Singapore 168898', category: 'Local' },
  { name: 'Anglo Indian Cafe & Bar', address: '1 Shenton Way, #01-08 Singapore 068803', category: 'Indian' },
  { name: 'Luna', address: '121 Joo Chiat Rd, Singapore 427410', category: 'Dessert' },
  { name: 'RUBATO', address: '12 greenwood Ave, Singapore 289204', category: 'Western' },
  { name: 'Thunderbolt Tea by Boon Lay Traditional Hakka Lui Cha', address: '129 Geylang East Ave 2, #01-100, Singapore 380129', category: 'Local' },
  { name: 'Tan Ser Seng Herbs Restaurant', address: '29 Lor Bachok, Singapore 387791', category: 'Local' },
  { name: 'Sin Heng Kee Porridge', address: '685 Hougang St. 61, #01-150, Singapore 530685', category: 'Local' },
  { name: '133 Mian Fen Guo Ban Mian', address: '216 Bedok North Street 1, Singapore 460216', category: 'Local' },
  { name: 'Crispy Wings! Western Delights', address: '414 Yishun Ring Rd #01-1871, Singapore 760414', category: 'Western' },
  { name: 'Steam Rice Kitchen', address: '206 Toa Payoh North, #01-1197, Singapore 310206', category: 'Local' },

  // S1 2024 (EP 23-40)
  { name: 'Mahmad\'s Tandoor', address: '730 North Bridge Rd, Singapore 198698', category: 'Halal', halal: true },
  { name: 'Bistro Eminami Halal Vietnam', address: '46 Kandahar St, Singapore 198898', category: 'Halal', halal: true },
  { name: 'Mihrimah Restaurant', address: '742 North Bridge Rd, Singapore 198710', category: 'Halal', halal: true },
  { name: 'Two Chefs Eating Place', address: '410A Sin Ming Ave, #01-01, Singapore 570409', category: 'Local' },
  { name: 'Mr Blecky Seafood', address: '43 Cambridge Road, #01-09, Singapore 210043', category: 'Local' },
  { name: 'Ellenborough Market Cafe', address: '20 Merchant Rd, Singapore 058281', category: 'Local' },
  { name: 'Rong Ji Chicken Rice & Porridge', address: '271 Onan Rd, #02-13, Singapore 424768', category: 'Local' },
  { name: 'Xin Kee Hong Kong Cheong Fun', address: '505 Beach Road, #01-79, Golden Mile Food Centre, Singapore 199583', category: 'Local' },
  { name: 'Lau Wang Claypot Delights', address: '263 Serangoon Central Dr, #01-43, Singapore 550263', category: 'Local' },
  { name: 'Jade\'s Chicken', address: '11B Boon Tiang Road, Food Paradise, Singapore 163011', category: 'Korean' },
  { name: 'NiuNiu Tea & DuDu Rice', address: '90 Whampoa Dr, #01-82, Singapore 320090', category: 'Korean' },
  { name: 'Gahe Traditional Korean Cuisine', address: '473 Fernvale St, #01-05 Fernvale Rivergrove, Singapore 790473', category: 'Korean' },
  { name: 'Pondok Selera by Nurul Hidayah', address: '888 Woodlands Drive 50, #01-755, Singapore 730888', category: 'Halal', halal: true },
  { name: 'Long House Soon Kee Boneless Braised Duck', address: '531 Ang Mo Kio Avenue 10, #01-2429, Singapore 560531', category: 'Local' },
  { name: '8889 Ji Gong Bao', address: '133 Ang Mo Kio Avenue 3, #01-1635, Singapore 560133', category: 'Local' },
  { name: 'Chingu @ The Oval', address: '7 The Oval, Singapore 797865', category: 'Korean' },
  { name: 'Yakiniku Warrior', address: '121 Geylang East Central, # 01-90, Singapore 380121', category: 'Japanese' },
  { name: 'Hwa Kee Barbeque Pork Noodles', address: '1220 ECP, #45 East Coast Lagoon Food Village, Singapore 468960', category: 'Local' },
  { name: 'Overrice', address: '41 Sultan Gate, Singapore 198489', category: 'Halal', halal: true },
  { name: 'OUD Restaurant', address: '48 Kandahar St, Singapore 198899', category: 'Halal', halal: true },
  { name: 'Omar\'s Thai Beef Noodles', address: 'Blk 79 Circuit Rd, #01-54, Singapore 370079', category: 'Halal', halal: true },
  { name: 'Dajie Makan Place', address: '372 Bukit Batok Street 31, #01-374, Singapore 650372', category: 'Halal', halal: true },
  { name: 'Phuket Town Mookata', address: '340 Ang Mo Kio Ave 1, #01-1697, Singapore 560340', category: 'Thai' },
  { name: 'The Ramen House', address: '6 Short St, Singapore 188213', category: 'Japanese' },
  { name: 'San Shu Gong Private Dining', address: '135 Geylang Rd, #01-01, Singapore 389226', category: 'Local' },
  { name: 'Ho Bee Roasted Food', address: '628 Ang Mo Kio Ave 4, #01-84, Singapore 560628', category: 'Local' },
  { name: 'Hamburg Steak Keisuke', address: '72 Peck Seah St, Singapore 079329', category: 'Japanese' },
  { name: 'Hainan Beef Noodles Claypot Chicken Rice', address: '445 Tampines Street 42, Singapore 520445', category: 'Local' },
  { name: 'Yang Ming Seafood', address: '71 Ubi Cres, #01-05 Excalibur Centre, Singapore 408571', category: 'Local' },
  { name: '284 Kway Chap', address: '284 Bishan Street 22, Singapore 570284', category: 'Local' },
  { name: 'Depot Road Zhen Shan Mei Laksa', address: '120 Bukit Merah Lane 1, #01-75, Singapore 151120', category: 'Local' },
  { name: 'Hor Fun Premium', address: '120 Bukit Merah Lane 1, #01-30, Singapore 150120', category: 'Local' },
  { name: 'Tiong Bahru Lien Fa Shui Jing Pau', address: '120 Bukit Merah Lane 1, #01-10, Singapore 151120', category: 'Local' },
  { name: 'Jin Pai Zi Char', address: '120 Bukit Merah Lane 1, #01-47, Singapore 150120', category: 'Local' },
  { name: 'Lau Phua Chay Authentic Roasted Delicacies', address: '120 Bukit Merah Lane 1, #01-20, Singapore 150120', category: 'Local' },
  { name: 'Sumo Bar Happy', address: '100 Tras Street, #01-11, 100AM, Singapore 079027', category: 'Japanese' },
  { name: 'Gyushi', address: '1 Vista Exchange Green, B1-32, The Star Vista, Singapore 138617', category: 'Japanese' },
  { name: 'Standing Sushi Bar', address: '331 North Bridge Road, Unit 01-04, Odeon Towers, Singapore 179720', category: 'Japanese' },
  { name: 'Creme by Lele Bakery', address: '124 Hougang Ave 1, #01-1444, Singapore 530124', category: 'Dessert' },
  { name: 'Yat Ka Yan', address: '9 Tan Quee Lan St, #01-03, Singapore 188098', category: 'Dessert' },
  { name: 'Sourbombe Artisinal Bakery', address: '7 Holland Vlg Wy, #01-27, Singapore 275748', category: 'Dessert' },
  { name: 'Cherry & Oak', address: '95 Owen Rd, Singapore 218907', category: 'Halal', halal: true },
  { name: 'TANOKE', address: '7 Purvis St, Level 2, Singapore 188586', category: 'Japanese' },
  { name: 'JU95', address: '41 Boat Quay, Singapore 049830', category: 'Japanese' },
  { name: 'Ipoh Zai Prawn Mee', address: 'Blk 6 Tanjong Pagar Plz, #02-34, Singapore 081006', category: 'Local' },
  { name: 'Yao Cutlet', address: 'Blk 6 Tanjong Pagar Plz, #02-05, Singapore 081006', category: 'Japanese' },
  { name: 'Sodam Korean Restaurant', address: '48 Tg Pagar Rd, Singapore 088469', category: 'Korean' },
  { name: 'Suk\'s Thai Kitchen', address: '136 Tessensohn Rd, Singapore 217699', category: 'Thai' },
  { name: 'Mookata Eating House', address: '2 Bukit Panjang Ring Rd, #01-26, Singapore 679947', category: 'Thai' },
  { name: 'Pong Cheer Cheer', address: '4 Defu Lane 10, Singapore 539185', category: 'Thai' },
  { name: 'Tien Court Restaurant', address: '403 Havelock Rd, #2F Copthorne King\'s Hotel, Singapore 169632', category: 'Local' },
  { name: 'Goldenroy Sourdough Pizza', address: '125 Desker Rd, Singapore 209642', category: 'Halal', halal: true },
  { name: 'Jin Wee Restaurant', address: '749 Geylang Rd, Singapore 389655', category: 'Local' },
  { name: 'Cafe Gui', address: '278 South Bridge Rd, #01-01, Singapore 058827', category: 'Korean' },
  { name: 'Auntie Anne\'s', address: '1 Jurong West Central 2, #01-K2 Singapore 648886', category: 'Halal', halal: true },
  { name: 'Cafe Colbar', address: '9A Whitchurch Rd, Singapore 138839', category: 'Local' },

  // S2 2024 (EP 41-99) - Selected Singapore listings
  { name: 'Tracy\'s Sarawak Kitchen', address: '1 Maju Ave, B1-K1 to K5 myVillage, Singapore 556679', category: 'Local' },
  { name: 'Estuary Restaurant & Bar', address: '390 Orchard Road #B1-04/05 Singapore 238871', category: 'Local' },
  { name: 'Kantin at Jewel', address: '78 AIRPORT BOULEVARD, #05-206/207 JEWEL, Singapore Changi Airport, 819666', category: 'Local' },
  { name: 'Si Wei Xiao Chuan Chuan', address: '31 Mosque St, Singapore 059509', category: 'Local' },
  { name: 'Inle Myanmar Restaurant', address: '111 North Bridge Rd, #B1-07A Peninsula Plaza, Singapore 179098', category: 'Local' },
  { name: 'Scaled by Ah Hua Kelong', address: '8 Hamilton Rd, Singapore 209179', category: 'Local' },
  { name: 'Heng Heng Boneless Duck Rice', address: '47 Tuas South Ave 1, iEat Canteen, Singapore 637328', category: 'Local' },
  { name: 'Braise', address: '505 Beach Rd, #01-104 Golden Mile Food Centre, Singapore 199583', category: 'Local' },
  { name: 'Legacy Pork Noodles', address: '31 Tai Thong Cres, Singapore 347859', category: 'Local' },
  { name: 'Whole Earth', address: '76 Peck Seah St, Singapore 079331', category: 'Local', halal: true },
  { name: 'elemen', address: '9 Raffles Blvd #01-75/75A/76 Millenia Walk, 039596', category: 'Local', halal: true },
  { name: '33 Vegetarian Food', address: '409 Ang Mo Kio Ave 10, #01-33, Singapore 560409', category: 'Local', halal: true },
  { name: 'Shrimp Prawn Seafood', address: '53 Boat Quay, Singapore 049842', category: 'Thai' },
  { name: 'Zhen Zheng Handmade Pau', address: 'Blk 45 Sims Drive #01-150 S(380045)', category: 'Local' },
  { name: 'Soi Thai Kitchen', address: '58 Serangoon Garden Way, Singapore 555954', category: 'Thai' },
  { name: 'Hey Kee HK Seafood', address: '102 Guillemard Rd, #01-01, Singapore 399719', category: 'Local' },
  { name: 'Song Fa Signatures', address: '290 Orchard Rd, B1-06 Paragon Shopping Centre, Singapore 238859', category: 'Local' },
  { name: 'An La Ghien Buffet', address: '71 Lor 23 Geylang, Singapore 388386', category: 'Vietnamese' },
  { name: 'Indocafe Peranakan Dining', address: '35 Scotts Road, Newton, 228227', category: 'Local' },
  { name: 'Na Na Curry', address: 'Blk 115 Bukit Merah View Market, #01-47, Bukit Merah 151115', category: 'Local' },
  { name: 'Krapow Thai Kitchen', address: '133 New Bridge Rd, #02-39 Chinatown Point, Singapore 059413', category: 'Thai' },
  { name: 'Boon Tong Kee', address: '34 Whampoa West, #01-93, Kallang, 330034', category: 'Local' },
  { name: 'Hup Lee Economic Bee Hoon', address: '304 Woodlands Street 31, Block 304, Singapore 730304', category: 'Local' },
  { name: 'Al Falah Restaurant', address: '302 Woodlands Street 31, Singapore 730302', category: 'Local', halal: true },
  { name: 'Thai Village Restaurant', address: '22 Scotts Rd, Goodwood Park Hotel, Singapore 228221', category: 'Local' },
  { name: 'New Lucky Claypot Rice', address: '44 Holland Dr, #02-19, Holland Drive Market & Food Center, 270044', category: 'Local' },
  { name: 'Zhup Zhup', address: '458 MacPherson Rd, Singapore 368176', category: 'Local' },
  { name: 'Jason Penang Cuisine', address: '6 Jalan Bukit Merah, #01-112, Singapore 150006', category: 'Local' },
  { name: 'Chingu @ Rochester', address: '2 Rochester Park, Singapore 139213', category: 'Korean' },
  { name: 'Wildseed Cafe', address: '10 Telok Blangah Green, Singapore 109178', category: 'Western' },
  { name: 'Tanuki Raw', address: '181 South Bridge Road, Cross St, #01-03 Exchange, 058743', category: 'Japanese' },
  { name: 'Gokul Raas Vegetarian Restaurant', address: '19 Upper Dickson Rd, Singapore 207478', category: 'Local', halal: true },
  { name: 'The Butter Chicken Place', address: '396 E Coast Rd, Singapore 428994', category: 'Local' },
  { name: 'Maha Co', address: '181 South Bridge Road, Cross St, #01-03 Exchange, 058743', category: 'Local' },
  { name: 'Ben\'s Kitchen', address: '273 Tanjong Katong Rd, Singapore 437056', category: 'Chinese-Indo' },
  { name: 'SHINRAI', address: '173 Telok Ayer St, Singapore 068622', category: 'Japanese' },
  { name: 'STR TAO', address: '396 E Coast Rd, Singapore 428994', category: 'Taiwanese' },
  { name: 'BistrOne36 at Tyrwhitt', address: '121 Tyrwhitt Rd, Singapore 207548', category: 'Local' },
  { name: 'JOFA Grill', address: 'Blk 828 Tampines Street 81, New Century Coffeeshop, Singapore 520828', category: 'Local' },
  { name: 'The Only Burger', address: '602B Tampines Ave 9, #01-01 Happy Hawkers, Singapore 522602', category: 'Local', halal: true },
  { name: 'Yit Lim Hong Kong Soy Sauce Chicken Rice & Noodle', address: '29 Bendemeer Rd, #01-73, Singapore 330029', category: 'Local' },
  { name: 'Eng Kee Bak Kut Teh', address: 'Ang Mo Kio Ave 1, Stall No 01-04 Blk 341, Singapore 560341', category: 'Local' },
  { name: 'Fu Lin Tofu Yuen', address: '721 E Coast Rd, Singapore 459070', category: 'Local' },
  { name: 'Yappari Steak', address: '1 HarbourFront Walk, #02-110 VivoCity, Singapore 098585', category: 'Japanese' },
  { name: 'Bulgogi Syo', address: '1 HarbourFront Walk, B2-29 VivoCity, Singapore 098585', category: 'Korean' },
  { name: 'Bliss Nest Capsules', address: '1 HarbourFront Walk, VivoCity #01-91, Singapore 098585', category: 'Local' },
  { name: 'Joji\'s Sandwich Parlour', address: '536 Upper Serangoon Rd, Singapore 534551', category: 'Western' },
  { name: 'Kokoyo Nyonya Delights', address: '263 Serangoon Central Dr, #01-43, Singapore 550263', category: 'Local' },
  { name: 'White House Teochew Porridge', address: '1096 Serangoon Rd, Singapore 328193', category: 'Local' },
  { name: 'Lucine by LUNA', address: '111 Somerset Rd, #01-06 TripleOne Somerset, Singapore 238164', category: 'Dessert', halal: true },
  { name: 'Princess Terrace', address: '403 Havelock Rd, #1F Copthorne King\'s Hotel Singapore, Singapore 169632', category: 'Malaysian' },
  { name: 'SEORAE JIB', address: '68 Orchard Rd, #02-01, Plaza, Singapore 238839', category: 'Korean' },
  { name: 'POCHA!', address: '3 Temasek Blvd, B1-172 Suntec City, Singapore 038983', category: 'Korean' },
  { name: 'Song Yue Taiwan Cuisine', address: '5 Stadium Walk, #01-38/39, Singapore 397693', category: 'Taiwanese' },
  { name: 'Charming Taipei Taiwanese Tea House', address: '1 North Point Dr, #01-121 Northpoint City768619', category: 'Taiwanese' },
  { name: 'CouCou Hotpot Brew Tea', address: '2 Temasek Boulevard Suntec City, Mall, #03- 332-337, 038983', category: 'Taiwanese' },
  { name: 'I Love Sukhothai', address: '533 Choa Chu Kang Street 51, #01-18, Singapore 680533', category: 'Thai' },
  { name: 'Soon Heng Lor Mee', address: '38A Beo Cres, Stall 84, Singapore 169982', category: 'Local' },
  { name: 'Bao Er Cafe', address: '400 Balestier Rd, #02-01, Singapore 329802', category: 'Local' },
  { name: 'Tan Xiang Chai Chee', address: '510 Chai Chee Ln, Singapore 469027', category: 'Local' },
  { name: 'My Awesome Cafe', address: '202 Telok Ayer St, Singapore 068639', category: 'French' },
  { name: 'Dong Qu', address: '176 Telok Ayer St, Singapore 068624', category: 'Taiwanese' },
  { name: 'GamTan Korean Cuisine', address: '132 Telok Ayer St, Singapore 068599', category: 'Korean' },
  { name: 'Tomyum MAMA', address: '244P Upper Thomson Rd, Singapore 574369', category: 'Thai' },
  { name: 'B.B.Q Seafood', address: '3 Yung Sheng Rd, #03-178, Singapore 618499', category: 'Local' },
  { name: 'Enaq', address: '303 Jurong East Street 32, Singapore 600303', category: 'Local' },
  { name: 'Star Pho Le Beef Noodle Soup', address: '543 Geylang Rd, Singapore 389498', category: 'Vietnamese' },
  { name: 'Fire Flies', address: '101 Upper Cross St., People\'s Park Centre #B1-06 Singapore 058357', category: 'Local' },
  { name: 'Qin Tang', address: '8 Grange Rd, Cineleisure B1-01 & B1-01A, Singapore 239695', category: 'Taiwanese' },
  { name: 'The Noodle Memories', address: 'Upper Cross St, #02-27 Singapore 051531', category: 'Local' },
  { name: 'Peng Tiong Bahru Wanton Mee', address: '86 Market St, #02-19, Singapore 048947', category: 'Local' },
  { name: 'Swirled', address: '86 Market St, #03-19, Singapore 048347', category: 'Western' },
  { name: 'Ming Chung White Lor Mee', address: '202C Woodleigh Link, #01-27, Singapore 363202', category: 'Local' },
  { name: 'Liu Ko Shui', address: '202C Woodleigh Link, #01-32, Singapore 363202', category: 'Local' },
  { name: 'Style Palate', address: '202C Woodleigh Link, #01-30, Singapore 363202', category: 'Western' },
  { name: 'Penang Man', address: '202C Woodleigh Link, #01-04, Singapore 363202', category: 'Local' },
  { name: 'D\'Authentic Nasi Lemak', address: '84 Marine Parade Central, #01-36, Singapore 440084', category: 'Local', halal: true },
  { name: 'Anak Bapak Halal Muslim Restaurant', address: '4A Eunos Cres, #01-02, Singapore 402004', category: 'Local', halal: true },
  { name: 'Hjh Maimunah Restaurant', address: '11 Jln Pisang, Singapore 199078', category: 'Local', halal: true },
  { name: 'Greenwood Fish Market', address: '31 Ocean Way, #01 - 04/05, Singapore 098375', category: 'Western' },
  { name: 'Xiang Xiang Hunan Cuisine', address: '3 Gateway Dr, #04-42, Singapore 608532', category: 'Chinese' },
  { name: 'Long Ji Zi Char', address: '253 Outram Rd, Singapore 169049', category: 'Local' },
  { name: 'Seng Heng Atas Roasted Delight', address: '548 Woodlands Drive 44, #01-21 Vista Point, Singapore 730548', category: 'Local' },
  { name: 'Chong Ling Chinese Mixed Rice', address: '548 Woodlands Drive 44, #02-34, Singapore 730548', category: 'Local' },
  { name: 'Xin Fu Ji Local Delights', address: '888 Woodlands Drive 50, #01-755 888 Plaza, Singapore 730888', category: 'Local' },
  { name: 'Nyonya Pok Pok Kay', address: '110 Pasir Ris Central, #02-23 Hawker Centre, Singapore 519641', category: 'Local' },
  { name: 'Spicy Wife Nasi Lemak', address: '7 Maxwell Rd, Amoy St, Food Centre, 02-119, 069111', category: 'Local' },
  { name: 'Nanyang Fried Chicken Rice', address: '531A Upper Cross St, #02-09, Singapore 051531', category: 'Local' },
  { name: 'Lo Hey HK Seafood', address: '7 Holland Vlg Wy, #03-22/23/24, Singapore 275748', category: 'Chinese' },
  { name: 'Twirl Pasta', address: '1 Lor Mambong, #01-40, Singapore 277700', category: 'Western' },
  { name: 'Umi Nami', address: '8 Lor Mambong, Singapore 277674', category: 'Japanese' },
  { name: 'Xi Wang Bak Kut Teh', address: '676 Woodlands Drive 71, S730676', category: 'Local' },
  { name: 'Le Da Chicken Rice', address: '292 Bukit Batok, East Ave 6 Singapore 650292', category: 'Local' },
  { name: 'Chef Wang Fried Rice', address: '38A Beo Cres, #01-71, Singapore 169982', category: 'Local' },
  { name: 'Hon Ni Kitchen', address: '216 Bedok North Street 1, #01-07, Singapore 460216', category: 'Local' },
  { name: 'What The Puff', address: '216 Bedok North Street 1, #01-27, Singapore 460216', category: 'Local' },
  { name: 'Prawn & Mee', address: '216 Bedok North Street 1, #01-54, Singapore 460216', category: 'Local' },
  { name: 'Cha Mulan', address: '216 Bedok North Street 1, #01-81, Singapore 460216', category: 'Local' },
  { name: 'Cherki', address: '1 Straits Blvd, #01-02, Singapore 018906', category: 'Local' },
  { name: 'Chilli Padi Nonya Restaurant', address: '11 Joo Chiat Pl, #01-03, Singapore 427744', category: 'Local' },
  { name: 'Fook Kin', address: '111 Killiney Rd, Singapore 239553', category: 'Local' },
  { name: 'NBCB', address: '181 Orchard Rd, #04-23 Central, Singapore 238896', category: 'Local' },
  { name: 'Pasta Papa', address: '3500A Bukit Merah Central, Singapore 159837', category: 'Local' },
  { name: 'RAKU Rice Bowls & Donburis', address: '314 Joo Chiat Rd, Singapore, 427565', category: 'Japanese' },
  { name: 'Oven Fried Chicken', address: '230 Tanjong Katong Road, Singapore, 437018', category: 'Korean' },
  { name: 'Harvest Salad x Protein Bowl', address: '81 East Coast Road, Singapore, 428785', category: 'Local' },
  { name: 'Banh Mi 90s', address: '304 Joo Chiat Road, Singapore, Singapore, 427555', category: 'Vietnamese' },
  { name: 'Teochew Fish Ball Noodles', address: '527 Ang Mo Kio Ave 10, #01-148 Singapore 560527', category: 'Local' },
  { name: 'Nature Vegetarian Delights Restaurant', address: '756 Upper Serangoon Rd, #04-01, Singapore 534626', category: 'Local' },
  { name: 'Wanglee Seafood Restaurant', address: '94 Lor 4 Toa Payoh, Singapore 310094', category: 'Local' },
  { name: 'Liu Liang Mian', address: '321 Alexandra Rd, #01-03 Outside Alexandra Mall, Singapore 159971', category: 'Japanese' },
  { name: 'KeonBae', address: '38 Pekin St, #01-01, Singapore 048768', category: 'Korean' },
  { name: 'Tasty Court', address: '1 Figaro St, Singapore 458322', category: 'Local' },
  { name: 'Ginkyo by Kinki', address: '7 Holland Village Way, #03-01-04, Singapore 275748', category: 'Japanese' },
  { name: 'Fireplace', address: '7 Holland Village Way, #03-27/28, Singapore 275748', category: 'Western' },
  { name: 'Bedrock Origin', address: '23 Beach View Rd, #01-02 Palawan Ridge, 098679', category: 'Western' },
  { name: 'Fa Ji Minced Meat Fishball Noodle', address: '209 Hougang St 21, #01-05, Singapore 530209', category: 'Local' },
  { name: 'Tian Wai Tian Fish Head Steamboat', address: '203 Hougang St 21, #01-89, Singapore 530203', category: 'Local' },
  { name: 'Sin Chie Toke Huan Hainanese Curry Rice', address: '1018 Upper Serangoon Rd, Singapore 534756', category: 'Local' },
  { name: '618 Sim Carrot Cake', address: '618 Yishun Ring Rd, Singapore 760618', category: 'Local' },
  { name: 'Huat Kee Kway Chap', address: 'Block 123 Yishun Street 11, Singapore 760123', category: 'Local' },
  { name: '505 Sembawang Bakchormee', address: 'Blk 233 Yishun Street 21, #01-464, Singapore 760233', category: 'Local' },
  { name: 'Ping Xiang Wanton Mee', address: '01-46, 93 Lor 4 Toa Payoh, Singapore 310093', category: 'Local' },
  { name: 'Xiang Ji Chicken Rice', address: '73 Lor 4 Toa Payoh, Singapore 310073', category: 'Local' },
  { name: 'Hock Kee (Lor 8) Bak Kut Teh', address: '210 Lorong 8 Toa Payoh, #01-64, 310210', category: 'Local' },
  { name: 'La Bottega Enoteca', address: '346 Joo Chiat Rd, Singapore 427596', category: 'Italian' },
  { name: 'Gyukatsu Kyoto Katsugyu', address: '252 North Bridge Rd, #B1-63/64, Singapore 179103', category: 'Japanese' },
  { name: 'Goku Japanese Restaurant', address: '33 Mohamed Sultan Rd, #01-02, Singapore 238977', category: 'Japanese' },
  { name: 'Jing Hua Xiao Chi', address: '21 Neil Rd, Singapore 088814', category: 'Chinese' },
  { name: 'Zhou Zhen Zhen Vermicelli & Noodles', address: '34 Upper Cross St, Block 34, Singapore 050034', category: 'Chinese' },
  { name: 'Da Shao Chong Qing Xiao Mian', address: '17 Upper Boon Keng Road, #01-81, Singapore 380017', category: 'Chinese' },
  { name: 'Fung Yi Delights', address: '844 Tampines St 82, Singapore 520844', category: 'Local' },
  { name: 'Grandfather Carrot Cake', address: '15 Upper E Coast Rd, Singapore 455207', category: 'Local' },
  { name: 'Yan Chuan Roaster', address: '3020 Ubi Ave 2, #01-111/113, Singapore 408896', category: 'Local' },
  { name: 'Wooly\'s Bagels', address: '162 Joo Chiat Rd, #01-02, Singapore 427437', category: 'Local', halal: true },
  { name: 'Joo Chiat Banh Mi Ca Phe', address: '263 Joo Chiat Rd, Singapore 427517', category: 'Vietnamese', halal: true },
  { name: 'Tha Siam Authentic Thai Kitchen', address: '35 Selegie Rd, #02-06, Singapore 188307', category: 'Thai' },
  { name: 'Lao Gai Mee', address: '144 Upper Bukit Timah Rd, #04-41, Singapore 588177', category: 'Local' },
  { name: '133 Penang Authentic', address: '2A Jln Seh Chuan, #01-063, Singapore 599213', category: 'Local' },
  { name: 'Warm Up Cafe', address: '1 Vista Exchange Green, #02-10/11 The Star Vista, Singapore 138617', category: 'Thai' },
  { name: 'Chef Choo Signature', address: '505 Beach Rd, #B1-45, Singapore 199583', category: 'Western' },
  { name: 'Eddy\'s', address: '531A Upper Cross St, #02-13, Singapore 051531', category: 'Western' },
  { name: 'Eightisfy Western', address: '3752 Bukit Merah Central, Singapore 159848', category: 'Western' },
  { name: 'IRU DEN', address: '27 Scotts Rd, Singapore 228222', category: 'Taiwanese' },
  { name: 'Nguan Express 88', address: '704 Ang Mo Kio Ave 8, #8, Singapore 560704', category: 'Local' },
  { name: 'Chatterbox', address: '333 Orchard Rd, #05-03 Hilton, Singapore 238867', category: 'Local' },
  { name: 'Big Prawn Noodle', address: '205D Compassvale Ln, Singapore 544205', category: 'Local' },
  { name: 'Wan Li Curry Mixed Veg Rice', address: '477 Tampines Street 43, Singapore 520477', category: 'Local' },
  { name: 'Fortune Bak Kut Teh', address: '3 Soon Lee St, #01-08 Pioneer Junction, Singapore 627607', category: 'Local' },
  { name: 'Ipoh Zai Hakka Noodles', address: '216 Bedok North Street 1, #01-45, Singapore 460216', category: 'Local' },
  { name: 'Ipoh River Fish Tai Pai Tong', address: '3 Soon Lee St, #01-08 Pioneer Junction, Singapore 627607', category: 'Local' },
  { name: 'Madam Yam', address: '13 Jalan Aruan, 229122', category: 'Local' },
  { name: 'Baan Kai Khon', address: '633 Tampines North Dr 2, #02-01, Singapore 520633', category: 'Thai' },
  { name: 'Ramen Taisho', address: '802 Tampines Ave 4, #01-23 Singapore 520802', category: 'Japanese' },
  { name: 'Flaming Wagyu', address: '9007 Tampines Street 93, Singapore 528841', category: 'Japanese' },
  { name: 'Zamas River Valley', address: '429 River Valley Road, Singapore 248328', category: 'Local', halal: true },
  { name: 'Miss Saigon', address: '190 Middle Rd, #04-14, Singapore 188979', category: 'Vietnamese' },
  { name: 'ONE.85 Big Prawn Mee', address: '85 Bedok North Street 4, #01-20, Singapore 460085', category: 'Local' },
  { name: 'South Buona Vista Braised Duck', address: '84 Punggol Way, #02-K59, Singapore 829911', category: 'Local' },
  { name: 'Huang Hong Ji Porridge', address: 'Blk 269A Punggol Field, #01-197, Singapore 822269', category: 'Local' },
  { name: 'Leong Ji Kitchen', address: 'Blk 658 Punggol E, #01-10, Singapore 820658', category: 'Local' },
  { name: '168 Neapolitan Style Pizza', address: '3 Yung Sheng Rd, #03-168, Singapore 618499', category: 'Italian' },
  { name: 'PRAIRIE by Craftsmen', address: '501 Bukit Timah Rd, #01-05C, Singapore 259760', category: 'Western' },
  { name: 'The Populus', address: '146 Neil Rd, Singapore 088875', category: 'Western', halal: true },
  { name: 'Old Hen Kitchen', address: '127 Owen Rd, Singapore 218931', category: 'Western' },
  { name: 'Pots & Prawns', address: '261 Waterloo St, Singapore 180261', category: 'Thai' },
  { name: 'Chuan Fried Hokkien Prawn Mee', address: 'Blk 80 Circuit Rd, #02-05, Singapore 370080', category: 'Local' },
  { name: 'Chao Ji Thai', address: '727 Ang Mo Kio Ave 6, #01-4236, Singapore 560727', category: 'Thai' },
  { name: 'Entrepot', address: '1 Unity St, Singapore 237983', category: 'Local' },
  { name: 'The French Ladle', address: '2 Pandan Valley, #01-206, Singapore 597626', category: 'French' },
  { name: 'Grain', address: '5 Burn Rd, #05-01, Singapore 369972', category: 'Local', halal: true },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(70));
  console.log('  ADDING GET-FED LISTINGS FROM CSV');
  console.log('  Total listings to process:', getfedListings.length);
  console.log('='.repeat(70));

  // Ensure get-fed source exists
  const { data: source } = await supabase
    .from('food_sources')
    .select('id')
    .eq('id', 'get-fed')
    .single();

  if (!source) {
    console.log('\nCreating get-fed source...');
    await supabase.from('food_sources').insert({
      id: 'get-fed',
      name: 'Get Fed',
      weight: 50
    });
  }

  // Get existing listings to avoid duplicates
  const { data: existingListings } = await supabase
    .from('food_listings')
    .select('name');

  const existingNames = new Set(existingListings?.map(l => l.name.toLowerCase()) || []);
  console.log(`\nFound ${existingNames.size} existing listings in database`);

  let added = 0;
  let skipped = 0;
  let linked = 0;
  let failed = 0;

  for (let i = 0; i < getfedListings.length; i++) {
    const listing = getfedListings[i];
    console.log(`\n[${i + 1}/${getfedListings.length}] ${listing.name}`);

    // Skip JB/Malaysia listings
    if (listing.address.toLowerCase().includes('malaysia') ||
        listing.address.toLowerCase().includes('johor')) {
      console.log('  Skipping - Malaysia location');
      skipped++;
      continue;
    }

    // Skip delivery only
    if (listing.address.toLowerCase().includes('delivery')) {
      console.log('  Skipping - Delivery only');
      skipped++;
      continue;
    }

    // Check if exists
    if (existingNames.has(listing.name.toLowerCase())) {
      console.log('  Already exists - linking to get-fed source');

      // Find the existing listing and link it
      const { data: existing } = await supabase
        .from('food_listings')
        .select('id')
        .ilike('name', listing.name)
        .single();

      if (existing) {
        // Check if already linked
        const { data: existingLink } = await supabase
          .from('listing_sources')
          .select('id')
          .eq('listing_id', existing.id)
          .eq('source_id', 'get-fed')
          .single();

        if (!existingLink) {
          await supabase.from('listing_sources').insert({
            listing_id: existing.id,
            source_id: 'get-fed',
            is_primary: false
          });
          console.log('  Linked!');
          linked++;
        } else {
          console.log('  Already linked');
          skipped++;
        }
      }
      continue;
    }

    // Get station ID from address
    const stationId = getStationFromAddress(listing.address);
    if (!stationId) {
      console.log('  Could not determine station - skipping');
      failed++;
      continue;
    }
    console.log('  Station:', stationId);

    // Get place details from Google
    const placeDetails = await getPlaceDetails(listing.name, listing.address);
    await sleep(200); // Rate limit

    let lat = placeDetails?.lat;
    let lng = placeDetails?.lng;
    let rating = placeDetails?.rating || null;

    // Calculate walking distance
    const stationCoords = stationCoordinates[stationId];
    let distance = 500;
    let walkingTime = 7;

    if (lat && lng && stationCoords) {
      const walkInfo = calculateWalkingInfo(stationCoords.lat, stationCoords.lng, lat, lng);
      distance = walkInfo.distance;
      walkingTime = walkInfo.time;
    }

    // Determine tags
    const tags = ['get-fed'];
    if (listing.halal) tags.push('halal');
    if (listing.category) {
      const cat = listing.category.toLowerCase();
      if (cat.includes('local')) tags.push('local');
      if (cat.includes('korean')) tags.push('korean');
      if (cat.includes('japanese')) tags.push('japanese');
      if (cat.includes('thai')) tags.push('thai');
      if (cat.includes('chinese')) tags.push('chinese');
      if (cat.includes('western')) tags.push('western');
      if (cat.includes('dessert')) tags.push('dessert');
      if (cat.includes('cafe')) tags.push('cafe');
      if (cat.includes('vietnamese')) tags.push('vietnamese');
      if (cat.includes('taiwanese')) tags.push('taiwanese');
      if (cat.includes('indian')) tags.push('indian');
    }

    // Insert listing
    const { data: newListing, error } = await supabase
      .from('food_listings')
      .insert({
        name: listing.name,
        address: listing.address,
        station_id: stationId,
        source_id: 'get-fed',
        lat,
        lng,
        rating,
        distance_to_station: distance,
        walking_time: walkingTime,
        tags
      })
      .select('id')
      .single();

    if (error) {
      console.log('  Error:', error.message);
      failed++;
      continue;
    }

    // Add to listing_sources
    await supabase.from('listing_sources').insert({
      listing_id: newListing.id,
      source_id: 'get-fed',
      is_primary: true
    });

    console.log('  Added!', rating ? `(Rating: ${rating})` : '');
    added++;
    existingNames.add(listing.name.toLowerCase());
  }

  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Added: ${added}`);
  console.log(`  Linked to existing: ${linked}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(70));
}

main().catch(console.error);

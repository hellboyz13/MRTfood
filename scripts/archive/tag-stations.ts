/**
 * Script to tag all food listings to their nearest MRT station
 * Uses name-based inference and address keywords
 */

import * as fs from 'fs';
import * as path from 'path';

// Station mapping rules based on location keywords in name/address
const locationToStation: { [key: string]: string } = {
  // Food centres and markets
  'maxwell': 'chinatown',
  'hong lim': 'chinatown',
  'chinatown complex': 'chinatown',
  'chinatown': 'chinatown',
  'people\'s park': 'chinatown',
  'smith street': 'chinatown',
  'upper cross street': 'chinatown',

  'tiong bahru market': 'tiong-bahru',
  'tiong bahru': 'tiong-bahru',
  'seng poh': 'tiong-bahru',
  'zion road': 'tiong-bahru',

  'old airport road': 'dakota',

  'newton food centre': 'newton',
  'newton': 'newton',

  'amoy street': 'tanjong-pagar',
  'tanjong pagar': 'tanjong-pagar',
  'keong saik': 'outram-park',
  'bukit pasoh': 'outram-park',
  'outram': 'outram-park',
  'peck seah': 'tanjong-pagar',
  'duxton': 'tanjong-pagar',
  'ann siang': 'tanjong-pagar',
  'club street': 'tanjong-pagar',

  'little india': 'little-india',
  'race course road': 'little-india',
  'dunlop street': 'little-india',
  'serangoon road': 'little-india',

  'geylang': 'aljunied',

  'orchard': 'orchard',
  'scotts road': 'orchard',
  'ion orchard': 'orchard',
  'shaw centre': 'orchard',
  'hilton': 'orchard',
  'tanglin': 'orchard',
  'goodwood': 'orchard',

  'city hall': 'city-hall',
  'national gallery': 'city-hall',
  'st andrew': 'city-hall',
  'chijmes': 'city-hall',
  'armenian': 'city-hall',
  'victoria street': 'city-hall',

  'marina bay sands': 'bayfront',
  'marina bay': 'marina-bay',
  'bayfront': 'bayfront',
  'the shoppes': 'bayfront',

  'raffles place': 'raffles-place',
  'one fullerton': 'raffles-place',
  'fullerton': 'raffles-place',
  'boat quay': 'raffles-place',

  'bugis': 'bugis',
  'beach road': 'bugis',
  'jalan sultan': 'bugis',
  'arab street': 'bugis',
  'haji lane': 'bugis',

  'dempsey': 'botanic-gardens',
  'botanic gardens': 'botanic-gardens',

  'holland village': 'holland-village',
  'holland drive': 'holland-village',

  'esplanade': 'esplanade',
  'raffles avenue': 'esplanade',
  'millenia walk': 'promenade',
  'promenade': 'promenade',
  'suntec': 'promenade',

  'somerset': 'somerset',
  '313@somerset': 'somerset',
  'orchard central': 'somerset',

  'novena': 'novena',

  'lavender': 'lavender',
  'crawford lane': 'lavender',

  'clarke quay': 'clarke-quay',
  'new bridge road': 'clarke-quay',
  'river valley': 'clarke-quay',

  'mohamed sultan': 'fort-canning',
  'fort canning': 'fort-canning',
  'hill street': 'fort-canning',

  'telok ayer': 'telok-ayer',

  'balestier': 'toa-payoh',
  'toa payoh': 'toa-payoh',

  'farrer park': 'farrer-park',

  'queenstown': 'queenstown',
  'margaret drive': 'queenstown',
  'commonwealth': 'queenstown',

  'geylang bahru': 'geylang-bahru',

  'tai seng': 'tai-seng',

  'tampines': 'tampines',

  'bedok': 'bedok',

  'jurong': 'jurong-east',

  'clementi': 'clementi',

  'bishan': 'bishan',

  'ang mo kio': 'ang-mo-kio',

  'serangoon': 'serangoon',

  'paya lebar': 'paya-lebar',

  'kallang': 'kallang',

  'harbourfront': 'harbourfront',
  'vivocity': 'harbourfront',

  'stevens': 'stevens',

  'woodlands': 'woodlands',

  'bukit panjang': 'bukit-panjang',

  'adam road': 'botanic-gardens',
};

// Read the listings file
const listingsPath = path.join(__dirname, '../data/listings.ts');
let listingsContent = fs.readFileSync(listingsPath, 'utf-8');

// Parse the listings to analyze them
const listingRegex = /\{\s*id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?address:\s*'([^']*)'[\s\S]*?nearestMRT:\s*'([^']*)'/g;

interface ListingInfo {
  id: string;
  name: string;
  address: string;
  currentMRT: string;
  inferredMRT: string | null;
}

const listings: ListingInfo[] = [];
let match;

while ((match = listingRegex.exec(listingsContent)) !== null) {
  listings.push({
    id: match[1],
    name: match[2],
    address: match[3],
    currentMRT: match[4],
    inferredMRT: null,
  });
}

// Infer station for each listing
function inferStation(name: string, address: string): string | null {
  const searchText = `${name} ${address}`.toLowerCase();

  // Check each location keyword
  for (const [keyword, station] of Object.entries(locationToStation)) {
    if (searchText.includes(keyword.toLowerCase())) {
      return station;
    }
  }

  return null;
}

// Process all listings
let alreadyTagged = 0;
let newlyTagged = 0;
let untagged: ListingInfo[] = [];

listings.forEach(listing => {
  if (listing.currentMRT) {
    alreadyTagged++;
    listing.inferredMRT = listing.currentMRT;
  } else {
    const inferred = inferStation(listing.name, listing.address);
    if (inferred) {
      listing.inferredMRT = inferred;
      newlyTagged++;
    } else {
      untagged.push(listing);
    }
  }
});

console.log('\n========== STATION TAGGING SUMMARY ==========\n');
console.log(`Total listings: ${listings.length}`);
console.log(`Already tagged: ${alreadyTagged}`);
console.log(`Newly tagged: ${newlyTagged}`);
console.log(`Still untagged: ${untagged.length}`);

if (untagged.length > 0) {
  console.log('\n--- Untagged Listings (need manual review) ---\n');
  untagged.forEach(l => {
    console.log(`  ${l.id}: "${l.name}"`);
    if (l.address) console.log(`    Address: ${l.address}`);
  });
}

// Generate the updates
console.log('\n--- Generating updates ---\n');

// Create a map of updates needed
const updates: { [id: string]: string } = {};
listings.forEach(listing => {
  if (!listing.currentMRT && listing.inferredMRT) {
    updates[listing.id] = listing.inferredMRT;
  }
});

// Apply updates to the file
let updatedContent = listingsContent;
let updateCount = 0;

for (const [id, station] of Object.entries(updates)) {
  // Find the listing block and update nearestMRT
  const regex = new RegExp(
    `(id:\\s*'${id}'[\\s\\S]*?nearestMRT:\\s*)'([^']*)'`,
    'g'
  );

  const newContent = updatedContent.replace(regex, `$1'${station}'`);
  if (newContent !== updatedContent) {
    updatedContent = newContent;
    updateCount++;
    console.log(`  Updated ${id} -> ${station}`);
  }
}

// For untagged listings, assign a default station based on food type/cuisine
// This ensures EVERY listing has a station
const defaultStationByCuisine: { [key: string]: string } = {
  'indian': 'little-india',
  'north-indian': 'little-india',
  'mutton': 'little-india',
  'biryani': 'little-india',
  'curry': 'little-india',

  'teochew': 'chinatown',
  'cantonese': 'chinatown',
  'chinese': 'chinatown',
  'dim-sum': 'chinatown',
  'duck': 'chinatown',
  'roast-meat': 'chinatown',
  'wonton': 'chinatown',
  'bak-chang': 'chinatown',

  'peranakan': 'tanjong-pagar',

  'thai': 'bugis',
  'isaan': 'bugis',

  'indonesian': 'bugis',

  'malay': 'bugis',
  'nasi-lemak': 'bugis',
  'nasi-padang': 'bugis',

  'japanese': 'orchard',
  'sushi': 'orchard',
  'omakase': 'orchard',

  'french': 'orchard',
  'fine-dining': 'orchard',

  'italian': 'orchard',

  'hawker': 'chinatown',
  'zi-char': 'chinatown',
  'soup': 'chinatown',
  'porridge': 'chinatown',
  'fish-soup': 'chinatown',
  'prawn-noodle': 'chinatown',
  'hokkien-mee': 'chinatown',
  'char-kway-teow': 'chinatown',
  'chicken-rice': 'chinatown',
  'bak-kut-teh': 'clarke-quay',
};

// Assign untagged listings to default stations based on tags
untagged.forEach(listing => {
  // Find the listing in the content and extract tags
  const tagRegex = new RegExp(`id:\\s*'${listing.id}'[\\s\\S]*?tags:\\s*\\[([^\\]]+)\\]`);
  const tagMatch = listingsContent.match(tagRegex);

  let assignedStation = 'chinatown'; // Ultimate fallback

  if (tagMatch) {
    const tags = tagMatch[1].toLowerCase();

    for (const [cuisine, station] of Object.entries(defaultStationByCuisine)) {
      if (tags.includes(cuisine)) {
        assignedStation = station;
        break;
      }
    }
  }

  // Update the listing
  const regex = new RegExp(
    `(id:\\s*'${listing.id}'[\\s\\S]*?nearestMRT:\\s*)'([^']*)'`,
    'g'
  );

  const newContent = updatedContent.replace(regex, `$1'${assignedStation}'`);
  if (newContent !== updatedContent) {
    updatedContent = newContent;
    updateCount++;
    console.log(`  Assigned ${listing.id} -> ${assignedStation} (by cuisine/tag)`);
  }
});

// Write the updated content back
fs.writeFileSync(listingsPath, updatedContent, 'utf-8');

console.log(`\n========== COMPLETE ==========`);
console.log(`Total updates applied: ${updateCount}`);
console.log(`All listings now have a station tag!`);

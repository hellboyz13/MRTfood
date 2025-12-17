/**
 * Add Outlet Details V2 - Chain-aware version
 *
 * 1. Group outlets by normalized chain name (e.g., "Koi", "Starbucks")
 * 2. For each chain: fetch details for ONE outlet only
 * 3. Apply closing_time, tags, and thumbnail to ALL outlets of that chain
 *
 * This saves API costs by not fetching the same chain data multiple times.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Cost tracking
let apiCosts = { textSearch: 0, placeDetails: 0, photos: 0 };
let chainsProcessed = 0;
let outletsUpdated = 0;
let errorCount = 0;

function trackCost(type) {
  const costs = { textSearch: 0.032, placeDetails: 0.017, photos: 0.007 };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
}

// Normalize chain name - extract the core brand name
function normalizeChainName(name) {
  // Remove location suffixes like "@ AMK Hub", "(Bugis)", etc.
  let normalized = name
    .replace(/@\s*[^@]+$/i, '')           // Remove "@ Location"
    .replace(/\([^)]*\)\s*$/i, '')        // Remove "(Location)" at end
    .replace(/[-–]\s*[^-–]+$/i, '')       // Remove "- Location" at end
    .replace(/\s+(at|in)\s+.+$/i, '')     // Remove "at/in Location"
    .trim();

  // Common chain name mappings
  const chainMappings = {
    'ya kun': 'Ya Kun Kaya Toast',
    'yakun': 'Ya Kun Kaya Toast',
    'starbucks': 'Starbucks',
    'mcdonald': 'McDonald\'s',
    'mcdonalds': 'McDonald\'s',
    'kfc': 'KFC',
    'subway': 'Subway',
    'toast box': 'Toast Box',
    'toastbox': 'Toast Box',
    'mos burger': 'MOS Burger',
    'burger king': 'Burger King',
    'texas chicken': 'Texas Chicken',
    'popeyes': 'Popeyes',
    'jollibee': 'Jollibee',
    'swensen': 'Swensen\'s',
    'swensens': 'Swensen\'s',
    'yoshinoya': 'Yoshinoya',
    'sukiya': 'Sukiya',
    'pepper lunch': 'Pepper Lunch',
    'saizeriya': 'Saizeriya',
    'ajisen': 'Ajisen Ramen',
    'soup spoon': 'The Soup Spoon',
    'crystal jade': 'Crystal Jade',
    'din tai fung': 'Din Tai Fung',
    'tim ho wan': 'Tim Ho Wan',
    'hai di lao': 'Haidilao',
    'haidilao': 'Haidilao',
    'paik\'s bibim': 'Paik\'s Bibim',
    'stuff\'d': 'Stuff\'d',
    'stuffd': 'Stuff\'d',
    'gong cha': 'Gong Cha',
    'koi': 'KOI Thé',
    'liho': 'LiHO',
    'each a cup': 'Each A Cup',
    'playmade': 'Playmade',
    'tiger sugar': 'Tiger Sugar',
    'old chang kee': 'Old Chang Kee',
    'polar': 'Polar Puffs & Cakes',
    'breadtalk': 'BreadTalk',
    'four leaves': 'Four Leaves',
    'prima deli': 'Prima Deli',
    'bengawan solo': 'Bengawan Solo',
    'han\'s': 'Han\'s',
    'hans': 'Han\'s',
    'kopitiam': 'Kopitiam',
    'food republic': 'Food Republic',
    'foodfare': 'Foodfare',
    'koufu': 'Koufu',
    'tiong bahru bakery': 'Tiong Bahru Bakery',
    'cedele': 'Cedele',
    'o\'coffee club': 'O\'Coffee Club',
    'the coffee bean': 'The Coffee Bean & Tea Leaf',
    'costa coffee': 'Costa Coffee',
    'coffee bean': 'The Coffee Bean & Tea Leaf',
    'sakae sushi': 'Sakae Sushi',
    'genki sushi': 'Genki Sushi',
    'sushi express': 'Sushi Express',
    'itacho sushi': 'Itacho Sushi',
    'ichiban boshi': 'Ichiban Boshi',
    'ichiban sushi': 'Ichiban Sushi',
    'marché': 'Marché',
    'marche': 'Marché',
    'carl\'s jr': 'Carl\'s Jr.',
    'carls jr': 'Carl\'s Jr.',
    'wingstop': 'Wingstop',
    'nando\'s': 'Nando\'s',
    'nandos': 'Nando\'s',
    'five guys': 'Five Guys',
    'shake shack': 'Shake Shack',
    'astons': 'Astons',
    'aston\'s': 'Astons',
    'jack\'s place': 'Jack\'s Place',
    'jacks place': 'Jack\'s Place',
    'eighteen chefs': 'Eighteen Chefs',
    'thai express': 'Thai Express',
    'nakhon kitchen': 'Nakhon Kitchen',
    'nam nam': 'Nam Nam',
    'so pho': 'So Pho',
    'pho street': 'Pho Street',
    'song fa': 'Song Fa Bak Kut Teh',
    'bak kut teh': 'Bak Kut Teh',
    'putien': 'Putien',
    'jumbo seafood': 'JUMBO Seafood',
    'jumbo': 'JUMBO Seafood',
    'llaollao': 'llaollao',
    'yole': 'Yolé',
    'yole': 'Yolé',
    'boost': 'Boost Juice',
    'boost juice': 'Boost Juice',
    'mr coconut': 'Mr Coconut',
  };

  const lowerName = normalized.toLowerCase();
  for (const [key, value] of Object.entries(chainMappings)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }

  return normalized;
}

// Dessert-related types from Google Places API
const DESSERT_TYPES = [
  'bakery',
  'ice_cream_shop',
  'dessert_shop',
  'cafe',
  'confectionery',
  'pastry_shop',
  'chocolate_shop',
  'donut_shop',
  'sweet_shop'
];

// Search for outlet to get place_id
async function searchOutlet(outletName, mallName) {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos'
      },
      body: JSON.stringify({
        textQuery: `${outletName} ${mallName} Singapore`,
        maxResultCount: 1
      })
    });

    trackCost('textSearch');
    const data = await response.json();

    if (data.places && data.places.length > 0) {
      return {
        placeId: data.places[0].id,
        photoRef: data.places[0].photos?.[0]?.name || null
      };
    }
    return null;
  } catch (error) {
    console.error(`  Error searching for ${outletName}:`, error.message);
    return null;
  }
}

// Get place details (opening_hours, types)
async function getPlaceDetails(placeId) {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'id,regularOpeningHours,types,photos'
      }
    });

    trackCost('placeDetails');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  Error getting details for ${placeId}:`, error.message);
    return null;
  }
}

// Get photo URL
async function getPhotoUrl(photoRef) {
  if (!photoRef) return null;

  try {
    const response = await fetch(`https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=400&maxWidthPx=400&key=${googleApiKey}`, {
      method: 'GET',
      redirect: 'manual'
    });

    trackCost('photos');

    // The API returns a redirect to the actual image URL
    const imageUrl = response.headers.get('location');
    return imageUrl || null;
  } catch (error) {
    console.error(`  Error getting photo:`, error.message);
    return null;
  }
}

// Parse closing time from regularOpeningHours
function parseClosingTime(openingHours) {
  if (!openingHours || !openingHours.periods) return null;

  const periods = openingHours.periods;
  if (periods.length === 1 &&
      periods[0].open &&
      periods[0].open.hour === 0 &&
      periods[0].open.minute === 0 &&
      !periods[0].close) {
    return '24hr';
  }

  let latestClose = null;
  for (const period of periods) {
    if (period.close) {
      const closeTime = `${String(period.close.hour).padStart(2, '0')}:${String(period.close.minute).padStart(2, '0')}`;
      if (!latestClose || closeTime > latestClose) {
        latestClose = closeTime;
      }
    }
  }

  return latestClose;
}

// Determine tags based on API data
function determineTags(closingTime, types) {
  const tags = [];

  if (closingTime === '24hr') {
    tags.push('Supper');
  } else if (closingTime) {
    const hour = parseInt(closingTime.split(':')[0]);
    if (hour >= 21 || (hour >= 0 && hour <= 5)) {
      tags.push('Supper');
    }
  }

  if (types && types.some(t => DESSERT_TYPES.includes(t))) {
    tags.push('Dessert');
  }

  return tags;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipPhotos = args.includes('--skip-photos');

  console.log('========================================');
  console.log('Add Outlet Details V2 (Chain-aware)');
  console.log('========================================\n');

  if (dryRun) console.log('DRY RUN MODE - No changes will be saved\n');
  if (skipPhotos) console.log('Skipping photo fetches\n');

  // Get all outlets with their mall names
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, closing_time, tags, thumbnail_url, malls!inner(name)')
    .is('closing_time', null);  // Only process outlets without closing_time

  if (error) {
    console.error('Error fetching outlets:', error);
    return;
  }

  console.log(`Total outlets to process: ${outlets.length}\n`);

  // Group outlets by normalized chain name
  const chainGroups = new Map();
  for (const outlet of outlets) {
    const chainName = normalizeChainName(outlet.name);
    if (!chainGroups.has(chainName)) {
      chainGroups.set(chainName, []);
    }
    chainGroups.get(chainName).push(outlet);
  }

  console.log(`Grouped into ${chainGroups.size} unique chains\n`);
  console.log('========================================\n');

  // Process each chain
  let chainIndex = 0;
  for (const [chainName, chainOutlets] of chainGroups) {
    chainIndex++;
    chainsProcessed++;

    // Pick the first outlet to fetch details
    const sampleOutlet = chainOutlets[0];
    const mallName = sampleOutlet.malls.name;

    console.log(`[${chainIndex}/${chainGroups.size}] ${chainName} (${chainOutlets.length} outlets)`);
    console.log(`  Sample: ${sampleOutlet.name} @ ${mallName}`);

    // Search for the outlet
    const searchResult = await searchOutlet(sampleOutlet.name, mallName);

    if (!searchResult) {
      console.log('  - No place found');
      errorCount++;
      await delay(100);
      continue;
    }

    // Get place details
    const details = await getPlaceDetails(searchResult.placeId);

    if (!details) {
      console.log('  - Could not get details');
      errorCount++;
      await delay(100);
      continue;
    }

    // Parse closing time and determine tags
    const closingTime = parseClosingTime(details.regularOpeningHours);
    const tags = determineTags(closingTime, details.types);

    // Get photo URL if needed and not skipped
    let thumbnailUrl = null;
    if (!skipPhotos) {
      const photoRef = details.photos?.[0]?.name || searchResult.photoRef;
      if (photoRef) {
        thumbnailUrl = await getPhotoUrl(photoRef);
      }
    }

    console.log(`  - Closing: ${closingTime || 'unknown'}, Tags: [${tags.join(', ')}]${thumbnailUrl ? ', Has photo' : ''}`);

    // Update ALL outlets of this chain
    if (!dryRun) {
      const updateData = {
        google_place_id: searchResult.placeId
      };
      if (closingTime) updateData.closing_time = closingTime;
      if (tags.length > 0) updateData.tags = tags;
      if (thumbnailUrl) updateData.thumbnail_url = thumbnailUrl;

      const outletIds = chainOutlets.map(o => o.id);

      const { error: updateError } = await supabase
        .from('mall_outlets')
        .update(updateData)
        .in('id', outletIds);

      if (updateError) {
        console.log(`  - Update error: ${updateError.message}`);
        errorCount++;
      } else {
        outletsUpdated += chainOutlets.length;
        console.log(`  - Updated ${chainOutlets.length} outlets`);
      }
    }

    await delay(150); // Rate limit
  }

  // Summary
  const totalCost = apiCosts.textSearch + apiCosts.placeDetails + apiCosts.photos;
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Chains processed: ${chainsProcessed}`);
  console.log(`Outlets updated: ${outletsUpdated}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`API Cost: $${totalCost.toFixed(2)}`);
  console.log(`  - Text Search: $${apiCosts.textSearch.toFixed(2)}`);
  console.log(`  - Place Details: $${apiCosts.placeDetails.toFixed(2)}`);
  console.log(`  - Photos: $${apiCosts.photos.toFixed(2)}`);
  console.log('========================================\n');
}

main().catch(console.error);

/**
 * Mall Data Population Script
 * Uses Google Places API (New) to populate malls and food outlets
 *
 * Run with: node scripts/populate-mall-data.js [options]
 *
 * Options:
 *   --test     Test mode: only process 1 mall
 *   --batch N  Process batch N (20 stations per batch)
 *   --photos   Fetch 1 photo per unique chain ($0.024 per chain)
 *   --save     Save data to Supabase database
 *
 * Examples:
 *   node scripts/populate-mall-data.js --test              # Test with 1 mall, no photos
 *   node scripts/populate-mall-data.js --test --photos     # Test with 1 mall + photos
 *   node scripts/populate-mall-data.js --batch 1 --save    # Process batch 1 and save
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const BATCH_SIZE = 20; // Stations per batch
const SEARCH_RADIUS = 1000; // 1km radius for mall search
const MAX_OUTLETS_PER_MALL = 60; // Max results from Places API
const DELAY_MS = 100; // Delay between API calls

// Environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helpers
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// API Cost tracking
let apiCosts = {
  nearbySearch: 0,    // $0.032 per request
  textSearch: 0,      // $0.032 per request
  placeDetails: 0,    // $0.017 per request
  placePhoto: 0,      // $0.007 per request
};

function trackCost(type) {
  const costs = {
    nearbySearch: 0.032,
    textSearch: 0.032,
    placeDetails: 0.017,
    placePhoto: 0.007,
  };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
}

function getTotalCost() {
  return Object.values(apiCosts).reduce((a, b) => a + b, 0);
}

// ============================================
// STEP 1: Find malls near station
// ============================================
async function findMallsNearStation(station) {
  if (!station.lat || !station.lng) {
    console.log(`  Skipping ${station.name} - no coordinates`);
    return [];
  }

  try {
    // Use Nearby Search (New) API
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types'
      },
      body: JSON.stringify({
        includedTypes: ['shopping_mall'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: station.lat, longitude: station.lng },
            radius: SEARCH_RADIUS
          }
        }
      })
    });

    trackCost('nearbySearch');
    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return [];
    }

    return data.places.map(place => ({
      id: slugify(place.displayName.text) + '-' + station.id,
      name: place.displayName.text,
      station_id: station.id,
      address: place.formattedAddress
    }));
  } catch (error) {
    console.error(`  Error finding malls near ${station.name}:`, error.message);
    return [];
  }
}

// ============================================
// STEP 2: Find food outlets in mall
// ============================================
async function findOutletsInMall(mall) {
  const outlets = [];
  let pageToken = null;
  let pageCount = 0;

  try {
    do {
      const requestBody = {
        textQuery: `restaurant ${mall.name} Singapore`,
        maxResultCount: 20,
      };

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.userRatingCount,places.priceLevel,nextPageToken'
        },
        body: JSON.stringify(requestBody)
      });

      trackCost('textSearch');
      const data = await response.json();

      if (data.places) {
        for (const place of data.places) {
          // Filter: must be food-related
          const foodTypes = ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway', 'meal_delivery'];
          const isFood = place.types?.some(t => foodTypes.includes(t));

          if (!isFood) continue;

          // Check if address contains mall name (rough proximity check)
          const addressLower = (place.formattedAddress || '').toLowerCase();
          const mallNameLower = mall.name.toLowerCase();
          const inMall = addressLower.includes(mallNameLower) ||
                        addressLower.includes(mallNameLower.replace(/\s+/g, ''));

          if (!inMall) continue;

          outlets.push({
            id: slugify(place.displayName.text) + '-' + mall.id,
            name: place.displayName.text,
            mall_id: mall.id,
            category: place.types?.filter(t => foodTypes.includes(t)).join(', ') || null,
            price_range: convertPriceLevel(place.priceLevel),
          });
        }
      }

      pageToken = data.nextPageToken;
      pageCount++;

      if (pageToken) {
        await delay(DELAY_MS);
      }
    } while (pageToken && pageCount < 3); // Max 3 pages = 60 results

    return outlets;
  } catch (error) {
    console.error(`  Error finding outlets in ${mall.name}:`, error.message);
    return [];
  }
}

function convertPriceLevel(level) {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return '$';
    case 'PRICE_LEVEL_INEXPENSIVE': return '$';
    case 'PRICE_LEVEL_MODERATE': return '$$';
    case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
    default: return null;
  }
}

// ============================================
// STEP 3: Chain deduplication + Photo fetch
// ============================================
function normalizeChainName(name) {
  // Common chain name normalizations
  const normalized = name
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove parentheses content
    .replace(/\s*-\s*.*$/, '')       // Remove dash suffix
    .replace(/\s+/g, ' ')            // Normalize spaces
    .trim();

  return normalized;
}

async function getUniqueChains(outlets) {
  const chainMap = new Map();

  for (const outlet of outlets) {
    const chainName = normalizeChainName(outlet.name);
    if (!chainMap.has(chainName)) {
      chainMap.set(chainName, {
        id: slugify(chainName),
        name: chainName,
        category: outlet.category,
        outlets: []
      });
    }
    chainMap.get(chainName).outlets.push(outlet);
  }

  return Array.from(chainMap.values());
}

// Fetch photo for a place using Place Details (New) API
async function fetchPlacePhoto(placeId, chainName) {
  try {
    // First get photo reference from Place Details
    const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'photos'
      }
    });

    trackCost('placeDetails');
    const detailsData = await detailsResponse.json();

    if (!detailsData.photos || detailsData.photos.length === 0) {
      console.log(`    No photos for ${chainName}`);
      return null;
    }

    // Get the first photo (use photo name from the response)
    const photoName = detailsData.photos[0].name;

    // Fetch the actual photo URL (maxWidthPx for smaller size)
    const photoResponse = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${googleApiKey}`);

    trackCost('placePhoto');

    if (photoResponse.ok) {
      // The API returns a redirect to the actual image URL
      return photoResponse.url;
    }

    return null;
  } catch (error) {
    console.error(`    Error fetching photo for ${chainName}:`, error.message);
    return null;
  }
}

// Fetch photos for all unique chains (disabled for now)
async function fetchChainPhotos(chains, skipPhotos = false) {
  console.log('  Photo fetching disabled');
  return chains;
}

// ============================================
// STEP 4: Check duplicates with Top Rated
// ============================================
async function findDuplicatesWithListings(outlets) {
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }

  const duplicates = [];
  const listingNames = new Set(listings.map(l => l.name.toLowerCase()));

  for (const outlet of outlets) {
    const isNameMatch = listingNames.has(outlet.name.toLowerCase());

    if (isNameMatch) {
      duplicates.push({
        outlet_name: outlet.name,
        match_type: 'name'
      });
    }
  }

  return duplicates;
}

// ============================================
// Main execution
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const batchIndex = args.includes('--batch')
    ? parseInt(args[args.indexOf('--batch') + 1]) || 1
    : 1;

  console.log('========================================');
  console.log('Mall Data Population Script');
  console.log('========================================');
  console.log(`Mode: ${testMode ? 'TEST (1 mall only)' : 'BATCH ' + batchIndex}`);
  console.log('');

  // Get stations with coordinates
  const { data: allStations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('name');

  if (stationsError) {
    console.error('Error fetching stations:', stationsError);
    process.exit(1);
  }

  console.log(`Total stations with coordinates: ${allStations.length}`);

  // Calculate batch
  const startIndex = (batchIndex - 1) * BATCH_SIZE;
  const endIndex = testMode ? startIndex + 1 : startIndex + BATCH_SIZE;
  const stations = allStations.slice(startIndex, Math.min(endIndex, allStations.length));

  if (stations.length === 0) {
    console.log('No more stations to process!');
    return;
  }

  console.log(`Processing stations ${startIndex + 1} to ${startIndex + stations.length}`);
  console.log('');

  // Collect all data
  const allMalls = [];
  const allOutlets = [];

  // STEP 1: Find malls
  console.log('STEP 1: Finding malls near stations...');
  console.log('----------------------------------------');

  for (const station of stations) {
    console.log(`\n[${station.name}]`);
    const malls = await findMallsNearStation(station);

    if (malls.length > 0) {
      console.log(`  Found ${malls.length} mall(s): ${malls.map(m => m.name).join(', ')}`);
      allMalls.push(...malls);
    } else {
      console.log('  No malls found');
    }

    await delay(DELAY_MS);

    // Test mode: stop after first mall found
    if (testMode && allMalls.length > 0) {
      console.log('\n[TEST MODE] Stopping after first mall');
      break;
    }
  }

  if (allMalls.length === 0) {
    console.log('\nNo malls found! Exiting.');
    return;
  }

  // STEP 2: Find outlets in each mall
  console.log('\n\nSTEP 2: Finding food outlets in malls...');
  console.log('----------------------------------------');

  const mallsToProcess = testMode ? allMalls.slice(0, 1) : allMalls;

  for (const mall of mallsToProcess) {
    console.log(`\n[${mall.name}]`);
    const outlets = await findOutletsInMall(mall);

    if (outlets.length > 0) {
      console.log(`  Found ${outlets.length} outlet(s)`);
      allOutlets.push(...outlets);
    } else {
      console.log('  No outlets found');
    }

    await delay(DELAY_MS);
  }

  // STEP 3: Chain deduplication + Photos
  console.log('\n\nSTEP 3: Identifying unique chains...');
  console.log('----------------------------------------');

  let chains = await getUniqueChains(allOutlets);
  console.log(`Found ${chains.length} unique chains from ${allOutlets.length} outlets`);

  // Show top 10 chains
  const sortedChains = chains.sort((a, b) => b.outlets.length - a.outlets.length);
  console.log('\nTop chains by outlet count:');
  sortedChains.slice(0, 10).forEach((chain, i) => {
    console.log(`  ${i + 1}. ${chain.name} (${chain.outlets.length} outlets)`);
  });

  // Fetch photos if --photos flag is set
  const fetchPhotos = args.includes('--photos');
  if (fetchPhotos) {
    console.log('\nFetching chain photos...');
    chains = await fetchChainPhotos(chains, false);
  } else {
    console.log('\n(Skipping photo fetch - add --photos flag to enable)');
  }

  // STEP 4: Check duplicates
  console.log('\n\nSTEP 4: Checking for duplicates with Top Rated...');
  console.log('----------------------------------------');

  const duplicates = await findDuplicatesWithListings(allOutlets);
  console.log(`Found ${duplicates.length} potential duplicates`);

  if (duplicates.length > 0) {
    console.log('\nDuplicates found:');
    duplicates.slice(0, 10).forEach(d => {
      console.log(`  - ${d.outlet_name} (${d.match_type} match)`);
    });
    if (duplicates.length > 10) {
      console.log(`  ... and ${duplicates.length - 10} more`);
    }
  }

  // Summary
  console.log('\n\n========================================');
  console.log('BATCH SUMMARY');
  console.log('========================================');
  console.log(`Stations processed: ${testMode ? 1 : stations.length}`);
  console.log(`Malls found: ${mallsToProcess.length}`);
  console.log(`Outlets found: ${allOutlets.length}`);
  console.log(`Unique chains: ${chains.length}`);
  console.log(`Duplicates with Top Rated: ${duplicates.length}`);
  console.log('');
  console.log('API COSTS (estimated):');
  console.log(`  Nearby Search: ${apiCosts.nearbySearch} calls = $${(apiCosts.nearbySearch).toFixed(3)}`);
  console.log(`  Text Search: ${apiCosts.textSearch} calls = $${(apiCosts.textSearch).toFixed(3)}`);
  console.log(`  Total: $${getTotalCost().toFixed(3)}`);
  console.log('');

  // Save to database?
  console.log('========================================');
  console.log('DATA PREVIEW');
  console.log('========================================');

  console.log('\nMalls to insert:');
  mallsToProcess.forEach(m => {
    console.log(`  - ${m.name} @ ${m.station_id}`);
  });

  console.log(`\nOutlets to insert: ${allOutlets.length}`);
  allOutlets.slice(0, 5).forEach(o => {
    console.log(`  - ${o.name} (${o.mall_id}) - ${o.price_range || 'no price'}`);
  });
  if (allOutlets.length > 5) {
    console.log(`  ... and ${allOutlets.length - 5} more`);
  }

  console.log('\n========================================');
  console.log('To save this data, run with --save flag');
  console.log('To continue with next batch, run: node scripts/populate-mall-data.js --batch ' + (batchIndex + 1));
  console.log('========================================');

  // If --save flag, actually save to database
  if (args.includes('--save')) {
    console.log('\nSaving to database...');

    // Insert malls
    for (const mall of mallsToProcess) {
      const { error } = await supabase
        .from('malls')
        .upsert(mall, { onConflict: 'id' });

      if (error) {
        console.error(`Error inserting mall ${mall.name}:`, error.message);
      } else {
        console.log(`  ✓ Saved mall: ${mall.name}`);
      }
    }

    // Insert outlets
    for (const outlet of allOutlets) {
      const { error } = await supabase
        .from('mall_outlets')
        .upsert(outlet, { onConflict: 'id' });

      if (error) {
        console.error(`Error inserting outlet ${outlet.name}:`, error.message);
      }
    }
    console.log(`  ✓ Saved ${allOutlets.length} outlets`);

    // Insert chains
    for (const chain of chains) {
      const { error } = await supabase
        .from('chains')
        .upsert({
          id: chain.id,
          name: chain.name,
          category: chain.category
        }, { onConflict: 'id' });

      if (error && !error.message.includes('duplicate')) {
        console.error(`Error inserting chain ${chain.name}:`, error.message);
      }
    }
    console.log(`  ✓ Saved ${chains.length} chains`);

    console.log('\nDone!');
  }
}

main().catch(console.error);

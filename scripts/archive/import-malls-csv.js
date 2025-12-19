/**
 * Import Malls from CSV and Pull Food Outlets
 * 1. Clear existing malls/outlets
 * 2. Import malls from CSV
 * 3. Pull food outlets per mall via Google Places API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// API Cost tracking
let apiCosts = { textSearch: 0 };

function trackCost(type) {
  const costs = { textSearch: 0.032 };
  apiCosts[type] = (apiCosts[type] || 0) + (costs[type] || 0);
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

// Station ID fixes for non-existent stations
const STATION_ID_FIXES = {
  'river-valley': 'clarke-quay',      // Valley Point → Clarke Quay (closest)
  'clementi-west': 'clementi',        // West Coast Plaza → Clementi (closest)
  'seletar': 'sengkang'               // Greenwich V → Sengkang (closest)
};

// Parse CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const malls = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 3) {
      let stationId = values[1].trim();
      // Fix invalid station IDs
      if (STATION_ID_FIXES[stationId]) {
        stationId = STATION_ID_FIXES[stationId];
      }
      malls.push({
        name: values[0].trim(),
        station_id: stationId,
        address: values.slice(2).join(',').trim() // Handle addresses with commas
      });
    }
  }
  return malls;
}

// Find food outlets in mall using Google Places API
async function findOutletsInMall(mall) {
  const outlets = [];
  let pageToken = null;
  let pageCount = 0;

  try {
    do {
      const requestBody = {
        textQuery: `food restaurant cafe ${mall.name} Singapore`,
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
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.priceLevel,nextPageToken'
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

          // Check various matching patterns
          const inMall = addressLower.includes(mallNameLower) ||
                        addressLower.includes(mallNameLower.replace(/\s+/g, '')) ||
                        addressLower.includes(mallNameLower.replace(/[@\s]+/g, ' ').trim());

          if (!inMall) continue;

          const outletId = slugify(place.displayName.text) + '-' + mall.id;

          // Skip duplicates
          if (outlets.some(o => o.id === outletId)) continue;

          outlets.push({
            id: outletId,
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
        await delay(100);
      }
    } while (pageToken && pageCount < 3); // Max 3 pages = 60 results

    return outlets;
  } catch (error) {
    console.error(`  Error finding outlets in ${mall.name}:`, error.message);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipOutlets = args.includes('--skip-outlets');
  const startFrom = args.includes('--start') ? parseInt(args[args.indexOf('--start') + 1]) || 0 : 0;

  console.log('========================================');
  console.log('Import Malls from CSV');
  console.log('========================================\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', '..', 'Downloads', 'singapore-malls.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    console.log('Looking for file in current directory...');

    // Try alternative paths
    const altPaths = [
      'c:\\Users\\JeremyNg\\Downloads\\singapore-malls.csv',
      path.join(process.cwd(), 'singapore-malls.csv'),
    ];

    let foundPath = null;
    for (const p of altPaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      console.error('Could not find singapore-malls.csv');
      process.exit(1);
    }
  }

  const csvContent = fs.readFileSync('c:\\Users\\JeremyNg\\Downloads\\singapore-malls.csv', 'utf-8');
  const mallsFromCSV = parseCSV(csvContent);

  console.log(`Parsed ${mallsFromCSV.length} malls from CSV\n`);

  // Step 1: Clear existing data (only if starting fresh)
  if (startFrom === 0) {
    console.log('Step 1: Clearing existing malls and outlets...');

    const { error: deleteOutletsError } = await supabase
      .from('mall_outlets')
      .delete()
      .neq('id', '');

    if (deleteOutletsError) {
      console.error('Error deleting outlets:', deleteOutletsError);
    }

    const { error: deleteMallsError } = await supabase
      .from('malls')
      .delete()
      .neq('id', '');

    if (deleteMallsError) {
      console.error('Error deleting malls:', deleteMallsError);
    }

    console.log('✓ Cleared existing data\n');
  }

  // Step 2: Import malls
  console.log('Step 2: Importing malls...');

  const malls = mallsFromCSV.map(m => ({
    id: slugify(m.name),
    name: m.name,
    station_id: m.station_id,
    address: m.address
  }));

  // Insert malls ONE BY ONE to avoid batch failures
  let insertedCount = 0;
  for (const mall of malls) {
    const { error } = await supabase
      .from('malls')
      .upsert(mall, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting ${mall.name}:`, error.message);
    } else {
      insertedCount++;
    }
  }

  console.log(`✓ Imported ${insertedCount}/${malls.length} malls\n`);

  // Step 3: Pull food outlets
  if (skipOutlets) {
    console.log('Skipping outlet fetch (--skip-outlets flag)\n');
  } else {
    console.log('Step 3: Pulling food outlets per mall...');
    console.log('(This will take a few minutes)\n');

    let totalOutlets = 0;
    const mallsToProcess = malls.slice(startFrom);

    for (let i = 0; i < mallsToProcess.length; i++) {
      const mall = mallsToProcess[i];
      const index = startFrom + i;
      console.log(`[${index + 1}/${malls.length}] ${mall.name}`);

      const outlets = await findOutletsInMall(mall);

      if (outlets.length > 0) {
        console.log(`  Found ${outlets.length} outlets`);

        // Insert outlets
        const { error } = await supabase
          .from('mall_outlets')
          .upsert(outlets, { onConflict: 'id' });

        if (error) {
          console.error(`  Error inserting outlets:`, error.message);
        }

        totalOutlets += outlets.length;
      } else {
        console.log(`  No outlets found`);
      }

      await delay(150); // Rate limit
    }

    console.log(`\n✓ Total outlets found: ${totalOutlets}`);
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Malls imported: ${malls.length}`);
  console.log(`API Cost: $${apiCosts.textSearch.toFixed(2)}`);
  console.log('========================================\n');
}

main().catch(console.error);

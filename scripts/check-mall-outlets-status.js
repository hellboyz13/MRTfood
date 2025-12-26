const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const CONFIG = {
  batchSize: 50,
  startOffset: 0,
  delayBetweenRequests: 300,
  dryRun: false,
};

// Parse command line args
const args = process.argv.slice(2);
args.forEach(arg => {
  if (arg.startsWith('--offset=')) CONFIG.startOffset = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--batch=')) CONFIG.batchSize = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') CONFIG.dryRun = true;
});

/**
 * Search Google Places API for business status
 */
async function checkGooglePlacesStatus(outletName, mallName) {
  const query = `${outletName} ${mallName} Singapore`;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.businessStatus,places.formattedAddress'
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
    });

    const data = await response.json();
    const place = data.places?.[0];

    if (!place) {
      return { found: false, status: 'NOT_FOUND', query };
    }

    return {
      found: true,
      status: place.businessStatus || 'UNKNOWN',
      name: place.displayName?.text,
      address: place.formattedAddress
    };
  } catch (error) {
    console.error('  API Error:', error.message);
    return { found: false, status: 'API_ERROR', error: error.message };
  }
}

async function main() {
  console.log('=== CHECKING MALL OUTLET OPERATIONAL STATUS ===\n');
  console.log('Config: batch=' + CONFIG.batchSize + ', offset=' + CONFIG.startOffset + ', dryRun=' + CONFIG.dryRun + '\n');

  // Fetch mall outlets with mall info
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, malls(name)')
    .order('created_at', { ascending: true })
    .range(CONFIG.startOffset, CONFIG.startOffset + CONFIG.batchSize - 1);

  if (error) {
    console.error('Failed to fetch outlets:', error.message);
    return;
  }

  console.log('Fetched ' + outlets.length + ' outlets (offset: ' + CONFIG.startOffset + ')\n');

  // Results tracking
  const results = {
    operational: [],
    closedTemporarily: [],
    closedPermanently: [],
    notFound: [],
    errors: []
  };

  // Process each outlet
  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    const mallName = outlet.malls?.name || outlet.mall_id;

    console.log('[' + (i + 1) + '/' + outlets.length + '] ' + outlet.name);
    console.log('  Mall: ' + mallName);

    const googleResult = await checkGooglePlacesStatus(outlet.name, mallName);
    console.log('  Google Places: ' + googleResult.status);

    const resultEntry = {
      id: outlet.id,
      name: outlet.name,
      mall: mallName,
      googleResult: googleResult,
      finalStatus: googleResult.status
    };

    switch (googleResult.status) {
      case 'OPERATIONAL':
        results.operational.push(resultEntry);
        console.log('  -> OPERATIONAL');
        break;
      case 'CLOSED_TEMPORARILY':
        results.closedTemporarily.push(resultEntry);
        console.log('  -> FLAGGED: Temporarily Closed');
        break;
      case 'CLOSED_PERMANENTLY':
        results.closedPermanently.push(resultEntry);
        console.log('  -> FLAGGED: Permanently Closed');
        break;
      case 'NOT_FOUND':
        results.notFound.push(resultEntry);
        console.log('  -> NOT FOUND (needs manual review)');
        break;
      default:
        results.errors.push(resultEntry);
        console.log('  -> ERROR: ' + googleResult.status);
    }

    console.log('');
    await delay(CONFIG.delayBetweenRequests);
  }

  // Summary
  console.log('=== SUMMARY ===');
  console.log('Operational: ' + results.operational.length);
  console.log('Temporarily Closed: ' + results.closedTemporarily.length);
  console.log('Permanently Closed: ' + results.closedPermanently.length);
  console.log('Not Found: ' + results.notFound.length);
  console.log('Errors: ' + results.errors.length);

  // Save results to JSON file for review (append mode)
  const fs = require('fs');
  const outputFile = 'mall-outlets-closed.json';

  let existingResults = { closedTemporarily: [], closedPermanently: [], notFound: [] };
  try {
    if (fs.existsSync(outputFile)) {
      existingResults = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    }
  } catch (e) {}

  // Append new results
  existingResults.closedTemporarily.push(...results.closedTemporarily);
  existingResults.closedPermanently.push(...results.closedPermanently);
  existingResults.notFound.push(...results.notFound);

  fs.writeFileSync(outputFile, JSON.stringify(existingResults, null, 2));
  console.log('\nResults saved to ' + outputFile);
  console.log('Total flagged so far: ' +
    (existingResults.closedTemporarily.length + existingResults.closedPermanently.length) +
    ' closed, ' + existingResults.notFound.length + ' not found');

  // Print flagged outlets
  if (results.closedTemporarily.length > 0) {
    console.log('\n=== TEMPORARILY CLOSED ===');
    results.closedTemporarily.forEach(item => {
      console.log('- ' + item.name + ' (' + item.mall + ')');
    });
  }

  if (results.closedPermanently.length > 0) {
    console.log('\n=== PERMANENTLY CLOSED ===');
    results.closedPermanently.forEach(item => {
      console.log('- ' + item.name + ' (' + item.mall + ')');
    });
  }

  if (results.notFound.length > 0) {
    console.log('\n=== NOT FOUND ===');
    results.notFound.forEach(item => {
      console.log('- ' + item.name + ' (' + item.mall + ')');
    });
  }

  console.log('\nDone!');
}

main().catch(console.error);

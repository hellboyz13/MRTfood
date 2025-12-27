const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration
const CONFIG = {
  batchSize: 50,
  startOffset: 0,
  dryRun: true,
  onlyNoTags: false, // Only check listings with no tags
};

// Parse command line args
const args = process.argv.slice(2);
let reverseOrder = false;
args.forEach(arg => {
  if (arg.startsWith('--offset=')) CONFIG.startOffset = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--batch=')) CONFIG.batchSize = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') CONFIG.dryRun = true;
  if (arg === '--no-dry-run') CONFIG.dryRun = false;
  if (arg === '--reverse') reverseOrder = true;
  if (arg === '--no-tags') CONFIG.onlyNoTags = true;
});

// Progressive delay
let consecutiveSuccess = 0;
function getDelay() {
  if (consecutiveSuccess < 10) return 500;
  if (consecutiveSuccess < 30) return 300;
  if (consecutiveSuccess < 50) return 200;
  return 100;
}

// Comprehensive cuisine/tag keywords to detect
const CUISINE_KEYWORDS = {
  'Chinese': ['chinese restaurant', 'chinese cuisine', 'chinese food', 'china restaurant', 'dim sum', 'cantonese', 'szechuan', 'sichuan', 'teochew', 'hokkien', 'hainanese', 'hakka', 'shanghainese', 'la mian', 'xiao long bao'],
  'Japanese': ['japanese restaurant', 'japanese cuisine', 'japanese food', 'sushi', 'ramen', 'udon', 'izakaya', 'omakase', 'tempura', 'donburi', 'tonkatsu', 'yakitori', 'sashimi', 'katsu'],
  'Korean': ['korean restaurant', 'korean cuisine', 'korean food', 'bibimbap', 'kimchi', 'bulgogi', 'kbbq', 'korean bbq', 'pojangmacha', 'jjigae', 'samgyeopsal'],
  'Thai': ['thai restaurant', 'thai cuisine', 'thai food', 'tom yum', 'pad thai', 'green curry', 'basil chicken', 'mookata', 'thai bbq'],
  'Indian': ['indian restaurant', 'indian cuisine', 'indian food', 'north indian', 'south indian', 'curry house', 'biryani', 'tandoori', 'naan', 'masala', 'dosa', 'prata', 'roti prata'],
  'Western': ['western restaurant', 'western cuisine', 'western food', 'steak house', 'steakhouse', 'burger joint', 'grill house', 'american restaurant'],
  'Italian': ['italian restaurant', 'italian cuisine', 'italian food', 'pasta', 'pizza', 'risotto', 'trattoria', 'pizzeria', 'osteria'],
  'Vietnamese': ['vietnamese restaurant', 'vietnamese cuisine', 'vietnamese food', 'pho', 'banh mi', 'bun cha', 'com tam'],
  'Malay': ['malay restaurant', 'malay cuisine', 'malay food', 'nasi lemak', 'rendang', 'satay', 'ayam penyet', 'nasi padang'],
  'Indonesian': ['indonesian restaurant', 'indonesian cuisine', 'indonesian food', 'nasi goreng', 'mie goreng', 'ayam bakar'],
  'Cafe': ['cafe', 'coffee shop', 'coffeehouse', 'brunch spot', 'breakfast cafe', 'specialty coffee', 'espresso bar'],
  'Dessert': ['dessert shop', 'dessert cafe', 'ice cream', 'gelato', 'froyo', 'frozen yogurt', 'cake shop', 'bakery', 'patisserie', 'sweet shop'],
  'Hawker': ['hawker', 'food centre', 'kopitiam', 'hawker centre', 'food court', 'coffee shop stall'],
  'Seafood': ['seafood restaurant', 'seafood', 'crab restaurant', 'fish restaurant', 'chilli crab', 'black pepper crab'],
  'Halal': ['halal certified', 'halal restaurant', 'halal food', 'muslim restaurant', 'halal-certified'],
  'Vegetarian': ['vegetarian restaurant', 'vegetarian', 'vegan restaurant', 'vegan', 'plant-based', 'meat-free'],
  'Fine Dining': ['fine dining', 'michelin star', 'upscale restaurant', 'premium dining', 'haute cuisine', 'tasting menu'],
  'Buffet': ['buffet restaurant', 'buffet', 'all you can eat', 'unlimited buffet'],
  'Fast Food': ['fast food', 'quick service restaurant', 'qsr'],
  'BBQ': ['bbq restaurant', 'barbecue', 'grill', 'yakiniku', 'korean bbq', 'charcoal grill'],
  'Hotpot': ['hotpot', 'steamboat', 'shabu shabu', 'mala hotpot'],
  'Dim Sum': ['dim sum', 'yum cha', 'dim sum restaurant'],
  'Bakery': ['bakery', 'bread shop', 'pastry shop', 'boulangerie'],
  'Peranakan': ['peranakan', 'nyonya', 'nonya', 'straits chinese'],
  'Local': ['singaporean food', 'local food', 'singapore cuisine', 'local cuisine'],
};

/**
 * Use Playwright to search Google and extract cuisine/category info
 */
async function checkWithPlaywright(browser, name, address) {
  const page = await browser.newPage();
  const searchQuery = `${name} ${address || ''} Singapore`;

  try {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(2000);

    const content = await page.content();
    const lowerContent = content.toLowerCase();

    // Detect cuisines from page content
    const detectedCuisines = [];
    for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword.toLowerCase())) {
          if (!detectedCuisines.includes(cuisine)) {
            detectedCuisines.push(cuisine);
          }
          break;
        }
      }
    }

    // Also try to extract from Google's knowledge panel
    // Look for price range and type indicators
    const hasPrice = lowerContent.includes('$$') || lowerContent.includes('$$$') || lowerContent.includes('price');
    const isRestaurant = lowerContent.includes('restaurant');
    const isCafe = lowerContent.includes('cafe') || lowerContent.includes('coffee');

    await page.close();
    return {
      success: true,
      detectedCuisines,
      searchQuery
    };

  } catch (error) {
    await page.close();
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=== VERIFYING FOOD LISTING TAGS (Playwright) ===\n');
  console.log('Config: batch=' + CONFIG.batchSize + ', offset=' + CONFIG.startOffset + ', dryRun=' + CONFIG.dryRun + ', onlyNoTags=' + CONFIG.onlyNoTags + '\n');

  // Build query
  let query = supabase
    .from('food_listings')
    .select('id, name, address, tags, station_id, description')
    .eq('is_active', true)
    .order('created_at', { ascending: !reverseOrder });

  // Filter for only listings with no tags if specified
  if (CONFIG.onlyNoTags) {
    query = query.or('tags.is.null,tags.eq.{}');
  }

  query = query.range(CONFIG.startOffset, CONFIG.startOffset + CONFIG.batchSize - 1);

  const { data: listings, error } = await query;

  console.log('Direction: ' + (reverseOrder ? 'BOTTOM-UP (reverse)' : 'TOP-DOWN'));

  if (error) {
    console.error('Failed to fetch listings:', error.message);
    return;
  }

  console.log('Fetched ' + listings.length + ' listings (offset: ' + CONFIG.startOffset + ')\n');

  // Get station names for context
  const { data: stations } = await supabase.from('stations').select('id, name');
  const stationMap = Object.fromEntries(stations.map(s => [s.id, s.name]));

  console.log('Launching Playwright browser...\n');
  const browser = await chromium.launch({ headless: true });

  const results = {
    matched: [],
    mismatched: [],
    noTags: [],
    errors: []
  };

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const stationName = stationMap[listing.station_id] || '';
    const currentTags = listing.tags || [];

    console.log('[' + (i + 1) + '/' + listings.length + '] ' + listing.name);
    console.log('  Station: ' + stationName);
    console.log('  Current tags: ' + (currentTags.length > 0 ? currentTags.join(', ') : '(none)'));

    const result = await checkWithPlaywright(browser, listing.name, listing.address);

    if (!result.success) {
      console.log('  -> ERROR: ' + result.error);
      results.errors.push({ ...listing, error: result.error });
      consecutiveSuccess = 0;
    } else {
      consecutiveSuccess++;
      console.log('  Detected: ' + (result.detectedCuisines.length > 0 ? result.detectedCuisines.join(', ') : '(none)'));

      // Check if current tags match detected cuisines
      const normalizedCurrentTags = currentTags.map(t => t.toLowerCase());

      const missingTags = result.detectedCuisines.filter(t =>
        !normalizedCurrentTags.includes(t.toLowerCase())
      );

      if (currentTags.length === 0) {
        console.log('  -> NO TAGS - Suggested: ' + (result.detectedCuisines.length > 0 ? result.detectedCuisines.join(', ') : '(could not detect)'));
        results.noTags.push({
          id: listing.id,
          name: listing.name,
          station: stationName,
          suggestedTags: result.detectedCuisines
        });
      } else if (missingTags.length > 0) {
        console.log('  -> POTENTIAL MISSING: ' + missingTags.join(', '));
        results.mismatched.push({
          id: listing.id,
          name: listing.name,
          station: stationName,
          currentTags: currentTags,
          detectedCuisines: result.detectedCuisines,
          missingTags
        });
      } else {
        console.log('  -> OK');
        results.matched.push({ id: listing.id, name: listing.name });
      }
    }

    const currentDelay = getDelay();
    console.log('  [delay: ' + currentDelay + 'ms, streak: ' + consecutiveSuccess + ']');
    console.log('');
    await delay(currentDelay);
  }

  await browser.close();
  console.log('Browser closed.\n');

  // Summary
  console.log('=== SUMMARY ===');
  console.log('Matched (tags OK): ' + results.matched.length);
  console.log('Missing tags: ' + results.mismatched.length);
  console.log('No tags: ' + results.noTags.length);
  console.log('Errors: ' + results.errors.length);

  // Save results
  const outputFile = 'tag-verification-results.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log('\nResults saved to ' + outputFile);

  // Print listings needing attention
  if (results.noTags.length > 0) {
    console.log('\n=== LISTINGS WITH NO TAGS ===');
    results.noTags.forEach(item => {
      console.log('- ' + item.name + ' (' + item.station + ')');
      if (item.suggestedTags.length > 0) {
        console.log('  Suggested: ' + item.suggestedTags.join(', '));
      }
    });
  }

  if (results.mismatched.length > 0) {
    console.log('\n=== LISTINGS WITH POTENTIAL MISSING TAGS ===');
    results.mismatched.slice(0, 20).forEach(item => {
      console.log('- ' + item.name);
      console.log('  Current: ' + item.currentTags.join(', '));
      console.log('  Missing: ' + item.missingTags.join(', '));
    });
    if (results.mismatched.length > 20) {
      console.log('  ... and ' + (results.mismatched.length - 20) + ' more');
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);

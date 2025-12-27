const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

async function getLowRatedRestaurants() {
  const { data, error } = await supabase
    .from('food_listings')
    .select('id, name, rating, address')
    .lt('rating', 3.5)
    .order('rating', { ascending: true });

  if (error) {
    console.error('Error fetching:', error);
    return [];
  }
  return data;
}

async function verifyRatingOnGoogleMaps(page, restaurant) {
  try {
    // Search on Google Maps
    const searchQuery = encodeURIComponent(`${restaurant.name} Singapore`);
    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
      waitUntil: 'load',
      timeout: 20000
    });

    // Wait for the page to stabilize
    await page.waitForTimeout(4000);

    let googleRating = null;

    // Method 1: Look for the main rating display in the side panel
    try {
      const ratingElement = await page.$('span[aria-hidden="true"].fontDisplayLarge');
      if (ratingElement) {
        const text = await ratingElement.textContent();
        const num = parseFloat(text);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          googleRating = num;
        }
      }
    } catch (e) {}

    // Method 2: Look for rating in aria-label of the first result
    if (!googleRating) {
      try {
        const results = await page.$$('[role="article"]');
        for (const result of results.slice(0, 3)) {
          const ariaLabel = await result.getAttribute('aria-label');
          if (ariaLabel) {
            const match = ariaLabel.match(/(\d+\.?\d*)\s*stars?/i);
            if (match) {
              googleRating = parseFloat(match[1]);
              break;
            }
          }
        }
      } catch (e) {}
    }

    // Method 3: Look in the page HTML for rating patterns
    if (!googleRating) {
      try {
        const content = await page.content();

        const ratingMatch = content.match(/"aggregateRating".*?"ratingValue"[:\s]*"?(\d+\.?\d*)"?/);
        if (ratingMatch) {
          googleRating = parseFloat(ratingMatch[1]);
        }

        if (!googleRating) {
          const ariaMatch = content.match(/aria-label="(\d+\.?\d*)\s*stars?/i);
          if (ariaMatch) {
            googleRating = parseFloat(ariaMatch[1]);
          }
        }

        if (!googleRating) {
          const fontMatch = content.match(/class="[^"]*fontDisplayLarge[^"]*"[^>]*>(\d+\.?\d*)</);
          if (fontMatch) {
            googleRating = parseFloat(fontMatch[1]);
          }
        }
      } catch (e) {}
    }

    // Method 4: Click first result and check detail view
    if (!googleRating) {
      try {
        const firstResult = await page.$('[role="article"] a, a[data-value]');
        if (firstResult) {
          await firstResult.click();
          await page.waitForTimeout(2000);

          const detailRating = await page.$('span.fontDisplayLarge, div[role="img"][aria-label*="stars"]');
          if (detailRating) {
            const text = await detailRating.textContent();
            const num = parseFloat(text);
            if (!isNaN(num) && num >= 1 && num <= 5) {
              googleRating = num;
            } else {
              const ariaLabel = await detailRating.getAttribute('aria-label');
              if (ariaLabel) {
                const match = ariaLabel.match(/(\d+\.?\d*)/);
                if (match) {
                  googleRating = parseFloat(match[1]);
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    const isNumeric = googleRating !== null && !isNaN(googleRating);
    const ratingConfirmed = isNumeric && googleRating < 3.5;

    return {
      ...restaurant,
      googleRating,
      isNumeric,
      ratingConfirmed
    };
  } catch (error) {
    return {
      ...restaurant,
      googleRating: null,
      isNumeric: false,
      ratingConfirmed: false,
      error: error.message
    };
  }
}

async function deleteRestaurant(id, name) {
  const { error } = await supabase
    .from('food_listings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Failed to delete ${name}:`, error);
    return false;
  }
  console.log(`✓ Deleted: ${name}`);
  return true;
}

async function main() {
  console.log('Fetching restaurants with rating < 3.5...\n');
  const restaurants = await getLowRatedRestaurants();
  console.log(`Found ${restaurants.length} restaurants to verify\n`);

  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const results = [];
  const toDelete = [];
  const notVerified = [];

  // Process ALL restaurants
  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = restaurants[i];
    console.log(`[${i + 1}/${restaurants.length}] Checking: ${restaurant.name} (DB: ${restaurant.rating})`);

    const result = await verifyRatingOnGoogleMaps(page, restaurant);
    results.push(result);

    if (result.googleRating) {
      console.log(`  → Google: ${result.googleRating} | DB: ${restaurant.rating}`);

      if (result.googleRating < 3.5) {
        console.log(`  → CONFIRMED LOW: Will delete`);
        toDelete.push(result);
      } else {
        console.log(`  → Higher on Google (${result.googleRating}), keeping`);
        notVerified.push(result);
      }
    } else {
      console.log(`  → Could not find Google rating`);
      notVerified.push(result);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total checked: ${restaurants.length}`);
  console.log(`Confirmed low (to delete): ${toDelete.length}`);
  console.log(`Not verified / higher rating: ${notVerified.length}`);

  // Delete confirmed low-rated restaurants
  if (toDelete.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('DELETING CONFIRMED LOW-RATED RESTAURANTS...');
    console.log('-'.repeat(60));

    let deleted = 0;
    for (const restaurant of toDelete) {
      const success = await deleteRestaurant(restaurant.id, restaurant.name);
      if (success) deleted++;
    }

    console.log(`\nDeleted ${deleted}/${toDelete.length} restaurants`);
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/low-rating-verification-results.json',
    JSON.stringify({ toDelete, notVerified, all: results }, null, 2)
  );
  console.log('\nResults saved to scripts/low-rating-verification-results.json');
}

main().catch(console.error);

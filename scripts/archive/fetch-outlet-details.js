/**
 * Script to fetch opening hours and floor/unit details from Google Places API
 * for all mall outlets that have a google_place_id
 *
 * Cost: FREE (Basic Data tier - opening_hours and address_components)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Rate limiting: Google allows 50 requests/second, we'll be conservative
const DELAY_MS = 100; // 10 requests/second

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract floor/unit from address_components (Places API New format)
function extractFloorUnit(addressComponents) {
  if (!addressComponents || !Array.isArray(addressComponents)) return null;

  // Look for subpremise (unit number) and floor components
  const subpremise = addressComponents.find(c => c.types && c.types.includes('subpremise'));
  const floor = addressComponents.find(c => c.types && c.types.includes('floor'));

  if (subpremise) {
    // Format: #02-15 or Unit 15
    const unit = subpremise.longText || subpremise.shortText;
    if (unit && unit.startsWith('#')) {
      return unit; // Already formatted like #02-15
    }
    // Try to extract from patterns like "Level 2, Unit 15"
    if (unit) {
      const match = unit.match(/#?\d+-\d+/);
      if (match) {
        return match[0].startsWith('#') ? match[0] : `#${match[0]}`;
      }
      return unit; // Return as-is if no pattern matches
    }
  }

  if (floor) {
    const floorText = floor.longText || floor.shortText;
    return floorText ? `Level ${floorText}` : null;
  }

  return null;
}

async function fetchPlaceDetails(placeId) {
  // Using Places API (New) - requires field mask in header
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'currentOpeningHours,addressComponents'
      }
    });

    const data = await response.json();

    if (response.ok && data) {
      const { currentOpeningHours, addressComponents } = data;

      // Convert new API format to match the expected format
      let openingHours = null;
      if (currentOpeningHours) {
        openingHours = {
          open_now: currentOpeningHours.openNow,
          periods: currentOpeningHours.periods?.map(p => ({
            open: {
              day: p.open.day,
              time: `${String(p.open.hour).padStart(2, '0')}${String(p.open.minute).padStart(2, '0')}`
            },
            close: p.close ? {
              day: p.close.day,
              time: `${String(p.close.hour).padStart(2, '0')}${String(p.close.minute).padStart(2, '0')}`
            } : undefined
          })),
          weekday_text: currentOpeningHours.weekdayDescriptions || []
        };
      }

      return {
        opening_hours: openingHours,
        level: extractFloorUnit(addressComponents),
      };
    } else {
      console.error(`Error fetching place ${placeId}:`, data.error?.message || response.status);
      return null;
    }
  } catch (error) {
    console.error(`Failed to fetch place ${placeId}:`, error.message);
    return null;
  }
}

async function updateOutlet(outletId, details) {
  const { error } = await supabase
    .from('mall_outlets')
    .update({
      opening_hours: details.opening_hours,
      level: details.level || undefined, // Only update if we got a floor/unit
      updated_at: new Date().toISOString(),
    })
    .eq('id', outletId);

  if (error) {
    console.error(`Failed to update outlet ${outletId}:`, error.message);
    return false;
  }
  return true;
}

async function main() {
  console.log('Fetching mall outlets with Google Place IDs...');

  // Get all outlets with google_place_id
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, google_place_id, level')
    .not('google_place_id', 'is', null);

  if (error) {
    console.error('Failed to fetch outlets:', error.message);
    process.exit(1);
  }

  console.log(`Found ${outlets.length} outlets with Google Place IDs`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < outlets.length; i++) {
    const outlet = outlets[i];
    console.log(`\n[${i + 1}/${outlets.length}] Processing: ${outlet.name}`);
    console.log(`  Place ID: ${outlet.google_place_id}`);

    // Fetch details from Google Places API
    const details = await fetchPlaceDetails(outlet.google_place_id);

    if (details) {
      // Update database
      const success = await updateOutlet(outlet.id, details);

      if (success) {
        successCount++;
        console.log(`  ✓ Updated successfully`);
        if (details.level) {
          console.log(`    Floor/Unit: ${details.level}`);
        }
        if (details.opening_hours) {
          console.log(`    Opening hours: Available`);
        }
      } else {
        errorCount++;
        console.log(`  ✗ Failed to update database`);
      }
    } else {
      errorCount++;
      console.log(`  ✗ Failed to fetch details`);
    }

    // Rate limiting
    if (i < outlets.length - 1) {
      await delay(DELAY_MS);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  Total outlets: ${outlets.length}`);
  console.log(`  Successfully updated: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mapping of hawker centre names to mall IDs
const HAWKER_CENTRE_MAP = {
  'Maxwell Food Centre': 'maxwell-food-centre',
  'Tiong Bahru Market': 'tiong-bahru-food-centre',
  'Old Airport Road Food Centre': 'old-airport-road-food-centre',
  'Amoy Street Food Centre': 'amoy-street-food-centre',
  'Adam Road Food Centre': 'adam-road-food-centre',
  'Hong Lim Food Centre': 'hong-lim-market-and-food-centre',
  'Newton Food Centre': 'newton-food-centre',
  'Chinatown Complex Food Centre': 'chinatown-complex',
  'Ghim Moh Market Food Centre': 'ghim-moh-market-and-food-centre',
  'Holland Village Food Centre': 'holland-village-market-and-food-centre',
  'Pek Kio Market Food Centre': 'pek-kio-market-and-food-centre',
  'Seah Im Food Centre': 'seah-im-food-centre',
  'Sembawang Hills Food Centre': 'sembawang-hills-food-centre',
  'Telok Blangah Crescent Food Centre': 'telok-blangah-food-centre',
  'Woodleigh Village Hawker Centre': 'woodleigh-village-hawker-centre',
  'Kampung Admiralty Hawker Centre': 'kampung-admiralty-hawker-centre',
  'Kovan 209 Market Food Centre': 'kovan-209-market-and-food-centre',
  'Bedok Interchange Hawker Centre': 'bedok-interchange-hawker-centre',
  'Fernvale Hawker Centre': 'fernvale-hawker-centre-and-market',
  'Our Tampines Hub Hawker': 'our-tampines-hub-hawker',
  'Bendemeer Market Food Centre': 'bendemeer-market-and-food-centre',
  'Circuit Road Hawker Centre': 'circuit-road-hawker-centre',
  'Punggol Coast Hawker Centre': 'punggol-coast-hawker-centre'
};

function cleanHours(hours) {
  if (!hours || hours === 'N/A') return null;
  // Clean up the hours string
  let cleaned = hours
    .replace(/Tel:.*$/i, '')
    .replace(/Website.*$/i, '')
    .replace(/is not a halal.*$/i, '')
    .replace(/is a halal.*$/i, '')
    .replace(/is a Muslim.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Skip if it looks like a description rather than hours
  if (cleaned.length > 100) return null;
  if (!cleaned.match(/\d/)) return null;
  if (cleaned.match(/^(ed|s |a stall|till |from )/i)) return null;

  return cleaned || null;
}

function cleanUnit(unit) {
  if (!unit || unit === 'N/A') return null;
  // Extract just the unit number
  const match = unit.match(/#?\d{1,2}[-–]\d{1,3}/);
  if (match) {
    return match[0].startsWith('#') ? match[0] : '#' + match[0];
  }
  return null;
}

function normalizeStallName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateDetails() {
  console.log('='.repeat(60));
  console.log('UPDATING HAWKER STALL DETAILS');
  console.log('='.repeat(60));

  // Read scraped details
  const detailsPath = path.join(__dirname, '..', 'hawker-stall-details.json');
  const details = JSON.parse(fs.readFileSync(detailsPath, 'utf-8'));

  // Get all hawker stalls from database
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, level, opening_hours')
    .eq('category', 'hawker stall');

  if (error) {
    console.error('Error fetching outlets:', error.message);
    return;
  }

  console.log(`\nTotal hawker stalls in DB: ${outlets.length}`);

  let updatedUnit = 0;
  let updatedHours = 0;
  let noMatch = 0;

  // Process each hawker centre
  for (const [hawkerName, stalls] of Object.entries(details)) {
    const mallId = HAWKER_CENTRE_MAP[hawkerName];
    if (!mallId) {
      console.log(`\nNo mapping for: ${hawkerName}`);
      continue;
    }

    console.log(`\n--- ${hawkerName} (${mallId}) ---`);

    // Get outlets for this hawker centre
    const centreOutlets = outlets.filter(o => o.mall_id === mallId);
    console.log(`  DB outlets: ${centreOutlets.length}`);

    // Create a map of normalized names to scraped details
    const scrapedMap = new Map();
    for (const stall of stalls) {
      const normalized = normalizeStallName(stall.name);
      scrapedMap.set(normalized, {
        unit: cleanUnit(stall.unit),
        hours: cleanHours(stall.openingHours)
      });
    }

    // Match and update
    for (const outlet of centreOutlets) {
      const normalized = normalizeStallName(outlet.name);

      // Try exact match first
      let match = scrapedMap.get(normalized);

      // Try partial matches if no exact match
      if (!match) {
        for (const [scrapedName, data] of scrapedMap.entries()) {
          if (normalized.includes(scrapedName) || scrapedName.includes(normalized)) {
            match = data;
            break;
          }
          // Check first 3 words match
          const outletWords = normalized.split(' ').slice(0, 3).join(' ');
          const scrapedWords = scrapedName.split(' ').slice(0, 3).join(' ');
          if (outletWords.length > 5 && outletWords === scrapedWords) {
            match = data;
            break;
          }
        }
      }

      if (match && (match.unit || match.hours)) {
        const updates = {};
        if (match.unit && !outlet.level) {
          updates.level = match.unit;
        }
        if (match.hours && !outlet.opening_hours) {
          updates.opening_hours = match.hours;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('mall_outlets')
            .update(updates)
            .eq('id', outlet.id);

          if (!updateError) {
            if (updates.level) {
              updatedUnit++;
              console.log(`  + ${outlet.name}: unit=${updates.level}`);
            }
            if (updates.opening_hours) {
              updatedHours++;
              console.log(`  + ${outlet.name}: hours=${updates.opening_hours.substring(0, 40)}...`);
            }
          }
        }
      } else {
        noMatch++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Updated with unit number: ${updatedUnit}`);
  console.log(`Updated with opening hours: ${updatedHours}`);
  console.log(`No match found: ${noMatch}`);
}

updateDetails().catch(console.error);

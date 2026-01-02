/**
 * Re-tag food_listings and mall_outlets for Supper and Dessert filters
 *
 * Run with: node scripts/retag-supper-dessert.js
 *
 * Use --dry-run to see changes without applying them
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// Tags that indicate dessert
const DESSERT_TAGS = [
  'Ice Cream', 'Gelato', 'Cakes', 'Tarts', 'Patisserie', 'Waffles',
  'Beancurd', 'Chendol', 'Chinese Dessert', 'Frozen Yogurt', 'Matcha',
  'Donuts', 'Mochi', 'Japanese Dessert', 'Chocolate', 'Croissants',
  'Croissant', 'Pastry', 'Pastries', 'Desserts', 'Tang Yuan', 'Bombolini'
];

// Tags that indicate supper
const SUPPER_TAGS = ['Late Night', '24-Hour', '24hr'];

// Categories that indicate dessert (for mall_outlets)
const DESSERT_CATEGORIES = [
  'dessert', 'ice cream', 'gelato', 'bakery', 'bubble tea', 'bbt',
  'patisserie', 'pastry', 'cakes', 'sweets'
];

// Check if outlet is open late based on opening_hours
function isOpenLate(openingHours) {
  if (!openingHours) return false;

  const hours = typeof openingHours === 'string'
    ? openingHours
    : JSON.stringify(openingHours);

  // Check for 24-hour operation
  if (hours.includes('"0000"') && hours.includes('Open 24')) return true;
  if (hours.includes('24 hours')) return true;

  // Check for late closing times (11pm / 23:00 or later)
  const lateClosingTimes = [
    '"2300"', '"2330"',
    '"0000"', '"0030"', '"0100"', '"0130"',
    '"0200"', '"0230"', '"0300"', '"0330"',
    '"0400"', '"0430"', '"0500"'
  ];

  for (const time of lateClosingTimes) {
    if (hours.includes(time)) {
      // Make sure it's a closing time, not opening time
      // By checking if it appears after "close"
      const closeIndex = hours.indexOf('"close"');
      const timeIndex = hours.indexOf(time);
      if (closeIndex !== -1 && timeIndex > closeIndex) return true;
    }
  }

  return false;
}

// Check if category indicates dessert
function isDessertCategory(category) {
  if (!category) return false;
  const catLower = category.toLowerCase();
  return DESSERT_CATEGORIES.some(d => catLower.includes(d));
}

async function retagListings() {
  console.log('\n=== Re-tagging food_listings ===');

  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, tags, opening_hours')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  let supperAdded = 0;
  let dessertAdded = 0;
  const updates = [];

  for (const listing of listings) {
    const currentTags = listing.tags || [];
    let newTags = [...currentTags];
    let changed = false;

    // Check for Supper tag
    if (!currentTags.includes('Supper')) {
      // Add Supper if has Late Night or 24-Hour tag
      if (SUPPER_TAGS.some(t => currentTags.includes(t))) {
        newTags.push('Supper');
        supperAdded++;
        changed = true;
        console.log(`[SUPPER] Adding to: ${listing.name} (has ${SUPPER_TAGS.filter(t => currentTags.includes(t)).join(', ')} tag)`);
      }
      // Add Supper if open late based on hours
      else if (isOpenLate(listing.opening_hours)) {
        newTags.push('Supper');
        supperAdded++;
        changed = true;
        console.log(`[SUPPER] Adding to: ${listing.name} (open late based on hours)`);
      }
    }

    // Check for Dessert tag
    if (!currentTags.includes('Dessert')) {
      // Add Dessert if has dessert-related tags
      const matchingTags = DESSERT_TAGS.filter(t => currentTags.includes(t));
      if (matchingTags.length > 0) {
        newTags.push('Dessert');
        dessertAdded++;
        changed = true;
        console.log(`[DESSERT] Adding to: ${listing.name} (has ${matchingTags.join(', ')} tag)`);
      }
    }

    if (changed) {
      updates.push({ id: listing.id, tags: newTags });
    }
  }

  console.log(`\nSummary for food_listings:`);
  console.log(`  - Supper tags to add: ${supperAdded}`);
  console.log(`  - Dessert tags to add: ${dessertAdded}`);
  console.log(`  - Total updates: ${updates.length}`);

  if (!DRY_RUN && updates.length > 0) {
    console.log('\nApplying updates...');
    for (const update of updates) {
      const { error } = await supabase
        .from('food_listings')
        .update({ tags: update.tags })
        .eq('id', update.id);

      if (error) console.error(`Error updating ${update.id}:`, error);
    }
    console.log('Done!');
  }
}

async function retagOutlets() {
  console.log('\n=== Re-tagging mall_outlets ===');

  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, tags, category, opening_hours');

  if (error) {
    console.error('Error fetching outlets:', error);
    return;
  }

  let supperAdded = 0;
  let dessertAdded = 0;
  const updates = [];

  for (const outlet of outlets) {
    const currentTags = outlet.tags || [];
    let newTags = [...currentTags];
    let changed = false;

    // Check for Supper tag
    if (!currentTags.includes('Supper')) {
      // Add Supper if open late based on hours
      if (isOpenLate(outlet.opening_hours)) {
        newTags.push('Supper');
        supperAdded++;
        changed = true;
        console.log(`[SUPPER] Adding to: ${outlet.name} (open late based on hours)`);
      }
    }

    // Check for Dessert tag
    if (!currentTags.includes('Dessert')) {
      // Add Dessert if category indicates dessert
      if (isDessertCategory(outlet.category)) {
        newTags.push('Dessert');
        dessertAdded++;
        changed = true;
        console.log(`[DESSERT] Adding to: ${outlet.name} (category: ${outlet.category})`);
      }
    }

    if (changed) {
      updates.push({ id: outlet.id, tags: newTags });
    }
  }

  console.log(`\nSummary for mall_outlets:`);
  console.log(`  - Supper tags to add: ${supperAdded}`);
  console.log(`  - Dessert tags to add: ${dessertAdded}`);
  console.log(`  - Total updates: ${updates.length}`);

  if (!DRY_RUN && updates.length > 0) {
    console.log('\nApplying updates...');
    for (const update of updates) {
      const { error } = await supabase
        .from('mall_outlets')
        .update({ tags: update.tags })
        .eq('id', update.id);

      if (error) console.error(`Error updating ${update.id}:`, error);
    }
    console.log('Done!');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('RE-TAGGING SCRIPT FOR SUPPER & DESSERT FILTERS');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  await retagListings();
  await retagOutlets();

  console.log('\n='.repeat(60));
  if (DRY_RUN) {
    console.log('DRY RUN COMPLETE - Run without --dry-run to apply changes');
  } else {
    console.log('RE-TAGGING COMPLETE');
  }
  console.log('='.repeat(60));
}

main();

/**
 * Fix fake 24-hour entries based on web research
 *
 * Run with: node scripts/fix-fake-24h-manual.js
 * Use --dry-run to preview changes without applying
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

// Research results from web searches
// Format: { station_id, name, actualHours, closesLate (11pm+), note }
const FOOD_LISTINGS_FIXES = [
  // ACTUALLY 24 HOURS - Keep as is
  { station: 'yishun', name: '505 Sembawang Bakchormee', is24h: true, closesLate: true, note: 'Confirmed 24h' },
  { station: 'rochor', name: 'Feng Sheng Chicken Rice & Steamboat', is24h: true, closesLate: true, note: 'Confirmed 24h (some sources say 6am Fri-Sat)' },
  { station: 'rochor', name: 'Le Taste Bistro 8', is24h: true, closesLate: true, note: 'Inside Bistro 8 which is 24h' },
  { station: 'ang-mo-kio', name: 'Takagi Ramen', is24h: true, closesLate: true, note: 'Confirmed 24h' },
  { station: 'lorong-chuan', name: 'Srisun Express', is24h: true, closesLate: true, note: 'Confirmed 24h' },
  { station: 'ang-mo-kio', name: 'Kuai San Dian Xin', is24h: true, closesLate: true, note: 'Confirmed 24h (AMK Ave 10 outlet)' },
  { station: 'marsiling', name: 'Kuai San Dian Xin', is24h: true, closesLate: true, note: 'Confirmed 24h' },
  { station: 'queenstown', name: 'Ah Er Soup', is24h: true, closesLate: true, note: 'Multiple outlets, main one 24h' },

  // NOT 24 HOURS - Fix hours and maybe remove Supper tag
  { station: 'orchard', name: 'Sen', is24h: false, closesLate: false,
    hours: '11:00am - 10:00pm', closeTime: '2200', note: 'Sen-ryo ION - closes 10pm' },
  { station: 'nicoll-highway', name: 'Sen', is24h: false, closesLate: false,
    hours: '10:00am - 8:00pm (Thu-Tue)', closeTime: '2000', note: 'Sen Vietnamese - closes 8pm' },
  { station: 'farrer-park', name: 'Lang Nuong Vietnam', is24h: false, closesLate: false,
    hours: '12:00pm - 11:00pm', closeTime: '2300', note: 'Closes 11pm - borderline supper' },
  { station: 'lakeside', name: 'Boon Lay Satay', is24h: false, closesLate: true,
    hours: '3:00pm - 1:00am (Tue-Sun), Closed Mon', closeTime: '0100', note: 'Closes 1am - valid supper' },
  { station: 'lakeside', name: "Ho Huat's Fried Hokkien Mee", is24h: false, closesLate: true,
    hours: '24 hours (assumed)', closeTime: null, note: 'No info found - keep as is' },
  { station: 'tai-seng', name: '23 Jumpin', is24h: false, closesLate: false,
    hours: 'CLOSED', closeTime: null, note: 'Permanently closed - should be deactivated' },
  { station: 'upper-thomson', name: 'Ming Fa Fishball Noodles', is24h: false, closesLate: true,
    hours: '9:00am - 4:30am', closeTime: '0430', note: 'Closes 4:30am - valid supper' },
  { station: 'bendemeer', name: 'Le Taste', is24h: true, closesLate: true,
    note: 'Inside Bistro 8 which is 24h' },
  { station: 'punggol-coast', name: 'Xiang Chi Mian Traditional Bak Chor Mee', is24h: false, closesLate: true,
    hours: 'Unknown', closeTime: null, note: 'No hours found - keep as is' },
  { station: 'chinatown', name: 'Zhou Zhen Zhen Vermicelli & Noodles', is24h: false, closesLate: true,
    hours: 'Unknown', closeTime: null, note: 'No hours found - keep as is' },
  { station: 'lavender', name: 'Bak Chor Mee', is24h: false, closesLate: true,
    hours: 'Unknown', closeTime: null, note: 'No info found - keep as is' },
];

// Mall outlets fixes
const MALL_OUTLETS_FIXES = [
  { mall: 'punggol-plaza', name: 'Kopitiam Corner', is24h: true, closesLate: true,
    note: 'Many Kopitiam Corners are 24h' },
  { mall: 'yewtee-point', name: 'Burger King', is24h: false, closesLate: false,
    hours: '8:00am - 10:00pm (maybe 24h Fri-Sat)', closeTime: '2200', note: 'Closes 10pm weekdays' },
  { mall: 'plaza-singapura', name: 'BURGER KING', is24h: false, closesLate: false,
    hours: '8:30am - 10:30pm (11:30pm Fri-Sat)', closeTime: '2230', note: 'Closes 10:30pm' },
];

// Helper to create proper opening_hours object
function createOpeningHours(closeTime, weekdayText) {
  if (!closeTime) return null;

  const periods = [];
  for (let day = 0; day <= 6; day++) {
    periods.push({
      open: { day, time: '0900' }, // Default 9am open
      close: { day, time: closeTime }
    });
  }

  return {
    periods,
    weekday_text: weekdayText ? [weekdayText] : undefined
  };
}

async function fixEntries() {
  console.log('='.repeat(60));
  console.log('FIX FAKE 24-HOUR ENTRIES (Based on Web Research)');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  // ==================== FOOD LISTINGS ====================
  console.log('\n=== Processing food_listings ===\n');

  let fixedCount = 0;
  let supperRemovedCount = 0;
  let deactivatedCount = 0;

  for (const fix of FOOD_LISTINGS_FIXES) {
    // Find the listing
    const { data: listings } = await supabase
      .from('food_listings')
      .select('id, name, station_id, tags, opening_hours')
      .eq('station_id', fix.station)
      .ilike('name', fix.name)
      .eq('is_active', true);

    if (!listings || listings.length === 0) {
      console.log(`NOT FOUND: ${fix.name} @ ${fix.station}`);
      continue;
    }

    const listing = listings[0];
    console.log(`Processing: ${listing.name} @ ${listing.station_id}`);
    console.log(`  Note: ${fix.note}`);

    // Check if it's actually 24h
    if (fix.is24h) {
      console.log(`  CONFIRMED 24H - No changes needed`);
      continue;
    }

    // Check if closed permanently
    if (fix.hours === 'CLOSED') {
      console.log(`  PERMANENTLY CLOSED - Deactivating listing`);
      if (!DRY_RUN) {
        await supabase.from('food_listings').update({ is_active: false }).eq('id', listing.id);
      }
      deactivatedCount++;
      continue;
    }

    // Prepare updates
    const updates = {};
    let newTags = listing.tags || [];

    // Update opening_hours if we have a close time
    if (fix.closeTime) {
      updates.opening_hours = createOpeningHours(fix.closeTime, fix.hours);
      console.log(`  NEW HOURS: ${fix.hours}`);
    }

    // Remove Supper tag if doesn't close late
    const hasSupperTag = newTags.includes('Supper');
    if (hasSupperTag && !fix.closesLate) {
      newTags = newTags.filter(t => t !== 'Supper');
      updates.tags = newTags;
      supperRemovedCount++;
      console.log(`  REMOVE SUPPER TAG: Closes before 11pm`);
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('food_listings')
          .update(updates)
          .eq('id', listing.id);
        if (error) console.log(`  ERROR: ${error.message}`);
        else console.log(`  UPDATED`);
      } else {
        console.log(`  Would update (dry run)`);
      }
      fixedCount++;
    } else {
      console.log(`  NO CHANGES needed`);
    }
  }

  // ==================== MALL OUTLETS ====================
  console.log('\n=== Processing mall_outlets ===\n');

  let outletFixedCount = 0;
  let outletSupperRemovedCount = 0;

  for (const fix of MALL_OUTLETS_FIXES) {
    const { data: outlets } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, tags, opening_hours')
      .eq('mall_id', fix.mall)
      .ilike('name', `%${fix.name}%`);

    if (!outlets || outlets.length === 0) {
      console.log(`NOT FOUND: ${fix.name} @ ${fix.mall}`);
      continue;
    }

    const outlet = outlets[0];
    console.log(`Processing: ${outlet.name} @ ${outlet.mall_id}`);
    console.log(`  Note: ${fix.note}`);

    if (fix.is24h) {
      console.log(`  CONFIRMED 24H - No changes needed`);
      continue;
    }

    const updates = {};
    let newTags = outlet.tags || [];

    if (fix.closeTime) {
      updates.opening_hours = createOpeningHours(fix.closeTime, fix.hours);
      console.log(`  NEW HOURS: ${fix.hours}`);
    }

    const hasSupperTag = newTags.includes('Supper');
    if (hasSupperTag && !fix.closesLate) {
      newTags = newTags.filter(t => t !== 'Supper');
      updates.tags = newTags;
      outletSupperRemovedCount++;
      console.log(`  REMOVE SUPPER TAG: Closes before 11pm`);
    }

    if (Object.keys(updates).length > 0) {
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('mall_outlets')
          .update(updates)
          .eq('id', outlet.id);
        if (error) console.log(`  ERROR: ${error.message}`);
        else console.log(`  UPDATED`);
      } else {
        console.log(`  Would update (dry run)`);
      }
      outletFixedCount++;
    } else {
      console.log(`  NO CHANGES needed`);
    }
  }

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`food_listings fixed: ${fixedCount}`);
  console.log(`food_listings deactivated: ${deactivatedCount}`);
  console.log(`food_listings Supper tags removed: ${supperRemovedCount}`);
  console.log(`mall_outlets fixed: ${outletFixedCount}`);
  console.log(`mall_outlets Supper tags removed: ${outletSupperRemovedCount}`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes');
  }
}

fixEntries();

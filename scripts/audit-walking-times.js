/**
 * Audit walking times for all food listings
 * Check how many have incorrect walking times
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditWalkingTimes() {
  console.log('Fetching all food listings...\n');

  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name, station_id, distance_to_station, walking_time')
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total active listings: ${listings.length}\n`);

  // Analyze walking times
  const issues = {
    missingTime: [],
    missingDistance: [],
    timeWayTooHigh: [],    // walking time > 20 min for < 500m
    timeTooHigh: [],       // walking time doesn't match distance (> 2 min per 100m)
    timeTooLow: [],        // walking time too low for distance
  };

  // Expected: ~80m per minute walking = 1.25 min per 100m
  // Allow range: 1-2 min per 100m

  listings.forEach(listing => {
    const dist = listing.distance_to_station;
    const time = listing.walking_time;

    if (!time && dist) {
      issues.missingTime.push(listing);
      return;
    }

    if (!dist && time) {
      issues.missingDistance.push(listing);
      return;
    }

    if (!dist || !time) return;

    // Calculate expected time range
    const expectedTime = dist / 80; // 80m per minute
    const minExpected = Math.max(1, expectedTime * 0.5);
    const maxExpected = expectedTime * 2;

    // Flag extreme cases
    if (dist < 500 && time > 20) {
      issues.timeWayTooHigh.push({
        ...listing,
        expectedTime: Math.round(expectedTime),
        diff: time - Math.round(expectedTime)
      });
    } else if (time > maxExpected && time - expectedTime > 3) {
      issues.timeTooHigh.push({
        ...listing,
        expectedTime: Math.round(expectedTime),
        diff: time - Math.round(expectedTime)
      });
    } else if (time < minExpected && expectedTime - time > 3) {
      issues.timeTooLow.push({
        ...listing,
        expectedTime: Math.round(expectedTime),
        diff: Math.round(expectedTime) - time
      });
    }
  });

  // Print results
  console.log('='.repeat(60));
  console.log('WALKING TIME AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Missing walking time: ${issues.missingTime.length}`);
  console.log(`Missing distance: ${issues.missingDistance.length}`);
  console.log(`Time WAY too high (<500m but >20min): ${issues.timeWayTooHigh.length}`);
  console.log(`Time too high (>2x expected): ${issues.timeTooHigh.length}`);
  console.log(`Time too low (<0.5x expected): ${issues.timeTooLow.length}`);
  console.log('='.repeat(60));

  const totalIssues = issues.timeWayTooHigh.length + issues.timeTooHigh.length + issues.timeTooLow.length;
  console.log(`\nTOTAL LISTINGS WITH WRONG WALKING TIME: ${totalIssues}`);

  if (issues.timeWayTooHigh.length > 0) {
    console.log('\n\nEXTREME CASES (short distance but very long walk time):');
    console.log('-'.repeat(60));
    issues.timeWayTooHigh.sort((a, b) => b.walking_time - a.walking_time);
    issues.timeWayTooHigh.slice(0, 20).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name}`);
      console.log(`   Distance: ${item.distance_to_station}m, Stored time: ${item.walking_time} min, Expected: ~${item.expectedTime} min`);
    });
    if (issues.timeWayTooHigh.length > 20) {
      console.log(`\n... and ${issues.timeWayTooHigh.length - 20} more`);
    }
  }

  // Distribution of walking times
  console.log('\n\nWALKING TIME DISTRIBUTION:');
  console.log('-'.repeat(60));
  const timeRanges = {
    '1-5 min': 0,
    '6-10 min': 0,
    '11-15 min': 0,
    '16-20 min': 0,
    '21-30 min': 0,
    '31-60 min': 0,
    '60+ min': 0,
  };

  listings.forEach(l => {
    const t = l.walking_time;
    if (!t) return;
    if (t <= 5) timeRanges['1-5 min']++;
    else if (t <= 10) timeRanges['6-10 min']++;
    else if (t <= 15) timeRanges['11-15 min']++;
    else if (t <= 20) timeRanges['16-20 min']++;
    else if (t <= 30) timeRanges['21-30 min']++;
    else if (t <= 60) timeRanges['31-60 min']++;
    else timeRanges['60+ min']++;
  });

  Object.entries(timeRanges).forEach(([range, count]) => {
    console.log(`${range}: ${count} listings`);
  });
}

auditWalkingTimes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

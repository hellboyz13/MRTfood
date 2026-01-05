/**
 * Fix records missing the formatted field in opening_hours
 * Handles various edge cases in the data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Format time from "1100" to "11:00 AM"
function formatTime(time) {
  if (!time || time.length !== 4) return time;
  const hour = parseInt(time.substring(0, 2));
  const minute = time.substring(2, 4);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return minute === '00' ? `${hour12} ${period}` : `${hour12}:${minute} ${period}`;
}

// Generate formatted hours from periods array
function formatFromPeriods(periods) {
  if (!periods || !Array.isArray(periods) || periods.length === 0) return null;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayHours = new Map();

  // Build hours for each day
  for (const period of periods) {
    if (!period.open) continue;
    const day = period.open.day;
    let openTime, closeTime;

    // Handle different formats
    if (period.open.time) {
      openTime = formatTime(period.open.time);
    } else if (period.open.hour !== undefined) {
      const h = period.open.hour;
      const m = period.open.minute || 0;
      const p = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      openTime = m === 0 ? `${h12} ${p}` : `${h12}:${String(m).padStart(2, '0')} ${p}`;
    }

    if (period.close) {
      if (period.close.time) {
        closeTime = formatTime(period.close.time);
      } else if (period.close.hour !== undefined) {
        const h = period.close.hour;
        const m = period.close.minute || 0;
        const p = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        closeTime = m === 0 ? `${h12} ${p}` : `${h12}:${String(m).padStart(2, '0')} ${p}`;
      }
    }

    if (openTime) {
      const hoursStr = closeTime ? `${openTime} – ${closeTime}` : `Opens ${openTime}`;
      dayHours.set(day, hoursStr);
    }
  }

  // Check if all days have same hours
  const uniqueHours = [...new Set(dayHours.values())];
  if (uniqueHours.length === 1 && dayHours.size === 7) {
    return [`Mon–Sun: ${uniqueHours[0]}`];
  }

  // Check for weekday/weekend patterns
  const weekdays = [1, 2, 3, 4, 5].map(d => dayHours.get(d));
  const weekends = [0, 6].map(d => dayHours.get(d));

  if (weekdays.every(h => h && h === weekdays[0]) &&
      weekends.every(h => h && h === weekends[0]) &&
      weekdays[0] !== weekends[0]) {
    return [
      `Mon–Fri: ${weekdays[0]}`,
      `Sat, Sun: ${weekends[0]}`
    ];
  }

  // Group consecutive days with same hours
  const formatted = [];
  let i = 0;
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

  while (i < 7) {
    const day = dayOrder[i];
    const hours = dayHours.get(day);

    if (!hours) {
      // Day is closed
      let j = i + 1;
      while (j < 7 && !dayHours.get(dayOrder[j])) j++;

      if (j - i > 1) {
        formatted.push(`${days[dayOrder[i]]}–${days[dayOrder[j-1]]}: Closed`);
      } else {
        formatted.push(`${days[day]}: Closed`);
      }
      i = j;
    } else {
      // Find consecutive days with same hours
      let j = i + 1;
      while (j < 7 && dayHours.get(dayOrder[j]) === hours) j++;

      if (j - i > 1) {
        formatted.push(`${days[dayOrder[i]]}–${days[dayOrder[j-1]]}: ${hours}`);
      } else {
        formatted.push(`${days[day]}: ${hours}`);
      }
      i = j;
    }
  }

  return formatted;
}

// Clean weekday description text
function cleanWeekdayText(text) {
  if (!text) return null;

  // Remove "Closed · Opens X" patterns - these are useless without full schedule
  if (text.match(/Closed\s*[·•]\s*Opens/i)) {
    return null;
  }

  // Clean up format like "Monday10:30 am–3:30 am" -> "Monday: 10:30 AM – 3:30 PM"
  let cleaned = text
    .replace(/([a-zA-Z])(\d)/g, '$1: $2') // Add colon+space between day and time
    .replace(/(\d+)\s*am/gi, '$1 AM')
    .replace(/(\d+)\s*pm/gi, '$1 PM')
    .replace(/–/g, ' – ')
    .replace(/-/g, ' – ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

async function fixMissingFormatted() {
  console.log('Fetching records missing formatted field...\n');

  // Get all food_listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  // Filter those missing formatted
  const needsFixing = listings.filter(l => {
    const oh = l.opening_hours;
    if (typeof oh === 'string') return false;
    if (typeof oh === 'object' && oh && !oh.formatted) return true;
    return false;
  });

  console.log(`Found ${needsFixing.length} records to fix\n`);

  let fixed = 0;
  let skipped = 0;

  for (const listing of needsFixing) {
    const oh = listing.opening_hours;
    let formatted = null;

    // Try to generate formatted from periods
    if (oh.periods && Array.isArray(oh.periods) && oh.periods.length > 0) {
      formatted = formatFromPeriods(oh.periods);
    }

    // Try weekday_text if available
    if (!formatted && oh.weekday_text && oh.weekday_text.length > 0) {
      if (oh.weekday_text.length === 1) {
        // Single item - use as-is after cleaning
        const cleaned = cleanWeekdayText(oh.weekday_text[0]);
        if (cleaned) formatted = [cleaned];
      } else if (oh.weekday_text.length === 7) {
        // Full week - already handled by polish script, shouldn't be here
        formatted = oh.weekday_text;
      }
    }

    // Try weekdayDescriptions (alternative field name)
    if (!formatted && oh.weekdayDescriptions && oh.weekdayDescriptions.length > 0) {
      const validDescriptions = oh.weekdayDescriptions
        .map(cleanWeekdayText)
        .filter(Boolean);

      if (validDescriptions.length > 0) {
        formatted = validDescriptions.slice(0, 7); // Limit to 7 days max
      }
    }

    if (!formatted || formatted.length === 0) {
      console.log(`Skipping ${listing.name} - cannot generate formatted hours`);
      skipped++;
      continue;
    }

    // Update database
    const updatedOh = { ...oh, formatted };

    const { error } = await supabase
      .from('food_listings')
      .update({ opening_hours: updatedOh })
      .eq('id', listing.id);

    if (error) {
      console.log(`Error updating ${listing.name}: ${error.message}`);
    } else {
      console.log(`Fixed: ${listing.name}`);
      console.log(`  formatted: ${JSON.stringify(formatted)}`);
      fixed++;
    }
  }

  // Also fix mall_outlets
  console.log('\nChecking mall_outlets...');

  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  const outletNeedsFix = outlets.filter(l => {
    const oh = l.opening_hours;
    if (typeof oh === 'string') return false;
    if (typeof oh === 'object' && oh && !oh.formatted) return true;
    return false;
  });

  console.log(`Found ${outletNeedsFix.length} outlets to fix\n`);

  let outletFixed = 0;

  for (const outlet of outletNeedsFix) {
    const oh = outlet.opening_hours;
    let formatted = null;

    if (oh.periods && Array.isArray(oh.periods) && oh.periods.length > 0) {
      formatted = formatFromPeriods(oh.periods);
    }

    if (!formatted && oh.weekday_text && oh.weekday_text.length > 0) {
      if (oh.weekday_text.length === 1) {
        const cleaned = cleanWeekdayText(oh.weekday_text[0]);
        if (cleaned) formatted = [cleaned];
      }
    }

    if (!formatted && oh.weekdayDescriptions && oh.weekdayDescriptions.length > 0) {
      const validDescriptions = oh.weekdayDescriptions
        .map(cleanWeekdayText)
        .filter(Boolean);

      if (validDescriptions.length > 0) {
        formatted = validDescriptions.slice(0, 7);
      }
    }

    if (!formatted || formatted.length === 0) {
      skipped++;
      continue;
    }

    const updatedOh = { ...oh, formatted };

    const { error } = await supabase
      .from('mall_outlets')
      .update({ opening_hours: updatedOh })
      .eq('id', outlet.id);

    if (!error) {
      console.log(`Fixed outlet: ${outlet.name}`);
      outletFixed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('FIX SUMMARY');
  console.log('='.repeat(50));
  console.log(`Food listings fixed: ${fixed}`);
  console.log(`Mall outlets fixed: ${outletFixed}`);
  console.log(`Skipped (no valid data): ${skipped}`);
  console.log('='.repeat(50));
}

fixMissingFormatted()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

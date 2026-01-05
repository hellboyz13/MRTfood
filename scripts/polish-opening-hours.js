/**
 * Polish opening hours for all food listings and mall outlets
 * Makes them more user-friendly and consistent
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format time from "1130" to "11:30 AM"
 */
function formatTime(time) {
  if (!time) return '';
  const hour = parseInt(time.substring(0, 2));
  const min = time.substring(2);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
}

/**
 * Parse time string like "11:30 AM" or "11:30am" to minutes
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const min = parseInt(match[2] || '0');
  const period = (match[3] || '').toLowerCase();

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  return hour * 60 + min;
}

/**
 * Format minutes back to time string
 */
function minutesToTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse and polish opening hours from various formats
 */
function polishOpeningHours(openingHours) {
  if (!openingHours) return null;

  // If it's a simple string like "Daily 8am to 8pm"
  if (typeof openingHours === 'string') {
    return polishSimpleString(openingHours);
  }

  // If it has weekday_text (Google format)
  if (openingHours.weekday_text && Array.isArray(openingHours.weekday_text)) {
    return polishWeekdayText(openingHours.weekday_text);
  }

  // If it has weekdayDescriptions
  if (openingHours.weekdayDescriptions && Array.isArray(openingHours.weekdayDescriptions)) {
    return polishWeekdayText(openingHours.weekdayDescriptions);
  }

  // If it has periods array, convert to weekday text first
  if (openingHours.periods && Array.isArray(openingHours.periods)) {
    const weekdayText = periodsToWeekdayText(openingHours.periods);
    return polishWeekdayText(weekdayText);
  }

  return null;
}

/**
 * Convert periods array to weekday text
 */
function periodsToWeekdayText(periods) {
  const dayHours = {};

  // Group by day
  periods.forEach(period => {
    const day = period.open?.day;
    if (day === undefined) return;

    if (!dayHours[day]) dayHours[day] = [];

    const open = formatTime(period.open?.time);
    const close = formatTime(period.close?.time);
    if (open && close) {
      dayHours[day].push(`${open} – ${close}`);
    }
  });

  // Convert to weekday text
  const result = [];
  for (let i = 0; i < 7; i++) {
    const dayName = DAYS[i];
    const hours = dayHours[i];
    if (hours && hours.length > 0) {
      result.push(`${dayName}: ${hours.join(', ')}`);
    } else {
      result.push(`${dayName}: Closed`);
    }
  }

  return result;
}

/**
 * Polish simple string format
 */
function polishSimpleString(str) {
  // Normalize the string
  let normalized = str
    .replace(/\s+/g, ' ')
    .replace(/(\d)(am|pm)/gi, '$1 $2')
    .replace(/am/gi, 'AM')
    .replace(/pm/gi, 'PM')
    .replace(/\s*-\s*/g, ' – ')
    .replace(/\s*to\s*/gi, ' – ')
    .trim();

  return [normalized];
}

/**
 * Polish weekday text array
 */
function polishWeekdayText(weekdayText) {
  if (!weekdayText || weekdayText.length === 0) return null;

  // Skip if it's just status like "Closed · Opens 10 am"
  if (weekdayText.length === 1 && weekdayText[0].includes('·')) {
    return null;
  }

  // Parse each day's hours
  const dayHoursMap = new Map();

  weekdayText.forEach(line => {
    // Parse "Monday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM"
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) return;

    const dayName = match[1];
    let hours = match[2].trim();

    // Skip "Closed" - we'll handle it separately
    if (hours.toLowerCase() === 'closed') {
      dayHoursMap.set(dayName, 'Closed');
      return;
    }

    // Fix cramped format like "5:30 – 9:30 PM" (missing AM/PM on first time)
    // Split by comma for multiple periods
    const periods = hours.split(/,\s*/);
    const fixedPeriods = periods.map(period => {
      // Match time ranges
      const rangeMatch = period.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
      if (!rangeMatch) return period;

      let [, startTime, startPeriod, endTime, endPeriod] = rangeMatch;

      // If end has period but start doesn't, infer start period
      if (!startPeriod && endPeriod) {
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);

        // If start hour > end hour and end is PM, start is likely PM too
        // e.g., 5:30 – 9:30 PM -> 5:30 PM – 9:30 PM
        if (startHour <= endHour || endPeriod.toUpperCase() === 'PM') {
          startPeriod = endPeriod;
        } else {
          startPeriod = 'AM';
        }
      }

      startPeriod = (startPeriod || 'AM').toUpperCase();
      endPeriod = (endPeriod || 'PM').toUpperCase();

      return `${startTime} ${startPeriod} – ${endTime} ${endPeriod}`;
    });

    dayHoursMap.set(dayName, fixedPeriods.join(', '));
  });

  // Group consecutive days with same hours
  const result = [];
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  let i = 0;
  while (i < dayOrder.length) {
    const dayName = dayOrder[i];
    const hours = dayHoursMap.get(dayName);

    if (!hours) {
      i++;
      continue;
    }

    // Find consecutive days with same hours
    let endIdx = i;
    while (endIdx + 1 < dayOrder.length) {
      const nextDay = dayOrder[endIdx + 1];
      const nextHours = dayHoursMap.get(nextDay);
      if (nextHours === hours) {
        endIdx++;
      } else {
        break;
      }
    }

    // Format the day range
    const startShort = SHORT_DAYS[DAYS.indexOf(dayOrder[i])];
    const endShort = SHORT_DAYS[DAYS.indexOf(dayOrder[endIdx])];

    let dayRange;
    if (i === endIdx) {
      dayRange = startShort;
    } else if (endIdx - i === 1) {
      dayRange = `${startShort}, ${endShort}`;
    } else {
      dayRange = `${startShort}–${endShort}`;
    }

    // Format hours - split multiple periods onto separate lines
    if (hours === 'Closed') {
      result.push(`${dayRange}: Closed`);
    } else {
      const hourParts = hours.split(', ');
      if (hourParts.length === 1) {
        result.push(`${dayRange}: ${hourParts[0]}`);
      } else {
        result.push(`${dayRange}: ${hourParts[0]}`);
        hourParts.slice(1).forEach(part => {
          result.push(`${' '.repeat(dayRange.length + 2)}${part}`);
        });
      }
    }

    i = endIdx + 1;
  }

  return result.length > 0 ? result : null;
}

/**
 * Update a single record
 */
async function updateRecord(table, id, openingHours) {
  const polished = polishOpeningHours(openingHours);

  if (!polished) return false;

  // Store polished hours in a new field or update existing
  const newOpeningHours = typeof openingHours === 'string'
    ? polished[0]
    : {
        ...openingHours,
        formatted: polished
      };

  const { error } = await supabase
    .from(table)
    .update({ opening_hours: newOpeningHours })
    .eq('id', id);

  return !error;
}

async function polishAll() {
  console.log('Fetching all records with opening hours...\n');

  // Food listings
  const { data: foodListings } = await supabase
    .from('food_listings')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  // Mall outlets
  const { data: mallOutlets } = await supabase
    .from('mall_outlets')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  console.log(`Food listings: ${foodListings?.length || 0}`);
  console.log(`Mall outlets: ${mallOutlets?.length || 0}`);
  console.log(`Total: ${(foodListings?.length || 0) + (mallOutlets?.length || 0)}\n`);

  let updated = 0;
  let skipped = 0;
  let total = 0;

  // Process food listings
  console.log('Processing food listings...');
  for (const listing of foodListings || []) {
    total++;
    const success = await updateRecord('food_listings', listing.id, listing.opening_hours);
    if (success) updated++;
    else skipped++;

    if (total % 500 === 0) {
      console.log(`Progress: ${total} processed (${updated} updated)`);
    }
  }

  // Process mall outlets
  console.log('\nProcessing mall outlets...');
  for (const outlet of mallOutlets || []) {
    total++;
    const success = await updateRecord('mall_outlets', outlet.id, outlet.opening_hours);
    if (success) updated++;
    else skipped++;

    if (total % 500 === 0) {
      console.log(`Progress: ${total} processed (${updated} updated)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total processed: ${total}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log('='.repeat(50));

  // Show a sample
  console.log('\n\nSample polished output:');
  const sample = polishOpeningHours({
    weekday_text: [
      "Monday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM",
      "Tuesday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM",
      "Wednesday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM",
      "Thursday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM",
      "Friday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM",
      "Saturday: 11:30 AM – 2:30 PM, 5:30 – 9:30 PM",
      "Sunday: Closed"
    ]
  });
  console.log(sample?.join('\n'));
}

polishAll()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

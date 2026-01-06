/**
 * Convert string-format opening hours to structured format with periods
 * Handles many different formats found in the database
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
 * Parse time string like "9am", "10:30pm", "9 AM", "09:00" to { hour, minute }
 */
function parseTime(timeStr) {
  if (!timeStr) return null;

  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const minute = parseInt(match[2] || '0');
  const period = (match[3] || '').toLowerCase();

  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;

  return { hour, minute };
}

/**
 * Convert time to "HHMM" format for periods
 */
function toTimeString(time) {
  if (!time) return null;
  return `${time.hour.toString().padStart(2, '0')}${time.minute.toString().padStart(2, '0')}`;
}

/**
 * Format time for display
 */
function formatTimeDisplay(time) {
  if (!time) return '';
  const hour = time.hour;
  const minute = time.minute;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return minute === 0 ? `${hour12} ${period}` : `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse day name to index (0=Sun, 1=Mon, etc.)
 */
function parseDayName(dayStr) {
  const normalized = dayStr.trim().toLowerCase();
  for (let i = 0; i < SHORT_DAYS.length; i++) {
    if (normalized.startsWith(SHORT_DAYS[i].toLowerCase())) return i;
  }
  for (let i = 0; i < DAYS.length; i++) {
    if (normalized.startsWith(DAYS[i].toLowerCase())) return i;
  }
  return -1;
}

/**
 * Get array of day indices from a range like "Mon – Fri" or "Sun – Thurs"
 */
function getDayRange(startDay, endDay) {
  const days = [];
  let current = startDay;
  while (true) {
    days.push(current);
    if (current === endDay) break;
    current = (current + 1) % 7;
    if (days.length > 7) break; // Safety
  }
  return days;
}

/**
 * Parse opening hours string and return structured format
 */
function parseOpeningHoursString(str) {
  if (!str || typeof str !== 'string') return null;

  const normalized = str.trim();

  // Pattern: "Monday: 8:00 AM – 10:00 PM Tuesday: 8:00 AM – 10:00 PM ..." (all on one line)
  const allDaysOneLineMatch = normalized.match(/^(Monday|Mon):\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
  if (allDaysOneLineMatch) {
    // Parse each day from the string
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi;
    const dayHours = {};
    let match;

    while ((match = dayPattern.exec(normalized)) !== null) {
      const dayIdx = DAYS.indexOf(match[1]);
      if (dayIdx !== -1) {
        const openTime = parseTime(match[2]);
        const closeTime = parseTime(match[3]);
        if (openTime && closeTime) {
          dayHours[dayIdx] = { open: openTime, close: closeTime };
        }
      }
    }

    if (Object.keys(dayHours).length >= 5) {
      return buildStructuredHours(dayHours);
    }
  }

  // Pattern: "Daily 8 AM – 8 PM" or "Daily: 9am - 10pm"
  const dailyMatch = normalized.match(/^daily[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i);
  if (dailyMatch) {
    const openTime = parseTime(dailyMatch[1]);
    const closeTime = parseTime(dailyMatch[2]);
    if (openTime && closeTime) {
      const dayHours = {};
      for (let d = 0; d < 7; d++) {
        dayHours[d] = { open: openTime, close: closeTime };
      }
      return buildStructuredHours(dayHours);
    }
  }

  // Pattern: "10 AM – 7 PM (Daily)" - reverse format
  const reverseDailyMatch = normalized.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*\(daily\)$/i);
  if (reverseDailyMatch) {
    const openTime = parseTime(reverseDailyMatch[1]);
    const closeTime = parseTime(reverseDailyMatch[2]);
    if (openTime && closeTime) {
      const dayHours = {};
      for (let d = 0; d < 7; d++) {
        dayHours[d] = { open: openTime, close: closeTime };
      }
      return buildStructuredHours(dayHours);
    }
  }

  // Pattern: "Daily 11 AM – 3 PM, 5 PM – 8:30 PM" (multiple periods)
  const dailyMultiMatch = normalized.match(/^daily[:\s]+(.+)$/i);
  if (dailyMultiMatch) {
    const timeParts = dailyMultiMatch[1].split(/,\s*/);
    const periods = [];

    for (const part of timeParts) {
      const timeMatch = part.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        const openTime = parseTime(timeMatch[1]);
        const closeTime = parseTime(timeMatch[2]);
        if (openTime && closeTime) {
          periods.push({ open: openTime, close: closeTime });
        }
      }
    }

    if (periods.length > 0) {
      const dayHours = {};
      for (let d = 0; d < 7; d++) {
        dayHours[d] = periods;
      }
      return buildStructuredHoursMulti(dayHours);
    }
  }

  // Pattern: "Sun – Thurs 11 AM – 9 PM, Fri – Sat 11 AM – 9:15 PM" (day ranges with times)
  const dayRangePattern = /(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?(?:\s*[–-]\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?)?[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;

  const rangeMatches = [...normalized.matchAll(dayRangePattern)];
  if (rangeMatches.length > 0) {
    const dayHours = {};

    for (const match of rangeMatches) {
      const startDay = parseDayName(match[1]);
      const endDay = match[2] ? parseDayName(match[2]) : startDay;
      const openTime = parseTime(match[3]);
      const closeTime = parseTime(match[4]);

      if (startDay !== -1 && openTime && closeTime) {
        const days = endDay !== -1 ? getDayRange(startDay, endDay) : [startDay];
        for (const d of days) {
          dayHours[d] = { open: openTime, close: closeTime };
        }
      }
    }

    if (Object.keys(dayHours).length > 0) {
      return buildStructuredHours(dayHours);
    }
  }

  // Pattern: "7:30 AM – 2:30 PM (Mon – Fri), 7:30 AM – 1:30 PM (Sat), Closed (Sun)"
  const reverseRangePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*\(((?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?(?:\s*[–-]\s*(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?)?)\)/gi;
  const closedPattern = /closed\s*\(((?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?(?:\s*[–-]\s*(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?)?)\)/gi;

  const reverseMatches = [...normalized.matchAll(reverseRangePattern)];
  const closedMatches = [...normalized.matchAll(closedPattern)];

  if (reverseMatches.length > 0 || closedMatches.length > 0) {
    const dayHours = {};

    for (const match of reverseMatches) {
      const openTime = parseTime(match[1]);
      const closeTime = parseTime(match[2]);
      const dayPart = match[3];

      const dayRangeMatch = dayPart.match(/(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?(?:\s*[–-]\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|s|nday|esday|nesday|rsday|urday)?)?/i);
      if (dayRangeMatch && openTime && closeTime) {
        const startDay = parseDayName(dayRangeMatch[1]);
        const endDay = dayRangeMatch[2] ? parseDayName(dayRangeMatch[2]) : startDay;
        const days = endDay !== -1 ? getDayRange(startDay, endDay) : [startDay];
        for (const d of days) {
          dayHours[d] = { open: openTime, close: closeTime };
        }
      }
    }

    // Mark closed days (they just won't have hours)
    // No need to do anything, they're implicitly closed

    if (Object.keys(dayHours).length > 0) {
      return buildStructuredHours(dayHours);
    }
  }

  // Pattern: "24 hours" or "Open 24 hours"
  if (/24\s*hours?|24\/7/i.test(normalized)) {
    const dayHours = {};
    for (let d = 0; d < 7; d++) {
      dayHours[d] = { open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } };
    }
    return buildStructuredHours(dayHours);
  }

  // Pattern: Just times "9am - 10pm" (assume daily)
  const timesOnlyMatch = normalized.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[–-]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i);
  if (timesOnlyMatch) {
    const openTime = parseTime(timesOnlyMatch[1]);
    const closeTime = parseTime(timesOnlyMatch[2]);

    if (openTime && closeTime) {
      const dayHours = {};
      for (let d = 0; d < 7; d++) {
        dayHours[d] = { open: openTime, close: closeTime };
      }
      return buildStructuredHours(dayHours);
    }
  }

  return null;
}

/**
 * Build structured hours from dayHours map (single period per day)
 */
function buildStructuredHours(dayHours) {
  const periods = [];
  const weekday_text = [];

  // Days in weekday_text order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  for (const dayIdx of dayOrder) {
    const hours = dayHours[dayIdx];
    if (hours && hours.open && hours.close) {
      periods.push({
        open: { day: dayIdx, time: toTimeString(hours.open) },
        close: { day: dayIdx, time: toTimeString(hours.close) }
      });
      weekday_text.push(`${DAYS[dayIdx]}: ${formatTimeDisplay(hours.open)} – ${formatTimeDisplay(hours.close)}`);
    } else {
      weekday_text.push(`${DAYS[dayIdx]}: Closed`);
    }
  }

  return { periods, weekday_text };
}

/**
 * Build structured hours from dayHours map (multiple periods per day)
 */
function buildStructuredHoursMulti(dayHours) {
  const periods = [];
  const weekday_text = [];

  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  for (const dayIdx of dayOrder) {
    const hoursArr = dayHours[dayIdx];
    if (hoursArr && Array.isArray(hoursArr) && hoursArr.length > 0) {
      const hourParts = [];
      for (const h of hoursArr) {
        periods.push({
          open: { day: dayIdx, time: toTimeString(h.open) },
          close: { day: dayIdx, time: toTimeString(h.close) }
        });
        hourParts.push(`${formatTimeDisplay(h.open)} – ${formatTimeDisplay(h.close)}`);
      }
      weekday_text.push(`${DAYS[dayIdx]}: ${hourParts.join(', ')}`);
    } else if (hoursArr && hoursArr.open && hoursArr.close) {
      periods.push({
        open: { day: dayIdx, time: toTimeString(hoursArr.open) },
        close: { day: dayIdx, time: toTimeString(hoursArr.close) }
      });
      weekday_text.push(`${DAYS[dayIdx]}: ${formatTimeDisplay(hoursArr.open)} – ${formatTimeDisplay(hoursArr.close)}`);
    } else {
      weekday_text.push(`${DAYS[dayIdx]}: Closed`);
    }
  }

  return { periods, weekday_text };
}

async function convertStringHours() {
  console.log('Fetching listings with string-format opening hours...\n');

  const { data: foodListings } = await supabase
    .from('food_listings')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  const { data: mallOutlets } = await supabase
    .from('mall_outlets')
    .select('id, name, opening_hours')
    .not('opening_hours', 'is', null);

  const stringFoodListings = foodListings.filter(l => typeof l.opening_hours === 'string');
  const stringMallOutlets = mallOutlets.filter(o => typeof o.opening_hours === 'string');

  console.log(`Food listings with string hours: ${stringFoodListings.length}`);
  console.log(`Mall outlets with string hours: ${stringMallOutlets.length}`);
  console.log(`Total: ${stringFoodListings.length + stringMallOutlets.length}\n`);

  let converted = 0;
  let skipped = 0;
  const unparseableExamples = [];

  console.log('Processing food listings...');
  for (const listing of stringFoodListings) {
    const parsed = parseOpeningHoursString(listing.opening_hours);

    if (parsed) {
      const { error } = await supabase
        .from('food_listings')
        .update({ opening_hours: parsed })
        .eq('id', listing.id);

      if (!error) converted++;
      else skipped++;
    } else {
      skipped++;
      if (unparseableExamples.length < 15) {
        unparseableExamples.push({ name: listing.name, hours: listing.opening_hours });
      }
    }
  }

  console.log('Processing mall outlets...');
  for (const outlet of stringMallOutlets) {
    const parsed = parseOpeningHoursString(outlet.opening_hours);

    if (parsed) {
      const { error } = await supabase
        .from('mall_outlets')
        .update({ opening_hours: parsed })
        .eq('id', outlet.id);

      if (!error) converted++;
      else skipped++;
    } else {
      skipped++;
      if (unparseableExamples.length < 15) {
        unparseableExamples.push({ name: outlet.name, hours: outlet.opening_hours });
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('CONVERSION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Converted: ${converted}`);
  console.log(`Skipped (unparseable): ${skipped}`);
  console.log('='.repeat(50));

  if (unparseableExamples.length > 0) {
    console.log('\nUnparseable examples:');
    unparseableExamples.forEach(ex => {
      console.log(`  - "${ex.hours}" (${ex.name})`);
    });
  }
}

convertStringHours()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

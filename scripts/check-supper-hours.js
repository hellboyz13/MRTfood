require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Parse closing time from opening_hours
function getClosingHour(openingHours) {
  if (!openingHours) return null;

  // Handle Google Places format
  if (typeof openingHours === 'object' && openingHours.periods) {
    // Check for 24 hours (no close time means 24h)
    const has24h = openingHours.periods.some(p => p.open && !p.close);
    if (has24h) return '24h';

    // Get latest closing time across all days
    let latestClose = 0;
    openingHours.periods.forEach(period => {
      if (period.close?.time) {
        const closeTime = parseInt(period.close.time);
        // Handle overnight (e.g., 0100 = 1am next day = 25:00)
        const adjustedClose = closeTime < 600 ? closeTime + 2400 : closeTime;
        if (adjustedClose > latestClose) latestClose = adjustedClose;
      }
    });
    return latestClose > 0 ? latestClose : null;
  }

  // Handle string format
  if (typeof openingHours === 'string') {
    if (openingHours.includes('24 hours')) return '24h';
    // Try to parse time patterns
    const match = openingHours.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/gi);
    if (match && match.length >= 2) {
      // Last time is usually closing
      const lastTime = match[match.length - 1];
      const parsed = lastTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
      if (parsed) {
        let hour = parseInt(parsed[1]);
        const period = parsed[3].toLowerCase();
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        return hour * 100;
      }
    }
  }

  return null;
}

// Convert time to readable format
function formatTime(time) {
  if (time === '24h') return '24 hours';
  if (!time) return 'Unknown';

  const hour = Math.floor(time / 100) % 24;
  const min = time % 100;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
}

async function checkSupperHours() {
  console.log('='.repeat(60));
  console.log('SUPPER TAG AUDIT - Checking closing hours');
  console.log('='.repeat(60));

  // Get all supper-tagged listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, opening_hours, tags')
    .contains('tags', ['Supper']);

  // Get all supper-tagged outlets
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, opening_hours, tags')
    .contains('tags', ['Supper']);

  console.log(`\nTotal supper-tagged listings: ${listings?.length}`);
  console.log(`Total supper-tagged outlets: ${outlets?.length}`);

  // Analyze closing times
  const listingTimes = [];
  const outletTimes = [];

  listings?.forEach(l => {
    const closeTime = getClosingHour(l.opening_hours);
    listingTimes.push({ name: l.name, station: l.station_id, closeTime, raw: closeTime });
  });

  outlets?.forEach(o => {
    const closeTime = getClosingHour(o.opening_hours);
    outletTimes.push({ name: o.name, mall: o.mall_id, closeTime, raw: closeTime });
  });

  // Sort by closing time (earliest first)
  const sortTime = (a, b) => {
    if (a.raw === '24h') return 1;
    if (b.raw === '24h') return -1;
    if (a.raw === null) return 1;
    if (b.raw === null) return -1;
    return a.raw - b.raw;
  };

  listingTimes.sort(sortTime);
  outletTimes.sort(sortTime);

  // Show earliest closing listings
  console.log('\n=== EARLIEST CLOSING LISTINGS (potential false positives) ===');
  listingTimes.slice(0, 30).forEach((l, i) => {
    const time = formatTime(l.closeTime);
    const flag = l.raw && l.raw !== '24h' && l.raw < 2200 ? '⚠️ EARLY' : '';
    console.log(`${i + 1}. ${l.name} @ ${l.station} - closes ${time} ${flag}`);
  });

  // Show earliest closing outlets
  console.log('\n=== EARLIEST CLOSING OUTLETS (potential false positives) ===');
  outletTimes.slice(0, 30).forEach((o, i) => {
    const time = formatTime(o.closeTime);
    const flag = o.raw && o.raw !== '24h' && o.raw < 2200 ? '⚠️ EARLY' : '';
    console.log(`${i + 1}. ${o.name} @ ${o.mall} - closes ${time} ${flag}`);
  });

  // Count by closing time brackets
  console.log('\n=== CLOSING TIME DISTRIBUTION ===');
  const brackets = {
    'Unknown': 0,
    '24 hours': 0,
    'Before 10pm': 0,
    '10pm - 11pm': 0,
    '11pm - 12am': 0,
    '12am - 2am': 0,
    'After 2am': 0,
  };

  [...listingTimes, ...outletTimes].forEach(item => {
    if (item.raw === null) brackets['Unknown']++;
    else if (item.raw === '24h') brackets['24 hours']++;
    else if (item.raw < 2200) brackets['Before 10pm']++;
    else if (item.raw < 2300) brackets['10pm - 11pm']++;
    else if (item.raw < 2400) brackets['11pm - 12am']++;
    else if (item.raw < 2600) brackets['12am - 2am']++;
    else brackets['After 2am']++;
  });

  Object.entries(brackets).forEach(([bracket, count]) => {
    console.log(`  ${bracket}: ${count}`);
  });
}

checkSupperHours();

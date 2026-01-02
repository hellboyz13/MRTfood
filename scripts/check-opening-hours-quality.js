const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  // Total count
  const { count: total } = await supabase.from('mall_outlets').select('*', { count: 'exact', head: true });

  // With opening hours (not null)
  const { data: withHours } = await supabase.from('mall_outlets').select('id, name, opening_hours').not('opening_hours', 'is', null);

  // Check if opening_hours is actually useful (has content)
  let hasContent = 0;
  let emptyObject = 0;
  let emptyArray = 0;
  let hasWeekday = 0;
  let hasPeriods = 0;
  const emptyExamples = [];

  for (const o of withHours) {
    const h = o.opening_hours;
    const isEmpty = h === null || h === undefined || Object.keys(h).length === 0;
    if (isEmpty) {
      emptyObject++;
      if (emptyExamples.length < 5) emptyExamples.push(o.name);
    } else if (Array.isArray(h) && h.length === 0) {
      emptyArray++;
    } else {
      hasContent++;
      if (h.weekday_text || h.weekdayDescriptions) hasWeekday++;
      if (h.periods) hasPeriods++;
    }
  }

  console.log('Mall Outlets Opening Hours Analysis:');
  console.log('====================================');
  console.log('Total outlets:', total);
  console.log('With opening_hours field set:', withHours.length);
  console.log('  - Empty object {}:', emptyObject);
  console.log('  - Empty array []:', emptyArray);
  console.log('  - Has actual content:', hasContent);
  console.log('    - Has weekday text:', hasWeekday);
  console.log('    - Has periods:', hasPeriods);
  console.log('');
  console.log('Missing opening_hours (null):', total - withHours.length);
  console.log('');
  console.log('ACTUALLY USABLE:', hasContent, '(' + (hasContent/total*100).toFixed(1) + '%)');
  console.log('MISSING/EMPTY:', (total - hasContent), '(' + ((total-hasContent)/total*100).toFixed(1) + '%)');

  if (emptyExamples.length > 0) {
    console.log('\nExamples with empty opening_hours:');
    emptyExamples.forEach((n, i) => console.log((i+1) + '. ' + n));
  }

  // Check how many can be scraped
  const { data: withPlaceId } = await supabase
    .from('mall_outlets')
    .select('id, google_place_id, opening_hours')
    .not('google_place_id', 'is', null);

  let canScrape = 0;
  for (const o of withPlaceId) {
    const h = o.opening_hours;
    const isEmpty = h === null || h === undefined || Object.keys(h).length === 0;
    if (isEmpty) canScrape++;
  }

  console.log('\n--- Scraping potential ---');
  console.log('Outlets with google_place_id:', withPlaceId.length);
  console.log('Can scrape (have place_id, missing hours):', canScrape);
}

check();

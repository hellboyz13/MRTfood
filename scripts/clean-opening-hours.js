const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function cleanHours(hours) {
  if (!hours) return null;

  // Remove common garbage patterns
  let cleaned = hours
    // Remove "Tel:" and phone numbers
    .replace(/Tel:?\s*[\d\s-]+/gi, '')
    // Remove "Website" and anything after
    .replace(/Website.*$/gi, '')
    // Remove stall name repetitions (anything after the hours pattern)
    .replace(/\s+[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*\s*(?:is not|is a).*$/i, '')
    // Remove trailing stall names (capitalized words at end)
    .replace(/\s+[A-Z][A-Za-z\s&']+$/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // If cleaned version is too short or doesn't contain time patterns, return null
  if (cleaned.length < 5 || !cleaned.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i)) {
    return null;
  }

  return cleaned;
}

async function run() {
  console.log('='.repeat(60));
  console.log('CLEANING OPENING HOURS DATA');
  console.log('='.repeat(60));

  const { data: outlets } = await supabase.from('mall_outlets')
    .select('id, name, opening_hours')
    .eq('category', 'hawker stall')
    .not('opening_hours', 'is', null);

  console.log(`\nTotal stalls with hours: ${outlets.length}`);

  let cleaned = 0;
  let removed = 0;

  for (const outlet of outlets) {
    const original = outlet.opening_hours;
    const cleanedHours = cleanHours(original);

    if (cleanedHours !== original) {
      if (cleanedHours) {
        await supabase.from('mall_outlets')
          .update({ opening_hours: cleanedHours })
          .eq('id', outlet.id);
        cleaned++;
        console.log(`  Cleaned: ${outlet.name}`);
        console.log(`    Before: ${original.substring(0, 60)}...`);
        console.log(`    After:  ${cleanedHours}`);
      } else {
        await supabase.from('mall_outlets')
          .update({ opening_hours: null })
          .eq('id', outlet.id);
        removed++;
        console.log(`  Removed invalid: ${outlet.name}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Cleaned: ${cleaned}`);
  console.log(`Removed (invalid): ${removed}`);
}

run();

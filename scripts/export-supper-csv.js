/**
 * Export all Supper-tagged listings to CSV
 * Run with: node scripts/export-supper-csv.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Format opening hours to readable string
function formatOpeningHours(openingHours) {
  if (!openingHours) return 'Unknown';

  if (typeof openingHours === 'object' && openingHours.periods) {
    // Check for 24 hours
    const has24h = openingHours.periods.some(p => p.open && !p.close);
    if (has24h) return '24 hours';

    // Get closing times per day
    const closingTimes = [];
    openingHours.periods.forEach(period => {
      if (period.close?.time) {
        const time = period.close.time;
        const hour = parseInt(time.slice(0, 2));
        const min = time.slice(2);
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const period12 = hour >= 12 ? 'PM' : 'AM';
        closingTimes.push(`${displayHour}:${min}${period12}`);
      }
    });

    // Get latest closing time
    if (closingTimes.length > 0) {
      const unique = [...new Set(closingTimes)];
      return `Closes ${unique.join('/')}`;
    }
  }

  if (typeof openingHours === 'string') {
    return openingHours.replace(/"/g, '""'); // Escape quotes for CSV
  }

  return 'See details';
}

async function exportSupperCSV() {
  // Get food_listings with Supper tag
  const { data: listings } = await supabase
    .from('food_listings')
    .select('name, opening_hours')
    .contains('tags', ['Supper'])
    .order('name');

  // Get mall_outlets with Supper tag
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('name, opening_hours')
    .contains('tags', ['Supper'])
    .order('name');

  // Combine and format
  const rows = [];
  rows.push('Name,Opening Hours,Source');

  listings?.forEach(l => {
    const hours = formatOpeningHours(l.opening_hours);
    rows.push(`"${l.name.replace(/"/g, '""')}","${hours}","food_listing"`);
  });

  outlets?.forEach(o => {
    const hours = formatOpeningHours(o.opening_hours);
    rows.push(`"${o.name.replace(/"/g, '""')}","${hours}","mall_outlet"`);
  });

  const csv = rows.join('\n');

  // Save to file
  fs.writeFileSync('supper-listings.csv', csv);

  console.log(`Exported ${listings?.length || 0} food_listings and ${outlets?.length || 0} mall_outlets`);
  console.log(`Total: ${(listings?.length || 0) + (outlets?.length || 0)} supper spots`);
  console.log('\nSaved to: supper-listings.csv');
  console.log('\n--- CSV Preview ---');
  console.log(csv);
}

exportSupperCSV();

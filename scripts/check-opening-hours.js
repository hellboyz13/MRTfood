const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOpeningHours() {
  // Fetch all outlets in batches (Supabase has 1000 row limit per request)
  let allData = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, opening_hours')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    allData = allData.concat(data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  const data = allData;

  const total = data.length;
  const withHours = data.filter(o => o.opening_hours && Object.keys(o.opening_hours).length > 0);
  const withoutHours = data.filter(o => !o.opening_hours || Object.keys(o.opening_hours).length === 0);

  console.log('=== Opening Hours Summary ===\n');
  console.log('Total outlets:', total);
  console.log('With opening hours:', withHours.length, '(' + (withHours.length/total*100).toFixed(1) + '%)');
  console.log('Without opening hours:', withoutHours.length, '(' + (withoutHours.length/total*100).toFixed(1) + '%)');

  // Group by mall
  const byMall = {};
  withoutHours.forEach(o => {
    if (!byMall[o.mall_id]) byMall[o.mall_id] = 0;
    byMall[o.mall_id]++;
  });

  console.log('\n=== Outlets WITHOUT opening hours by mall ===\n');
  Object.entries(byMall)
    .sort((a, b) => b[1] - a[1])
    .forEach(([mall, count]) => {
      console.log(count.toString().padStart(4) + ' : ' + mall);
    });

  // List all outlets missing opening hours
  console.log('\n=== Full list of outlets missing opening hours ===\n');
  withoutHours.forEach(o => {
    console.log(`- ${o.name} | ${o.mall_id}`);
  });
}

checkOpeningHours();

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function audit() {
  console.log('='.repeat(60));
  console.log('AUDIT: Current Tags & Categories');
  console.log('='.repeat(60));

  // 1. Get all unique tags from food_listings
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, tags, opening_hours')
    .eq('is_active', true);

  const tagCounts = {};
  const supperTagged = [];
  const dessertTagged = [];

  listings?.forEach(l => {
    (l.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    if (l.tags?.includes('Supper')) supperTagged.push(l);
    if (l.tags?.includes('Dessert')) dessertTagged.push(l);
  });

  console.log('\n--- FOOD_LISTINGS: All Tags (sorted by count) ---');
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

  console.log(`\nTotal listings: ${listings?.length}`);
  console.log(`With Supper tag: ${supperTagged.length}`);
  console.log(`With Dessert tag: ${dessertTagged.length}`);

  // 2. Get all unique categories from mall_outlets
  const { data: outlets } = await supabase
    .from('mall_outlets')
    .select('id, name, category, opening_hours');

  const categoryCounts = {};
  let supperCategoryCount = 0;
  let dessertCategoryCount = 0;

  outlets?.forEach(o => {
    const cat = o.category || 'null';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    const catLower = cat.toLowerCase();
    if (catLower.includes('supper') || catLower.includes('24') || catLower.includes('late night')) {
      supperCategoryCount++;
    }
    if (catLower.includes('dessert') || catLower.includes('ice cream') || catLower.includes('gelato') ||
        catLower.includes('bakery') || catLower.includes('bubble tea') || catLower.includes('bbt') ||
        catLower.includes('patisserie') || catLower.includes('pastry')) {
      dessertCategoryCount++;
    }
  });

  console.log('\n--- MALL_OUTLETS: All Categories (sorted by count) ---');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

  console.log(`\nTotal outlets: ${outlets?.length}`);
  console.log(`Matching supper categories: ${supperCategoryCount}`);
  console.log(`Matching dessert categories: ${dessertCategoryCount}`);

  // 3. Check listings that SHOULD have Supper tag (open late based on hours)
  console.log('\n--- LISTINGS OPEN LATE (potential Supper candidates) ---');
  let potentialSupper = 0;
  listings?.forEach(l => {
    if (l.tags?.includes('Supper')) return; // Already tagged

    const hours = l.opening_hours;
    if (!hours) return;

    // Check if open past midnight
    const hoursStr = JSON.stringify(hours);
    if (hoursStr.includes('"0000"') || // 24 hours
        hoursStr.includes('"0100"') || hoursStr.includes('"0200"') ||
        hoursStr.includes('"0300"') || hoursStr.includes('"0400"') ||
        hoursStr.includes('"2300"') || hoursStr.includes('"2200"') ||
        hoursStr.includes('Open 24')) {
      potentialSupper++;
      if (potentialSupper <= 20) {
        console.log(`  - ${l.name} (missing Supper tag)`);
      }
    }
  });
  console.log(`\nTotal potential supper spots missing tag: ${potentialSupper}`);

  // 4. Check dessert-like listings without Dessert tag
  console.log('\n--- LISTINGS WITH DESSERT-LIKE NAMES (potential Dessert candidates) ---');
  const dessertKeywords = ['ice cream', 'gelato', 'cake', 'dessert', 'sweet', 'bubble tea',
                          'bbt', 'waffle', 'churros', 'donut', 'tart', 'pastry', 'patisserie',
                          'beancurd', 'tau huay', 'chendol', 'cendol'];
  let potentialDessert = 0;
  listings?.forEach(l => {
    if (l.tags?.includes('Dessert')) return; // Already tagged

    const nameLower = l.name.toLowerCase();
    const tagsStr = (l.tags || []).join(' ').toLowerCase();

    for (const kw of dessertKeywords) {
      if (nameLower.includes(kw) || tagsStr.includes(kw)) {
        potentialDessert++;
        if (potentialDessert <= 20) {
          console.log(`  - ${l.name} | Tags: ${JSON.stringify(l.tags)}`);
        }
        break;
      }
    }
  });
  console.log(`\nTotal potential dessert spots missing tag: ${potentialDessert}`);
}

audit();

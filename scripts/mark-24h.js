const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Known 24/7 places from web search
const known24h = [
  // Prata places
  'cafeela', 'thohirah', 'srisun', 'prata', 'roti prata',
  // Ramen
  'kazutake', 'takagi ramen',
  // Dim Sum
  'dim sum express', 'mongkok', '126 dim sum', 'swee choon',
  // Multi-cuisine
  '89.7 supper', 'feng sheng',
  // Chinese
  'ming fa', 'balestier bak kut teh', 'eminent frog', 'frog porridge',
  // Halal
  'zamas',
  // Cafes
  'coffeesmith', 'coffee bean', 'enchanted cafe',
  // American
  "joji's diner", 'jojis diner',
  // Also well known 24h
  'mcdonald', 'mustafa', 'boon tong kee', 'geylang',
  // Late night / supper places
  'beauty in the pot', 'siam square mookata', 'mookata'
];

async function findAndMark() {
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('is_active', true);

  if (!listings) {
    console.log('No listings found');
    return;
  }

  const matches = listings.filter(l => {
    const name = l.name.toLowerCase();
    return known24h.some(k => name.includes(k));
  });

  console.log('Found potential 24/7 places in DB:', matches.length);
  matches.forEach(m => console.log(' -', m.id, '|', m.name));

  // Mark them as 24h
  if (matches.length > 0) {
    const ids = matches.map(m => m.id);
    const { error } = await supabase
      .from('food_listings')
      .update({ is_24h: true })
      .in('id', ids);

    if (error) {
      console.log('\nError updating:', error.message);
    } else {
      console.log('\n✓ Marked', matches.length, 'listings as 24/7');
    }
  }

  // Count total 24h after update
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_24h', true);

  console.log('Total 24/7 listings now:', count);
}

findAndMark();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Search by partial name match using ilike
async function findAndFix(searchName, updates) {
  const { data, error } = await supabase
    .from('food_listings')
    .select('id, name, address, station_id')
    .ilike('name', `%${searchName}%`)
    .eq('is_active', true);

  if (error) {
    console.log(`ERROR searching ${searchName}: ${error.message}`);
    return false;
  }

  if (!data || data.length === 0) {
    console.log(`NOT FOUND: ${searchName}`);
    return false;
  }

  if (data.length > 1) {
    console.log(`MULTIPLE MATCHES for ${searchName}:`);
    data.forEach(d => console.log(`  - ${d.name} (${d.station_id})`));
    // Pick the first match
  }

  const listing = data[0];
  const { error: updateError } = await supabase
    .from('food_listings')
    .update(updates)
    .eq('id', listing.id);

  if (updateError) {
    console.log(`ERROR updating ${listing.name}: ${updateError.message}`);
    return false;
  }

  console.log(`FIXED: ${listing.name}`);
  if (updates.address) console.log(`  Address: ${updates.address}`);
  if (updates.station_id) console.log(`  Station: ${updates.station_id}`);
  return true;
}

async function fixAddresses() {
  console.log('=== FIXING FOOD LISTING ADDRESSES (v2) ===\n');

  let fixedCount = 0;

  // Address fixes - using partial name matching
  console.log('--- Fixing Missing Addresses ---\n');

  const addressFixes = [
    ['Monarchs', { address: '60 Airport Boulevard, #01-T2C-07 Terminal 2 Transit, Singapore 819643' }],
    ['Café Carrera', { address: '60 Airport Boulevard, Terminal 2, Singapore 819643' }],
    ['Cafe Carrera', { address: '60 Airport Boulevard, Terminal 2, Singapore 819643' }],
    ['Fernweh', { address: '16A Mosque St, Singapore 059501' }],
    ['Maxi Coffee', { address: '34 Mosque St, Singapore 059511' }],
    ['EarlyAfter', { address: '43 Carpenter St, Singapore 059922' }],
    ['Cheok Kee', { address: '69 Bendemeer Rd, Singapore 339686' }],
    ['Old Hen Coffee', { address: '12 Science Park Dr, #01-04, Singapore 118225' }],
    ['Kwang Kee Teochew', { address: '51 Old Airport Rd, #01-149, Singapore 390051' }],
    ['Coexist Coffee', { address: '5 Science Park Dr, Singapore 118265' }],
    ['Ernie', { address: '123 Bukit Merah Lane 1, #01-152, Singapore 150123' }],
    ['Sync Haus', { address: '52 Bukit Purmei Rd, #01-66, Singapore 090052' }],
    ['SuiTok', { address: '313 Orchard Road, #B3-10 313@Somerset, Singapore 238895' }],
    ['Fortuna Terrazza', { address: '63 Tras St, Singapore 079001' }],
    ['Tiong Bahru Bakery', { address: '56 Eng Hoon St, #01-70, Singapore 160056' }],
  ];

  for (const [search, updates] of addressFixes) {
    if (await findAndFix(search, updates)) fixedCount++;
  }

  // Fix incomplete addresses
  console.log('\n--- Fixing Incomplete Addresses ---\n');

  const incompleteFixes = [
    ['Sik Bao Sin', { address: '592 Geylang Rd, Singapore 389521' }],
    ['Noo Cheng Big Prawn', { address: '2 Adam Rd, #01-27 Adam Road Food Centre, Singapore 289876' }],
    ['Pak Sapari', { address: '2 Adam Rd, #01-09 Adam Road Food Centre, Singapore 289876' }],
    ['True Blue Cuisine', { address: '47/49 Armenian St, Singapore 179937' }],
    ['Zion Road Big Prawn', { address: '70 Zion Rd, #01-04 Zion Riverside Food Centre, Singapore 247792' }],
    ['Bismillah Biryani', { address: '50 Dunlop St, Singapore 209379' }],
    ['Lagnaa', { address: '6 Upper Dickson Rd, Singapore 207466' }],
    ['Sin Heng Claypot', { address: '439 Joo Chiat Rd, Singapore 427652' }],
    ['Zhup Zhup', { address: '458 MacPherson Rd, #01-01, Singapore 368187' }],
    ['Jungle', { address: '10 Ann Siang Hill, Singapore 069789' }],
    ['Indocafe', { address: '35 Scotts Rd, #01-01 Scotts Building, Singapore 228227' }],
    ['Coconut Club', { address: '269 Beach Rd, Singapore 199546' }],
    ['Kok Sen', { address: '30-32 Keong Saik Rd, Singapore 089137' }],
    ['MP Thai', { address: '6 Battery Rd, #01-19, Singapore 049909' }],
    ['Da Shi Jia', { address: '89 Killiney Rd, Singapore 239536' }],
    ['Whole Earth', { address: '76 Peck Seah St, Singapore 079331' }],
    ['Blue Ginger', { address: '97 Tanjong Pagar Rd, Singapore 088518' }],
    ['Cumi Bali', { address: '50 Tras St, Singapore 078989' }],
  ];

  for (const [search, updates] of incompleteFixes) {
    if (await findAndFix(search, updates)) fixedCount++;
  }

  // Fix station assignments
  console.log('\n--- Fixing Station Assignments ---\n');

  const stationFixes = [
    // 89.7FM Supper Club is at Changi Village
    ['89.7', { station_id: 'pasir-ris' }],

    // Katong/East Coast area - should be Paya Lebar or Marine Parade
    ['Little Rogue', { station_id: 'paya-lebar' }],
    ['Birds of Paradise', { station_id: 'paya-lebar' }],
    ['Jin Yu Man Tang', { station_id: 'paya-lebar' }],
    ['Windowsill Pies', { station_id: 'paya-lebar' }],
    ['Sin Hoi Sai', { station_id: 'paya-lebar' }],
    ['Hay Gelato', { station_id: 'paya-lebar' }],

    // East Coast Seafood
    ['JUMBO Seafood', { station_id: 'marine-parade' }],
    ['Long Beach Seafood', { station_id: 'marine-parade' }],

    // Dempsey
    ['Mr Bucket', { station_id: 'farrer-road' }],

    // Colbar
    ['Colbar', { station_id: 'queenstown' }],

    // Kokoyo and Lau Wang at Serangoon Central
    ['Kokoyo', { station_id: 'serangoon' }],
    ['Lau Wang', { station_id: 'serangoon' }],

    // French Ladle at Pandan Valley
    ['French Ladle', { station_id: 'clementi' }],

    // Kensington
    ['Kensington', { station_id: 'kovan' }],

    // Bishan
    ['284 Kway Chap', { station_id: 'bishan' }],
  ];

  for (const [search, updates] of stationFixes) {
    if (await findAndFix(search, updates)) fixedCount++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Fixed: ${fixedCount}`);
}

fixAddresses().catch(console.error);

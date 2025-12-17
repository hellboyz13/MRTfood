const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Nzk5MzAsImV4cCI6MjA4MDE1NTkzMH0.wOYifcpHN4rxtg_gcDYPzzpAeXoOykBfP_jWLMMfdP4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Address fixes - research correct addresses
const addressFixes = [
  // Missing addresses - adding correct addresses
  { name: 'Monarchs & Milkweed', address: '60 Airport Boulevard, #01-T2C-07 Terminal 2 Transit, Singapore 819643' },
  { name: 'Café Carrera', address: '60 Airport Boulevard, Terminal 2, Singapore 819643' },
  { name: 'Fernweh', address: '16A Mosque St, Singapore 059501' },
  { name: 'Maxi Coffee Bar', address: '34 Mosque St, Singapore 059511' },
  { name: 'EarlyAfter', address: '43 Carpenter St, Singapore 059922' },
  { name: 'Cheok Kee', address: '69 Bendemeer Rd, Singapore 339686' },
  { name: 'Old Hen Coffee', address: '12 Science Park Dr, #01-04, Singapore 118225' },
  { name: 'Kwang Kee Teochew Fish Porridge', address: '51 Old Airport Rd, #01-149, Singapore 390051' },
  { name: 'Coexist Coffee Co.', address: '5 Science Park Dr, Singapore 118265' },
  { name: 'Ernie\'s Coffee', address: '123 Bukit Merah Lane 1, #01-152, Singapore 150123' },
  { name: 'Sync Haus Café', address: '52 Bukit Purmei Rd, #01-66, Singapore 090052' },
  { name: 'SuiTok Dessert', address: '313 Orchard Road, #B3-10 313@Somerset, Singapore 238895' },
  { name: 'Fortuna Terrazza', address: '63 Tras St, Singapore 079001' },
  { name: 'Tiong Bahru Bakery', address: '56 Eng Hoon St, #01-70, Singapore 160056' },

  // Incomplete addresses - add Singapore postal codes
  { name: 'Sik Bao Sin', address: '592 Geylang Rd, Singapore 389521' },
  { name: 'Adam Rd Noo Cheng Big Prawn Noodle', address: '2 Adam Rd, #01-27 Adam Road Food Centre, Singapore 289876' },
  { name: 'Selamat Datang Warong Pak Sapari', address: '2 Adam Rd, #01-09 Adam Road Food Centre, Singapore 289876' },
  { name: 'True Blue Cuisine', address: '47/49 Armenian St, Singapore 179937' },
  { name: 'Zhi Wei Xian Zion Road Big Prawn Noodle', address: '70 Zion Rd, #01-04 Zion Riverside Food Centre, Singapore 247792' },
  { name: 'Bismillah Biryani', address: '50 Dunlop St, Singapore 209379' },
  { name: 'Lagnaa', address: '6 Upper Dickson Rd, Singapore 207466' },
  { name: 'Sin Heng Claypot Bak Koot Teh', address: '439 Joo Chiat Rd, Singapore 427652' },
  { name: 'Zhup Zhup', address: '458 MacPherson Rd, #01-01, Singapore 368187' },
  { name: 'Jungle', address: '10 Ann Siang Hill, Singapore 069789' },
  { name: 'Indocafé', address: '35 Scotts Rd, #01-01 Scotts Building, Singapore 228227' },
  { name: 'The Coconut Club', address: '269 Beach Rd, Singapore 199546' },
  { name: 'Kok Sen', address: '30-32 Keong Saik Rd, Singapore 089137' },
  { name: 'MP Thai', address: '6 Battery Rd, #01-19, Singapore 049909' },
  { name: 'Da Shi Jia Big Prawn Mee', address: '89 Killiney Rd, Singapore 239536' },
  { name: 'Whole Earth', address: '76 Peck Seah St, Singapore 079331' },
  { name: 'Blue Ginger', address: '97 Tanjong Pagar Rd, Singapore 088518' },
  { name: 'Cumi Bali', address: '50 Tras St, Singapore 078989' },
];

// Station reassignments - listings assigned to wrong station
const stationFixes = [
  // 89.7FM Supper Club is at Changi Village, NOT Changi Airport
  // Changi Village is closest to Pasir Ris or no good MRT coverage
  { name: '89.7FM Supper Club', newStation: 'pasir-ris' },

  // Katong/East Coast area listings - Dakota is not closest
  { name: 'Little Rogue Coffee', newStation: 'paya-lebar' },
  { name: 'Birds of Paradise (Katong)', newStation: 'paya-lebar' },
  { name: 'Jin Yu Man Tang', newStation: 'paya-lebar' },
  { name: 'Windowsill Pies', newStation: 'paya-lebar' },
  { name: 'Sin Hoi Sai Eating House', newStation: 'paya-lebar' },
  { name: 'Hay Gelato', newStation: 'paya-lebar' },

  // Dover area - wrong station
  { name: 'The French Ladle', newStation: 'clementi' },
  { name: 'Kokoyo Nyonya Delights', newStation: 'serangoon' }, // This is at Serangoon Central, not Dover
  { name: 'Lau Wang Claypot Delights', newStation: 'serangoon' }, // Same address as Kokoyo

  // East Coast Seafood Centre - should be Marine Parade or Bayshore
  { name: 'JUMBO Seafood', newStation: 'marine-parade' },
  { name: 'Long Beach Seafood', newStation: 'marine-parade' },

  // Dempsey area
  { name: 'Mr Bucket Chocolaterie', newStation: 'farrer-road' },

  // Cafe Colbar - Whitchurch Rd is closer to Queenstown
  { name: 'Cafe Colbar', newStation: 'queenstown' },

  // Greenwood Fish Market at Quayside Isle - closer to Harbourfront
  { name: 'Greenwood Fish Market', newStation: 'harbourfront' }, // Keep at Harbourfront, just far

  // Kensington Park - closer to Kovan or Serangoon
  { name: 'Kazutake Ramen (Kensington)', newStation: 'kovan' },

  // Bishan area
  { name: '284 Kway Chap', newStation: 'bishan' },

  // Newton hawker listings seem to have wrong coordinates stored
  // They're showing as far but Newton Food Centre is right next to Newton MRT
];

async function fixAddresses() {
  console.log('=== FIXING FOOD LISTING ADDRESSES ===\n');

  let fixedCount = 0;
  let errorCount = 0;

  // Fix addresses
  console.log('--- Fixing Missing/Incomplete Addresses ---\n');
  for (const fix of addressFixes) {
    const { data, error } = await supabase
      .from('food_listings')
      .update({ address: fix.address })
      .eq('name', fix.name)
      .select('id, name');

    if (error) {
      console.log(`ERROR: ${fix.name} - ${error.message}`);
      errorCount++;
    } else if (data && data.length > 0) {
      console.log(`FIXED: ${fix.name}`);
      console.log(`  New address: ${fix.address}`);
      fixedCount++;
    } else {
      console.log(`NOT FOUND: ${fix.name}`);
    }
  }

  // Fix station assignments
  console.log('\n--- Fixing Station Assignments ---\n');
  for (const fix of stationFixes) {
    const { data, error } = await supabase
      .from('food_listings')
      .update({ station_id: fix.newStation })
      .eq('name', fix.name)
      .select('id, name');

    if (error) {
      console.log(`ERROR: ${fix.name} - ${error.message}`);
      errorCount++;
    } else if (data && data.length > 0) {
      console.log(`REASSIGNED: ${fix.name} -> ${fix.newStation}`);
      fixedCount++;
    } else {
      console.log(`NOT FOUND: ${fix.name}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Fixed: ${fixedCount}`);
  console.log(`Errors: ${errorCount}`);
}

fixAddresses().catch(console.error);

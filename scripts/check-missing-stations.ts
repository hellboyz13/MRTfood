import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4'
);

// Full list of MRT stations that should exist
const allStations = [
  // North-South Line (NS)
  'Jurong East', 'Bukit Batok', 'Bukit Gombak', 'Choa Chu Kang', 'Yew Tee', 'Kranji', 'Marsiling', 'Woodlands', 'Admiralty', 'Sembawang', 'Canberra', 'Yishun', 'Khatib', 'Yio Chu Kang', 'Ang Mo Kio', 'Bishan', 'Braddell', 'Toa Payoh', 'Novena', 'Newton', 'Orchard', 'Somerset', 'Dhoby Ghaut', 'City Hall', 'Raffles Place', 'Marina Bay', 'Marina South Pier',
  // East-West Line (EW)
  'Pasir Ris', 'Tampines', 'Simei', 'Tanah Merah', 'Bedok', 'Kembangan', 'Eunos', 'Paya Lebar', 'Aljunied', 'Kallang', 'Lavender', 'Bugis', 'Tanjong Pagar', 'Outram Park', 'Tiong Bahru', 'Redhill', 'Queenstown', 'Commonwealth', 'Buona Vista', 'Dover', 'Clementi', 'Jurong East', 'Chinese Garden', 'Lakeside', 'Boon Lay', 'Pioneer', 'Joo Koon', 'Gul Circle', 'Tuas Crescent', 'Tuas West Road', 'Tuas Link', 'Expo', 'Changi Airport',
  // North-East Line (NE)
  'HarbourFront', 'Outram Park', 'Chinatown', 'Clarke Quay', 'Dhoby Ghaut', 'Little India', 'Farrer Park', 'Boon Keng', 'Potong Pasir', 'Woodleigh', 'Serangoon', 'Kovan', 'Hougang', 'Buangkok', 'Sengkang', 'Punggol',
  // Circle Line (CC)
  'Dhoby Ghaut', 'Bras Basah', 'Esplanade', 'Promenade', 'Nicoll Highway', 'Stadium', 'Mountbatten', 'Dakota', 'Paya Lebar', 'MacPherson', 'Tai Seng', 'Bartley', 'Serangoon', 'Lorong Chuan', 'Bishan', 'Marymount', 'Caldecott', 'Botanic Gardens', 'Farrer Road', 'Holland Village', 'Buona Vista', 'one-north', 'Kent Ridge', 'Haw Par Villa', 'Pasir Panjang', 'Labrador Park', 'Telok Blangah', 'HarbourFront', 'Bayfront', 'Marina Bay',
  // Downtown Line (DT)
  'Bukit Panjang', 'Cashew', 'Hillview', 'Beauty World', 'King Albert Park', 'Sixth Avenue', 'Tan Kah Kee', 'Botanic Gardens', 'Stevens', 'Newton', 'Little India', 'Rochor', 'Bugis', 'Promenade', 'Bayfront', 'Downtown', 'Telok Ayer', 'Chinatown', 'Fort Canning', 'Bencoolen', 'Jalan Besar', 'Bendemeer', 'Geylang Bahru', 'Mattar', 'MacPherson', 'Ubi', 'Kaki Bukit', 'Bedok North', 'Bedok Reservoir', 'Tampines West', 'Tampines', 'Tampines East', 'Upper Changi', 'Expo',
  // Thomson-East Coast Line (TE)
  'Woodlands North', 'Woodlands', 'Woodlands South', 'Springleaf', 'Lentor', 'Mayflower', 'Bright Hill', 'Upper Thomson', 'Caldecott', 'Mount Pleasant', 'Stevens', 'Napier', 'Orchard Boulevard', 'Orchard', 'Great World', 'Havelock', 'Outram Park', 'Maxwell', 'Shenton Way', 'Marina Bay', 'Gardens by the Bay', 'Tanjong Rhu', 'Katong Park', 'Tanjong Katong', 'Marine Parade', 'Marine Terrace', 'Siglap', 'Bayshore',
];

async function main() {
  const { data } = await supabase.from('stations').select('id, name');

  if (!data) {
    console.log('No stations found');
    return;
  }

  const dbNames = data.map(s => s.name.toLowerCase());
  const uniqueStations = [...new Set(allStations)];

  const missing = uniqueStations.filter(s => !dbNames.includes(s.toLowerCase()));

  console.log(`Total stations in DB: ${data.length}`);
  console.log(`\nMissing stations (${missing.length}):`);
  missing.forEach(s => console.log(`  - ${s}`));

  // Specifically check for Kovan and Beauty World
  console.log('\n--- Specific checks ---');
  console.log('Kovan exists:', dbNames.includes('kovan'));
  console.log('Beauty World exists:', dbNames.includes('beauty world'));

  // Show NE line stations
  const neStations = ['HarbourFront', 'Chinatown', 'Clarke Quay', 'Little India', 'Farrer Park', 'Boon Keng', 'Potong Pasir', 'Woodleigh', 'Serangoon', 'Kovan', 'Hougang', 'Buangkok', 'Sengkang', 'Punggol'];
  console.log('\nNE Line stations in DB:');
  neStations.forEach(s => {
    const exists = dbNames.includes(s.toLowerCase());
    console.log(`  ${exists ? '✓' : '✗'} ${s}`);
  });
}

main().catch(console.error);

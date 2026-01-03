function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[''`\-\.@()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCoreName(name) {
  return normalize(name)
    .replace(/\s*(singapore|sg|outlet|restaurant|cafe|bistro|kitchen|eatery|express|original|famous)$/gi, '')
    .replace(/\s*(paragon|mbs|jewel|ion|tampines|jurong|orchard|paya lebar|bedok|yishun|sengkang|punggol|bishan|serangoon|novena|chinatown|bugis|city hall|raffles|somerset|clementi|harbourfront|bayfront|dhoby ghaut).*$/gi, '')
    .trim();
}

const tests = [
  ['Din Tai Fung Paragon', 'Din Tai Fung'],
  ['Song Fa Bak Kut Teh (Paragon)', 'Song Fa Signatures'],
  ['Toast Box MBS', 'Toast Box'],
  ['Playmade', 'Playmade'],
  ["COLLIN'S", "COLLIN'S®"],
  ['Paris Baguette', 'Paris Baguette'],
];

console.log('Testing matching logic:\n');
for (const [guide, outlet] of tests) {
  const gCore = extractCoreName(guide);
  const oCore = extractCoreName(outlet);
  const match = gCore === oCore || gCore.includes(oCore) || oCore.includes(gCore);
  console.log(`Guide: "${guide}" -> "${gCore}"`);
  console.log(`Mall:  "${outlet}" -> "${oCore}"`);
  console.log(`Match: ${match ? 'YES' : 'NO'}`);
  console.log();
}

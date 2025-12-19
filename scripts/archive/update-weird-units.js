const fs = require('fs');
const path = require('path');

// Read scraped Jewel data
const jewelData = JSON.parse(fs.readFileSync('jewel-outlets.json', 'utf-8'));

// Manual additions for outlets not found in main scrape (from detail pages)
const manualAdditions = {
  '% arabica': '#01-K208',
  'café kitsuné': '#01-K209',
  'queic by olivia': '#01-K218',
  'creamie sippies (opening soon)': '#01-K214',
  'creamie sippies': '#01-K214',
  "elfuego by collin's®": '#05-203',
  "elfuego by collin's": '#05-203',
};

// The Centrepoint outlets (from islifearecipe.net)
const centrepointMapping = {
  'astons steak and salad': '#03-28/28A',
  'astons steak & salad': '#03-28/28A',
  'beauty in the pot': '#05-14/15/16',
  'bird avenue': '#B1-18',
  'misato': '#01-33E',
  'tora san': '#03-44',
  'tora-san': '#03-44',
  'ji xiang kueh': '#B1-K4',
  'koi the': '#B1-K2',
  'koi thé': '#B1-K2',
  'malaysia boleh': '#B1-13',
  'malaysia boleh!': '#B1-13',
  'monster planet': '#01-33C/D',
  'toast box': '#B1-08',
  'fairprice finest': '#B1-01', // Typical location in malls
  'mr bean': '#B1-K3',
  'the dim sum place': '#B1-07',
  'din tai fung': '#02-55/56',
  'song fa bak kut teh': '#02-29/30',
  'gyu-kaku japanese bbq': '#02-53/54',
  'gorogoro steamboat & korean buffet': '#03-43',
  'starbucks': '#01-40/42',
};

// United Square outlets (from islifearecipe.net)
const unitedSquareMapping = {
  '101 pot noodles': '#B1-03',
  '1855 the bottle shop': '#B1-56C',
  '328 katong laksa': '#01-K1',
  'brauhaus restaurant & pub': '#B1-13',
  'breadtalk': '#01-75A',
  'burger king': '#01-02',
  'burnt cones': '#01-K9',
  'duke bakery': '#B1-61',
  'food dynasty': '#B1-02',
  'genki sushi': '#B1-07',
  'gx banh mi': '#B1-06',
  'honeyworld': '#B1-K4',
  'honeyworld®': '#B1-K4',
  'hoshino coffee': '#02-06',
  'huggs coffee': '#02-K2',
  'ichiban boshi': '#02-02',
  'kei kaisendon': '#01-12',
  'koi thé': '#B1-60',
  'koi the': '#B1-60',
  "mcdonald's": '#B1-11',
  'mcdonalds': '#B1-11',
  'menya aoi': '#B1-04',
  'nam kee pau': '#01-77',
  'old chang kee': '#01-K2',
  'peperoni pizzeria': '#01-07',
  'r&b tea': '#02-K1',
  'rong wantan noodle': '#01-K17',
  'saizeriya': '#B1-32',
  'sf fruits': '#01-01B',
  'soup restaurant': '#B1-10',
  'souper baby by soul souper': '#B1-60A',
  'starbucks': '#01-01',
  'starbucks®': '#01-01',
  'the coffee bean & tea leaf': '#01-62',
  'the coffee bean & tea leaf®': '#01-62',
  'the dim sum place': '#01-14',
  'toast box': '#01-81',
  'victoria bakery': '#01-K7', // Approximate based on mall layout
  'wee nam kee chicken rice': '#01-08',
  'ya kun kaya toast': '#B1-38',
  'yayoi': '#B1-54',
  'yolé': '#01-K14',
  'yole': '#01-K14',
  'hao wei lai': '#B1-05', // Approximate
  'tora-san': '#B1-12', // Approximate
  'tora- san': '#B1-12',
  '50年 taste of tradition': '#01-58',
};

// Create deduplicated mapping (name -> unit) with preference for entries that have units
const jewelMapping = {};
for (const outlet of jewelData) {
  const nameLower = outlet.name.toLowerCase().trim();
  if (outlet.unit && outlet.unit.trim()) {
    jewelMapping[nameLower] = outlet.unit.trim();
  } else if (!jewelMapping[nameLower]) {
    jewelMapping[nameLower] = '';
  }
}

// Add manual additions
for (const [name, unit] of Object.entries(manualAdditions)) {
  jewelMapping[name] = unit;
}

console.log('Jewel mapping created with', Object.keys(jewelMapping).length, 'unique outlets');
console.log('\nJewel outlets with units:');
for (const [name, unit] of Object.entries(jewelMapping)) {
  if (unit) {
    console.log(`  ${name}: ${unit}`);
  }
}

// Read original CSV
const csvContent = fs.readFileSync('weird-units.csv', 'utf-8');
const lines = csvContent.trim().split('\n');
const header = lines[0];
const rows = lines.slice(1);

// Normalize name for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .replace(/[&]/g, 'and')
    .replace(/['']/g, "'")
    .replace(/["]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Alternative name mappings for fuzzy matching
const nameAliases = {
  'arteastiq': ['arteastiq', 'arteatistiq'],
  'arteastiq depatio': ['arteastiq depatio'],
  'elfuego by collin\'s': ['elfuego by collin\'s®', 'elfuego by collins'],
  'café kitsuné': ['café kitsuné', 'cafe kitsune'],
  'chicha san chen': ['chicha san chen', 'chicha san chen (吃茶三千)'],
  'coucou hotpot.brew tea': ['coucou hotpot.brew tea', 'coucou hotpotbrew tea'],
  'hoshino coffee': ['hoshino coffee', 'hoshino coffee japanese café & restaurant', 'hoshino coffee japanese cafe & restaurant'],
  'ipoh town 怡保城茶室': ['ipoh town 怡保城茶室', 'ipoh town'],
  'mamma mia trattoria e caffé': ['mamma mia trattoria e caffé', 'mamma mia trattoria e caffe'],
  '% arabica': ['% arabica', 'arabica'],
};

// Build reverse lookup
const aliasToCanonical = {};
for (const [canonical, aliases] of Object.entries(nameAliases)) {
  for (const alias of aliases) {
    aliasToCanonical[normalizeName(alias)] = canonical;
  }
}

// Find best match
function findUnit(name, mallId) {
  const normalized = normalizeName(name);

  // Check mall-specific mappings first
  if (mallId === 'the-centrepoint') {
    const unit = centrepointMapping[normalized] || centrepointMapping[name.toLowerCase()];
    if (unit) return unit;
    // Try partial match
    for (const [key, value] of Object.entries(centrepointMapping)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    return null;
  }

  if (mallId === 'united-square') {
    const unit = unitedSquareMapping[normalized] || unitedSquareMapping[name.toLowerCase()];
    if (unit) return unit;
    // Try partial match
    for (const [key, value] of Object.entries(unitedSquareMapping)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    return null;
  }

  // Only match Jewel outlets below this point
  if (mallId !== 'jewel-changi-airport') {
    return null;
  }

  // Direct match
  for (const [jewelName, unit] of Object.entries(jewelMapping)) {
    if (normalizeName(jewelName) === normalized) {
      return unit;
    }
  }

  // Check if this name is an alias
  const canonical = aliasToCanonical[normalized];
  if (canonical) {
    for (const [jewelName, unit] of Object.entries(jewelMapping)) {
      if (normalizeName(jewelName) === normalizeName(canonical)) {
        return unit;
      }
    }
  }

  // Fuzzy match - check if name contains or is contained by jewel name
  for (const [jewelName, unit] of Object.entries(jewelMapping)) {
    const jewelNorm = normalizeName(jewelName);
    if (jewelNorm.includes(normalized) || normalized.includes(jewelNorm)) {
      if (unit) return unit;
    }
  }

  // Match by key words
  const words = normalized.split(' ').filter(w => w.length > 2);
  for (const [jewelName, unit] of Object.entries(jewelMapping)) {
    const jewelWords = normalizeName(jewelName).split(' ').filter(w => w.length > 2);
    const matchCount = words.filter(w => jewelWords.includes(w)).length;
    if (matchCount >= 2 && unit) {
      return unit;
    }
  }

  return null;
}

// Process rows
let updatedCount = 0;
let notFoundCount = 0;
const notFound = [];

// Malls we have data for
const supportedMalls = ['jewel-changi-airport', 'the-centrepoint', 'united-square'];

const updatedRows = rows.map(line => {
  // Parse CSV row (handle quoted fields)
  const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
  if (!match) {
    return line;
  }

  const [, id, name, mallId, level] = match;

  // Skip if not a supported mall
  if (!supportedMalls.includes(mallId)) {
    return line;
  }

  if (level && level !== '' && level !== '-') {
    return line; // Already has a level
  }

  const unit = findUnit(name, mallId);
  if (unit) {
    updatedCount++;
    console.log(`Updated: ${name} -> ${unit}`);
    return `"${id}","${name}","${mallId}","${unit}"`;
  } else {
    notFoundCount++;
    notFound.push(name);
    return line;
  }
});

// Write updated CSV
const updatedCsv = [header, ...updatedRows].join('\n');
fs.writeFileSync('weird-units-updated.csv', updatedCsv);

console.log(`\n\nSummary:`);
console.log(`  Updated: ${updatedCount} outlets`);
console.log(`  Not found: ${notFoundCount} outlets`);

if (notFound.length > 0) {
  console.log('\nJewel outlets not matched:');
  notFound.forEach(n => console.log(`  - ${n}`));
}

// Also output just the Jewel updates as a separate file
const jewelUpdates = updatedRows
  .filter(line => line.includes('jewel-changi-airport'))
  .map(line => {
    const match = line.match(/^"([^"]*?)","([^"]*?)","([^"]*?)","([^"]*?)"$/);
    if (match) {
      const [, id, name, mallId, level] = match;
      return { id, name, mallId, level };
    }
    return null;
  })
  .filter(Boolean);

fs.writeFileSync('jewel-updates.json', JSON.stringify(jewelUpdates, null, 2));
console.log('\nSaved jewel-updates.json with all Jewel outlets');

import { readFileSync, writeFileSync } from 'fs';

// Read MRTMap.tsx to extract stationCoordinates
const mrtMapContent = readFileSync('components/MRTMap.tsx', 'utf-8');

// Extract stationCoordinates object
const coordsMatch = mrtMapContent.match(/const stationCoordinates: \{ \[key: string\]: \{ cx: number, cy: number, name: string \} \} = \{([\s\S]+?)\n\};/);
if (!coordsMatch) {
  console.error('Could not find stationCoordinates in MRTMap.tsx');
  process.exit(1);
}

// Parse station IDs and coordinates
const stationCoords: { [key: string]: { cx: number; cy: number } } = {};
const coordsText = coordsMatch[1];
const stationMatches = coordsText.matchAll(/'([^']+)':\s*\{\s*cx:\s*(\d+),\s*cy:\s*(\d+)/g);

for (const match of stationMatches) {
  const stationId = match[1];
  const cx = parseInt(match[2]);
  const cy = parseInt(match[3]);
  stationCoords[stationId] = { cx, cy };
}

console.log(`Total stations in MRTMap.tsx: ${Object.keys(stationCoords).length}`);

// Read SVG to extract circles
const svgContent = readFileSync('public/mrt-map.svg', 'utf-8');
const circleMatches = svgContent.matchAll(/<circle cx="(\d+)" cy="(\d+)"/g);

const svgCircles: Array<{ cx: number; cy: number }> = [];
for (const match of circleMatches) {
  svgCircles.push({
    cx: parseInt(match[1]),
    cy: parseInt(match[2]),
  });
}

console.log(`Total circles in SVG: ${svgCircles.length}\n`);

// Find stations without matching circles (with 8px tolerance)
const TOLERANCE = 8;
const missingStations: Array<{ id: string; cx: number; cy: number }> = [];

for (const [stationId, coords] of Object.entries(stationCoords)) {
  const hasCircle = svgCircles.some(circle =>
    Math.abs(circle.cx - coords.cx) < TOLERANCE &&
    Math.abs(circle.cy - coords.cy) < TOLERANCE
  );

  if (!hasCircle) {
    missingStations.push({ id: stationId, cx: coords.cx, cy: coords.cy });
  }
}

console.log(`Stations missing circles in SVG: ${missingStations.length}\n`);

if (missingStations.length === 0) {
  console.log('✅ All stations have circles in SVG!');
  process.exit(0);
}

// Group missing stations by type (interchange vs regular)
// Major interchanges get r="6", regular stations get r="3"
const interchangeStations = [
  'orchard', 'dhoby-ghaut', 'city-hall', 'promenade', 'little-india',
  'chinatown', 'outram-park', 'serangoon', 'tampines', 'botanic-gardens',
  'caldecott', 'bukit-panjang', 'choa-chu-kang', 'sengkang', 'punggol', 'changi-airport'
];

const interchangeMissing = missingStations.filter(s => interchangeStations.includes(s.id));
const regularMissing = missingStations.filter(s => !interchangeStations.includes(s.id));

console.log('Missing Interchanges (r="6"):', interchangeMissing.length);
console.log('Missing Regular (r="3"):', regularMissing.length);

// Generate SVG circle elements
let newCircles = '';

// Add interchange stations (stroke="#000000" stroke-width="3", larger circles)
if (interchangeMissing.length > 0) {
  newCircles += '  <g stroke="#000000" stroke-width="3">\n';
  interchangeMissing.forEach(station => {
    newCircles += `    <circle cx="${station.cx}" cy="${station.cy}" r="6"/>\n`;
  });
  newCircles += '  </g>\n';
}

// Add regular stations (we need to determine their line colors)
// For now, add them all as gray until we know their lines
if (regularMissing.length > 0) {
  newCircles += '  <!-- Missing regular stations - add to appropriate line groups -->\n';
  newCircles += '  <g fill="#ffffff" stroke="#999999" stroke-width="2">\n';
  regularMissing.forEach(station => {
    newCircles += `    <circle cx="${station.cx}" cy="${station.cy}" r="3"/> <!-- ${station.id} -->\n`;
  });
  newCircles += '  </g>\n';
}

console.log('\n=== NEW CIRCLES TO ADD ===\n');
console.log(newCircles);

// Find the location to insert (before closing </g> of the last circle group)
// Look for the last </g> before </svg>
const lastGIndex = svgContent.lastIndexOf('</g>', svgContent.lastIndexOf('</svg>'));

if (lastGIndex === -1) {
  console.error('Could not find insertion point in SVG');
  process.exit(1);
}

// Insert the new circles
const updatedSvg = svgContent.slice(0, lastGIndex) + newCircles + svgContent.slice(lastGIndex);

// Write the updated SVG
writeFileSync('public/mrt-map.svg', updatedSvg, 'utf-8');

console.log('\n✅ Successfully added missing circles to SVG!');
console.log(`Added ${missingStations.length} circles (${interchangeMissing.length} interchanges + ${regularMissing.length} regular)`);

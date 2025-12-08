import { readFileSync } from 'fs';

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
const missingStations: string[] = [];

for (const [stationId, coords] of Object.entries(stationCoords)) {
  const hasCircle = svgCircles.some(circle =>
    Math.abs(circle.cx - coords.cx) < TOLERANCE &&
    Math.abs(circle.cy - coords.cy) < TOLERANCE
  );

  if (!hasCircle) {
    missingStations.push(stationId);
  }
}

console.log(`Stations missing circles in SVG: ${missingStations.length}\n`);

if (missingStations.length > 0) {
  console.log('Missing stations:');
  missingStations.forEach(stationId => {
    const coords = stationCoords[stationId];
    console.log(`  - ${stationId} (cx: ${coords.cx}, cy: ${coords.cy})`);
  });
} else {
  console.log('✅ All stations have circles in SVG!');
}

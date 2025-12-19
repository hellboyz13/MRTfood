const fs = require('fs');

// Read the MRTMap.tsx file to extract stationCoordinates
const mrtMapContent = fs.readFileSync('components/MRTMap.tsx', 'utf-8');

// Extract stationCoordinates - parse the object
const stationCoordinates = {};
const stationMatch = mrtMapContent.match(/const stationCoordinates[\s\S]*?= \{([\s\S]*?)\n\};/);
if (stationMatch) {
  const coordinatesBlock = stationMatch[1];
  // Parse each line like: 'station-id': { cx: 123, cy: 456, name: 'Station Name' },
  const regex = /'([^']+)':\s*\{\s*cx:\s*([\d.]+),\s*cy:\s*([\d.]+),\s*name:\s*'([^']+)'/g;
  let match;
  while ((match = regex.exec(coordinatesBlock)) !== null) {
    stationCoordinates[match[1]] = {
      cx: parseFloat(match[2]),
      cy: parseFloat(match[3]),
      name: match[4]
    };
  }
}

console.log(`Found ${Object.keys(stationCoordinates).length} stations in MRTMap.tsx\n`);

// Read and parse SVG circles
const svgContent = fs.readFileSync('public/mrt-map.svg', 'utf-8');
const circleRegex = /<circle\s+cx="([^"]+)"\s+cy="([^"]+)"/g;
const svgCircles = [];
let circleMatch;
while ((circleMatch = circleRegex.exec(svgContent)) !== null) {
  svgCircles.push({
    cx: parseFloat(circleMatch[1]),
    cy: parseFloat(circleMatch[2])
  });
}

console.log(`Found ${svgCircles.length} circles in SVG\n`);

// Check each station in stationCoordinates
const tolerance = 8;
const matched = [];
const unmatched = [];

for (const [stationId, coords] of Object.entries(stationCoordinates)) {
  const matchingCircle = svgCircles.find(c =>
    Math.abs(c.cx - coords.cx) < tolerance &&
    Math.abs(c.cy - coords.cy) < tolerance
  );

  if (matchingCircle) {
    const exactMatch = matchingCircle.cx === coords.cx && matchingCircle.cy === coords.cy;
    matched.push({
      stationId,
      name: coords.name,
      expected: { cx: coords.cx, cy: coords.cy },
      actual: { cx: matchingCircle.cx, cy: matchingCircle.cy },
      exactMatch
    });
  } else {
    unmatched.push({
      stationId,
      name: coords.name,
      expected: { cx: coords.cx, cy: coords.cy },
      nearestCircles: svgCircles
        .map(c => ({
          cx: c.cx,
          cy: c.cy,
          distance: Math.sqrt(Math.pow(c.cx - coords.cx, 2) + Math.pow(c.cy - coords.cy, 2))
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
    });
  }
}

console.log('='.repeat(60));
console.log('STATIONS WITHOUT MATCHING CIRCLES (WILL NOT BE CLICKABLE)');
console.log('='.repeat(60));

if (unmatched.length === 0) {
  console.log('✅ All stations have matching circles!\n');
} else {
  console.log(`❌ ${unmatched.length} stations have NO matching circle:\n`);
  unmatched.forEach(s => {
    console.log(`  ${s.name} (${s.stationId})`);
    console.log(`    Expected: cx=${s.expected.cx}, cy=${s.expected.cy}`);
    console.log(`    Nearest circles:`);
    s.nearestCircles.forEach(c => {
      console.log(`      cx=${c.cx}, cy=${c.cy} (distance: ${c.distance.toFixed(1)}px)`);
    });
    console.log();
  });
}

console.log('='.repeat(60));
console.log('MATCHED STATIONS');
console.log('='.repeat(60));
console.log(`✅ ${matched.length} stations matched\n`);

// Show inexact matches
const inexactMatches = matched.filter(m => !m.exactMatch);
if (inexactMatches.length > 0) {
  console.log('⚠️  Inexact matches (within tolerance but not exact):');
  inexactMatches.forEach(s => {
    console.log(`  ${s.name}: expected (${s.expected.cx}, ${s.expected.cy}) -> found (${s.actual.cx}, ${s.actual.cy})`);
  });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total stations defined: ${Object.keys(stationCoordinates).length}`);
console.log(`Matched with SVG: ${matched.length}`);
console.log(`UNMATCHED (broken): ${unmatched.length}`);
console.log(`Exact matches: ${matched.filter(m => m.exactMatch).length}`);
console.log(`Within tolerance: ${inexactMatches.length}`);

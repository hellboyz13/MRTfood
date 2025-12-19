const fs = require('fs');

const svg = fs.readFileSync('public/mrt-map.svg', 'utf8');
const circles = [...svg.matchAll(/<circle[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"/g)];

console.log('Circles near cx=286 (Choa Chu Kang / Yew Tee):');
circles.forEach(match => {
  const cx = parseFloat(match[1]);
  const cy = parseFloat(match[2]);
  if (Math.abs(cx - 286) < 10) {
    console.log(`  cx=${cx}, cy=${cy}`);
  }
});

console.log('\nTotal circles in SVG:', circles.length);

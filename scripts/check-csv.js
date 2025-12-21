const fs = require('fs');

const lines = fs.readFileSync('eatbook-restaurants.csv', 'utf8').split('\n');
const header = lines[0].split(',');
const data = lines.slice(1).filter(l => l.trim());

console.log('=== CSV SUMMARY ===');
console.log('Total restaurants:', data.length);

const latIdx = header.indexOf('lat');
const lngIdx = header.indexOf('lng');
const hoursIdx = header.indexOf('opening_hours');

let withLatLng = 0, withHours = 0;

data.forEach(line => {
  // Simple CSV parsing that handles quoted fields
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current);

  if (cols[latIdx] && cols[lngIdx] && cols[latIdx].trim() !== '' && cols[lngIdx].trim() !== '') {
    withLatLng++;
  }
  if (cols[hoursIdx] && cols[hoursIdx].trim() !== '') {
    withHours++;
  }
});

console.log('With lat/lng:', withLatLng, '(' + Math.round(withLatLng/data.length*100) + '%)');
console.log('With opening hours:', withHours, '(' + Math.round(withHours/data.length*100) + '%)');

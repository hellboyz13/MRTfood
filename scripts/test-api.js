require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const placeId = 'ChIJf0KqypMZ2jERoclPRRXSFnA';
const url = `https://places.googleapis.com/v1/places/${placeId}`;

console.log('Testing Google Places API (New)...');
console.log('URL:', url);
console.log('API Key:', API_KEY ? 'Found' : 'Missing');

fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'currentOpeningHours,addressComponents'
  }
})
  .then(async r => {
    console.log('Status:', r.status);
    const data = await r.json();
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(e => console.error('Error:', e.message));

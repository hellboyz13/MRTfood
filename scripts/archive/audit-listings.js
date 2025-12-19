const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function auditListings() {
  // Get all listings with their prices
  const { data: listings } = await supabase
    .from('food_listings')
    .select('id, name, station_id, lat, lng, distance_to_station, tags, address')
    .order('name');

  // Get all prices
  const { data: prices } = await supabase
    .from('listing_prices')
    .select('listing_id, price, description, item_name');

  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  const stationMap = new Map(stations.map(s => [s.id, s]));

  // Create price map
  const priceMap = new Map();
  prices.forEach(p => {
    if (!priceMap.has(p.listing_id)) {
      priceMap.set(p.listing_id, []);
    }
    priceMap.get(p.listing_id).push(p);
  });

  console.log('=== PRICE ANOMALIES ===\n');

  let priceIssues = [];

  for (const listing of listings) {
    const listingPrices = priceMap.get(listing.id) || [];
    const tags = listing.tags || [];
    const isHawker = tags.some(t => t.toLowerCase().includes('hawker') || t.toLowerCase().includes('budget'));
    const isCafe = tags.some(t => t.toLowerCase().includes('cafe') || t.toLowerCase().includes('coffee') || t.toLowerCase().includes('bakery'));
    const isFineDining = tags.some(t => t.toLowerCase().includes('fine dining') || t.toLowerCase().includes('omakase'));
    const isDessert = tags.some(t => t.toLowerCase().includes('dessert') || t.toLowerCase().includes('ice cream') || t.toLowerCase().includes('gelato'));

    for (const price of listingPrices) {
      const p = price.price;
      const desc = (price.description || '').toLowerCase();
      const name = listing.name.toLowerCase();

      // Check for suspicious prices
      let issue = null;

      // Hawker food shouldn't be > $20 typically
      if (isHawker && p > 25 && !name.includes('seafood') && !name.includes('crab')) {
        issue = 'Hawker food priced > $25';
      }

      // Coffee/cafe items usually $3-15
      if (isCafe && p > 30 && !name.includes('brunch') && !name.includes('meal')) {
        issue = 'Cafe item priced > $30';
      }

      // Desserts usually $2-20
      if (isDessert && p > 25 && !name.includes('cake')) {
        issue = 'Dessert priced > $25';
      }

      // Very cheap fine dining is suspicious
      if (isFineDining && p < 30) {
        issue = 'Fine dining priced < $30';
      }

      // Extremely low prices (less than $1) might be per-piece pricing errors
      if (p < 1 && !desc.includes('piece') && !desc.includes('pc') && !desc.includes('stick')) {
        issue = 'Price < $1 (might be per-piece)';
      }

      // Extremely high prices for regular restaurants
      if (p > 100 && !isFineDining && !name.includes('omakase') && !name.includes('kaiseki')) {
        issue = 'Regular restaurant > $100';
      }

      // Price range where high is less than low
      if (desc.includes(' - ')) {
        const match = desc.match(/\$?([\d.]+)\s*-\s*\$?([\d.]+)/);
        if (match) {
          const low = parseFloat(match[1]);
          const high = parseFloat(match[2]);
          if (high < low) {
            issue = 'Price range inverted (high < low)';
          }
        }
      }

      if (issue) {
        priceIssues.push({
          name: listing.name,
          station: listing.station_id,
          price: p,
          description: price.description,
          issue: issue,
          tags: tags.join(', ')
        });
      }
    }
  }

  if (priceIssues.length > 0) {
    priceIssues.forEach(p => {
      console.log(`${p.name} | ${p.station}`);
      console.log(`  Price: $${p.price} (${p.description})`);
      console.log(`  Issue: ${p.issue}`);
      console.log(`  Tags: ${p.tags}`);
      console.log('');
    });
  } else {
    console.log('No major price anomalies found.\n');
  }

  console.log('\n=== LOCATION/DISTANCE ANOMALIES ===\n');

  let locationIssues = [];

  for (const listing of listings) {
    if (!listing.lat || !listing.lng || !listing.station_id) continue;

    const station = stationMap.get(listing.station_id);
    if (!station || !station.lat || !station.lng) continue;

    // Calculate actual distance from station
    const actualDistance = haversineDistance(listing.lat, listing.lng, station.lat, station.lng);
    const storedDistance = listing.distance_to_station || 0;

    // Check for issues
    let issue = null;

    // Restaurant more than 2km from its assigned station
    if (actualDistance > 2000) {
      issue = `Too far from station: ${Math.round(actualDistance)}m (should be < 2km)`;
    }

    // Stored distance differs significantly from actual (> 500m difference)
    else if (Math.abs(actualDistance - storedDistance) > 500) {
      issue = `Distance mismatch: stored ${storedDistance}m vs actual ${Math.round(actualDistance)}m`;
    }

    // Check if there's a closer station
    let closestStation = null;
    let closestDistance = actualDistance;

    for (const [sid, s] of stationMap) {
      if (!s.lat || !s.lng) continue;
      const d = haversineDistance(listing.lat, listing.lng, s.lat, s.lng);
      if (d < closestDistance - 200) { // At least 200m closer
        closestDistance = d;
        closestStation = s;
      }
    }

    if (closestStation && closestStation.id !== listing.station_id && closestDistance < actualDistance - 300) {
      issue = `Wrong station? ${listing.station_id} is ${Math.round(actualDistance)}m, but ${closestStation.id} is only ${Math.round(closestDistance)}m`;
    }

    if (issue) {
      locationIssues.push({
        name: listing.name,
        station: listing.station_id,
        lat: listing.lat,
        lng: listing.lng,
        storedDistance: storedDistance,
        actualDistance: Math.round(actualDistance),
        issue: issue,
        address: listing.address
      });
    }
  }

  // Sort by severity (distance)
  locationIssues.sort((a, b) => b.actualDistance - a.actualDistance);

  if (locationIssues.length > 0) {
    console.log(`Found ${locationIssues.length} location issues:\n`);
    locationIssues.forEach(l => {
      console.log(`${l.name} | ${l.station}`);
      console.log(`  Issue: ${l.issue}`);
      console.log(`  Address: ${l.address || 'N/A'}`);
      console.log(`  Coords: ${l.lat}, ${l.lng}`);
      console.log('');
    });
  } else {
    console.log('No major location anomalies found.\n');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Price issues: ${priceIssues.length}`);
  console.log(`Location issues: ${locationIssues.length}`);
}

auditListings().catch(console.error);

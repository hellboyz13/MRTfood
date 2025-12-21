/**
 * Scrape EatBook articles and insert into food_listings database
 * - Geocodes each restaurant using OneMap API
 * - Finds nearest MRT station
 * - Calculates walking distance and time
 * - Inserts new restaurants (skips duplicates)
 */

const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ONEMAP_API_KEY = process.env.ONEMAP_API_KEY;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ARTICLES = [
  // Location-based
  { url: 'https://eatbook.sg/raffles-city-food-guide/', note: 'Raffles City Guide', location: 'Raffles City, 252 North Bridge Road, Singapore 179103' },
  { url: 'https://eatbook.sg/paya-lebar-square-plq-food/', note: 'Paya Lebar Square/PLQ Guide', location: 'Paya Lebar Quarter/Square, Singapore' },
  { url: 'https://eatbook.sg/holland-village-food-singapore/', note: 'Holland Village Guide', location: 'Holland Village, Singapore' },
  { url: 'https://eatbook.sg/the-woodleigh-mall-food/', note: 'Woodleigh Mall Guide', location: 'The Woodleigh Mall, 11 Bidadari Park Drive, Singapore 367803' },
  { url: 'https://eatbook.sg/bedok-interchange-hawker/', note: 'Bedok Interchange Hawker', location: 'Bedok Interchange Hawker Centre, 208B New Upper Changi Road, Singapore 462208' },
  { url: 'https://eatbook.sg/fortune-centre/', note: 'Fortune Centre Guide', location: 'Fortune Centre, 190 Middle Road, Singapore 188979' },
  { url: 'https://eatbook.sg/telok-ayer-food/', note: 'Telok Ayer Guide', location: 'Telok Ayer, Singapore' },
  { url: 'https://eatbook.sg/scape-food-guide/', note: 'SCAPE Guide', location: 'SCAPE, 2 Orchard Link, Singapore 237978' },
  { url: 'https://eatbook.sg/new-bahru-food-guide/', note: 'New Bahru Guide', location: 'New Bahru, Singapore' },
  { url: 'https://eatbook.sg/hougang-food/', note: 'Hougang Guide', location: 'Hougang, Singapore' },
  // Curated lists
  { url: 'https://eatbook.sg/best-restaurants-singapore/', note: 'Best Restaurants SG', location: '' },
  { url: 'https://eatbook.sg/best-hawker-centres-singapore/', note: 'Best Hawker Centres', location: '' },
  { url: 'https://eatbook.sg/best-cafes-singapore/', note: 'Best Cafes SG', location: '' },
  { url: 'https://eatbook.sg/best-char-kway-teow-singapore-ranked/', note: 'Best Char Kway Teow', location: '' },
  { url: 'https://eatbook.sg/best-bak-chor-mee-singapore/', note: 'Best Bak Chor Mee', location: '' },
  { url: 'https://eatbook.sg/best-hokkien-mee-singapore/', note: 'Best Hokkien Mee', location: '' },
  { url: 'https://eatbook.sg/best-laksa-singapore-ranked/', note: 'Best Laksa', location: '' },
  { url: 'https://eatbook.sg/best-zi-char-singapore/', note: 'Best Zi Char', location: '' },
];

// Cache stations
let stationsCache = null;

async function getStations() {
  if (stationsCache) return stationsCache;
  const { data } = await supabase.from('stations').select('id, name, lat, lng');
  stationsCache = data || [];
  return stationsCache;
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find nearest MRT station
 */
async function findNearestStation(lat, lng) {
  if (!lat || !lng) return null;
  const stations = await getStations();

  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;
    const distance = getDistanceMeters(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...station, distance: Math.round(distance) };
    }
  }

  return nearest;
}

/**
 * Get walking distance using OneMap Routing API
 */
async function getWalkingDistance(fromLat, fromLng, toLat, toLng) {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;
    const response = await fetch(url, {
      headers: { 'Authorization': ONEMAP_API_KEY }
    });
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
  } catch (error) {
    // Fall through to estimation
  }

  // Fallback: estimate from straight-line distance
  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return {
    distance: Math.round(straightLine * 1.3),
    time: Math.round((straightLine * 1.3) / 80)
  };
}

/**
 * Geocode an address using OneMap API
 */
async function geocodeAddress(address) {
  if (!address || address.length < 5) return null;

  try {
    // Extract postal code for better matching
    const postalMatch = address.match(/Singapore\s*(\d{6})/i);
    let searchVal = postalMatch ? postalMatch[1] : address;

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchVal)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE)
      };
    }

    // If postal code didn't work, try with building name
    if (postalMatch) {
      const cleanAddress = address.replace(/,?\s*Singapore\s*\d{6}/i, '').trim();
      const url2 = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
      const response2 = await fetch(url2);
      const data2 = await response2.json();

      if (data2.results && data2.results.length > 0) {
        const result = data2.results[0];
        return {
          lat: parseFloat(result.LATITUDE),
          lng: parseFloat(result.LONGITUDE)
        };
      }
    }
  } catch (error) {
    // Silent fail
  }
  return null;
}

/**
 * Check if restaurant already exists in database
 * Returns existing data if found (for reusing thumbnail/hours)
 */
async function findExistingRestaurant(name) {
  const normalizedName = name.toLowerCase().trim();

  // Try exact match first
  let { data } = await supabase
    .from('food_listings')
    .select('id, name, image_url, opening_hours')
    .ilike('name', normalizedName)
    .limit(1);

  if (data && data.length > 0) {
    return data[0];
  }

  // Try partial match (for chain restaurants like "Din Tai Fung")
  const { data: partialData } = await supabase
    .from('food_listings')
    .select('id, name, image_url, opening_hours')
    .ilike('name', `%${normalizedName}%`)
    .limit(1);

  if (partialData && partialData.length > 0) {
    return partialData[0];
  }

  return null;
}

/**
 * Look up existing restaurant data to reuse thumbnail and opening hours
 */
async function getExistingDataForReuse(name) {
  const normalizedName = name.toLowerCase().trim();

  // Search for any restaurant with same name that has image_url or opening_hours
  const { data } = await supabase
    .from('food_listings')
    .select('image_url, opening_hours')
    .ilike('name', `%${normalizedName}%`)
    .or('image_url.not.is.null,opening_hours.not.is.null')
    .limit(1);

  if (data && data.length > 0) {
    return {
      image_url: data[0].image_url || null,
      opening_hours: data[0].opening_hours || null
    };
  }

  return { image_url: null, opening_hours: null };
}

/**
 * Scrape article for restaurants
 */
async function scrapeArticle(page, articleUrl, note, defaultLocation) {
  console.log(`\nScraping: ${articleUrl}`);

  try {
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    const data = await page.evaluate((defLoc) => {
      const restaurants = [];

      document.querySelectorAll('h3').forEach(h3 => {
        const text = h3.textContent?.trim() || '';
        if (text.length < 3 || text.length > 150) return;
        if (/^(summary|conclusion|related|read also|you may|where to|how to|what is|best |top )/i.test(text)) return;

        const nameMatch = text.match(/^(\d+)\.\s*(.+)$/);
        if (!nameMatch) return;

        let name = nameMatch[2].trim()
          .replace(/\s*–\s*.+$/, '')
          .replace(/\s*—\s*.+$/, '')
          .trim();

        let allText = '';
        let address = null;
        let openingHours = null;
        let unit = null;

        let el = h3.nextElementSibling;
        let count = 0;
        while (el && count < 20) {
          if (el.tagName === 'H3' || el.tagName === 'H2') break;
          const content = el.textContent || '';
          allText += ' ' + content;

          // Unit number
          if (!unit) {
            const unitMatch = content.match(/Unit:\s*(#?[\w\d-]+(?:\/[\w\d-]+)*)/i);
            if (unitMatch) unit = unitMatch[1].trim();
          }

          // Full address
          if (!address) {
            const fullAddrMatch = content.match(/Address:\s*([^<\n]+Singapore\s*\d{6})/i);
            if (fullAddrMatch) {
              address = fullAddrMatch[1].trim();
            } else {
              const addrMatch = content.match(/Address:\s*([^\n<]+)/i);
              if (addrMatch && addrMatch[1].trim().length > 10) {
                address = addrMatch[1].trim();
              }
            }
          }

          // Postal code pattern
          if (!address) {
            const postalMatch = content.match(/(\d+[A-Za-z]?\s+[^,\n]+,\s*(?:#[\w\d-]+(?:\/[\w\d-]+)*,?\s*)?Singapore\s*\d{6})/i);
            if (postalMatch) address = postalMatch[1].trim();
          }

          // Opening hours
          if (!openingHours) {
            const hoursMatch = content.match(/Opening [Hh]ours?:\s*([^\n<]+)/i);
            if (hoursMatch) openingHours = hoursMatch[1].trim().slice(0, 200);
          }

          el = el.nextElementSibling;
          count++;
        }

        // Build address from unit + default location
        if (!address && unit && defLoc) {
          address = `${unit}, ${defLoc}`;
        } else if (!address && defLoc) {
          address = defLoc;
        }

        // Infer category/tags
        const lowerText = allText.toLowerCase();
        const lowerName = name.toLowerCase();
        const tags = [];

        if (lowerText.includes('hawker') || lowerText.includes('kopitiam') || lowerText.includes('food centre')) {
          tags.push('Hawker');
        }
        if (lowerText.includes('cafe') || lowerName.includes('cafe') || lowerName.includes('coffee') || lowerName.includes('bakery')) {
          tags.push('Cafe');
        }
        if (lowerText.includes('restaurant') || lowerText.includes('fine dining')) {
          tags.push('Restaurant');
        }
        if (lowerText.includes('japanese') || lowerText.includes('ramen') || lowerText.includes('sushi')) {
          tags.push('Japanese');
        }
        if (lowerText.includes('korean') || lowerText.includes('k-bbq') || lowerText.includes('kimchi')) {
          tags.push('Korean');
        }
        if (lowerText.includes('chinese') || lowerText.includes('dim sum') || lowerText.includes('zi char')) {
          tags.push('Chinese');
        }
        if (lowerText.includes('western') || lowerText.includes('pasta') || lowerText.includes('steak')) {
          tags.push('Western');
        }

        if (name.length > 2 && name.length < 100) {
          restaurants.push({
            name,
            address: address || '',
            openingHours: openingHours || '',
            tags: tags.length > 0 ? tags : null
          });
        }
      });

      return {
        title: document.querySelector('h1')?.textContent?.trim() || '',
        restaurants
      };
    }, defaultLocation);

    console.log(`  Found ${data.restaurants.length} restaurants`);
    return data.restaurants.map(r => ({ ...r, note, sourceUrl: articleUrl }));
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('=== EATBOOK SCRAPER WITH DATABASE INSERT ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allRestaurants = [];

  try {
    // Step 1: Scrape all articles
    for (const article of ARTICLES) {
      const restaurants = await scrapeArticle(page, article.url, article.note, article.location);
      allRestaurants.push(...restaurants);
      await sleep(1000);
    }

    // Deduplicate by name
    const seen = new Set();
    let unique = allRestaurants.filter(r => {
      const key = r.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`\n=== SCRAPING COMPLETE ===`);
    console.log(`Total scraped: ${allRestaurants.length}`);
    console.log(`Unique restaurants: ${unique.length}`);

    // Step 2: Process and insert each restaurant
    console.log(`\n=== PROCESSING & INSERTING ===\n`);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < unique.length; i++) {
      const r = unique[i];

      // Check if already exists (exact match)
      const existing = await findExistingRestaurant(r.name);
      if (existing) {
        skipped++;
        continue;
      }

      // Look for similar restaurants to reuse their thumbnail/hours
      const reuseData = await getExistingDataForReuse(r.name);

      // Geocode
      let lat = null, lng = null;
      if (r.address && r.address.length > 10) {
        const geo = await geocodeAddress(r.address);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      // Find nearest station and walking distance
      let stationId = null;
      let distanceToStation = null;
      let walkingTime = null;

      if (lat && lng) {
        const station = await findNearestStation(lat, lng);
        if (station) {
          stationId = station.id;

          // Get walking distance
          const walking = await getWalkingDistance(lat, lng, station.lat, station.lng);
          if (walking) {
            distanceToStation = walking.distance;
            walkingTime = walking.time;
          } else {
            distanceToStation = station.distance;
            walkingTime = Math.round(station.distance / 80);
          }
        }
      }

      // Determine opening hours - prefer existing data, fallback to scraped
      let finalOpeningHours = reuseData.opening_hours || r.openingHours || null;

      // Insert into database
      const { error } = await supabase
        .from('food_listings')
        .insert({
          name: r.name,
          address: r.address || null,
          station_id: stationId,
          source_id: 'eatbook',
          source_url: r.sourceUrl,
          tags: r.tags,
          is_active: true,
          lat: lat,
          lng: lng,
          distance_to_station: distanceToStation,
          walking_time: walkingTime,
          opening_hours: finalOpeningHours,
          image_url: reuseData.image_url || null
        })
        .select()
        .single();

      if (error) {
        console.log(`  FAILED: ${r.name} - ${error.message}`);
        failed++;
      } else {
        const reused = [];
        if (reuseData.image_url) reused.push('thumbnail');
        if (reuseData.opening_hours) reused.push('hours');
        const reuseInfo = reused.length > 0 ? ` [reused: ${reused.join(', ')}]` : '';
        console.log(`  INSERTED: ${r.name} -> ${stationId || 'no station'} (${walkingTime || '?'} min walk)${reuseInfo}`);
        inserted++;
      }

      // Progress update
      if ((i + 1) % 50 === 0) {
        console.log(`\n  Progress: ${i + 1}/${unique.length} (${inserted} inserted, ${skipped} skipped, ${failed} failed)\n`);
      }

      // Rate limiting
      await sleep(150);
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped (exists): ${skipped}`);
    console.log(`Failed: ${failed}`);

  } catch (err) {
    console.error('Error:', err);
  }

  await browser.close();
}

main().catch(console.error);

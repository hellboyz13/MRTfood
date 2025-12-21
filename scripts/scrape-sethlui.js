/**
 * Scrape Seth Lui articles and insert into food_listings database
 * - Geocodes each restaurant using OneMap API
 * - Finds nearest MRT station
 * - Calculates walking distance and time
 * - Inserts new restaurants (skips duplicates)
 * - Links to sethlui source
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
  { url: 'https://sethlui.com/best-dim-sums-singapore-guide/', note: 'Best Dim Sum Guide' },
  // Add more Seth Lui articles here as needed
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
 */
async function findExistingRestaurant(name, stationId) {
  const normalizedName = name.toLowerCase().trim();

  // Try exact match first at same station
  if (stationId) {
    let { data } = await supabase
      .from('food_listings')
      .select('id, name')
      .ilike('name', normalizedName)
      .eq('station_id', stationId)
      .limit(1);

    if (data && data.length > 0) {
      return data[0];
    }
  }

  // Try exact match anywhere
  let { data } = await supabase
    .from('food_listings')
    .select('id, name')
    .ilike('name', normalizedName)
    .limit(1);

  if (data && data.length > 0) {
    return data[0];
  }

  return null;
}

/**
 * Look up existing restaurant data to reuse thumbnail and opening hours
 */
async function getExistingDataForReuse(name) {
  const normalizedName = name.toLowerCase().trim();

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
 * Add listing source link
 */
async function addListingSource(listingId, sourceId) {
  const { error } = await supabase
    .from('listing_sources')
    .upsert({ listing_id: listingId, source_id: sourceId }, { onConflict: 'listing_id,source_id' });

  if (error) {
    console.log(`    Warning: Could not add source link - ${error.message}`);
  }
}

/**
 * Scrape Seth Lui article for restaurants
 */
async function scrapeArticle(page, articleUrl, note) {
  console.log(`\nScraping: ${articleUrl}`);

  try {
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    const data = await page.evaluate(() => {
      const restaurants = [];

      // Seth Lui uses h2 or h3 for restaurant headings with numbering
      document.querySelectorAll('h2, h3').forEach(heading => {
        const text = heading.textContent?.trim() || '';
        if (text.length < 3 || text.length > 200) return;
        if (/^(summary|conclusion|related|read also|you may|where to|how to|what is|contents|table of)/i.test(text)) return;

        // Match numbered headings like "1. Restaurant Name" or "1) Restaurant Name"
        const nameMatch = text.match(/^(\d+)[\.\)]\s*(.+)$/);
        if (!nameMatch) return;

        let name = nameMatch[2].trim()
          .replace(/\s*–\s*.+$/, '')
          .replace(/\s*—\s*.+$/, '')
          .replace(/\s*\[.+\]$/, '') // Remove bracketed text at end
          .trim();

        let allText = '';
        let address = null;
        let openingHours = null;

        // Look through following siblings for address/hours
        let el = heading.nextElementSibling;
        let count = 0;
        while (el && count < 25) {
          if (el.tagName === 'H2' || el.tagName === 'H3') break;
          const content = el.textContent || '';
          allText += ' ' + content;

          // Look for address patterns
          if (!address) {
            // "Address: ..." pattern
            const addrMatch = content.match(/Address:\s*([^\n<]+)/i);
            if (addrMatch && addrMatch[1].trim().length > 10) {
              address = addrMatch[1].trim()
                .replace(/\s+/g, ' ')
                .replace(/Opening Hours:.*/i, '')
                .trim();
            }
          }

          // Postal code pattern as fallback
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

        // Infer tags from text
        const lowerText = allText.toLowerCase();
        const lowerName = name.toLowerCase();
        const tags = ['Dim Sum', 'Chinese']; // Default tags for dim sum article

        if (lowerText.includes('hawker') || lowerText.includes('kopitiam') || lowerText.includes('food centre')) {
          tags.push('Hawker');
        }
        if (lowerText.includes('buffet')) {
          tags.push('Buffet');
        }
        if (lowerText.includes('hotel') || lowerText.includes('fine dining')) {
          tags.push('Restaurant');
        }
        if (lowerText.includes('halal') || lowerText.includes('muslim')) {
          tags.push('Halal');
        }

        if (name.length > 2 && name.length < 100) {
          restaurants.push({
            name,
            address: address || '',
            openingHours: openingHours || '',
            tags
          });
        }
      });

      return {
        title: document.querySelector('h1')?.textContent?.trim() || '',
        restaurants
      };
    });

    console.log(`  Found ${data.restaurants.length} restaurants`);
    return data.restaurants.map(r => ({ ...r, note, sourceUrl: articleUrl }));
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('=== SETH LUI SCRAPER ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allRestaurants = [];

  try {
    // Step 1: Scrape all articles
    for (const article of ARTICLES) {
      const restaurants = await scrapeArticle(page, article.url, article.note);
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
    let linked = 0;
    let failed = 0;

    for (let i = 0; i < unique.length; i++) {
      const r = unique[i];
      console.log(`[${i + 1}/${unique.length}] ${r.name}`);

      // Geocode first to determine station
      let lat = null, lng = null;
      if (r.address && r.address.length > 10) {
        const geo = await geocodeAddress(r.address);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          console.log(`  Geocoded: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } else {
          console.log(`  Could not geocode address`);
        }
      }

      // Find nearest station
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
          console.log(`  Station: ${station.name} (${walkingTime} min walk)`);
        }
      }

      // Check if already exists
      const existing = await findExistingRestaurant(r.name, stationId);
      if (existing) {
        // Just add the source link
        await addListingSource(existing.id, 'sethlui');
        console.log(`  Already exists - linked to sethlui source`);
        linked++;
        continue;
      }

      // Look for similar restaurants to reuse their thumbnail/hours
      const reuseData = await getExistingDataForReuse(r.name);

      // Determine opening hours
      let finalOpeningHours = reuseData.opening_hours || r.openingHours || null;

      // Insert into database
      const { data: insertedData, error } = await supabase
        .from('food_listings')
        .insert({
          name: r.name,
          address: r.address || null,
          station_id: stationId,
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
        console.log(`  FAILED: ${error.message}`);
        failed++;
      } else {
        // Add source link
        await addListingSource(insertedData.id, 'sethlui');

        const reused = [];
        if (reuseData.image_url) reused.push('thumbnail');
        if (reuseData.opening_hours) reused.push('hours');
        const reuseInfo = reused.length > 0 ? ` [reused: ${reused.join(', ')}]` : '';
        console.log(`  INSERTED${reuseInfo}`);
        inserted++;
      }

      // Rate limiting
      await sleep(200);
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Linked (existing): ${linked}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);

  } catch (err) {
    console.error('Error:', err);
  }

  await browser.close();
}

main().catch(console.error);

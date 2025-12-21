/**
 * Shared utilities for food source scrapers
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ONEMAP_API_KEY = process.env.ONEMAP_API_KEY;

/**
 * Geocode an address using OneMap API
 */
async function geocodeAddress(address) {
  if (!address) return null;

  try {
    const cleanAddress = address.replace(/singapore\s*\d{6}/i, '').trim();
    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE),
        formatted_address: result.ADDRESS
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
}

/**
 * Find nearest MRT station to coordinates
 */
async function findNearestStation(lat, lng) {
  if (!lat || !lng) return null;

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng');

  if (!stations || stations.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;

    const distance = getDistanceMeters(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest ? { ...nearest, distance: minDistance } : null;
}

/**
 * Calculate walking distance and time using OneMap Routing API
 */
async function getWalkingDistance(fromLat, fromLng, toLat, toLng) {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;

    const response = await fetch(url, {
      headers: {
        'Authorization': ONEMAP_API_KEY
      }
    });

    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: data.route_summary.total_distance, // meters
        time: Math.round(data.route_summary.total_time / 60) // minutes
      };
    }
  } catch (error) {
    console.error('Routing error:', error.message);
  }

  // Fallback: estimate from straight-line distance
  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return {
    distance: Math.round(straightLine * 1.3), // walking factor
    time: Math.round((straightLine * 1.3) / 80) // ~80m/min walking speed
  };
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if a restaurant already exists in the database
 */
async function restaurantExists(name, address) {
  const { data } = await supabase
    .from('food_listings')
    .select('id')
    .ilike('name', name)
    .limit(1);

  return data && data.length > 0;
}

/**
 * Insert a new food listing
 */
async function insertFoodListing(listing) {
  // Geocode if we have an address but no coordinates
  if (listing.address && (!listing.lat || !listing.lng)) {
    const geo = await geocodeAddress(listing.address);
    if (geo) {
      listing.lat = geo.lat;
      listing.lng = geo.lng;
    }
  }

  // Find nearest station if we have coordinates
  if (listing.lat && listing.lng && !listing.station_id) {
    const station = await findNearestStation(listing.lat, listing.lng);
    if (station) {
      listing.station_id = station.id;

      // Get walking distance
      const walking = await getWalkingDistance(listing.lat, listing.lng, station.lat, station.lng);
      if (walking) {
        listing.distance_to_station = walking.distance;
        listing.walking_time = walking.time;
      }
    }
  }

  const { data, error } = await supabase
    .from('food_listings')
    .insert({
      name: listing.name,
      description: listing.description || null,
      address: listing.address || null,
      station_id: listing.station_id || null,
      image_url: listing.image_url || null,
      rating: listing.rating || null,
      source_id: listing.source_id,
      source_url: listing.source_url || null,
      tags: listing.tags || [],
      is_active: true,
      distance_to_station: listing.distance_to_station || null,
      lat: listing.lat || null,
      lng: listing.lng || null,
      walking_time: listing.walking_time || null,
      phone: listing.phone || null,
      website: listing.website || null,
      opening_hours: listing.opening_hours || null
    })
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error.message);
    return null;
  }

  return data;
}

/**
 * Parse common date formats and check if within range
 */
function isDateInRange(dateStr, startYear = 2020, endYear = 2025) {
  if (!dateStr) return false;

  // Try to extract year
  const yearMatch = dateStr.match(/20[2][0-5]/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    return year >= startYear && year <= endYear;
  }

  // Try parsing as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    return year >= startYear && year <= endYear;
  }

  return false;
}

/**
 * Clean and normalize restaurant name
 */
function cleanName(name) {
  if (!name) return null;
  return name
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

/**
 * Extract Singapore postal code from address
 */
function extractPostalCode(address) {
  if (!address) return null;
  const match = address.match(/Singapore\s*(\d{6})/i) || address.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  supabase,
  geocodeAddress,
  findNearestStation,
  getWalkingDistance,
  getDistanceMeters,
  restaurantExists,
  insertFoodListing,
  isDateInRange,
  cleanName,
  extractPostalCode,
  sleep
};

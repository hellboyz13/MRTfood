/**
 * OneMap Singapore API Integration
 * For walking distance and route calculations
 *
 * Requires environment variables:
 * - ONEMAP_EMAIL: Registered email for OneMap
 * - ONEMAP_PASSWORD: Password for OneMap
 */

interface OneMapRouteResponse {
  status_message: string;
  route_geometry: string;
  status: number;
  route_instructions: Array<[string, string, number, number, number, number, string, string, number]>;
  route_name: string[];
  route_summary: {
    start_point: string;
    end_point: string;
    total_time: number;    // in seconds
    total_distance: number; // in meters
  };
  phyroute?: {
    route_geometry: string;
    route_instructions: Array<unknown>;
    route_summary: {
      total_time: number;
      total_distance: number;
    };
  };
}

interface OneMapTokenResponse {
  access_token: string;
  expiry_timestamp: string;
}

export interface WalkingDistance {
  distance: number;      // meters
  duration: number;      // minutes
  success: boolean;
  error?: string;
}

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get OneMap API access token
 */
async function getOneMapToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.ONEMAP_EMAIL;
  const password = process.env.ONEMAP_PASSWORD;

  if (!email || !password) {
    console.warn('OneMap credentials not configured (ONEMAP_EMAIL, ONEMAP_PASSWORD)');
    return null;
  }

  try {
    const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data: OneMapTokenResponse = JSON.parse(responseText);

    // Cache the token (expires in 3 days, but we'll refresh 1 hour before)
    cachedToken = data.access_token;
    tokenExpiry = parseInt(data.expiry_timestamp) * 1000 - (60 * 60 * 1000); // 1 hour before expiry

    return cachedToken;
  } catch (error) {
    console.error('Failed to get OneMap token:', error);
    return null;
  }
}

/**
 * Get walking distance between two points using OneMap API
 */
export async function getWalkingDistance(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<WalkingDistance> {
  try {
    // Get auth token
    const token = await getOneMapToken();

    const url = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
    url.searchParams.append('start', `${startLat},${startLng}`);
    url.searchParams.append('end', `${endLat},${endLng}`);
    url.searchParams.append('routeType', 'walk');

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Add auth token if available
    if (token) {
      headers['Authorization'] = token;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`OneMap API error: ${response.status}`);
    }

    const data: OneMapRouteResponse = await response.json();

    if (data.status !== 0 || !data.route_summary) {
      throw new Error(data.status_message || 'Route not found');
    }

    return {
      distance: Math.round(data.route_summary.total_distance),
      duration: Math.round(data.route_summary.total_time / 60), // Convert seconds to minutes
      success: true,
    };
  } catch (error) {
    console.error('OneMap walking distance error:', error);

    // Fallback to straight-line estimation
    const straightLine = haversineDistance(startLat, startLng, endLat, endLng);
    const estimatedWalking = Math.round(straightLine * 1.3); // Walking is ~30% longer than straight line

    return {
      distance: estimatedWalking,
      duration: Math.round(estimatedWalking / 80), // ~80m per minute walking
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch get walking distances for multiple destinations from one origin
 * Includes rate limiting to respect API limits
 */
export async function getBatchWalkingDistances(
  originLat: number,
  originLng: number,
  destinations: Array<{ id: string; lat: number; lng: number }>
): Promise<Map<string, WalkingDistance>> {
  const results = new Map<string, WalkingDistance>();

  // Pre-fetch token to avoid multiple auth calls
  await getOneMapToken();

  // Process in batches of 5 with 200ms delay between calls
  const batchSize = 5;
  const delayMs = 200;

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);

    const batchPromises = batch.map(async (dest) => {
      const result = await getWalkingDistance(originLat, originLng, dest.lat, dest.lng);
      return { id: dest.id, result };
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });

    // Rate limiting delay between batches
    if (i + batchSize < destinations.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Haversine formula for straight-line distance (fallback)
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get walking distance with caching (for database storage)
 */
export async function getWalkingDistanceWithCache(
  supabase: { from: (table: string) => any },
  listingId: string,
  listingLat: number,
  listingLng: number,
  stationLat: number,
  stationLng: number
): Promise<WalkingDistance> {
  // Check if we have cached distance in database
  const { data: listing } = await supabase
    .from('food_listings')
    .select('walking_distance_m, walking_duration_min')
    .eq('id', listingId)
    .single();

  if (listing?.walking_distance_m && listing?.walking_duration_min) {
    return {
      distance: listing.walking_distance_m,
      duration: listing.walking_duration_min,
      success: true,
    };
  }

  // Fetch from OneMap
  const result = await getWalkingDistance(stationLat, stationLng, listingLat, listingLng);

  // Cache in database if successful
  if (result.success) {
    await supabase
      .from('food_listings')
      .update({
        walking_distance_m: result.distance,
        walking_duration_min: result.duration,
      })
      .eq('id', listingId);
  }

  return result;
}

/**
 * Format distance for display
 */
export function formatDistanceOneMap(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format walking duration for display
 */
export function formatWalkingTime(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min walk';
  }
  if (minutes === 1) {
    return '1 min walk';
  }
  return `${minutes} min walk`;
}

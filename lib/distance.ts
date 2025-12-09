// Format distance for display
export function formatDistance(meters: number | null): string {
  if (meters === null) return '';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

// Get walking time from database (in seconds) and convert to minutes
// Falls back to estimate if walking_time not available
export function getWalkingTime(walkingTimeSeconds: number | null, distanceMeters: number | null): number | null {
  if (walkingTimeSeconds !== null) {
    return Math.round(walkingTimeSeconds / 60);
  }
  // Fallback to estimate (80m/min)
  if (distanceMeters !== null) {
    return Math.round(distanceMeters / 80);
  }
  return null;
}

// Generate Google Maps URL - searches by restaurant name for better results
export function getMapsUrl(name: string, address?: string): string {
  // Use restaurant name for search - Google is smart enough to find it
  const query = name + (address ? ` Singapore` : '');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

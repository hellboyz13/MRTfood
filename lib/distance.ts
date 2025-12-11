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

// Generate Google Maps URL using name + landmark for precise location
export function getMapsUrl(name: string, landmark?: string | null): string {
  const query = landmark ? `${name} ${landmark}` : `${name} Singapore`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

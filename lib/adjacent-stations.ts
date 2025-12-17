// Mapping of stations with no content to their nearby stations
// Used as fallback to show "Nearby at [Station]" results

export interface AdjacentStationInfo {
  stationId: string;
  walkingMinutes?: number; // Walking time in minutes (for main line stations)
  isLRT?: boolean; // True if this is an LRT connection
}

// Mapping of empty stations to their adjacent station options (in priority order)
export const adjacentStations: { [key: string]: string[] } = {
  // Stations near major hubs
  'marina-bay': ['bayfront', 'raffles-place', 'downtown'],
  'gardens-by-the-bay': ['bayfront', 'marina-bay'],
  'tanjong-rhu': ['stadium', 'mountbatten'],
  'katong-park': ['marine-parade', 'marine-terrace'],

  // Circle Line gaps
  'one-north': ['buona-vista', 'holland-village'],
  'haw-par-villa': ['pasir-panjang', 'kent-ridge'],
  'bartley': ['woodleigh', 'serangoon'],
  'upper-changi': ['expo', 'tampines-east'],

  // North-South Line gaps
  'lentor': ['mayflower', 'bright-hill'],

  // Downtown Line gaps
  'hume': ['hillview', 'beauty-world'],

  // East-West Line gaps
  'tuas-link': ['tuas-crescent', 'tuas-west-road'],

  // Bukit Panjang LRT - all redirect to main station only
  'south-view': ['bukit-panjang'],
  'keat-hong': ['bukit-panjang'],
  'teck-whye': ['bukit-panjang'],
  'phoenix': ['bukit-panjang'],
  'petir': ['bukit-panjang'],
  'pending': ['bukit-panjang'],
  'fajar': ['bukit-panjang'],
  'segar': ['bukit-panjang'],
  'jelapang': ['bukit-panjang'],

  // Sengkang LRT
  'compassvale': ['sengkang'],
  'rumbia': ['sengkang'],
  'kangkar': ['sengkang'],

  // Punggol LRT
  'cheng-lim': ['punggol'],
  'layar': ['punggol'],
  'renjong': ['punggol'],
  'cove': ['punggol'],
  'meridian': ['punggol'],
  'coral-edge': ['punggol'],
  'riviera': ['punggol'],
  'oasis': ['punggol'],
  'sam-kee': ['punggol'],
  'punggol-point': ['punggol'],
  'samudera': ['punggol'],
  'nibong': ['punggol'],
  'sumang': ['punggol'],

  // Mount Pleasant area
  'mount-pleasant': ['caldecott', 'stevens'],
};

// Walking time estimates for main line station connections (in minutes)
export const walkingTimes: { [fromStation: string]: { [toStation: string]: number } } = {
  // Priority stations with specified walking times
  'marina-bay': { 'bayfront': 2, 'raffles-place': 5, 'downtown': 7 },
  'one-north': { 'buona-vista': 3, 'holland-village': 8 },
  'bartley': { 'woodleigh': 4, 'serangoon': 6 },
  'gardens-by-the-bay': { 'bayfront': 5, 'marina-bay': 7 },
  'katong-park': { 'marine-parade': 4, 'marine-terrace': 5 },
  'tanjong-rhu': { 'stadium': 3, 'mountbatten': 5 },

  // Other main line connections (estimated)
  'haw-par-villa': { 'pasir-panjang': 4, 'kent-ridge': 5 },
  'upper-changi': { 'expo': 5, 'tampines-east': 6 },
  'lentor': { 'mayflower': 3, 'bright-hill': 4 },
  'hume': { 'hillview': 3, 'beauty-world': 5 },
  'tuas-link': { 'tuas-crescent': 4, 'tuas-west-road': 5 },
  'mount-pleasant': { 'caldecott': 4, 'stevens': 5 },
};

// LRT stations that connect to main stations
export const lrtStations = new Set([
  // Bukit Panjang LRT
  'south-view', 'keat-hong', 'teck-whye', 'phoenix', 'petir', 'pending',
  'fajar', 'segar', 'jelapang',
  // Sengkang LRT
  'compassvale', 'rumbia', 'kangkar',
  // Punggol LRT
  'cheng-lim', 'layar', 'renjong', 'cove', 'meridian', 'coral-edge',
  'riviera', 'oasis', 'sam-kee', 'punggol-point', 'samudera', 'nibong', 'sumang',
]);

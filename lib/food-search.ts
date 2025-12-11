import Fuse from 'fuse.js';
import { supabase } from './supabase';
import { FOOD_SYNONYMS, PLURALS, DISH_TERMS, VALID_SHORT_QUERIES } from './food-taxonomy';
import { StationSearchResult, SearchMatch } from '@/types/database';

// ============================================
// QUERY EXPANSION
// ============================================
function expandQuery(query: string): string[] {
  const queryLower = query.toLowerCase().trim();
  const expanded = new Set<string>([queryLower]);

  // Add plural/singular variant
  if (PLURALS[queryLower]) {
    expanded.add(PLURALS[queryLower]);
  }

  // Add synonyms (direct match)
  if (FOOD_SYNONYMS[queryLower]) {
    FOOD_SYNONYMS[queryLower].forEach(syn => expanded.add(syn.toLowerCase()));
  }

  // Check if query is part of a multi-word synonym key
  Object.entries(FOOD_SYNONYMS).forEach(([key, synonyms]) => {
    const keyLower = key.toLowerCase();
    // Exact match or query contains key
    if (keyLower === queryLower || queryLower.includes(keyLower)) {
      synonyms.forEach(syn => expanded.add(syn.toLowerCase()));
    }
    // Key contains query (for partial matches like "tom" in "tom yum")
    // Only for longer queries to prevent false positives
    if (queryLower.length >= 4 && keyLower.includes(queryLower)) {
      expanded.add(keyLower);
      synonyms.forEach(syn => expanded.add(syn.toLowerCase()));
    }
  });

  return Array.from(expanded);
}

// ============================================
// WHOLE-WORD MATCHING (prevents chi→chicken)
// ============================================
function wholeWordMatch(query: string, text: string): boolean {
  if (!text || !query) return false;
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match
  if (textLower === queryLower) return true;

  // Whole word boundary match
  // Matches: "chicken" in "fried chicken", "chicken-rice", "chicken rice"
  // Does NOT match: "chi" in "chicken"
  const escaped = queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[\\s\\-\\_\\/])${escaped}($|[\\s\\-\\_\\/])`, 'i');
  return regex.test(textLower);
}

// Check if any expanded term matches any tag
function matchesTags(expandedTerms: string[], tags: string[]): { matches: boolean; matchedTags: string[] } {
  if (!tags || tags.length === 0) return { matches: false, matchedTags: [] };

  const matchedTags: string[] = [];

  for (const term of expandedTerms) {
    for (const tag of tags) {
      if (wholeWordMatch(term, tag)) {
        matchedTags.push(tag);
      }
    }
  }

  return { matches: matchedTags.length > 0, matchedTags: [...new Set(matchedTags)] };
}

// ============================================
// FUZZY SEARCH CONFIG
// ============================================
interface SearchableListing {
  id: string;
  name: string;
  station_id: string | null;
  tags: string[] | null;
  description: string | null;
}

function createFuseInstance(listings: SearchableListing[]) {
  return new Fuse(listings, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'tags', weight: 0.2 },
      { name: 'description', weight: 0.1 },
    ],
    threshold: 0.25,           // Strict - allows 1-2 typos max
    minMatchCharLength: 3,     // Minimum chars to match
    ignoreLocation: true,      // Match anywhere in string
    includeScore: true,        // For filtering low-confidence
    findAllMatches: true,
  });
}

// ============================================
// STRING SIMILARITY (Dice coefficient)
// ============================================
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    if (bigrams1.has(s2.substring(i, i + 2))) {
      intersection++;
    }
  }

  return (2 * intersection) / (s1.length + s2.length - 2);
}

// ============================================
// CHECK IF QUERY LOOKS LIKE A RESTAURANT NAME
// ============================================
function isLikelyRestaurantName(query: string, originalQuery: string): boolean {
  const queryLower = query.toLowerCase();

  // Contains apostrophe (Ernie's, Jack's)
  if (query.includes("'") || query.includes("'")) return true;

  // Multi-word query (Maxi Coffee Bar)
  if (query.split(' ').length >= 2) {
    // But not if ALL words are food terms
    const words = queryLower.split(' ');
    const allFoodTerms = words.every(word =>
      FOOD_SYNONYMS[word] !== undefined || DISH_TERMS.has(word)
    );
    if (!allFoodTerms) return true;
  }

  // Starts with capital letter in original (proper noun)
  if (/^[A-Z]/.test(originalQuery.trim())) {
    // But not if it's a known food term
    if (!FOOD_SYNONYMS[queryLower] && !DISH_TERMS.has(queryLower)) {
      return true;
    }
  }

  return false;
}

// ============================================
// SEARCH TYPE DETECTION
// ============================================
function detectSearchType(query: string): 'food' | 'restaurant' {
  const queryLower = query.toLowerCase();

  // Known restaurant patterns / brand names
  const restaurantPatterns = [
    /^[a-z]{2,3}$/i,  // Short abbreviations like KFC, DTF (but check VALID_SHORT_QUERIES)
    /\d/,              // Contains numbers (e.g., "7-11", "85C")
    /[A-Z]{2,}/,       // Multiple consecutive caps
  ];

  // Brand name indicators
  const brandIndicators = [
    'restaurant', 'cafe', 'kitchen', 'house', 'place', 'corner',
    'express', 'grill', 'bar', 'bistro', 'diner', 'eatery'
  ];

  // Check if query matches a known food term
  const isFoodTerm = FOOD_SYNONYMS[queryLower] !== undefined ||
                     DISH_TERMS.has(queryLower) ||
                     queryLower.split(' ').some(word => FOOD_SYNONYMS[word] !== undefined);

  if (isFoodTerm) return 'food';

  // Check for brand indicators
  if (brandIndicators.some(ind => queryLower.includes(ind))) return 'restaurant';

  // Check patterns
  if (restaurantPatterns.some(pattern => pattern.test(query))) {
    // But allow valid short food queries
    if (!VALID_SHORT_QUERIES.has(queryLower) && query.length <= 3) {
      return 'restaurant';
    }
  }

  // Default to food search
  return 'food';
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================
export async function searchStationsByFood(query: string): Promise<StationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const searchQuery = query.trim();
  const queryLower = searchQuery.toLowerCase();

  console.log(`🔍 Search: "${searchQuery}"`);

  // Validate short queries
  if (searchQuery.length < 3 && !VALID_SHORT_QUERIES.has(queryLower)) {
    console.log('⚠️ Query too short, skipping');
    return [];
  }

  // ===== FETCH ALL LISTINGS =====
  const { data: listings, error: listingsError } = await supabase
    .from('food_listings')
    .select('id, station_id, name, description, tags')
    .eq('is_active', true)
    .not('station_id', 'is', null);

  if (listingsError || !listings) {
    console.error('Error fetching listings:', listingsError);
    return [];
  }

  // ============================================
  // STEP 1: EXACT NAME MATCH (HIGHEST PRIORITY)
  // ============================================
  if (isLikelyRestaurantName(queryLower, searchQuery)) {
    console.log(`🎯 Checking exact name matches first...`);

    const exactMatches = (listings as SearchableListing[]).filter(listing => {
      const listingName = (listing.name || '').toLowerCase();
      const normalizedQuery = queryLower.replace(/['']/g, "'");
      const normalizedName = listingName.replace(/['']/g, "'");

      return (
        normalizedName === normalizedQuery ||                    // Exact match
        normalizedName.includes(normalizedQuery) ||              // Query in name
        normalizedQuery.includes(normalizedName) ||              // Name in query
        calculateSimilarity(normalizedName, normalizedQuery) > 0.7  // High similarity
      );
    });

    // If we have 1-5 strong name matches, return ONLY those
    if (exactMatches.length > 0 && exactMatches.length <= 5) {
      console.log(`✅ Found ${exactMatches.length} exact name match(es)`);
      const stationResultsMap = new Map<string, StationSearchResult>();

      exactMatches.forEach(listing => {
        if (!listing.station_id) return;

        if (!stationResultsMap.has(listing.station_id)) {
          stationResultsMap.set(listing.station_id, {
            stationId: listing.station_id,
            matches: [],
          });
        }

        stationResultsMap.get(listing.station_id)!.matches.push({
          id: listing.id,
          name: listing.name || 'Unknown',
          type: 'curated',
          matchType: 'restaurant',
          score: 0.01, // Very high confidence
        });
      });

      return Array.from(stationResultsMap.values());
    }

    // Also try fuzzy name matching for typos
    const nameFuse = new Fuse(listings as SearchableListing[], {
      keys: [{ name: 'name', weight: 1.0 }],
      threshold: 0.25,
      minMatchCharLength: 3,
      ignoreLocation: true,
      includeScore: true,
    });

    const fuzzyNameResults = nameFuse.search(searchQuery);

    // If top result has very high confidence (score < 0.15), return only those
    if (fuzzyNameResults.length > 0 && fuzzyNameResults[0].score !== undefined && fuzzyNameResults[0].score < 0.15) {
      const topMatches = fuzzyNameResults
        .filter(r => r.score !== undefined && r.score < 0.2)
        .slice(0, 5);

      if (topMatches.length > 0 && topMatches.length <= 5) {
        console.log(`✅ Found ${topMatches.length} fuzzy name match(es) with high confidence`);
        const stationResultsMap = new Map<string, StationSearchResult>();

        topMatches.forEach(result => {
          const listing = result.item;
          if (!listing.station_id) return;

          if (!stationResultsMap.has(listing.station_id)) {
            stationResultsMap.set(listing.station_id, {
              stationId: listing.station_id,
              matches: [],
            });
          }

          stationResultsMap.get(listing.station_id)!.matches.push({
            id: listing.id,
            name: listing.name || 'Unknown',
            type: 'curated',
            matchType: 'restaurant',
            score: result.score || 0.1,
          });
        });

        return Array.from(stationResultsMap.values());
      }
    }
  }

  // ============================================
  // STEP 2: FOOD TERM / TAG SEARCH (existing logic)
  // ============================================
  const searchType = detectSearchType(searchQuery);
  console.log(`📋 Search type: ${searchType}`);

  const stationResultsMap = new Map<string, StationSearchResult>();

  // ===== EXPAND QUERY WITH SYNONYMS =====
  const expandedTerms = expandQuery(searchQuery);
  console.log(`📚 Expanded terms:`, expandedTerms.slice(0, 10)); // Log first 10

  // ===== SEARCH LOGIC =====
  const fuse = createFuseInstance(listings as SearchableListing[]);

  listings.forEach((listing: SearchableListing) => {
    if (!listing.station_id) return;

    let matched = false;
    let matchType: 'food' | 'restaurant' = searchType;
    let matchedTags: string[] = [];
    let matchScore = 1; // Lower is better

    if (searchType === 'restaurant') {
      // Restaurant search: fuzzy match on name
      const fuseResults = fuse.search(searchQuery);
      const listingResult = fuseResults.find(r => r.item.id === listing.id);
      if (listingResult && listingResult.score !== undefined && listingResult.score < 0.35) {
        matched = true;
        matchScore = listingResult.score;
        matchType = 'restaurant';
      }
    } else {
      // Food search: check tags with expanded terms (whole-word)
      if (listing.tags && Array.isArray(listing.tags)) {
        const tagMatch = matchesTags(expandedTerms, listing.tags);
        if (tagMatch.matches) {
          matched = true;
          matchedTags = tagMatch.matchedTags;
          matchScore = 0.1; // High confidence for tag matches
        }
      }

      // Also check name for dish terms OR longer queries
      if (!matched && (DISH_TERMS.has(queryLower) || searchQuery.length >= 4)) {
        // Use expanded terms for name matching too
        for (const term of expandedTerms) {
          if (wholeWordMatch(term, listing.name || '')) {
            matched = true;
            matchScore = 0.2;
            break;
          }
        }

        // Fuzzy fallback for typos (only if query >= 4 chars)
        if (!matched && searchQuery.length >= 4) {
          const fuseResults = fuse.search(searchQuery);
          const listingResult = fuseResults.find(r => r.item.id === listing.id);
          if (listingResult && listingResult.score !== undefined && listingResult.score < 0.3) {
            matched = true;
            matchScore = listingResult.score;
          }
        }
      }

      // Check description as last resort
      if (!matched && listing.description) {
        for (const term of expandedTerms) {
          if (wholeWordMatch(term, listing.description)) {
            matched = true;
            matchScore = 0.5; // Lower confidence
            break;
          }
        }
      }
    }

    if (matched) {
      if (!stationResultsMap.has(listing.station_id)) {
        stationResultsMap.set(listing.station_id, {
          stationId: listing.station_id,
          matches: [],
        });
      }

      stationResultsMap.get(listing.station_id)!.matches.push({
        id: listing.id,
        name: listing.name || 'Unknown',
        type: 'curated',
        matchType,
        matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
        score: matchScore,
      });
    }
  });

  // ===== SEARCH CHAIN OUTLETS =====
  await searchChainOutlets(searchQuery, expandedTerms, searchType, stationResultsMap);

  // ===== SORT RESULTS =====
  const results = Array.from(stationResultsMap.values());

  // Sort stations by: number of matches, then by best match score
  results.sort((a, b) => {
    // More matches = higher priority
    if (b.matches.length !== a.matches.length) {
      return b.matches.length - a.matches.length;
    }
    // Better score = higher priority
    const aScore = Math.min(...a.matches.map(m => m.score || 1));
    const bScore = Math.min(...b.matches.map(m => m.score || 1));
    return aScore - bScore;
  });

  // Sort matches within each station by score
  results.forEach(r => {
    r.matches.sort((a, b) => (a.score || 1) - (b.score || 1));
  });

  console.log(`✅ Found ${results.length} stations with matches`);
  return results;
}

// ============================================
// CHAIN OUTLETS SEARCH
// ============================================
async function searchChainOutlets(
  query: string,
  expandedTerms: string[],
  searchType: 'food' | 'restaurant',
  stationResultsMap: Map<string, StationSearchResult>
) {
  const { data: chainOutlets, error } = await supabase
    .from('chain_outlets')
    .select(`
      id,
      nearest_station_id,
      name,
      brand_id,
      food_tags,
      chain_brands (
        id,
        name,
        category
      )
    `)
    .eq('is_active', true)
    .not('nearest_station_id', 'is', null);

  if (error || !chainOutlets) {
    console.error('Error fetching chain outlets:', error);
    return;
  }

  const queryLower = query.toLowerCase();

  chainOutlets.forEach((outlet: any) => {
    if (!outlet.nearest_station_id) return;

    let matched = false;
    let matchType: 'food' | 'restaurant' = searchType;
    let matchedTags: string[] = [];
    let matchScore = 1;

    const outletTags = outlet.food_tags || [];
    const brandName = outlet.chain_brands?.name || outlet.name || '';

    if (searchType === 'restaurant') {
      // Match brand or outlet name
      if (brandName.toLowerCase().includes(queryLower) ||
          outlet.name?.toLowerCase().includes(queryLower)) {
        matched = true;
        matchScore = 0.1;
        matchType = 'restaurant';
      }
    } else {
      // Food search: check outlet food_tags
      const tagMatch = matchesTags(expandedTerms, outletTags);
      if (tagMatch.matches) {
        matched = true;
        matchedTags = tagMatch.matchedTags;
        matchScore = 0.15;
      }
    }

    if (matched) {
      if (!stationResultsMap.has(outlet.nearest_station_id)) {
        stationResultsMap.set(outlet.nearest_station_id, {
          stationId: outlet.nearest_station_id,
          matches: [],
        });
      }

      stationResultsMap.get(outlet.nearest_station_id)!.matches.push({
        id: outlet.id,
        name: outlet.name || brandName,
        type: 'chain',
        matchType,
        matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
        score: matchScore,
      });
    }
  });
}

// ============================================
// EXPORT FOR API COMPATIBILITY
// ============================================
export { searchStationsByFood as searchStationsByFoodWithCounts };

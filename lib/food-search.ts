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

  // ===== EXPAND QUERY WITH SYNONYMS FIRST =====
  const expandedTerms = expandQuery(searchQuery);
  console.log(`📚 Expanded terms:`, expandedTerms.slice(0, 5));

  // ===== SERVER-SIDE FILTERED SEARCH =====
  // Build OR conditions for name and tags
  const searchPattern = `%${queryLower}%`;

  // Query 1: Search by name (ilike)
  const { data: nameMatches, error: nameError } = await supabase
    .from('food_listings')
    .select('id, station_id, name, description, tags')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .ilike('name', searchPattern)
    .limit(50);

  // Query 2: Search by tags (contains any expanded term)
  const { data: tagMatches, error: tagError } = await supabase
    .from('food_listings')
    .select('id, station_id, name, description, tags')
    .eq('is_active', true)
    .not('station_id', 'is', null)
    .overlaps('tags', expandedTerms)
    .limit(50);

  if (nameError) console.error('Name search error:', nameError);
  if (tagError) console.error('Tag search error:', tagError);

  // Merge and dedupe results
  const listingsMap = new Map<string, SearchableListing>();
  const allMatches = [...(nameMatches || []), ...(tagMatches || [])] as SearchableListing[];
  allMatches.forEach(listing => {
    listingsMap.set(listing.id, listing);
  });
  const listings = Array.from(listingsMap.values());

  console.log(`📊 Server returned ${listings.length} listings (name: ${nameMatches?.length || 0}, tags: ${tagMatches?.length || 0})`);

  if (listings.length === 0) {
    console.log('No listings matched');
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
  // STEP 2: RELEVANCE-BASED SCORING
  // Priority: 1=exact (0.01), 2=starts with (0.10), 3=contains (0.20), 4=tag only (0.30)
  // ============================================
  const searchType = detectSearchType(searchQuery);
  console.log(`📋 Search type: ${searchType}`);

  const stationResultsMap = new Map<string, StationSearchResult>();

  listings.forEach((listing: SearchableListing) => {
    if (!listing.station_id) return;

    let matched = false;
    let matchType: 'food' | 'restaurant' = searchType;
    let matchedTags: string[] = [];
    let matchScore = 1; // Lower is better

    const nameLower = (listing.name || '').toLowerCase();

    // Priority 1: Exact name match
    if (nameLower === queryLower) {
      matched = true;
      matchScore = 0.01;
    }
    // Priority 2: Name starts with query
    else if (nameLower.startsWith(queryLower)) {
      matched = true;
      matchScore = 0.10;
    }
    // Priority 3: Name contains query
    else if (nameLower.includes(queryLower)) {
      matched = true;
      matchScore = 0.20;
    }

    // Priority 4: Tag match (if no name match)
    if (!matched && listing.tags && Array.isArray(listing.tags)) {
      const tagMatch = matchesTags(expandedTerms, listing.tags);
      if (tagMatch.matches) {
        matched = true;
        matchedTags = tagMatch.matchedTags;
        matchScore = 0.30;
      }
    }

    // Priority 5: Description match (lowest)
    if (!matched && listing.description) {
      for (const term of expandedTerms) {
        if (wholeWordMatch(term, listing.description)) {
          matched = true;
          matchScore = 0.50;
          break;
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

  // ===== SEARCH MALL OUTLETS =====
  await searchMallOutlets(searchQuery, expandedTerms, searchType, stationResultsMap);

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
  // Server-side filter for chain outlets
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
    .not('nearest_station_id', 'is', null)
    .or(`name.ilike.%${query}%,food_tags.cs.{${expandedTerms[0]}}`)
    .limit(30);

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
    const nameLower = (outlet.name || brandName).toLowerCase();

    // Relevance scoring for chains
    if (nameLower === queryLower) {
      matched = true;
      matchScore = 0.01;
    } else if (nameLower.startsWith(queryLower)) {
      matched = true;
      matchScore = 0.10;
    } else if (nameLower.includes(queryLower)) {
      matched = true;
      matchScore = 0.20;
    }

    // Tag match if no name match
    if (!matched) {
      const tagMatch = matchesTags(expandedTerms, outletTags);
      if (tagMatch.matches) {
        matched = true;
        matchedTags = tagMatch.matchedTags;
        matchScore = 0.30;
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
// MALL OUTLETS SEARCH
// ============================================
async function searchMallOutlets(
  query: string,
  expandedTerms: string[],
  searchType: 'food' | 'restaurant',
  stationResultsMap: Map<string, StationSearchResult>
) {
  // Server-side filter for mall outlets
  const { data: mallOutlets, error } = await supabase
    .from('mall_outlets')
    .select(`
      id,
      name,
      mall_id,
      category,
      malls!inner (
        id,
        name,
        station_id
      )
    `)
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(50);

  if (error || !mallOutlets) {
    console.error('Error fetching mall outlets:', error);
    return;
  }

  const queryLower = query.toLowerCase();

  mallOutlets.forEach((outlet: any) => {
    const stationId = outlet.malls?.station_id;
    if (!stationId) return;

    let matched = false;
    let matchType: 'food' | 'restaurant' = searchType;
    let matchedTags: string[] = [];
    let matchScore = 1;

    const outletName = outlet.name || '';
    const outletNameLower = outletName.toLowerCase();
    const outletCategory = outlet.category || '';

    // Relevance scoring for mall outlets
    if (outletNameLower === queryLower) {
      matched = true;
      matchScore = 0.01;
    } else if (outletNameLower.startsWith(queryLower)) {
      matched = true;
      matchScore = 0.10;
    } else if (outletNameLower.includes(queryLower)) {
      matched = true;
      matchScore = 0.20;
    }

    // Category match if no name match
    if (!matched && outletCategory) {
      const catLower = outletCategory.toLowerCase();
      if (catLower.includes(queryLower) || expandedTerms.some(t => catLower.includes(t.toLowerCase()))) {
        matched = true;
        matchedTags = [outletCategory];
        matchScore = 0.30;
      }
    }

    if (matched) {
      if (!stationResultsMap.has(stationId)) {
        stationResultsMap.set(stationId, {
          stationId: stationId,
          matches: [],
        });
      }

      stationResultsMap.get(stationId)!.matches.push({
        id: outlet.id,
        name: outletName,
        type: 'mall',
        matchType,
        matchedTags: matchedTags.length > 0 ? matchedTags : undefined,
        score: matchScore,
        mallName: outlet.malls?.name,
        mallId: outlet.mall_id,
      });
    }
  });
}

// ============================================
// EXPORT FOR API COMPATIBILITY
// ============================================
export { searchStationsByFood as searchStationsByFoodWithCounts };

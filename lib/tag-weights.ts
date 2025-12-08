// Weighted tag system for search ranking
// primary: KNOWN FOR - main identity, core offerings
// secondary: HAS IT - available but not famous for it

export interface TagWeights {
  primary: string[];
  secondary: string[];
}

// Chain brand tag weights (for Popular tab)
export const CHAIN_TAG_WEIGHTS: Record<string, TagWeights> = {
  // === FAST FOOD ===
  'mcdonald': {
    primary: ['burger', 'fries', 'mcspicy', 'mcnuggets', 'fast food', 'mcmuffin', 'breakfast'],
    secondary: ['chicken', 'western', 'coffee'],
  },
  'kfc': {
    primary: ['fried chicken', 'chicken', 'fast food', 'popcorn chicken', 'zinger'],
    secondary: ['burger', 'fries', 'western'],
  },
  'burger-king': {
    primary: ['burger', 'whopper', 'fast food', 'fries'],
    secondary: ['chicken', 'western', 'breakfast'],
  },
  'subway': {
    primary: ['sandwich', 'sub', 'healthy', 'salad'],
    secondary: ['fast food', 'western', 'breakfast'],
  },
  'jollibee': {
    primary: ['fried chicken', 'chicken', 'filipino', 'chickenjoy', 'jolly spaghetti'],
    secondary: ['burger', 'fast food'],
  },
  '4fingers': {
    primary: ['fried chicken', 'korean chicken', 'crispy chicken', 'wings'],
    secondary: ['fast food', 'korean'],
  },

  // === CHINESE ===
  'din-tai-fung': {
    primary: ['xiao long bao', 'soup dumplings', 'dumplings', 'dim sum', 'taiwanese'],
    secondary: ['fried rice', 'noodles', 'chinese'],
  },
  'tim-ho-wan': {
    primary: ['dim sum', 'char siu bao', 'bbq pork bun', 'siu mai', 'har gow'],
    secondary: ['chinese', 'cantonese', 'dumplings'],
  },
  'crystal-jade': {
    primary: ['dim sum', 'chinese', 'cantonese', 'roast duck', 'la mian'],
    secondary: ['xiao long bao', 'fried rice', 'noodles'],
  },
  'putien': {
    primary: ['fujian', 'heng hwa', 'lor mee', 'oyster', 'mee sua'],
    secondary: ['chinese', 'seafood'],
  },
  'xiang-xiang-hunan': {
    primary: ['hunan', 'spicy', 'mala', 'chinese', 'szechuan'],
    secondary: ['stir fry', 'rice'],
  },

  // === HOTPOT ===
  'haidilao': {
    primary: ['hotpot', 'steamboat', 'mala', 'soup base', 'shabu'],
    secondary: ['chinese', 'beef', 'seafood', 'noodles'],
  },
  'beauty-in-the-pot': {
    primary: ['hotpot', 'steamboat', 'collagen', 'soup base'],
    secondary: ['chinese', 'healthy'],
  },
  'suki-ya': {
    primary: ['hotpot', 'steamboat', 'sukiyaki', 'shabu shabu', 'buffet'],
    secondary: ['japanese', 'beef'],
  },
  'seoul-garden': {
    primary: ['korean bbq', 'bbq', 'buffet', 'grill', 'steamboat'],
    secondary: ['korean', 'beef', 'hotpot'],
  },

  // === BUBBLE TEA ===
  'koi': {
    primary: ['bubble tea', 'boba', 'milk tea', 'golden bubble'],
    secondary: ['drinks', 'beverage', 'tea'],
  },
  'liho': {
    primary: ['bubble tea', 'boba', 'milk tea', 'cheese tea'],
    secondary: ['drinks', 'beverage', 'tea'],
  },
  'gong-cha': {
    primary: ['bubble tea', 'boba', 'milk tea', 'pearls'],
    secondary: ['drinks', 'beverage', 'tea'],
  },
  'tiger-sugar': {
    primary: ['bubble tea', 'boba', 'brown sugar', 'tiger stripes'],
    secondary: ['drinks', 'milk tea'],
  },
  'chicha-san-chen': {
    primary: ['bubble tea', 'fruit tea', 'taiwanese tea'],
    secondary: ['drinks', 'beverage'],
  },
  'the-alley': {
    primary: ['bubble tea', 'boba', 'brown sugar deerioca', 'milk tea'],
    secondary: ['drinks', 'tea'],
  },
  'each-a-cup': {
    primary: ['bubble tea', 'boba', 'milk tea', 'budget'],
    secondary: ['drinks', 'beverage'],
  },

  // === LOCAL / KOPITIAM ===
  'ya-kun': {
    primary: ['kaya toast', 'coffee', 'kopi', 'soft boiled eggs', 'breakfast', 'traditional'],
    secondary: ['local', 'singaporean'],
  },
  'toast-box': {
    primary: ['kaya toast', 'coffee', 'kopi', 'breakfast', 'laksa', 'mee siam'],
    secondary: ['local', 'singaporean'],
  },
  'old-chang-kee': {
    primary: ['curry puff', 'fried snacks', 'sotong', 'chicken wing', 'nuggets'],
    secondary: ['local', 'singaporean', 'fast food'],
  },
  'mr-bean': {
    primary: ['soy milk', 'tau huay', 'pancake', 'healthy', 'breakfast'],
    secondary: ['local', 'vegetarian', 'drinks'],
  },

  // === JAPANESE ===
  'genki-sushi': {
    primary: ['sushi', 'sashimi', 'japanese', 'conveyor belt'],
    secondary: ['salmon', 'rice'],
  },
  'sushi-express': {
    primary: ['sushi', 'japanese', 'budget sushi', 'conveyor belt'],
    secondary: ['salmon', 'rice'],
  },
  'pepper-lunch': {
    primary: ['teppanyaki', 'hot plate', 'beef pepper rice', 'japanese'],
    secondary: ['steak', 'rice', 'western'],
  },
  'ajisen-ramen': {
    primary: ['ramen', 'japanese', 'noodles', 'tonkotsu'],
    secondary: ['gyoza', 'rice'],
  },
};

// Helper function to get tag weights for a chain brand
export function getChainTagWeights(brandId: string): TagWeights {
  return CHAIN_TAG_WEIGHTS[brandId] || { primary: [], secondary: [] };
}

// Helper function to normalize search queries (fix whitespace issues)
function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}

// Helper function to check if a search query matches primary tags
export function matchesPrimaryTags(query: string, weights: TagWeights): boolean {
  const normalizedQuery = normalizeSearchQuery(query);
  return weights.primary.some(tag =>
    tag.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes(tag.toLowerCase())
  );
}

// Helper function to check if a search query matches secondary tags
export function matchesSecondaryTags(query: string, weights: TagWeights): boolean {
  const normalizedQuery = normalizeSearchQuery(query);
  return weights.secondary.some(tag =>
    tag.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes(tag.toLowerCase())
  );
}

// Calculate match score (higher = better match)
// Returns: 100 for primary match, 50 for secondary match, 0 for no match
export function calculateTagMatchScore(query: string, weights: TagWeights): number {
  if (matchesPrimaryTags(query, weights)) {
    return 100;
  }
  if (matchesSecondaryTags(query, weights)) {
    return 50;
  }
  return 0;
}

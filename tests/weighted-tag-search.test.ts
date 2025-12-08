/**
 * Weighted Tag Search Test Examples
 *
 * This file demonstrates how the weighted tag system works
 * and provides test cases to validate search behavior.
 */

import {
  getChainTagWeights,
  calculateTagMatchScore,
  matchesPrimaryTags,
  matchesSecondaryTags
} from '../lib/tag-weights.js';

// Test cases showing expected behavior
const TEST_CASES = [
  // === GENKI SUSHI EXAMPLES ===
  {
    brand: 'genki-sushi',
    query: 'sushi',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Sushi is a PRIMARY tag - Genki Sushi is KNOWN FOR sushi'
  },
  {
    brand: 'genki-sushi',
    query: 'japanese',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Japanese is a PRIMARY tag - main cuisine type'
  },
  {
    brand: 'genki-sushi',
    query: 'seafood',
    expected: {
      primaryMatch: false,
      secondaryMatch: false,
      score: 0,
      shouldAppearInSearch: false
    },
    reason: 'Seafood is NOT in tags - prevents false positive (sushi has seafood but not known for "seafood")'
  },
  {
    brand: 'genki-sushi',
    query: 'salmon',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Salmon is SECONDARY tag - they have it but not known for it. Should NOT appear in search (score 50 excluded)'
  },

  // === MCDONALD'S EXAMPLES ===
  {
    brand: 'mcdonald',
    query: 'burger',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Burger is PRIMARY tag - McDonald\'s is KNOWN FOR burgers'
  },
  {
    brand: 'mcdonald',
    query: 'mcspicy',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'McSpicy is PRIMARY tag - signature menu item'
  },
  {
    brand: 'mcdonald',
    query: 'chicken',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Chicken is SECONDARY - they have it (McNuggets, McSpicy) but search should use specific items instead'
  },
  {
    brand: 'mcdonald',
    query: 'coffee',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Coffee is SECONDARY - not what McDonald\'s is famous for'
  },

  // === KFC EXAMPLES ===
  {
    brand: 'kfc',
    query: 'fried chicken',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Fried chicken is PRIMARY - KFC is KNOWN FOR fried chicken'
  },
  {
    brand: 'kfc',
    query: 'chicken',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Chicken is PRIMARY for KFC (unlike McDonald\'s where it\'s secondary)'
  },
  {
    brand: 'kfc',
    query: 'zinger',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Zinger is PRIMARY - signature menu item'
  },
  {
    brand: 'kfc',
    query: 'burger',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Burger is SECONDARY - KFC has burgers but not known for them'
  },

  // === DIN TAI FUNG EXAMPLES ===
  {
    brand: 'din-tai-fung',
    query: 'xiao long bao',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'XLB is PRIMARY - Din Tai Fung is FAMOUS for xiao long bao'
  },
  {
    brand: 'din-tai-fung',
    query: 'dumplings',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Dumplings is PRIMARY - main offering'
  },
  {
    brand: 'din-tai-fung',
    query: 'dim sum',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Dim sum is PRIMARY - core category'
  },
  {
    brand: 'din-tai-fung',
    query: 'fried rice',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Fried rice is SECONDARY - they have it but not known for it'
  },
  {
    brand: 'din-tai-fung',
    query: 'chinese',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Chinese is SECONDARY - too generic, use specific tags like "taiwanese" or "dim sum"'
  },

  // === BUBBLE TEA EXAMPLES ===
  {
    brand: 'koi',
    query: 'bubble tea',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Bubble tea is PRIMARY - KOI is KNOWN FOR bubble tea'
  },
  {
    brand: 'koi',
    query: 'boba',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Boba is PRIMARY - same as bubble tea'
  },
  {
    brand: 'koi',
    query: 'milk tea',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Milk tea is PRIMARY - signature offering'
  },
  {
    brand: 'koi',
    query: 'drinks',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Drinks is SECONDARY - too generic'
  },

  // === TIGER SUGAR EXAMPLES ===
  {
    brand: 'tiger-sugar',
    query: 'brown sugar',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Brown sugar is PRIMARY - Tiger Sugar is FAMOUS for brown sugar boba'
  },
  {
    brand: 'tiger-sugar',
    query: 'tiger stripes',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Tiger stripes is PRIMARY - signature visual element'
  },

  // === HAIDILAO EXAMPLES ===
  {
    brand: 'haidilao',
    query: 'hotpot',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Hotpot is PRIMARY - Haidilao is KNOWN FOR hotpot'
  },
  {
    brand: 'haidilao',
    query: 'steamboat',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Steamboat is PRIMARY - same as hotpot in Singapore context'
  },
  {
    brand: 'haidilao',
    query: 'mala',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Mala is PRIMARY - signature soup base'
  },
  {
    brand: 'haidilao',
    query: 'beef',
    expected: {
      primaryMatch: false,
      secondaryMatch: true,
      score: 50,
      shouldAppearInSearch: false
    },
    reason: 'Beef is SECONDARY - they serve it but it\'s an ingredient, not what they\'re known for'
  },

  // === LOCAL KOPITIAM EXAMPLES ===
  {
    brand: 'ya-kun',
    query: 'kaya toast',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Kaya toast is PRIMARY - Ya Kun is FAMOUS for kaya toast'
  },
  {
    brand: 'ya-kun',
    query: 'kopi',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Kopi is PRIMARY - traditional Singapore coffee'
  },
  {
    brand: 'ya-kun',
    query: 'breakfast',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Breakfast is PRIMARY - Ya Kun is known for breakfast'
  },
  {
    brand: 'old-chang-kee',
    query: 'curry puff',
    expected: {
      primaryMatch: true,
      secondaryMatch: false,
      score: 100,
      shouldAppearInSearch: true
    },
    reason: 'Curry puff is PRIMARY - Old Chang Kee signature item'
  },
];

// Run tests
function runTests() {
  console.log('🧪 WEIGHTED TAG SEARCH TEST SUITE\n');
  console.log('=' .repeat(80));

  let passCount = 0;
  let failCount = 0;

  TEST_CASES.forEach((testCase, index) => {
    const weights = getChainTagWeights(testCase.brand);
    const isPrimary = matchesPrimaryTags(testCase.query, weights);
    const isSecondary = matchesSecondaryTags(testCase.query, weights);
    const score = calculateTagMatchScore(testCase.query, weights);

    const shouldAppear = score === 100; // Only primary matches appear

    const passed =
      isPrimary === testCase.expected.primaryMatch &&
      isSecondary === testCase.expected.secondaryMatch &&
      score === testCase.expected.score &&
      shouldAppear === testCase.expected.shouldAppearInSearch;

    if (passed) {
      passCount++;
    } else {
      failCount++;
    }

    console.log(`\nTest ${index + 1}: ${testCase.brand.toUpperCase()} - "${testCase.query}"`);
    console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Reason: ${testCase.reason}`);
    console.log(`Expected: Primary=${testCase.expected.primaryMatch}, Secondary=${testCase.expected.secondaryMatch}, Score=${testCase.expected.score}, Appears=${testCase.expected.shouldAppearInSearch}`);
    console.log(`Actual:   Primary=${isPrimary}, Secondary=${isSecondary}, Score=${score}, Appears=${shouldAppear}`);

    if (!passed) {
      console.log('⚠️  MISMATCH DETECTED');
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 TEST SUMMARY: ${passCount} passed, ${failCount} failed out of ${TEST_CASES.length} tests`);
  console.log(`Success rate: ${((passCount / TEST_CASES.length) * 100).toFixed(1)}%\n`);
}

// Quick reference guide
function printQuickReference() {
  console.log('\n📚 QUICK REFERENCE GUIDE\n');
  console.log('=' .repeat(80));
  console.log('\nPRIMARY TAGS (Score 100) - KNOWN FOR:');
  console.log('  • What the brand is FAMOUS for');
  console.log('  • Main identity and core offerings');
  console.log('  • Signature menu items');
  console.log('  • ✅ WILL appear in search results');

  console.log('\nSECONDARY TAGS (Score 50) - HAS IT:');
  console.log('  • Available but not famous for it');
  console.log('  • Supporting items or generic categories');
  console.log('  • Ingredients vs dishes');
  console.log('  • ❌ WILL NOT appear in search results');

  console.log('\nNO MATCH (Score 0):');
  console.log('  • Not in either primary or secondary tags');
  console.log('  • ❌ WILL NOT appear in search results');

  console.log('\nSEARCH LOGIC:');
  console.log('  • Only brands with score = 100 (PRIMARY match) appear in results');
  console.log('  • Score = 50 (SECONDARY match) are excluded to prevent false positives');
  console.log('  • Score = 0 (NO match) are excluded');

  console.log('\nEXAMPLES:');
  console.log('  Search "sushi"    → Genki Sushi ✅ (primary)');
  console.log('  Search "salmon"   → Genki Sushi ❌ (secondary - excluded)');
  console.log('  Search "chicken"  → KFC ✅ (primary), McDonald\'s ❌ (secondary)');
  console.log('  Search "burger"   → McDonald\'s ✅ (primary), KFC ❌ (secondary)');
  console.log('  Search "hotpot"   → Haidilao ✅ (primary)');
  console.log('  Search "beef"     → Haidilao ❌ (secondary - excluded)\n');
  console.log('=' .repeat(80));
}

// Export for use in actual tests
export { TEST_CASES, runTests, printQuickReference };

// Run if executed directly
if (require.main === module) {
  printQuickReference();
  runTests();
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

// Price ranges based on restaurant type (min, max)
const priceRanges = {
  // Specific restaurant names with known prices
  'Alice Boulangerie': { min: 10, max: 25 },
  'Amò': { min: 35, max: 80 },
  'Apartment Coffee': { min: 10, max: 20 },
  'Artichoke': { min: 30, max: 60 },
  'Asia Grand Restaurant': { min: 30, max: 80 },
  'Bacha Coffee': { min: 15, max: 35 },
  'Bakalaki Greek Taverna': { min: 30, max: 60 },
  'Beans & Cream': { min: 8, max: 18 },
  'Beppu Menkan': { min: 12, max: 25 },
  'Birds Of A Feather': { min: 25, max: 50 },
  'Birds Of Paradise Gelato Boutique': { min: 6, max: 15 },
  'Bloom Artisan': { min: 6, max: 15 },
  'British Indian Curry Hut': { min: 10, max: 20 },
  'Caffe Cicheti': { min: 20, max: 45 },
  'Cenzo': { min: 30, max: 70 },
  'Chagee': { min: 5, max: 12 },
  'Charim Korean BBQ': { min: 25, max: 50 },
  'ChaTraMue': { min: 4, max: 10 },
  'CheongDamChae': { min: 30, max: 60 },
  'Cheval Chi Bao': { min: 15, max: 35 },
  'CHICHA San Chen': { min: 5, max: 12 },
  'Chuan Kee Seafood': { min: 25, max: 60 },
  'Cicheti': { min: 25, max: 50 },
  'DDSD': { min: 5, max: 12 },
  'Denzy Gelato': { min: 5, max: 12 },
  'Dian Din Leluk': { min: 10, max: 25 },
  'Eee Mo BBQ': { min: 25, max: 50 },
  'En Sushi': { min: 20, max: 45 },
  'FairPrice Finest': { min: 8, max: 20 },
  'Fu Lin Bar & Kitchen': { min: 20, max: 45 },
  'Gamtan SG': { min: 15, max: 35 },
  'Gelato Messina': { min: 6, max: 15 },
  'George Town Tze Char': { min: 15, max: 40 },
  'Go Ba': { min: 15, max: 30 },
  'Guiga Korean BBQ Restaurant': { min: 25, max: 55 },
  'Guilt': { min: 8, max: 18 },
  'Gwangjang Gaon': { min: 20, max: 45 },
  'Harry\'s Eurasian Pies': { min: 5, max: 12 },
  'Heng': { min: 40, max: 100 },
  'Hollin': { min: 5, max: 12 },
  'Homm Dessert': { min: 6, max: 15 },
  'Hopscotch': { min: 15, max: 35 },
  'Hua Yu Wee Seafood Restaurant': { min: 25, max: 60 },
  'Indocafe The White House': { min: 20, max: 45 },
  'Jia He Chinese Restaurant': { min: 25, max: 55 },
  'Jia Xiang Economic Curry Rice': { min: 5, max: 12 },
  'Jypsy One Fullerton': { min: 25, max: 50 },
  'Kafe Utu': { min: 15, max: 30 },
  'Kai Xin Crabs': { min: 30, max: 80 },
  'Keng Eng Kee': { min: 15, max: 40 },
  'Kotuwa': { min: 12, max: 25 },
  'Kremi': { min: 15, max: 35 },
  'Kulto': { min: 20, max: 45 },
  'Kungfu JB Pau': { min: 3, max: 8 },
  'L\'antica Pizzeria da Michele': { min: 20, max: 45 },
  'Lagnaa Barefoot Dining': { min: 25, max: 55 },
  'Little Farms Katong Point Bistro': { min: 15, max: 35 },
  'Maison Sucree': { min: 10, max: 25 },
  'Masizzim': { min: 12, max: 25 },
  'Mitsuba': { min: 35, max: 60 },
  'MoVida': { min: 30, max: 70 },
  'Mr. Sun Tea': { min: 5, max: 12 },
  'Naga House': { min: 15, max: 35 },
  'No Horse Run': { min: 12, max: 25 },
  'Oatla': { min: 5, max: 12 },
  'Omma Korean Charcoal BBQ': { min: 30, max: 55 },
  'Open Farm Community': { min: 35, max: 70 },
  'Partage Patisserie': { min: 8, max: 18 },
  'Peony Jade': { min: 35, max: 70 },
  'Picanhas\'': { min: 35, max: 70 },
  'Pierre Herme Singapore': { min: 10, max: 25 },
  'Pizza Studio Tamaki (PST)': { min: 20, max: 40 },
  'Ponggol Nasi Lemak': { min: 5, max: 12 },
  'Popo & Nana\'s Delights': { min: 5, max: 12 },
  'Por Kee Eating House 1996': { min: 15, max: 40 },
  'PS. Cafe Katong': { min: 20, max: 45 },
  'PUJIM BBQ': { min: 25, max: 50 },
  'Rappu': { min: 15, max: 35 },
  'Rasa Istimewa Waterfront Restaurant': { min: 25, max: 60 },
  'Raw Kitchen Bar': { min: 20, max: 45 },
  'Rempapa': { min: 15, max: 35 },
  'Sakedokoro Eizaburo': { min: 40, max: 80 },
  'Sen': { min: 20, max: 45 },
  'Shaburi And Kintan Buffet': { min: 35, max: 55 },
  'Shin Minori Japanese Restaurant': { min: 30, max: 55 },
  'Shin Yuu Japanese Restaurant': { min: 30, max: 55 },
  'Siri House': { min: 25, max: 55 },
  'SLUSHYAH': { min: 5, max: 12 },
  'Social Place': { min: 20, max: 45 },
  'SODENG Korean Restaurant': { min: 20, max: 45 },
  'Soft Spot': { min: 8, max: 18 },
  'SOT Korean Restaurant': { min: 20, max: 45 },
  'Soulfood Catering': { min: 8, max: 15 },
  'Spring Court': { min: 30, max: 60 },
  'Super Star K': { min: 20, max: 45 },
  'Supulae Korean BBQ': { min: 25, max: 50 },
  'Surrey Hills Grocer': { min: 15, max: 35 },
  'Thai Express': { min: 12, max: 25 },
  'The Blue Ginger': { min: 25, max: 50 },
  'The Coastal Settlement': { min: 20, max: 45 },
  'The Masses': { min: 25, max: 55 },
  'The Providore': { min: 15, max: 35 },
  'The Summerhouse': { min: 30, max: 65 },
  'Tipsy Bird Gastrobar': { min: 20, max: 45 },
  'Todamgol Restaurant': { min: 15, max: 35 },
  'Toku Nori': { min: 20, max: 45 },
  'Torasho Ramen And Charcoal Bar': { min: 15, max: 30 },
  'Um Yong Baek': { min: 25, max: 50 },
  'Ume San 100': { min: 20, max: 45 },
  'Un-Yang Kor-Dai': { min: 25, max: 55 },
  'Venchi': { min: 8, max: 20 },
  'Violet Oon Singapore': { min: 25, max: 55 },
  'Wah Lok Cantonese Restaurant': { min: 35, max: 70 },
  'Wala Wala Cafe': { min: 15, max: 35 },
  'Wang Dae Bak': { min: 25, max: 50 },
  'Wee Nam Kee': { min: 8, max: 18 },
  'Wo Wo Dian': { min: 20, max: 45 },
  'Xin Ban Mian': { min: 5, max: 12 },
  'Xin Cuisine Chinese Restaurant': { min: 35, max: 70 },
  'Y.R.A Rasool Fatimah': { min: 5, max: 12 },
  'Ya Kat Yan': { min: 10, max: 25 },
  'Yakiniku': { min: 35, max: 60 },
  'Yakiniku Gyubei': { min: 80, max: 180 },
  'Yanxi Palace Steamboat': { min: 30, max: 55 },
  'Yo-Chi Singapore': { min: 6, max: 15 },
  'Yoajung Cafe': { min: 12, max: 25 },
  'Yuen Yueng': { min: 10, max: 25 },
  'YUN NANS Stonepot Fish': { min: 20, max: 45 },
  'Yusoff Haji Jalal aka Satay Club': { min: 8, max: 18 },
  'Zi Yean Bistro': { min: 25, max: 55 },
};

// Fallback based on tags
const tagPrices = {
  'Omakase': { min: 80, max: 180 },
  'Michelin': { min: 35, max: 80 },
  'Buffet': { min: 30, max: 55 },
  'BBQ': { min: 25, max: 50 },
  'Korean': { min: 20, max: 45 },
  'Japanese': { min: 18, max: 40 },
  'Restaurant': { min: 20, max: 45 },
  'Dim Sum': { min: 25, max: 50 },
  'Chinese': { min: 20, max: 45 },
  'Peranakan': { min: 20, max: 45 },
  'Western': { min: 20, max: 45 },
  'Indian': { min: 12, max: 30 },
  'Thai': { min: 12, max: 28 },
  'Cafe': { min: 10, max: 25 },
  'Dessert': { min: 5, max: 15 },
  'Desserts': { min: 5, max: 15 },
  'Hawker': { min: 5, max: 12 },
  'Bar': { min: 15, max: 35 },
};

function getPriceRange(name, tags) {
  // Check exact name match first
  for (const [key, range] of Object.entries(priceRanges)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return range;
    }
  }

  // Fallback to tag-based pricing
  if (tags && tags.length > 0) {
    // Priority order for tags
    const priorityTags = ['Omakase', 'Michelin', 'Buffet', 'BBQ', 'Korean', 'Japanese', 'Restaurant', 'Dim Sum', 'Chinese', 'Peranakan', 'Western', 'Indian', 'Thai', 'Cafe', 'Dessert', 'Desserts', 'Hawker', 'Bar'];

    for (const tag of priorityTags) {
      if (tags.includes(tag)) {
        return tagPrices[tag];
      }
    }
  }

  // Default fallback
  return { min: 15, max: 35 };
}

async function main() {
  const { data: withPrices } = await supabase
    .from('listing_prices')
    .select('listing_id');

  const listingsWithPrices = new Set(withPrices?.map(p => p.listing_id) || []);

  const { data: allListings } = await supabase
    .from('food_listings')
    .select('id, name, tags')
    .order('name');

  if (!allListings) {
    console.error('Failed to fetch listings');
    return;
  }

  const withoutPrices = allListings.filter(l => !listingsWithPrices.has(l.id));
  console.log(`Processing ${withoutPrices.length} listings without prices...\n`);

  let updated = 0;
  let failed = 0;

  for (const listing of withoutPrices) {
    const range = getPriceRange(listing.name, listing.tags);
    const avgPrice = (range.min + range.max) / 2;

    const { error } = await supabase
      .from('listing_prices')
      .insert({
        listing_id: listing.id,
        item_name: 'Average Price',
        price: avgPrice,
        description: `Estimated price range: $${range.min} - $${range.max}`,
        is_signature: true
      });

    if (error) {
      console.log(`✗ ${listing.name}: ${error.message}`);
      failed++;
    } else {
      console.log(`✓ ${listing.name}: $${range.min} - $${range.max} (avg: $${avgPrice})`);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);

/**
 * Auto-tag mall_outlets based on their name and category
 * Assigns tags like "Japanese", "Korean", "Desserts", "Fast Food", etc.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tag rules based on name keywords
const TAG_RULES = {
  // Cuisine tags
  'Japanese': ['sushi', 'ramen', 'udon', 'soba', 'tempura', 'tonkatsu', 'donburi', 'yakitori', 'izakaya', 'bento', 'omakase', 'kaiseki', 'teppanyaki', 'yakiniku', 'gyudon', 'katsu', 'onigiri', 'takoyaki', 'okonomiyaki', 'genki', 'ichiban', 'sakae', 'ajisen', 'ippudo', 'marukame', 'sushiro', 'itacho', 'hokkaido', 'menbaka', 'santouka', 'keisuke', 'machida', 'yoshinoya', 'matsuya', 'sukiya', 'coco ichibanya', 'gyoza', 'unagi', 'shabu'],
  'Korean': ['korean', 'kbbq', 'bibimbap', 'bulgogi', 'kimchi', 'samgyeopsal', 'jjigae', 'tteokbokki', 'kimbap', 'bingsu', 'chimaek', 'seorae', 'daebak', 'hanjip', 'wang dae bak', 'bornga', 'masizzim', 'sbcd', 'chir chir', 'kyochon', 'bonchon', 'nene', 'bb.q', 'gogiyo', 'jinjja', 'seoul', 'gangnam', 'myeongdong', 'hanbing', 'manna'],
  'Chinese': ['chinese', 'dim sum', 'dimsum', 'cantonese', 'teochew', 'hokkien', 'hainanese', 'hakka', 'sichuan', 'szechuan', 'hunan', 'shanghainese', 'beijing', 'peking', 'wonton', 'char siew', 'roast duck', 'congee', 'bak kut teh', 'zi char', 'crystal jade', 'din tai fung', 'imperial treasure', 'paradise', 'putien', 'jumbo', 'tunglok', 'pu tien', 'hai di lao', 'haidilao', 'hot pot', 'hotpot', 'steamboat', 'xiao long bao', 'soup dumpling'],
  'Thai': ['thai', 'tom yum', 'pad thai', 'green curry', 'basil chicken', 'mango sticky', 'som tam', 'boat noodles', 'mookata', 'nara', 'jim thompson', 'coca', 'sanook', 'siam'],
  'Vietnamese': ['vietnamese', 'pho', 'banh mi', 'bun', 'spring roll', 'bo kho', 'com tam', 'viet'],
  'Indian': ['indian', 'curry', 'biryani', 'tandoori', 'naan', 'roti', 'prata', 'thosai', 'dosa', 'masala', 'tikka', 'dal', 'paneer', 'chapati', 'muthu', 'banana leaf', 'komala'],
  'Malay': ['malay', 'nasi lemak', 'rendang', 'satay', 'laksa', 'mee siam', 'mee rebus', 'lontong', 'nasi padang', 'ayam penyet', 'sambal', 'kampong', 'warong', 'hjh maimunah'],
  'Western': ['western', 'steak', 'burger', 'pasta', 'pizza', 'salad', 'grilled', 'astons', 'collin', 'jack\'s place', 'marmalade', 'wild honey', 'eggs', 'brunch', 'outback', 'tony roma', 'morton', 'lawry', 'cut', 'burnt ends'],
  'Italian': ['italian', 'pasta', 'pizza', 'risotto', 'lasagna', 'tiramisu', 'gelato', 'trattoria', 'osteria', 'saizeriya', 'pastamania', 'peperoni'],
  'Mexican': ['mexican', 'tacos', 'burrito', 'quesadilla', 'nachos', 'guacamole', 'guzman', 'muchachos', 'stuffd'],

  // Food type tags
  'Fast Food': ['mcdonald', 'kfc', 'burger king', 'jollibee', 'mos burger', 'subway', 'pizza hut', 'domino', 'popeyes', 'wendy', 'taco bell', 'carl\'s jr', 'a&w', 'long john', '4fingers', 'wingstop', 'shake shack', 'five guys', 'texas chicken'],
  'Cafe': ['cafe', 'coffee', 'starbucks', 'toast box', 'ya kun', 'fun toast', 'wang cafe', 'killiney', 'old town', 'the coffee bean', 'costa', 'joe & dough', 'common man', 'apartment', 'creamier', 'lola\'s', 'tiong bahru bakery', 'cedele', 'oriole', 'plain vanilla'],
  'Bakery': ['bakery', 'bread', 'baguette', 'croissant', 'pastry', 'cake shop', 'polar', 'bengawan', 'breadtalk', 'barcook', 'paris baguette', 'tous les jours', 'delifrance', 'four leaves', 'baker', 'patisserie'],
  'Desserts': ['dessert', 'ice cream', 'gelato', 'waffle', 'pancake', 'donut', 'doughnut', 'krispy kreme', 'dunkin', 'llao llao', 'yolé', 'mr bean', 'nine fresh', 'chateraise', 'awfully chocolate', 'lady m', 'henri charpentier', 'ah chew', 'mei heong yuen', 'sweet talk', 'blackball', 'tim ho wan'],
  'Bubble Tea': ['bubble tea', 'boba', 'koi', 'gong cha', 'liho', 'tiger sugar', 'r&b', 'each a cup', 'playmade', 'partea', 'chicha san chen', 'heytea', 'chagee', 'the alley', 'coco', 'tealive', 'don don donki', 'itea'],
  'Seafood': ['seafood', 'fish', 'crab', 'prawn', 'lobster', 'oyster', 'jumbo', 'no signboard', 'long beach', 'mellben', 'red house', 'palm beach', 'uncle leong', 'dancing crab', 'manhattan fish'],
  'Vegetarian': ['vegetarian', 'vegan', 'veggie', 'plant based', 'greendot', 'loving hut', 'whole earth', 'real food'],
  'Halal': ['halal', 'muslim', 'encik tan', 'arnold\'s', 'stuff\'d', 'gelare'],

  // Special categories
  'Hawker': ['hawker', 'food court', 'kopitiam', 'coffee shop', 'food republic', 'food junction', 'koufu', 'kopitiam'],
  'Fine Dining': ['fine dining', 'michelin', 'omakase', 'les amis', 'odette', 'zen', 'burnt ends', 'corner house', 'jaan'],
  'Buffet': ['buffet', 'all you can eat', 'unlimited', 'carousel', 'edge', 'lime'],
};

function getTagsForOutlet(name, category) {
  const tags = new Set();
  const nameLower = name.toLowerCase();
  const categoryLower = (category || '').toLowerCase();

  // Check name against all tag rules
  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        tags.add(tag);
        break;
      }
    }
  }

  // Also infer from category
  if (categoryLower.includes('japanese')) tags.add('Japanese');
  if (categoryLower.includes('korean')) tags.add('Korean');
  if (categoryLower.includes('chinese')) tags.add('Chinese');
  if (categoryLower.includes('thai')) tags.add('Thai');
  if (categoryLower.includes('vietnamese')) tags.add('Vietnamese');
  if (categoryLower.includes('indian')) tags.add('Indian');
  if (categoryLower.includes('malay')) tags.add('Malay');
  if (categoryLower.includes('western')) tags.add('Western');
  if (categoryLower.includes('italian')) tags.add('Italian');
  if (categoryLower.includes('fast food')) tags.add('Fast Food');
  if (categoryLower.includes('cafe')) tags.add('Cafe');
  if (categoryLower.includes('bakery')) tags.add('Bakery');
  if (categoryLower.includes('dessert')) tags.add('Desserts');

  return Array.from(tags);
}

async function autoTagOutlets() {
  console.log('=== Auto-tagging mall outlets ===\n');

  // Get all outlets
  let allOutlets = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('mall_outlets')
      .select('id, name, category, tags')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allOutlets = allOutlets.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`Total outlets: ${allOutlets.length}`);

  let updated = 0;
  let skipped = 0;
  let noTags = 0;

  for (const outlet of allOutlets) {
    const newTags = getTagsForOutlet(outlet.name, outlet.category);

    if (newTags.length === 0) {
      noTags++;
      continue;
    }

    // Merge with existing tags
    const existingTags = outlet.tags || [];
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    // Only update if tags changed
    if (JSON.stringify(mergedTags.sort()) === JSON.stringify(existingTags.sort())) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('mall_outlets')
      .update({ tags: mergedTags })
      .eq('id', outlet.id);

    if (!error) {
      updated++;
      if (updated <= 50) {
        console.log(`${outlet.name} -> [${mergedTags.join(', ')}]`);
      }
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no change): ${skipped}`);
  console.log(`No tags found: ${noTags}`);
}

autoTagOutlets();

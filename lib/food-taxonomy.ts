/**
 * SINGAPORE FOOD SEARCH TAXONOMY
 * Comprehensive mappings for food search functionality
 * Last updated: December 2025
 */

// ============================================
// FOOD SYNONYMS - Maps search terms to related terms
// ============================================
export const FOOD_SYNONYMS: Record<string, string[]> = {

  // ==========================================
  // COOKING METHODS
  // ==========================================
  'fried': ['fried chicken', 'fried rice', 'fried noodles', 'fried carrot cake', 'char kway teow', 'goreng', 'deep fried', 'stir fried', 'pan fried', 'tempura', 'karaage', 'youtiao', 'fried prawn', 'fried fish', 'fried bee hoon', 'fried hokkien mee', 'nasi goreng', 'mee goreng'],
  'fried food': ['fried chicken', 'fried rice', 'fried noodles', 'fried carrot cake', 'char kway teow', 'goreng', 'deep fried', 'tempura', 'karaage', 'youtiao', 'crispy', 'nuggets', 'wings'],
  'deep fried': ['fried chicken', 'tempura', 'karaage', 'youtiao', 'goreng pistang', 'fried prawn', 'crispy', 'nuggets'],
  'stir fried': ['fried rice', 'fried noodles', 'char kway teow', 'hor fun', 'fried bee hoon', 'fried hokkien mee', 'wok hei'],
  'pan fried': ['fried carrot cake', 'gyoza', 'dumpling', 'pancake'],
  'grilled': ['bbq', 'barbecue', 'grill', 'charcoal', 'satay', 'yakitori', 'yakiniku', 'korean bbq', 'robatayaki', 'char siew', 'roasted'],
  'bbq': ['barbecue', 'grill', 'grilled', 'charcoal', 'satay', 'korean bbq', 'yakiniku', 'smoked', 'ribs'],
  'barbecue': ['bbq', 'grill', 'grilled', 'charcoal', 'satay', 'korean bbq', 'yakiniku', 'smoked'],
  'roasted': ['roast', 'char siew', 'sio bak', 'roast duck', 'roast chicken', 'roast pork', 'hainanese chicken'],
  'roast': ['roasted', 'char siew', 'sio bak', 'roast duck', 'roast chicken', 'roast pork'],
  'steamed': ['steam', 'dim sum', 'dumpling', 'bao', 'pau', 'siew mai', 'har gow', 'chee cheong fun', 'steamed fish', 'steamed rice'],
  'steam': ['steamed', 'dim sum', 'dumpling', 'bao', 'pau'],
  'braised': ['braise', 'lor mee', 'lor bak', 'stewed', 'slow cooked', 'tau pok'],
  'baked': ['bakery', 'bread', 'pastry', 'cake', 'pie', 'tart', 'oven'],
  'raw': ['sashimi', 'sushi', 'poke', 'tartare', 'ceviche', 'fresh'],
  'smoked': ['bbq', 'smoked salmon', 'smoked duck', 'smoked meat'],
  'boiled': ['soup', 'broth', 'blanched'],
  'soupy': ['soup', 'broth', 'gravy', 'curry', 'laksa', 'mee soto', 'bak kut teh'],

  // ==========================================
  // DIETARY / RELIGIOUS
  // ==========================================
  'halal': ['muslim', 'malay', 'indonesian', 'middle eastern', 'turkish', 'arab', 'nasi', 'mee', 'ayam', 'rendang', 'satay', 'murtabak', 'prata', 'biryani', 'nasi padang', 'nasi lemak', 'indian muslim'],
  'muslim': ['halal', 'malay', 'indonesian', 'middle eastern', 'nasi padang', 'nasi lemak', 'murtabak', 'indian muslim'],
  'vegetarian': ['vegan', 'veggie', 'meatless', 'plant based', 'plant-based', 'vegetable', 'tofu', 'tempeh', 'mock meat', 'buddhist'],
  'vegan': ['vegetarian', 'plant based', 'plant-based', 'meatless', 'dairy free'],
  'healthy': ['salad', 'vegetarian', 'vegan', 'grain bowl', 'acai', 'smoothie', 'poke', 'clean eating', 'low carb', 'keto'],
  'organic': ['healthy', 'natural', 'farm to table'],
  'gluten free': ['gluten-free', 'celiac', 'rice', 'rice noodles'],
  'dairy free': ['vegan', 'lactose free', 'non dairy'],
  'kosher': ['jewish'],
  'jain': ['vegetarian', 'no onion', 'no garlic'],

  // ==========================================
  // CUISINE TYPES - ASIAN
  // ==========================================
  // Chinese
  'chinese': ['cantonese', 'teochew', 'hokkien', 'hainanese', 'hakka', 'sichuan', 'szechuan', 'hunan', 'shanghainese', 'beijing', 'dim sum', 'chinese food', 'zi char', 'wonton', 'char siew', 'roast duck', 'congee', 'fried rice', 'noodles'],
  'cantonese': ['chinese', 'dim sum', 'char siew', 'roast duck', 'roast pork', 'wonton', 'congee', 'hong kong', 'hk'],
  'teochew': ['chinese', 'teochew porridge', 'braised duck', 'fishball', 'bak chor mee', 'orh nee'],
  'hokkien': ['chinese', 'hokkien mee', 'prawn noodles', 'bak kut teh', 'popiah'],
  'hainanese': ['chinese', 'hainanese chicken rice', 'chicken rice', 'kaya toast', 'hainanese pork chop'],
  'hakka': ['chinese', 'yong tau foo', 'stuffed tofu', 'abacus seeds', 'thunder tea rice', 'lei cha'],
  'sichuan': ['szechuan', 'chinese', 'spicy', 'mala', 'hot pot', 'mapo tofu', 'dan dan noodles', 'kung pao'],
  'szechuan': ['sichuan', 'chinese', 'spicy', 'mala', 'hot pot', 'mapo tofu'],
  'hunan': ['chinese', 'spicy', 'xiang cuisine'],
  'shanghainese': ['chinese', 'shanghai', 'xiao long bao', 'soup dumpling', 'sheng jian bao', 'hairy crab'],
  'beijing': ['chinese', 'peking duck', 'peking', 'northern chinese', 'jianbing'],
  'hong kong': ['hk', 'cantonese', 'cha chaan teng', 'milk tea', 'egg waffle', 'dim sum', 'roast goose'],
  'hk': ['hong kong', 'cantonese', 'cha chaan teng'],
  'taiwanese': ['taiwan', 'bubble tea', 'boba', 'lu rou fan', 'beef noodles', 'fried chicken', 'gua bao', 'oyster omelette', 'xiao chi'],
  'taiwan': ['taiwanese', 'bubble tea', 'boba', 'lu rou fan'],

  // Malay & Indonesian
  'malay': ['halal', 'nasi lemak', 'rendang', 'satay', 'laksa', 'mee siam', 'mee rebus', 'lontong', 'nasi padang', 'ayam penyet', 'sambal', 'malay food', 'kampong', 'kampung'],
  'indonesian': ['halal', 'nasi padang', 'ayam penyet', 'bakso', 'soto', 'gado gado', 'rendang', 'nasi goreng', 'mie goreng', 'indonesian food', 'indomie', 'martabak'],
  'nasi padang': ['indonesian', 'malay', 'halal', 'padang', 'rendang', 'ayam pop'],
  'peranakan': ['nyonya', 'nonya', 'straits chinese', 'baba', 'laksa', 'ayam buah keluak', 'kueh', 'peranakan food'],
  'nyonya': ['peranakan', 'nonya', 'straits chinese', 'laksa'],
  'nonya': ['peranakan', 'nyonya', 'straits chinese'],

  // Indian
  'indian': ['north indian', 'south indian', 'indian food', 'curry', 'biryani', 'tandoori', 'naan', 'roti', 'prata', 'thosai', 'dosa', 'masala', 'tikka', 'dal', 'paneer', 'chapati', 'paratha'],
  'north indian': ['indian', 'tandoori', 'naan', 'biryani', 'butter chicken', 'tikka masala', 'paneer', 'dal makhani', 'kebab'],
  'south indian': ['indian', 'dosa', 'thosai', 'dosai', 'idli', 'uttapam', 'sambar', 'rasam', 'appam', 'vadai', 'banana leaf'],
  'indian muslim': ['halal', 'indian', 'biryani', 'murtabak', 'nasi briyani', 'sup kambing', 'roti john'],

  // Japanese
  'japanese': ['japan', 'sushi', 'sashimi', 'ramen', 'udon', 'soba', 'tempura', 'tonkatsu', 'donburi', 'don', 'yakitori', 'izakaya', 'bento', 'japanese food', 'omakase', 'kaiseki', 'teppanyaki', 'yakiniku', 'gyudon', 'katsu', 'onigiri', 'takoyaki', 'okonomiyaki'],
  'japan': ['japanese'],
  'omakase': ['japanese', 'sushi', 'sashimi', 'kaiseki', 'fine dining'],
  'kaiseki': ['japanese', 'omakase', 'fine dining', 'multi course'],
  'izakaya': ['japanese', 'yakitori', 'beer', 'bar snacks', 'sake'],

  // Korean
  'korean': ['korea', 'korean food', 'kbbq', 'korean bbq', 'fried chicken', 'bibimbap', 'bulgogi', 'kimchi', 'samgyeopsal', 'jjigae', 'tteokbokki', 'kimbap', 'soju', 'army stew', 'budae jjigae', 'bingsu', 'chimaek'],
  'korea': ['korean'],
  'kbbq': ['korean bbq', 'korean', 'samgyeopsal', 'bulgogi', 'grilled meat'],
  'korean bbq': ['kbbq', 'korean', 'samgyeopsal', 'bulgogi', 'yakiniku'],

  // Thai
  'thai': ['thailand', 'thai food', 'tom yum', 'pad thai', 'green curry', 'red curry', 'basil chicken', 'mango sticky rice', 'som tam', 'papaya salad', 'boat noodles', 'thai milk tea'],
  'thailand': ['thai'],

  // Vietnamese
  'vietnamese': ['vietnam', 'pho', 'banh mi', 'bun', 'spring roll', 'vietnamese food', 'bo kho', 'bun cha', 'com tam', 'goi cuon', 'banh cuon', 'vietnamese coffee', 'ca phe'],
  'vietnam': ['vietnamese'],

  // Other Asian
  'filipino': ['philippines', 'pinoy', 'adobo', 'sinigang', 'lechon', 'kare kare', 'sisig', 'halo halo'],
  'burmese': ['myanmar', 'mohinga', 'tea leaf salad', 'shan noodles'],
  'nepali': ['nepalese', 'momo', 'dal bhat', 'newari'],
  'tibetan': ['momo', 'thukpa'],

  // ==========================================
  // CUISINE TYPES - WESTERN & OTHERS
  // ==========================================
  'western': ['american', 'european', 'steak', 'burger', 'pasta', 'pizza', 'salad', 'brunch', 'western food', 'fish and chips', 'grilled chicken'],
  'american': ['western', 'burger', 'hot dog', 'bbq', 'ribs', 'wings', 'mac and cheese', 'southern'],
  'italian': ['pasta', 'pizza', 'risotto', 'lasagna', 'tiramisu', 'gelato', 'italian food', 'trattoria', 'osteria'],
  'french': ['bistro', 'brasserie', 'croissant', 'crepe', 'fine dining', 'french food', 'patisserie'],
  'spanish': ['tapas', 'paella', 'churros', 'spanish food'],
  'mexican': ['tacos', 'burrito', 'quesadilla', 'nachos', 'guacamole', 'mexican food', 'tex mex'],
  'mediterranean': ['greek', 'turkish', 'lebanese', 'hummus', 'falafel', 'kebab', 'shawarma', 'mezze'],
  'greek': ['mediterranean', 'gyros', 'souvlaki', 'tzatziki', 'greek salad'],
  'turkish': ['mediterranean', 'kebab', 'doner', 'pide', 'baklava', 'turkish food'],
  'lebanese': ['mediterranean', 'middle eastern', 'shawarma', 'falafel', 'hummus', 'tabbouleh'],
  'middle eastern': ['mediterranean', 'lebanese', 'turkish', 'arab', 'shawarma', 'falafel', 'hummus', 'kebab', 'halal'],
  'arab': ['middle eastern', 'halal', 'shawarma', 'hummus', 'arabic'],
  'british': ['english', 'fish and chips', 'english breakfast', 'pie', 'roast'],
  'german': ['sausage', 'schnitzel', 'pretzel', 'beer'],

  // ==========================================
  // DISH TYPES - RICE
  // ==========================================
  'rice': ['nasi', 'fan', 'gohan', 'fried rice', 'chicken rice', 'biryani', 'nasi lemak', 'nasi padang', 'claypot rice', 'rice bowl', 'donburi', 'bibimbap'],
  'nasi': ['rice', 'nasi lemak', 'nasi goreng', 'nasi padang', 'nasi briyani', 'nasi ayam', 'malay', 'halal'],
  'fried rice': ['nasi goreng', 'yang zhou', 'yangzhou', 'chinese fried rice', 'thai fried rice', 'rice'],
  'nasi goreng': ['fried rice', 'indonesian', 'malay', 'halal'],
  'chicken rice': ['hainanese chicken rice', 'hainanese', 'roast chicken rice', 'rice'],
  'hainanese chicken rice': ['chicken rice', 'hainanese'],
  'biryani': ['briyani', 'nasi briyani', 'indian', 'halal', 'rice'],
  'briyani': ['biryani', 'nasi briyani', 'indian', 'halal'],
  'nasi lemak': ['malay', 'halal', 'coconut rice', 'sambal', 'rice'],
  'claypot rice': ['chinese', 'claypot', 'rice'],
  'congee': ['porridge', 'jook', 'zhou', 'cantonese', 'rice porridge', 'teochew porridge'],
  'porridge': ['congee', 'jook', 'zhou', 'rice porridge'],

  // ==========================================
  // DISH TYPES - NOODLES
  // ==========================================
  'noodles': ['mee', 'mian', 'men', 'noodle', 'pasta', 'fried noodles', 'soup noodles', 'ramen', 'udon', 'soba', 'pho', 'laksa', 'bee hoon', 'kway teow'],
  'noodle': ['noodles', 'mee', 'mian'],
  'mee': ['noodles', 'mee goreng', 'hokkien mee', 'prawn mee', 'wanton mee', 'bak chor mee', 'mee siam', 'mee rebus', 'mee pok', 'mee sua'],
  'fried noodles': ['mee goreng', 'char kway teow', 'fried bee hoon', 'fried hokkien mee', 'pad thai', 'noodles'],
  'mee goreng': ['fried noodles', 'malay', 'indian', 'halal', 'noodles'],
  'hokkien mee': ['hokkien prawn mee', 'fried hokkien mee', 'prawn noodles', 'chinese', 'noodles'],
  'prawn mee': ['prawn noodles', 'har mee', 'hokkien', 'noodles'],
  'wanton mee': ['wonton noodles', 'wanton noodles', 'cantonese', 'noodles'],
  'wonton mee': ['wanton mee', 'wonton noodles', 'cantonese'],
  'bak chor mee': ['minced meat noodles', 'bcm', 'teochew', 'noodles'],
  'bcm': ['bak chor mee', 'minced meat noodles'],
  'laksa': ['curry laksa', 'katong laksa', 'assam laksa', 'nyonya', 'peranakan', 'noodles', 'soup'],
  'char kway teow': ['char kuay teow', 'ckt', 'fried kway teow', 'fried noodles', 'noodles'],
  'ckt': ['char kway teow', 'char kuay teow'],
  'kway teow': ['kuay teow', 'kwetiau', 'flat noodles', 'hor fun', 'noodles'],
  'kuay teow': ['kway teow', 'kwetiau', 'flat noodles'],
  'kwetiau': ['kway teow', 'kuay teow', 'flat noodles'],
  'hor fun': ['hor fan', 'flat noodles', 'kway teow', 'beef hor fun', 'noodles'],
  'bee hoon': ['vermicelli', 'rice noodles', 'mihun', 'bihun', 'noodles'],
  'vermicelli': ['bee hoon', 'rice noodles', 'mihun'],
  'ramen': ['japanese', 'noodles', 'soup noodles', 'tonkotsu', 'shoyu', 'miso', 'shio'],
  'udon': ['japanese', 'noodles', 'thick noodles'],
  'soba': ['japanese', 'noodles', 'buckwheat'],
  'pho': ['vietnamese', 'beef noodles', 'soup noodles', 'noodles'],
  'pad thai': ['thai', 'fried noodles', 'noodles'],
  'mee siam': ['malay', 'noodles', 'vermicelli', 'spicy'],
  'mee rebus': ['malay', 'noodles', 'gravy'],
  'mee pok': ['noodles', 'flat noodles', 'fishball'],
  'lor mee': ['braised noodles', 'gravy noodles', 'noodles'],
  'ban mian': ['ban meen', 'handmade noodles', 'noodles', 'chinese'],

  // ==========================================
  // DISH TYPES - SOUP
  // ==========================================
  'soup': ['broth', 'stew', 'soupy', 'bak kut teh', 'tom yum', 'pho', 'laksa', 'sup', 'mee soto'],
  'bak kut teh': ['pork ribs soup', 'bkt', 'hokkien', 'teochew', 'soup'],
  'bkt': ['bak kut teh', 'pork ribs soup'],
  'tom yum': ['tomyam', 'thai', 'spicy soup', 'soup', 'sour'],
  'tomyam': ['tom yum', 'thai', 'spicy soup'],
  'mee soto': ['soto', 'soup noodles', 'malay', 'halal'],
  'soto': ['mee soto', 'soto ayam', 'malay', 'indonesian', 'soup'],
  'sup kambing': ['mutton soup', 'halal', 'indian muslim', 'soup'],
  'sup tulang': ['bone marrow', 'halal', 'soup'],
  'fish soup': ['sliced fish soup', 'fish head', 'soup'],
  'sliced fish soup': ['fish soup', 'teochew'],

  // ==========================================
  // DISH TYPES - DIM SUM & DUMPLINGS
  // ==========================================
  'dim sum': ['dimsum', 'yum cha', 'cantonese', 'chinese', 'dumplings', 'har gow', 'siew mai', 'char siew bao', 'cheong fun', 'steamed'],
  'dimsum': ['dim sum', 'yum cha', 'cantonese'],
  'yum cha': ['dim sum', 'cantonese', 'tea'],
  'dumpling': ['dumplings', 'jiaozi', 'gyoza', 'xiao long bao', 'dim sum', 'momo', 'pierogi', 'wonton'],
  'dumplings': ['dumpling', 'jiaozi', 'gyoza', 'xiao long bao', 'dim sum', 'momo'],
  'xiao long bao': ['xlb', 'soup dumpling', 'shanghainese', 'dumpling'],
  'xlb': ['xiao long bao', 'soup dumpling'],
  'gyoza': ['japanese dumpling', 'japanese', 'dumpling'],
  'har gow': ['har gao', 'prawn dumpling', 'dim sum', 'cantonese'],
  'siew mai': ['siu mai', 'shaomai', 'pork dumpling', 'dim sum', 'cantonese'],
  'siu mai': ['siew mai', 'shaomai', 'pork dumpling'],
  'wonton': ['wanton', 'dumpling', 'cantonese'],
  'wanton': ['wonton', 'dumpling', 'cantonese'],

  // ==========================================
  // DISH TYPES - BREAD & CARBS
  // ==========================================
  'bread': ['toast', 'bun', 'bao', 'roti', 'naan', 'pita', 'baguette', 'croissant', 'sandwich', 'bakery'],
  'toast': ['bread', 'kaya toast', 'french toast'],
  'kaya toast': ['hainanese', 'breakfast', 'toast', 'coffee shop'],
  'roti': ['prata', 'roti prata', 'roti canai', 'indian', 'bread'],
  'prata': ['roti prata', 'roti canai', 'roti', 'indian', 'halal', 'bread'],
  'roti prata': ['prata', 'roti canai', 'roti', 'indian'],
  'naan': ['indian', 'bread', 'tandoori'],
  'bao': ['pau', 'bun', 'steamed bun', 'char siew bao', 'gua bao', 'chinese', 'bread'],
  'pau': ['bao', 'bun', 'steamed bun'],
  'murtabak': ['martabak', 'indian', 'malay', 'halal', 'stuffed pancake'],
  'martabak': ['murtabak', 'indonesian', 'sweet martabak'],
  'thosai': ['dosa', 'dosai', 'south indian', 'indian', 'crepe'],
  'dosa': ['thosai', 'dosai', 'south indian', 'indian'],
  'dosai': ['thosai', 'dosa', 'south indian'],
  'idli': ['south indian', 'indian', 'steamed'],
  'chapati': ['indian', 'bread', 'roti'],

  // ==========================================
  // DISH TYPES - MEAT
  // ==========================================
  'chicken': ['ayam', 'poultry', 'fried chicken', 'chicken rice', 'roast chicken', 'grilled chicken'],
  'ayam': ['chicken', 'malay', 'ayam penyet', 'ayam goreng'],
  'fried chicken': ['korean fried chicken', 'karaage', 'ayam goreng', 'chicken', 'wings'],
  'wings': ['chicken wings', 'buffalo wings', 'fried chicken'],
  'beef': ['steak', 'burger', 'rendang', 'beef noodles', 'bulgogi', 'wagyu'],
  'steak': ['beef', 'wagyu', 'ribeye', 'sirloin', 'grilled', 'western'],
  'wagyu': ['beef', 'steak', 'japanese', 'premium'],
  'pork': ['bak', 'char siew', 'sio bak', 'bacon', 'ham', 'tonkatsu', 'pork chop', 'pork ribs'],
  'bak': ['pork', 'bak kut teh', 'bak chor mee', 'sio bak'],
  'char siew': ['char siu', 'bbq pork', 'roast pork', 'cantonese', 'pork'],
  'char siu': ['char siew', 'bbq pork', 'roast pork'],
  'sio bak': ['roast pork', 'crispy pork', 'cantonese', 'pork'],
  'mutton': ['lamb', 'kambing', 'sup kambing', 'biryani'],
  'lamb': ['mutton', 'rack of lamb'],
  'duck': ['roast duck', 'peking duck', 'braised duck', 'teochew duck'],
  'roast duck': ['duck', 'cantonese', 'roasted'],

  // ==========================================
  // DISH TYPES - SEAFOOD
  // ==========================================
  'seafood': ['fish', 'prawn', 'crab', 'lobster', 'squid', 'oyster', 'clam', 'mussel', 'scallop', 'shellfish', 'sotong'],
  'fish': ['seafood', 'fish head', 'fish soup', 'grilled fish', 'steamed fish', 'fried fish', 'fish and chips'],
  'fish head': ['fish head curry', 'fish', 'curry'],
  'prawn': ['shrimp', 'har', 'udang', 'seafood', 'prawn noodles', 'cereal prawn'],
  'shrimp': ['prawn', 'har', 'seafood'],
  'crab': ['chilli crab', 'black pepper crab', 'salted egg crab', 'seafood', 'kepiting'],
  'chilli crab': ['chili crab', 'singapore chilli crab', 'crab', 'seafood'],
  'chili crab': ['chilli crab', 'singapore chilli crab', 'crab'],
  'lobster': ['seafood', 'premium'],
  'squid': ['sotong', 'calamari', 'seafood'],
  'sotong': ['squid', 'calamari', 'seafood'],
  'oyster': ['seafood', 'shellfish'],

  // ==========================================
  // MEAL TYPES
  // ==========================================
  'breakfast': ['brunch', 'morning', 'kaya toast', 'eggs', 'toast', 'cereal', 'pancakes', 'waffles', 'english breakfast', 'big breakfast', 'congee'],
  'brunch': ['breakfast', 'lunch', 'eggs benedict', 'pancakes', 'waffles', 'avocado toast', 'cafe'],
  'lunch': ['set lunch', 'bento', 'rice', 'noodles', 'cai fan', 'economy rice'],
  'dinner': ['supper', 'main course', 'set dinner'],
  'supper': ['late night', 'midnight', '24 hours', '24h', '24hr', 'after midnight', 'prata', 'murtabak', 'roti john'],
  'late night': ['supper', 'midnight', '24 hours', '24h', 'night owl', 'after midnight'],
  'midnight': ['supper', 'late night', '24 hours', '24h'],
  '24 hours': ['24h', '24hr', '24-hour', 'supper', 'late night', 'always open'],
  '24h': ['24 hours', '24hr', '24-hour', 'supper', 'late night'],
  'snack': ['snacks', 'light bite', 'finger food', 'appetizer'],
  'tea time': ['afternoon tea', 'high tea', 'teatime', 'snack', 'cake', 'pastry'],
  'high tea': ['afternoon tea', 'tea time', 'scones', 'sandwiches', 'cake'],

  // ==========================================
  // FOOD TYPES - FAST FOOD & CHAINS
  // ==========================================
  'fast food': ['mcdonald', 'mcdonalds', 'burger king', 'kfc', 'jollibee', 'mos burger', 'subway', 'pizza hut', 'dominos', 'popeyes', 'wendys', 'taco bell', 'burger', 'fried chicken'],
  'mcdonald': ['mcdonalds', 'mcd', 'macs', 'fast food', 'burger'],
  'mcdonalds': ['mcdonald', 'mcd', 'macs', 'fast food'],
  'mcd': ['mcdonald', 'mcdonalds', 'macs', 'fast food'],
  'kfc': ['kentucky fried chicken', 'fried chicken', 'fast food'],
  'burger': ['hamburger', 'cheeseburger', 'western', 'fast food', 'patty'],
  'pizza': ['pizzeria', 'italian', 'dominos', 'pizza hut', 'wood fired'],
  'sandwich': ['sub', 'subway', 'deli', 'bread'],
  'hotdog': ['hot dog', 'sausage', 'american'],
  'hot dog': ['hotdog', 'sausage', 'american'],

  // ==========================================
  // DESSERTS & SWEETS
  // ==========================================
  'dessert': ['desserts', 'sweet', 'cake', 'ice cream', 'gelato', 'pastry', 'pudding', 'tart', 'pie', 'donut', 'waffle', 'pancake', 'churros', 'mochi', 'bingsu'],
  'desserts': ['dessert', 'sweet', 'cake', 'ice cream'],
  'cake': ['cakes', 'bakery', 'birthday cake', 'cheesecake', 'chocolate cake', 'dessert', 'patisserie'],
  'cakes': ['cake', 'bakery', 'dessert'],
  'ice cream': ['gelato', 'sorbet', 'frozen', 'soft serve', 'dessert', 'ais krim'],
  'gelato': ['ice cream', 'italian', 'dessert'],
  'pastry': ['pastries', 'bakery', 'croissant', 'danish', 'tart', 'eclair', 'choux', 'patisserie'],
  'pastries': ['pastry', 'bakery', 'croissant'],
  'waffle': ['waffles', 'belgian waffle', 'dessert', 'breakfast'],
  'waffles': ['waffle', 'belgian waffle', 'dessert'],
  'pancake': ['pancakes', 'hotcake', 'souffle pancake', 'breakfast', 'dessert'],
  'pancakes': ['pancake', 'hotcake', 'breakfast'],
  'donut': ['doughnut', 'donuts', 'krispy kreme', 'dessert'],
  'doughnut': ['donut', 'donuts'],
  'kueh': ['kuih', 'nyonya kueh', 'peranakan', 'traditional', 'dessert', 'snack'],
  'kuih': ['kueh', 'nyonya kueh', 'peranakan'],
  'churros': ['spanish', 'dessert', 'fried'],
  'mochi': ['japanese', 'dessert', 'rice cake'],
  'bingsu': ['korean', 'shaved ice', 'dessert', 'patbingsu'],
  'cendol': ['chendol', 'dessert', 'malay', 'pandan', 'gula melaka'],
  'chendol': ['cendol', 'dessert', 'malay'],
  'ice kachang': ['ais kacang', 'shaved ice', 'dessert', 'local'],
  'ais kacang': ['ice kachang', 'shaved ice', 'dessert'],
  'tang yuan': ['glutinous rice ball', 'dessert', 'chinese'],
  'tau suan': ['dessert', 'chinese', 'mung bean'],
  'orh nee': ['yam paste', 'teochew', 'dessert', 'chinese'],
  'cheng tng': ['dessert', 'chinese', 'sweet soup'],
  'double skin milk': ['chinese dessert', 'cantonese', 'milk pudding'],

  // ==========================================
  // DRINKS & BEVERAGES
  // ==========================================
  'coffee': ['kopi', 'cafe', 'espresso', 'latte', 'cappuccino', 'americano', 'cold brew', 'coffee shop', 'kopitiam'],
  'kopi': ['coffee', 'local coffee', 'kopitiam', 'traditional'],
  'tea': ['teh', 'bubble tea', 'boba', 'milk tea', 'matcha', 'green tea', 'oolong', 'tea house'],
  'teh': ['tea', 'local tea', 'teh tarik', 'teh o', 'kopitiam'],
  'teh tarik': ['pulled tea', 'malay', 'halal', 'tea'],
  'bubble tea': ['boba', 'bbt', 'milk tea', 'pearl milk tea', 'taiwanese'],
  'boba': ['bubble tea', 'bbt', 'milk tea', 'pearl'],
  'bbt': ['bubble tea', 'boba', 'milk tea'],
  'milk tea': ['bubble tea', 'boba', 'teh c', 'hong kong milk tea'],
  'matcha': ['green tea', 'japanese', 'tea'],
  'juice': ['fresh juice', 'fruit juice', 'smoothie', 'acai'],
  'smoothie': ['juice', 'acai', 'fruit', 'healthy'],
  'beer': ['craft beer', 'alcohol', 'bar', 'pub', 'brewery'],
  'wine': ['alcohol', 'bar', 'wine bar'],
  'cocktail': ['cocktails', 'bar', 'alcohol', 'speakeasy', 'mixology'],
  'cocktails': ['cocktail', 'bar', 'alcohol'],
  'sake': ['japanese', 'alcohol', 'nihonshu'],
  'soju': ['korean', 'alcohol'],

  // ==========================================
  // ESTABLISHMENT TYPES
  // ==========================================
  'cafe': ['coffee', 'brunch', 'cake', 'pastry', 'espresso', 'latte', 'bistro'],
  'bakery': ['bread', 'pastry', 'cake', 'croissant', 'bun', 'patisserie'],
  'hawker': ['hawker centre', 'hawker center', 'food court', 'kopitiam', 'local', 'cheap', 'budget'],
  'hawker centre': ['hawker center', 'hawker', 'food court', 'local'],
  'hawker center': ['hawker centre', 'hawker', 'food court'],
  'food court': ['hawker', 'kopitiam', 'food hall'],
  'kopitiam': ['coffee shop', 'hawker', 'local', 'kopi', 'teh', 'traditional'],
  'coffee shop': ['kopitiam', 'hawker', 'local'],
  'restaurant': ['dining', 'eatery', 'fine dining', 'casual dining'],
  'fine dining': ['upscale', 'premium', 'michelin', 'omakase', 'degustation', 'tasting menu'],
  'casual dining': ['restaurant', 'family', 'mid range'],
  'bar': ['pub', 'beer', 'cocktail', 'wine bar', 'speakeasy', 'alcohol'],
  'pub': ['bar', 'beer', 'gastropub', 'british'],
  'bistro': ['cafe', 'french', 'casual'],
  'buffet': ['all you can eat', 'unlimited', 'smorgasbord', 'eat all you can'],
  'zi char': ['tze char', 'chinese', 'wok', 'stir fry', 'family style'],
  'tze char': ['zi char', 'chinese', 'wok'],
  'cai fan': ['cai png', 'economy rice', 'mixed rice', 'chinese', 'cheap'],
  'cai png': ['cai fan', 'economy rice', 'mixed rice'],
  'economy rice': ['cai fan', 'cai png', 'mixed rice', 'budget'],
  'yong tau foo': ['ytf', 'yong tau fu', 'hakka', 'stuffed tofu'],
  'ytf': ['yong tau foo', 'yong tau fu', 'hakka'],

  // ==========================================
  // PRICE INDICATORS
  // ==========================================
  'cheap': ['budget', 'affordable', 'value', 'inexpensive', 'hawker', 'economy'],
  'budget': ['cheap', 'affordable', 'value', 'inexpensive', 'hawker'],
  'affordable': ['cheap', 'budget', 'value', 'reasonable'],
  'expensive': ['premium', 'upscale', 'fine dining', 'luxury', 'high end'],
  'premium': ['expensive', 'upscale', 'fine dining', 'luxury', 'high end'],

  // ==========================================
  // CHARACTERISTICS
  // ==========================================
  'spicy': ['hot', 'chilli', 'chili', 'mala', 'sambal', 'pedas', 'tom yum', 'curry'],
  'hot': ['spicy', 'chilli', 'mala', 'warm'],
  'mala': ['sichuan', 'szechuan', 'spicy', 'numbing', 'hot pot'],
  'sour': ['asam', 'tom yum', 'vinegar', 'citrus'],
  'sweet': ['dessert', 'sugar', 'honey'],
  'savory': ['savoury', 'umami', 'salty'],
  'savoury': ['savory', 'umami', 'salty'],
  'crispy': ['crunchy', 'fried', 'deep fried'],
  'creamy': ['rich', 'smooth', 'cream'],

  // ==========================================
  // POPULAR SPECIFIC DISHES
  // ==========================================
  'satay': ['sate', 'grilled', 'skewer', 'malay', 'halal', 'peanut sauce'],
  'sate': ['satay', 'grilled', 'skewer'],
  'rendang': ['beef rendang', 'malay', 'indonesian', 'halal', 'curry'],
  'curry': ['kari', 'indian', 'thai curry', 'japanese curry', 'fish head curry', 'curry chicken', 'rendang'],
  'sambal': ['chilli', 'malay', 'indonesian', 'spicy'],
  'popiah': ['spring roll', 'fresh spring roll', 'hokkien', 'teochew'],
  'spring roll': ['popiah', 'egg roll', 'vietnamese spring roll', 'fried'],
  'carrot cake': ['chai tow kway', 'fried carrot cake', 'radish cake', 'local'],
  'chai tow kway': ['carrot cake', 'fried carrot cake', 'radish cake'],
  'rojak': ['salad', 'fruit rojak', 'indian rojak', 'local'],
  'otah': ['otak', 'fish cake', 'grilled', 'malay'],
  'otak': ['otah', 'fish cake', 'grilled'],
  'chee cheong fun': ['rice noodle roll', 'cheong fun', 'cantonese', 'dim sum'],
  'cheong fun': ['chee cheong fun', 'rice noodle roll'],
  'fishball': ['fish ball', 'fishball noodles', 'teochew'],
  'fish ball': ['fishball', 'fishball noodles'],
  'ngoh hiang': ['five spice roll', 'lor bak', 'hokkien'],
  'lor bak': ['ngoh hiang', 'five spice roll'],
  'oyster omelette': ['orh luak', 'or luak', 'fried oyster', 'teochew'],
  'orh luak': ['oyster omelette', 'or luak', 'fried oyster'],
  'pig organ soup': ['pork organ', 'innards'],
  'kway chap': ['kuay chap', 'braised', 'teochew', 'pork'],
  'kuay chap': ['kway chap', 'braised', 'teochew'],
  'thunder tea rice': ['lei cha', 'hakka', 'healthy', 'vegetarian'],
  'lei cha': ['thunder tea rice', 'hakka'],
  'soon kueh': ['bamboo shoot dumpling', 'teochew'],
  'png kueh': ['rice kueh', 'teochew'],
  'chwee kueh': ['water cake', 'steamed rice cake', 'teochew'],

  // ==========================================
  // COMMON TYPOS & VARIATIONS
  // ==========================================
  'biriyani': ['biryani', 'briyani', 'beriani'],
  'beriani': ['biryani', 'briyani', 'biriyani'],
  'tosai': ['thosai', 'dosa', 'dosai'],
  'kway tiao': ['kway teow', 'kuay teow', 'kwetiau'],
  'kuey teow': ['kway teow', 'kuay teow', 'kwetiau'],
  'teo chew': ['teochew', 'chaozhou', 'chiu chow'],
  'teo chu': ['teochew', 'chaozhou', 'chiu chow'],
  'chaozhou': ['teochew', 'chiu chow'],
  'chiu chow': ['teochew', 'chaozhou'],
  'hai nan': ['hainanese', 'hainan'],
  'hainan': ['hainanese'],
  'paranakan': ['peranakan', 'pernakan'],
  'pernakan': ['peranakan', 'paranakan'],
  'satey': ['satay', 'sate'],
  'laska': ['laksa'],
  'kopi tiam': ['kopitiam', 'coffee tiam'],
  'coffee tiam': ['kopitiam', 'kopi tiam'],
  'froyo': ['yogurt', 'yoghurt', 'frozen yogurt'],
  'yogurt': ['yoghurt', 'froyo'],
  'yoghurt': ['yogurt', 'froyo'],
  'barbeque': ['barbecue', 'bbq', 'bar-b-q'],
  'bar-b-q': ['barbecue', 'bbq', 'barbeque'],
};

// ============================================
// PLURALS - Maps singular to plural and vice versa
// ============================================
export const PLURALS: Record<string, string> = {
  'noodle': 'noodles',
  'noodles': 'noodle',
  'dumpling': 'dumplings',
  'dumplings': 'dumpling',
  'cake': 'cakes',
  'cakes': 'cake',
  'pastry': 'pastries',
  'pastries': 'pastry',
  'dessert': 'desserts',
  'desserts': 'dessert',
  'waffle': 'waffles',
  'waffles': 'waffle',
  'pancake': 'pancakes',
  'pancakes': 'pancake',
  'taco': 'tacos',
  'tacos': 'taco',
  'burger': 'burgers',
  'burgers': 'burger',
  'wing': 'wings',
  'wings': 'wing',
  'rib': 'ribs',
  'ribs': 'rib',
  'donut': 'donuts',
  'donuts': 'donut',
  'cookie': 'cookies',
  'cookies': 'cookie',
  'sandwich': 'sandwiches',
  'sandwiches': 'sandwich',
  'cocktail': 'cocktails',
  'cocktails': 'cocktail',
  'drink': 'drinks',
  'drinks': 'drink',
  'snack': 'snacks',
  'snacks': 'snack',
};

// ============================================
// DISH TERMS - Terms that should trigger name field search
// ============================================
export const DISH_TERMS: Set<string> = new Set([
  // Cooking methods
  'fried', 'grilled', 'steamed', 'roasted', 'braised', 'baked', 'bbq', 'barbecue',
  'deep fried', 'stir fried', 'pan fried', 'smoked', 'raw', 'boiled', 'soupy',

  // Rice dishes
  'rice', 'nasi', 'biryani', 'briyani', 'congee', 'porridge', 'fried rice',
  'chicken rice', 'claypot', 'bibimbap', 'donburi',

  // Noodle dishes
  'noodles', 'noodle', 'mee', 'mian', 'ramen', 'udon', 'soba', 'pho', 'laksa',
  'bee hoon', 'kway teow', 'hor fun', 'pad thai', 'pasta', 'spaghetti',

  // Specific dishes
  'chicken', 'beef', 'pork', 'fish', 'prawn', 'crab', 'duck', 'mutton', 'lamb',
  'curry', 'satay', 'rendang', 'soup', 'salad', 'burger', 'pizza', 'steak',
  'sushi', 'sashimi', 'dim sum', 'dumpling', 'bao', 'toast', 'bread',
  'waffle', 'pancake', 'cake', 'ice cream', 'gelato', 'coffee', 'tea',

  // Local dishes
  'char kway teow', 'hokkien mee', 'bak kut teh', 'rojak', 'popiah', 'otah',
  'carrot cake', 'chee cheong fun', 'fishball', 'yong tau foo', 'cai fan',

  // Descriptors that appear in names
  'special', 'signature', 'famous', 'original', 'traditional', 'authentic',
  'homemade', 'handmade', 'artisan',
]);

// ============================================
// VALID SHORT QUERIES - Short terms that should be allowed
// ============================================
export const VALID_SHORT_QUERIES: Set<string> = new Set([
  // Brand abbreviations
  'kfc', 'mcd', 'bbt', 'bbq', 'bcm', 'bkt', 'ckt', 'hk', 'xl', 'xlb', 'ytf',

  // Common short terms
  'dim', 'bao', 'pho', 'mee', 'tea', 'pie', 'sub', 'bar', 'pub', 'gin', 'rum',

  // Cuisines
  'thai', 'jap', 'kor', 'viet', 'indo', 'chi', 'ind',
]);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Expands a search query into all related terms
 */
export function expandQuery(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const terms = new Set<string>([normalizedQuery]);

  // Add direct synonyms
  if (FOOD_SYNONYMS[normalizedQuery]) {
    FOOD_SYNONYMS[normalizedQuery].forEach(term => terms.add(term));
  }

  // Add plural/singular variants
  if (PLURALS[normalizedQuery]) {
    terms.add(PLURALS[normalizedQuery]);
    // Also expand the plural/singular variant
    const variant = PLURALS[normalizedQuery];
    if (FOOD_SYNONYMS[variant]) {
      FOOD_SYNONYMS[variant].forEach(term => terms.add(term));
    }
  }

  // Check if query is part of a compound term
  Object.entries(FOOD_SYNONYMS).forEach(([key, values]) => {
    if (key.includes(normalizedQuery) || values.some(v => v.includes(normalizedQuery))) {
      terms.add(key);
      values.forEach(v => terms.add(v));
    }
  });

  return Array.from(terms);
}

/**
 * Checks if a term is a known food-related term
 */
export function isFoodTerm(term: string): boolean {
  const normalized = term.toLowerCase().trim();
  return FOOD_SYNONYMS.hasOwnProperty(normalized) ||
         DISH_TERMS.has(normalized) ||
         Object.values(FOOD_SYNONYMS).some(synonyms => synonyms.includes(normalized));
}

/**
 * Checks if a term should trigger name search
 */
export function shouldSearchByName(query: string): boolean {
  const words = query.toLowerCase().trim().split(/\s+/);
  return words.some(word => DISH_TERMS.has(word)) ||
         query.split(' ').length >= 2 ||
         /['']/.test(query);
}

/**
 * Validates if a short query should be allowed
 */
export function isValidShortQuery(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  return normalized.length >= 3 || VALID_SHORT_QUERIES.has(normalized);
}

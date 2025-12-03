// Michelin Guide Singapore 2025 - Complete Data
// Source: https://guide.michelin.com/en/article/michelin-guide-ceremony/full-list-michelin-guide-sg-2025
// Last updated: July 2025

export interface MichelinRestaurant {
  name: string;
  award: 'three-star' | 'two-star' | 'one-star' | 'bib-gourmand' | 'selected';
  tags: string[];
  is_hawker: boolean;
  source_url: string; // Leave empty - to be filled manually
}

export const michelinSingapore2025: MichelinRestaurant[] = [
  // ============================================
  // 3 MICHELIN STARS (3 restaurants)
  // ============================================
  { name: "Les Amis", award: "three-star", tags: ["michelin-3-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Odette", award: "three-star", tags: ["michelin-3-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Zén", award: "three-star", tags: ["michelin-3-star", "scandinavian", "fine-dining"], is_hawker: false, source_url: "" },

  // ============================================
  // 2 MICHELIN STARS (7 restaurants)
  // ============================================
  { name: "Cloudstreet", award: "two-star", tags: ["michelin-2-star", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Jaan by Kirk Westaway", award: "two-star", tags: ["michelin-2-star", "british", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Meta", award: "two-star", tags: ["michelin-2-star", "korean", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Saint Pierre", award: "two-star", tags: ["michelin-2-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Shoukouwa", award: "two-star", tags: ["michelin-2-star", "japanese", "sushi", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Sushi Sakuta", award: "two-star", tags: ["michelin-2-star", "japanese", "sushi", "fine-dining", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Thevar", award: "two-star", tags: ["michelin-2-star", "indian", "fine-dining"], is_hawker: false, source_url: "" },

  // ============================================
  // 1 MICHELIN STAR (32 restaurants)
  // ============================================
  { name: "Alma", award: "one-star", tags: ["michelin-1-star", "spanish", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Araya", award: "one-star", tags: ["michelin-1-star", "south-american", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Born", award: "one-star", tags: ["michelin-1-star", "chinese", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Buona Terra", award: "one-star", tags: ["michelin-1-star", "italian", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Burnt Ends", award: "one-star", tags: ["michelin-1-star", "bbq", "australian", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Candlenut", award: "one-star", tags: ["michelin-1-star", "peranakan", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Chaleur", award: "one-star", tags: ["michelin-1-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "CUT", award: "one-star", tags: ["michelin-1-star", "steakhouse", "american", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Esora", award: "one-star", tags: ["michelin-1-star", "japanese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Euphoria", award: "one-star", tags: ["michelin-1-star", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Hamamoto", award: "one-star", tags: ["michelin-1-star", "japanese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Hill Street Tai Hwa Pork Noodle", award: "one-star", tags: ["michelin-1-star", "hawker", "bak-chor-mee", "noodles"], is_hawker: true, source_url: "" },
  { name: "Iggy's", award: "one-star", tags: ["michelin-1-star", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Imperial Treasure Fine Teochew Cuisine", award: "one-star", tags: ["michelin-1-star", "teochew", "chinese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Jag", award: "one-star", tags: ["michelin-1-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Labyrinth", award: "one-star", tags: ["michelin-1-star", "singaporean", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Lei Garden", award: "one-star", tags: ["michelin-1-star", "cantonese", "chinese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Lerouy", award: "one-star", tags: ["michelin-1-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Ma Cuisine", award: "one-star", tags: ["michelin-1-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Marguerite", award: "one-star", tags: ["michelin-1-star", "french", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Nae:um", award: "one-star", tags: ["michelin-1-star", "korean", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Nouri", award: "one-star", tags: ["michelin-1-star", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Omakase @ Stevens", award: "one-star", tags: ["michelin-1-star", "japanese", "omakase", "fine-dining", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Pangium", award: "one-star", tags: ["michelin-1-star", "indonesian", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Seroja", award: "one-star", tags: ["michelin-1-star", "malay", "contemporary", "fine-dining", "green-star"], is_hawker: false, source_url: "" },
  { name: "Shisen Hanten", award: "one-star", tags: ["michelin-1-star", "sichuan", "chinese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Summer Palace", award: "one-star", tags: ["michelin-1-star", "cantonese", "chinese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Summer Pavilion", award: "one-star", tags: ["michelin-1-star", "cantonese", "chinese", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Sushi Ichi", award: "one-star", tags: ["michelin-1-star", "japanese", "sushi", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Waku Ghin", award: "one-star", tags: ["michelin-1-star", "japanese", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Whitegrass", award: "one-star", tags: ["michelin-1-star", "contemporary", "fine-dining"], is_hawker: false, source_url: "" },
  { name: "Willow", award: "one-star", tags: ["michelin-1-star", "french", "fine-dining"], is_hawker: false, source_url: "" },

  // ============================================
  // BIB GOURMAND (89 restaurants)
  // ============================================
  // New additions 2025 marked with "new-2025" tag
  { name: "A Noodle Story", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "noodles", "fusion"], is_hawker: true, source_url: "" },
  { name: "Adam Rd Noo Cheng Big Prawn Noodle", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "prawn-noodle"], is_hawker: true, source_url: "" },
  { name: "Alliance Seafood", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "seafood", "zi-char"], is_hawker: true, source_url: "" },
  { name: "Anglo Indian", award: "bib-gourmand", tags: ["bib-gourmand", "indian", "restaurant"], is_hawker: false, source_url: "" },
  { name: "Ar Er Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "soup"], is_hawker: true, source_url: "" },
  { name: "Bahrakath Mutton Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "indian", "mutton-soup"], is_hawker: true, source_url: "" },
  { name: "Beach Road Fish Head Bee Hoon", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fish-head", "bee-hoon"], is_hawker: true, source_url: "" },
  { name: "Bismillah Biryani", award: "bib-gourmand", tags: ["bib-gourmand", "indian", "biryani"], is_hawker: false, source_url: "" },
  { name: "Boon Tong Kee", award: "bib-gourmand", tags: ["bib-gourmand", "chicken-rice", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Chai Chuan Tou Yang Rou Tang", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "mutton-soup", "chinese"], is_hawker: true, source_url: "" },
  { name: "Chef Kang's Noodle House", award: "bib-gourmand", tags: ["bib-gourmand", "noodles", "wonton"], is_hawker: false, source_url: "" },
  { name: "Cheok Kee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "duck-rice"], is_hawker: true, source_url: "" },
  { name: "Chey Sua Carrot Cake", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "carrot-cake"], is_hawker: true, source_url: "" },
  { name: "Chuan Kee Boneless Braised Duck", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "duck", "braised"], is_hawker: true, source_url: "" },
  { name: "Cumi Bali", award: "bib-gourmand", tags: ["bib-gourmand", "indonesian"], is_hawker: false, source_url: "" },
  { name: "Da Shi Jia Big Prawn Mee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "prawn-noodle"], is_hawker: true, source_url: "" },
  { name: "Delhi Lahori", award: "bib-gourmand", tags: ["bib-gourmand", "indian", "north-indian"], is_hawker: false, source_url: "" },
  { name: "Dudu Cooked Food", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "chinese"], is_hawker: true, source_url: "" },
  { name: "Eminent Frog Porridge & Seafood", award: "bib-gourmand", tags: ["bib-gourmand", "frog-porridge", "seafood", "supper"], is_hawker: false, source_url: "" },
  { name: "Fei Fei Roasted Noodle", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "roast-meat", "noodles"], is_hawker: true, source_url: "" },
  { name: "Fico", award: "bib-gourmand", tags: ["bib-gourmand", "italian", "restaurant"], is_hawker: false, source_url: "" },
  { name: "Fu Ming Cooked Food", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "chinese"], is_hawker: true, source_url: "" },
  { name: "Hai Nan Xing Zhou Beef Noodle", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "beef-noodle"], is_hawker: true, source_url: "" },
  { name: "Hai Nan Zai", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "hainanese"], is_hawker: true, source_url: "" },
  { name: "Han Kee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fish-soup"], is_hawker: true, source_url: "" },
  { name: "Heng", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "carrot-cake"], is_hawker: true, source_url: "" },
  { name: "Heng Heng Cooked Food", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "teochew"], is_hawker: true, source_url: "" },
  { name: "Heng Kee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "curry-chicken"], is_hawker: true, source_url: "" },
  { name: "Hong Heng Fried Sotong Prawn Mee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "prawn-noodle", "fried"], is_hawker: true, source_url: "" },
  { name: "Hong Kong Yummy Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "cantonese", "soup"], is_hawker: true, source_url: "" },
  { name: "Hoo Kee Bak Chang", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "bak-chang", "rice-dumpling"], is_hawker: true, source_url: "" },
  { name: "Hui Wei Chilli Ban Mian", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "ban-mian", "noodles"], is_hawker: true, source_url: "" },
  { name: "Indocafé", award: "bib-gourmand", tags: ["bib-gourmand", "indonesian", "restaurant"], is_hawker: false, source_url: "" },
  { name: "J2 Famous Crispy Curry Puff", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "curry-puff", "snack"], is_hawker: true, source_url: "" },
  { name: "Jalan Sultan Prawn Mee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "prawn-noodle"], is_hawker: true, source_url: "" },
  { name: "Jason Penang Cuisine", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "penang", "malaysian"], is_hawker: true, source_url: "" },
  { name: "Ji De Lai Hainanese Chicken Rice", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "chicken-rice"], is_hawker: true, source_url: "" },
  { name: "Ji Ji Noodle House", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "wonton-noodle", "new-2025"], is_hawker: true, source_url: "" },
  { name: "Jian Bo Tiong Bahru Shui Kueh", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "shui-kueh", "kueh"], is_hawker: true, source_url: "" },
  { name: "Joo Siah Bak Koot Teh", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "bak-kut-teh"], is_hawker: true, source_url: "" },
  { name: "Jungle", award: "bib-gourmand", tags: ["bib-gourmand", "thai", "restaurant", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Kelantan Kway Chap Pig Organ Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "kway-chap", "pig-organ"], is_hawker: true, source_url: "" },
  { name: "Kitchenman Nasi Lemak", award: "bib-gourmand", tags: ["bib-gourmand", "nasi-lemak", "malay", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Koh Brother Pig's Organ Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "pig-organ", "soup"], is_hawker: true, source_url: "" },
  { name: "Kok Sen", award: "bib-gourmand", tags: ["bib-gourmand", "zi-char", "cantonese"], is_hawker: false, source_url: "" },
  { name: "Kotuwa", award: "bib-gourmand", tags: ["bib-gourmand", "sri-lankan", "restaurant", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Kwang Kee Teochew Fish Porridge", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fish-porridge", "teochew"], is_hawker: true, source_url: "" },
  { name: "Kwee Heng", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "teochew"], is_hawker: true, source_url: "" },
  { name: "Lagnaa", award: "bib-gourmand", tags: ["bib-gourmand", "indian", "north-indian", "restaurant"], is_hawker: false, source_url: "" },
  { name: "Lai Heng Handmade Teochew Kueh", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "kueh", "teochew"], is_hawker: true, source_url: "" },
  { name: "Lao Fu Zi Fried Kway Teow", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "char-kway-teow", "new-2025"], is_hawker: true, source_url: "" },
  { name: "Lian He Ben Ji Claypot", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "claypot-rice"], is_hawker: true, source_url: "" },
  { name: "Lixin Teochew Fishball Noodles", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fishball", "noodles"], is_hawker: true, source_url: "" },
  { name: "Margaret Drive Sin Kee Chicken Rice", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "chicken-rice"], is_hawker: true, source_url: "" },
  { name: "MP Thai", award: "bib-gourmand", tags: ["bib-gourmand", "thai", "restaurant"], is_hawker: false, source_url: "" },
  { name: "Muthu's Curry", award: "bib-gourmand", tags: ["bib-gourmand", "indian", "fish-head-curry"], is_hawker: false, source_url: "" },
  { name: "Na Na Curry", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "curry", "indian"], is_hawker: true, source_url: "" },
  { name: "Nam Sing Hokkien Fried Mee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "hokkien-mee", "new-2025"], is_hawker: true, source_url: "" },
  { name: "New Lucky Claypot Rice", award: "bib-gourmand", tags: ["bib-gourmand", "claypot-rice"], is_hawker: false, source_url: "" },
  { name: "No.18 Zion Road Fried Kway Teow", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "char-kway-teow"], is_hawker: true, source_url: "" },
  { name: "Outram Park Fried Kway Teow Mee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "char-kway-teow"], is_hawker: true, source_url: "" },
  { name: "Ru Ji Kitchen", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "cantonese"], is_hawker: true, source_url: "" },
  { name: "Selamat Datang Warong Pak Sapari", award: "bib-gourmand", tags: ["bib-gourmand", "malay", "nasi-padang"], is_hawker: false, source_url: "" },
  { name: "Sik Bao Sin", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "teochew", "porridge"], is_hawker: true, source_url: "" },
  { name: "Sin Heng Claypot Bak Koot Teh", award: "bib-gourmand", tags: ["bib-gourmand", "bak-kut-teh", "claypot", "new-2025"], is_hawker: false, source_url: "" },
  { name: "Sin Huat Seafood Restaurant", award: "bib-gourmand", tags: ["bib-gourmand", "zi-char", "seafood", "crab-bee-hoon"], is_hawker: false, source_url: "" },
  { name: "Singapore Fried Hokkien Mee", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "hokkien-mee"], is_hawker: true, source_url: "" },
  { name: "Soh Kee Cooked Food", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "wonton-noodle"], is_hawker: true, source_url: "" },
  { name: "Song Fa Bak Kut Teh", award: "bib-gourmand", tags: ["bib-gourmand", "bak-kut-teh"], is_hawker: false, source_url: "" },
  { name: "Song Fish Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fish-soup"], is_hawker: true, source_url: "" },
  { name: "Song Kee Teochew Fish Porridge", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fish-porridge", "teochew", "new-2025"], is_hawker: true, source_url: "" },
  { name: "Soon Huat", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "pig-organ", "soup"], is_hawker: true, source_url: "" },
  { name: "Spinach Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "soup", "spinach"], is_hawker: true, source_url: "" },
  { name: "Tai Seng Fish Soup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "fish-soup"], is_hawker: true, source_url: "" },
  { name: "Tai Wah Pork Noodle", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "bak-chor-mee", "noodles"], is_hawker: true, source_url: "" },
  { name: "The Blue Ginger", award: "bib-gourmand", tags: ["bib-gourmand", "peranakan", "restaurant"], is_hawker: false, source_url: "" },
  { name: "The Coconut Club", award: "bib-gourmand", tags: ["bib-gourmand", "nasi-lemak", "malay"], is_hawker: false, source_url: "" },
  { name: "Tian Tian Hainanese Chicken Rice", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "chicken-rice"], is_hawker: true, source_url: "" },
  { name: "Tiong Bahru Hainanese Boneless Chicken Rice", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "chicken-rice"], is_hawker: true, source_url: "" },
  { name: "To-Ricos Kway Chap", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "kway-chap", "new-2025"], is_hawker: true, source_url: "" },
  { name: "True Blue Cuisine", award: "bib-gourmand", tags: ["bib-gourmand", "peranakan", "restaurant"], is_hawker: false, source_url: "" },
  { name: "Un-Yang-Kor-Dai", award: "bib-gourmand", tags: ["bib-gourmand", "thai", "isaan"], is_hawker: false, source_url: "" },
  { name: "Whole Earth", award: "bib-gourmand", tags: ["bib-gourmand", "peranakan", "vegetarian", "plant-based"], is_hawker: false, source_url: "" },
  { name: "Wok Hei Hor Fun", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "hor-fun", "new-2025"], is_hawker: true, source_url: "" },
  { name: "Yhingthai Palace", award: "bib-gourmand", tags: ["bib-gourmand", "thai", "restaurant"], is_hawker: false, source_url: "" },
  { name: "Yong Chun Wan Ton Noodle", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "wonton-noodle"], is_hawker: true, source_url: "" },
  { name: "Zai Shun Curry Fish Head", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "curry-fish-head", "zi-char"], is_hawker: true, source_url: "" },
  { name: "Zhi Wei Xian Zion Road Big Prawn Noodle", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "prawn-noodle"], is_hawker: true, source_url: "" },
  { name: "Zhup Zhup", award: "bib-gourmand", tags: ["bib-gourmand", "hawker", "prawn-noodle", "ngoh-hiang"], is_hawker: true, source_url: "" },
];

// Summary statistics
export const michelinStats = {
  total: michelinSingapore2025.length,
  threeStars: michelinSingapore2025.filter(r => r.award === 'three-star').length,
  twoStars: michelinSingapore2025.filter(r => r.award === 'two-star').length,
  oneStars: michelinSingapore2025.filter(r => r.award === 'one-star').length,
  bibGourmand: michelinSingapore2025.filter(r => r.award === 'bib-gourmand').length,
  hawkers: michelinSingapore2025.filter(r => r.is_hawker).length,
  new2025: michelinSingapore2025.filter(r => r.tags.includes('new-2025')).length,
};

// Helper to get tag for Michelin distinction
export function getMichelinTag(award: string): string {
  switch(award) {
    case 'three-star': return 'michelin-3-star';
    case 'two-star': return 'michelin-2-star';
    case 'one-star': return 'michelin-1-star';
    case 'bib-gourmand': return 'bib-gourmand';
    case 'selected': return 'michelin-selected';
    default: return '';
  }
}

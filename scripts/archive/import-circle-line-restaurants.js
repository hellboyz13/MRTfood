const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// OneMap API for walking distance
async function getWalkingDistance(startLat, startLng, endLat, endLng) {
  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=walk`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Source name to ID mapping
const sourceNameToId = {
  'Seth Lui': 'sethlui',
  'EatBook': 'eatbook',
  'Honeycombers': 'honeycombers',
  'Time Out Singapore': 'timeout-2025',
  'Burpple': 'burpple',
  'FoodAdvisor': 'foodadvisor',
  'Miss Tam Chiak': 'misstamchiak',
  'Supasoya': 'editors-choice',
  'danielfooddiary': 'danielfooddiary',
  'HungryGoWhere': 'hungrygowhere',
  'TheSmartLocal': 'smartlocal',
  'Ordinary Patrons': 'editors-choice',
  'Various': 'editors-choice',
  'Womens Weekly': 'womensweekly',
  'Yahoo': 'editors-choice',
  'Little Day Out': 'editors-choice',
  'MyFoodStory': 'editors-choice',
  'Wak Wak Hawker': 'editors-choice',
  'Lady Iron Chef': 'ladyironchef',
};

// Circle Line restaurants from CSV (with ratings)
const restaurants = [
  { name: "Mama Diam", address: "91 Bencoolen Street, Sunshine Plaza #01-60, Singapore 189652", lat: 1.2983, lng: 103.8513, source: "Seth Lui", tags: ["Modern Singaporean", "Bar", "Speakeasy"], price_low: 15, price_high: 30, rating: 4.3 },
  { name: "Kuro Kare", address: "1 Zubir Said Drive, School of Information Systems SMU #B1, Singapore 227968", lat: 1.2965, lng: 103.8492, source: "Seth Lui", tags: ["Japanese Curry", "Ex-Fine Dining Chef"], price_low: 9, price_high: 17, rating: 4.5 },
  { name: "Paper Rice Vietnamese Kitchen", address: "68 Orchard Road, Plaza Singapura #03-92, Singapore 238839", lat: 1.3006, lng: 103.8453, source: "Seth Lui", tags: ["Vietnamese", "Pho"], price_low: 13, price_high: 36, rating: 4.2 },
  { name: "Ichi Tei Japanese Dining", address: "91 Bencoolen Street, Sunshine Plaza #01-60, Singapore 189652", lat: 1.2983, lng: 103.8513, source: "Seth Lui", tags: ["Japanese", "Don", "Udon"], price_low: 12, price_high: 18, rating: 4.4 },
  { name: "Cajun On Wheels", address: "68 Orchard Road, Plaza Singapura, Singapore 238839", lat: 1.3006, lng: 103.8453, source: "Seth Lui", tags: ["Cajun", "Seafood", "Halal"], price_low: 25, price_high: 113, rating: 4.0 },
  { name: "Co Chung Vietnamese", address: "68 Orchard Road, Plaza Singapura, Singapore 238839", lat: 1.3006, lng: 103.8453, source: "EatBook", tags: ["Vietnamese", "Pho", "Spring Rolls"], price_low: 13, price_high: 20, rating: 4.1 },
  { name: "9Toast", address: "Dhoby Ghaut, Singapore", lat: 1.2990, lng: 103.8460, source: "EatBook", tags: ["Cafe", "Brunch", "Sandwiches"], price_low: 12, price_high: 20, rating: 4.2 },
  { name: "Ganko Sushi", address: "Dhoby Ghaut, Singapore", lat: 1.2990, lng: 103.8460, source: "EatBook", tags: ["Japanese", "Omakase", "Sushi"], price_low: 98, price_high: 150, rating: 4.5 },
  { name: "Edith Patisserie Cake Bar", address: "9 Penang Road #01-06, Singapore 238459", lat: 1.2968, lng: 103.8470, source: "Honeycombers", tags: ["Bakery", "Cafe", "Cakes"], price_low: 8, price_high: 18, rating: 4.6 },
  { name: "Seorae Korean BBQ", address: "68 Orchard Road, Plaza Singapura #02-01, Singapore 238839", lat: 1.3006, lng: 103.8453, source: "Honeycombers", tags: ["Korean BBQ", "Pork"], price_low: 25, price_high: 45, rating: 4.3 },
  { name: "Supreme Pork Chop Rice", address: "Bulkhaul Building Basement, Bras Basah, Singapore", lat: 1.2970, lng: 103.8530, source: "Time Out Singapore", tags: ["Taiwanese", "Pork Chop"], price_low: 6, price_high: 10, rating: 4.4 },
  { name: "British Hainan", address: "Purvis Street, Singapore", lat: 1.2953, lng: 103.8555, source: "Time Out Singapore", tags: ["Hainanese", "Western", "Oxtail"], price_low: 15, price_high: 25, rating: 4.3 },
  { name: "Pinhole Coffee Bar", address: "Purvis Street, near Bugis, Singapore", lat: 1.2953, lng: 103.8555, source: "Time Out Singapore", tags: ["Coffee", "Cafe"], price_low: 5, price_high: 12, rating: 4.5 },
  { name: "Hop Around Bistro", address: "231 Bain Street, Bras Basah Complex, Singapore 180231", lat: 1.2965, lng: 103.8530, source: "Time Out Singapore", tags: ["Craft Beer", "Bar", "Bistro"], price_low: 10, price_high: 25, rating: 4.2 },
  { name: "Victory Restaurant", address: "701 North Bridge Road, Singapore", lat: 1.3020, lng: 103.8590, source: "Burpple", tags: ["Indian Muslim", "Murtabak", "Halal"], price_low: 8, price_high: 15, rating: 4.5 },
  { name: "Leong Yeow Famous Waterloo St Hainanese Chicken Rice", address: "261 Waterloo Street, Waterloo Centre, Singapore 180261", lat: 1.3005, lng: 103.8520, source: "FoodAdvisor", tags: ["Hainanese", "Chicken Rice"], price_low: 4, price_high: 8, rating: 4.3 },
  { name: "Clinton Street Baking Company", address: "31 Purvis Street, Singapore 188608", lat: 1.2953, lng: 103.8555, source: "EatBook", tags: ["American", "Brunch", "Pancakes"], price_low: 19, price_high: 25, rating: 4.6 },
  { name: "Artichoke Cafe & Bar", address: "161 Middle Road, Singapore 188978", lat: 1.2985, lng: 103.8525, source: "EatBook", tags: ["Middle Eastern", "Brunch", "Mediterranean"], price_low: 15, price_high: 28, rating: 4.4 },
  { name: "Poon Nah City Banmian", address: "810 Geylang Road #01-43/44, City Plaza, Singapore 409286", lat: 1.3145, lng: 103.8920, source: "Miss Tam Chiak", tags: ["Ban Mian", "Noodles"], price_low: 4, price_high: 7, rating: 4.3 },
  { name: "5 Little Bears", address: "60 Paya Lebar Road #B1-09, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "Miss Tam Chiak", tags: ["Taiwanese", "Lu Rou Fan"], price_low: 5, price_high: 8, rating: 4.2 },
  { name: "Tong Kee Braised Duck", address: "14 Haig Road, Haig Road Market #01-58, Singapore 430014", lat: 1.3090, lng: 103.8930, source: "Miss Tam Chiak", tags: ["Teochew", "Braised Duck", "Heritage"], price_low: 5, price_high: 10, rating: 4.4 },
  { name: "Tenderfresh Classic", address: "300 Joo Chiat Road, Tin Yeung Restaurant, Singapore 429356", lat: 1.3105, lng: 103.9020, source: "Miss Tam Chiak", tags: ["Western", "Fried Chicken"], price_low: 5, price_high: 12, rating: 4.0 },
  { name: "Nan Yang Dao", address: "10 Paya Lebar Road, PLQ Mall, Singapore 409057", lat: 1.3180, lng: 103.8930, source: "Supasoya", tags: ["Malaysian", "Hawker", "Char Kway Teow"], price_low: 8, price_high: 15, rating: 4.1 },
  { name: "Zhang Liang Malatang", address: "10 Paya Lebar Road, PLQ Mall #B2-29, Singapore 409057", lat: 1.3180, lng: 103.8930, source: "Supasoya", tags: ["Sichuan", "Mala Tang", "Hotpot"], price_low: 12, price_high: 20, rating: 4.2 },
  { name: "Chimichanga", address: "10 Paya Lebar Road, PLQ Mall, Singapore 409057", lat: 1.3180, lng: 103.8930, source: "Supasoya", tags: ["Mexican", "Tacos", "Margaritas"], price_low: 15, price_high: 30, rating: 4.0 },
  { name: "Yakiniku Like", address: "10 Paya Lebar Road, PLQ Mall, Singapore 409057", lat: 1.3180, lng: 103.8930, source: "Supasoya", tags: ["Japanese", "BBQ", "Solo Dining"], price_low: 15, price_high: 25, rating: 4.3 },
  { name: "CRAVE Nasi Lemak", address: "60 Paya Lebar Road #B1-45, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "danielfooddiary", tags: ["Nasi Lemak", "Halal", "Teh Tarik"], price_low: 5, price_high: 10, rating: 4.2 },
  { name: "Charcoal-Grill & Salad Bar Keisuke", address: "60 Paya Lebar Road, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "danielfooddiary", tags: ["Japanese", "Grill", "Salad Bar"], price_low: 15, price_high: 25, rating: 4.4 },
  { name: "Qin Ji Rougamo", address: "60 Paya Lebar Road #B1, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "Seth Lui", tags: ["Chinese", "Shan Xi", "Rou Jia Mo"], price_low: 5, price_high: 10, rating: 4.3 },
  { name: "Greendot", address: "60 Paya Lebar Road #02, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "Seth Lui", tags: ["Vegetarian", "Healthy"], price_low: 9, price_high: 15, rating: 4.1 },
  { name: "Saute Sushi", address: "60 Paya Lebar Road #B1, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "Seth Lui", tags: ["Japanese", "Vegetarian", "Plant-Based Sushi"], price_low: 8, price_high: 15, rating: 4.0 },
  { name: "Lotus Thai Restaurant", address: "60 Paya Lebar Road #02, Paya Lebar Square, Singapore 409051", lat: 1.3180, lng: 103.8930, source: "Seth Lui", tags: ["Thai", "Claypot"], price_low: 10, price_high: 30, rating: 4.2 },
  { name: "Chindamani Indian Food", address: "284 Bishan Street 22, KPT Ka Fei Dian, Singapore 570284", lat: 1.3485, lng: 103.8450, source: "Seth Lui", tags: ["Indian", "Roti Prata", "Dosa"], price_low: 2, price_high: 8, rating: 4.5 },
  { name: "GRUB", address: "9 Bishan Place #01-38, Junction 8, Singapore 579837", lat: 1.3515, lng: 103.8485, source: "HungryGoWhere", tags: ["Western", "Burgers", "Brunch"], price_low: 15, price_high: 25, rating: 4.3 },
  { name: "Canopy Garden Dining", address: "1382 Ang Mo Kio Avenue 1, Bishan Park 2, Singapore 569931", lat: 1.3580, lng: 103.8490, source: "TheSmartLocal", tags: ["Western", "Al Fresco", "Pet-Friendly"], price_low: 19, price_high: 35, rating: 4.2 },
  { name: "Mata Thai Restaurant", address: "151 Bishan Street 11 #01-195, Singapore 570151", lat: 1.3500, lng: 103.8465, source: "Seth Lui", tags: ["Thai", "Zi Char", "Tom Yum"], price_low: 8, price_high: 20, rating: 4.4 },
  { name: "Yung Yung", address: "509 Bishan Street 11 #01-380, Singapore 570509", lat: 1.3505, lng: 103.8465, source: "EatBook", tags: ["Bubble Tea", "Jelly Milk Tea"], price_low: 4, price_high: 8, rating: 4.1 },
  { name: "Holland Village Market & Food Centre", address: "1 Lorong Mambong, Singapore 277700", lat: 1.3105, lng: 103.7940, source: "Various", tags: ["Hawker Centre", "Local Food"], price_low: 3, price_high: 10, rating: 4.3 },
  { name: "363 Katong Laksa", address: "1 Lorong Mambong, Holland Village Food Centre #01-15, Singapore 277700", lat: 1.3105, lng: 103.7940, source: "Seth Lui", tags: ["Laksa", "Nasi Lemak"], price_low: 5, price_high: 8, rating: 4.4 },
  { name: "Twirl Pasta (Holland V)", address: "1 Lorong Mambong, Holland Village Food Centre, Singapore 277700", lat: 1.3105, lng: 103.7940, source: "Seth Lui", tags: ["Hawker Pasta", "Italian", "Affordable"], price_low: 8, price_high: 12, rating: 4.2 },
  { name: "Holland V. Fried Bee Hoon", address: "1 Lorong Mambong, Holland Village Food Centre #01-11, Singapore 277700", lat: 1.3105, lng: 103.7940, source: "Womens Weekly", tags: ["Bee Hoon", "Breakfast"], price_low: 2, price_high: 5, rating: 4.3 },
  { name: "Hua Soon Western Food", address: "1 Lorong Mambong, Holland Village Food Centre, Singapore 277700", lat: 1.3105, lng: 103.7940, source: "Seth Lui", tags: ["Western", "Hawker", "Old School"], price_low: 6, price_high: 12, rating: 4.1 },
  { name: "New Lucky Claypot Rice (Holland)", address: "44 Holland Drive #02-19, Holland Drive Market, Singapore 270044", lat: 1.3085, lng: 103.7920, source: "EatBook", tags: ["Claypot Rice", "Michelin Guide"], price_low: 12, price_high: 18, rating: 4.5 },
  { name: "Lao Chen Ji", address: "44 Holland Drive #02-43, Holland Drive Market, Singapore 270044", lat: 1.3085, lng: 103.7920, source: "Burpple", tags: ["Yong Tau Foo", "Kolo Mee"], price_low: 5, price_high: 10, rating: 4.2 },
  { name: "La Nonna", address: "7 Holland Village Way #01-54, One Holland Village, Singapore 275748", lat: 1.3110, lng: 103.7950, source: "Yahoo", tags: ["Italian", "Pizza", "Family"], price_low: 20, price_high: 35, rating: 4.3 },
  { name: "Cha Cha Cha Mexican", address: "32 Lorong Mambong, Singapore 277691", lat: 1.3108, lng: 103.7945, source: "Yahoo", tags: ["Mexican", "Heritage Restaurant"], price_low: 15, price_high: 25, rating: 4.4 },
  { name: "Sanpoutei Ramen", address: "7 Holland Village Way, One Holland Village, Singapore 275748", lat: 1.3110, lng: 103.7950, source: "EatBook", tags: ["Japanese", "Ramen", "From Niigata"], price_low: 15, price_high: 22, rating: 4.5 },
  { name: "Original Sin", address: "43 Jalan Merah Saga #01-62, Singapore 278115", lat: 1.3100, lng: 103.7925, source: "EatBook", tags: ["Mediterranean", "Vegetarian", "Al Fresco"], price_low: 25, price_high: 35, rating: 4.4 },
  { name: "The Pocha Singapore", address: "26A Lorong Mambong, Singapore 277685", lat: 1.3108, lng: 103.7945, source: "EatBook", tags: ["Korean", "Pojangmacha", "Fried Chicken"], price_low: 15, price_high: 45, rating: 4.3 },
  { name: "Long Black Cafe", address: "20 Biopolis Way, Singapore 138668", lat: 1.3035, lng: 103.7905, source: "EatBook", tags: ["Cafe", "Coffee"], price_low: 5, price_high: 15, rating: 4.2 },
  { name: "CALI", address: "Biopolis, Singapore", lat: 1.3035, lng: 103.7905, source: "EatBook", tags: ["Mexican", "Fusion"], price_low: 15, price_high: 25, rating: 4.1 },
  { name: "One@KentRidge - Huggs Coffee", address: "1 Lower Kent Ridge Road #02, NUH Medical Centre, Singapore 119082", lat: 1.2920, lng: 103.7835, source: "Little Day Out", tags: ["Coffee", "Cafe"], price_low: 5, price_high: 12, rating: 4.0 },
  { name: "Xin Wang Hong Kong Cafe (Kent Ridge)", address: "1 Lower Kent Ridge Road #02-10, NUH Medical Centre, Singapore 119082", lat: 1.2920, lng: 103.7835, source: "MyFoodStory", tags: ["Hong Kong", "Cha Chaan Teng"], price_low: 10, price_high: 18, rating: 4.1 },
  { name: "A Poke Theory", address: "1 Lower Kent Ridge Road #02-12, One@KentRidge, Singapore 119082", lat: 1.2920, lng: 103.7835, source: "FoodAdvisor", tags: ["Hawaiian", "Poke Bowl", "Healthy"], price_low: 12, price_high: 18, rating: 4.3 },
  { name: "Empress Porridge", address: "1 Lower Kent Ridge Road #01-04, One@KentRidge, Singapore 119082", lat: 1.2920, lng: 103.7835, source: "EatBook", tags: ["Porridge", "Healthy", "Family-Run"], price_low: 4, price_high: 8, rating: 4.2 },
  { name: "Tokyo Joe", address: "2 Science Park Drive #01-24, Savourworld, Singapore 118222", lat: 1.2935, lng: 103.7865, source: "EatBook", tags: ["Japanese", "Chirashi", "Yakitori"], price_low: 13, price_high: 20, rating: 4.4 },
  { name: "Fong Seng Nasi Lemak", address: "22 Clementi Road, Singapore 129751", lat: 1.3065, lng: 103.7720, source: "EatBook", tags: ["Nasi Lemak", "Halal", "24hr"], price_low: 4, price_high: 8, rating: 4.5 },
  { name: "Aspirasi Chicken Rice (Seah Im)", address: "2 Seah Im Road #01, Seah Im Food Centre, Singapore 099114", lat: 1.2665, lng: 103.8205, source: "FoodAdvisor", tags: ["Chicken Rice", "Halal"], price_low: 4, price_high: 7, rating: 4.2 },
  { name: "Shi Ji Noodle Stall", address: "2 Seah Im Road #01-56, Seah Im Food Centre, Singapore 099114", lat: 1.2665, lng: 103.8205, source: "Burpple", tags: ["Lor Mee"], price_low: 4, price_high: 7, rating: 4.4 },
  { name: "Thai Thai Nitta", address: "2 Seah Im Road, Seah Im Food Centre, Singapore 099114", lat: 1.2665, lng: 103.8205, source: "Burpple", tags: ["Thai", "Affordable"], price_low: 5, price_high: 10, rating: 4.1 },
  { name: "Thaksin Beef Noodle", address: "2 Seah Im Road, Seah Im Food Centre, Singapore 099114", lat: 1.2665, lng: 103.8205, source: "FoodAdvisor", tags: ["Thai", "Beef Noodle"], price_low: 6, price_high: 10, rating: 4.3 },
  { name: "Telok Blangah Food Centre", address: "79 Telok Blangah Drive, Singapore 100079", lat: 1.2725, lng: 103.8095, source: "Various", tags: ["Hawker Centre"], price_low: 3, price_high: 10, rating: 4.2 },
  { name: "Yuan Cheng Carrot Cake", address: "79 Telok Blangah Drive, Telok Blangah Food Centre, Singapore 100079", lat: 1.2725, lng: 103.8095, source: "Wak Wak Hawker", tags: ["Carrot Cake"], price_low: 3, price_high: 5, rating: 4.3 },
  { name: "Tian Tian Hainanese Curry Rice", address: "35 Telok Blangah Rise #01-281, Singapore 090035", lat: 1.2720, lng: 103.8110, source: "FoodAdvisor", tags: ["Hainanese Curry Rice"], price_low: 5, price_high: 10, rating: 4.4 },
  { name: "Makko Teck Neo", address: "35 Telok Blangah Rise #01-303, Singapore 090035", lat: 1.2720, lng: 103.8110, source: "FoodAdvisor", tags: ["Peranakan", "Nyonya", "Kueh"], price_low: 8, price_high: 18, rating: 4.5 },
  { name: "Pasir Panjang Food Centre", address: "121 Pasir Panjang Road, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "Various", tags: ["Hawker Centre", "Near MRT"], price_low: 3, price_high: 15, rating: 4.3 },
  { name: "Mugiwara Tonkotsu Ramen", address: "121 Pasir Panjang Road, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "Seth Lui", tags: ["Japanese", "Ramen", "Affordable"], price_low: 6.6, price_high: 10, rating: 4.4 },
  { name: "Jubilant Hainanese Chicken Rice", address: "121 Pasir Panjang Road, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "Seth Lui", tags: ["Hainanese", "Chicken Rice"], price_low: 3.5, price_high: 5, rating: 4.3 },
  { name: "216 Choa Chu Kang BBQ Chicken Wings", address: "121 Pasir Panjang Road, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "Seth Lui", tags: ["BBQ", "Chicken Wings", "No Pork"], price_low: 1.5, price_high: 5, rating: 4.5 },
  { name: "Tom Yum Goong", address: "121 Pasir Panjang Road #01, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "Seth Lui", tags: ["Thai", "Tom Yum", "Fried Rice"], price_low: 5, price_high: 12, rating: 4.2 },
  { name: "Meng's Kee Seafood - Salt Baked Crab", address: "121 Pasir Panjang Road, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "EatBook", tags: ["Seafood", "Salt Baked Crab", "Zi Char"], price_low: 40, price_high: 80, rating: 4.6 },
  { name: "Xin Fu Ji Seafood", address: "121 Pasir Panjang Road #01-15, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "EatBook", tags: ["Seafood", "Stingray", "Sambal"], price_low: 15, price_high: 50, rating: 4.3 },
  { name: "Bua Siam Thai Seafood", address: "121 Pasir Panjang Road #01-07, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "EatBook", tags: ["Thai", "Seafood", "Pad Thai"], price_low: 5, price_high: 28, rating: 4.4 },
  { name: "Chong Jia Food", address: "121 Pasir Panjang Road, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "EatBook", tags: ["Taiwanese", "Braised Pork"], price_low: 5, price_high: 8, rating: 4.2 },
  { name: "Pastapedia", address: "121 Pasir Panjang Road #01-41, Pasir Panjang Food Centre, Singapore 118543", lat: 1.2765, lng: 103.7890, source: "EatBook", tags: ["Western", "Pasta", "Hawker"], price_low: 8, price_high: 20, rating: 4.1 },
  { name: "Uncle Ho Tuckshop", address: "100 Pasir Panjang Road #01-04, Old Behn Meyer Building, Singapore 118518", lat: 1.2760, lng: 103.7895, source: "EatBook", tags: ["Vietnamese", "Bun Cha"], price_low: 10, price_high: 15, rating: 4.3 },
  { name: "E-Sarn Thai Cuisine", address: "130 Pasir Panjang Road, Singapore 118548", lat: 1.2770, lng: 103.7875, source: "EatBook", tags: ["Thai", "Tom Yam", "Grilled Pork"], price_low: 10, price_high: 22, rating: 4.4 },
  { name: "Black Cherry Osteria", address: "100 Pasir Panjang Road #01, Singapore 118518", lat: 1.2760, lng: 103.7895, source: "EatBook", tags: ["Italian", "Brunch", "Pasta"], price_low: 19, price_high: 28, rating: 4.5 },
  { name: "Knots Cafe & Living", address: "102E Pasir Panjang Road #01-08, Citilink Warehouse, Singapore 118529", lat: 1.2755, lng: 103.7900, source: "EatBook", tags: ["Cafe", "Brunch", "Furniture Store"], price_low: 14, price_high: 22, rating: 4.4 },
  { name: "The Three Peacocks", address: "8 Port Road, Singapore 117540", lat: 1.2685, lng: 103.8010, source: "EatBook", tags: ["BBQ Buffet", "Hotpot", "Live Seafood", "Outdoor"], price_low: 56, price_high: 130, rating: 4.2 },
  { name: "Tamarind Hill", address: "30 Labrador Villa Road, Singapore 119189", lat: 1.2680, lng: 103.8020, source: "EatBook", tags: ["Thai", "Fine Dining", "Colonial Building"], price_low: 35, price_high: 60, rating: 4.5 },
  { name: "Canopy HortPark", address: "33 Hyderabad Road #01-01, HortPark, Singapore 119578", lat: 1.2775, lng: 103.8000, source: "EatBook", tags: ["Western", "Garden Cafe", "Pet-Friendly"], price_low: 20, price_high: 45, rating: 4.3 },
  { name: "Hitoyoshi Ramen & Grill", address: "40 Pasir Panjang Road #02-38, Mapletree Business City, Singapore 117440", lat: 1.2750, lng: 103.7925, source: "EatBook", tags: ["Japanese", "Ramen", "Yakitori"], price_low: 12, price_high: 20, rating: 4.4 },
  { name: "Kaisen Ichi", address: "40 Pasir Panjang Road #02-36, Mapletree Business City, Singapore 117383", lat: 1.2750, lng: 103.7925, source: "EatBook", tags: ["Japanese", "Chirashi", "Izakaya"], price_low: 10, price_high: 20, rating: 4.3 },
  { name: "BurgerLabo", address: "41 Malan Road, Singapore 109454", lat: 1.2695, lng: 103.8015, source: "EatBook", tags: ["Burgers", "Gourmet"], price_low: 20, price_high: 35, rating: 4.6 },
  { name: "Zhang Ji Shanghai La Mian Xiao Long Bao", address: "460 Alexandra Road, Alexandra Retail Centre, Singapore 119963", lat: 1.2725, lng: 103.8055, source: "TheSmartLocal", tags: ["Shanghai", "Xiao Long Bao", "Michelin Guide"], price_low: 6, price_high: 12, rating: 4.5 },
  { name: "Da Sheng Minced Pork Noodle", address: "8 Burn Road, Trivex Building LC Food Centre #01-06, Singapore 369977", lat: 1.3280, lng: 103.8845, source: "Miss Tam Chiak", tags: ["Teochew", "Bak Chor Mee"], price_low: 5, price_high: 8, rating: 4.4 },
  { name: "Took Lae Dee", address: "18 Tai Seng Street #01-34/35/K9, Singapore 539775", lat: 1.3350, lng: 103.8885, source: "Miss Tam Chiak", tags: ["Thai", "Pad Krapow", "Authentic", "Affordable"], price_low: 3.8, price_high: 10, rating: 4.5 },
  { name: "Thai Seng Fish Soup", address: "28 Taiseng Street, Hainan Food Court #01-03, Singapore 534106", lat: 1.3355, lng: 103.8880, source: "Miss Tam Chiak", tags: ["Fish Soup", "Batang Fish"], price_low: 5, price_high: 8, rating: 4.3 },
  { name: "Quan Lai Kway Chap", address: "560 MacPherson Road, Sin Fong Restaurant, Singapore 368233", lat: 1.3270, lng: 103.8850, source: "Miss Tam Chiak", tags: ["Kway Chap", "Duck"], price_low: 10, price_high: 15, rating: 4.4 },
  { name: "Mei Mei Roast Meat", address: "Ubi Road 1 #01, Singapore 408702", lat: 1.3295, lng: 103.8935, source: "Miss Tam Chiak", tags: ["Roast Meat", "Char Siew", "Heritage"], price_low: 5, price_high: 12, rating: 4.5 },
  { name: "Tim Ho Wan (Tai Seng)", address: "18 Tai Seng Street #01-36-39, Singapore 539775", lat: 1.3350, lng: 103.8885, source: "Ordinary Patrons", tags: ["Dim Sum", "Hong Kong", "Michelin Star"], price_low: 15, price_high: 25, rating: 4.4 },
  { name: "Marutama Ramen", address: "18 Tai Seng Street #01-34/35, Singapore 539775", lat: 1.3350, lng: 103.8885, source: "Ordinary Patrons", tags: ["Japanese", "Ramen", "Chicken Broth"], price_low: 12, price_high: 18, rating: 4.3 },
  { name: "Blanco Court Beef Noodles (Tai Seng)", address: "18 Tai Seng Street #01-30, Singapore 539775", lat: 1.3350, lng: 103.8885, source: "Ordinary Patrons", tags: ["Hainanese", "Beef Noodles"], price_low: 8, price_high: 12, rating: 4.5 },
  { name: "The Good Boys", address: "1 Irving Place #01-26, The Commerze Building, Singapore 369546", lat: 1.3345, lng: 103.8870, source: "Seth Lui", tags: ["Cafe", "Smoothie Bowls", "Healthy"], price_low: 10, price_high: 15, rating: 4.2 },
  { name: "23 Jumpin", address: "1 Irving Place #01-25, Commerze@Irving, Singapore 369546", lat: 1.3345, lng: 103.8870, source: "Seth Lui", tags: ["Cafe", "Brunch", "Waffles"], price_low: 12, price_high: 18, rating: 4.3 },
  { name: "Muslim Delights", address: "107-111 Upper Paya Lebar Road, Singapore 534829", lat: 1.3355, lng: 103.8895, source: "Seth Lui", tags: ["Halal", "Nasi Padang", "Mee Soto"], price_low: 5, price_high: 10, rating: 4.4 },
  { name: "The Boneless Kitchen", address: "Tai Seng, Singapore", lat: 1.3345, lng: 103.8885, source: "Seth Lui", tags: ["Korean", "Vegetarian"], price_low: 8, price_high: 15, rating: 4.2 },
  { name: "Alchemist (Tai Seng)", address: "2 Mactaggart Road #01-01, Khong Guan Building, Singapore 368078", lat: 1.3340, lng: 103.8860, source: "Lady Iron Chef", tags: ["Cafe", "Specialty Coffee", "Flagship"], price_low: 5, price_high: 12, rating: 4.5 },
  { name: "Wishes Cafe", address: "36 Circuit Road #01-414, Singapore 370036", lat: 1.3265, lng: 103.8820, source: "Lady Iron Chef", tags: ["Gelato", "Dessert", "Waffles"], price_low: 4, price_high: 10, rating: 4.4 },
  { name: "Old Airport Road Food Centre", address: "51 Old Airport Road, Singapore 390051", lat: 1.3105, lng: 103.8825, source: "Various", tags: ["Hawker Centre", "Heritage", "Must Visit"], price_low: 3, price_high: 12, rating: 4.6 },
  { name: "Rochor Original Beancurd", address: "51 Old Airport Road #01-78, Singapore 390051", lat: 1.3105, lng: 103.8825, source: "Various", tags: ["Beancurd", "Dessert", "Heritage"], price_low: 1.5, price_high: 3, rating: 4.4 },
  { name: "Toa Payoh Rojak", address: "51 Old Airport Road #01-100, Singapore 390051", lat: 1.3105, lng: 103.8825, source: "Various", tags: ["Rojak", "Heritage"], price_low: 4, price_high: 8, rating: 4.5 },
  { name: "Nam Sing Hokkien Mee (Old Airport)", address: "51 Old Airport Road #01-32, Singapore 390051", lat: 1.3105, lng: 103.8825, source: "Various", tags: ["Hokkien Mee"], price_low: 5, price_high: 8, rating: 4.4 },
  { name: "Lao Fu Zi Fried Kway Teow (Old Airport)", address: "51 Old Airport Road #01-12, Singapore 390051", lat: 1.3105, lng: 103.8825, source: "Various", tags: ["Char Kway Teow", "Michelin Bib Gourmand"], price_low: 4, price_high: 7, rating: 4.6 },
];

async function importRestaurants() {
  // Get all stations
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  console.log(`Loaded ${stations.length} stations\n`);
  console.log('=== IMPORTING CIRCLE LINE RESTAURANTS ===\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const restaurant of restaurants) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_listings')
      .select('id')
      .eq('name', restaurant.name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Skipping (exists): ${restaurant.name}`);
      skipped++;
      continue;
    }

    // Find nearest station using haversine
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const distance = haversineDistance(restaurant.lat, restaurant.lng, station.lat, station.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }

    if (!nearestStation) {
      console.log(`No station found for: ${restaurant.name}`);
      failed++;
      continue;
    }

    // Skip if too far (>2km)
    if (minDistance > 2000) {
      console.log(`Skipping (too far): ${restaurant.name} - ${Math.round(minDistance)}m from ${nearestStation.id}`);
      skipped++;
      continue;
    }

    // Get walking distance from OneMap
    const walkingData = await getWalkingDistance(
      restaurant.lat, restaurant.lng,
      nearestStation.lat, nearestStation.lng
    );

    const distanceToStation = walkingData ? walkingData.distance : Math.round(minDistance);
    const walkingTime = walkingData ? walkingData.time : Math.round(minDistance / 80);

    // Get source ID
    const sourceId = sourceNameToId[restaurant.source] || 'editors-choice';

    // Insert listing
    const { data: newListing, error: insertError } = await supabase
      .from('food_listings')
      .insert({
        name: restaurant.name,
        station_id: nearestStation.id,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        tags: restaurant.tags,
        source_id: sourceId,
        distance_to_station: distanceToStation,
        walking_time: walkingTime,
        rating: restaurant.rating
      })
      .select('id')
      .single();

    if (insertError) {
      console.log(`Error inserting ${restaurant.name}: ${insertError.message}`);
      failed++;
      continue;
    }

    // Insert price
    const { error: priceError } = await supabase
      .from('listing_prices')
      .insert({
        listing_id: newListing.id,
        item_name: 'Main',
        price: restaurant.price_low,
        description: `$${restaurant.price_low} - $${restaurant.price_high}`,
        is_signature: true,
        sort_order: 0
      });

    if (priceError) {
      console.log(`Error inserting price for ${restaurant.name}: ${priceError.message}`);
    }

    console.log(`✅ ${restaurant.name} -> ${nearestStation.id} (${distanceToStation}m, ${walkingTime} min)`);
    imported++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (exists): ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Get new total count
  const { count } = await supabase
    .from('food_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal listings in database: ${count}`);
}

importRestaurants().catch(console.error);

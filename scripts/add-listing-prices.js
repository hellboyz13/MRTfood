// Script to match food listings with price data and generate SQL inserts
// Run with: node scripts/add-listing-prices.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Price data from CSV
const priceData = [
  { name: "Muthu's Curry", price_range: "$25 - $40" },
  { name: "Cafe Gui", price_range: "$12 - $20" },
  { name: "SuiTok Dessert", price_range: "$8 - $15" },
  { name: "Chao Ji Thai", price_range: "$5 - $10" },
  { name: "Old Hen Coffee", price_range: "$10 - $18" },
  { name: "Depot Road Zhen Shan Mei Laksa", price_range: "$4 - $7" },
  { name: "Hainan Fried Hokkien Prawn Mee", price_range: "$4 - $5" },
  { name: "POCHA!", price_range: "$13 - $20" },
  { name: "Dong Qu", price_range: "$12 - $20" },
  { name: "Tomyum MAMA", price_range: "$8 - $15" },
  { name: "Margaret Drive Sin Kee Chicken Rice", price_range: "$4 - $6" },
  { name: "63 Laksa", price_range: "$3 - $5" },
  { name: "Ah Heng Curry Chicken Bee Hoon Mee", price_range: "$4 - $6" },
  { name: "SHINRAI", price_range: "$15 - $25" },
  { name: "Dan Lao", price_range: "$5 - $10" },
  { name: "Authentic Mun Chee Kee King of Pig's Organ Soup", price_range: "$5 - $8" },
  { name: "Jiak Song Mee Hoon Kway", price_range: "$4 - $7" },
  { name: "Peng Tiong Bahru Wanton Mee", price_range: "$4 - $6" },
  { name: "Oven Fried Chicken", price_range: "$12 - $18" },
  { name: "Hua Fong Kee Roasted Duck", price_range: "$4 - $7" },
  { name: "Blue Ginger", price_range: "$25 - $40" },
  { name: "Benson Salted Duck Rice", price_range: "$4 - $7" },
  { name: "Soon Huat", price_range: "$5 - $8" },
  { name: "Kind Kones", price_range: "$8 - $15" },
  { name: "Sumo Bar Happy", price_range: "$12 - $20" },
  { name: "Shrimp Prawn Seafood", price_range: "$15 - $30" },
  { name: "MP Thai", price_range: "$10 - $18" },
  { name: "Fu Zhou Poh Hwa Oyster Cake", price_range: "$4 - $6" },
  { name: "An Shun Seafood Soup", price_range: "$5 - $10" },
  { name: "Anak Bapak Halal Muslim Restaurant", price_range: "$8 - $15" },
  { name: "Lucine by LUNA", price_range: "$20 - $35" },
  { name: "Wunderfolks", price_range: "$10 - $18" },
  { name: "Crispy Wings! Western Delights", price_range: "$8 - $15" },
  { name: "88 Hong Kong Roast Meat Specialist", price_range: "$5 - $10" },
  { name: "Tom's Palette", price_range: "$15 - $25" },
  { name: "The Populus", price_range: "$12 - $20" },
  { name: "618 Sim Carrot Cake", price_range: "$3 - $5" },
  { name: "OUD Restaurant", price_range: "$25 - $40" },
  { name: "PS.Cafe (Harding Road)", price_range: "$20 - $35" },
  { name: "Pantler", price_range: "$15 - $25" },
  { name: "8889 Ji Gong Bao", price_range: "$4 - $8" },
  { name: "South Buona Vista Braised Duck", price_range: "$4 - $7" },
  { name: "Jin Wee Restaurant", price_range: "$10 - $20" },
  { name: "Kazutake Ramen (Kensington)", price_range: "$12 - $18" },
  { name: "To-Ricos Kway Chap", price_range: "$5 - $8" },
  { name: "Sik Bao Sin", price_range: "$4 - $7" },
  { name: "Gahe Traditional Korean Cuisine", price_range: "$15 - $25" },
  { name: "Lau Wang Claypot Delights", price_range: "$8 - $15" },
  { name: "Kokoyo Nyonya Delights", price_range: "$8 - $15" },
  { name: "Mr Blecky Seafood", price_range: "$15 - $30" },
  { name: "White House Teochew Porridge", price_range: "$5 - $12" },
  { name: "Wow Wow West", price_range: "$8 - $15" },
  { name: "Old Hen Kitchen", price_range: "$15 - $25" },
  { name: "Delhi Lahori", price_range: "$8 - $15" },
  { name: "Aunty Lily Kitchen", price_range: "$4 - $8" },
  { name: "Enaq", price_range: "$8 - $15" },
  { name: "Princess Terrace", price_range: "$20 - $35" },
  { name: "Hillstreet Char Kway Teow", price_range: "$4 - $6" },
  { name: "Alice Boulangerie", price_range: "$10 - $20" },
  { name: "Yong Chun Wan Ton Noodle", price_range: "$4 - $6" },
  { name: "Hui Wei Chilli Ban Mian", price_range: "$4 - $6" },
  { name: "Chuan Kee Boneless Braised Duck", price_range: "$5 - $8" },
  { name: "Hwa Kee Barbeque Pork Noodles", price_range: "$4 - $7" },
  { name: "Tian Wai Tian Fish Head Steamboat", price_range: "$15 - $30" },
  { name: "Zai Shun Curry Fish Head", price_range: "$10 - $25" },
  { name: "Heng Heng Boneless Duck Rice", price_range: "$4 - $7" },
  { name: "Hello Arigato (Joo Chiat)", price_range: "$12 - $20" },
  { name: "Windowsill Pies", price_range: "$8 - $15" },
  { name: "Liu Ko Shui", price_range: "$4 - $8" },
  { name: "Sodam Korean Restaurant", price_range: "$12 - $20" },
  { name: "Eng Kee Bak Kut Teh", price_range: "$8 - $15" },
  { name: "Lixin Teochew Fishball Noodles", price_range: "$4 - $6" },
  { name: "Hor Fun Premium", price_range: "$5 - $10" },
  { name: "XLX Modern Tze Char", price_range: "$15 - $30" },
  { name: "Tasty Court", price_range: "$10 - $20" },
  { name: "Kim Choo Kueh Chang", price_range: "$3 - $8" },
  { name: "Nanyang Fried Chicken Rice", price_range: "$5 - $8" },
  { name: "Jungle", price_range: "$25 - $40" },
  { name: "Anglo Indian", price_range: "$20 - $35" },
  { name: "Common Man Coffee Roasters", price_range: "$15 - $25" },
  { name: "The Ramen House", price_range: "$12 - $18" },
  { name: "Jade's Chicken", price_range: "$10 - $18" },
  { name: "Momolato", price_range: "$8 - $15" },
  { name: "Inle Myanmar Restaurant", price_range: "$8 - $15" },
  { name: "Huang Hong Ji Porridge", price_range: "$4 - $8" },
  { name: "Spinach Soup", price_range: "$4 - $7" },
  { name: "Hvala", price_range: "$7 - $15" },
  { name: "Seng Kee Black Chicken Herbal Soup", price_range: "$8 - $15" },
  { name: "Hock Lam Beef Noodle", price_range: "$6 - $12" },
  { name: "The Butter Chicken Place", price_range: "$12 - $20" },
  { name: "Tan Ser Seng Herbs Restaurant", price_range: "$15 - $30" },
  { name: "Ben's Kitchen", price_range: "$8 - $15" },
  { name: "Miss Saigon (Somerset)", price_range: "$12 - $20" },
  { name: "Star Pho Le Beef Noodle Soup", price_range: "$8 - $15" },
  { name: "Singapore Fried Hokkien Mee", price_range: "$5 - $15" },
  { name: "Xiao Di Hokkien Mee", price_range: "$5 - $8" },
  { name: "Zhup Zhup", price_range: "$14 - $25" },
  { name: "Nam Sing Hokkien Fried Mee", price_range: "$5 - $8" },
  { name: "Umi Nami", price_range: "$15 - $25" },
  { name: "Kok Sen", price_range: "$12 - $48" },
  { name: "Mahmad's Tandoor", price_range: "$8 - $18" },
  { name: "Chong Ling Chinese Mixed Rice", price_range: "$4 - $8" },
  { name: "Fernweh", price_range: "$6 - $15" },
  { name: "Indocafe", price_range: "$26 - $98" },
  { name: "Miss Saigon (Bencoolen)", price_range: "$12 - $20" },
  { name: "Outram Park Fried Kway Teow Mee", price_range: "$4 - $8" },
  { name: "Jin Hua Fish Head Bee Hoon", price_range: "$5 - $12" },
  { name: "Lao Fu Zi Fried Kway Teow", price_range: "$4 - $8" },
  { name: "Yhingthai Palace", price_range: "$15 - $35" },
  { name: "Fook Kin", price_range: "$5 - $10" },
  { name: "NBCB", price_range: "$12 - $25" },
  { name: "Song Kee Eating House", price_range: "$5 - $10" },
  { name: "GamTan Korean Cuisine", price_range: "$15 - $30" },
  { name: "Goku Japanese Restaurant", price_range: "$20 - $40" },
  { name: "Song Kee Teochew Fish Porridge", price_range: "$6 - $12" },
  { name: "Ellenborough Market Cafe", price_range: "$30 - $50" },
  { name: "Jalan Sultan Prawn Mee", price_range: "$5 - $10" },
  { name: "China Whampoa Home Made Noodle", price_range: "$4 - $8" },
  { name: "Srisun Express", price_range: "$2 - $16" },
  { name: "Song Fa Bak Kut Teh", price_range: "$9 - $15" },
  { name: "Bugis Long House Lim Kee Beef Noodles", price_range: "$5 - $10" },
  { name: "Tiong Bahru Lien Fa Shui Jing Pau", price_range: "$2 - $5" },
  { name: "The Brewing Ground", price_range: "$5 - $15" },
  { name: "Jian Bo Tiong Bahru Shui Kueh", price_range: "$3 - $6" },
  { name: "L32 Handmade Noodles", price_range: "$5 - $8" },
  { name: "Johor Road Boon Kee Pork Porridge", price_range: "$4 - $8" },
  { name: "Sin Heng Kee Porridge", price_range: "$4 - $10" },
  { name: "Micro Bakery & Kitchen", price_range: "$10 - $25" },
  { name: "Warm Up Cafe", price_range: "$12 - $25" },
  { name: "A Noodle Story", price_range: "$9 - $16" },
  { name: "Dunman Road Char Siew Wanton Mee", price_range: "$4 - $8" },
  { name: "STR TAO", price_range: "$10 - $20" },
  { name: "Le Taste Bistro 8", price_range: "$10 - $18" },
  { name: "Eddy's", price_range: "$10 - $20" },
  { name: "Nylon Coffee Roasters", price_range: "$4 - $6" },
  { name: "Joo Siah Bak Koot Teh", price_range: "$5 - $9" },
  { name: "Anglo Indian Cafe & Bar", price_range: "$15 - $25" },
  { name: "Apiary", price_range: "$4 - $12" },
  { name: "Dopa", price_range: "$5 - $15" },
  { name: "Thai Village Restaurant", price_range: "$40 - $100" },
  { name: "Loy Kee Chicken Rice", price_range: "$9 - $20" },
  { name: "Al Falah Restaurant", price_range: "$4 - $10" },
  { name: "Yappari Steak", price_range: "$17 - $35" },
  { name: "Blanco Court Beef Noodles", price_range: "$8 - $17" },
  { name: "Leong Ji Kitchen", price_range: "$5 - $12" },
  { name: "Dickson Nasi Lemak", price_range: "$5 - $10" },
  { name: "Tiong Bahru Bakery", price_range: "$5 - $15" },
  { name: "Creme by Lele Bakery", price_range: "$5 - $15" },
  { name: "Lola's Cafe", price_range: "$15 - $25" },
  { name: "Joo Seng Teochew Porridge", price_range: "$5 - $15" },
  { name: "Han Kee", price_range: "$5 - $8" },
  { name: "Hai Nan Zai", price_range: "$4 - $8" },
  { name: "Nesuto", price_range: "$8 - $15" },
  { name: "Adam Rd Noo Cheng Big Prawn Noodle", price_range: "$6 - $13" },
  { name: "Un-Yang-Kor-Dai", price_range: "$12 - $25" },
  { name: "Ng Kuan Chilli Pan Mee", price_range: "$5 - $10" },
  { name: "Chilli Padi Nonya Restaurant", price_range: "$20 - $40" },
  { name: "What The Puff", price_range: "$3 - $8" },
  { name: "Beo Crescent Curry Rice", price_range: "$4 - $8" },
  { name: "KeonBae", price_range: "$25 - $50" },
  { name: "284 Kway Chap", price_range: "$5 - $10" },
  { name: "Nyonya Pok Pok Kay", price_range: "$5 - $10" },
  { name: "Cafe Colbar", price_range: "$8 - $18" },
  { name: "89.7FM Supper Club", price_range: "$8 - $18" },
  { name: "Kantin at Jewel", price_range: "$10 - $20" },
  { name: "Bistro Eminami Halal Vietnam", price_range: "$8 - $15" },
  { name: "Kim Keat Hokkien Mee", price_range: "$6 - $12" },
  { name: "Bulgogi Syo", price_range: "$15 - $30" },
  { name: "Charcoal Fish Head Steamboat", price_range: "$25 - $60" },
  { name: "The Coconut Club", price_range: "$15 - $25" },
  { name: "Wooly's Bagels", price_range: "$8 - $15" },
  { name: "ONE.85 Big Prawn Mee", price_range: "$6 - $12" },
  { name: "Ho Bee Roasted Food", price_range: "$4 - $8" },
  { name: "Kelantan Kway Chap Pig Organ Soup", price_range: "$5 - $10" },
  { name: "Bahrakath Mutton Soup", price_range: "$6 - $12" },
  { name: "Chey Sua Carrot Cake", price_range: "$3 - $6" },
  { name: "Chatterbox", price_range: "$25 - $40" },
  { name: "Chingu @ Rochester", price_range: "$30 - $60" },
  { name: "Jin Yu Man Tang", price_range: "$5 - $12" },
  { name: "133 Mian Fen Guo Ban Mian", price_range: "$4 - $8" },
  { name: "My Awesome Cafe", price_range: "$15 - $25" },
  { name: "Twirl Pasta", price_range: "$15 - $25" },
  { name: "Cafeela Roti Prata", price_range: "$3 - $10" },
  { name: "Nguan Express 88", price_range: "$4 - $10" },
  { name: "Ah Hua Teo Chew Noodle", price_range: "$4 - $8" },
  { name: "Monarchs & Milkweed", price_range: "$6 - $12" },
  { name: "Union Farm Chee Pow Kai", price_range: "$10 - $25" },
  { name: "Sin Chie Toke Huan Hainanese Curry Rice", price_range: "$5 - $10" },
  { name: "Seng Heng Atas Roasted Delight", price_range: "$5 - $8" },
  { name: "168 CMY Satay", price_range: "$6 - $10" },
  { name: "Kwang Kee Teochew Fish Porridge", price_range: "$7 - $12" },
  { name: "Sarawak Laksa & Kolo Mee", price_range: "$5 - $8" },
  { name: "Sin Huat Eating House", price_range: "$50 - $200" },
  { name: "Selamat Datang Warong Pak Sapari", price_range: "$4 - $9" },
  { name: "An La Ghien Buffet", price_range: "$20 - $35" },
  { name: "Pondok Selera by Nurul Hidayah", price_range: "$5 - $10" },
  { name: "Al-Azhar", price_range: "$5 - $15" },
  { name: "Le Da Chicken Rice", price_range: "$4 - $7" },
  { name: "Soi Thai Kitchen", price_range: "$10 - $20" },
  { name: "Hong Ji Claypot Herbal Bak Kut Teh", price_range: "$8 - $15" },
  { name: "Birds of Paradise", price_range: "$6 - $11" },
  { name: "Xiang Xiang Hunan Cuisine", price_range: "$15 - $30" },
  { name: "Al-Mahboob Rojak", price_range: "$5 - $10" },
  { name: "Thirteen BBQ Bar", price_range: "$15 - $30" },
  { name: "Bao Er Cafe", price_range: "$8 - $15" },
  { name: "Gyukatsu Kyoto Katsugyu", price_range: "$25 - $55" },
  { name: "Fu Ming Cooked Food", price_range: "$4 - $8" },
  { name: "Penang Man", price_range: "$5 - $10" },
  { name: "Liu Liang Mian", price_range: "$5 - $8" },
  { name: "Alliance Seafood", price_range: "$10 - $30" },
  { name: "Homm Dessert", price_range: "$8 - $15" },
  { name: "The French Ladle", price_range: "$15 - $25" },
  { name: "Indocafe Peranakan Dining", price_range: "$15 - $35" },
  { name: "Warabimochi Kamakura", price_range: "$8 - $15" },
  { name: "Jin Pai Zi Char", price_range: "$10 - $25" },
  { name: "Long House Soon Kee Boneless Braised Duck", price_range: "$5 - $10" },
  { name: "IRU DEN", price_range: "$80 - $200" },
  { name: "Da Shao Chong Qing Xiao Mian", price_range: "$6 - $12" },
  { name: "Fatty Ox HK Kitchen", price_range: "$4 - $8" },
  { name: "The Ramen Stall", price_range: "$12 - $20" },
  { name: "Heng Huat Fried Kway Tiao", price_range: "$5 - $8" },
  { name: "Plain Vanilla (Tiong Bahru)", price_range: "$8 - $15" },
  { name: "Hong Chang Frog Porridge", price_range: "$15 - $30" },
  { name: "Long Ji Zi Char", price_range: "$30 - $80" },
  { name: "Ri Ri Hong Mala Xiang Guo", price_range: "$10 - $20" },
  { name: "Spicy Wife Nasi Lemak", price_range: "$5 - $8" },
  { name: "Ipoh River Fish Tai Pai Tong", price_range: "$10 - $25" },
  { name: "Kwee Heng", price_range: "$5 - $10" },
  { name: "Munchi Pancakes", price_range: "$8 - $15" },
  { name: "Song Fish Soup", price_range: "$6 - $10" },
  { name: "Cumi Bali", price_range: "$15 - $30" },
  { name: "Mr Bucket Chocolaterie", price_range: "$10 - $20" },
  { name: "Rong Ji Chicken Rice & Porridge", price_range: "$4 - $8" },
  { name: "True Blue Cuisine", price_range: "$25 - $50" },
  { name: "Patisserie Clé", price_range: "$10 - $20" },
  { name: "Soon Heng Lor Mee", price_range: "$3 - $5" },
  { name: "Blanco Court Prawn Noodles", price_range: "$6 - $12" },
  { name: "Fico", price_range: "$40 - $80" },
  { name: "Yew Chuan Claypot Rice", price_range: "$8 - $15" },
  { name: "Yit Lim Hong Kong Soy Sauce Chicken Rice & Noodle", price_range: "$4 - $7" },
  { name: "Wok Hei Hor Fun", price_range: "$5 - $8" },
  { name: "JU95", price_range: "$50 - $100" },
  { name: "BistrOne36 at Tyrwhitt", price_range: "$20 - $40" },
  { name: "Qin Tang", price_range: "$15 - $30" },
  { name: "Kitchenman Nasi Lemak", price_range: "$5 - $10" },
  { name: "Charlie Peranakan Food", price_range: "$5 - $10" },
  { name: "Joji's Diner", price_range: "$15 - $25" },
  { name: "Jason Penang Cuisine", price_range: "$5 - $10" },
  { name: "99 Old Trees", price_range: "$8 - $15" },
  { name: "Classic Cakes", price_range: "$8 - $15" },
  { name: "Le Taste", price_range: "$15 - $25" },
  { name: "Supper Deck", price_range: "$15 - $25" },
  { name: "Baan Kai Khon", price_range: "$10 - $20" },
  { name: "Lim Fried Oyster", price_range: "$5 - $8" },
  { name: "Haidilao", price_range: "$40 - $60" },
  { name: "Lian He Ben Ji Claypot Rice", price_range: "$8 - $20" },
  { name: "Edith Patisserie", price_range: "$8 - $15" },
  { name: "Mr Baguette", price_range: "$5 - $10" },
  { name: "Ming Fa Fishball Noodles", price_range: "$4 - $7" },
  { name: "Song Yue Taiwan Cuisine", price_range: "$12 - $25" },
  { name: "Bismillah Biryani", price_range: "$10 - $18" },
  { name: "Little Rogue Coffee", price_range: "$8 - $18" },
  { name: "Hay Gelato", price_range: "$5 - $12" },
  { name: "RUBATO", price_range: "$25 - $45" },
  { name: "Hello Arigato (Upper Thomson)", price_range: "$12 - $25" },
  { name: "Beach Road Prawn Noodle House", price_range: "$6 - $12" },
  { name: "139 Hainan Chicken Rice", price_range: "$4 - $7" },
  { name: "Ji Ji Noodle House", price_range: "$4 - $7" },
  { name: "Wang Wang Crispy Curry Puff", price_range: "$2 - $5" },
  { name: "Yakiniku Warrior", price_range: "$30 - $60" },
  { name: "Krapow Thai Kitchen", price_range: "$10 - $20" },
  { name: "Lang Nuong Vietnam", price_range: "$15 - $30" },
  { name: "Azme Corner Nasi Lemak", price_range: "$4 - $8" },
  { name: "Hamburg Steak Keisuke", price_range: "$18 - $30" },
  { name: "Birds of Paradise (Katong)", price_range: "$6 - $11" },
  { name: "Xin Kee Hong Kong Cheong Fun", price_range: "$4 - $7" },
  { name: "Suk's Thai Kitchen", price_range: "$12 - $25" },
  { name: "D'Rubinah Restaurant", price_range: "$10 - $20" },
  { name: "Yat Ka Yan", price_range: "$8 - $15" },
  { name: "Swirled", price_range: "$8 - $15" },
  { name: "Hainan Beef Noodles Claypot Chicken Rice", price_range: "$5 - $10" },
  { name: "Pots & Prawns", price_range: "$15 - $30" },
  { name: "Good Bites", price_range: "$15 - $25" },
  { name: "Average Service", price_range: "$12 - $25" },
  { name: "The Populus Coffee and Food Co", price_range: "$12 - $25" },
  { name: "Sin Heng Claypot Bak Koot Teh", price_range: "$10 - $20" },
  { name: "133 Penang Authentic", price_range: "$4 - $6" },
  { name: "PRAIRIE by Craftsmen", price_range: "$20 - $35" },
  { name: "Bliss Nest Capsules", price_range: "$8 - $27" },
  { name: "Xiang Ji Chicken Rice", price_range: "$3 - $5" },
  { name: "Chong Pang Nasi Lemak", price_range: "$5 - $6" },
  { name: "Lai Heng Handmade Teochew Kueh", price_range: "$4 - $7" },
  { name: "Grain", price_range: "$15 - $20" },
  { name: "The Only Burger", price_range: "$9 - $15" },
  { name: "Fireplace by Bedrock", price_range: "$40 - $80" },
  { name: "505 Sembawang Bakchormee", price_range: "$5 - $10" },
  { name: "Tha Siam Authentic Thai Kitchen", price_range: "$10 - $20" },
  { name: "Hup Lee Economic Bee Hoon", price_range: "$3 - $5" },
  { name: "Punch", price_range: "$15 - $22" },
  { name: "Jin Jin Dessert", price_range: "$2 - $4" },
  { name: "Murugan Idli Shop", price_range: "$2 - $8" },
  { name: "Creamier Gillman Barracks", price_range: "$5 - $15" },
  { name: "Burnt Cones", price_range: "$5 - $16" },
  { name: "Tanuki Raw", price_range: "$13 - $30" },
  { name: "Waa Cow", price_range: "$15 - $30" },
  { name: "Bread Street Kitchen", price_range: "$40 - $80" },
  { name: "Praelum Wine Bistro", price_range: "$30 - $60" },
  { name: "Artichoke", price_range: "$25 - $70" },
  { name: "Blue Jasmine", price_range: "$12 - $30" },
  { name: "Dumpling Darlings", price_range: "$8 - $22" },
  { name: "Fireplace", price_range: "$20 - $35" },
  { name: "Hong Kong Yummy Soup", price_range: "$4 - $6" },
  { name: "First Street Teochew Fish Soup", price_range: "$5 - $8" },
  { name: "EarlyAfter", price_range: "$10 - $18" },
  { name: "Fung Yi Delights", price_range: "$4 - $6" },
  { name: "Hai Nan Xing Zhou Beef Noodle", price_range: "$5 - $8" },
  { name: "Wildseed Cafe", price_range: "$15 - $25" },
  { name: "Atlas Coffeehouse", price_range: "$17 - $28" },
  { name: "JOFA Grill", price_range: "$6 - $10" },
  { name: "Sourbombe Artisanal Bakery (Park Mall)", price_range: "$4 - $6" },
  { name: "Zhou Zhen Zhen Vermicelli & Noodles", price_range: "$4 - $6" },
  { name: "Five Oars Coffee Roasters", price_range: "$12 - $20" },
  { name: "Hokkien Man Hokkien Mee", price_range: "$5 - $8" },
  { name: "Swee Choon", price_range: "$15 - $25" },
  { name: "Luna", price_range: "$10 - $18" },
  { name: "Café Carrera", price_range: "$10 - $18" },
  { name: "Sin Kee Seafood Soup", price_range: "$5 - $10" },
  { name: "Entrepot", price_range: "$15 - $25" },
  { name: "Yao Cutlet", price_range: "$8 - $12" },
  { name: "Thunderbolt Tea by Boon Lay Traditional Hakka Lui Cha", price_range: "$5 - $8" },
  { name: "Coexist Coffee Co.", price_range: "$8 - $15" },
  { name: "Duke Dessert", price_range: "$5 - $10" },
  { name: "Legacy Pork Noodles", price_range: "$4 - $6" },
  { name: "Loo's Hainanese Curry Rice", price_range: "$4 - $6" },
  { name: "Huat Kee Kway Chap", price_range: "$5 - $8" },
  { name: "Finest Song Kee Fishball Noodles", price_range: "$4 - $6" },
  { name: "B.B.Q Seafood", price_range: "$15 - $30" },
  { name: "Fei Fei Roasted Noodle", price_range: "$3 - $6" },
  { name: "Gyushi", price_range: "$12 - $20" },
  { name: "Chef Wang Fried Rice", price_range: "$5 - $8" },
  { name: "Chef Choo Signature", price_range: "$10 - $18" },
  { name: "Petit Pain Bakery", price_range: "$5 - $12" },
  { name: "Alchemist (The Mill)", price_range: "$15 - $25" },
  { name: "Overrice", price_range: "$6 - $10" },
  { name: "Ernie's Coffee", price_range: "$5 - $8" },
  { name: "168 Neapolitan Style Pizza", price_range: "$8 - $15" },
  { name: "Eightisfy Western", price_range: "$6 - $12" },
  { name: "Fa Ji Minced Meat Fishball Noodle", price_range: "$4 - $6" },
  { name: "Sourbombe Artisanal Bakery", price_range: "$4 - $6" },
  { name: "The Dim Sum Place", price_range: "$4 - $10" },
  { name: "Ar Er Soup (Ah Er Herbal Soup)", price_range: "$4 - $8" },
  { name: "Steam Rice Kitchen", price_range: "$5 - $8" },
  { name: "Goldenroy Sourdough Pizza", price_range: "$12 - $18" },
  { name: "Yuan Zhi Wei", price_range: "$4 - $7" },
  { name: "Jing Hua Xiao Chi", price_range: "$8 - $15" },
  { name: "Deen Tiga Rasa", price_range: "$4 - $7" },
  { name: "Zhi Wei Xian Zion Road Big Prawn Noodle", price_range: "$8 - $28" },
  { name: "Hon Ni Kitchen", price_range: "$5 - $8" },
  { name: "Hoo Kee Bak Chang", price_range: "$4 - $6" },
  { name: "Chop Chop Biryani", price_range: "$8 - $12" },
  { name: "Na Na Curry", price_range: "$5 - $35" },
  { name: "NiuNiu Tea & DuDu Rice", price_range: "$5 - $10" },
  { name: "Banh Mi 90s", price_range: "$5 - $8" },
  { name: "Heng Kee", price_range: "$6 - $9" },
  { name: "Ji De Lai Hainanese Chicken Rice", price_range: "$4 - $6" },
  { name: "Standing Sushi Bar", price_range: "$6 - $120" },
  { name: "Flaming Wagyu", price_range: "$15 - $25" },
  { name: "Xin Mei Xiang Lor Mee", price_range: "$4 - $6" },
  { name: "Da Shi Jia Big Prawn Mee", price_range: "$6 - $15" },
  { name: "2am Dessert Bar", price_range: "$18 - $22" },
  { name: "Tea Chapter", price_range: "$10 - $30" },
  { name: "JUMBO Seafood", price_range: "$50 - $60" },
  { name: "Chingu @ The Oval", price_range: "$10 - $18" },
  { name: "The Roti Prata House", price_range: "$1 - $6" },
  { name: "Ah Er Herbal Soup", price_range: "$4 - $8" },
  { name: "Cheok Kee", price_range: "$4 - $7" },
  { name: "Lao Gai Mee", price_range: "$4 - $6" },
  { name: "Style Palate", price_range: "$10 - $15" },
  { name: "Song Fa Signatures", price_range: "$9 - $15" },
  { name: "Tracy's Sarawak Kitchen", price_range: "$8 - $15" },
  { name: "Hua Kee Chicken Rice", price_range: "$4 - $6" },
  { name: "Tan Xiang Chai Chee", price_range: "$5 - $10" },
  { name: "Yang Ming Seafood", price_range: "$20 - $40" },
  { name: "Chai Chuan Tou Yang Rou Tang", price_range: "$6 - $10" },
  { name: "Heng Heng Cooked Food", price_range: "$5 - $10" },
  { name: "Joo Chiat Banh Mi Ca Phe", price_range: "$5 - $8" },
  { name: "Lian Hup Heng", price_range: "$4 - $8" },
  { name: "Heng (Carrot Cake)", price_range: "$3 - $5" },
  { name: "Omar's Thai Beef Noodles", price_range: "$5 - $8" },
  { name: "Fortuna Terrazza", price_range: "$12 - $25" },
  { name: "Sin Hoi Sai Eating House", price_range: "$6 - $90" },
  { name: "Estuary Restaurant & Bar", price_range: "$15 - $35" },
  { name: "Tian Tian Hainanese Chicken Rice", price_range: "$5 - $9" },
  { name: "Bedok Chwee Kueh", price_range: "$2 - $3" },
  { name: "Roast Paradise", price_range: "$4 - $10" },
  { name: "Beach Road Fish Head Bee Hoon", price_range: "$4 - $7" },
  { name: "Lau Goh Teochew Chye Thow Kway", price_range: "$3 - $5" },
  { name: "Da Ji Hainanese Chicken Rice", price_range: "$4 - $6" },
  { name: "The Noodle Memories", price_range: "$4 - $6" },
  { name: "RAKU Rice Bowls & Donburis", price_range: "$8 - $15" },
  { name: "Ipoh Zai Hakka Noodles", price_range: "$4 - $6" },
  { name: "Tai Seng Fish Soup", price_range: "$5 - $8" },
  { name: "Islamic Restaurant", price_range: "$10 - $15" },
  { name: "Hock Kee Bak Kut Teh", price_range: "$7 - $12" },
  { name: "Old Amoy Chendol", price_range: "$2 - $4" },
  { name: "Whole Earth", price_range: "$19 - $26" },
  { name: "J.B. Ah Meng Restaurant", price_range: "$15 - $30" },
  { name: "San Shu Gong Private Dining", price_range: "$30 - $50" },
  { name: "No.18 Zion Road Fried Kway Teow", price_range: "$4 - $6" },
  { name: "Long Beach Seafood", price_range: "$40 - $80" },
  { name: "Ma La Yi Virgin Chicken", price_range: "$4 - $6" },
  { name: "Fortune Bak Kut Teh", price_range: "$8 - $15" },
  { name: "Koh Brother Pig's Organ Soup", price_range: "$5 - $8" },
  { name: "Dudu Cooked Food", price_range: "$4 - $7" },
  { name: "Chuan Fried Hokkien Prawn Mee", price_range: "$5 - $8" },
  { name: "Harvest Salad x Protein Bowl", price_range: "$10 - $15" },
  { name: "Big Prawn Noodle", price_range: "$6 - $10" },
  { name: "Cha Mulan", price_range: "$5 - $8" },
  { name: "Beach Road Scissors Cut Curry Rice", price_range: "$4 - $7" },
  { name: "Ming Chung White Lor Mee", price_range: "$4 - $6" },
  { name: "Kazutake Ramen (AMK)", price_range: "$10 - $15" },
  { name: "Hong Heng Fried Sotong Prawn Mee", price_range: "$5 - $8" },
  { name: "Elijah Pies", price_range: "$8 - $15" },
  { name: "Pong Cheer Cheer", price_range: "$10 - $20" },
  { name: "Fire Flies", price_range: "$4 - $8" },
  { name: "Yaowarat Thai Kway Chap", price_range: "$6 - $10" },
  { name: "Gokul Raas Vegetarian Restaurant", price_range: "$8 - $12" },
  { name: "New Lucky Claypot Rice", price_range: "$8 - $10" },
  { name: "Kotuwa", price_range: "$16 - $42" },
  { name: "Braise", price_range: "$5 - $10" },
  { name: "Shang Hai Fried Xiao Long Bao", price_range: "$5 - $8" },
  { name: "Hjh Maimunah Restaurant", price_range: "$8 - $12" },
  { name: "Matchaya", price_range: "$8 - $15" },
  { name: "Ming Qi Fried Hokkien Prawn Noodle", price_range: "$5 - $8" },
  { name: "TANOKE", price_range: "$20 - $40" },
  { name: "Ji Ji Wanton Noodle Specialist", price_range: "$4 - $6" },
  { name: "Ping Xiang Wanton Mee", price_range: "$4 - $6" },
  { name: "Lau Phua Chay Authentic Roasted Delicacies", price_range: "$5 - $10" },
  { name: "Lagnaa", price_range: "$23 - $52" },
  { name: "Whiskdom", price_range: "$6 - $12" },
  { name: "Ramen Taisho", price_range: "$10 - $15" },
  { name: "Greenwood Fish Market", price_range: "$16 - $40" },
];

// Parse price range string to get min and max values
function parsePriceRange(priceRange) {
  // Handle special cases like "$50 - $200+"
  const cleaned = priceRange.replace(/\+/g, '').replace(/\/pax/gi, '').replace(/\/set/gi, '');
  const match = cleaned.match(/\$(\d+(?:\.\d{2})?)\s*-\s*\$(\d+(?:\.\d{2})?)/);
  if (match) {
    return {
      min: parseFloat(match[1]),
      max: parseFloat(match[2])
    };
  }
  return null;
}

// Normalize name for matching (lowercase, remove special chars)
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fuzzy match score (lower is better)
function getMatchScore(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Exact match
  if (n1 === n2) return 0;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 1;

  // Check if main part matches (before parentheses)
  const n1Base = n1.split('(')[0].trim();
  const n2Base = n2.split('(')[0].trim();
  if (n1Base === n2Base) return 2;
  if (n1Base.includes(n2Base) || n2Base.includes(n1Base)) return 3;

  return -1; // No match
}

async function main() {
  console.log('Fetching food listings from database...\n');

  // Get all food listings
  const { data: listings, error } = await supabase
    .from('food_listings')
    .select('id, name')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} listings in database`);
  console.log(`Have ${priceData.length} price entries to match\n`);

  const matched = [];
  const unmatched = [];

  // Try to match each price entry to a listing
  for (const price of priceData) {
    let bestMatch = null;
    let bestScore = Infinity;

    for (const listing of listings) {
      const score = getMatchScore(price.name, listing.name);
      if (score >= 0 && score < bestScore) {
        bestScore = score;
        bestMatch = listing;
      }
    }

    if (bestMatch) {
      const parsed = parsePriceRange(price.price_range);
      matched.push({
        listing_id: bestMatch.id,
        listing_name: bestMatch.name,
        csv_name: price.name,
        price_range: price.price_range,
        price_min: parsed?.min,
        price_max: parsed?.max,
        match_score: bestScore
      });
    } else {
      unmatched.push(price);
    }
  }

  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched: ${unmatched.length}\n`);

  // Show some unmatched for debugging
  if (unmatched.length > 0) {
    console.log('=== UNMATCHED ENTRIES (first 20) ===');
    unmatched.slice(0, 20).forEach(u => console.log(`  - ${u.name}`));
    console.log('');
  }

  // Generate SQL INSERT statements
  console.log('=== SQL INSERT STATEMENTS ===\n');
  console.log('-- Insert price ranges into listing_prices table');
  console.log('-- Each listing gets a single "Price Range" entry\n');

  console.log('INSERT INTO listing_prices (listing_id, item_name, price, description, is_signature, sort_order) VALUES');

  const sqlValues = matched.map((m, idx) => {
    // Use the min price as the base price, store the range in description
    const price = m.price_min || 0;
    const description = m.price_range;
    const comma = idx === matched.length - 1 ? ';' : ',';
    return `  ('${m.listing_id}', 'Price Range', ${price}, '${description}', true, 0)${comma}`;
  });

  sqlValues.forEach(v => console.log(v));

  console.log('\n-- Total entries:', matched.length);
}

main().catch(console.error);

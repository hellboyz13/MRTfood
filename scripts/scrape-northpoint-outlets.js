const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// All outlets from CSV
const allOutlets = [
  { name: 'A-One Signature', level: 'L1', wing: 'South Wing' },
  { name: "Ajumma's", level: 'B1', wing: 'South Wing' },
  { name: 'Alley.Wei', level: 'B1', wing: 'South Wing' },
  { name: 'An Acai Affair', level: 'B2', wing: 'South Wing' },
  { name: "Arnold's Fried Chicken", level: 'L1', wing: 'Yishun 10' },
  { name: "Auntie Anne's", level: 'B1', wing: 'North Wing' },
  { name: 'Ayam Penyet President', level: 'B1', wing: 'North Wing' },
  { name: 'Ban Heng Teochew Porridge', level: 'B2', wing: 'North Wing' },
  { name: 'Baskin Robbins', level: 'L1', wing: 'South Wing' },
  { name: "Beard Papa's", level: 'L1', wing: 'South Wing' },
  { name: 'Mr. Onigiri', level: 'B2', wing: 'South Wing' },
  { name: 'SEOUL NOODLE SHOP', level: 'L2', wing: 'South Wing' },
  { name: 'Bee Cheng Hiang', level: 'B2', wing: 'South Wing' },
  { name: 'Bengawan Solo', level: 'B1', wing: 'North Wing' },
  { name: 'BeuTea', level: 'L1', wing: 'South Wing' },
  { name: 'Boost Juice Bars', level: 'L1', wing: 'North Wing' },
  { name: 'BreadTalk/Toast Box', level: 'L1', wing: 'North Wing' },
  { name: 'Bugis Xin Yuan Ji', level: 'B2', wing: 'North Wing' },
  { name: 'Burger King', level: 'L1', wing: 'Yishun Town Square' },
  { name: 'Cai-Ca', level: 'L1', wing: 'North Wing' },
  { name: 'Cantine', level: 'L2', wing: 'South Wing' },
  { name: 'Cat & the Fiddle', level: 'L1', wing: 'South Wing' },
  { name: 'Cellarbration', level: 'B2', wing: 'North Wing' },
  { name: 'Chao Yue Xuan Dim Sum Express', level: 'B1', wing: 'North Wing' },
  { name: 'ChaPanda', level: 'B2', wing: 'South Wing' },
  { name: 'Chateraise', level: 'L1', wing: 'South Wing' },
  { name: 'CHICHA San Chen', level: 'B2', wing: 'North Wing' },
  { name: 'Chocolate Origin', level: 'B2', wing: 'South Wing' },
  { name: 'CocoNutnut', level: 'B2', wing: 'South Wing' },
  { name: "COLLIN'S", level: 'L1', wing: 'South Wing' },
  { name: 'Country Brot by Four Leaves', level: 'B1', wing: 'North Wing' },
  { name: 'Crave', level: 'B1', wing: 'North Wing' },
  { name: 'Crolo', level: 'B2', wing: 'South Wing' },
  { name: 'Delifrance', level: 'L1', wing: 'South Wing' },
  { name: 'Dian Xiao Er', level: 'L2', wing: 'North Wing' },
  { name: 'Din Tai Fung', level: 'B1', wing: 'South Wing' },
  { name: 'Dough Culture', level: 'B1', wing: 'North Wing' },
  { name: 'Dough Magic', level: 'B2', wing: 'South Wing' },
  { name: "Dunkin' Donuts", level: 'B1', wing: 'North Wing' },
  { name: 'Eastern Rice Dumpling', level: 'B1', wing: 'North Wing' },
  { name: 'EAT.', level: 'B2', wing: 'North Wing' },
  { name: 'Encik Tan', level: 'L1', wing: 'North Wing' },
  { name: 'Fa Ji Lao Wan Mian', level: 'L1', wing: 'South Wing' },
  { name: 'Famous Amos', level: 'B1', wing: 'North Wing' },
  { name: 'Feng Food', level: 'B1', wing: 'South Wing' },
  { name: 'Fragrance', level: 'B2', wing: 'North Wing' },
  { name: 'Fried Chicken Master', level: 'B2', wing: 'South Wing' },
  { name: 'Fruit Box', level: 'B2', wing: 'South Wing' },
  { name: 'Fun Toast', level: 'L2', wing: 'South Wing' },
  { name: 'Gelare', level: 'L2', wing: 'South Wing' },
  { name: 'Genki Sushi', level: 'L2', wing: 'North Wing' },
  { name: 'Gochi-So Shokudo', level: 'L2', wing: 'North Wing' },
  { name: 'Gokoku Japanese Bakery', level: 'B1', wing: 'North Wing' },
  { name: 'Gong Yuan Ma La Tang', level: 'B1', wing: 'South Wing' },
  { name: 'Greendot', level: 'B2', wing: 'North Wing' },
  { name: 'Guzman Y Gomez', level: 'L1', wing: 'South Wing' },
  { name: 'HaiDiLao', level: 'B1', wing: 'South Wing' },
  { name: 'Hakka Yu', level: 'L1', wing: 'South Wing' },
  { name: 'Hatsumi Donburi & Soba', level: 'L2', wing: 'South Wing' },
  { name: 'Hockhua Herbal Tea', level: 'B2', wing: 'South Wing' },
  { name: 'i MANGO COTTON ICE FRESH MILK TEA OMELETTE RICE', level: 'B1', wing: 'South Wing' },
  { name: 'Hong Kong Egglet', level: 'B1', wing: 'North Wing' },
  { name: 'Hong Lim Curry Puff', level: 'B2', wing: 'South Wing' },
  { name: 'Hot Tomato', level: 'L2', wing: 'South Wing' },
  { name: 'I Love Taimei', level: 'B2', wing: 'South Wing' },
  { name: 'iTea', level: 'B2', wing: 'South Wing' },
  { name: 'Ji De Chi Dessert', level: 'B1', wing: 'South Wing' },
  { name: 'Jianghu Hotpot', level: 'L2', wing: 'South Wing' },
  { name: 'Jinjja Chicken', level: 'L1', wing: 'North Wing' },
  { name: 'Joe & Dough', level: 'L1', wing: 'South Wing' },
  { name: 'KAZO', level: 'B2', wing: 'South Wing' },
  { name: 'Kebabs Faktory', level: 'B2', wing: 'South Wing' },
  { name: 'KFC', level: 'L1', wing: 'South Wing' },
  { name: 'KOI The', level: 'L1', wing: 'Yishun 10' },
  { name: 'KOI The Express', level: 'B2', wing: 'South Wing' },
  { name: "Komala's", level: 'L1', wing: 'Yishun 10' },
  { name: 'Koong Woh Tong', level: 'B2', wing: 'South Wing' },
  { name: 'Kopi & Tarts', level: 'L1', wing: 'South Wing' },
  { name: 'Kopitiam', level: 'B2', wing: 'North Wing' },
  { name: 'Krispy Kreme', level: 'L1', wing: 'South Wing' },
  { name: 'Kuriya Japanese Market', level: 'B1', wing: 'South Wing' },
  { name: 'LeNu', level: 'B1', wing: 'South Wing' },
  { name: 'Little Pond', level: 'B1', wing: 'South Wing' },
  { name: 'llaollao', level: 'L1', wing: 'South Wing' },
  { name: "Long John Silver's", level: 'L1', wing: 'North Wing' },
  { name: 'Luckin Coffee', level: 'L1', wing: 'North Wing' },
  { name: 'Maki-San', level: 'B2', wing: 'South Wing' },
  { name: 'Malaysia Boleh!', level: 'B1', wing: 'South Wing' },
  { name: "McDonald's", level: 'L1', wing: 'North Wing' },
  { name: 'Mei Heong Yuen Dessert', level: 'L2', wing: 'South Wing' },
  { name: 'Mincheng Bibimbap', level: 'L2', wing: 'North Wing' },
  { name: 'Ministry of Rojak', level: 'B2', wing: 'South Wing' },
  { name: 'Mister Donut', level: 'B1', wing: 'South Wing' },
  { name: 'MIXUE', level: 'B1', wing: 'North Wing' },
  { name: 'Monster Curry', level: 'B1', wing: 'South Wing' },
  { name: 'MOS Burger', level: 'L1', wing: 'North Wing' },
  { name: 'Mr Bean', level: 'L1', wing: 'North Wing' },
  { name: 'Mr Teh Tarik Express', level: 'L1', wing: 'North Wing' },
  { name: 'Mr. Coconut', level: 'B1', wing: 'North Wing' },
  { name: 'Munchi Pancakes', level: 'B2', wing: 'South Wing' },
  { name: 'Nakhon Kitchen', level: 'L2', wing: 'South Wing' },
  { name: 'Nam Kee Pau', level: 'B1', wing: 'North Wing' },
  { name: 'Namu Bulgogi', level: 'B1', wing: 'South Wing' },
  { name: 'Nine Fresh', level: 'B2', wing: 'South Wing' },
  { name: 'Old Chang Kee', level: 'L1', wing: 'North Wing' },
  { name: 'Papa Ayam', level: 'B1', wing: 'South Wing' },
  { name: 'Paris Baguette', level: 'L2', wing: 'North Wing' },
  { name: 'PastaMania', level: 'L3', wing: 'North Wing' },
  { name: 'Pezzo', level: 'B2', wing: 'South Wing' },
  { name: 'Pizza Nation', level: 'B2', wing: 'South Wing' },
  { name: 'PlayMade', level: 'L1', wing: 'South Wing' },
  { name: 'Polar Puffs & Cakes', level: 'B1', wing: 'North Wing' },
  { name: 'Popeyes', level: 'L1', wing: 'North Wing' },
  { name: 'Potato Corner', level: 'B2', wing: 'South Wing' },
  { name: 'PrimaDeli', level: 'B1', wing: 'North Wing' },
  { name: 'PUTIEN', level: 'L2', wing: 'North Wing' },
  { name: 'Qi Ji', level: 'B1', wing: 'South Wing' },
  { name: 'Qian Wei Shan Dong Da Bao', level: 'B2', wing: 'South Wing' },
  { name: 'Rive Gauche Patisserie', level: 'B2', wing: 'South Wing' },
  { name: 'Riverside Canton Claypot Cuisine', level: 'B1', wing: 'South Wing' },
  { name: 'rrooll', level: 'B2', wing: 'South Wing' },
  { name: 'Sakon Thai', level: 'L1', wing: 'South Wing' },
  { name: "Sakunthala's Restaurant", level: 'L1', wing: 'Yishun Town Square' },
  { name: 'Sanook Kitchen', level: 'B1', wing: 'North Wing' },
  { name: 'SEORAE Korean Charcoal BBQ', level: 'B1', wing: 'North Wing' },
  { name: 'Seoul Garden', level: 'L3', wing: 'North Wing' },
  { name: 'Seoul Garden HotPot', level: 'L3', wing: 'North Wing' },
  { name: 'Shabu Sai', level: 'B1', wing: 'South Wing' },
  { name: 'Sharetea Premium', level: 'B1', wing: 'North Wing' },
  { name: 'Shihlin Taiwan Street Snacks', level: 'B1', wing: 'North Wing' },
  { name: 'Shu Liu Xiang', level: 'L1', wing: 'Yishun Town Square' },
  { name: 'Sichuan Chef', level: 'B1', wing: 'South Wing' },
  { name: 'snacKING Retro Biscuits Express', level: 'L2', wing: 'South Wing' },
  { name: 'Song Fa Bak Kut Teh', level: 'B1', wing: 'North Wing' },
  { name: 'Starbucks', level: 'L1', wing: 'North Wing' },
  { name: "Stuff'd", level: 'B1', wing: 'North Wing' },
  { name: 'Subway', level: 'B2', wing: 'North Wing' },
  { name: 'Sukiya', level: 'L1', wing: 'South Wing' },
  { name: 'Suparakki Ramen', level: 'B2', wing: 'South Wing' },
  { name: 'Super Sushi', level: 'B1', wing: 'North Wing' },
  { name: 'Supergreen', level: 'B1', wing: 'North Wing' },
  { name: 'Sushi Express', level: 'B1', wing: 'South Wing' },
  { name: 'SUSHI GOGO', level: 'B2', wing: 'South Wing' },
  { name: 'Sushi Tei', level: 'L2', wing: 'North Wing' },
  { name: 'Swee Heng 1989 Classic', level: 'B2', wing: 'South Wing' },
  { name: "Swensen's", level: 'L2', wing: 'North Wing' },
  { name: 'Tai Cheong Bakery', level: 'B2', wing: 'South Wing' },
  { name: 'Tai Chong Kok', level: 'B1', wing: 'North Wing' },
  { name: 'Talad Thai Banana', level: 'B2', wing: 'South Wing' },
  { name: 'Tangled', level: 'L1', wing: 'South Wing' },
  { name: 'TAOYUAN', level: 'B1', wing: 'North Wing' },
  { name: 'Teppan-Yaki', level: 'B1', wing: 'South Wing' },
  { name: 'The Coffee Bean & Tea Leaf', level: 'L1', wing: 'South Wing' },
  { name: 'The Hainan Story Coffee House', level: 'B1', wing: 'North Wing' },
  { name: 'The Kind Bowl', level: 'B1', wing: 'North Wing' },
  { name: 'The Original Vadai', level: 'B2', wing: 'South Wing' },
  { name: 'The Soup Spoon', level: 'B2', wing: 'South Wing' },
  { name: 'Tokyo Shokudo', level: 'L1', wing: 'South Wing' },
  { name: 'Tongue Tip Lanzhou Beef Noodles', level: 'B1', wing: 'South Wing' },
  { name: 'Tonkotsu Kazan Ramen', level: 'B1', wing: 'South Wing' },
  { name: 'Tori-Q', level: 'B1', wing: 'South Wing' },
  { name: 'Tous les Jours', level: 'L1', wing: 'South Wing' },
  { name: 'Tun Xiang Hokkien Delights', level: 'L2', wing: 'North Wing' },
  { name: 'Twyst', level: 'B2', wing: 'South Wing' },
  { name: 'Wanpo Tea Shop', level: 'B2', wing: 'South Wing' },
  { name: 'WOK HEY', level: 'B1', wing: 'North Wing' },
  { name: 'Xi Chuan Chuan', level: 'B2', wing: 'South Wing' },
  { name: 'XIANG XIANG HUNAN CUISINE', level: 'L1', wing: 'South Wing' },
  { name: 'Xin Wang Hong Kong Cafe', level: 'L1', wing: 'North Wing' },
  { name: 'XW Plus Western Grill', level: 'L1', wing: 'South Wing' },
  { name: 'Ya Kun Kaya Toast', level: 'B1', wing: 'North Wing' },
  { name: 'Yakiniku Shokudo', level: 'L2', wing: 'South Wing' },
  { name: 'Yappari Steak', level: 'B1', wing: 'South Wing' },
  { name: 'YAYOI', level: 'B1', wing: 'South Wing' },
  { name: 'YGF Malatang', level: 'B1', wing: 'North Wing' },
  { name: 'Yummi House', level: 'B1', wing: 'South Wing' },
  { name: 'ZUS Coffee', level: 'L1', wing: 'South Wing' },
];

function nameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/[''"]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uploadThumbnail(outletId, imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const fileName = `${outletId}.jpg`;

    const { error } = await supabase.storage
      .from('thumbnails')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from('thumbnails').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== SCRAPING NORTHPOINT CITY OUTLETS ===\n');

  // Get existing outlets
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', 'northpoint-city');

  const existingNames = new Set(existing?.map(e => e.name.toLowerCase()) || []);

  // Filter outlets to scrape
  const toScrape = allOutlets.filter(o => !existingNames.has(o.name.toLowerCase()));
  console.log(`Existing: ${existingNames.size}, To scrape: ${toScrape.length}\n`);

  if (toScrape.length === 0) {
    console.log('All outlets already exist!');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let success = 0, failed = 0;
  const results = [];

  for (let i = 0; i < toScrape.length; i++) {
    const outlet = toScrape[i];
    const slug = nameToSlug(outlet.name);
    const url = `https://northpointcity.com.sg/stores/${slug}`;

    console.log(`[${i + 1}/${toScrape.length}] ${outlet.name}`);
    console.log(`  URL: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2000);

      // Extract data
      const data = await page.evaluate(() => {
        // Thumbnail - look for store image
        const imgEl = document.querySelector('.store-image img, .store-logo img, [class*="store"] img');
        const thumbnail = imgEl?.src || null;

        // Opening hours
        const hoursEl = document.querySelector('[class*="hours"], [class*="opening"], .store-hours');
        let openingHours = hoursEl?.innerText?.trim() || null;

        // Try alternate selectors
        if (!openingHours) {
          const allText = document.body.innerText;
          const hoursMatch = allText.match(/(\d{1,2}[:.]\d{2}\s*(?:am|pm|AM|PM)\s*[-–to]+\s*\d{1,2}[:.]\d{2}\s*(?:am|pm|AM|PM))/i);
          openingHours = hoursMatch ? hoursMatch[1] : null;
        }

        // Unit number
        const unitEl = document.querySelector('[class*="unit"], [class*="location"], .store-location');
        let unitNumber = unitEl?.innerText?.trim() || null;

        // Try to find unit pattern
        if (!unitNumber) {
          const allText = document.body.innerText;
          const unitMatch = allText.match(/(#[B\d]+-\d+[A-Z]?)/i);
          unitNumber = unitMatch ? unitMatch[1] : null;
        }

        return { thumbnail, openingHours, unitNumber };
      });

      console.log(`  Thumbnail: ${data.thumbnail ? 'Found' : 'Not found'}`);
      console.log(`  Hours: ${data.openingHours || 'Not found'}`);
      console.log(`  Unit: ${data.unitNumber || 'Not found'}`);

      // Insert to database - store scraped unit in level column if available, else use CSV level
      const { data: inserted, error } = await supabase
        .from('mall_outlets')
        .insert({
          name: outlet.name,
          mall_id: 'northpoint-city',
          level: data.unitNumber || `${outlet.wing}, ${outlet.level}`,
          opening_hours: data.openingHours,
        })
        .select('id')
        .single();

      if (error) {
        console.log(`  ✗ DB Error: ${error.message}`);
        failed++;
        continue;
      }

      // Upload thumbnail if found
      if (data.thumbnail && inserted?.id) {
        const thumbUrl = await uploadThumbnail(inserted.id, data.thumbnail);
        if (thumbUrl) {
          await supabase
            .from('mall_outlets')
            .update({ thumbnail_url: thumbUrl })
            .eq('id', inserted.id);
          console.log(`  + Thumbnail uploaded`);
        }
      }

      console.log(`  ✓ Saved`);
      success++;
      results.push({ name: outlet.name, status: 'OK', ...data });

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      failed++;
      results.push({ name: outlet.name, status: 'FAILED', error: err.message });
    }

    // Small delay between requests
    await page.waitForTimeout(500);
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);

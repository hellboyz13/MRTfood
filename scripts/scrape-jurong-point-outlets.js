const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// All outlets from Jurong Point
const allOutlets = [
  { name: '4Fingers Crispy Chicken', unit: '#JP102-42' },
  { name: 'A&W', unit: '#JP203-42' },
  { name: "Andersen's of Denmark", unit: '#JP102-K6' },
  { name: 'A-One Signature', unit: '#JP203-90 to 95' },
  { name: 'Bakery Cuisine', unit: '#JP1B1-23' },
  { name: 'BASKIN ROBBINS', unit: '#JP2B1-31' },
  { name: 'BBQ Box', unit: '#JP201-94/95/96/97A' },
  { name: 'Bee Cheng Hiang', unit: '#JP1B1-04' },
  { name: 'Bengawan Solo', unit: '#JP1B1-05' },
  { name: 'Boost Juice', unit: '#JP1B1-25' },
  { name: 'BreadTalk / Toastbox', unit: '#JP2B1-72/73' },
  { name: 'Brio', unit: '#JP102-24 & K5' },
  { name: 'Burger King', unit: '#JP2B1-54/55' },
  { name: 'Butter & Cream', unit: '#JP203-89A' },
  { name: 'Cai Lin Ji', unit: '#JP203-56' },
  { name: 'Cantine', unit: '#JP1B1-42/43/44' },
  { name: 'Chateraise', unit: '#JP1B1-21' },
  { name: 'Cheongsujeong Korean Kitchen', unit: '#JP103-34' },
  { name: 'CHICHA San Chen', unit: '#JP203-32, 33' },
  { name: 'Chocolate Origin', unit: '#JP102-K3' },
  { name: 'City Hot Pot', unit: '#JP101-17' },
  { name: "COLLIN'S", unit: '#JP203-58/59' },
  { name: 'Crave', unit: '#JP1B1-03' },
  { name: 'CROLO by Swee Heng', unit: '#JP201-28' },
  { name: 'Crystal Jade La Mian Xiao Long Bao', unit: '#JP203-96 to 104' },
  { name: 'Dabba Street', unit: '#JP201-31' },
  { name: 'Devil Chicken', unit: '#JP203-89F' },
  { name: 'Dian Xiao Er', unit: '#JP2B1-57/58/59' },
  { name: 'Din Tai Fung', unit: '#JP2B1-68/69' },
  { name: 'Dough Magic', unit: '#JP203-89D' },
  { name: "Dunkin' Donuts", unit: '#JP101-K6' },
  { name: 'EAT.', unit: '#JP201-76/77/78' },
  { name: 'Famous Amos', unit: '#JP1B1-01' },
  { name: "Farmer's Brew", unit: '#JP203-53' },
  { name: 'Fish & Co.', unit: '#JP102-20E' },
  { name: 'Four Leaves', unit: '#JP201-42' },
  { name: 'Fragrance Bak Kwa', unit: '#JP201-35' },
  { name: 'Fun Toast', unit: '#JP102-31' },
  { name: 'Garrett Popcorn Shops', unit: '#JP201-K6/K7' },
  { name: 'Genki Sushi', unit: '#JP101-35' },
  { name: 'Ghost Kakigori', unit: '#JP102-K9/K10' },
  { name: 'GoGo Franks', unit: '#JP203-89B' },
  { name: 'Gokoku Japanese Bakery', unit: '#JP2B1-79/80/81/82' },
  { name: 'Greendot', unit: '#JP101-43/44/45' },
  { name: 'Hai Di Lao', unit: '#JP101-47' },
  { name: 'Hi Noodle', unit: '#JP101-46' },
  { name: 'Hokkaido Baked Cheese Tarts', unit: '#JP1B1-K2' },
  { name: 'Hong Kong Egglet', unit: '#JP203-10' },
  { name: 'Hot Tomato', unit: '#JP103-06/06A/20/20A' },
  { name: 'Ichiban Boshi', unit: '#JP2B1-75/76' },
  { name: 'Idaten Udon', unit: '#JP1B1-50' },
  { name: 'Ji De Chi', unit: '#JP102-38' },
  { name: 'Jinjja Kitchen', unit: '#JP1B1-06' },
  { name: 'Jollibee', unit: '#JP101-32' },
  { name: 'Juice Farm', unit: '#JP201-29' },
  { name: 'Kazo', unit: '#JP201-59/79/80' },
  { name: 'KFC', unit: '#JP101-30' },
  { name: 'Koi The', unit: '#JP102-41C' },
  { name: 'Koo Kee', unit: '#JP103-08/08A' },
  { name: 'Kopi & Tarts', unit: '#JP201-66/75' },
  { name: 'Kopitiam', unit: '#JP103-42' },
  { name: 'Kuriya Japanese Market', unit: '#JP2B1-75/76/77/77A/78' },
  { name: 'Lao Huo Tang', unit: '#JP2B1-45' },
  { name: 'Legendary Hong Kong', unit: '#JP203-80/82' },
  { name: 'LiHO', unit: '#JP203-89E' },
  { name: "Long John Silver's", unit: '#JP103-09/10/11' },
  { name: 'Malaysia Boleh!', unit: '#JP203-26/27/28' },
  { name: 'Mamma Mia Trattoria E Caffe', unit: '#JP101-48/49' },
  { name: "McDonald's and McCafe", unit: '#JP101-31' },
  { name: 'Mister Donut', unit: '#JP2B1-83/85' },
  { name: 'MIXUE', unit: '#JP201-85/86' },
  { name: 'Monster Curry', unit: '#JP203-57' },
  { name: 'MOS Burger', unit: '#JP101-30A' },
  { name: 'Mr Bean', unit: '#JP203-11' },
  { name: 'Mr Coconut', unit: '#JP101-K1' },
  { name: 'Mr Teh Tarik Express', unit: '#JP101-K3' },
  { name: 'Muyoo+', unit: '#JP201-K8/K9' },
  { name: 'Nan Yang Dao', unit: '#JP101-15' },
  { name: "Nando's", unit: '#JP102-32,33' },
  { name: 'Nine Fresh', unit: '#JP1B1-K3' },
  { name: 'Now Pizza', unit: '#JP203-60' },
  { name: 'Old Chang Kee', unit: '#JP201-37/38/39' },
  { name: 'Oriental Herbal Tea', unit: '#JP201-41' },
  { name: 'Ottie Pancakes', unit: '#JP102-41A' },
  { name: 'Pepper Lunch', unit: '#JP2B1-62/63' },
  { name: 'Pezzo', unit: '#JP201-30' },
  { name: 'Pizza Hut', unit: '#JP101-33' },
  { name: 'PlayMade', unit: '#JP1B1-36A' },
  { name: 'Polar Puffs & Cakes', unit: '#JP1B1-11' },
  { name: 'Popeyes Famous Louisiana Chicken', unit: '#JP203-48/49/50/51/K5' },
  { name: 'Potato Corner', unit: '#JP201-40' },
  { name: 'PUTIEN', unit: '#JP102-34' },
  { name: 'Qi Ji', unit: '#JP102-39' },
  { name: 'Qin Ji Rougamo', unit: '#JP203-54/55' },
  { name: 'Qing Nian Chun', unit: '#JP102-22A/K7/K8' },
  { name: 'QQ Rice', unit: '#JP201-32' },
  { name: 'Ramen Kiou', unit: '#JP1B1-53/54' },
  { name: 'Red Ginger', unit: '#JP201-71/72/73/74' },
  { name: 'Sampanman', unit: '#JP101-16 G/H/J' },
  { name: 'Sanook Kitchen', unit: '#JP2B1-65/66/67' },
  { name: 'Shihlin Taiwan Street Snacks', unit: '#JP201-34' },
  { name: 'Shiok Cup', unit: '#JP201-33' },
  { name: 'Skythai Fastfood', unit: '#JP201-36' },
  { name: 'snacKING Retro Biscuits', unit: '#JP203-117/118' },
  { name: 'Starbucks', unit: '#JP203-52' },
  { name: "Stuff'd", unit: '#JP201-43/44' },
  { name: 'Subway', unit: '#JP101-33A' },
  { name: 'Sukiya Gyudon', unit: '#JP2B1-56' },
  { name: 'Summer Acai', unit: '#JP103-25D/E' },
  { name: 'Super Sushi', unit: '#JP1B1-03A' },
  { name: 'Sushi Express', unit: '#JP203-40/41' },
  { name: 'Sushi-GO', unit: '#JP1B1-47/48' },
  { name: 'Swee Heng Classic 1989', unit: '#JP203-31' },
  { name: "Swensen's", unit: '#JP2B1-64' },
  { name: 'Tang Tang Malatang', unit: '#JP102-40/40A/40B' },
  { name: 'Thai Market By Thai Supermarket', unit: '#JP1B1-45' },
  { name: 'The Cocoa Trees', unit: '#JP2B1-74' },
  { name: 'The Coffee Bean & Tea Leaf', unit: '#JP101-16E/F' },
  { name: 'The Hainan Story Chapter Three', unit: '#JP2B1-60/61' },
  { name: 'The Soup Spoon', unit: '#JP101-K4/K5' },
  { name: 'The Whale Tea', unit: '#JP201-45/46' },
  { name: 'Thye Moh Chan', unit: '#JP2B1-105' },
  { name: 'Tim Hortons', unit: '#JP101-26F/G' },
  { name: 'Toast & Roll By Swee Heng', unit: '#JP1B1-02' },
  { name: 'Toast Box', unit: '#JP2B1-70/71' },
  { name: 'Tong Heng', unit: '#JP1B1-10' },
  { name: 'Tongue Tip Lanzhou Beef Noodles', unit: '#JP203-105/106/107/108/109/110/111/112' },
  { name: 'Tsukimi Hamburg', unit: '#JP1B1-52' },
  { name: 'Wadori', unit: '#JP1B1-49' },
  { name: 'WAttention Plaza Japanese Kiosks Gyomu Japan Mart', unit: '#JP2B1-78A,83/84/85' },
  { name: 'Westlake', unit: '#JP203-89C' },
  { name: 'Wine Connection', unit: '#JP203-127' },
  { name: 'Wingstop', unit: '#JP201-47/89/90/91' },
  { name: 'Wok Hey', unit: '#JP203-89G' },
  { name: 'Xiang Xiang Hunan Cuisine', unit: '#JP2B1-46' },
  { name: 'Xin Yuan Ji', unit: '#JP203-88/89' },
  { name: 'Ya Kun Kaya Toast', unit: '#JP102-K1/K2/K4' },
  { name: 'Yaki Yaki Bo', unit: '#JP1B1-51' },
  { name: 'Yakiniku-Go', unit: '#JP1B1-55' },
  { name: 'Yew Kee Specialities', unit: '#JP201-92/93' },
  { name: 'MANGO ICE', unit: '#JP102-41' },
];

function nameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/[''"®]/g, '')
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
  console.log('=== SCRAPING JURONG POINT OUTLETS ===\n');

  // Get existing outlets
  const { data: existing } = await supabase
    .from('mall_outlets')
    .select('name')
    .eq('mall_id', 'jurong-point');

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

  for (let i = 0; i < toScrape.length; i++) {
    const outlet = toScrape[i];
    const slug = nameToSlug(outlet.name);
    const url = `https://sg.linkreit.com/malls/jurong-point/stores/${slug}/`;

    console.log(`[${i + 1}/${toScrape.length}] ${outlet.name}`);
    console.log(`  URL: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2000);

      // Extract data
      const data = await page.evaluate(() => {
        // Thumbnail - look for store image
        const imgEl = document.querySelector('.store-detail img, .store-image img, [class*="store"] img, .hero img');
        const thumbnail = imgEl?.src || null;

        // Opening hours - look for hours text
        let openingHours = null;
        const hoursEl = document.querySelector('[class*="hour"], [class*="time"], [class*="opening"]');
        if (hoursEl) {
          openingHours = hoursEl.innerText?.trim();
        }

        // Try to find hours pattern in page text
        if (!openingHours) {
          const allText = document.body.innerText;
          const hoursMatch = allText.match(/(\d{1,2}[:.]\d{2}\s*(?:am|pm|AM|PM)\s*[-–to]+\s*\d{1,2}[:.]\d{2}\s*(?:am|pm|AM|PM))/i);
          if (hoursMatch) openingHours = hoursMatch[1];
        }

        return { thumbnail, openingHours };
      });

      console.log(`  Thumbnail: ${data.thumbnail ? 'Found' : 'Not found'}`);
      console.log(`  Hours: ${data.openingHours || 'Not found'}`);

      // Insert to database
      const { data: inserted, error } = await supabase
        .from('mall_outlets')
        .insert({
          name: outlet.name,
          mall_id: 'jurong-point',
          level: outlet.unit,
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

    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);

      // Still try to insert with just the basic info
      const { error } = await supabase
        .from('mall_outlets')
        .insert({
          name: outlet.name,
          mall_id: 'jurong-point',
          level: outlet.unit,
        });

      if (!error) {
        console.log(`  + Saved with basic info`);
        success++;
      } else {
        failed++;
      }
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

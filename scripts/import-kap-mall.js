const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

const MALL_ID = 'kap-mall';

// Outlets to add with their unit numbers
const outlets = [
  { name: 'Acai Guru', unit: '#01-55' },
  { name: 'ATH.ISA.', unit: '#01-19' },
  { name: 'BFF Fusion Fare', unit: '#01-41' },
  { name: 'Camaca', unit: '#01-53' },
  { name: 'Canadian 2 for 1 Pizza', unit: '#01-68' },
  { name: "Carl's Jr", unit: '#01-06/07/08' },
  { name: 'Chill & Grill', unit: '#01-01/02' },
  { name: 'EagleWings Loft', unit: '#01-14/33/34/56' },
  { name: 'GOPIZZA', unit: '#01-27' },
  { name: 'Cai Ca', unit: '#01-12' },
  { name: "Howl's the Meat", unit: '#02-34' },
  { name: 'Konoha Japanese Cuisine', unit: '#01-40' },
  { name: "Lily's", unit: '#01-20/21/22/23' },
  { name: 'The M Plot Macarons', unit: '#01-05' },
  { name: 'Tea Dough Pet Café', unit: '#01-67' },
  { name: 'Tian Tang Hot Pot', unit: '#01-11' },
  { name: 'Yeast Side', unit: '#01-09' },
];

async function scrapeThumbnails(page) {
  console.log('Scraping thumbnails from KAP Mall website...');

  await page.goto('https://www.kapmall.com.sg/directory/food-and-beverage/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  const thumbnails = await page.evaluate(() => {
    const results = {};

    // Find all store cards
    const cards = document.querySelectorAll('.directory-card, .store-card, [class*="card"], article');

    cards.forEach(card => {
      const nameEl = card.querySelector('h2, h3, h4, .title, .name, [class*="title"], [class*="name"]');
      const imgEl = card.querySelector('img');

      if (nameEl && imgEl) {
        const name = nameEl.textContent.trim();
        const imgSrc = imgEl.src || imgEl.dataset.src || imgEl.getAttribute('data-lazy-src');
        if (name && imgSrc) {
          results[name.toLowerCase()] = imgSrc;
        }
      }
    });

    return results;
  });

  console.log(`Found ${Object.keys(thumbnails).length} thumbnails`);
  return thumbnails;
}

async function scrapeOpeningHours(page, restaurantName) {
  try {
    const searchQuery = encodeURIComponent(`${restaurantName} Singapore opening hours`);
    await page.goto(`https://www.google.com/search?q=${searchQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForTimeout(2000);

    // Extract opening hours from Google's knowledge panel
    const hours = await page.evaluate(() => {
      // Look for opening hours table
      const hoursTable = document.querySelector('[data-attrid*="hours"], .WgFkxc, [class*="hours"]');
      if (hoursTable) {
        return hoursTable.innerText;
      }

      // Look for specific patterns
      const allText = document.body.innerText;
      const hourPatterns = [
        /(?:Open|Hours)[:\s]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/gi,
        /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/gi,
      ];

      for (const pattern of hourPatterns) {
        const match = allText.match(pattern);
        if (match) return match[0];
      }

      return null;
    });

    return hours;
  } catch (error) {
    console.log(`  Error scraping hours for ${restaurantName}: ${error.message}`);
    return null;
  }
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      }
    }).on('error', reject);
  });
}

async function uploadToSupabase(localPath, remotePath) {
  const fileBuffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from('restaurant-photos')
    .upload(remotePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.log(`  Upload error: ${error.message}`);
    return null;
  }

  const { data } = supabase.storage
    .from('restaurant-photos')
    .getPublicUrl(remotePath);

  return data.publicUrl;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('='.repeat(60));
  console.log('IMPORTING KAP MALL OUTLETS');
  console.log('='.repeat(60));

  // Step 1: Scrape thumbnails
  const thumbnails = await scrapeThumbnails(page);
  console.log('\nThumbnail mappings:', thumbnails);

  // Step 2: Add outlets to database
  console.log('\n' + '='.repeat(60));
  console.log('ADDING OUTLETS TO DATABASE');
  console.log('='.repeat(60));

  let added = 0;
  let skipped = 0;

  for (const outlet of outlets) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('mall_outlets')
      .select('id')
      .eq('mall_id', MALL_ID)
      .ilike('name', outlet.name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`⏭ ${outlet.name} already exists`);
      skipped++;
      continue;
    }

    // Find thumbnail
    let thumbnailUrl = null;
    const nameLower = outlet.name.toLowerCase();
    for (const [key, url] of Object.entries(thumbnails)) {
      if (key.includes(nameLower) || nameLower.includes(key)) {
        thumbnailUrl = url;
        break;
      }
    }

    // Insert outlet
    const { error } = await supabase
      .from('mall_outlets')
      .insert({
        mall_id: MALL_ID,
        name: outlet.name,
        level: outlet.unit,
        category: 'Food & Beverage',
        thumbnail_url: thumbnailUrl
      });

    if (error) {
      console.log(`✗ ${outlet.name}: ${error.message}`);
    } else {
      console.log(`✓ ${outlet.name} (${outlet.unit})`);
      added++;
    }
  }

  console.log(`\nAdded: ${added}, Skipped: ${skipped}`);

  // Step 3: Scrape opening hours
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING OPENING HOURS');
  console.log('='.repeat(60));

  // Create a new page for Google searches (to avoid CAPTCHA from previous scraping)
  const hoursPage = await context.newPage();

  for (const outlet of outlets) {
    console.log(`\n[${outlet.name}]`);

    const hours = await scrapeOpeningHours(hoursPage, outlet.name);

    if (hours) {
      console.log(`  Hours: ${hours.substring(0, 100)}...`);

      // Update the database
      const { error } = await supabase
        .from('mall_outlets')
        .update({ opening_hours: hours })
        .eq('mall_id', MALL_ID)
        .ilike('name', outlet.name);

      if (error) {
        console.log(`  DB error: ${error.message}`);
      }
    } else {
      console.log('  No hours found');
    }

    await hoursPage.waitForTimeout(1000);
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);

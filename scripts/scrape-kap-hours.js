const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bkzfrgrxfnqounyeqvvn.supabase.co',
  'sb_secret_J_vsb7RYUQ_0Dm2YTR_Fuw_O-ovCRlN'
);

const outlets = [
  'Acai Guru',
  'ATH.ISA.',
  'BFF Fusion Fare',
  'Camaca',
  'Canadian 2 for 1 Pizza',
  "Carl's Jr",
  'Chill & Grill',
  'EagleWings Loft',
  'GOPIZZA',
  'Cai Ca',
  "Howl's the Meat",
  'Konoha Japanese Cuisine',
  "Lily's",
  'The M Plot Macarons',
  'Tea Dough Pet Café',
  'Tian Tang Hot Pot',
  'Yeast Side',
];

async function scrapeOpeningHoursFromGoogleMaps(page, restaurantName) {
  try {
    const searchQuery = encodeURIComponent(`${restaurantName} KAP Mall Singapore`);
    await page.goto(`https://www.google.com/maps/search/${searchQuery}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(5000);

    // Click on the first result if there's a list
    const firstResult = await page.$('[role="feed"] > div:first-child');
    if (firstResult) {
      await firstResult.click();
      await page.waitForTimeout(2000);
    }

    // Look for opening hours
    const hours = await page.evaluate(() => {
      // Try to find opening hours section
      const hoursSection = document.querySelector('[data-section-id="ol"], [aria-label*="hour"], [class*="hours"]');
      if (hoursSection) {
        return hoursSection.innerText;
      }

      // Look for specific time patterns in the page
      const allText = document.body.innerText;

      // Match opening hours patterns
      const patterns = [
        /(?:Open|Closes?|Hours)[:\s]*\d{1,2}[:\d]*\s*(?:AM|PM|am|pm)?(?:\s*[-–]\s*\d{1,2}[:\d]*\s*(?:AM|PM|am|pm)?)?/gi,
        /\d{1,2}:\d{2}\s*(?:AM|PM)\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)/gi,
      ];

      for (const pattern of patterns) {
        const matches = allText.match(pattern);
        if (matches && matches.length > 0) {
          return matches[0];
        }
      }

      // Look for "Open" text near times
      const openMatch = allText.match(/Open[:\s]*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
      if (openMatch) return openMatch[0];

      const closesMatch = allText.match(/Closes?\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
      if (closesMatch) return closesMatch[0];

      return null;
    });

    // Also try to get thumbnail from Google Maps
    const thumbnail = await page.evaluate(() => {
      const img = document.querySelector('[role="img"] img, .section-hero-header-image img, [src*="googleusercontent"]');
      return img ? img.src : null;
    });

    return { hours, thumbnail };
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return { hours: null, thumbnail: null };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-SG',
    geolocation: { latitude: 1.3521, longitude: 103.8198 },
    permissions: ['geolocation']
  });
  const page = await context.newPage();

  console.log('='.repeat(60));
  console.log('SCRAPING OPENING HOURS FROM GOOGLE MAPS');
  console.log('='.repeat(60));

  let found = 0;

  for (const name of outlets) {
    console.log(`\n[${name}]`);

    const { hours, thumbnail } = await scrapeOpeningHoursFromGoogleMaps(page, name);

    if (hours) {
      console.log(`  Hours: ${hours.substring(0, 80)}`);
      found++;

      // Update database
      const { error } = await supabase
        .from('mall_outlets')
        .update({ opening_hours: hours })
        .eq('mall_id', 'kap-mall')
        .ilike('name', `%${name}%`);

      if (error) {
        console.log(`  DB error: ${error.message}`);
      }
    } else {
      console.log('  No hours found');
    }

    if (thumbnail) {
      console.log(`  Thumbnail: ${thumbnail.substring(0, 50)}...`);

      // Update thumbnail
      await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: thumbnail })
        .eq('mall_id', 'kap-mall')
        .ilike('name', `%${name}%`);
    }

    await page.waitForTimeout(1500);
  }

  console.log(`\n\nFound hours for ${found}/${outlets.length} outlets`);

  await browser.close();
}

main().catch(console.error);

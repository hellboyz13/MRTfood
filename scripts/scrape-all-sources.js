/**
 * Multi-source food article scraper
 * Scrapes food recommendations from EatBook, Seth Lui, Miss Tam Chiak,
 * Michelin Guide, Honeycombers, HungryGoWhere, TimeOut, etc.
 *
 * Features:
 * - Geocodes addresses using OneMap API
 * - Finds nearest MRT station
 * - Calculates walking distance/time
 * - Skips existing restaurants (unless different station = different outlet)
 * - Skips entries without address, permanently closed, or in Malaysia
 */

const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ONEMAP_API_KEY = process.env.ONEMAP_API_KEY;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cache stations
let stationsCache = null;

async function getStations() {
  if (stationsCache) return stationsCache;
  const { data } = await supabase.from('stations').select('id, name, lat, lng');
  stationsCache = data || [];
  return stationsCache;
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function findNearestStation(lat, lng) {
  if (!lat || !lng) return null;
  const stations = await getStations();

  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (!station.lat || !station.lng) continue;
    const distance = getDistanceMeters(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...station, distance: Math.round(distance) };
    }
  }

  return nearest;
}

async function getWalkingDistance(fromLat, fromLng, toLat, toLng) {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  try {
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${fromLat},${fromLng}&end=${toLat},${toLng}&routeType=walk`;
    const response = await fetch(url, {
      headers: { 'Authorization': ONEMAP_API_KEY }
    });
    const data = await response.json();

    if (data.route_summary) {
      return {
        distance: Math.round(data.route_summary.total_distance),
        time: Math.round(data.route_summary.total_time / 60)
      };
    }
  } catch (error) {
    // Fall through to estimation
  }

  const straightLine = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return {
    distance: Math.round(straightLine * 1.3),
    time: Math.round((straightLine * 1.3) / 80)
  };
}

async function geocodeAddress(address) {
  if (!address || address.length < 5) return null;

  try {
    // Extract postal code for better matching
    const postalMatch = address.match(/Singapore\s*(\d{6})/i);
    let searchVal = postalMatch ? postalMatch[1] : address;

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchVal)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE)
      };
    }

    // If postal code didn't work, try with building name
    if (postalMatch) {
      const cleanAddress = address.replace(/,?\s*Singapore\s*\d{6}/i, '').trim();
      const url2 = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanAddress)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
      const response2 = await fetch(url2);
      const data2 = await response2.json();

      if (data2.results && data2.results.length > 0) {
        const result = data2.results[0];
        return {
          lat: parseFloat(result.LATITUDE),
          lng: parseFloat(result.LONGITUDE)
        };
      }
    }
  } catch (error) {
    // Silent fail
  }
  return null;
}

/**
 * Check if restaurant already exists at this station
 */
async function findExistingAtStation(name, stationId) {
  const normalizedName = name.toLowerCase().trim()
    .replace(/['']/g, "'")
    .replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '') // Remove Chinese chars for matching
    .trim();

  if (stationId) {
    const { data } = await supabase
      .from('food_listings')
      .select('id, name')
      .eq('station_id', stationId)
      .eq('is_active', true);

    if (data) {
      for (const listing of data) {
        const existingName = listing.name.toLowerCase().trim()
          .replace(/['']/g, "'")
          .replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '')
          .trim();

        // Check for exact match or significant overlap
        if (existingName === normalizedName ||
            existingName.includes(normalizedName) ||
            normalizedName.includes(existingName)) {
          return listing;
        }
      }
    }
  }

  return null;
}

/**
 * Get existing data for reuse (thumbnail, hours)
 */
async function getExistingDataForReuse(name) {
  const normalizedName = name.toLowerCase().trim()
    .replace(/[\u4e00-\u9fa5\u3400-\u4dbf（）()]/g, '')
    .trim();

  const { data } = await supabase
    .from('food_listings')
    .select('image_url, opening_hours')
    .ilike('name', `%${normalizedName}%`)
    .or('image_url.not.is.null,opening_hours.not.is.null')
    .limit(1);

  if (data && data.length > 0) {
    return {
      image_url: data[0].image_url || null,
      opening_hours: data[0].opening_hours || null
    };
  }

  return { image_url: null, opening_hours: null };
}

/**
 * Add listing source link
 */
async function addListingSource(listingId, sourceId) {
  const { error } = await supabase
    .from('listing_sources')
    .upsert({ listing_id: listingId, source_id: sourceId }, { onConflict: 'listing_id,source_id' });

  return !error;
}

/**
 * Check if address is in Malaysia
 */
function isMalaysiaAddress(address) {
  if (!address) return false;
  const lower = address.toLowerCase();
  return lower.includes('johor') || lower.includes('malaysia') ||
         lower.includes(' jb ') || lower.includes('johor bahru') ||
         lower.includes('kuala lumpur') || lower.includes(' kl ') ||
         lower.includes('melaka') || lower.includes('penang');
}

/**
 * Check if listing is permanently closed
 */
function isPermanentlyClosed(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('permanently closed') ||
         lower.includes('has closed') ||
         lower.includes('no longer open') ||
         lower.includes('shut down');
}

/**
 * Infer tags from text content
 */
function inferTags(name, text, articleTitle) {
  const tags = [];
  const lower = (name + ' ' + text + ' ' + articleTitle).toLowerCase();

  // Cuisine types
  if (lower.includes('chicken rice')) tags.push('Chicken Rice');
  if (lower.includes('nasi lemak')) tags.push('Nasi Lemak');
  if (lower.includes('prata') || lower.includes('roti')) tags.push('Prata');
  if (lower.includes('ban mian') || lower.includes('ban meen')) tags.push('Ban Mian');
  if (lower.includes('wonton') || lower.includes('wanton')) tags.push('Wonton Mee');
  if (lower.includes('char kway teow') || lower.includes('char kuey teow')) tags.push('Char Kway Teow');
  if (lower.includes('bak chor mee') || lower.includes('minced meat')) tags.push('Bak Chor Mee');
  if (lower.includes('hokkien mee') || lower.includes('hokkien prawn')) tags.push('Hokkien Mee');
  if (lower.includes('laksa')) tags.push('Laksa');
  if (lower.includes('zi char') || lower.includes('tze char')) tags.push('Zi Char');
  if (lower.includes('roast meat') || lower.includes('char siu') || lower.includes('sio bak')) tags.push('Roast Meat');
  if (lower.includes('dim sum') || lower.includes('dimsum') || lower.includes('yum cha')) tags.push('Dim Sum');
  if (lower.includes('hotpot') || lower.includes('hot pot') || lower.includes('steamboat')) tags.push('Hotpot');

  // Cuisine categories
  if (lower.includes('japanese') || lower.includes('ramen') || lower.includes('sushi') || lower.includes('izakaya')) tags.push('Japanese');
  if (lower.includes('korean') || lower.includes('kbbq') || lower.includes('k-bbq') || lower.includes('korean bbq')) tags.push('Korean');
  if (lower.includes('thai') || lower.includes('tom yum') || lower.includes('pad thai')) tags.push('Thai');
  if (lower.includes('vietnamese') || lower.includes('pho') || lower.includes('banh mi')) tags.push('Vietnamese');
  if (lower.includes('chinese') || lower.includes('cantonese')) tags.push('Chinese');
  if (lower.includes('western') || lower.includes('steak') || lower.includes('pasta')) tags.push('Western');
  if (lower.includes('indian') || lower.includes('curry') || lower.includes('biryani')) tags.push('Indian');
  if (lower.includes('malay') || lower.includes('nasi')) tags.push('Malay');

  // Venue types
  if (lower.includes('hawker') || lower.includes('food centre') || lower.includes('kopitiam')) tags.push('Hawker');
  if (lower.includes('cafe') || lower.includes('coffee')) tags.push('Cafe');
  if (lower.includes('restaurant')) tags.push('Restaurant');
  if (lower.includes('buffet')) tags.push('Buffet');
  if (lower.includes('omakase')) tags.push('Omakase');

  // Awards
  if (lower.includes('michelin') || lower.includes('bib gourmand')) tags.push('Michelin');
  if (lower.includes('halal')) tags.push('Halal');

  // Dedupe
  return [...new Set(tags)];
}

/**
 * Generic article scraper - works for most food blogs
 */
async function scrapeGenericArticle(page, url, sourceId, articleTitle) {
  console.log(`\n📰 Scraping: ${articleTitle}`);
  console.log(`   URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(3000);

    const data = await page.evaluate(() => {
      const restaurants = [];
      const seen = new Set();

      // Try multiple heading selectors
      const headings = document.querySelectorAll('h2, h3, h4');

      headings.forEach(heading => {
        const text = heading.textContent?.trim() || '';
        if (text.length < 3 || text.length > 200) return;

        // Skip non-restaurant headings
        if (/^(summary|conclusion|related|read also|you may|where to|how to|what is|contents|table of|share|comment|subscribe|advertisement|ad|sponsored)/i.test(text)) return;

        // Match numbered headings: "1. Name", "1) Name", "1 – Name", "#1 Name"
        let name = null;
        const patterns = [
          /^#?\d+[\.\)\-–:]\s*(.+)$/,  // "1. Name" or "#1 Name"
          /^(.+?)\s*[\-–]\s*\d+/,       // "Name - 1"
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            name = match[1].trim();
            break;
          }
        }

        if (!name) return;

        // Clean up name
        name = name
          .replace(/\s*[\-–—]\s*.{0,50}$/, '') // Remove trailing dash content
          .replace(/\s*\[.+\]$/, '')            // Remove bracketed text
          .replace(/\s*\(.+\)$/, '')            // Remove parenthetical if very long
          .trim();

        if (name.length < 2 || name.length > 100) return;

        // Dedupe by name
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return;
        seen.add(key);

        // Look for address and details in following elements
        let allText = '';
        let address = null;
        let openingHours = null;

        let el = heading.nextElementSibling;
        let count = 0;
        while (el && count < 30) {
          if (['H2', 'H3', 'H4'].includes(el.tagName)) break;
          const content = el.textContent || '';
          allText += ' ' + content;

          // Address patterns
          if (!address) {
            // "Address: ..." pattern
            const addrMatch = content.match(/Address:\s*([^\n]+)/i);
            if (addrMatch) {
              address = addrMatch[1].trim()
                .replace(/Opening Hours:.*/i, '')
                .replace(/\s+/g, ' ')
                .trim();
            }
          }

          // Postal code pattern as fallback
          if (!address) {
            const postalMatch = content.match(/(\d+[A-Za-z]?\s+[^,\n]+,\s*(?:#[\w\d-]+(?:\/[\w\d-]+)*,?\s*)?Singapore\s*\d{6})/i);
            if (postalMatch) {
              address = postalMatch[1].trim();
            }
          }

          // Opening hours
          if (!openingHours) {
            const hoursMatch = content.match(/Opening [Hh]ours?:\s*([^\n]+)/i);
            if (hoursMatch) {
              openingHours = hoursMatch[1].trim().slice(0, 250);
            }
          }

          el = el.nextElementSibling;
          count++;
        }

        restaurants.push({
          name,
          address: address || '',
          openingHours: openingHours || '',
          context: allText.slice(0, 500) // For tag inference
        });
      });

      return {
        title: document.querySelector('h1')?.textContent?.trim() || '',
        restaurants
      };
    });

    console.log(`   Found ${data.restaurants.length} restaurants`);

    return data.restaurants.map(r => ({
      ...r,
      sourceId,
      sourceUrl: url,
      articleTitle
    }));
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    return [];
  }
}

/**
 * Michelin Guide scraper - different structure
 */
async function scrapeMichelinArticle(page, url, articleTitle) {
  console.log(`\n📰 Scraping (Michelin): ${articleTitle}`);
  console.log(`   URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4000);

    const data = await page.evaluate(() => {
      const restaurants = [];
      const seen = new Set();

      // Michelin uses specific classes for restaurant cards
      document.querySelectorAll('[class*="restaurant"], [class*="card"], li, article').forEach(card => {
        const text = card.textContent || '';

        // Look for restaurant name patterns
        const nameEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="name"], strong');
        if (!nameEl) return;

        let name = nameEl.textContent?.trim() || '';
        if (name.length < 2 || name.length > 100) return;

        // Skip if clearly not a restaurant
        if (/^(read more|view|see|click|share|comment)/i.test(name)) return;

        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return;
        seen.add(key);

        // Look for address
        let address = null;
        const addrMatch = text.match(/(\d+[A-Za-z]?\s+[^,\n]+,\s*(?:#[\w\d-]+(?:\/[\w\d-]+)*,?\s*)?Singapore\s*\d{6})/i);
        if (addrMatch) {
          address = addrMatch[1].trim();
        }

        restaurants.push({
          name,
          address: address || '',
          openingHours: '',
          context: text.slice(0, 500)
        });
      });

      return { restaurants };
    });

    console.log(`   Found ${data.restaurants.length} restaurants`);

    return data.restaurants.map(r => ({
      ...r,
      sourceId: 'michelin',
      sourceUrl: url,
      articleTitle
    }));
  } catch (err) {
    console.error(`   Error: ${err.message}`);
    return [];
  }
}

/**
 * Process and insert a restaurant
 */
async function processRestaurant(r, stats) {
  // Skip if no address
  if (!r.address || r.address.length < 10) {
    stats.noAddress++;
    return null;
  }

  // Skip Malaysia addresses
  if (isMalaysiaAddress(r.address)) {
    stats.malaysia++;
    return null;
  }

  // Skip permanently closed
  if (isPermanentlyClosed(r.context)) {
    stats.closed++;
    return null;
  }

  // Geocode
  const geo = await geocodeAddress(r.address);
  if (!geo) {
    stats.noGeo++;
    return null;
  }

  // Find nearest station
  const station = await findNearestStation(geo.lat, geo.lng);
  if (!station) {
    stats.noStation++;
    return null;
  }

  // Check if already exists at this station
  const existing = await findExistingAtStation(r.name, station.id);
  if (existing) {
    // Just add the source link
    await addListingSource(existing.id, r.sourceId);
    stats.linked++;
    return { action: 'linked', name: r.name, station: station.name };
  }

  // Get walking distance
  const walking = await getWalkingDistance(geo.lat, geo.lng, station.lat, station.lng);
  const walkingTime = walking ? walking.time : Math.round(station.distance / 80);
  const walkingDist = walking ? walking.distance : station.distance;

  // Look for existing data to reuse
  const reuseData = await getExistingDataForReuse(r.name);

  // Infer tags
  const tags = inferTags(r.name, r.context, r.articleTitle);

  // Insert
  const { data: inserted, error } = await supabase
    .from('food_listings')
    .insert({
      name: r.name,
      address: r.address,
      station_id: station.id,
      source_url: r.sourceUrl,
      tags: tags.length > 0 ? tags : null,
      is_active: true,
      lat: geo.lat,
      lng: geo.lng,
      distance_to_station: walkingDist,
      walking_time: walkingTime,
      opening_hours: reuseData.opening_hours || r.openingHours || null,
      image_url: reuseData.image_url || null
    })
    .select()
    .single();

  if (error) {
    stats.failed++;
    return { action: 'failed', name: r.name, error: error.message };
  }

  // Add source link
  await addListingSource(inserted.id, r.sourceId);
  stats.inserted++;

  return { action: 'inserted', name: r.name, station: station.name, walkingTime };
}

/**
 * Main scraper
 */
async function main() {
  console.log('=== MULTI-SOURCE FOOD SCRAPER ===\n');

  // Parse CSV
  const csvContent = `source,category,article_title,url
eatbook,local,10 Best Chicken Rice Ranked,https://eatbook.sg/best-chicken-rice-singapore/
eatbook,local,25 Best Nasi Lemak,https://eatbook.sg/nasi-lemak-in-singapore/
eatbook,local,25 Best Prata Places,https://eatbook.sg/best-prata-in-singapore/
eatbook,local,15 Best Crispy Prata,https://eatbook.sg/crispy-prata/
eatbook,local,16 Best Ban Mian,https://eatbook.sg/ban-mian/
eatbook,local,20 Best Wonton Mee,https://eatbook.sg/wonton-mee-singapore/
eatbook,local,10 Best Char Kway Teow Ranked,https://eatbook.sg/best-char-kway-teow-singapore-ranked/
eatbook,local,10 Best Bak Chor Mee Ranked,https://eatbook.sg/best-bak-chor-mee-singapore-ranked/
eatbook,local,12 Best Hokkien Mee Ranked,https://eatbook.sg/best-hokkien-mee-singapore-ranked/
eatbook,local,10 Best Laksa Ranked,https://eatbook.sg/best-laksa-singapore-ranked/
eatbook,local,Best Zi Char,https://eatbook.sg/best-zi-char-singapore/
eatbook,local,10 Best Roast Meat Rice Ranked,https://eatbook.sg/best-roast-meat-rice-singapore-ranked/
eatbook,cuisine,25 Best Japanese Restaurants,https://eatbook.sg/japanese-restaurants-singapore/
eatbook,cuisine,20 Best Ramen,https://eatbook.sg/best-ramen-singapore/
eatbook,cuisine,22 Japanese Buffets,https://eatbook.sg/japanese-buffet/
eatbook,cuisine,35 Best Korean Restaurants,https://eatbook.sg/best-korean-restaurants-singapore/
eatbook,cuisine,15 Korean BBQ Buffets,https://eatbook.sg/korean-bbq-buffets/
eatbook,cuisine,30 Best Korean CBD,https://eatbook.sg/korean-restaurants-tanjong-pagar/
eatbook,cuisine,17 Best Thai Food,https://eatbook.sg/best-thai-food-singapore/
eatbook,cuisine,15 Vietnamese Food,https://eatbook.sg/vietnamese-food/
eatbook,cuisine,30 Best Dim Sum,https://eatbook.sg/dim-sum-singapore/
eatbook,cuisine,15 Best Cheap Dim Sum,https://eatbook.sg/cheap-dim-sum/
eatbook,cuisine,10 Best Hotpot Buffets,https://eatbook.sg/hotpot-buffets-singapore/
eatbook,location,Raffles City Food Guide,https://eatbook.sg/raffles-city-food/
eatbook,location,Paya Lebar PLQ Food,https://eatbook.sg/paya-lebar-square-plq-food/
eatbook,location,Holland Village Food,https://eatbook.sg/holland-village-food/
eatbook,location,Woodleigh Mall Food,https://eatbook.sg/woodleigh-mall-food/
eatbook,location,Bedok Interchange Hawker,https://eatbook.sg/bedok-interchange-hawker-centre/
eatbook,location,Fortune Centre Food,https://eatbook.sg/fortune-centre-food/
eatbook,location,Telok Ayer Food,https://eatbook.sg/telok-ayer-food/
eatbook,location,Hougang Food,https://eatbook.sg/hougang-food/
eatbook,location,New Bahru Food,https://eatbook.sg/new-bahru-food/
eatbook,curated,60 Best Restaurants,https://eatbook.sg/best-restaurants-singapore/
eatbook,curated,65 Best Cafes,https://eatbook.sg/best-cafes-singapore/
eatbook,curated,10 Best Hawker Centres,https://eatbook.sg/best-hawker-centres-singapore/
eatbook,curated,25 Best Eateries 2025,https://eatbook.sg/best-eateries-singapore-2025/
eatbook,curated,31 Best Steak Restaurants,https://eatbook.sg/best-steak-restaurants-singapore/
eatbook,curated,30 Omakase Restaurants,https://eatbook.sg/omakase-singapore/
eatbook,curated,75 Best Singapore Food Guide,https://eatbook.sg/best-singapore-food/
eatbook,curated,Michelin Bib Gourmand 2025,https://eatbook.sg/michelin-bib-gourmand-2025/
sethlui,local,15 Best Chicken Rice,https://sethlui.com/best-must-try-chicken-rice-singapore/
sethlui,local,21 Best Nasi Lemak,https://sethlui.com/nasi-lemak-guide-singapore/
sethlui,local,12 Best Char Kway Teow,https://sethlui.com/best-char-kway-teows-singapore/
sethlui,curated,Best Hawker Food 2024 Roundup,https://sethlui.com/best-hawker-food-spots-singapore-dec-2024/
sethlui,location,Ang Mo Kio Food Guide,https://sethlui.com/ang-mo-kio-food-guide-singapore/
sethlui,location,Dhoby Ghaut Food Guide,https://sethlui.com/dhoby-ghaut-food-guide-singapore/
sethlui,location,Lau Pa Sat Food Guide,https://sethlui.com/lau-pa-sat-food-guide-singapore/
sethlui,location,Choa Chu Kang Bukit Panjang Bukit Batok Guide,https://sethlui.com/choa-chu-kang-bukit-panjang-bukit-batok-guide-singapore/
sethlui,curated,Michelin Bib Gourmand 2025,https://sethlui.com/michelin-bib-gourmand-list-2025-singapore-jul-2025/
misstamchiak,location,Maxwell Food Centre Guide,https://www.misstamchiak.com/maxwell-food-centre/
misstamchiak,curated,Fancy Hawker Food Guide,https://www.misstamchiak.com/fancy-hawker-food-in-singapore/
ieatishootipost,curated,Top 10 Hawker Dishes UNESCO Trail,https://ieatishootipost.sg/singapores-top-ten-most-popular-hawker-dishes-and-where-to-eat-them/
danielfooddiary,curated,59 Must-Try Singapore Hawker Food,https://danielfooddiary.com/2024/08/09/singaporehawkerfood/
michelin,curated,Bib Gourmand 2025 Selection,https://guide.michelin.com/sg/en/article/michelin-guide-ceremony/singapore-bib-gourmand-2025
michelin,curated,Bib Gourmand 2024 Selection,https://guide.michelin.com/sg/en/article/michelin-guide-ceremony/singapore-bib-gourmand-2024
honeycombers,cuisine,Best Korean BBQ Restaurants,https://thehoneycombers.com/singapore/korean-bbq-kbbq-singapore/
hungrygowhere,curated,Michelin Bib Gourmand 2025 List,https://hungrygowhere.com/food-news/michelin-bib-gourmand-singapore-2025-list/
timeout,curated,Michelin Bib Gourmand 2025,https://www.timeout.com/singapore/news/these-are-all-the-hawker-stalls-and-restaurants-in-singapore-in-the-michelin-bib-gourmand-list-for-2025-071725`;

  const lines = csvContent.trim().split('\n').slice(1); // Skip header
  const articles = lines.map(line => {
    const [source, category, title, url] = line.split(',');
    return { source, category, title, url };
  });

  // Sort by priority: local > location > cuisine > curated
  const priority = { local: 1, location: 2, cuisine: 3, curated: 4 };
  articles.sort((a, b) => (priority[a.category] || 5) - (priority[b.category] || 5));

  console.log(`Found ${articles.length} articles to scrape`);
  console.log('Priority order: local dishes → location guides → cuisine → curated\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allRestaurants = [];
  let articleCount = 0;

  // Scrape all articles
  for (const article of articles) {
    articleCount++;
    console.log(`\n[${articleCount}/${articles.length}] ${article.category.toUpperCase()}`);

    let restaurants;
    if (article.source === 'michelin') {
      restaurants = await scrapeMichelinArticle(page, article.url, article.title);
    } else {
      restaurants = await scrapeGenericArticle(page, article.url, article.source, article.title);
    }

    allRestaurants.push(...restaurants);
    await sleep(2000); // Be polite to servers
  }

  await browser.close();

  // Dedupe by name + address
  const seen = new Map();
  const unique = allRestaurants.filter(r => {
    const key = (r.name + '|' + r.address).toLowerCase().replace(/[^a-z0-9|]/g, '');
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SCRAPING COMPLETE`);
  console.log(`Total scraped: ${allRestaurants.length}`);
  console.log(`Unique (after dedupe): ${unique.length}`);
  console.log(`${'='.repeat(50)}\n`);

  // Process and insert
  console.log('PROCESSING & INSERTING...\n');

  const stats = {
    inserted: 0,
    linked: 0,
    noAddress: 0,
    noGeo: 0,
    noStation: 0,
    malaysia: 0,
    closed: 0,
    failed: 0
  };

  for (let i = 0; i < unique.length; i++) {
    const r = unique[i];

    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${unique.length} ---`);
      console.log(`    Inserted: ${stats.inserted}, Linked: ${stats.linked}, Skipped: ${stats.noAddress + stats.noGeo + stats.malaysia + stats.closed}\n`);
    }

    const result = await processRestaurant(r, stats);

    if (result) {
      if (result.action === 'inserted') {
        console.log(`✅ ${result.name} → ${result.station} (${result.walkingTime} min)`);
      } else if (result.action === 'linked') {
        console.log(`🔗 ${result.name} → linked to ${r.sourceId}`);
      } else if (result.action === 'failed') {
        console.log(`❌ ${result.name}: ${result.error}`);
      }
    }

    await sleep(150); // Rate limiting
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('FINAL RESULTS');
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Inserted:     ${stats.inserted}`);
  console.log(`🔗 Linked:       ${stats.linked}`);
  console.log(`⏭️  No address:   ${stats.noAddress}`);
  console.log(`⏭️  No geocode:   ${stats.noGeo}`);
  console.log(`⏭️  Malaysia:     ${stats.malaysia}`);
  console.log(`⏭️  Closed:       ${stats.closed}`);
  console.log(`❌ Failed:       ${stats.failed}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);

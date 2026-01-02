const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

config({ path: '.env.local', override: true });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mall mappings
const MALL_MAPPINGS = {
  '928 Yishun Laksa': 'yishun-central-928',
  'Lu Jia Fish Soup': 'yishun-industrial-1',
  'Jo Ju Bang': 'tanjong-pagar-plaza',
  'Meijing Sabah Sandakan Fried Pork Noodle': 'hong-lim-market-and-food-centre',
  'Bee Kia Seafood Restaurant': 'balestier-point',
  'Ma Cuisinette': 'the-summerhouse'
};

// Cuisine to category mapping
const CUISINE_TO_CATEGORY = {
  'Local': 'food, local',
  'Korean': 'food, korean',
  'French': 'food, french',
  'Seafood': 'food, seafood'
};

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function vetImageWithVision(imageUrl) {
  // Use Google Vision API to analyze image
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`;

  const body = JSON.stringify({
    requests: [{
      image: { source: { imageUri: imageUrl } },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 10 },
        { type: 'TEXT_DETECTION', maxResults: 5 }
      ]
    }]
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    const data = await response.json();

    if (data.responses && data.responses[0]) {
      const labels = data.responses[0].labelAnnotations || [];
      const text = data.responses[0].textAnnotations || [];

      // Check if it's a food/menu related image
      const foodLabels = ['food', 'dish', 'cuisine', 'meal', 'restaurant', 'menu', 'recipe', 'ingredient', 'plate', 'bowl', 'noodle', 'soup', 'rice', 'meat', 'vegetable'];
      const isFoodImage = labels.some(l =>
        foodLabels.some(f => l.description.toLowerCase().includes(f))
      );

      // Check if it has menu text (prices, items)
      const hasMenuText = text.length > 0 && text.some(t =>
        /\$|price|menu|sgd|\d+\.\d{2}/i.test(t.description)
      );

      return {
        isValid: isFoodImage || hasMenuText,
        labels: labels.slice(0, 5).map(l => l.description),
        hasText: text.length > 0
      };
    }
  } catch (err) {
    console.log('Vision API error:', err.message);
  }

  return { isValid: true, labels: [], hasText: false }; // Default to valid
}

async function run() {
  console.log('='.repeat(60));
  console.log('IMPORTING GET FED LISTINGS TO DATABASE');
  console.log('='.repeat(60));

  // Read results
  const results = JSON.parse(fs.readFileSync('scripts/getfed-results.json', 'utf8'));

  for (const listing of results) {
    console.log(`\n--- ${listing.name} ---`);

    const mallId = MALL_MAPPINGS[listing.name];
    const outletId = `${slugify(listing.name)}-${mallId}`;

    // Create outlet record
    const outletData = {
      id: outletId,
      name: listing.name,
      mall_id: mallId,
      level: listing.unit,
      category: CUISINE_TO_CATEGORY[listing.cuisine] || 'food',
      thumbnail_url: listing.thumbnailUrl,
      google_place_id: listing.googlePlaceId,
      opening_hours: listing.openingHours, // Store as plain text for now
      tags: listing.cuisine === 'Local' ? ['Local', 'Hawker'] : [listing.cuisine]
    };

    console.log('Creating outlet:', outletId);
    const { error: outletError } = await supabase
      .from('mall_outlets')
      .upsert(outletData);

    if (outletError) {
      console.log('❌ Outlet error:', outletError.message);
      continue;
    }
    console.log('✅ Outlet created');

    // Vet and add menu images
    console.log('Vetting menu images with Vision API...');
    let validMenus = 0;

    for (let i = 0; i < listing.menuUrls.length; i++) {
      const menuUrl = listing.menuUrls[i];

      process.stdout.write(`  Image ${i + 1}: `);
      const vetting = await vetImageWithVision(menuUrl);

      if (vetting.isValid) {
        console.log(`✅ ${vetting.labels.slice(0, 3).join(', ')}`);

        // Add to menu_images table
        const menuData = {
          outlet_id: outletId,
          image_url: menuUrl,
          display_order: i + 1,
          is_header: i === 0
        };

        const { error: menuError } = await supabase
          .from('menu_images')
          .upsert(menuData, { onConflict: 'outlet_id,display_order' });

        if (!menuError) validMenus++;
      } else {
        console.log('❌ Not a food/menu image');
      }
    }

    console.log(`Added ${validMenus} menu images`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
}

run().catch(console.error);

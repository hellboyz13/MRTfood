/**
 * Update restaurants with price ranges (via listing_prices table) and sources
 */

const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load .env.local from project root
const envPath = path.join(__dirname, '..', '.env.local');
config({ path: envPath, override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Price and source data from CSV
const restaurantData = [
  { name: "Gwanghwamun Mijin", price_low: 15, price_high: 30, source_id: "eatbook" },
  { name: "Kikanbo", price_low: 15, price_high: 22, source_id: "eatbook" },
  { name: "Kyo Komachi", price_low: 14, price_high: 25, source_id: "eatbook" },
  { name: "Niku Niku Oh Kome", price_low: 20, price_high: 40, source_id: "eatbook" },
  { name: "Big Fried Chicken", price_low: 4.5, price_high: 8, source_id: "eatbook" },
  { name: "5:59+ Cafe and Bistro", price_low: 12, price_high: 25, source_id: "eatbook" },
  { name: "Udon Shin", price_low: 12, price_high: 20, source_id: "eatbook" },
  { name: "Wonderful Bapsang", price_low: 12, price_high: 22, source_id: "eatbook" },
  { name: "Bon Broth", price_low: 35, price_high: 80, source_id: "eatbook" },
  { name: "Cavern Restaurant", price_low: 20, price_high: 45, source_id: "eatbook" },
  { name: "Kowboy", price_low: 12, price_high: 20, source_id: "eatbook" },
  { name: "Tofu G", price_low: 6, price_high: 12, source_id: "eatbook" },
  { name: "Noci", price_low: 18, price_high: 35, source_id: "eatbook" },
  { name: "Bomul Samgyetang", price_low: 18, price_high: 35, source_id: "eatbook" },
  { name: "Partage Patisserie", price_low: 8, price_high: 18, source_id: "eatbook" },
  { name: "Keming Bing Sat", price_low: 8, price_high: 18, source_id: "eatbook" },
  { name: "Dragon Curry", price_low: 5, price_high: 10, source_id: "eatbook" },
  { name: "HunBun", price_low: 10, price_high: 20, source_id: "eatbook" },
  { name: "Menya Saku", price_low: 10, price_high: 15, source_id: "eatbook" },
  { name: "Swag & Sizzle", price_low: 12, price_high: 25, source_id: "sethlui" },
  { name: "The Neighbourwok", price_low: 5, price_high: 10, source_id: "sethlui" },
  { name: "545 Whampoa Prawn Noodle", price_low: 5, price_high: 10, source_id: "sethlui" },
  { name: "Jia Le Man Fen Guo", price_low: 4, price_high: 8, source_id: "sethlui" },
  { name: "Singapore Fried Hokkien Mee (Punggol)", price_low: 5, price_high: 10, source_id: "sethlui" },
  { name: "One Soy", price_low: 2, price_high: 5, source_id: "sethlui" },
  { name: "Boon Tong Kee (Balestier)", price_low: 5, price_high: 15, source_id: "michelin-hawker" },
  { name: "Omakase@Stevens", price_low: 200, price_high: 400, source_id: "michelin-hawker" },
  { name: "Sushi Sakuta", price_low: 300, price_high: 500, source_id: "michelin-hawker" },
  { name: "Tsujiri Premium", price_low: 8, price_high: 18, source_id: "editors-choice" },
  { name: "Gelato Messina", price_low: 6, price_high: 15, source_id: "eatbook" },
  { name: "Hvala Kissa", price_low: 8, price_high: 18, source_id: "danielfooddiary" },
  { name: "22 Grams Coffee", price_low: 5, price_high: 10, source_id: "danielfooddiary" },
  { name: "Corner Corner", price_low: 8, price_high: 18, source_id: "danielfooddiary" },
  { name: "Borderless Coffee", price_low: 6, price_high: 12, source_id: "tatler-2025" },
  { name: "IM JAI by Pun Im", price_low: 15, price_high: 35, source_id: "editors-choice" },
  { name: "Kimchi Mama", price_low: 5.9, price_high: 15, source_id: "editors-choice" },
  { name: "Mensho Tokyo", price_low: 15, price_high: 30, source_id: "eatbook" },
  { name: "Ramen-ya", price_low: 12, price_high: 20, source_id: "eatbook" },
  { name: "Kajiken", price_low: 12, price_high: 18, source_id: "eatbook" },
  { name: "Torasho Ramen", price_low: 15, price_high: 30, source_id: "eatbook" },
  { name: "Takagi Ramen", price_low: 7.9, price_high: 15, source_id: "editors-choice" },
  { name: "Liu Lang Mian", price_low: 12, price_high: 20, source_id: "editors-choice" },
  { name: "Ikkousha", price_low: 14, price_high: 22, source_id: "editors-choice" },
  { name: "Kokoro Mazesoba", price_low: 10, price_high: 16, source_id: "editors-choice" },
  { name: "Le Shrimp Ramen", price_low: 14, price_high: 22, source_id: "editors-choice" },
  { name: "Ramen Hitoyoshi", price_low: 12, price_high: 18, source_id: "editors-choice" },
  { name: "Ichikokudo", price_low: 12, price_high: 18, source_id: "eatbook" },
  { name: "Tonkotsu Kazan", price_low: 15, price_high: 25, source_id: "eatbook" },
  { name: "Gwangjang Gaon", price_low: 20, price_high: 40, source_id: "eatbook" },
  { name: "Curly's", price_low: 18, price_high: 40, source_id: "editors-choice" },
  { name: "Legendary Hong Kong", price_low: 10, price_high: 30, source_id: "eatbook" },
  { name: "Alice Boulangerie Fine Crumbs", price_low: 5, price_high: 15, source_id: "editors-choice" },
  { name: "Yoajung", price_low: 6, price_high: 12, source_id: "eatbook" },
  { name: "Apartment Coffee", price_low: 6, price_high: 15, source_id: "eatbook" },
  { name: "DJDH Ramen", price_low: 14, price_high: 22, source_id: "editors-choice" },
  { name: "Koung's Wan Tan Mee", price_low: 4, price_high: 8, source_id: "sethlui" },
  { name: "HJH Maimunah Mini", price_low: 6, price_high: 12, source_id: "sethlui" },
  { name: "Ci Yuan HK Wanton Noodle", price_low: 4, price_high: 7, source_id: "sethlui" },
  { name: "Shu Xiang Kitchen", price_low: 5, price_high: 10, source_id: "sethlui" },
];

function formatPriceRange(low, high) {
  if (low === high) {
    return `$${low}`;
  }
  return `$${low} - $${high}`;
}

async function main() {
  console.log('Updating restaurant prices and sources...\n');
  console.log(`Processing ${restaurantData.length} restaurants\n`);

  let updated = 0;
  let priceAdded = 0;
  let notFound = 0;

  for (const r of restaurantData) {
    const priceRange = formatPriceRange(r.price_low, r.price_high);

    // Find restaurant by name using wildcard search
    const pattern = '%' + r.name + '%';
    const { data: matches, error: findError } = await supabase
      .from('food_listings')
      .select('id, name, source_id')
      .ilike('name', pattern);

    if (findError || !matches || matches.length === 0) {
      console.log('Not found: ' + r.name);
      notFound++;
      continue;
    }

    // Find exact match or best match
    let existing = matches.find(m => m.name.toLowerCase() === r.name.toLowerCase());
    if (!existing) {
      existing = matches[0];
    }

    // Update source_id
    const { error: updateError } = await supabase
      .from('food_listings')
      .update({ source_id: r.source_id })
      .eq('id', existing.id);

    if (updateError) {
      console.log('Error updating source: ' + r.name + ' - ' + updateError.message);
    } else {
      updated++;
    }

    // Check if price already exists
    const { data: existingPrice } = await supabase
      .from('listing_prices')
      .select('id')
      .eq('listing_id', existing.id)
      .eq('item_name', 'Price Range')
      .single();

    if (existingPrice) {
      // Update existing price
      const { error: priceUpdateError } = await supabase
        .from('listing_prices')
        .update({
          price: r.price_low,
          description: priceRange
        })
        .eq('id', existingPrice.id);

      if (!priceUpdateError) {
        console.log('OK: ' + existing.name + ': ' + priceRange + ' (' + r.source_id + ') [price updated]');
      }
    } else {
      // Insert new price
      const { error: priceInsertError } = await supabase
        .from('listing_prices')
        .insert({
          listing_id: existing.id,
          item_name: 'Price Range',
          price: r.price_low,
          description: priceRange,
          is_signature: true,
          sort_order: 0
        });

      if (!priceInsertError) {
        priceAdded++;
        console.log('OK: ' + existing.name + ': ' + priceRange + ' (' + r.source_id + ') [price added]');
      } else {
        console.log('Error adding price: ' + r.name + ' - ' + priceInsertError.message);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Update Summary:');
  console.log('   Sources updated: ' + updated);
  console.log('   Prices added: ' + priceAdded);
  console.log('   Not found: ' + notFound);
  console.log('='.repeat(50));
}

main().catch(console.error);

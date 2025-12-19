/**
 * Update restaurants with price ranges and sources
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Source mapping from CSV to database source_ids
const sourceMapping: Record<string, string> = {
  'eatbook': 'eatbook',
  'seth lui': 'sethlui',
  'michelin hawker': 'michelin-hawker',
  'honeycombers': 'editors-choice',
  'danielfooddiary': 'danielfooddiary',
  'tatler best 2025': 'tatler-2025',
  'thesmartlocal': 'editors-choice',
  '24 hour': 'editors-choice',
  "editor's choice": 'editors-choice',
};

// Price and source data from CSV
const restaurantData: Array<{ name: string; price_low: number; price_high: number; source: string }> = [
  { name: "Gwanghwamun Mijin", price_low: 15, price_high: 30, source: "EatBook" },
  { name: "Kikanbo", price_low: 15, price_high: 22, source: "EatBook" },
  { name: "Kyo Komachi", price_low: 14, price_high: 25, source: "EatBook" },
  { name: "Niku Niku Oh Kome", price_low: 20, price_high: 40, source: "EatBook" },
  { name: "Big Fried Chicken", price_low: 4.5, price_high: 8, source: "EatBook" },
  { name: "5:59+ Cafe and Bistro", price_low: 12, price_high: 25, source: "EatBook" },
  { name: "Udon Shin", price_low: 12, price_high: 20, source: "EatBook" },
  { name: "Wonderful Bapsang", price_low: 12, price_high: 22, source: "EatBook" },
  { name: "Bon Broth", price_low: 35, price_high: 80, source: "EatBook" },
  { name: "Cavern Restaurant", price_low: 20, price_high: 45, source: "EatBook" },
  { name: "Kowboy", price_low: 12, price_high: 20, source: "EatBook" },
  { name: "Tofu G", price_low: 6, price_high: 12, source: "EatBook" },
  { name: "Noci", price_low: 18, price_high: 35, source: "EatBook" },
  { name: "Bomul Samgyetang", price_low: 18, price_high: 35, source: "EatBook" },
  { name: "Partage Patisserie", price_low: 8, price_high: 18, source: "EatBook" },
  { name: "Keming Bing Sat", price_low: 8, price_high: 18, source: "EatBook" },
  { name: "Dragon Curry", price_low: 5, price_high: 10, source: "EatBook" },
  { name: "HunBun", price_low: 10, price_high: 20, source: "EatBook" },
  { name: "Menya Saku", price_low: 10, price_high: 15, source: "EatBook" },
  { name: "Swag & Sizzle", price_low: 12, price_high: 25, source: "Seth Lui" },
  { name: "The Neighbourwok", price_low: 5, price_high: 10, source: "Seth Lui" },
  { name: "545 Whampoa Prawn Noodle", price_low: 5, price_high: 10, source: "Seth Lui" },
  { name: "Jia Le Man Fen Guo", price_low: 4, price_high: 8, source: "Seth Lui" },
  { name: "Singapore Fried Hokkien Mee (Punggol)", price_low: 5, price_high: 10, source: "Seth Lui" },
  { name: "One Soy", price_low: 2, price_high: 5, source: "Seth Lui" },
  { name: "Boon Tong Kee (Balestier)", price_low: 5, price_high: 15, source: "Michelin Hawker" },
  { name: "Omakase@Stevens", price_low: 200, price_high: 400, source: "Michelin Hawker" },
  { name: "Sushi Sakuta", price_low: 300, price_high: 500, source: "Michelin Hawker" },
  { name: "Tsujiri Premium", price_low: 8, price_high: 18, source: "Honeycombers" },
  { name: "Gelato Messina", price_low: 6, price_high: 15, source: "EatBook" },
  { name: "Hvala Kissa", price_low: 8, price_high: 18, source: "danielfooddiary" },
  { name: "22 Grams Coffee", price_low: 5, price_high: 10, source: "danielfooddiary" },
  { name: "Corner Corner", price_low: 8, price_high: 18, source: "danielfooddiary" },
  { name: "Borderless Coffee", price_low: 6, price_high: 12, source: "Tatler Best 2025" },
  { name: "IM JAI by Pun Im", price_low: 15, price_high: 35, source: "TheSmartLocal" },
  { name: "Kimchi Mama", price_low: 5.9, price_high: 15, source: "TheSmartLocal" },
  { name: "Mensho Tokyo", price_low: 15, price_high: 30, source: "EatBook" },
  { name: "Ramen-ya", price_low: 12, price_high: 20, source: "EatBook" },
  { name: "Kajiken", price_low: 12, price_high: 18, source: "EatBook" },
  { name: "Torasho Ramen", price_low: 15, price_high: 30, source: "EatBook" },
  { name: "Takagi Ramen", price_low: 7.9, price_high: 15, source: "24 Hour" },
  { name: "Liu Lang Mian", price_low: 12, price_high: 20, source: "Editor's Choice" },
  { name: "Ikkousha", price_low: 14, price_high: 22, source: "Editor's Choice" },
  { name: "Kokoro Mazesoba", price_low: 10, price_high: 16, source: "Editor's Choice" },
  { name: "Le Shrimp Ramen", price_low: 14, price_high: 22, source: "Editor's Choice" },
  { name: "Ramen Hitoyoshi", price_low: 12, price_high: 18, source: "Editor's Choice" },
  { name: "Ichikokudo", price_low: 12, price_high: 18, source: "EatBook" },
  { name: "Tonkotsu Kazan", price_low: 15, price_high: 25, source: "EatBook" },
  { name: "Gwangjang Gaon", price_low: 20, price_high: 40, source: "EatBook" },
  { name: "Curly's", price_low: 18, price_high: 40, source: "TheSmartLocal" },
  { name: "Legendary Hong Kong", price_low: 10, price_high: 30, source: "EatBook" },
  { name: "Alice Boulangerie Fine Crumbs", price_low: 5, price_high: 15, source: "Honeycombers" },
  { name: "Yoajung", price_low: 6, price_high: 12, source: "EatBook" },
  { name: "Apartment Coffee", price_low: 6, price_high: 15, source: "EatBook" },
  { name: "DJDH Ramen", price_low: 14, price_high: 22, source: "Editor's Choice" },
  { name: "Koung's Wan Tan Mee", price_low: 4, price_high: 8, source: "Seth Lui" },
  { name: "HJH Maimunah Mini", price_low: 6, price_high: 12, source: "Seth Lui" },
  { name: "Ci Yuan HK Wanton Noodle", price_low: 4, price_high: 7, source: "Seth Lui" },
  { name: "Shu Xiang Kitchen", price_low: 5, price_high: 10, source: "Seth Lui" },
];

// Convert price range to display format
function formatPriceRange(low: number, high: number): string {
  if (low === high) {
    return `$${low}`;
  }
  return `$${low}-$${high}`;
}

async function main() {
  console.log('🚀 Updating restaurant prices and sources...\n');
  console.log(`📋 Processing ${restaurantData.length} restaurants\n`);

  let updated = 0;
  let notFound = 0;

  for (const r of restaurantData) {
    const priceRange = formatPriceRange(r.price_low, r.price_high);
    const sourceId = sourceMapping[r.source.toLowerCase()] || 'editors-choice';

    // Find restaurant by name using wildcard search
    const { data: matches, error: findError } = await supabase
      .from('food_listings')
      .select('id, name, price_range, source_id')
      .ilike('name', `%${r.name}%`);

    if (findError || !matches || matches.length === 0) {
      console.log(`❓ Not found: ${r.name}`);
      notFound++;
      continue;
    }

    // Find exact match or best match
    let existing = matches.find(m => m.name.toLowerCase() === r.name.toLowerCase());
    if (!existing) {
      existing = matches[0]; // Use first match
    }

    // Update price range and source
    const { error: updateError } = await supabase
      .from('food_listings')
      .update({
        price_range: priceRange,
        source_id: sourceId
      })
      .eq('id', existing.id);

    if (updateError) {
      console.log(`❌ Update failed: ${r.name} - ${updateError.message}`);
    } else {
      console.log(`✅ ${existing.name}: ${priceRange} (${sourceId})`);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Update Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❓ Not found: ${notFound}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

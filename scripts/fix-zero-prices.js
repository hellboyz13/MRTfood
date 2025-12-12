const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Parse price from description like "$4-8", "$5-10", "$15 - $30"
function parsePriceFromDescription(desc) {
  if (!desc) return null;

  // Try to match patterns like "$4-8", "$5-10", "$15 - $30", "$4 - $6"
  const rangeMatch = desc.match(/\$?([\d.]+)\s*-\s*\$?([\d.]+)/);
  if (rangeMatch) {
    return parseFloat(rangeMatch[1]);
  }

  // Try to match single price like "$5"
  const singleMatch = desc.match(/\$?([\d.]+)/);
  if (singleMatch) {
    return parseFloat(singleMatch[1]);
  }

  return null;
}

async function fixZeroPrices() {
  // Get all prices with $0
  const { data: zeroPrices } = await supabase
    .from('listing_prices')
    .select('id, listing_id, price, description, item_name')
    .eq('price', 0);

  console.log('Found ' + zeroPrices.length + ' prices with $0 value\n');

  let fixed = 0;
  let failed = 0;

  for (const price of zeroPrices) {
    const parsedPrice = parsePriceFromDescription(price.description);

    if (parsedPrice && parsedPrice > 0) {
      const { error } = await supabase
        .from('listing_prices')
        .update({ price: parsedPrice })
        .eq('id', price.id);

      if (!error) {
        console.log('Fixed: ' + price.description + ' -> $' + parsedPrice);
        fixed++;
      } else {
        console.log('Error fixing ' + price.description + ': ' + error.message);
        failed++;
      }
    } else {
      console.log('Could not parse: ' + price.description);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Fixed: ' + fixed);
  console.log('Failed: ' + failed);
}

fixZeroPrices().catch(console.error);

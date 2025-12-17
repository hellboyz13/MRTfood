const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_food_listings_station_id ON food_listings(station_id)',
  'CREATE INDEX IF NOT EXISTS idx_food_listings_name ON food_listings(name)',
  'CREATE INDEX IF NOT EXISTS idx_food_listings_tags ON food_listings USING GIN(tags)',
  'CREATE INDEX IF NOT EXISTS idx_food_listings_rating ON food_listings(rating DESC NULLS LAST)',
  'CREATE INDEX IF NOT EXISTS idx_food_listings_active ON food_listings(is_active) WHERE is_active = true',
  'CREATE INDEX IF NOT EXISTS idx_food_listings_station_active ON food_listings(station_id, is_active) WHERE is_active = true',
  'CREATE INDEX IF NOT EXISTS idx_mall_outlets_mall_id ON mall_outlets(mall_id)',
  'CREATE INDEX IF NOT EXISTS idx_mall_outlets_name ON mall_outlets(name)',
  'CREATE INDEX IF NOT EXISTS idx_malls_station_id ON malls(station_id)',
  'CREATE INDEX IF NOT EXISTS idx_malls_name ON malls(name)',
  'CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name)',
  'CREATE INDEX IF NOT EXISTS idx_listing_sources_listing_id ON listing_sources(listing_id)',
  'CREATE INDEX IF NOT EXISTS idx_listing_sources_source_id ON listing_sources(source_id)',
];

async function applyIndexes() {
  console.log('Applying database indexes for performance optimization...\n');

  for (const indexSql of indexes) {
    const indexName = indexSql.match(/idx_\w+/)[0];
    console.log(`Creating ${indexName}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: indexSql });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Created`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Done! Database indexes applied for 5000+ user scale.');
}

applyIndexes().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

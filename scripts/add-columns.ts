/**
 * Script to add new columns to food_listings table via Supabase
 * Columns: distance_to_station, lat, lng
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkzfrgrxfnqounyeqvvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJremZyZ3J4Zm5xb3VueWVxdnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3OTkzMCwiZXhwIjoyMDgwMTU1OTMwfQ.a5RNbenDZy-fWD6qlaip3w1t2HDqvd7dbRS6tawgQj4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addColumns() {
  console.log('Adding columns to food_listings table...\n');

  // Add distance_to_station column
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS distance_to_station INTEGER;'
  });

  if (error1) {
    console.log('Note: Could not add distance_to_station via RPC. This is expected if the function does not exist.');
    console.log('Please add the columns manually in Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS distance_to_station INTEGER;');
    console.log('ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;');
    console.log('ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;');
    console.log('');
    return;
  }

  // Add lat column
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;'
  });

  if (error2) {
    console.error('Error adding lat column:', error2);
  }

  // Add lng column
  const { error: error3 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;'
  });

  if (error3) {
    console.error('Error adding lng column:', error3);
  }

  console.log('Columns added successfully!');
}

addColumns().catch(console.error);

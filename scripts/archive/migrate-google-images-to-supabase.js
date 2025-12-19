/**
 * Migrate Google API thumbnail URLs to Supabase Storage
 *
 * Structure: restaurant-photos/malls/{mall-id}/outlets/{outlet-id}.jpg
 *
 * Run with: node scripts/migrate-google-images-to-supabase.js [--save]
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'restaurant-photos';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Download image from URL and return buffer
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Upload image to Supabase Storage
async function uploadToSupabase(buffer, path) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    throw new Error(error.message);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// Update outlet thumbnail_url in database
async function updateOutletThumbnail(outletId, newUrl) {
  const { error } = await supabase
    .from('mall_outlets')
    .update({ thumbnail_url: newUrl })
    .eq('id', outletId);

  if (error) {
    throw new Error(error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const saveMode = args.includes('--save');

  console.log('========================================');
  console.log('Migrate Google Images to Supabase Storage');
  console.log('========================================');
  console.log(`Mode: ${saveMode ? 'SAVE' : 'DRY RUN'}\n`);

  // Get all outlets with Google API URLs
  const { data: outlets, error } = await supabase
    .from('mall_outlets')
    .select('id, name, mall_id, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  if (error) {
    console.error('Error fetching outlets:', error.message);
    process.exit(1);
  }

  // Filter to only Google API URLs
  const googleOutlets = outlets.filter(o =>
    o.thumbnail_url && o.thumbnail_url.includes('googleapis.com')
  );

  console.log(`Found ${googleOutlets.length} outlets with Google API URLs\n`);

  if (googleOutlets.length === 0) {
    console.log('No images to migrate!');
    return;
  }

  // Stats
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  // Process each outlet
  for (let i = 0; i < googleOutlets.length; i++) {
    const outlet = googleOutlets[i];
    const progress = `[${i + 1}/${googleOutlets.length}]`;

    console.log(`${progress} ${outlet.name}`);
    console.log(`  Mall: ${outlet.mall_id}`);

    // Generate storage path
    const filename = `${outlet.id}.jpg`;
    const storagePath = `malls/${outlet.mall_id}/outlets/${filename}`;

    console.log(`  Path: ${storagePath}`);

    if (!saveMode) {
      console.log('  [DRY RUN] Would migrate this image');
      skipped++;
      continue;
    }

    try {
      // Download from Google API
      console.log('  Downloading from Google...');
      const imageBuffer = await downloadImage(outlet.thumbnail_url);
      console.log(`  Downloaded: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

      // Upload to Supabase
      console.log('  Uploading to Supabase...');
      const newUrl = await uploadToSupabase(imageBuffer, storagePath);
      console.log(`  Uploaded: ${newUrl.substring(0, 80)}...`);

      // Update database
      console.log('  Updating database...');
      await updateOutletThumbnail(outlet.id, newUrl);
      console.log('  ✓ Done');

      success++;
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      errors.push({ outlet: outlet.name, error: err.message });
      failed++;
    }

    // Rate limiting
    if (saveMode && i < googleOutlets.length - 1) {
      await delay(200);
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total: ${googleOutlets.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.slice(0, 10).forEach(e => {
      console.log(`  - ${e.outlet}: ${e.error}`);
    });
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }

  if (!saveMode) {
    console.log('\n========================================');
    console.log('DRY RUN - Run with --save to migrate');
    console.log('========================================');
  }
}

main().catch(console.error);

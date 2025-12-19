import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

interface MenuImage {
  id: string;
  listing_id: string | null;
  outlet_id: string | null;
  image_url: string;
  display_order: number;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function compareTwoImages(url1: string, url2: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Are these two images the same or very similar food dishes? Answer with only 'yes' if they are duplicates/nearly identical, or 'no' if they are different dishes."
            },
            {
              type: "image_url",
              image_url: { url: url1 }
            },
            {
              type: "image_url",
              image_url: { url: url2 }
            }
          ]
        }
      ],
      max_tokens: 10
    });

    const answer = response.choices[0]?.message?.content?.toLowerCase().trim() || 'no';
    return answer.includes('yes');
  } catch (error) {
    console.error(`    ⚠️  Error comparing images:`, error);
    return false;
  }
}

async function detectDuplicateImages() {
  console.log('🔍 Detecting duplicate images in menu_images with ChatGPT Vision...\n');

  // Get all menu images for food listings (curated list)
  const { data: images, error } = await supabase
    .from('menu_images')
    .select('id, listing_id, outlet_id, image_url, display_order')
    .not('listing_id', 'is', null)
    .order('listing_id')
    .order('display_order');

  if (error || !images) {
    console.error('❌ Error fetching images:', error);
    return;
  }

  console.log(`📊 Analyzing ${images.length} curated listing images...\n`);

  // Group images by listing_id
  const imagesByListing = images.reduce((acc, img) => {
    const listingId = img.listing_id!;
    if (!acc[listingId]) {
      acc[listingId] = [];
    }
    acc[listingId].push(img);
    return acc;
  }, {} as Record<string, MenuImage[]>);

  const duplicateGroups: { listingId: string; duplicates: string[][] }[] = [];
  let totalComparisons = 0;
  let totalDuplicatesFound = 0;

  // Check each listing for duplicate images
  for (const [listingId, listingImages] of Object.entries(imagesByListing)) {
    if (listingImages.length < 2) continue;

    console.log(`\n📋 Checking listing with ${listingImages.length} images...`);

    const duplicatesInListing: string[][] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < listingImages.length; i++) {
      if (processedIds.has(listingImages[i].id)) continue;

      const group: string[] = [listingImages[i].id];
      processedIds.add(listingImages[i].id);

      // Compare with remaining images
      for (let j = i + 1; j < listingImages.length; j++) {
        if (processedIds.has(listingImages[j].id)) continue;

        totalComparisons++;
        process.stdout.write(`  Comparing image ${i + 1} with ${j + 1}... `);

        const isDuplicate = await compareTwoImages(
          listingImages[i].image_url,
          listingImages[j].image_url
        );

        if (isDuplicate) {
          group.push(listingImages[j].id);
          processedIds.add(listingImages[j].id);
          console.log('✅ DUPLICATE');
          totalDuplicatesFound++;
        } else {
          console.log('❌ Different');
        }

        // Rate limit: 4 requests per second
        await delay(250);
      }

      // Only keep groups with 2+ images (actual duplicates)
      if (group.length > 1) {
        duplicatesInListing.push(group);
      }
    }

    if (duplicatesInListing.length > 0) {
      duplicateGroups.push({
        listingId,
        duplicates: duplicatesInListing
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`  Total comparisons: ${totalComparisons}`);
  console.log(`  Listings with duplicates: ${duplicateGroups.length}`);
  console.log(`  Total duplicate images found: ${totalDuplicatesFound}`);
  console.log(`${'='.repeat(60)}\n`);

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate images found!');
    return;
  }

  // Display duplicate groups
  console.log(`\n📋 Duplicate images by listing:\n`);
  for (const { listingId, duplicates } of duplicateGroups) {
    console.log(`\nListing ID: ${listingId}`);
    console.log('-'.repeat(50));
    duplicates.forEach((group, index) => {
      console.log(`  Group ${index + 1}: ${group.length} duplicate images`);
      group.forEach((imageId, i) => {
        const img = images.find(im => im.id === imageId);
        if (img) {
          console.log(`    [${i + 1}] Image ID: ${imageId}`);
          console.log(`        Order: ${img.display_order}`);
          console.log(`        URL: ${img.image_url.substring(0, 80)}...`);
        }
      });
    });
  }

  // Ask for confirmation before deleting
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗑️  Removing duplicate images (keeping first in each group)...\n`);

  let removedCount = 0;
  for (const { listingId, duplicates } of duplicateGroups) {
    for (const group of duplicates) {
      // Keep the first one, remove the rest
      const toRemove = group.slice(1);

      const { error: deleteError } = await supabase
        .from('menu_images')
        .delete()
        .in('id', toRemove);

      if (deleteError) {
        console.error(`❌ Error removing duplicates:`, deleteError);
      } else {
        removedCount += toRemove.length;
        console.log(`  ✅ Removed ${toRemove.length} duplicate(s) from listing ${listingId}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Duplicate removal complete!`);
  console.log(`  Removed: ${removedCount} images`);
  console.log(`  Remaining: ${images.length - removedCount}`);
  console.log(`${'='.repeat(60)}`);
}

detectDuplicateImages();

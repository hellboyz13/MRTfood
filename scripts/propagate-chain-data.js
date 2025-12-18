const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize name for matching (lowercase, remove special chars, trim)
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract chain name from outlet name (handles variations like "Ajisen Ramen", "AJISEN RAMEN", etc.)
function getChainKey(name) {
  return normalizeName(name)
    .replace(/['&]/g, '')
    .replace(/\s+/g, '-');
}

// Get alternative keys for fuzzy matching (e.g., "Starbucks Coffee" -> "starbucks")
function getAlternativeKeys(name) {
  const keys = [getChainKey(name)];
  const normalized = normalizeName(name);

  // Common variations to try
  const variations = [
    // Remove common suffixes
    normalized.replace(/\s*(coffee|cafe|café|restaurant|kitchen|express|singapore|sg)$/i, '').trim(),
    // Remove common prefixes
    normalized.replace(/^(the|mr|mr\.|mrs|ms)\s+/i, '').trim(),
    // First word only (for chains like "Starbucks Coffee" -> "Starbucks")
    normalized.split(' ')[0],
    // First two words
    normalized.split(' ').slice(0, 2).join(' '),
  ];

  variations.forEach(v => {
    if (v && v.length > 2) {
      const key = v.replace(/['&]/g, '').replace(/\s+/g, '-');
      if (!keys.includes(key)) keys.push(key);
    }
  });

  return keys;
}

async function propagateChainData() {
  console.log('=== PROPAGATE CHAIN DATA (THUMBNAILS & OPENING HOURS) ===\n');

  // Step 1: Get ALL outlets (paginate to get all records)
  let allOutlets = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, thumbnail_url, opening_hours')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching outlets:', error);
      return;
    }

    if (!data || data.length === 0) break;

    allOutlets = allOutlets.concat(data);
    offset += pageSize;

    if (data.length < pageSize) break;
  }

  console.log(`Total outlets: ${allOutlets.length}\n`);

  // Build maps of chain data (thumbnail_url and opening_hours)
  // Use multiple keys per outlet for better fuzzy matching
  const chainData = new Map();

  // First pass: collect data from outlets that have it
  allOutlets.forEach(outlet => {
    // Register this outlet under all its alternative keys
    const keys = getAlternativeKeys(outlet.name);

    keys.forEach(key => {
      if (!chainData.has(key)) {
        chainData.set(key, {
          name: outlet.name,
          thumbnail_url: null,
          opening_hours: null
        });
      }

      const data = chainData.get(key);

      // Keep first non-null thumbnail
      if (!data.thumbnail_url && outlet.thumbnail_url) {
        data.thumbnail_url = outlet.thumbnail_url;
      }

      // Keep first non-null opening hours
      if (!data.opening_hours && outlet.opening_hours) {
        data.opening_hours = outlet.opening_hours;
      }
    });
  });

  // Count chains with data
  let chainsWithThumbnail = 0;
  let chainsWithHours = 0;
  chainData.forEach(data => {
    if (data.thumbnail_url) chainsWithThumbnail++;
    if (data.opening_hours) chainsWithHours++;
  });

  console.log(`Unique chains: ${chainData.size}`);
  console.log(`  - with thumbnails: ${chainsWithThumbnail}`);
  console.log(`  - with opening hours: ${chainsWithHours}\n`);

  // Step 2: Find outlets that can be updated (using fuzzy matching)
  const thumbnailUpdates = [];
  const hoursUpdates = [];

  for (const outlet of allOutlets) {
    // Try multiple keys for fuzzy matching
    const keysToTry = getAlternativeKeys(outlet.name);
    let matchedData = null;

    for (const key of keysToTry) {
      if (chainData.has(key)) {
        matchedData = chainData.get(key);
        break;
      }
    }

    if (!matchedData) continue;

    // Check if thumbnail needs updating
    if (!outlet.thumbnail_url && matchedData.thumbnail_url) {
      thumbnailUpdates.push({
        id: outlet.id,
        name: outlet.name,
        mall_id: outlet.mall_id,
        thumbnail_url: matchedData.thumbnail_url,
        matched_with: matchedData.name
      });
    }

    // Check if opening hours needs updating
    if (!outlet.opening_hours && matchedData.opening_hours) {
      hoursUpdates.push({
        id: outlet.id,
        name: outlet.name,
        mall_id: outlet.mall_id,
        opening_hours: matchedData.opening_hours,
        matched_with: matchedData.name
      });
    }
  }

  console.log(`Outlets needing thumbnail update: ${thumbnailUpdates.length}`);
  console.log(`Outlets needing opening hours update: ${hoursUpdates.length}\n`);

  // Update thumbnails
  if (thumbnailUpdates.length > 0) {
    console.log('=== UPDATING THUMBNAILS ===');
    let thumbUpdated = 0;
    for (const update of thumbnailUpdates) {
      const { error } = await supabase
        .from('mall_outlets')
        .update({ thumbnail_url: update.thumbnail_url })
        .eq('id', update.id);

      if (!error) {
        thumbUpdated++;
        console.log(`  ${update.name} @ ${update.mall_id} <- ${update.matched_with}`);
      }
    }
    console.log(`Thumbnails updated: ${thumbUpdated}\n`);
  }

  // Update opening hours
  if (hoursUpdates.length > 0) {
    console.log('=== UPDATING OPENING HOURS ===');
    let hoursUpdated = 0;
    for (const update of hoursUpdates) {
      const { error } = await supabase
        .from('mall_outlets')
        .update({ opening_hours: update.opening_hours })
        .eq('id', update.id);

      if (!error) {
        hoursUpdated++;
        console.log(`  ${update.name} @ ${update.mall_id} <- hours from ${update.matched_with}`);
      }
    }
    console.log(`Opening hours updated: ${hoursUpdated}\n`);
  }

  console.log('=== COMPLETE ===');
}

propagateChainData().catch(console.error);

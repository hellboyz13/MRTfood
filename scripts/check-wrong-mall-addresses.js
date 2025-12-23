/**
 * Check outlets that appear to be in wrong malls by verifying their addresses
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAddresses() {
  // Get malls with their addresses
  const { data: malls } = await supabase.from('malls').select('id, name, address');
  const mallInfo = new Map();
  malls.forEach(m => mallInfo.set(m.id, { name: m.name, address: m.address }));

  // Get all outlets from suspicious malls
  const suspiciousMalls = [
    'ue-square', 'sim-lim-square', 'tanglin-place', 'yew-tee-square',
    'punggol-plaza', 'rivervale-plaza', 'seletar-mall', 'novena-square',
    'heartbeat-bedok', 'one-punggol'
  ];

  // Get ALL outlets and filter
  let allOutlets = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('mall_outlets')
      .select('id, name, mall_id, address')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allOutlets = allOutlets.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  const outlets = allOutlets;
  console.log(`Total outlets: ${outlets.length}`);
  console.log('=== Checking outlets with wrong mall names ===\n');

  // Check each outlet
  const wrongMallOutlets = [];

  outlets.forEach(o => {
    const name = o.name.toLowerCase();

    // Check if mentions another mall
    malls.forEach(m => {
      const mn = m.name.toLowerCase();
      if (mn.length > 5 && name.includes(mn) && m.id !== o.mall_id) {
        wrongMallOutlets.push({
          id: o.id,
          name: o.name,
          currentMall: mallInfo.get(o.mall_id)?.name || o.mall_id,
          currentMallId: o.mall_id,
          currentMallAddress: mallInfo.get(o.mall_id)?.address,
          mentionedMall: m.name,
          mentionedMallId: m.id,
          mentionedMallAddress: mallInfo.get(m.id)?.address,
          outletAddress: o.address
        });
      }
    });
  });

  // Print findings
  console.log(`Found ${wrongMallOutlets.length} outlets mentioning different malls\n`);

  // Group by current mall
  const byCurrentMall = new Map();
  wrongMallOutlets.forEach(o => {
    if (!byCurrentMall.has(o.currentMall)) byCurrentMall.set(o.currentMall, []);
    byCurrentMall.get(o.currentMall).push(o);
  });

  for (const [mallName, items] of byCurrentMall) {
    console.log(`\n=== ${mallName} (${items.length} issues) ===`);
    console.log(`Mall address: ${items[0].currentMallAddress || 'unknown'}`);
    console.log('');

    items.forEach(o => {
      console.log(`OUTLET: ${o.name}`);
      console.log(`  Outlet address: ${o.outletAddress || 'NO ADDRESS'}`);
      console.log(`  Mentions: ${o.mentionedMall}`);
      console.log(`  ${o.mentionedMall} address: ${o.mentionedMallAddress || 'unknown'}`);

      // Check if outlet address matches mentioned mall
      if (o.outletAddress && o.mentionedMallAddress) {
        const outletAddr = o.outletAddress.toLowerCase();
        const mentionedAddr = o.mentionedMallAddress.toLowerCase();

        // Extract key parts of addresses to compare
        const outletMatch = outletAddr.includes('marina') || outletAddr.includes('tanglin') ||
                          outletAddr.includes('waterway') || outletAddr.includes('rivervale');

        if (outletAddr.includes('marina') && o.mentionedMall.toLowerCase().includes('marina')) {
          console.log(`  >>> LIKELY WRONG MALL - address mentions Marina`);
        } else if (outletAddr.includes('tanglin') && o.mentionedMall.toLowerCase().includes('tanglin')) {
          console.log(`  >>> LIKELY WRONG MALL - address mentions Tanglin`);
        }
      }
      console.log('');
    });
  }
}

checkAddresses();

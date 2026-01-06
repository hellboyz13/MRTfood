const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findNonFoodOutlets() {
  // Get total count first
  const { count } = await supabase
    .from('mall_outlets')
    .select('*', { count: 'exact', head: true });

  console.log('Total mall outlets:', count);

  // Get all outlets with mall info
  const { data, error } = await supabase
    .from('mall_outlets')
    .select('id, name, category, mall_id')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // First, let's see all unique categories
  const categories = {};
  data.forEach(outlet => {
    const cat = outlet.category || 'NULL';
    if (!categories[cat]) categories[cat] = 0;
    categories[cat]++;
  });

  console.log('\n--- All Categories ---\n');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`${count.toString().padStart(4)} : ${cat}`);
    });

  console.log('\n--- Searching for non-food outlets ---\n');

  const foundNonFood = [];

  // Non-food detection function
  function detectNonFood(outlet) {
    const nameLower = outlet.name.toLowerCase();

    // Supermarkets
    if (nameLower.includes('fairprice') || nameLower.includes('ntuc') ||
        nameLower.includes('cold storage') || nameLower.includes('sheng siong') ||
        nameLower.includes('giant hypermarket') || nameLower.includes('giant supermarket') ||
        nameLower.includes('prime supermarket')) {
      return 'Supermarket';
    }

    // Pharmacies
    if ((nameLower === 'guardian' || nameLower.startsWith('guardian ')) ||
        (nameLower === 'watsons' || nameLower.startsWith('watsons ')) ||
        nameLower.includes('unity pharmacy') || nameLower.includes('welcia')) {
      return 'Pharmacy';
    }

    // Banks
    if (nameLower.includes('bank of') || nameLower.includes('dbs bank') ||
        nameLower.includes('ocbc bank') || nameLower.includes('uob bank') ||
        nameLower.includes('maybank') || nameLower.includes('citibank') ||
        nameLower.includes('standard chartered') || nameLower.includes('hsbc') ||
        nameLower.includes('posb') || nameLower.includes('atm')) {
      return 'Bank';
    }

    // Electronics
    if ((nameLower === 'challenger' || nameLower.startsWith('challenger ')) ||
        nameLower.includes('best denki') || nameLower.includes('harvey norman') ||
        (nameLower === 'courts' || nameLower.startsWith('courts ')) ||
        nameLower.includes('gain city') || nameLower.includes('audio house')) {
      return 'Electronics';
    }

    // Cinemas
    if (nameLower.includes('golden village') || nameLower.includes('shaw theatre') ||
        nameLower.includes('cathay cineplex') || nameLower.includes('filmgarde') ||
        nameLower.includes('cinema') || nameLower.includes('imax')) {
      return 'Cinema';
    }

    // Variety stores
    if ((nameLower === 'daiso' || nameLower.startsWith('daiso ')) ||
        nameLower.includes('japan home') ||
        (nameLower === 'miniso' || nameLower.startsWith('miniso ')) ||
        (nameLower === 'muji' || nameLower.startsWith('muji '))) {
      return 'Variety Store';
    }

    // Telecom
    if ((nameLower === 'singtel' || nameLower.startsWith('singtel ')) ||
        (nameLower === 'starhub' || nameLower.startsWith('starhub ')) ||
        (nameLower === 'm1' || nameLower.startsWith('m1 shop')) ||
        nameLower.includes('circles.life')) {
      return 'Telecom';
    }

    // Bookstores
    if ((nameLower === 'popular' || nameLower.startsWith('popular bookstore')) ||
        nameLower.includes('times bookstore') ||
        nameLower.includes('kinokuniya')) {
      return 'Bookstore';
    }

    // Clinics/Medical (avoid false positives like "Salad Stop")
    if ((nameLower.includes(' clinic') && !nameLower.includes('food')) ||
        (nameLower.includes('dental') && !nameLower.includes('cafe')) ||
        nameLower.includes('medical centre') || nameLower.includes('tcm clinic') ||
        nameLower.includes('polyclinic') || nameLower.includes('optometrist') ||
        nameLower.includes('specialist centre')) {
      return 'Medical/Clinic';
    }

    // Salons/Spas (avoid food places with "spa" in name)
    if ((nameLower.includes(' salon') && !nameLower.includes('food')) ||
        (nameLower.includes(' spa') && !nameLower.includes('spag')) ||
        nameLower.includes('hair studio') ||
        (nameLower.includes('barber') && !nameLower.includes('burger') && !nameLower.includes('grill'))) {
      return 'Salon/Spa';
    }

    // Gyms/Fitness
    if ((nameLower.includes(' gym') && !nameLower.includes('food')) ||
        nameLower.includes('activesg') || nameLower.includes('anytime fitness') ||
        nameLower.includes('fitness first') || nameLower.includes('virgin active')) {
      return 'Gym/Fitness';
    }

    // Fashion (common chain stores)
    if ((nameLower === 'uniqlo' || nameLower.startsWith('uniqlo ')) ||
        (nameLower === 'h&m' || nameLower.startsWith('h&m ')) ||
        (nameLower === 'zara' || nameLower.startsWith('zara ')) ||
        nameLower.includes('cotton on') || nameLower.includes('charles & keith') ||
        nameLower.includes('nike') || nameLower.includes('adidas') ||
        nameLower.includes('foot locker')) {
      return 'Fashion';
    }

    // Department stores
    if (nameLower.includes('takashimaya') || nameLower.includes('isetan') ||
        (nameLower === 'metro' || nameLower.startsWith('metro ')) ||
        nameLower.includes('robinsons') || nameLower.includes('bhg')) {
      return 'Department Store';
    }

    // Jewelry/Watches
    if (nameLower.includes('jeweller') || nameLower.includes('jewelry') ||
        nameLower.includes('goldsmith') || nameLower.includes('poh heng') ||
        nameLower.includes('lee hwa') || nameLower.includes('sk jewellery') ||
        nameLower.includes('chip lee jewel')) {
      return 'Jewelry';
    }

    // Money changers (avoid food places with exchange in name)
    if (nameLower.includes('money changer')) {
      return 'Money Changer';
    }

    // Services (exclude restaurants with quirky names)
    if ((nameLower.includes('laundry') && !nameLower.includes('eatery') && !nameLower.includes('restaurant') && !nameLower.includes('cafe')) ||
        nameLower.includes('dry clean') ||
        (nameLower.includes('tailor') && !nameLower.includes('food') && !nameLower.includes('cafe')) ||
        nameLower.includes('alteration') ||
        nameLower.includes('locksmith') || nameLower.includes('cobbler') ||
        nameLower.includes('key cutting')) {
      return 'Services';
    }

    // Optical
    if (nameLower.includes('optical') || nameLower.includes('owndays') ||
        nameLower.includes('spectacle') || nameLower.includes('eyewear')) {
      return 'Optical';
    }

    // Pet stores
    if ((nameLower.includes('pet') && !nameLower.includes('appetit')) ||
        nameLower.includes('petlover') || nameLower.includes('pets paradise')) {
      return 'Pet Store';
    }

    // Arcade/Gaming
    if (nameLower.includes('arcade') || nameLower.includes('timezone') ||
        nameLower.includes('virtualand')) {
      return 'Arcade';
    }

    return null;
  }

  data.forEach(outlet => {
    const type = detectNonFood(outlet);
    if (type) {
      foundNonFood.push({ ...outlet, type });
    }
  });

  // Group by type
  const byType = {};
  foundNonFood.forEach(outlet => {
    if (!byType[outlet.type]) byType[outlet.type] = [];
    byType[outlet.type].push(outlet);
  });

  console.log(`Found ${foundNonFood.length} non-food outlets:\n`);

  Object.keys(byType).sort().forEach(type => {
    console.log(`=== ${type} (${byType[type].length}) ===`);
    byType[type].forEach(outlet => {
      console.log(`  - ${outlet.name} (${outlet.category || 'no category'})`);
    });
    console.log('');
  });

  // Output IDs for deletion
  console.log('\n--- IDs of non-food outlets for deletion ---\n');
  console.log('const nonFoodIds = [');
  foundNonFood.forEach(outlet => {
    console.log(`  '${outlet.id}', // ${outlet.name} [${outlet.type}]`);
  });
  console.log('];');
  console.log(`\n// Total: ${foundNonFood.length} outlets`);

  // Also show items with NULL category for manual review
  const nullCategory = data.filter(o => !o.category);
  console.log('\n\n--- Outlets with NULL category (for manual review) ---\n');
  nullCategory.forEach(outlet => {
    console.log(`  - ${outlet.name} (${outlet.mall_id})`);
  });
  console.log(`\n// Total with NULL category: ${nullCategory.length}`);
}

findNonFoodOutlets();

import { Food, StationFoodData, SponsoredListing } from '@/types';

export const stationFoodData: StationFoodData = {
  'newton': [
    {
      id: 'newton-1',
      name: 'Newton Food Centre',
      rating: 4.5,
      description: 'Famous hawker centre with BBQ seafood, satay, and local delights.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'newton',
    },
    {
      id: 'newton-2',
      name: 'Hup Kee Fried Oyster',
      rating: 4.3,
      description: 'Crispy fried oyster omelette, a local favorite since 1970.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'newton',
    },
    {
      id: 'newton-3',
      name: 'Alliance Seafood',
      rating: 4.4,
      description: 'Fresh BBQ stingray, prawns, and chilli crab at hawker prices.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'newton',
    },
    {
      id: 'newton-4',
      name: 'Kwee Heng Satay',
      rating: 4.2,
      description: 'Juicy chicken and mutton satay with rich peanut sauce.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'newton',
    },
    {
      id: 'newton-5',
      name: 'TKR Zhi Char',
      rating: 4.1,
      description: 'Wok-fried dishes including cereal prawns and salted egg squid.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'newton',
    },
  ],
  'orchard': [
    {
      id: 'orchard-1',
      name: 'Din Tai Fung',
      rating: 4.6,
      description: 'World-famous xiao long bao and Taiwanese cuisine.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'orchard',
    },
    {
      id: 'orchard-2',
      name: 'PS.Cafe',
      rating: 4.4,
      description: 'Stylish cafe with truffle fries, burgers, and decadent cakes.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'orchard',
    },
    {
      id: 'orchard-3',
      name: 'TWG Tea Salon',
      rating: 4.5,
      description: 'Premium teas with elegant pastries and high tea sets.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'orchard',
    },
    {
      id: 'orchard-4',
      name: 'Wingstop',
      rating: 4.0,
      description: 'Crispy chicken wings in various bold flavors.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'orchard',
    },
    {
      id: 'orchard-5',
      name: 'Paradise Dynasty',
      rating: 4.3,
      description: 'Eight-colored xiao long bao and la mian noodles.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'orchard',
    },
  ],
  'chinatown': [
    {
      id: 'chinatown-1',
      name: 'Tian Tian Hainanese Chicken Rice',
      rating: 4.7,
      description: 'Anthony Bourdain-approved chicken rice at Maxwell Food Centre.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'chinatown',
    },
    {
      id: 'chinatown-2',
      name: 'Liao Fan Hawker Chan',
      rating: 4.5,
      description: 'Michelin-starred soya sauce chicken and char siu.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'chinatown',
    },
    {
      id: 'chinatown-3',
      name: 'Jin Ji Teochew Braised Duck',
      rating: 4.4,
      description: 'Tender braised duck and kway chap with rich herbal broth.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'chinatown',
    },
    {
      id: 'chinatown-4',
      name: 'Nan Xiang Steamed Bun',
      rating: 4.2,
      description: 'Fluffy steamed buns with savory meat fillings.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'chinatown',
    },
    {
      id: 'chinatown-5',
      name: 'Old Amoy Chendol',
      rating: 4.3,
      description: 'Classic chendol with gula melaka and coconut milk.',
      imageUrl: '/placeholder-food.jpg',
      stationId: 'chinatown',
    },
  ],
};

// Station name mapping for display
export const stationNames: { [key: string]: string } = {
  'newton': 'Newton',
  'orchard': 'Orchard',
  'chinatown': 'Chinatown',
  'dhoby-ghaut': 'Dhoby Ghaut',
  'city-hall': 'City Hall',
  'raffles-place': 'Raffles Place',
  'marina-bay': 'Marina Bay',
  'bayfront': 'Bayfront',
  'promenade': 'Promenade',
  'bugis': 'Bugis',
  'little-india': 'Little India',
  'somerset': 'Somerset',
  'bishan': 'Bishan',
  'ang-mo-kio': 'Ang Mo Kio',
  'toa-payoh': 'Toa Payoh',
  'novena': 'Novena',
  'tampines': 'Tampines',
  'jurong-east': 'Jurong East',
  'harbourfront': 'HarbourFront',
  'serangoon': 'Serangoon',
  'paya-lebar': 'Paya Lebar',
  'outram-park': 'Outram Park',
  'clarke-quay': 'Clarke Quay',
  'lavender': 'Lavender',
  'kallang': 'Kallang',
  'boon-lay': 'Boon Lay',
  'clementi': 'Clementi',
  'dover': 'Dover',
  'buona-vista': 'Buona Vista',
  'queenstown': 'Queenstown',
  'redhill': 'Redhill',
  'tiong-bahru': 'Tiong Bahru',
  'tanjong-pagar': 'Tanjong Pagar',
  'expo': 'Expo',
  'changi-airport': 'Changi Airport',
  'tanah-merah': 'Tanah Merah',
  'bedok': 'Bedok',
  'pasir-ris': 'Pasir Ris',
  'punggol': 'Punggol',
  'sengkang': 'Sengkang',
  'botanic-gardens': 'Botanic Gardens',
  'stevens': 'Stevens',
  'caldecott': 'Caldecott',
  'bukit-panjang': 'Bukit Panjang',
  'woodlands': 'Woodlands',
};

// Sponsored listings for select stations
export const sponsoredListings: SponsoredListing[] = [
  {
    stationId: 'newton',
    restaurant: {
      name: 'Wingstop',
      image: '/placeholder-food.jpg',
      rating: 4.3,
      promotion: 'Buy 1 Get 1 Wings!',
      link: '#',
    },
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  },
  {
    stationId: 'orchard',
    restaurant: {
      name: 'Din Tai Fung',
      image: '/placeholder-food.jpg',
      rating: 4.6,
      promotion: 'Free Xiao Long Bao with $50 spend',
      link: '#',
    },
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  },
  {
    stationId: 'chinatown',
    restaurant: {
      name: 'Ya Kun Kaya Toast',
      image: '/placeholder-food.jpg',
      rating: 4.4,
      promotion: '20% off breakfast sets',
      link: '#',
    },
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  },
];

// Helper function to get active sponsored listing for a station
export const getSponsoredListing = (stationId: string): SponsoredListing | undefined => {
  const now = new Date();
  return sponsoredListings.find(
    listing =>
      listing.stationId === stationId &&
      listing.isActive &&
      new Date(listing.startDate) <= now &&
      new Date(listing.endDate) >= now
  );
};
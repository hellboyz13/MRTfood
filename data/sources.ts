import { FoodSource } from '@/types';

export const foodSources: FoodSource[] = [
  // Michelin Categories
  {
    id: 'michelin-3-star',
    name: 'Michelin 3 Stars',
    icon: '⭐⭐⭐',
    url: 'https://guide.michelin.com/sg/en',
    bgColor: '#FEF3C7', // amber-100 (gold)
  },
  {
    id: 'michelin-2-star',
    name: 'Michelin 2 Stars',
    icon: '⭐⭐',
    url: 'https://guide.michelin.com/sg/en',
    bgColor: '#E5E7EB', // gray-200 (silver)
  },
  {
    id: 'michelin-1-star',
    name: 'Michelin 1 Star',
    icon: '⭐',
    url: 'https://guide.michelin.com/sg/en',
    bgColor: '#FEE2E2', // red-100
  },
  {
    id: 'michelin-hawker',
    name: 'Michelin Hawker',
    icon: '🍽️',
    url: 'https://guide.michelin.com/sg/en',
    bgColor: '#DBEAFE', // blue-100
  },
  // Editor's Choice
  {
    id: 'editors-choice',
    name: "Editor's Choice",
    icon: '✨',
    url: '',
    bgColor: '#FDF4FF', // fuchsia-50
  },
  // Food Media
  {
    id: 'eatbook',
    name: 'EatBook',
    icon: '📖',
    url: 'https://eatbook.sg/',
    bgColor: '#FEF3C7', // amber-100
  },
  {
    id: 'ieatishootipost',
    name: 'ieatishootipost',
    icon: '📸',
    url: 'https://ieatishootipost.sg/',
    bgColor: '#ECFCCB', // lime-100
  },
  {
    id: 'get-fed',
    name: 'GET FED',
    icon: '🍉',
    url: 'https://www.youtube.com/@getfed',
    bgColor: '#FED7AA', // orange-200
  },
];

// Helper to get a source by ID
export const getSourceById = (id: string): FoodSource | undefined => {
  return foodSources.find(source => source.id === id);
};

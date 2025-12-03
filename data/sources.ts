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
    id: 'michelin-bib-gourmand',
    name: 'Bib Gourmand',
    icon: '🍽️',
    url: 'https://guide.michelin.com/sg/en',
    bgColor: '#DBEAFE', // blue-100
  },
  // Other Sources
  {
    id: 'seth-lui',
    name: 'Seth Lui',
    icon: '🍜',
    url: 'https://sethlui.com',
    bgColor: '#FEF3C7', // amber-100
  },
  {
    id: 'eatbook',
    name: 'Eatbook',
    icon: '🍔',
    url: 'https://eatbook.sg',
    bgColor: '#DBEAFE', // blue-100
  },
  {
    id: 'miss-tam-chiak',
    name: 'Miss Tam Chiak',
    icon: '🥢',
    url: 'https://misstamchiak.com',
    bgColor: '#FCE7F3', // pink-100
  },
  {
    id: 'ieatishootipost',
    name: 'ieatishootipost',
    icon: '📸',
    url: 'https://ieatishootipost.sg',
    bgColor: '#D1FAE5', // emerald-100
  },
  {
    id: 'zermatt-neo',
    name: 'Zermatt Neo',
    icon: '🎬',
    url: 'https://youtube.com/@ZermattNeo',
    bgColor: '#E0E7FF', // indigo-100
  },
];

// Helper to get a source by ID
export const getSourceById = (id: string): FoodSource | undefined => {
  return foodSources.find(source => source.id === id);
};

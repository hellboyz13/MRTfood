'use client';

import { Food } from '@/types';

interface FoodCardProps {
  food: Food;
}

export default function FoodCard({ food }: FoodCardProps) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
      {/* Placeholder image */}
      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Food details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
          {food.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1">
          <svg
            className="w-4 h-4 text-yellow-400 fill-current"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">{food.rating.toFixed(1)}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
          {food.description}
        </p>
      </div>
    </div>
  );
}
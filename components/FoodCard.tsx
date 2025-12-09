'use client';

import { Food } from '@/types';
import { IconImage, IconStar } from './Icons';

interface FoodCardProps {
  food: Food;
}

export default function FoodCard({ food }: FoodCardProps) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
      {/* Placeholder image */}
      <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
        <IconImage className="w-8 h-8 text-gray-400" />
      </div>

      {/* Food details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
          {food.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1">
          <IconStar className="w-4 h-4 text-yellow-400" />
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
'use client';

import { ChainOutlet } from '@/types/database';

interface ChainOutletCardProps {
  outlet: ChainOutlet;
  brandName: string;
}

function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatWalkTime(minutes: number | null): string {
  if (!minutes) return '';
  return `${minutes} min walk`;
}

export default function ChainOutletCard({ outlet, brandName }: ChainOutletCardProps) {
  const distance = formatDistance(outlet.distance_to_station);
  const walkTime = formatWalkTime(outlet.walk_time);

  const handleGetDirections = () => {
    const query = encodeURIComponent(outlet.name + ' ' + (outlet.address || 'Singapore'));
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">{outlet.name}</h4>
          {outlet.address && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{outlet.address}</p>
          )}
        </div>
        {outlet.rating && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-amber-500 text-xs">★</span>
            <span className="text-xs text-gray-600">{outlet.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {(distance || walkTime) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <span>{distance}</span>
          {distance && walkTime && <span>•</span>}
          <span>{walkTime}</span>
        </div>
      )}

      <button
        onClick={handleGetDirections}
        className="w-full py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
      >
        Get Directions
      </button>
    </div>
  );
}

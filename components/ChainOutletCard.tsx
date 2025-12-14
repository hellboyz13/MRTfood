'use client';

import { ChainOutlet, FoodListingWithSources } from '@/types/database';
import { getChainLogo } from '@/lib/chainLogos';
import { getMapsUrl } from '@/lib/distance';
import { useState, useEffect } from 'react';

interface ChainOutletCardProps {
  outlet: ChainOutlet;
  brandName: string;
  highlighted?: boolean;
  onViewMenu?: (listing: FoodListingWithSources) => void;
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

export default function ChainOutletCard({ outlet, brandName, highlighted = false, onViewMenu }: ChainOutletCardProps) {
  const distance = formatDistance(outlet.distance_to_station);
  const walkTime = formatWalkTime(outlet.walk_time);
  const [logoError, setLogoError] = useState(false);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const logoUrl = getChainLogo(brandName);

  // Fetch header/thumbnail image from menu_images for chain outlets
  useEffect(() => {
    async function fetchThumbnail() {
      try {
        const response = await fetch(`/api/get-menu-images?outletId=${outlet.id}`);
        const data = await response.json();

        if (data.success && data.images.length > 0) {
          // Get the header image (first image with is_header=true)
          const headerImg = data.images.find((img: any) => img.is_header);
          setThumbnailImage(headerImg?.image_url || data.images[0]?.image_url);
        }
      } catch (error) {
        // Silently fail - will show fallback image
      }
    }

    fetchThumbnail();
  }, [outlet.id]);

  const handleGetDirections = () => {
    window.open(getMapsUrl(outlet.name, null, outlet.address), '_blank');
  };

  // Convert outlet to FoodListingWithSources format for menu preview
  const handleViewMenu = () => {
    if (!onViewMenu) return;

    const listing: FoodListingWithSources = {
      id: outlet.id,
      name: outlet.name,
      description: brandName,
      address: outlet.address,
      station_id: outlet.nearest_station_id,
      image_url: null,
      rating: outlet.rating,
      source_id: null,
      source_url: null,
      tags: outlet.food_tags || [],
      is_active: outlet.is_active,
      is_24h: false,
      created_at: outlet.created_at,
      updated_at: outlet.updated_at,
      distance_to_station: outlet.distance_to_station,
      walking_time: outlet.walk_time,
      lat: outlet.latitude,
      lng: outlet.longitude,
      landmark: null, // Chain outlets use address for Google Maps
      sources: [],
      trust_score: 0,
    };
    onViewMenu(listing);
  };

  return (
    <div className={`rounded-lg p-3 hover:shadow-md transition-shadow ${
      highlighted
        ? 'bg-[#FFF0ED] border-2 border-[#FF6B4A] ring-2 ring-[#FF6B4A]/20'
        : 'bg-white border border-[#E0DCD7]'
    }`}>
      <div className="flex items-start gap-3 mb-2">
        {/* Brand Logo or Food Thumbnail */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#F5F3F0] flex items-center justify-center">
          {thumbnailImage ? (
            <img
              src={thumbnailImage}
              alt={outlet.name}
              className="w-full h-full object-cover"
            />
          ) : logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="w-full h-full object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-[#2D2D2D] text-sm truncate">{outlet.name}</h4>
            {outlet.address && (
              <p className="text-xs text-[#757575] mt-0.5 line-clamp-2">{outlet.address}</p>
            )}
          </div>
          {outlet.rating && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-[#FF6B4A] text-xs">★</span>
              <span className="text-xs text-[#757575]">{outlet.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {(distance || walkTime) && (
        <div className="flex items-center gap-1 text-xs text-[#757575] mb-2">
          <span>{distance}</span>
          {distance && walkTime && <span>•</span>}
          <span>{walkTime}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleGetDirections}
          className="flex-1 py-1.5 px-3 bg-[#E8E4E0] hover:bg-[#DDD9D4] text-[#2D2D2D] text-xs font-medium rounded transition-colors"
        >
          Get Directions
        </button>
        {onViewMenu && (
          <button
            onClick={handleViewMenu}
            className="flex-1 py-1.5 px-3 bg-[#FF6B4A] hover:bg-[#E55A3A] text-white text-sm font-semibold rounded transition-colors flex items-center justify-center"
          >
            Menu
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FoodListingWithSources } from '@/types/database';

interface MenuPreviewProps {
  listing: FoodListingWithSources;
  onBack: () => void;
}

interface MenuImage {
  url: string;
  link: string;
}

function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getMichelinBadge(sources: any[]): string | null {
  for (const s of sources) {
    if (s.source.id === 'michelin-3-star') return '⭐⭐⭐ Michelin 3-Star';
    if (s.source.id === 'michelin-2-star') return '⭐⭐ Michelin 2-Star';
    if (s.source.id === 'michelin-1-star') return '⭐ Michelin 1-Star';
    if (s.source.id === 'michelin-bib-gourmand') return '🍴 Bib Gourmand';
    if (s.source.id === 'michelin-hawker') return '🍜 Michelin Plate';
  }
  return null;
}

export default function MenuPreview({ listing, onBack }: MenuPreviewProps) {
  const [images, setImages] = useState<MenuImage[]>([]);

  useEffect(() => {
    // Placeholder for menu images - could be fetched from Google Places API later
    // For now, create placeholder grid
    const placeholders: MenuImage[] = Array.from({ length: 9 }, (_, i) => ({
      url: listing.image_url || '/default-food.jpg',
      link: '#'
    }));
    setImages(placeholders);
  }, [listing]);

  const distance = formatDistance(listing.distance_to_station);
  const badge = getMichelinBadge(listing.sources);
  const rating = listing.rating || 4.5;

  return (
    <div className="insta-profile">
      {/* Header - Instagram style */}
      <div className="insta-header">
        <button onClick={onBack} className="back-btn" aria-label="Go back">
          ←
        </button>
        <span className="header-title">{listing.name}</span>
        <div className="header-spacer"></div>
      </div>

      {/* Profile section */}
      <div className="profile-section">
        <div className="profile-pic">
          <img
            src={listing.image_url || '/default-food.jpg'}
            alt={listing.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-food.jpg';
            }}
          />
        </div>
        <div className="profile-info">
          <h2>{listing.name}</h2>
          {listing.address && (
            <p className="location">📍 {listing.address}</p>
          )}
          {badge && (
            <p className="badge">{badge}</p>
          )}
        </div>
      </div>

      {/* Stats row - like Instagram followers/following */}
      <div className="stats-row">
        <div className="stat">
          <span className="stat-number">{images.length}</span>
          <span className="stat-label">dishes</span>
        </div>
        <div className="stat">
          <span className="stat-number">⭐ {rating.toFixed(1)}</span>
          <span className="stat-label">rating</span>
        </div>
        <div className="stat">
          <span className="stat-number">{distance || 'Near'}</span>
          <span className="stat-label">away</span>
        </div>
      </div>

      {/* Tab section */}
      <div className="tab-section">
        <div className="tab active">🍽️ Menu</div>
      </div>

      {/* Image grid - Instagram style 3 columns */}
      <div className="insta-grid">
        {images.map((img, i) => (
          <div
            key={i}
            className="insta-img"
            onClick={() => {
              if (img.link !== '#') {
                window.open(img.link, '_blank');
              }
            }}
          >
            <img
              src={img.url}
              alt={`Dish ${i + 1}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-food.jpg';
              }}
            />
          </div>
        ))}
      </div>

      {/* Empty state if no images */}
      {images.length === 0 && (
        <div className="empty-menu">
          <div className="text-4xl mb-3">📸</div>
          <p className="text-gray-500 text-sm">
            Menu photos coming soon!
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Check back later for food photos.
          </p>
        </div>
      )}
    </div>
  );
}

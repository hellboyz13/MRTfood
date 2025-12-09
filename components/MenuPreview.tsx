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
  is_header?: boolean;
}

interface StoredMenuImage {
  id: string;
  image_url: string;
  is_header: boolean;
  display_order: number;
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
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMenuImages() {
      setLoading(true);

      try {
        // Detect if this is a chain outlet (TEXT id) or food listing (UUID)
        // Chain outlet IDs contain hyphens and letters (e.g., "kfc-ChIJ...")
        // UUIDs are formatted differently (e.g., "123e4567-e89b-12d3-a456-426614174000")
        const isChainOutlet = listing.id.includes('ChIJ') || listing.id.split('-').length > 5;
        const queryParam = isChainOutlet ? `outletId=${listing.id}` : `listingId=${listing.id}`;

        // Fetch existing images from database
        const response = await fetch(`/api/get-menu-images?${queryParam}`);
        const data = await response.json();

        if (data.success && data.images.length > 0) {
          // We have images in database
          const storedImages: StoredMenuImage[] = data.images;
          const header = storedImages.find(img => img.is_header);

          setHeaderImage(header?.image_url || storedImages[0]?.image_url || null);
          setImages(storedImages.map(img => ({
            url: img.image_url,
            link: '#',
            is_header: img.is_header
          })));
        } else {
          // No images in database, use fallback
          setHeaderImage(listing.image_url || null);
          setImages([]);
        }
      } catch (error) {
        console.error('Error loading menu images:', error);
        setHeaderImage(listing.image_url || null);
        setImages([]);
      } finally {
        setLoading(false);
      }
    }

    loadMenuImages();
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
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-2xl">⏳</div>
            </div>
          ) : (headerImage || listing.image_url) ? (
            <img
              src={headerImage || listing.image_url || ''}
              alt={listing.name}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <span className="text-6xl">🍽️</span>
            </div>
          )}
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
      {images.length > 0 && (
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
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-food.jpg';
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state if no images and not loading */}
      {!loading && images.length === 0 && (
        <div className="empty-menu">
          <div className="text-4xl mb-3">📸</div>
          <p className="text-gray-500 text-sm font-medium">
            Menu photos coming soon!
          </p>
          <p className="text-gray-400 text-xs mt-1 mb-4">
            We're working on adding photos for this restaurant
          </p>
          <a
            href={`https://www.instagram.com/explore/tags/${encodeURIComponent(listing.name.toLowerCase().replace(/[^a-z0-9]/g, ''))}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Search on Instagram
          </a>
        </div>
      )}
    </div>
  );
}

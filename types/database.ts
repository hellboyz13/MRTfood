export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      stations: {
        Row: {
          id: string;
          name: string;
          lines: string[];
          lat: number | null;
          lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          lines?: string[];
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          lines?: string[];
          lat?: number | null;
          lng?: number | null;
          updated_at?: string;
        };
      };
      food_sources: {
        Row: {
          id: string;
          name: string;
          icon: string;
          url: string | null;
          bg_color: string;
          weight: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          icon?: string;
          url?: string | null;
          bg_color?: string;
          weight?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          url?: string | null;
          bg_color?: string;
          weight?: number;
        };
      };
      listing_sources: {
        Row: {
          id: string;
          listing_id: string;
          source_id: string;
          source_url: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          source_id: string;
          source_url?: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          source_id?: string;
          source_url?: string;
          is_primary?: boolean;
        };
      };
      food_listings: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string | null;
          station_id: string | null;
          image_url: string | null;
          rating: number | null;
          source_id: string | null;
          source_url: string | null;
          tags: string[];
          is_active: boolean;
          is_24h: boolean;
          created_at: string;
          updated_at: string;
          distance_to_station: number | null;
          walking_time: number | null;
          lat: number | null;
          lng: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          address?: string | null;
          station_id?: string | null;
          image_url?: string | null;
          rating?: number | null;
          source_id?: string | null;
          source_url?: string | null;
          tags?: string[];
          is_active?: boolean;
          is_24h?: boolean;
          created_at?: string;
          updated_at?: string;
          distance_to_station?: number | null;
          walking_time?: number | null;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          station_id?: string | null;
          image_url?: string | null;
          rating?: number | null;
          source_id?: string | null;
          source_url?: string | null;
          tags?: string[];
          is_active?: boolean;
          is_24h?: boolean;
          updated_at?: string;
          distance_to_station?: number | null;
          walking_time?: number | null;
          lat?: number | null;
          lng?: number | null;
        };
      };
      sponsored_listings: {
        Row: {
          id: string;
          station_id: string | null;
          restaurant_name: string;
          restaurant_image: string | null;
          restaurant_rating: number | null;
          promotion: string | null;
          link: string | null;
          is_active: boolean;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          station_id?: string | null;
          restaurant_name: string;
          restaurant_image?: string | null;
          restaurant_rating?: number | null;
          promotion?: string | null;
          link?: string | null;
          is_active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          station_id?: string | null;
          restaurant_name?: string;
          restaurant_image?: string | null;
          restaurant_rating?: number | null;
          promotion?: string | null;
          link?: string | null;
          is_active?: boolean;
          start_date?: string | null;
          end_date?: string | null;
          updated_at?: string;
        };
      };
      chain_brands: {
        Row: {
          id: string;
          name: string;
          category: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          category: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          logo_url?: string | null;
          updated_at?: string;
        };
      };
      chain_outlets: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          address: string | null;
          latitude: number;
          longitude: number;
          nearest_station_id: string | null;
          distance_to_station: number | null;
          walk_time: number | null;
          google_place_id: string | null;
          phone: string | null;
          opening_hours: Json | null;
          rating: number | null;
          food_tags: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          brand_id: string;
          name: string;
          address?: string | null;
          latitude: number;
          longitude: number;
          nearest_station_id?: string | null;
          distance_to_station?: number | null;
          walk_time?: number | null;
          google_place_id?: string | null;
          phone?: string | null;
          opening_hours?: Json | null;
          rating?: number | null;
          food_tags?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          name?: string;
          address?: string | null;
          latitude?: number;
          longitude?: number;
          nearest_station_id?: string | null;
          distance_to_station?: number | null;
          walk_time?: number | null;
          google_place_id?: string | null;
          phone?: string | null;
          opening_hours?: Json | null;
          rating?: number | null;
          food_tags?: string[] | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience types for row data
export type Station = Database['public']['Tables']['stations']['Row'];
export type FoodSource = Database['public']['Tables']['food_sources']['Row'];
export type FoodListing = Database['public']['Tables']['food_listings']['Row'];
export type SponsoredListing = Database['public']['Tables']['sponsored_listings']['Row'];
export type ListingSource = Database['public']['Tables']['listing_sources']['Row'];
export type ChainBrand = Database['public']['Tables']['chain_brands']['Row'];
export type ChainOutlet = Database['public']['Tables']['chain_outlets']['Row'];

// Source with its metadata from junction table
export interface ListingSourceWithDetails {
  source: FoodSource;
  source_url: string;
  is_primary: boolean;
}

// Listing with all its sources (via junction table)
export interface FoodListingWithSources extends FoodListing {
  sources: ListingSourceWithDetails[];
  // Computed trust score (sum of source weights)
  trust_score?: number;
}

// Combined station food data
export interface StationFoodData {
  station: Station;
  sponsored: SponsoredListing | null;
  listings: FoodListingWithSources[];
}

// Chain outlet with brand info
export interface ChainOutletWithBrand extends ChainOutlet {
  brand: ChainBrand;
}

// Grouped chain outlets by brand
export interface GroupedChainOutlets {
  brand: ChainBrand;
  outlets: ChainOutlet[];
}

// Search match result
export interface SearchMatch {
  id: string;
  name: string;
  type: 'curated' | 'chain';
  matchType: 'food' | 'restaurant';
  matchedTags?: string[];
  score?: number;  // Lower is better match
}

// Station search result with matches
export interface StationSearchResult {
  stationId: string;
  matches: SearchMatch[];
}

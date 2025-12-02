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
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          icon?: string;
          url?: string | null;
          bg_color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          url?: string | null;
          bg_color?: string;
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
          created_at: string;
          updated_at: string;
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
          created_at?: string;
          updated_at?: string;
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
          updated_at?: string;
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

// Types with joined data
export interface FoodListingWithSource extends FoodListing {
  food_sources: FoodSource | null;
}

export interface StationFoodData {
  station: Station;
  sponsored: SponsoredListing | null;
  listings: FoodListingWithSource[];
  listingsBySource: {
    source: FoodSource;
    listings: FoodListingWithSource[];
  }[];
}

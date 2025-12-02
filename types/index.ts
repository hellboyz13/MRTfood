export interface Station {
  id: string;
  name: string;
  line: string[];
}

// Legacy types (keeping for backwards compatibility)
export interface Food {
  id: string;
  name: string;
  rating: number;
  description: string;
  imageUrl: string;
  stationId: string;
}

export interface StationFoodData {
  [stationId: string]: Food[];
}

export interface SponsoredListing {
  stationId: string;
  restaurant: {
    name: string;
    image: string;
    rating: number;
    promotion: string;
    link: string;
  };
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// New curated food source types
export interface FoodSource {
  id: string;
  name: string;
  icon: string;
  url: string;
  bgColor: string; // Light background color for the section
}

export interface FoodListing {
  id: string;
  name: string;
  description: string;
  address: string;
  nearestMRT: string;
  image: string;
  rating?: number;
  sourceId: string;
  sourceUrl: string;
  tags: string[];
}

export interface StationFoodBySource {
  source: FoodSource;
  listings: FoodListing[];
}

export interface StationFood {
  stationId: string;
  stationName: string;
  foodBySource: StationFoodBySource[];
}

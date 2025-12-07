import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

interface PlaceDetailsResponse {
  result?: {
    photos?: PlacePhoto[];
    name?: string;
  };
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const { listingId, outletId, placeName, address } = await request.json();

    if (!listingId && !outletId) {
      return NextResponse.json(
        { error: 'Either listingId or outletId is required' },
        { status: 400 }
      );
    }

    if (!placeName) {
      return NextResponse.json(
        { error: 'Place name is required' },
        { status: 400 }
      );
    }

    // Check if images already exist
    const { data: existingImages } = await supabase
      .from('menu_images')
      .select('id')
      .eq(listingId ? 'listing_id' : 'outlet_id', listingId || outletId)
      .limit(1);

    if (existingImages && existingImages.length > 0) {
      return NextResponse.json({
        message: 'Images already exist for this place',
        cached: true
      });
    }

    // Step 1: Find place using Places API Text Search
    const searchQuery = address ? `${placeName} ${address}` : placeName;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googlePlacesApiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      console.log('No place found:', searchData.status);
      return NextResponse.json({
        error: 'Place not found',
        status: searchData.status
      }, { status: 404 });
    }

    const placeId = searchData.results[0].place_id;

    // Step 2: Get place details including photos
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name&key=${googlePlacesApiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData: PlaceDetailsResponse = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result?.photos) {
      return NextResponse.json({
        error: 'No photos found for this place',
        status: detailsData.status
      }, { status: 404 });
    }

    const photos = detailsData.result.photos;

    // Take top 20 photos
    const topPhotos = photos.slice(0, 20);

    // Step 3: Store photo references in database
    const menuImages = topPhotos.map((photo, index) => {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${photo.width}&photoreference=${photo.photo_reference}&key=${googlePlacesApiKey}`;

      return {
        listing_id: listingId || null,
        outlet_id: outletId || null,
        image_url: photoUrl,
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        is_header: index === 0, // First image is header
        display_order: index,
      };
    });

    const { data, error } = await supabase
      .from('menu_images')
      .insert(menuImages)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to store images', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      images: data
    });

  } catch (error) {
    console.error('Error fetching menu images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

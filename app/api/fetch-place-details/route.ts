import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!googlePlacesApiKey) {
    throw new Error('Missing GOOGLE_PLACES_API_KEY environment variable');
  }

  return { supabaseUrl, supabaseKey, googlePlacesApiKey };
}

// New Places API (v1) response types
interface PlacesSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    regularOpeningHours?: {
      openNow?: boolean;
      periods?: Array<{
        open: { day: number; hour: number; minute: number };
        close?: { day: number; hour: number; minute: number };
      }>;
      weekdayDescriptions?: string[];
    };
    rating?: number;
    userRatingCount?: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseKey, googlePlacesApiKey } = getEnvVars();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listingId, placeName, address, forceRefresh } = await request.json();

    if (!listingId) {
      return NextResponse.json(
        { error: 'listingId is required' },
        { status: 400 }
      );
    }

    if (!placeName) {
      return NextResponse.json(
        { error: 'placeName is required' },
        { status: 400 }
      );
    }

    // Check if details already exist (unless force refresh)
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('food_listings')
        .select('google_place_id, review_count, phone, website, opening_hours')
        .eq('id', listingId)
        .single();

      if (existing?.google_place_id && existing?.review_count !== null) {
        return NextResponse.json({
          success: true,
          cached: true,
          data: existing
        });
      }
    }

    // Use new Places API (v1) - Text Search
    const searchQuery = address ? `${placeName} ${address} Singapore` : `${placeName} Singapore`;

    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });

    if (!searchResponse.ok) {
      console.error('Places API failed:', searchResponse.status);
      return NextResponse.json({ error: 'Places API request failed' }, { status: 502 });
    }

    const searchData: PlacesSearchResponse = await searchResponse.json();

    if (!searchData.places || searchData.places.length === 0) {
      console.log('No place found for:', searchQuery);
      return NextResponse.json({
        error: 'Place not found'
      }, { status: 404 });
    }

    const place = searchData.places[0];
    console.log('Found place:', place.displayName?.text, 'id:', place.id);

    // Convert opening hours to legacy format for compatibility
    const openingHours = place.regularOpeningHours ? {
      open_now: place.regularOpeningHours.openNow,
      periods: place.regularOpeningHours.periods?.map(p => ({
        open: {
          day: p.open.day,
          time: `${p.open.hour.toString().padStart(2, '0')}${p.open.minute.toString().padStart(2, '0')}`
        },
        close: p.close ? {
          day: p.close.day,
          time: `${p.close.hour.toString().padStart(2, '0')}${p.close.minute.toString().padStart(2, '0')}`
        } : undefined
      })),
      weekday_text: place.regularOpeningHours.weekdayDescriptions
    } : null;

    // Prepare data for database update
    const updateData = {
      google_place_id: place.id,
      review_count: place.userRatingCount || null,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      opening_hours: openingHours,
      ...(place.rating && { rating: place.rating })
    };

    // Update database
    const { error: updateError } = await supabase
      .from('food_listings')
      .update(updateData)
      .eq('id', listingId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update listing', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('Successfully stored place details for:', placeName);

    return NextResponse.json({
      success: true,
      cached: false,
      data: updateData
    });

  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch details for a listing (reads from DB, fetches from Google if not cached)
export async function GET(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseKey, googlePlacesApiKey } = getEnvVars();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    if (!listingId) {
      return NextResponse.json(
        { error: 'listingId is required' },
        { status: 400 }
      );
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('food_listings')
      .select('id, name, address, google_place_id, review_count, phone, website, opening_hours, rating')
      .eq('id', listingId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // If we have cached data, return it
    if (data.google_place_id && data.review_count !== null) {
      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          review_count: data.review_count,
          phone: data.phone,
          website: data.website,
          opening_hours: data.opening_hours,
          rating: data.rating
        }
      });
    }

    // Otherwise, fetch from Google Places API (new v1)
    const searchQuery = data.address
      ? `${data.name} ${data.address} Singapore`
      : `${data.name} Singapore`;

    console.log('Fetching from Google Places API for:', searchQuery);

    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1
      })
    });

    if (!searchResponse.ok) {
      console.error('Places API failed:', searchResponse.status);
      return NextResponse.json({ error: 'Places API request failed' }, { status: 502 });
    }

    const searchData: PlacesSearchResponse = await searchResponse.json();

    if (!searchData.places || searchData.places.length === 0) {
      console.log('Google Places API: No place found for:', searchQuery);
      return NextResponse.json({
        success: true,
        cached: false,
        data: {
          review_count: null,
          phone: null,
          website: null,
          opening_hours: null,
          rating: data.rating
        }
      });
    }

    const place = searchData.places[0];
    console.log('Found place:', place.displayName?.text, 'rating:', place.rating, 'reviews:', place.userRatingCount);

    // Convert opening hours to legacy format for compatibility
    const openingHours = place.regularOpeningHours ? {
      open_now: place.regularOpeningHours.openNow,
      periods: place.regularOpeningHours.periods?.map(p => ({
        open: {
          day: p.open.day,
          time: `${p.open.hour.toString().padStart(2, '0')}${p.open.minute.toString().padStart(2, '0')}`
        },
        close: p.close ? {
          day: p.close.day,
          time: `${p.close.hour.toString().padStart(2, '0')}${p.close.minute.toString().padStart(2, '0')}`
        } : undefined
      })),
      weekday_text: place.regularOpeningHours.weekdayDescriptions
    } : null;

    // Prepare update data
    const updateData = {
      google_place_id: place.id,
      review_count: place.userRatingCount || null,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      opening_hours: openingHours,
      ...(place.rating && { rating: place.rating })
    };

    // Update DB and await to ensure data is stored
    console.log('Storing place details for:', data.name);
    const { error: updateError } = await supabase
      .from('food_listings')
      .update(updateData)
      .eq('id', listingId);

    if (updateError) {
      console.error('Failed to store place details:', updateError);
    } else {
      console.log('Successfully stored place details for:', data.name);
    }

    return NextResponse.json({
      success: true,
      cached: false,
      data: {
        review_count: place.userRatingCount || null,
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
        website: place.websiteUri || null,
        opening_hours: openingHours,
        rating: place.rating || data.rating
      }
    });

  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

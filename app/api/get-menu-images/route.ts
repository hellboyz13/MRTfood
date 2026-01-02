import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const outletId = searchParams.get('outletId');

    if (!listingId && !outletId) {
      return NextResponse.json(
        { error: 'Either listingId or outletId is required' },
        { status: 400 }
      );
    }

    const { data: images, error } = await supabase
      .from('menu_images')
      .select('*')
      .eq(listingId ? 'listing_id' : 'outlet_id', listingId || outletId)
      .order('display_order');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch images', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: images || []
    });

  } catch (error) {
    console.error('Error fetching menu images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

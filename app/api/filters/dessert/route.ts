/**
 * API Route: /api/filters/dessert
 *
 * Cached dessert spots endpoint.
 * Cache: 1 hour (results are static, only change when data updates)
 *
 * FALLBACK: To disable caching, set DISABLE_FILTER_CACHE=true in .env.local
 * Or directly import getDessertSpotsByStation from '@/lib/api' in page.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDessertSpotsByStation } from '@/lib/api';

// Cache for 1 hour (3600 seconds), allow stale for 5 mins while revalidating
const CACHE_DURATION = 3600;
const STALE_WHILE_REVALIDATE = 300;

// Disable caching via env var if needed
const CACHE_ENABLED = process.env.DISABLE_FILTER_CACHE !== 'true';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const data = await getDessertSpotsByStation({ offset });

    const response = NextResponse.json(data);

    // Set cache headers if caching is enabled
    if (CACHE_ENABLED) {
      response.headers.set(
        'Cache-Control',
        `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
      );
    } else {
      response.headers.set('Cache-Control', 'no-store');
    }

    return response;
  } catch (error) {
    console.error('Dessert filter error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dessert spots', results: [], hasMore: false },
      { status: 500 }
    );
  }
}

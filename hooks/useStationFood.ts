'use client';

import { useState, useEffect } from 'react';
import { StationFoodData } from '@/types/database';
import { getStationFoodData } from '@/lib/api';

interface UseStationFoodResult {
  data: StationFoodData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStationFood(stationId: string | null): UseStationFoodResult {
  const [data, setData] = useState<StationFoodData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!stationId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getStationFoodData(stationId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stationId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

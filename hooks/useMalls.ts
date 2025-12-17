'use client';

import { useState, useEffect } from 'react';
import { MallWithOutletCount, MallOutlet, Mall } from '@/types/database';
import { getMallsByStation, getMall, getOutletsByMall } from '@/lib/api';

interface UseMallsResult {
  malls: MallWithOutletCount[];
  loading: boolean;
  error: Error | null;
}

export function useMallsByStation(stationId: string | null): UseMallsResult {
  const [malls, setMalls] = useState<MallWithOutletCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!stationId) {
      setMalls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getMallsByStation(stationId)
      .then((data) => {
        if (!cancelled) {
          setMalls(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stationId]);

  return { malls, loading, error };
}

interface UseMallOutletsResult {
  mall: Mall | null;
  outlets: MallOutlet[];
  loading: boolean;
  error: Error | null;
}

export function useMallOutlets(mallId: string | null): UseMallOutletsResult {
  const [mall, setMall] = useState<Mall | null>(null);
  const [outlets, setOutlets] = useState<MallOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!mallId) {
      setMall(null);
      setOutlets([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getMall(mallId), getOutletsByMall(mallId)])
      .then(([mallData, outletsData]) => {
        if (!cancelled) {
          setMall(mallData);
          setOutlets(outletsData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mallId]);

  return { mall, outlets, loading, error };
}

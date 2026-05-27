import { useCallback, useEffect, useState } from 'react';
import type { GeoPointDTO } from '../types/geo.js';

export interface UseGeoPointsOptions {
  /** Endpoint base que devolve `GeoPointDTO[]`. */
  endpoint: string;
  /** Header opcional (ex. Authorization). */
  headers?: HeadersInit;
}

export interface UseGeoPointsResult<TMeta extends object> {
  points: GeoPointDTO<TMeta>[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useGeoPoints<TMeta extends object = Record<string, unknown>>(
  opts: UseGeoPointsOptions,
): UseGeoPointsResult<TMeta> {
  const [points, setPoints] = useState<GeoPointDTO<TMeta>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(opts.endpoint, { headers: opts.headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GeoPointDTO<TMeta>[] = await res.json();
      setPoints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [opts.endpoint, opts.headers]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { points, loading, error, reload };
}

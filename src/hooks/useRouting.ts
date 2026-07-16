import { useState, useCallback } from 'react';
import type { OSRMRoute } from '../types/routing';
import { fetchRoute } from '../services/osrm';

export function useRouting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<OSRMRoute[]>([]);

  const calculateRoute = useCallback(
    async (
      originLng: number,
      originLat: number,
      destLng: number,
      destLat: number
    ) => {
      setLoading(true);
      setError(null);
      setRoutes([]);
      try {
        const data = await fetchRoute(originLng, originLat, destLng, destLat);
        if (data.code !== 'Ok' || !data.routes.length) {
          setError('找不到路線');
          setRoutes([]);
          return null;
        }
        setRoutes(data.routes);
        return data.routes;
      } catch (e) {
        const msg = e instanceof Error ? e.message : '路線規劃失敗';
        setError(msg);
        setRoutes([]);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setRoutes([]);
    setError(null);
  }, []);

  return { loading, error, routes, calculateRoute, clear };
}

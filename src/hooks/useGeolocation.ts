import { useState, useEffect, useRef, useCallback } from 'react';

export interface GpsPosition {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  throttleMs?: number;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { enableHighAccuracy = true, throttleMs = 500 } = options;
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const lastPositionsRef = useRef<{ lat: number; lng: number; time: number }[]>([]);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('瀏覽器不支援定位功能');
      return;
    }

    if (watchIdRef.current !== null) return;

    setIsActive(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const heading = pos.coords.heading;
        const speed = pos.coords.speed;
        const accuracy = pos.coords.accuracy;

        lastPositionsRef.current.push({ lat, lng, time: now });
        if (lastPositionsRef.current.length > 5) {
          lastPositionsRef.current.shift();
        }

        if (now - lastUpdateRef.current >= throttleMs) {
          lastUpdateRef.current = now;
          setPosition({ lat, lng, heading, speed, accuracy });
        }
      },
      (err) => {
        switch (err.code) {
          case 1:
            setError('等待定位權限');
            break;
          case 2:
            setError('GPS 訊號弱');
            break;
          case 3:
            setError('定位逾時');
            break;
          default:
            setError('定位失敗');
        }
      },
      { enableHighAccuracy, timeout: 10000, maximumAge: 0 }
    );
  }, [enableHighAccuracy, throttleMs]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsActive(false);
    setPosition(null);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, error, isActive, start, stop, lastPositions: lastPositionsRef };
}

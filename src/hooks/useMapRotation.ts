import { useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

export function useMapRotation() {
  const mapRef = useRef<MapRef>(null!);
  const prevBearingRef = useRef<number>(0);

  const setBearing = useCallback((heading: number, animate = true) => {
    const map = mapRef.current;
    if (!map) return;
    const mapInstance = map.getMap();

    if (animate) {
      mapInstance.easeTo({ bearing: heading, duration: 300 });
    } else {
      mapInstance.setBearing(heading);
    }
    prevBearingRef.current = heading;
  }, []);

  const resetBearing = useCallback(() => {
    setBearing(0);
  }, [setBearing]);

  return { mapRef, setBearing, resetBearing };
}

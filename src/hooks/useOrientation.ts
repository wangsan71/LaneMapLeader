import { useState, useEffect, useRef, useCallback } from 'react';
import { compassHeading, normalizeAngle } from '../utils/geo';

const SMOOTHING = 0.2;
const THROTTLE_MS = 500;

export function useOrientation() {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [smoothedHeading, setSmoothedHeading] = useState<number | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [orientationOffset, setOrientationOffset] = useState(0);
  const smoothedRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_MS) return;
    lastUpdateRef.current = now;

    let heading: number | null = null;

    const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (webkitHeading !== undefined && !isNaN(webkitHeading)) {
      heading = webkitHeading;
    } else if (event.alpha !== null) {
      heading = compassHeading(event.alpha, event.beta, event.gamma);
    }

    if (heading !== null && !isNaN(heading)) {
      const cur = smoothedRef.current;
      if (cur === null) {
        smoothedRef.current = heading;
      } else {
        let diff = normalizeAngle(heading - cur);
        if (diff > 180) diff -= 360;
        smoothedRef.current = normalizeAngle(cur + diff * SMOOTHING);
      }
      setSmoothedHeading(smoothedRef.current);
      setDeviceHeading(heading);
    }
  }, []);

  useEffect(() => {
    if (isEnabled) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isEnabled, handleOrientation]);

  const start = useCallback(async () => {
    const OrientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    // iOS 13+ only exposes orientation data after a permission request made
    // directly from a user gesture (the compass button).
    if (typeof OrientationEvent?.requestPermission === 'function') {
      try {
        const permission = await OrientationEvent.requestPermission();
        if (permission !== 'granted') return;
      } catch {
        return;
      }
    }

    setIsEnabled(true);
    smoothedRef.current = null;
    setOrientationOffset(0);
  }, []);

  const stop = useCallback(() => {
    setIsEnabled(false);
    smoothedRef.current = null;
    setSmoothedHeading(null);
    setDeviceHeading(null);
    setOrientationOffset(0);
  }, []);

  const toggle = useCallback(async () => {
    if (isEnabled) stop();
    else await start();
  }, [isEnabled, start, stop]);

  const updateOffset = useCallback(
    (gpsHeading: number) => {
      if (smoothedRef.current === null) return;
      const rawDiff = normalizeAngle(smoothedRef.current - gpsHeading);
      setOrientationOffset((prev) => {
        if (prev === 0) return rawDiff;
        return normalizeAngle(prev * 0.7 + rawDiff * 0.3);
      });
    },
    []
  );

  const correctedHeading = smoothedHeading !== null
    ? normalizeAngle(smoothedHeading - orientationOffset)
    : null;

  return {
    deviceHeading,
    smoothedHeading,
    correctedHeading,
    isEnabled,
    start,
    stop,
    toggle,
    updateOffset,
    orientationOffset,
  };
}

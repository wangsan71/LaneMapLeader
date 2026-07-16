import { useCallback, useEffect, useRef } from 'react';
import { useNavigationContext } from '../context/NavigationContext';
import { distance as calcDistance } from '../utils/geo';

const ARRIVAL_THRESHOLD = 30;

export function useNavigation() {
  const { state: ctx, dispatch } = useNavigationContext();
  const lastStepCheckRef = useRef(0);

  const startNavigation = useCallback(() => {
    dispatch({ type: 'START_NAVIGATION' });
  }, [dispatch]);

  const stopNavigation = useCallback(() => {
    dispatch({ type: 'STOP_NAVIGATION' });
  }, [dispatch]);

  const checkProgress = useCallback(() => {
    const now = Date.now();
    if (now - lastStepCheckRef.current < 1000) return;
    lastStepCheckRef.current = now;

    const { state, gpsPosition, route, currentStepIndex, destination } = ctx;
    if (state !== 'navigating' || !gpsPosition || !route || !destination) return;

    if (!route.legs[0]) return;
    const steps = route.legs[0].steps;
    if (currentStepIndex >= steps.length) return;

    const distToDest = calcDistance(
      gpsPosition.lat,
      gpsPosition.lng,
      destination.lat,
      destination.lng
    );

    if (distToDest < ARRIVAL_THRESHOLD) {
      dispatch({ type: 'SET_ARRIVED' });
      return;
    }

    const nextStep = steps[Math.min(currentStepIndex + 1, steps.length - 1)];
    if (!nextStep) return;

    const distToNext = calcDistance(
      gpsPosition.lat,
      gpsPosition.lng,
      nextStep.maneuver.location[1],
      nextStep.maneuver.location[0]
    );

    if (distToNext < 20 && currentStepIndex < steps.length - 1) {
      dispatch({ type: 'ADVANCE_STEP' });
    }
  }, [ctx, dispatch]);

  useEffect(() => {
    if (ctx.state === 'arrived') {
      const timer = setTimeout(() => {
        dispatch({ type: 'RESET' });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [ctx.state, dispatch]);

  return { startNavigation, stopNavigation, checkProgress };
}

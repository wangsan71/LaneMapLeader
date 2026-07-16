import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { NavigationState, NavPoint } from '../types/navigation';
import type { OSRMRoute } from '../types/routing';

type Action =
  | { type: 'SET_ORIGIN'; payload: NavPoint | null }
  | { type: 'SET_DESTINATION'; payload: NavPoint | null }
  | { type: 'SET_ROUTE'; payload: OSRMRoute }
  | { type: 'START_NAVIGATION' }
  | { type: 'STOP_NAVIGATION' }
  | { type: 'UPDATE_GPS'; payload: { lat: number; lng: number; heading: number | null } }
  | { type: 'SET_DEVICE_HEADING'; payload: number | null }
  | { type: 'ADVANCE_STEP' }
  | { type: 'SET_ARRIVED' }
  | { type: 'TOGGLE_ORIENTATION' }
  | { type: 'RESET' };

const initialState: NavigationState = {
  state: 'idle',
  origin: null,
  destination: null,
  route: null,
  currentStepIndex: 0,
  remainingDistance: 0,
  remainingDuration: 0,
  gpsPosition: null,
  gpsHeading: null,
  deviceHeading: null,
  isOrientationEnabled: false,
  hasArrived: false,
};

function reducer(state: NavigationState, action: Action): NavigationState {
  switch (action.type) {
    case 'SET_ORIGIN':
      return {
        ...state,
        origin: action.payload,
        route: null,
        currentStepIndex: 0,
        remainingDistance: 0,
        remainingDuration: 0,
        state: action.payload || state.destination ? 'planning' : 'idle',
      };
    case 'SET_DESTINATION':
      return {
        ...state,
        destination: action.payload,
        route: null,
        currentStepIndex: 0,
        remainingDistance: 0,
        remainingDuration: 0,
        state: action.payload || state.origin ? 'planning' : 'idle',
      };
    case 'SET_ROUTE':
      return {
        ...state,
        route: action.payload,
        currentStepIndex: 0,
        remainingDistance: action.payload.distance,
        remainingDuration: action.payload.duration,
        state: 'ready',
        hasArrived: false,
      };
    case 'START_NAVIGATION':
      if (!state.route || !state.origin || !state.destination) return state;
      return { ...state, state: 'navigating', hasArrived: false };
    case 'STOP_NAVIGATION':
      return { ...initialState };
    case 'UPDATE_GPS':
      return {
        ...state,
        gpsPosition: { lat: action.payload.lat, lng: action.payload.lng },
        gpsHeading: action.payload.heading,
      };
    case 'SET_DEVICE_HEADING':
      return { ...state, deviceHeading: action.payload };
    case 'ADVANCE_STEP': {
      const route = state.route;
      if (!route || !route.legs[0]) return state;
      const nextIndex = state.currentStepIndex + 1;
      const steps = route.legs[0].steps;
      if (nextIndex >= steps.length) return state;

      let remaining = 0;
      let remainingDuration = 0;
      for (let i = nextIndex; i < steps.length; i++) {
        remaining += steps[i].distance;
        remainingDuration += steps[i].duration;
      }

      const trafficFactor = route.trafficFactor || 1;

      return {
        ...state,
        currentStepIndex: nextIndex,
        remainingDistance: remaining,
        remainingDuration: remainingDuration * trafficFactor,
      };
    }
    case 'SET_ARRIVED':
      return { ...state, state: 'arrived', hasArrived: true };
    case 'TOGGLE_ORIENTATION':
      return { ...state, isOrientationEnabled: !state.isOrientationEnabled };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

interface NavigationContextType {
  state: NavigationState;
  dispatch: React.Dispatch<Action>;
  setOrigin: (point: NavPoint | null) => void;
  setDestination: (point: NavPoint | null) => void;
  setRouteData: (route: OSRMRoute) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  resetNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [navState, dispatch] = useReducer(reducer, initialState);

  const setOrigin = useCallback(
    (point: NavPoint | null) => dispatch({ type: 'SET_ORIGIN', payload: point }),
    []
  );
  const setDestination = useCallback(
    (point: NavPoint | null) => dispatch({ type: 'SET_DESTINATION', payload: point }),
    []
  );
  const setRouteData = useCallback(
    (route: OSRMRoute) => dispatch({ type: 'SET_ROUTE', payload: route }),
    []
  );
  const startNavigation = useCallback(
    () => dispatch({ type: 'START_NAVIGATION' }),
    []
  );
  const stopNavigation = useCallback(
    () => dispatch({ type: 'STOP_NAVIGATION' }),
    []
  );
  const resetNavigation = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <NavigationContext.Provider
      value={{
        state: navState,
        dispatch,
        setOrigin,
        setDestination,
        setRouteData,
        startNavigation,
        stopNavigation,
        resetNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext(): NavigationContextType {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return ctx;
}

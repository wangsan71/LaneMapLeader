export type NavState = 'idle' | 'planning' | 'ready' | 'navigating' | 'arrived';

export interface NavPoint {
  lat: number;
  lng: number;
  name: string;
}

export interface TurnInfo {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
  };
  roadName: string;
  stepIndex: number;
}

export interface NavigationState {
  state: NavState;
  origin: NavPoint | null;
  destination: NavPoint | null;
  route: import('./routing').OSRMRoute | null;
  currentStepIndex: number;
  remainingDistance: number;
  remainingDuration: number;
  gpsPosition: { lat: number; lng: number } | null;
  gpsHeading: number | null;
  deviceHeading: number | null;
  isOrientationEnabled: boolean;
  hasArrived: boolean;
}

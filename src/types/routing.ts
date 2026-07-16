export interface OSRMManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
  bearing_before: number;
  bearing_after: number;
  exit?: number;
}

export interface OSRMStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  name: string;
  mode: string;
  maneuver: OSRMManeuver;
  intersections: OSRMIntersection[];
  ref?: string;
}

export interface OSRMIntersection {
  location: [number, number];
  bearings: number[];
  entry: boolean[];
  in?: number;
  out?: number;
}

export interface OSRMLeg {
  distance: number;
  duration: number;
  steps: OSRMStep[];
  summary: string;
  weight: number;
}

export interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  legs: OSRMLeg[];
  weight_name: string;
  weight: number;
  baseDuration?: number;
  trafficFactor?: number;
  turnCount?: number;
  hardTurnCount?: number;
}

export type RoutePreference = 'balanced' | 'fastest' | 'fewer-turns' | 'shortest';

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: OSRMWaypoint[];
}

export interface OSRMWaypoint {
  name: string;
  location: [number, number];
  hint: string;
  distance: number;
}

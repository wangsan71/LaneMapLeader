export interface Lane {
  icon: string;
  label: string;
}

export interface Road {
  id: string;
  name: string;
  path: [number, number][];
  lanesForward: Lane[];
  lanesBackward: Lane[];
  highway: string;
  oneway: boolean;
  length: number;
  junction?: string;
  circularDirection?: string;
  destinations?: string[];
  reversed?: boolean;
}

export interface RoadMatch {
  road: Road;
  segmentIndex: number;
  distance: number;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

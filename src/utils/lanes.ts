import type { RoadMatch } from '../types/roads';
import {
  pointToSegmentDistance,
  bearing as calcBearing,
  normalizeAngle,
} from './geo';

export function roadBearing(road: { path: [number, number][] }): number {
  const p1 = road.path[0];
  const p2 = road.path[road.path.length - 1];
  return calcBearing(p1[0], p1[1], p2[0], p2[1]);
}

export function matchedSegmentBearing(match: RoadMatch): number {
  const p1 = match.road.path[match.segmentIndex];
  const p2 = match.road.path[match.segmentIndex + 1];
  return calcBearing(p1[0], p1[1], p2[0], p2[1]);
}

export function findNearestRoad(
  lat: number,
  lng: number,
  roadDatabase: import('../types/roads').Road[]
): RoadMatch | null {
  let best: RoadMatch | null = null;
  let minDist = Infinity;

  for (const road of roadDatabase) {
    for (let i = 0; i < road.path.length - 1; i++) {
      const p1 = road.path[i];
      const p2 = road.path[i + 1];
      const dist = pointToSegmentDistance(
        lat,
        lng,
        p1[0],
        p1[1],
        p2[0],
        p2[1]
      );
      if (dist < minDist) {
        minDist = dist;
        best = { road, segmentIndex: i, distance: dist };
      }
    }
  }

  return best;
}

export function getDirection(
  match: RoadMatch,
  heading: number
): 'forward' | 'backward' {
  const rb = matchedSegmentBearing(match);
  let diff = Math.abs(heading - rb);
  if (diff > 180) diff = 360 - diff;
  return diff <= 90 ? 'forward' : 'backward';
}

export function roadHeadingDifference(match: RoadMatch, heading: number): number {
  let rb = matchedSegmentBearing(match);

  if (match.road.oneway && match.road.reversed) {
    rb = normalizeAngle(rb + 180);
  }

  let diff = Math.abs(normalizeAngle(heading) - rb);
  if (diff > 180) diff = 360 - diff;

  return match.road.oneway ? diff : Math.min(diff, 180 - diff);
}

export const ICON_LIST = [
  'straight',
  'left',
  'right',
  'slight_left',
  'slight_right',
  'straight_left',
  'straight_right',
  'left_right',
  'straight_left_right',
  'u_turn',
  'uturn_left',
  'uturn_right',
  'merge_left',
  'merge_right',
];

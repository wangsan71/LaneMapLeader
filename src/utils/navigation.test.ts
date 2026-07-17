import { describe, expect, it } from 'vitest';
import type { OSRMStep } from '../types/routing';
import { getDistanceAlongStep } from './navigation';

function createStep(coordinates: [number, number][]): OSRMStep {
  return {
    distance: 222,
    duration: 20,
    geometry: { type: 'LineString', coordinates },
    name: '測試道路',
    mode: 'driving',
    maneuver: {
      type: 'turn',
      modifier: 'right',
      location: coordinates[0],
      bearing_before: 0,
      bearing_after: 90,
    },
    intersections: [],
  };
}

describe('getDistanceAlongStep', () => {
  it('returns the distance remaining along a straight step', () => {
    const step = createStep([[0, 0], [0, 0.002]]);

    expect(getDistanceAlongStep(step, { lat: 0.001, lng: 0 })).toBeCloseTo(111, 0);
  });

  it('follows the route geometry instead of using direct distance', () => {
    const step = createStep([[0, 0], [0, 0.001], [0.001, 0.001]]);

    expect(getDistanceAlongStep(step, { lat: 0.0005, lng: 0 })).toBeCloseTo(167, 0);
  });

  it('falls back to the maneuver location without usable geometry', () => {
    const step = createStep([[0, 0.001]]);

    expect(getDistanceAlongStep(step, { lat: 0, lng: 0 })).toBeCloseTo(111, 0);
  });
});

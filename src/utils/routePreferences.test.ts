import { describe, expect, it } from 'vitest';
import type { OSRMRoute } from '../types/routing';
import { estimateComplexTraffic, rankRoutes } from './routePreferences';

function route(distance: number, duration: number, turns: number): OSRMRoute {
  return {
    distance,
    duration,
    geometry: { type: 'LineString', coordinates: [] },
    weight_name: 'routability',
    weight: duration,
    legs: [
      {
        distance,
        duration,
        summary: '',
        weight: duration,
        steps: Array.from({ length: turns }, () => ({
          distance: 100,
          duration: 30,
          geometry: { type: 'LineString', coordinates: [] },
          name: '',
          mode: 'driving',
          maneuver: {
            type: 'turn',
            modifier: 'left',
            location: [0, 0],
            bearing_before: 0,
            bearing_after: 90,
          },
          intersections: [{ location: [0, 0], bearings: [], entry: [] }],
        })),
      },
    ],
  };
}

describe('route preferences', () => {
  it('adds a conservative complex-traffic estimate', () => {
    const estimated = estimateComplexTraffic(route(3000, 600, 8));
    expect(estimated.duration).toBeGreaterThan(600);
    expect(estimated.trafficFactor).toBeLessThanOrEqual(1.45);
  });

  it('supports fastest and fewer-turns preferences', () => {
    const quickBusy = route(3000, 500, 12);
    const calm = route(3400, 560, 2);
    expect(rankRoutes([calm, quickBusy], 'fastest')[0].baseDuration).toBe(500);
    expect(rankRoutes([quickBusy, calm], 'fewer-turns')[0].turnCount).toBe(2);
  });
});

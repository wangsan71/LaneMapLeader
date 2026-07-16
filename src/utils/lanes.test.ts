import { describe, it, expect } from 'vitest';
import { roadBearing, findNearestRoad, getDirection } from './lanes';
import type { Road } from '../types/roads';

describe('lanes utils', () => {
  describe('roadBearing', () => {
    it('calculates bearing from first to last point', () => {
      const road = {
        path: [
          [0, 0],
          [1, 0],
        ] as [number, number][],
      };
      const bearing = roadBearing(road);
      expect(bearing).toBeCloseTo(0, 0); // North
    });

    it('handles multi-segment roads', () => {
      const road = {
        path: [
          [0, 0],
          [0.5, 0],
          [1, 0],
        ] as [number, number][],
      };
      const bearing = roadBearing(road);
      expect(bearing).toBeCloseTo(0, 0); // Still overall north
    });

    it('calculates east bearing', () => {
      const road = {
        path: [
          [0, 0],
          [0, 1],
        ] as [number, number][],
      };
      const bearing = roadBearing(road);
      expect(bearing).toBeCloseTo(90, 0); // East
    });
  });

  describe('findNearestRoad', () => {
    const roads: Road[] = [
      {
        id: 'road-a',
        name: 'Road A',
        path: [
          [0, 0],
          [1, 0],
        ],
        lanesForward: [],
        lanesBackward: [],
        highway: 'primary',
        oneway: false,
        length: 1000,
      },
      {
        id: 'road-b',
        name: 'Road B',
        path: [
          [0, 1],
          [1, 1],
        ],
        lanesForward: [],
        lanesBackward: [],
        highway: 'primary',
        oneway: false,
        length: 1000,
      },
    ];

    it('finds the nearest road', () => {
      const match = findNearestRoad(0.1, 0, roads);
      expect(match).not.toBeNull();
      expect(match?.road.name).toBe('Road A');
    });

    it('returns segment index', () => {
      const match = findNearestRoad(0.5, 0, roads);
      expect(match?.segmentIndex).toBe(0);
    });

    it('returns distance', () => {
      const match = findNearestRoad(0.5, 0, roads);
      expect(match?.distance).toBeGreaterThanOrEqual(0);
    });

    it('finds road B when closer', () => {
      const match = findNearestRoad(0.1, 1, roads);
      expect(match?.road.name).toBe('Road B');
    });

    it('returns null for empty road database', () => {
      const match = findNearestRoad(0, 0, []);
      expect(match).toBeNull();
    });

    it('handles multi-segment roads', () => {
      const multiSegmentRoads: Road[] = [
        {
          id: 'multi-road',
          name: 'Multi Road',
          path: [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
          lanesForward: [],
          lanesBackward: [],
          highway: 'primary',
          oneway: false,
          length: 2000,
        },
      ];
      const match = findNearestRoad(1.5, 0, multiSegmentRoads);
      expect(match?.segmentIndex).toBe(1); // Second segment
    });
  });

  describe('getDirection', () => {
    const road: Road = {
      id: 'test-road',
      name: 'Test Road',
      path: [
        [0, 0],
        [1, 0],
      ], // North bearing (0°)
      lanesForward: [],
      lanesBackward: [],
      highway: 'primary',
      oneway: false,
      length: 1000,
    };

    const match = {
      road,
      segmentIndex: 0,
      distance: 10,
    };

    it('returns forward when heading matches road bearing', () => {
      expect(getDirection(match, 0)).toBe('forward'); // Same direction
      expect(getDirection(match, 10)).toBe('forward'); // Close to north
      expect(getDirection(match, 350)).toBe('forward'); // Close to north
    });

    it('returns forward within 90 degree threshold', () => {
      expect(getDirection(match, 45)).toBe('forward');
      expect(getDirection(match, 90)).toBe('forward');
      expect(getDirection(match, 315)).toBe('forward'); // -45°
    });

    it('returns backward when heading is opposite', () => {
      expect(getDirection(match, 180)).toBe('backward'); // Opposite
      expect(getDirection(match, 135)).toBe('backward');
      expect(getDirection(match, 225)).toBe('backward');
    });

    it('handles wrap-around at 360/0 degrees', () => {
      expect(getDirection(match, 359)).toBe('forward');
      expect(getDirection(match, 1)).toBe('forward');
    });

    it('threshold is at 90 degrees', () => {
      expect(getDirection(match, 90)).toBe('forward');
      expect(getDirection(match, 91)).toBe('backward');
      expect(getDirection(match, 270)).toBe('forward');
      expect(getDirection(match, 269)).toBe('backward');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  toRad,
  toDeg,
  normalizeAngle,
  bearing,
  distance,
  pointToSegmentDistance,
} from './geo';

describe('geo utils', () => {
  describe('toRad', () => {
    it('converts degrees to radians', () => {
      expect(toRad(0)).toBe(0);
      expect(toRad(180)).toBeCloseTo(Math.PI);
      expect(toRad(90)).toBeCloseTo(Math.PI / 2);
      expect(toRad(360)).toBeCloseTo(2 * Math.PI);
    });
  });

  describe('toDeg', () => {
    it('converts radians to degrees', () => {
      expect(toDeg(0)).toBe(0);
      expect(toDeg(Math.PI)).toBeCloseTo(180);
      expect(toDeg(Math.PI / 2)).toBeCloseTo(90);
      expect(toDeg(2 * Math.PI)).toBeCloseTo(360);
    });
  });

  describe('normalizeAngle', () => {
    it('normalizes angles to 0-360 range', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
    });
  });

  describe('bearing', () => {
    it('calculates bearing from point A to point B', () => {
      // North: from equator to north pole
      const northBearing = bearing(0, 0, 1, 0);
      expect(northBearing).toBeCloseTo(0, 0);

      // East: along equator
      const eastBearing = bearing(0, 0, 0, 1);
      expect(eastBearing).toBeCloseTo(90, 0);

      // South
      const southBearing = bearing(1, 0, 0, 0);
      expect(southBearing).toBeCloseTo(180, 0);

      // West
      const westBearing = bearing(0, 1, 0, 0);
      expect(westBearing).toBeCloseTo(270, 0);
    });

    it('calculates bearing for Macau locations', () => {
      // From Macau Peninsula to Taipa
      const macauBearing = bearing(22.1987, 113.5439, 22.1532, 113.5594);
      expect(macauBearing).toBeGreaterThan(0);
      expect(macauBearing).toBeLessThan(360);
    });
  });

  describe('distance', () => {
    it('calculates distance between two points', () => {
      // Same point
      expect(distance(0, 0, 0, 0)).toBe(0);

      // 1 degree latitude ≈ 111km
      const dist = distance(0, 0, 1, 0);
      expect(dist).toBeGreaterThan(110000);
      expect(dist).toBeLessThan(112000);
    });

    it('calculates distance for Macau locations', () => {
      // Macau Peninsula to Taipa (approximately 5-6km)
      const macauDist = distance(22.1987, 113.5439, 22.1532, 113.5594);
      expect(macauDist).toBeGreaterThan(5000);
      expect(macauDist).toBeLessThan(7000);
    });

    it('is symmetric', () => {
      const dist1 = distance(22.1987, 113.5439, 22.1532, 113.5594);
      const dist2 = distance(22.1532, 113.5594, 22.1987, 113.5439);
      expect(dist1).toBeCloseTo(dist2);
    });
  });

  describe('pointToSegmentDistance', () => {
    it('calculates perpendicular distance when point projects onto segment', () => {
      // Point (1, 1) to segment from (0, 0) to (2, 0)
      const dist = pointToSegmentDistance(1, 1, 0, 0, 2, 0);
      // Should be approximately 111km (1 degree latitude)
      expect(dist).toBeGreaterThan(110000);
      expect(dist).toBeLessThan(112000);
    });

    it('calculates distance to nearest endpoint when point is outside segment', () => {
      // Point (3, 0) to segment from (0, 0) to (1, 0)
      const dist = pointToSegmentDistance(3, 0, 0, 0, 1, 0);
      // Should be distance from (3, 0) to (1, 0) ≈ 2 degrees ≈ 222km
      expect(dist).toBeGreaterThan(220000);
      expect(dist).toBeLessThan(224000);
    });

    it('returns zero when point is on segment', () => {
      const dist = pointToSegmentDistance(1, 0, 0, 0, 2, 0);
      expect(dist).toBeCloseTo(0, -3);
    });

    it('handles vertical segments', () => {
      const dist = pointToSegmentDistance(1, 1, 0, 0, 0, 2);
      expect(dist).toBeGreaterThan(0);
    });

    it('handles single point segment', () => {
      const dist = pointToSegmentDistance(1, 1, 0, 0, 0, 0);
      // Should be distance from (1, 1) to (0, 0)
      expect(dist).toBeGreaterThan(0);
    });
  });
});

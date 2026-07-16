import { describe, it, expect } from 'vitest';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
  getManeuverIconKey,
  getManeuverText,
} from './formatters';

describe('formatters', () => {
  describe('formatDistance', () => {
    it('formats distances under 1km in meters', () => {
      expect(formatDistance(0)).toBe('0m');
      expect(formatDistance(50)).toBe('50m');
      expect(formatDistance(500)).toBe('500m');
      expect(formatDistance(999)).toBe('999m');
    });

    it('formats distances over 1km in kilometers with one decimal', () => {
      expect(formatDistance(1000)).toBe('1.0km');
      expect(formatDistance(1500)).toBe('1.5km');
      expect(formatDistance(2340)).toBe('2.3km');
      expect(formatDistance(10000)).toBe('10.0km');
    });

    it('handles edge cases', () => {
      expect(formatDistance(1)).toBe('1m');
      expect(formatDistance(1001)).toBe('1.0km');
      expect(formatDistance(999.9)).toBe('1000m');
    });

    it('rounds meters correctly', () => {
      expect(formatDistance(50.4)).toBe('50m');
      expect(formatDistance(50.6)).toBe('51m');
    });
  });

  describe('formatDuration', () => {
    it('formats durations under 1 minute as 0 or 1 minute', () => {
      expect(formatDuration(0)).toBe('0 分鐘');
      expect(formatDuration(30)).toBe('1 分鐘'); // Rounds to 1
      expect(formatDuration(59)).toBe('1 分鐘'); // Rounds to 1
    });

    it('formats durations under 1 hour in minutes', () => {
      expect(formatDuration(60)).toBe('1 分鐘');
      expect(formatDuration(120)).toBe('2 分鐘');
      expect(formatDuration(90)).toBe('2 分鐘'); // Rounds to 2
      expect(formatDuration(3540)).toBe('59 分鐘'); // 59 minutes exactly
    });

    it('formats durations over 1 hour in hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1 小時');
      expect(formatDuration(3660)).toBe('1 小時 1 分鐘');
      expect(formatDuration(7200)).toBe('2 小時');
      expect(formatDuration(7320)).toBe('2 小時 2 分鐘');
      expect(formatDuration(5400)).toBe('1 小時 30 分鐘');
    });

    it('omits minutes when zero in hour format', () => {
      expect(formatDuration(3600)).toBe('1 小時');
      expect(formatDuration(7200)).toBe('2 小時');
    });
  });

  describe('formatSpeed', () => {
    it('converts meters per second to km/h', () => {
      expect(formatSpeed(0)).toBe('0 km/h');
      expect(formatSpeed(10)).toBe('36 km/h');
      expect(formatSpeed(27.78)).toBe('100 km/h');
    });

    it('rounds to nearest integer', () => {
      expect(formatSpeed(5.5)).toBe('20 km/h');
      expect(formatSpeed(5.6)).toBe('20 km/h');
    });
  });

  describe('getManeuverText', () => {
    it('translates turn modifiers', () => {
      expect(getManeuverText('turn', 'left')).toBe('左轉');
      expect(getManeuverText('turn', 'right')).toBe('右轉');
      expect(getManeuverText('turn', 'slight left')).toBe('靠左');
      expect(getManeuverText('turn', 'slight right')).toBe('靠右');
      expect(getManeuverText('turn', 'sharp left')).toBe('急左轉');
      expect(getManeuverText('turn', 'sharp right')).toBe('急右轉');
    });

    it('translates special maneuver types', () => {
      expect(getManeuverText('arrive')).toBe('到達目的地');
      expect(getManeuverText('depart')).toBe('出發');
      expect(getManeuverText('roundabout')).toBe('進入圓環');
      expect(getManeuverText('rotary')).toBe('進入圓環');
      expect(getManeuverText('continue')).toBe('繼續');
      expect(getManeuverText('new name')).toBe('繼續直行');
    });

    it('handles uturn', () => {
      expect(getManeuverText('turn', 'uturn')).toBe('迴轉');
    });

    it('handles straight', () => {
      expect(getManeuverText('turn', 'straight')).toBe('直行');
    });

    it('uses slight turns within 30 degrees', () => {
      expect(getManeuverText('turn', 'left', 10, 340)).toBe('靠左');
      expect(getManeuverText('turn', 'right', 350, 20)).toBe('靠右');
      expect(getManeuverIconKey('turn', 'left', 10, 340)).toBe('slight_left');
      expect(getManeuverIconKey('turn', 'right', 350, 20)).toBe('slight_right');
    });

    it('uses regular turns beyond 30 degrees', () => {
      expect(getManeuverText('turn', 'slight left', 10, 339)).toBe('左轉');
      expect(getManeuverText('turn', 'slight right', 350, 21)).toBe('右轉');
      expect(getManeuverIconKey('turn', 'slight left', 10, 339)).toBe('left');
      expect(getManeuverIconKey('turn', 'slight right', 350, 21)).toBe('right');
    });

    it('adds a bridge instruction without changing the turn', () => {
      expect(
        getManeuverText('turn', 'left', 10, 340, '西灣大橋')
      ).toBe('靠左上橋');
      expect(
        getManeuverText('turn', 'right', 350, 40, '馬六甲街行車天橋')
      ).toBe('右轉上橋');
      expect(
        getManeuverText('turn', 'right', 350, 20, '友誼橋大馬路')
      ).toBe('靠右');
      expect(
        getManeuverText('continue', undefined, 0, 0, '友誼大橋')
      ).toBe('繼續上橋');
      expect(
        getManeuverText(
          'continue',
          undefined,
          0,
          0,
          '友誼大橋',
          '友誼大橋'
        )
      ).toBe('繼續');
      expect(
        getManeuverText(
          'turn',
          'slight right',
          0,
          40,
          '友誼橋大馬路',
          '友誼大橋'
        )
      ).toBe('右轉下橋');
    });
  });
});

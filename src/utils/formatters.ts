import { t } from '../i18n/core';

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return t('format.minutes', { n: mins });
  }
  const hrs = Math.floor(mins / 60);
  const remain = mins % 60;
  if (remain > 0) {
    return t('format.hoursMinutes', { n: hrs, m: remain });
  }
  return t('format.hours', { n: hrs });
}

export function formatSpeed(mps: number): string {
  const kmh = mps * 3.6;
  return `${Math.round(kmh)} km/h`;
}

export function resolveTurnModifier(
  modifier?: string,
  bearingBefore?: number,
  bearingAfter?: number
): string | undefined {
  const isLeft = modifier === 'left' || modifier === 'slight left';
  const isRight = modifier === 'right' || modifier === 'slight right';
  if ((!isLeft && !isRight) || bearingBefore == null || bearingAfter == null) {
    return modifier;
  }

  const turnAngle = Math.abs(((bearingAfter - bearingBefore + 540) % 360) - 180);
  if (turnAngle <= 30) return isLeft ? 'slight left' : 'slight right';
  return isLeft ? 'left' : 'right';
}

export function getManeuverText(
  type: string,
  modifier?: string,
  bearingBefore?: number,
  bearingAfter?: number,
  roadName?: string,
  previousRoadName?: string
): string {
  modifier = resolveTurnModifier(modifier, bearingBefore, bearingAfter);
  let text: string;
  const modifierKeys: Record<string, string> = {
    uturn: 'maneuver.uturn',
    'sharp right': 'maneuver.sharpRight',
    right: 'maneuver.right',
    'slight right': 'maneuver.slightRight',
    straight: 'maneuver.straight',
    'slight left': 'maneuver.slightLeft',
    left: 'maneuver.left',
    'sharp left': 'maneuver.sharpLeft',
  };

  if (type === 'roundabout' || type === 'rotary') {
    text = t('maneuver.roundabout');
  } else if (type === 'arrive') {
    text = t('maneuver.arrive');
  } else if (type === 'depart') {
    text = t('maneuver.depart');
  } else if (modifier) {
    const key = modifierKeys[modifier];
    text = key ? t(key) : modifier;
  } else if (type === 'turn') {
    text = t('maneuver.turn');
  } else if (type === 'new name') {
    text = t('maneuver.continueStraight');
  } else if (type === 'continue') {
    text = t('maneuver.continue');
  } else {
    text = type;
  }

  const entersBridge = isBridgeRoad(roadName) && !isBridgeRoad(previousRoadName);
  const leavesBridge = !isBridgeRoad(roadName) && isBridgeRoad(previousRoadName);
  if (type !== 'arrive' && entersBridge) return t('maneuver.ontoBridge', { text });
  if (type !== 'depart' && leavesBridge) return t('maneuver.offBridge', { text });
  return text;
}

function isBridgeRoad(roadName?: string): boolean {
  return Boolean(roadName && /(大橋|行車天橋|下層車道|bridge|viaduct|overpass|flyover)/i.test(roadName));
}

export function getManeuverIcon(
  type: string,
  modifier?: string
): string {
  if (type === 'arrive') return '🏁';
  if (type === 'depart') return '🚗';
  if (type === 'roundabout' || type === 'rotary') return '🔄';

  const icons: Record<string, string> = {
    uturn: '↩',
    'sharp right': '↪',
    right: '↪',
    'slight right': '↗',
    straight: '↑',
    'slight left': '↖',
    left: '↩',
    'sharp left': '↖',
  };

  return modifier ? icons[modifier] || '→' : '→';
}

/**
 * Map an OSRM maneuver (type + modifier) to a LaneGo icon key so navigation
 * turn arrows match the lane-guidance icon set instead of a generic arrow.
 * Returns null for maneuvers that should render a non-SVG glyph
 * (arrive/depart/roundabout).
 */
export function getManeuverIconKey(
  type: string,
  modifier?: string,
  bearingBefore?: number,
  bearingAfter?: number
): string | null {
  if (type === 'arrive' || type === 'depart') return null;
  if (type === 'roundabout' || type === 'rotary') return null;

  modifier = resolveTurnModifier(modifier, bearingBefore, bearingAfter);

  const map: Record<string, string> = {
    uturn: 'u_turn',
    'sharp right': 'right',
    right: 'right',
    'slight right': 'slight_right',
    straight: 'straight',
    'slight left': 'slight_left',
    left: 'left',
    'sharp left': 'left',
  };

  if (modifier && map[modifier]) return map[modifier];
  if (type === 'continue' || type === 'new name' || type === 'depart') {
    return 'straight';
  }
  return 'straight';
}

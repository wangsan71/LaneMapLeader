import type { OSRMStep } from '../types/routing';
import { distance as calcDistance } from './geo';
import { t } from '../i18n/core';

export interface ParsedTurn {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
  modifier?: string;
  roadName: string;
  stepIndex: number;
  coordinate: [number, number];
}

export function parseSteps(steps: OSRMStep[]): ParsedTurn[] {
  return steps.map((step, index) => {
    const { maneuver } = step;
    const instruction =
      maneuver.type === 'arrive'
        ? t('navUtil.arriveAt', { name: step.name || t('navUtil.destination') })
        : step.name
          ? t('navUtil.toward', { name: step.name })
          : maneuver.modifier || maneuver.type;

    return {
      instruction,
      distance: step.distance,
      duration: step.duration,
      type: maneuver.type,
      modifier: maneuver.modifier,
      roadName: step.name || '',
      stepIndex: index,
      coordinate: maneuver.location,
    };
  });
}

export function getRemainingDistance(
  steps: ParsedTurn[],
  currentIndex: number,
  gpsPosition: { lat: number; lng: number } | null
): number {
  if (!gpsPosition) return 0;
  let total = 0;
  for (let i = currentIndex; i < steps.length; i++) {
    total += steps[i].distance;
  }
  return total;
}

export function getDistanceAlongStep(
  step: OSRMStep,
  gpsPosition: { lat: number; lng: number }
): number {
  const coordinates = step.geometry.coordinates as [number, number][];
  if (coordinates.length < 2) {
    const [lng, lat] = step.maneuver.location;
    return calcDistance(gpsPosition.lat, gpsPosition.lng, lat, lng);
  }

  const latitudeScale = Math.cos((gpsPosition.lat * Math.PI) / 180);
  let nearestSegment = 0;
  let nearestT = 0;
  let nearestDistanceSquared = Infinity;

  for (let index = 0; index < coordinates.length - 1; index++) {
    const [startLng, startLat] = coordinates[index];
    const [endLng, endLat] = coordinates[index + 1];
    const dx = (endLng - startLng) * latitudeScale;
    const dy = endLat - startLat;
    const px = (gpsPosition.lng - startLng) * latitudeScale;
    const py = gpsPosition.lat - startLat;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared));
    const projectedX = px - t * dx;
    const projectedY = py - t * dy;
    const distanceSquared = projectedX * projectedX + projectedY * projectedY;

    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestSegment = index;
      nearestT = t;
    }
  }

  const [startLng, startLat] = coordinates[nearestSegment];
  const [endLng, endLat] = coordinates[nearestSegment + 1];
  const projectedLng = startLng + (endLng - startLng) * nearestT;
  const projectedLat = startLat + (endLat - startLat) * nearestT;
  let remaining = calcDistance(projectedLat, projectedLng, endLat, endLng);

  for (let index = nearestSegment + 1; index < coordinates.length - 1; index++) {
    const [fromLng, fromLat] = coordinates[index];
    const [toLng, toLat] = coordinates[index + 1];
    remaining += calcDistance(fromLat, fromLng, toLat, toLng);
  }

  return remaining;
}

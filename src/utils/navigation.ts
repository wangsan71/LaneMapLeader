import type { OSRMStep } from '../types/routing';

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
        ? `到達 ${step.name || '目的地'}`
        : step.name
          ? `往 ${step.name}`
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

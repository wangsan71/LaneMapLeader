import type { OSRMRoute, RoutePreference } from '../types/routing';

function routeStats(route: OSRMRoute) {
  const steps = route.legs.flatMap((leg) => leg.steps);
  const turns = steps.filter((step) => {
    const type = step.maneuver.type;
    return type === 'turn' || type === 'roundabout' || type === 'rotary' || type === 'merge';
  }).length;
  const hardTurns = steps.filter((step) => {
    const modifier = step.maneuver.modifier || '';
    return modifier.includes('sharp') || modifier === 'uturn';
  }).length;
  const intersections = steps.reduce((total, step) => total + step.intersections.length, 0);
  return { turns, hardTurns, intersections };
}

export function estimateComplexTraffic(route: OSRMRoute): OSRMRoute {
  const baseDuration = route.baseDuration ?? route.duration;
  const { turns, hardTurns, intersections } = routeStats(route);
  const distanceKm = Math.max(route.distance / 1000, 0.5);
  const intersectionDensity = intersections / distanceKm;
  const trafficFactor = Math.min(
    1.45,
    1.12 + intersectionDensity * 0.006 + turns * 0.004 + hardTurns * 0.012
  );

  return {
    ...route,
    baseDuration,
    duration: Math.round(baseDuration * trafficFactor),
    trafficFactor,
    turnCount: turns,
    hardTurnCount: hardTurns,
  };
}

export function rankRoutes(routes: OSRMRoute[], preference: RoutePreference): OSRMRoute[] {
  const enriched = routes.map(estimateComplexTraffic);
  if (enriched.length < 2) return enriched;

  const minDuration = Math.min(...enriched.map((route) => route.duration));
  const minDistance = Math.min(...enriched.map((route) => route.distance));
  const maxTurns = Math.max(...enriched.map((route) => route.turnCount || 0), 1);

  const score = (route: OSRMRoute) => {
    const duration = route.duration / minDuration;
    const distance = route.distance / minDistance;
    const turns = (route.turnCount || 0) / maxTurns;
    const hardTurns = (route.hardTurnCount || 0) / maxTurns;

    if (preference === 'fastest') return duration;
    if (preference === 'shortest') return distance * 0.75 + duration * 0.25;
    if (preference === 'fewer-turns') {
      return turns * 0.55 + hardTurns * 0.2 + duration * 0.2 + distance * 0.05;
    }
    return duration * 0.55 + distance * 0.2 + turns * 0.17 + hardTurns * 0.08;
  };

  return enriched.sort((a, b) => score(a) - score(b));
}

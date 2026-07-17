import { useState, useCallback } from 'react';
import type { Road, RoadMatch } from '../types/roads';
import { findNearestRoad, getDirection, roadHeadingDifference } from '../utils/lanes';
import { getRoads } from '../services/roads';

const MAX_DISTANCE = 120;
const MAX_HEADING_DIFFERENCE = 20;

export function useRoadMatching() {
  const [match, setMatch] = useState<RoadMatch | null>(null);
  const [currentRoad, setCurrentRoad] = useState<Road | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const update = useCallback(
    (
      lat: number,
      lng: number,
      gpsHeading: number | null,
      deviceHeading: number | null
    ) => {
      const roads = getRoads();
      if (roads.length === 0) {
        setMatch(null);
        setCurrentRoad(null);
        return;
      }

      const nearest = findNearestRoad(lat, lng, roads);
      if (!nearest || nearest.distance > MAX_DISTANCE) {
        setMatch(null);
        setCurrentRoad(null);
        return;
      }

      let effectiveHeading: number | null = null;

      if (gpsHeading !== null && !isNaN(gpsHeading) && gpsHeading >= 0) {
        effectiveHeading = gpsHeading;
      } else if (deviceHeading !== null && !isNaN(deviceHeading)) {
        effectiveHeading = deviceHeading;
      }

      if (
        effectiveHeading === null ||
        roadHeadingDifference(nearest, effectiveHeading) > MAX_HEADING_DIFFERENCE
      ) {
        setMatch(null);
        setCurrentRoad(null);
        return;
      }

      const dir = nearest.road.oneway
        ? nearest.road.reversed
          ? 'backward'
          : 'forward'
        : getDirection(nearest, effectiveHeading);

      setMatch(nearest);
      setCurrentRoad(nearest.road);
      setDirection(dir);
    },
    []
  );

  return { match, currentRoad, direction, update };
}

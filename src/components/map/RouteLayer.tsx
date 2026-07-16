import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { OSRMRoute } from '../../types/routing';
import type { NavState } from '../../types/navigation';

interface RouteLayerProps {
  route: OSRMRoute | null;
  routes?: OSRMRoute[];
  navigationState?: NavState;
  currentStepIndex?: number;
  gpsPosition?: { lat: number; lng: number } | null;
}

export function RouteLayer({
  route,
  routes = [],
  navigationState,
  currentStepIndex = 0,
  gpsPosition,
}: RouteLayerProps) {
  const routeGeoJSON = useMemo(() => {
    if (!route) return null;

    return {
      type: 'FeatureCollection' as const,
      features: (routes.length ? routes : [route]).map((option) => ({
        type: 'Feature' as const,
        properties: { selected: option === route },
        geometry: option.geometry,
      })),
    };
  }, [route, routes]);

  const traveledGeoJSON = useMemo(() => {
    if (!route || navigationState !== 'navigating' || !gpsPosition) return null;
    const steps = route.legs[0]?.steps;
    if (!steps?.length) return null;

    const coordinates: [number, number][] = [];
    for (let i = 0; i < Math.min(currentStepIndex, steps.length); i++) {
      for (const coordinate of steps[i].geometry.coordinates) {
        const point = coordinate as [number, number];
        const last = coordinates[coordinates.length - 1];
        if (!last || last[0] !== point[0] || last[1] !== point[1]) {
          coordinates.push(point);
        }
      }
    }

    const current = steps[Math.min(currentStepIndex, steps.length - 1)].geometry.coordinates as [number, number][];
    if (current.length >= 2) {
      let nearestIndex = 0;
      let nearestT = 0;
      let nearestDistance = Infinity;
      for (let i = 0; i < current.length - 1; i++) {
        const [ax, ay] = current[i];
        const [bx, by] = current[i + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared === 0
          ? 0
          : Math.max(0, Math.min(1, ((gpsPosition.lng - ax) * dx + (gpsPosition.lat - ay) * dy) / lengthSquared));
        const px = ax + t * dx;
        const py = ay + t * dy;
        const distanceSquared = (gpsPosition.lng - px) ** 2 + (gpsPosition.lat - py) ** 2;
        if (distanceSquared < nearestDistance) {
          nearestDistance = distanceSquared;
          nearestIndex = i;
          nearestT = t;
        }
      }
      coordinates.push(...current.slice(coordinates.length ? 1 : 0, nearestIndex + 1));
      const start = current[nearestIndex];
      const end = current[nearestIndex + 1];
      coordinates.push([
        start[0] + (end[0] - start[0]) * nearestT,
        start[1] + (end[1] - start[1]) * nearestT,
      ]);
    }

    if (coordinates.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates },
    };
  }, [route, navigationState, currentStepIndex, gpsPosition]);

  if (!routeGeoJSON) return null;

  return (
    <>
      <Source id="route" type="geojson" data={routeGeoJSON}>
      <Layer
        id="route-alternatives"
        type="line"
        source="route"
        filter={['==', ['get', 'selected'], false]}
        paint={{
          'line-color': '#64748B',
          'line-width': 5,
          'line-opacity': 0.55,
        }}
      />
      <Layer
        id="route-outline"
        type="line"
        source="route"
        filter={['==', ['get', 'selected'], true]}
        paint={{
          'line-color': '#ffffff',
          'line-width': 10,
          'line-opacity': 0.55,
        }}
      />
      <Layer
        id="route-layer"
        type="line"
        source="route"
        filter={['==', ['get', 'selected'], true]}
        paint={{
          'line-color': '#7C3AED',
          'line-width': 6,
          'line-opacity': 0.9,
        }}
      />
      </Source>
      {traveledGeoJSON && (
        <Source id="route-traveled" type="geojson" data={traveledGeoJSON}>
          <Layer
            id="route-traveled-layer"
            type="line"
            source="route-traveled"
            paint={{
              'line-color': '#6B7280',
              'line-width': 6,
              'line-opacity': 0.95,
            }}
          />
        </Source>
      )}
    </>
  );
}

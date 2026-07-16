import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { Road } from '../../types/roads';
import { getRoads } from '../../services/roads';

function roadsToGeoJSON(roads: Road[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: roads.map((road) => ({
      type: 'Feature' as const,
      properties: { id: road.id, name: road.name },
      geometry: {
        type: 'LineString' as const,
        coordinates: road.path.map((p) => [p[1], p[0]]),
      },
    })),
  };
}

interface RoadLayerProps {
  visible?: boolean;
}

export function RoadLayer({ visible = true }: RoadLayerProps) {
  const roads = getRoads();
  const geojson = useMemo(() => roadsToGeoJSON(roads), [roads]);

  if (roads.length === 0 || !visible) return null;

  return (
    <Source id="roads" type="geojson" data={geojson}>
      <Layer
        id="roads-layer"
        type="line"
        source="roads"
        paint={{
          'line-color': '#1a73e8',
          'line-width': 4,
          'line-opacity': 0.5,
        }}
      />
    </Source>
  );
}

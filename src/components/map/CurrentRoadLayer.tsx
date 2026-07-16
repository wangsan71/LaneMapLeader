import { useEffect } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import type { Road } from '../../types/roads';

interface CurrentRoadLayerProps {
  road: Road | null;
  direction: 'forward' | 'backward';
}

export function CurrentRoadLayer({ road, direction }: CurrentRoadLayerProps) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();

    if (!road) {
      if (mapInstance.getLayer('highlight-layer')) {
        mapInstance.removeLayer('highlight-layer');
      }
      if (mapInstance.getSource('highlight')) {
        mapInstance.removeSource('highlight');
      }
      return;
    }

    const coordinates =
      direction === 'forward'
        ? road.path.map((p) => [p[1], p[0]])
        : [...road.path].reverse().map((p) => [p[1], p[0]]);

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      ],
    };

    const source = mapInstance.getSource('highlight');
    if (source && 'setData' in source) {
      (source as unknown as { setData: (data: GeoJSON.GeoJSON) => void }).setData(geojson);
    } else if (!source) {
      mapInstance.addSource('highlight', { type: 'geojson', data: geojson });
      mapInstance.addLayer({
        id: 'highlight-layer',
        type: 'line',
        source: 'highlight',
        paint: {
          'line-color': '#ea4335',
          'line-width': 7,
          'line-opacity': 0.9,
        },
      });
    }
  }, [map, road, direction]);

  return null;
}

import React, { useCallback } from 'react';
import Map, {
  NavigationControl,
  AttributionControl,
  MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  children?: React.ReactNode;
  onClick?: (lng: number, lat: number) => void;
  mapRef?: React.RefObject<MapRef>;
  cursor?: string;
}

const DEFAULT_CENTER: [number, number] = [113.5439, 22.1987];
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

export function MapView({ children, onClick, mapRef, cursor }: MapViewProps) {
  const handleClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      onClick?.(e.lngLat.lng, e.lngLat.lat);
    },
    [onClick]
  );

  const cursorClass = cursor === 'crosshair' ? 'map-crosshair' : '';

  return (
    <div className={cursorClass} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: DEFAULT_CENTER[0],
          latitude: DEFAULT_CENTER[1],
          zoom: 13,
          pitch: 0,
          bearing: 0,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        onClick={handleClick}
        reuseMaps
      >
        <AttributionControl compact position="bottom-left" />
        <NavigationControl showCompass position="bottom-right" />
        {children}
      </Map>
    </div>
  );
}

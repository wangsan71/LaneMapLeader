import { Marker } from 'react-map-gl/maplibre';

interface GPSMarkerProps {
  lat: number;
  lng: number;
  heading: number | null;
}

export function GPSMarker({ lat, lng, heading }: GPSMarkerProps) {
  const hasHeading = heading !== null && !isNaN(heading) && heading >= 0;

  return (
    <Marker longitude={lng} latitude={lat} anchor="center" offset={[0, 0]}>
      <div style={{ width: 64, height: 64, pointerEvents: 'none' }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          {/* glow */}
          <circle cx="32" cy="32" r="20" fill="rgba(26, 115, 232, 0.12)" />

          {/* direction fan */}
          {hasHeading && (
            <g transform={`rotate(${heading} 32 32)`}>
              <path
                d="M 32 32 L 22 10 A 24 24 0 0 1 42 10 Z"
                fill="rgba(26, 115, 232, 0.25)"
                stroke="rgba(26, 115, 232, 0.5)"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* blue dot */}
          <circle
            cx="32"
            cy="32"
            r="9"
            fill="#1a73e8"
            stroke="#ffffff"
            strokeWidth="3"
          />

          {/* center dot */}
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </svg>
      </div>
    </Marker>
  );
}

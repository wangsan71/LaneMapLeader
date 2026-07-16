import React from 'react';

interface ControlsProps {
  onLocate: () => void;
  isLocating: boolean;
  orientationEnabled: boolean;
  onToggleOrientation: () => void;
  deviceHeading: number | null;
  onResetBearing?: () => void;
}

export function Controls({
  onLocate,
  isLocating,
  orientationEnabled,
  onToggleOrientation,
  deviceHeading,
}: ControlsProps) {
  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
      {/* Locate button */}
      <button
        onClick={onLocate}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
          isLocating
            ? 'bg-blue-600 text-white'
            : 'bg-white/90 text-gray-600 hover:bg-gray-100'
        }`}
        title={isLocating ? '停止定位' : '開始定位'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Compass / Orientation toggle */}
      <button
        onClick={onToggleOrientation}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
          orientationEnabled
            ? 'bg-blue-600 text-white'
            : 'bg-white/90 text-gray-600 hover:bg-gray-100'
        }`}
        title={orientationEnabled ? '關閉方向感應' : '開啟方向感應'}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{
            transform: deviceHeading !== null ? `rotate(${-deviceHeading}deg)` : undefined,
            transition: 'transform 0.3s ease',
          }}
        >
          <path d="M12 2L8 12l4 2 4-2L12 2z" />
          <path d="M12 22V14" stroke="currentColor" strokeWidth="2" fill="none" />
          <path
            d="M8 12L12 22L16 12"
            fill={orientationEnabled ? 'currentColor' : '#9CA3AF'}
            opacity={0.5}
          />
        </svg>
      </button>
    </div>
  );
}

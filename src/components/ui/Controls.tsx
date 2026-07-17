import React from 'react';

interface ControlsProps {
  onLocate: () => void;
  isLocating: boolean;
  orientationEnabled: boolean;
  onToggleOrientation: () => void;
  deviceHeading: number | null;
  onResetBearing?: () => void;
  monitorMode: boolean;
  onToggleMonitor: () => void;
}

export function Controls({
  onLocate,
  isLocating,
  orientationEnabled,
  onToggleOrientation,
  deviceHeading,
  monitorMode,
  onToggleMonitor,
}: ControlsProps) {
  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
      <button
        onClick={onToggleMonitor}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all ${
          monitorMode ? 'ring-3 ring-emerald-500 scale-105' : 'hover:scale-105'
        }`}
        title={monitorMode ? '結束行車監控' : '啟動行車監控'}
        aria-label={monitorMode ? '結束行車監控' : '啟動行車監控'}
        aria-pressed={monitorMode}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
          <g stroke="#000000" strokeWidth="2" strokeLinecap="round">
            <line x1="14" y1="42" x2="24" y2="42" />
            <line x1="10" y1="48" x2="20" y2="48" />
            <line x1="16" y1="54" x2="26" y2="54" />
          </g>
          <g stroke="#000000" strokeLinecap="round">
            <line x1="18" y1="66" x2="82" y2="66" strokeWidth="2.5" />
            <line x1="30" y1="72" x2="45" y2="72" strokeWidth="1.5" />
            <line x1="55" y1="72" x2="70" y2="72" strokeWidth="1.5" />
          </g>
          <path
            d="M 28 58 C 28 52, 32 50, 38 50 C 42 50, 46 40, 56 40 C 68 40, 74 48, 80 50 C 84 51, 86 54, 86 58 Z"
            fill="#000000"
          />
          <path d="M 41 49 C 44 49, 47 42, 54 42 C 59 42, 61 45, 63 49 Z" fill="#FFFFFF" />
          <path d="M 65 49 C 66 46, 68 43, 72 45 C 74 46, 75 48, 76 49 Z" fill="#FFFFFF" />
          <circle cx="40" cy="58" r="8" fill="#000000" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="40" cy="58" r="2.5" fill="#FFFFFF" />
          <circle cx="68" cy="58" r="8" fill="#000000" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="68" cy="58" r="2.5" fill="#FFFFFF" />
        </svg>
      </button>

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

import React from 'react';

interface CompassProps {
  heading: number | null;
  onClick: () => void;
  isEnabled: boolean;
}

export function Compass({ heading, onClick, isEnabled }: CompassProps) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
        isEnabled
          ? 'bg-blue-600 text-white'
          : 'bg-white/90 text-gray-600 hover:bg-gray-100'
      }`}
      title={isEnabled ? '關閉方向感應' : '開啟方向感應'}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5"
        style={{
          transform: heading !== null ? `rotate(${-heading}deg)` : undefined,
          transition: 'transform 0.3s ease',
        }}
        fill="currentColor"
      >
        <path d="M12 2L8 12l4 2 4-2L12 2z" />
        <path d="M12 22V14" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M8 12L12 22L16 12"
          fill={isEnabled ? 'currentColor' : '#9CA3AF'}
          opacity={0.5}
        />
      </svg>
    </button>
  );
}

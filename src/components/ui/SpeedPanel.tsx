import React from 'react';

interface SpeedPanelProps {
  speed: number | null;
  heading: number | null;
  accuracy: number;
}

export function SpeedPanel({ speed, heading, accuracy }: SpeedPanelProps) {
  const kmh = speed !== null ? Math.round(speed * 3.6) : null;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-4 py-2 flex items-center gap-4 text-sm">
      {kmh !== null ? (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-800">{kmh}</span>
          <span className="text-xs text-gray-500">km/h</span>
        </div>
      ) : (
        <span className="text-gray-400">-- km/h</span>
      )}

      <div className="w-px h-6 bg-gray-200" />

      {heading !== null ? (
        <div className="text-gray-600">
          <span className="font-medium">{Math.round(heading)}°</span>
        </div>
      ) : (
        <span className="text-gray-400">--°</span>
      )}

      <div className="w-px h-6 bg-gray-200" />

      <div className="text-xs text-gray-500">
        精度 {Math.round(accuracy)}m
      </div>
    </div>
  );
}

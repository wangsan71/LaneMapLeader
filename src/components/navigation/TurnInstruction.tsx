import React from 'react';
import { formatDistance } from '../../utils/formatters';
import { getManeuverText, getManeuverIconKey } from '../../utils/formatters';
import { LaneIcon } from '../lane/LaneIcons';

interface TurnInstructionProps {
  maneuver: string;
  modifier?: string;
  bearingBefore: number;
  bearingAfter: number;
  roadName: string;
  previousRoadName?: string;
  distance: number;
  isActive?: boolean;
}

export function TurnInstruction({
  maneuver,
  modifier,
  bearingBefore,
  bearingAfter,
  roadName,
  previousRoadName,
  distance,
  isActive = false,
}: TurnInstructionProps) {
  const text = getManeuverText(
    maneuver,
    modifier,
    bearingBefore,
    bearingAfter,
    roadName,
    previousRoadName
  );
  const iconKey = getManeuverIconKey(
    maneuver,
    modifier,
    bearingBefore,
    bearingAfter
  );

  return (
    <div
      className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${
        isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
      }`}
    >
      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
        {iconKey ? (
          <LaneIcon icon={iconKey} size={36} />
        ) : (
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
              isActive ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
          >
            {maneuver === 'arrive' ? '🏁' : maneuver === 'depart' ? '🚗' : '🔄'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${isActive ? '' : ''}`}>
          {text}
        </div>
        {roadName && (
          <div className="text-xs text-gray-500 truncate">{roadName}</div>
        )}
      </div>
      <div className="flex-shrink-0 text-sm font-medium text-right">
        {formatDistance(distance)}
      </div>
    </div>
  );
}

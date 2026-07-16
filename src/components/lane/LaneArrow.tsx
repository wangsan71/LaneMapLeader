import React from 'react';
import { LaneIcon } from './LaneIcons';

interface LaneArrowProps {
  icon: string;
  label: string;
  laneNumber: number;
  size?: number;
}

export const LaneArrow: React.FC<LaneArrowProps> = ({
  icon,
  label,
  laneNumber,
  size = 48,
}) => {
  const validIcon = [
    'straight',
    'left',
    'right',
    'slight_left',
    'slight_right',
    'straight_left',
    'straight_right',
    'left_right',
    'straight_left_right',
    'u_turn',
    'uturn_left',
    'uturn_right',
    'merge_left',
    'merge_right',
  ].includes(icon)
    ? icon
    : 'straight';

  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3 min-w-[80px]">
      <LaneIcon icon={validIcon} size={size} />
      <span className="text-xs text-gray-600 mt-1.5 text-center leading-tight">
        {label}
      </span>
      <span className="text-[10px] text-gray-400 mt-0.5">
        第 {laneNumber} 車道
      </span>
    </div>
  );
};

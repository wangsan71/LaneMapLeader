import React from 'react';
import { LaneIcon } from './LaneIcons';
import type { Road } from '../../types/roads';

interface LaneCardProps {
  road: Road | null;
  direction: 'forward' | 'backward';
}

export function LaneCard({ road, direction }: LaneCardProps) {
  if (!road) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 w-[calc(100%-2rem)] max-w-lg text-center text-sm text-gray-600">
        正在匹配目前道路與車道資料...
      </div>
    );
  }

  const forward = road.lanesForward || [];
  const backward = road.lanesBackward || [];
  const primary = direction === 'forward' ? forward : backward;
  // Fall back to the opposite direction's lanes if the matched direction has
  // none (common for one-way roads where only one set is populated).
  const lanes = primary.length > 0 ? primary : direction === 'forward' ? backward : forward;
  const total = lanes.length;
  const dirText = direction === 'forward' ? '順向' : '反向';

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 w-[calc(100%-2rem)] max-w-lg">
      <div className="font-semibold text-base mb-3 text-gray-800 flex items-center gap-2">
        <span className="truncate">{road.name}</span>
        <span className="text-xs text-gray-400 font-normal flex-shrink-0">
          {dirText} · {total} 車道
        </span>
      </div>

      {total === 0 ? (
        <div className="text-center text-gray-400 py-4 text-sm">
          此路段尚未設定車道
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {lanes.map((lane, i) => {
            const iconKey =
              lane.icon &&
              [
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
              ].includes(lane.icon)
                ? lane.icon
                : 'straight';

            return (
              <div
                key={i}
                className="flex flex-col items-center bg-gray-50 rounded-xl p-2 sm:p-3 min-w-[72px] sm:min-w-[80px]"
              >
                <LaneIcon icon={iconKey} size={48} />
                <span className="text-xs text-gray-600 mt-1.5 text-center leading-tight">
                  {lane.label}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  第 {i + 1} 車道
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

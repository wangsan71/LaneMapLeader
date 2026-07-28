import React from 'react';
import { LaneIcon } from './LaneIcons';
import type { Road } from '../../types/roads';
import { useT } from '../../i18n';

interface LaneCardProps {
  road: Road | null;
  direction: 'forward' | 'backward';
  compact?: boolean;
  matchDistance?: number;
}

export function LaneCard({ road, direction, compact = false, matchDistance }: LaneCardProps) {
  const t = useT();

  if (!road) {
    return (
      <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg w-[calc(100%-2rem)] max-w-lg text-center text-gray-600 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
        {t('lane.loading')}
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
  const dirText = direction === 'forward' ? t('lane.forward') : t('lane.backward');

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg w-[calc(100%-2rem)] max-w-lg ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
      <div className={`font-semibold text-gray-800 flex items-center gap-2 ${compact ? 'text-sm mb-2' : 'text-base mb-3'}`}>
        <span className="truncate">{road.name}</span>
        <span className="text-xs text-gray-400 font-normal flex-shrink-0">
          {t('lane.lanesCount', { dir: dirText, n: total })}
        </span>
      </div>

      <div className={`flex flex-wrap items-center gap-x-2 text-gray-500 ${compact ? 'mb-2 text-[10px]' : 'mb-3 text-xs'}`}>
        {matchDistance !== undefined && <span>{t('lane.distance', { n: Math.round(matchDistance) })}</span>}
        <span>{road.highway || t('lane.road')}</span>
        <span>{Math.round(road.length)}m</span>
        <span>{road.oneway ? t('lane.oneway') : t('lane.twoway')}</span>
      </div>

      {total === 0 ? (
        <div className="text-center text-gray-400 py-4 text-sm">
          {t('lane.noLanes')}
        </div>
      ) : (
        <div className={`flex overflow-x-auto pb-1 ${compact ? 'gap-2' : 'gap-3'}`}>
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
                className={`flex flex-col items-center bg-gray-50 rounded-xl ${compact ? 'p-1.5 min-w-[60px]' : 'p-2 sm:p-3 min-w-[72px] sm:min-w-[80px]'}`}
              >
                <LaneIcon icon={iconKey} size={compact ? 36 : 48} />
                <span className={`${compact ? 'text-[11px] mt-1' : 'text-xs mt-1.5'} text-gray-600 text-center leading-tight`}>
                  {lane.label}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {t('lane.laneNumber', { i: i + 1 })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

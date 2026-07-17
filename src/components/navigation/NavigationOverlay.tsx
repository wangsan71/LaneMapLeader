import React, { useState } from 'react';
import { useNavigationContext } from '../../context/NavigationContext';
import { TurnList } from './TurnList';
import {
  formatDistance,
  formatDuration,
  getManeuverIconKey,
  getManeuverText,
} from '../../utils/formatters';
import { LaneIcon } from '../lane/LaneIcons';
import { getDistanceAlongStep } from '../../utils/navigation';

export function NavigationOverlay() {
  const { state: ctx, stopNavigation } = useNavigationContext();
  const [showSteps, setShowSteps] = useState(false);

  if (ctx.state !== 'navigating' || !ctx.route || !ctx.route.legs[0]) {
    return null;
  }

  const steps = ctx.route.legs[0].steps;
  const currentStep = steps[ctx.currentStepIndex];
  const actionStep = steps[Math.min(ctx.currentStepIndex + 1, steps.length - 1)];
  const distanceToAction = currentStep && ctx.gpsPosition
    ? getDistanceAlongStep(currentStep, ctx.gpsPosition)
    : currentStep?.distance ?? 0;
  const { remainingDistance, remainingDuration } = ctx;
  const actionText = actionStep
    ? getManeuverText(
        actionStep.maneuver.type,
        actionStep.maneuver.modifier,
        actionStep.maneuver.bearing_before,
        actionStep.maneuver.bearing_after,
        actionStep.name,
        currentStep?.name
      )
    : '繼續直行';
  const actionRoadName = actionStep?.name && actionStep.name !== currentStep?.name
    ? actionStep.name
    : '';

  return (
    <>
      {/* Top bar - current instruction */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
              {(() => {
                const t = actionStep?.maneuver.type;
                const m = actionStep?.maneuver.modifier;
                const before = actionStep?.maneuver.bearing_before;
                const after = actionStep?.maneuver.bearing_after;
                const key = actionStep
                  ? getManeuverIconKey(t!, m, before, after)
                  : 'straight';
                if (key) return <LaneIcon icon={key} size={36} />;
                return (
                  <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                    {t === 'arrive' ? '🏁' : t === 'depart' ? '🚗' : '🔄'}
                  </span>
                );
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 truncate">
                <span className="flex-shrink-0 text-xl font-bold text-blue-700">
                  {formatDistance(distanceToAction)} 後
                </span>
                <span className="truncate text-base font-semibold">
                  {actionText}{actionRoadName ? `，進入${actionRoadName}` : ''}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {currentStep?.name ? `目前在 ${currentStep.name}` : '沿目前道路行駛'}
                {remainingDistance > 0 &&
                  ` · 剩餘 ${formatDistance(remainingDistance)}`}
              </div>
            </div>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              {showSteps ? '▼' : '▲'}
            </button>
          </div>
        </div>
      </div>

      {/* Steps list */}
      {showSteps && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+7rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 max-h-[42dvh] overflow-y-auto">
          <TurnList steps={steps} currentStepIndex={ctx.currentStepIndex} />
        </div>
      )}

      {/* Bottom bar - summary */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-40 flex max-w-[calc(100%-6rem)] -translate-x-1/2 justify-center pointer-events-none">
        <div className="pointer-events-auto flex w-fit max-w-full items-center justify-center gap-[clamp(0.5rem,2.5vw,1.25rem)] whitespace-nowrap bg-black/75 backdrop-blur-sm text-white px-[clamp(0.75rem,3vw,1.75rem)] py-2.5 rounded-full text-[clamp(0.7rem,3vw,0.875rem)] shadow-lg">
          <span>{formatDistance(remainingDistance)}</span>
          <span className="text-gray-500">|</span>
          <span>{formatDuration(remainingDuration)}</span>
          <span className="text-gray-500">|</span>
          <button
            onClick={stopNavigation}
            className="text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </>
  );
}

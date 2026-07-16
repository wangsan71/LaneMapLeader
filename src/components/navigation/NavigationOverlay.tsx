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

export function NavigationOverlay() {
  const { state: ctx, stopNavigation } = useNavigationContext();
  const [showSteps, setShowSteps] = useState(false);

  if (ctx.state !== 'navigating' || !ctx.route || !ctx.route.legs[0]) {
    return null;
  }

  const steps = ctx.route.legs[0].steps;
  const currentStep = steps[ctx.currentStepIndex];
  const { remainingDistance, remainingDuration } = ctx;

  return (
    <>
      {/* Top bar - current instruction */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 flex items-center justify-center">
              {(() => {
                const t = currentStep?.maneuver.type;
                const m = currentStep?.maneuver.modifier;
                const before = currentStep?.maneuver.bearing_before;
                const after = currentStep?.maneuver.bearing_after;
                const key = currentStep
                  ? getManeuverIconKey(t!, m, before, after)
                  : 'straight';
                if (key) return <LaneIcon icon={key} size={44} />;
                return (
                  <span className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                    {t === 'arrive' ? '🏁' : t === 'depart' ? '🚗' : '🔄'}
                  </span>
                );
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg truncate">
                {currentStep
                  ? `${getManeuverText(
                      currentStep.maneuver.type,
                      currentStep.maneuver.modifier,
                      currentStep.maneuver.bearing_before,
                      currentStep.maneuver.bearing_after,
                      currentStep.name,
                      ctx.currentStepIndex > 0
                        ? steps[ctx.currentStepIndex - 1].name
                        : undefined
                    )}${currentStep.name ? `，進入${currentStep.name}` : ''}`
                  : '計算中...'}
              </div>
              <div className="text-sm text-gray-600">
                {currentStep ? formatDistance(currentStep.distance) : ''}
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

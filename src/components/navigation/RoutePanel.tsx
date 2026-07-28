import React from 'react';
import type { OSRMRoute, RoutePreference } from '../../types/routing';
import { formatDistance, formatDuration } from '../../utils/formatters';
import { useT } from '../../i18n';

interface RoutePanelProps {
  route: OSRMRoute;
  routes: OSRMRoute[];
  onSelectRoute: (route: OSRMRoute) => void;
  onStartNavigation: () => void;
  onCancel: () => void;
  preference: RoutePreference;
  onPreferenceChange: (preference: RoutePreference) => void;
}

export function RoutePanel({
  route,
  routes,
  onSelectRoute,
  onStartNavigation,
  onCancel,
  preference,
  onPreferenceChange,
}: RoutePanelProps) {
  const t = useT();
  const fastestDuration = Math.min(...routes.map((option) => option.duration));

  return (
    <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 w-[calc(100vw-2rem)] max-w-md max-h-[70dvh] overflow-y-auto">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">{t('route.select')}</h3>
          <p className="text-xs text-gray-500">{t('route.foundRoutes', { n: routes.length })}</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
          x
        </button>
      </div>

      <label className="mb-3 block text-xs font-medium text-gray-600">
        {t('route.preference')}
        <select
          value={preference}
          onChange={(event) => onPreferenceChange(event.target.value as RoutePreference)}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
        >
          <option value="balanced">{t('route.balanced')}</option>
          <option value="fastest">{t('route.fastest')}</option>
          <option value="fewer-turns">{t('route.fewerTurns')}</option>
          <option value="shortest">{t('route.shortest')}</option>
        </select>
      </label>

      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2 mb-2 sm:mb-3">
        {routes.map((option, index) => {
          const isSelected = option === route;
          return (
            <button
              key={`${option.distance}-${option.baseDuration || option.duration}-${index}`}
              type="button"
              onClick={() => onSelectRoute(option)}
              aria-pressed={isSelected}
              className={`min-w-[8.5rem] flex-1 rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <span className={`block text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                {index === 0 ? t('route.recommended') : t('route.alternative', { n: index })}
              </span>
              <span className="mt-1 block text-lg font-bold text-gray-900">
                {formatDuration(option.duration)}
              </span>
              <span className="block text-xs text-gray-500">{formatDistance(option.distance)}</span>
              <span className="mt-1 block text-[10px] text-amber-700">
                {t('route.complexEstimate')}
                {option.duration > fastestDuration + 30
                  ? ` · ${t('route.moreDuration', { duration: formatDuration(option.duration - fastestDuration) })}`
                  : ''}
              </span>
              <span className="block text-[10px] text-gray-400">
                {t('route.approxTurns', { n: option.turnCount || 0 })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onStartNavigation}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
           {t('route.start')}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
        >
           {t('route.cancel')}
        </button>
      </div>
    </div>
  );
}

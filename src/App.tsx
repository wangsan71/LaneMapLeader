import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { NavigationProvider, useNavigationContext } from './context/NavigationContext';
import { MapView } from './components/map/MapView';
import { RoadLayer } from './components/map/RoadLayer';
import { RouteLayer } from './components/map/RouteLayer';
import { CurrentRoadLayer } from './components/map/CurrentRoadLayer';
import { GPSMarker } from './components/map/GPSMarker';
import { SearchBar } from './components/navigation/SearchBar';
import { RoutePanel } from './components/navigation/RoutePanel';
import { NavigationOverlay } from './components/navigation/NavigationOverlay';
import { LaneCard } from './components/lane/LaneCard';
import { Controls } from './components/ui/Controls';
import { SpeedPanel } from './components/ui/SpeedPanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useOrientation } from './hooks/useOrientation';
import { useRoadMatching } from './hooks/useRoadMatching';
import { useRouting } from './hooks/useRouting';
import { useNavigation } from './hooks/useNavigation';
import { useMapRotation } from './hooks/useMapRotation';
import { loadRoads, hasRoads } from './services/roads';
import { bearing as calcBearing, distance as calcDistance } from './utils/geo';
import type { NavPoint } from './types/navigation';
import type { RoutePreference } from './types/routing';
import { rankRoutes } from './utils/routePreferences';

function AppContent() {
  const { state: ctx, dispatch, setOrigin, setDestination, setRouteData } =
    useNavigationContext();

  const { position, error: gpsError, isActive: isGpsActive, start: startGps, stop: stopGps } =
    useGeolocation({ throttleMs: 500 });

  const orientation = useOrientation();
  const { match: roadMatch, currentRoad, direction, update: updateRoadMatch } = useRoadMatching();
  const {
    loading: routingLoading,
    error: routingError,
    routes,
    calculateRoute,
    clear: clearRoutes,
  } = useRouting();
  const { startNavigation, stopNavigation, checkProgress } = useNavigation();
  const { mapRef, resetBearing } = useMapRotation();

  const [roadsLoaded, setRoadsLoaded] = useState(false);
  const [roadsError, setRoadsError] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<NavPoint | null>(null);
  const [selectedDest, setSelectedDest] = useState<NavPoint | null>(null);
  const [usesGpsOrigin, setUsesGpsOrigin] = useState(false);
  const [mapClickMode, setMapClickMode] = useState<'origin' | 'dest' | null>(null);
  const [routePreference, setRoutePreference] = useState<RoutePreference>('balanced');
  const [monitorMode, setMonitorMode] = useState(false);
  const [gpsFollowMode, setGpsFollowMode] = useState(false);

  // Load road data
  useEffect(() => {
    loadRoads(`${import.meta.env.BASE_URL}data/macau/roads.json`)
      .then(() => setRoadsLoaded(true))
      .catch((error) => {
        setRoadsError(error instanceof Error ? error.message : '道路資料載入失敗');
        setRoadsLoaded(true);
      });
  }, []);

  // Update navigation context with GPS
  useEffect(() => {
    if (position) {
      dispatch({
        type: 'UPDATE_GPS',
        payload: { lat: position.lat, lng: position.lng, heading: position.heading },
      });
    }
  }, [position, dispatch]);

  // Update device heading
  useEffect(() => {
    dispatch({
      type: 'SET_DEVICE_HEADING',
      payload: orientation.smoothedHeading,
    });
  }, [orientation.smoothedHeading, dispatch]);

  // Fix the orientation offset with GPS heading when moving
  useEffect(() => {
    if (
      orientation.isEnabled &&
      orientation.smoothedHeading !== null &&
      position &&
      position.heading !== null &&
      position.heading >= 0
    ) {
      orientation.updateOffset?.(position.heading);
    }
  }, [position, orientation]);

  const isDrivingMode = ctx.state === 'navigating' || monitorMode;
  const isHeadUpMode = isDrivingMode || gpsFollowMode;

  // Follow and center the GPS in head-up mode while navigating or monitoring.
  const prevFollowRef = React.useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!position || !mapRef.current) return;
    const map = mapRef.current.getMap();

    if (isHeadUpMode) {
      let heading = 0;
      if (position.heading !== null && position.heading >= 0) {
        heading = position.heading;
      } else if (orientation.correctedHeading !== null) {
        heading = orientation.correctedHeading;
      } else if (prevFollowRef.current) {
        const prev = prevFollowRef.current;
        const moved = calcDistance(prev.lat, prev.lng, position.lat, position.lng);
        if (moved > 3) {
          heading = calcBearing(prev.lat, prev.lng, position.lat, position.lng);
        } else {
          heading = map.getBearing();
        }
      }

      map.easeTo({
        center: [position.lng, position.lat],
        bearing: heading,
        pitch: 0,
        duration: 300,
      });
      prevFollowRef.current = { lat: position.lat, lng: position.lng };
    }
  }, [position, isHeadUpMode, orientation.correctedHeading, mapRef]);

  // Reset camera rotation when leaving navigation mode.
  useEffect(() => {
    if (isHeadUpMode) return;
    prevFollowRef.current = null;
    const map = mapRef.current?.getMap();
    if (map && (map.getPitch() !== 0 || map.getBearing() !== 0)) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 300 });
    }
  }, [isHeadUpMode, mapRef]);

  // Update road matching
  useEffect(() => {
    if (!position || !hasRoads()) return;
    updateRoadMatch(
      position.lat,
      position.lng,
      position.heading,
      orientation.correctedHeading
    );
  }, [position, orientation.correctedHeading, roadsLoaded, updateRoadMatch]);

  // Check navigation progress on each throttled GPS update.
  useEffect(() => {
    if (ctx.state === 'navigating' && position) checkProgress();
  }, [ctx.state, position, checkProgress]);

  const handleSearchSelect = useCallback(
    (lat: number, lng: number, name: string) => {
      const point: NavPoint = { lat, lng, name: name.split(',')[0] };
      // Refresh an automatic origin from the latest GPS fix whenever the
      // destination changes. Explicitly selected origins remain unchanged.
      if ((!selectedOrigin || usesGpsOrigin) && position) {
        const gpsOrigin: NavPoint = {
          lat: position.lat,
          lng: position.lng,
          name: '目前位置',
        };
        setSelectedOrigin(gpsOrigin);
        setUsesGpsOrigin(true);
        setOrigin(gpsOrigin);
        setSelectedDest(point);
        setDestination(point);
        return;
      }
      if (selectedOrigin) {
        setSelectedDest(point);
        setDestination(point);
        return;
      }
      // No origin and no GPS: fall back to using the first selection as origin.
      setSelectedOrigin(point);
      setUsesGpsOrigin(false);
      setOrigin(point);
    },
    [selectedOrigin, usesGpsOrigin, position, setOrigin, setDestination]
  );

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      const point: NavPoint = {
        lat,
        lng,
        name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };
      if (mapClickMode === 'origin') {
        setSelectedOrigin(point);
        setUsesGpsOrigin(false);
        setOrigin(point);
        setMapClickMode(null);
      } else if (mapClickMode === 'dest') {
        // If no origin has been set yet, use the current GPS position as origin.
        if ((!selectedOrigin || usesGpsOrigin) && position) {
          const gpsOrigin: NavPoint = {
            lat: position.lat,
            lng: position.lng,
            name: '目前位置',
          };
          setSelectedOrigin(gpsOrigin);
          setUsesGpsOrigin(true);
          setOrigin(gpsOrigin);
        }
        setSelectedDest(point);
        setDestination(point);
        setMapClickMode(null);
      }
    },
    [mapClickMode, selectedOrigin, usesGpsOrigin, position, setOrigin, setDestination]
  );

  const handlePointButtonClick = useCallback(
    (pointType: 'origin' | 'dest') => {
      if (mapClickMode !== pointType) {
        setMapClickMode(pointType);
        return;
      }

      setMapClickMode(null);
      clearRoutes();
      if (pointType === 'origin') {
        setSelectedOrigin(null);
        setUsesGpsOrigin(false);
        setOrigin(null);
      } else {
        setSelectedDest(null);
        setDestination(null);
      }
    },
    [mapClickMode, clearRoutes, setOrigin, setDestination]
  );

  // Calculate route when both points are set
  useEffect(() => {
    if (selectedOrigin && selectedDest) {
      calculateRoute(
        selectedOrigin.lng,
        selectedOrigin.lat,
        selectedDest.lng,
        selectedDest.lat
      );
    }
  }, [selectedOrigin, selectedDest, calculateRoute]);

  const rankedRoutes = useMemo(
    () => rankRoutes(routes, routePreference),
    [routes, routePreference]
  );

  useEffect(() => {
    if (rankedRoutes[0] && ctx.state !== 'navigating') setRouteData(rankedRoutes[0]);
  }, [rankedRoutes, ctx.state, setRouteData]);

  const handlePreferenceChange = useCallback(
    (preference: RoutePreference) => {
      setRoutePreference(preference);
      const ranked = rankRoutes(routes, preference);
      if (ranked[0]) setRouteData(ranked[0]);
    },
    [routes, setRouteData]
  );

  const handleStartNavigation = useCallback(() => {
    startNavigation();
    if (!isGpsActive) startGps();
    setGpsFollowMode(true);
    void orientation.start();
  }, [startNavigation, isGpsActive, orientation, startGps]);

  const handleCancelRoute = useCallback(() => {
    setSelectedOrigin(null);
    setSelectedDest(null);
    setUsesGpsOrigin(false);
    setMapClickMode(null);
    clearRoutes();
    stopNavigation();
    dispatch({ type: 'RESET' });
  }, [clearRoutes, dispatch, stopNavigation]);

  const handleLocate = useCallback(() => {
    if (isGpsActive) {
      setMonitorMode(false);
      setGpsFollowMode(false);
      stopGps();
    } else {
      startGps();
      setGpsFollowMode(true);
      void orientation.start();
    }
  }, [isGpsActive, orientation, startGps, stopGps]);

  const handleToggleMonitor = useCallback(() => {
    setMonitorMode((enabled) => {
      const next = !enabled;
      if (next) {
        if (!isGpsActive) startGps();
        setGpsFollowMode(true);
        void orientation.start();
      }
      return next;
    });
  }, [isGpsActive, orientation, startGps]);

  const isLoading = !roadsLoaded || routingLoading;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map */}
      <MapView onClick={handleMapClick} mapRef={mapRef} cursor={mapClickMode ? 'crosshair' : 'grab'}>
        <RoadLayer visible={roadsLoaded && ctx.state !== 'navigating'} />
        <RouteLayer
          route={ctx.route}
          routes={ctx.state === 'ready' ? rankedRoutes : []}
          navigationState={ctx.state}
          currentStepIndex={ctx.currentStepIndex}
          gpsPosition={ctx.gpsPosition}
        />
        <CurrentRoadLayer road={currentRoad} direction={direction} />

        {/* Origin marker */}
        {selectedOrigin && (
          <Marker
            longitude={selectedOrigin.lng}
            latitude={selectedOrigin.lat}
            anchor="bottom"
            color="#1a73e8"
          />
        )}

        {/* Destination marker */}
        {selectedDest && (
          <Marker
            longitude={selectedDest.lng}
            latitude={selectedDest.lat}
            anchor="bottom"
            color="#ea4335"
          />
        )}

        {/* GPS marker */}
        {position && (
          <GPSMarker
            lat={position.lat}
            lng={position.lng}
            heading={position.heading}
          />
        )}
      </MapView>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">
              {routingLoading ? '路線計算中...' : '載入地圖資料...'}
            </span>
          </div>
        </div>
      )}

      {/* Error messages */}
      {(gpsError || routingError || roadsError) && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+4.75rem)] right-4 z-50 max-w-[calc(100%-2rem)]">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm shadow-lg">
            {gpsError || routingError || roadsError}
          </div>
        </div>
      )}

      {/* Search bar - visible in idle/planning mode */}
      {!isDrivingMode && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 right-4 z-40 flex justify-center">
          <SearchBar onSelectLocation={handleSearchSelect} />
        </div>
      )}

      {/* LaneGo road editor */}
      {!isDrivingMode && (
        <a
          href={`${import.meta.env.BASE_URL}editor.html`}
          className="absolute top-20 right-4 z-20 hidden rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-blue-700 shadow-md transition-colors hover:bg-white lg:block"
          title="打开 LaneGo 道路及车道编辑器"
        >
          車道編輯器
        </a>
      )}

      {/* Route panel - visible when route is ready */}
      {ctx.state === 'ready' && ctx.route && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 -translate-x-1/2 z-30">
          <RoutePanel
            route={ctx.route}
            routes={rankedRoutes.length ? rankedRoutes : [ctx.route]}
            onSelectRoute={setRouteData}
            onStartNavigation={handleStartNavigation}
            onCancel={handleCancelRoute}
            preference={routePreference}
            onPreferenceChange={handlePreferenceChange}
          />
        </div>
      )}

      {/* Navigation overlay */}
      <NavigationOverlay />

      {/* Lane card - visible when navigating and on a road */}
      {isDrivingMode && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-30 w-full flex justify-center pointer-events-none ${ctx.state === 'navigating' ? 'bottom-[calc(env(safe-area-inset-bottom)+4.25rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]'}`}>
          <LaneCard
            road={currentRoad}
            direction={direction}
            compact
            matchDistance={roadMatch?.distance}
          />
        </div>
      )}

      {/* Controls */}
      {ctx.state !== 'navigating' && (
        <Controls
          onLocate={handleLocate}
          isLocating={isGpsActive}
          orientationEnabled={orientation.isEnabled}
          onToggleOrientation={orientation.toggle}
          deviceHeading={orientation.smoothedHeading}
          onResetBearing={resetBearing}
          monitorMode={monitorMode}
          onToggleMonitor={handleToggleMonitor}
        />
      )}

      {/* Speed panel - always visible when GPS active.
          Lift it above the trip-summary pill while navigating so it does
          not overlap the bottom bar. */}
      {isGpsActive && position && ctx.state !== 'navigating' && (
        <div
          className={`absolute z-40 ${isDrivingMode ? 'top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2' : 'left-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)]'}`}
        >
          <SpeedPanel
            speed={position.speed}
            heading={position.heading}
            accuracy={position.accuracy}
            showHeading={!isDrivingMode}
            roadName={isDrivingMode ? currentRoad?.name : undefined}
            direction={direction}
            compact={isDrivingMode}
          />
        </div>
      )}

      {/* Route planning mode indicator */}
      {mapClickMode && !isDrivingMode && (
        <div className="absolute top-36 sm:top-32 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg whitespace-nowrap">
            {mapClickMode === 'origin'
              ? '請點擊地圖設定起點'
              : '請點擊地圖設定終點'}
          </div>
        </div>
      )}

      {/* Point selection buttons */}
      {!isDrivingMode && ctx.state !== 'arrived' && (
        <div className="absolute top-24 sm:top-20 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <button
            onClick={() => handlePointButtonClick('origin')}
            aria-pressed={mapClickMode === 'origin'}
            className={`min-w-[7.5rem] px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-md transition-colors ${
              mapClickMode === 'origin'
                ? 'bg-blue-600 text-white'
                : selectedOrigin
                  ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📍 設定起點
          </button>
          <button
            onClick={() => handlePointButtonClick('dest')}
            aria-pressed={mapClickMode === 'dest'}
            className={`min-w-[7.5rem] px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-md transition-colors ${
              mapClickMode === 'dest'
                ? 'bg-blue-600 text-white'
                : selectedDest
                  ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🎯 設定終點
          </button>
        </div>
      )}

      {/* Arrived notification */}
      {ctx.state === 'arrived' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">已到達目的地！</h2>
            <p className="text-gray-500 mb-6">{ctx.destination?.name}</p>
            <button
              onClick={handleCancelRoute}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              結束導航
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

export default App;

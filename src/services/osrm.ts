import type { OSRMResponse } from '../types/routing';

const OSRM_BASE = 'https://router.project-osrm.org';

export async function fetchRoute(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<OSRMResponse> {
  const url = `${OSRM_BASE}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&steps=true&geometries=geojson&alternatives=3`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM request failed: ${res.status}`);
  }
  return res.json();
}

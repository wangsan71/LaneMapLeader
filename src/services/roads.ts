import type { Road } from '../types/roads';
import { t } from '../i18n/core';

let roadDatabase: Road[] = [];
let isLoaded = false;

export async function loadRoads(
  dataUrl: string = `${import.meta.env.BASE_URL}data/macau/roads.json`
): Promise<Road[]> {
  if (isLoaded) return roadDatabase;

  try {
    const res = await fetch(dataUrl);
    if (!res.ok) {
      throw new Error(t('road.fetchError', { status: String(res.status) }));
    }
    roadDatabase = await res.json();
    isLoaded = true;
    return roadDatabase;
  } catch (e) {
    console.warn('Failed to load road data:', e);
    throw e instanceof Error ? e : new Error(t('road.loadError'));
  }
}

export function getRoads(): Road[] {
  return roadDatabase;
}

export function hasRoads(): boolean {
  return isLoaded && roadDatabase.length > 0;
}

export function clearRoads(): void {
  roadDatabase = [];
  isLoaded = false;
}

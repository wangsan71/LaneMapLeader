export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchPlaces(
  query: string,
  limit = 5
): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&accept-language=zh`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'LaneMapLeader/1.0',
    },
  });
  if (!res.ok) {
    throw new Error(`Nominatim request failed: ${res.status}`);
  }
  return res.json();
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'LaneMapLeader/1.0',
    },
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.display_name || '';
}

import { MapFacility, sanitizeText } from '../types/waste';
import { DEMO_FACILITIES } from './demoData';

const CACHE_PREFIX = 'ecoloop_osm_cache_v1_';

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export async function geocodeLocality(
  query: string
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKey = `${CACHE_PREFIX}geo_${trimmed.toLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      trimmed
    )}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const result = {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      displayName: sanitizeText(first.display_name || trimmed),
    };

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // ignore
    }
    return result;
  } catch {
    return null;
  }
}

export function buildDemoFacilitiesAround(lat: number, lon: number): MapFacility[] {
  const offsets = [
    { dLat: 0.009, dLon: 0.008 },
    { dLat: -0.011, dLon: 0.006 },
    { dLat: 0.006, dLon: -0.013 },
    { dLat: -0.008, dLon: -0.01 },
  ];

  return DEMO_FACILITIES.map((item, idx) => {
    const off = offsets[idx % offsets.length];
    const fLat = Number((lat + off.dLat).toFixed(5));
    const fLon = Number((lon + off.dLon).toFixed(5));
    return {
      ...item,
      id: `${item.id}-${idx}`,
      lat: fLat,
      lon: fLon,
      distanceKm: calculateDistanceKm(lat, lon, fLat, fLon),
      address: 'Demo location - not verified (No real street address or phone number)',
      source: 'Demo location - not verified',
      isDemo: true,
    };
  });
}

export async function fetchOverpassFacilities(
  lat: number,
  lon: number,
  radiusMeters = 5000
): Promise<{
  facilities: MapFacility[];
  usedDemoFallback: boolean;
  serviceError?: string;
}> {
  // Round coordinates to ~1km grid key so we cache effectively and do not spam Overpass
  const gridKey = `${CACHE_PREFIX}ovp_${lat.toFixed(2)}_${lon.toFixed(2)}_${radiusMeters}`;
  try {
    const cached = sessionStorage.getItem(gridKey);
    if (cached) {
      const parsed = JSON.parse(cached) as MapFacility[];
      if (parsed.length > 0) {
        return { facilities: parsed, usedDemoFallback: false };
      }
    }
  } catch {
    // ignore
  }

  const query = `
    [out:json][timeout:12];
    (
      node["amenity"="recycling"](around:${radiusMeters},${lat},${lon});
      way["amenity"="recycling"](around:${radiusMeters},${lat},${lon});
      node["shop"="scrap_yard"](around:${radiusMeters},${lat},${lon});
      way["shop"="scrap_yard"](around:${radiusMeters},${lat},${lon});
      node["industrial"="scrap_yard"](around:${radiusMeters},${lat},${lon});
      way["industrial"="scrap_yard"](around:${radiusMeters},${lat},${lon});
    );
    out center 25;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      throw new Error(`Overpass returned status ${res.status}`);
    }

    const data = await res.json();
    const elements = Array.isArray(data?.elements) ? data.elements : [];

    const mapped: MapFacility[] = elements
      .map((el: {
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (typeof elLat !== 'number' || typeof elLon !== 'number') return null;

        const tags = el.tags || {};
        const isEwaste =
          tags['recycling:electrical_appliances'] === 'yes' ||
          tags['recycling:small_appliances'] === 'yes' ||
          tags['recycling:batteries'] === 'yes' ||
          tags['recycling:electronics'] === 'yes';

        const isScrap =
          tags['shop'] === 'scrap_yard' || tags['industrial'] === 'scrap_yard';

        let facType: MapFacility['type'] = 'Recycling Center';
        if (isEwaste) facType = 'E-Waste Center';
        else if (isScrap) facType = 'Scrap Dealer';
        else if (tags['recycling_type'] === 'container') facType = 'Municipal Drop-off';

        const rawName =
          tags['name'] ||
          tags['operator'] ||
          (isEwaste
            ? 'OpenStreetMap E-Waste & Battery Point'
            : isScrap
            ? 'OpenStreetMap Scrap Collector'
            : 'OpenStreetMap Recycling Point');

        const addrParts = [
          tags['addr:housename'],
          tags['addr:street'],
          tags['addr:suburb'] || tags['addr:neighbourhood'],
          tags['addr:city'],
        ].filter(Boolean);

        const address =
          addrParts.length > 0
            ? sanitizeText(addrParts.join(', '))
            : 'Address not listed in OpenStreetMap tags';

        const accepted: string[] = [];
        if (tags['recycling:batteries'] === 'yes') accepted.push('battery');
        if (
          tags['recycling:electrical_appliances'] === 'yes' ||
          tags['recycling:small_appliances'] === 'yes'
        )
          accepted.push('e-waste');
        if (tags['recycling:paper'] === 'yes' || tags['recycling:cardboard'] === 'yes')
          accepted.push('paper');
        if (tags['recycling:plastic'] === 'yes' || tags['recycling:plastic_bottles'] === 'yes')
          accepted.push('plastic');
        if (tags['recycling:glass'] === 'yes' || tags['recycling:glass_bottles'] === 'yes')
          accepted.push('glass');
        if (tags['recycling:cans'] === 'yes' || tags['recycling:scrap_metal'] === 'yes')
          accepted.push('metal');
        if (accepted.length === 0) {
          accepted.push(isScrap ? 'metal' : 'plastic', 'paper');
        }

        return {
          id: `osm-${el.id}`,
          name: sanitizeText(rawName),
          type: facType,
          address,
          lat: elLat,
          lon: elLon,
          distanceKm: calculateDistanceKm(lat, lon, elLat, elLon),
          source: 'OpenStreetMap (Overpass API)' as const,
          isDemo: false,
          acceptedCategories: accepted,
        };
      })
      .filter((item): item is MapFacility => item !== null)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    if (mapped.length > 0) {
      try {
        sessionStorage.setItem(gridKey, JSON.stringify(mapped));
      } catch {
        // ignore
      }
      return { facilities: mapped, usedDemoFallback: false };
    }

    // No verified OSM facilities found within radius -> return clearly labeled Demo fallback
    return {
      facilities: buildDemoFacilitiesAround(lat, lon),
      usedDemoFallback: true,
      serviceError:
        'No verified OpenStreetMap recycling tags found within this radius. Showing clearly labeled "Demo location - not verified" sample markers.',
    };
  } catch {
    return {
      facilities: buildDemoFacilitiesAround(lat, lon),
      usedDemoFallback: true,
      serviceError:
        'OpenStreetMap Overpass service is temporarily unreachable or busy. Showing clearly labeled "Demo location - not verified" sample markers.',
    };
  }
}

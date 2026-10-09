import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  List,
  Map as MapIcon,
} from 'lucide-react';
import { MapFacility } from '../types/waste';
import {
  buildDemoFacilitiesAround,
  fetchOverpassFacilities,
  geocodeLocality,
} from '../services/mapService';
import { DEMO_FACILITIES } from '../services/demoData';

interface MapViewProps {
  demoMode: boolean;
  initialTypeFilter?: string;
  onMarkDropoffCompleted?: (facilityName: string) => void;
}

const DEFAULT_CENTER = { lat: 12.9716, lon: 77.5946, label: 'Bengaluru (Default Demo Center)' };

export const MapView: React.FC<MapViewProps> = ({
  demoMode,
  initialTypeFilter = 'ALL',
  onMarkDropoffCompleted,
}) => {
  const [center, setCenter] = useState<{ lat: number; lon: number; label: string }>(
    DEFAULT_CENTER
  );
  const [localityInput, setLocalityInput] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);

  useEffect(() => {
    if (initialTypeFilter) {
      setTypeFilter(initialTypeFilter);
    }
  }, [initialTypeFilter]);

  const [facilities, setFacilities] = useState<MapFacility[]>(DEMO_FACILITIES);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    DEMO_FACILITIES[0]?.id || null
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<
    'prompt' | 'granted' | 'denied'
  >('prompt');
  const [statusNotice, setStatusNotice] = useState<string | null>(
    'Showing labeled Demo Locations until you grant location access or search a locality.'
  );
  const [mobileViewMode, setMobileViewMode] = useState<'split' | 'list'>('split');
  const [dropoffFeedback, setDropoffFeedback] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lon],
      zoom: 13,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    leafletMapRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  const filteredFacilities = facilities.filter((f) => {
    if (typeFilter === 'ALL') return true;
    if (typeFilter === 'RECYCLING_AND_EWASTE') {
      return (
        f.type === 'Recycling Center' ||
        f.type === 'E-Waste Center' ||
        f.type === 'Municipal Drop-off'
      );
    }
    return f.type === typeFilter;
  });

  useEffect(() => {
    const map = leafletMapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    map.setView([center.lat, center.lon], 13);

    const centerMarker = L.circleMarker([center.lat, center.lon], {
      radius: 8,
      fillColor: '#0F1A14',
      color: '#C6F432',
      weight: 3,
      fillOpacity: 0.95,
    }).bindPopup(`<strong>Search Center:</strong> ${center.label}`);
    centerMarker.addTo(layer);

    filteredFacilities.forEach((fac) => {
      const isSelected = fac.id === selectedFacilityId;
      const color = fac.isDemo
        ? '#f59e0b'
        : fac.type === 'E-Waste Center'
        ? '#10B981'
        : '#3B82F6';

      const marker = L.circleMarker([fac.lat, fac.lon], {
        radius: isSelected ? 11 : 8,
        fillColor: color,
        color: '#ffffff',
        weight: isSelected ? 3 : 2,
        fillOpacity: 0.95,
      });

      marker.bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px; max-width: 220px;">
          <strong>${fac.name}</strong><br/>
          <span>${fac.type} · ${fac.distanceKm ?? '?'} km</span><br/>
          <span style="color: ${fac.isDemo ? '#b45309' : '#047857'}; font-weight: 600;">${
          fac.source
        }</span>
        </div>`
      );

      marker.on('click', () => {
        setSelectedFacilityId(fac.id);
      });

      marker.addTo(layer);
    });
  }, [center, filteredFacilities, selectedFacilityId]);

  const loadFacilitiesForCoords = async (
    lat: number,
    lon: number,
    label: string,
    rad: number
  ) => {
    setCenter({ lat, lon, label });

    if (demoMode) {
      const demoList = buildDemoFacilitiesAround(lat, lon);
      setFacilities(demoList);
      setSelectedFacilityId(demoList[0]?.id || null);
      setStatusNotice(
        'Demo Mode is ON: Showing sample locations clearly labeled "Demo location - not verified".'
      );
      return;
    }

    setIsLoading(true);
    setStatusNotice(null);
    const { facilities: found, usedDemoFallback, serviceError } =
      await fetchOverpassFacilities(lat, lon, rad);

    setFacilities(found);
    setSelectedFacilityId(found[0]?.id || null);
    if (usedDemoFallback && serviceError) {
      setStatusNotice(serviceError);
    } else {
      setStatusNotice(
        `Found ${found.length} OpenStreetMap facility record(s) within ${(rad / 1000).toFixed(
          0
        )} km of ${label}.`
      );
    }
    setIsLoading(false);
  };

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setPermissionState('denied');
      setStatusNotice(
        'Geolocation is not supported by your browser. Please type your city or locality below.'
      );
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionState('granted');
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        loadFacilitiesForCoords(lat, lon, 'Your Current Area (Approximate)', radiusMeters);
      },
      () => {
        setIsLoading(false);
        setPermissionState('denied');
        setStatusNotice(
          'Location permission was declined. You can search any locality or neighborhood manually below.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localityInput.trim()) return;
    setIsLoading(true);
    setStatusNotice(null);

    const geo = await geocodeLocality(localityInput);
    if (!geo) {
      setIsLoading(false);
      setStatusNotice(
        `Could not find coordinates for "${localityInput}". Showing Demo locations around default center.`
      );
      return;
    }

    await loadFacilitiesForCoords(geo.lat, geo.lon, geo.displayName, radiusMeters);
  };

  const handleCheckInDropoff = (fac: MapFacility) => {
    if (onMarkDropoffCompleted) {
      onMarkDropoffCompleted(fac.name);
      setDropoffFeedback(
        `Nice! Logged drop-off at "${fac.name}" (+35 EcoPoints added to your Wrapped).`
      );
      setTimeout(() => setDropoffFeedback(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Privacy Assurance */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432] flex items-center gap-2">
            <span>📍 OpenStreetMap &amp; Overpass Locator</span>
            <span aria-hidden="true">·</span>
            <span>Location Never Sent to AI</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
            Nearby Drop-Off &amp; Scrap Spots
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300 max-w-3xl">
            Why we ask for location: Your approximate position is used only in your browser to query
            public OpenStreetMap recycling points nearby. Exact coordinates are never stored or sent
            to Gemini.
          </p>
        </div>

        <div className="flex md:hidden items-center gap-1 p-1 bg-stone-200/80 dark:bg-[#14241B] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setMobileViewMode('split')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              mobileViewMode === 'split'
                ? 'bg-[#22C55E] text-[#0F1A14]'
                : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map + List</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('list')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              mobileViewMode === 'list'
                ? 'bg-[#22C55E] text-[#0F1A14]'
                : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List Only</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-4 space-y-1.5">
            <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">
              Option 1: Use Browser Location (Asks Permission)
            </span>
            <button
              type="button"
              onClick={handleRequestGeolocation}
              disabled={isLoading}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] disabled:opacity-60 text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Use My Location (With Permission)</span>
            </button>
          </div>

          <form onSubmit={handleManualSearch} className="lg:col-span-5 space-y-1.5">
            <label
              htmlFor="locality-search-input"
              className="block text-xs font-bold text-stone-800 dark:text-stone-200"
            >
              Option 2: Type City, Locality, or Pin Code (Fallback)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="locality-search-input"
                  type="text"
                  value={localityInput}
                  onChange={(e) => setLocalityInput(e.target.value)}
                  placeholder="e.g., Koramangala Bengaluru, Dadar Mumbai..."
                  className="w-full min-h-[46px] pl-9 pr-3 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs sm:text-sm text-stone-900 dark:text-white"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="min-h-[46px] px-4 py-2 rounded-2xl bg-stone-900 dark:bg-[#C6F432] text-white dark:text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold whitespace-nowrap shrink-0 transition-transform active:scale-95"
              >
                Search Area
              </button>
            </div>
          </form>

          <div className="lg:col-span-3 grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="map-radius"
                className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1.5"
              >
                Radius
              </label>
              <select
                id="map-radius"
                value={radiusMeters}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setRadiusMeters(r);
                  loadFacilitiesForCoords(center.lat, center.lon, center.label, r);
                }}
                className="w-full min-h-[46px] px-2.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value={3000}>3 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="map-type-filter"
                className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1.5"
              >
                Facility Type
              </label>
              <select
                id="map-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full min-h-[46px] px-2.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value="ALL">All Types</option>
                <option value="RECYCLING_AND_EWASTE">Recycling &amp; E-Waste</option>
                <option value="E-Waste Center">E-Waste</option>
                <option value="Recycling Center">Recycling</option>
                <option value="Scrap Dealer">Scrap Dealer</option>
                <option value="Municipal Drop-off">Municipal</option>
              </select>
            </div>
          </div>
        </div>

        {statusNotice && (
          <div className="p-3.5 rounded-[20px] bg-[#F7F8F5] dark:bg-[#0F1A14] border border-stone-200 dark:border-emerald-800/80 text-xs text-stone-700 dark:text-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {permissionState === 'denied' ? (
                <AlertTriangle className="w-4 h-4 text-[#FFD84D] shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              )}
              <span>{statusNotice}</span>
            </div>
            <span className="font-mono text-stone-500 dark:text-stone-400">
              Center: {center.label}
            </span>
          </div>
        )}

        {dropoffFeedback && (
          <div className="p-3.5 rounded-[20px] bg-[#C6F432] text-[#0F1A14] text-xs font-bold">
            {dropoffFeedback}
          </div>
        )}
      </section>

      {/* Main Split View: Map + Facility Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className={`lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] overflow-hidden shadow-xs ${
            mobileViewMode === 'list' ? 'hidden md:block' : 'block'
          }`}
        >
          <div
            ref={mapContainerRef}
            className="w-full h-[380px] sm:h-[480px] z-10"
            aria-label="Interactive OpenStreetMap of recycling and e-waste facilities"
          />
          <div className="px-5 py-3.5 bg-[#F7F8F5] dark:bg-[#0F1A14] border-t border-stone-200 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" />
                <span>OpenStreetMap Facility</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span>Demo location - not verified</span>
              </span>
            </div>
            <span className="font-mono text-[11px]">Cached · Never queries on map pan</span>
          </div>
        </div>

        {/* Clickable Facility Cards List View */}
        <div className="lg:col-span-5 space-y-3.5 max-h-[540px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-display font-extrabold text-stone-950 dark:text-white">
              Facilities List ({filteredFacilities.length})
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Tap card to focus pin
            </span>
          </div>

          {filteredFacilities.length === 0 ? (
            <div className="bg-white dark:bg-[#14241B] border border-stone-200 dark:border-emerald-900/70 rounded-[24px] p-6 text-center space-y-2">
              <p className="text-sm font-display font-bold text-stone-900 dark:text-white">
                No facilities match this filter
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Try switching Facility Type to “All Types” or increasing the search radius.
              </p>
            </div>
          ) : (
            filteredFacilities.map((fac) => {
              const isSelected = fac.id === selectedFacilityId;
              const osmDirectionsUrl = `https://www.openstreetmap.org/directions?from=${center.lat},${center.lon}&to=${fac.lat},${fac.lon}`;

              return (
                <div
                  key={fac.id}
                  onClick={() => {
                    setSelectedFacilityId(fac.id);
                    if (leafletMapRef.current) {
                      leafletMapRef.current.panTo([fac.lat, fac.lon]);
                    }
                  }}
                  className={`cursor-pointer rounded-[24px] p-5 border transition-all space-y-3 ${
                    isSelected
                      ? 'bg-[#22C55E]/10 border-[#22C55E] shadow-xs'
                      : 'bg-white dark:bg-[#14241B] hover:border-emerald-600/60 border-stone-200/90 dark:border-emerald-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
                        {fac.type}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {fac.distanceKm !== undefined ? `${fac.distanceKm} km` : 'Nearby'}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg ${
                        fac.isDemo
                          ? 'bg-[#FFD84D] text-[#0F1A14]'
                          : 'bg-[#22C55E]/20 text-emerald-900 dark:text-[#C6F432]'
                      }`}
                    >
                      {fac.source}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                      {fac.name}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                      {fac.address}
                    </p>
                  </div>

                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Accepts: <strong className="text-stone-800 dark:text-stone-200">{fac.acceptedCategories.join(', ')}</strong>
                  </div>

                  <div className="pt-3 border-t border-stone-200/80 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={osmDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-[#0F1A14] hover:bg-stone-200 text-stone-900 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>OSM Directions</span>
                    </a>

                    {onMarkDropoffCompleted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckInDropoff(fac);
                        }}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] text-xs font-display font-extrabold flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Mark Drop-Off Done (+35 pts)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

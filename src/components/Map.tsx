import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type CountriesGeoJson } from "../types/countries";
import type { CountryStatus } from "../pages/Home";
import WelcomeGlobe from "./WelcomeGlobe";

const DEFAULT_INITIAL_GLOBE_ZOOM = 1.35;
const MIN_MAP_ZOOM = 0.5;

export type MapProps = {
  countriesData: CountriesGeoJson | null;
  selectedCountries: string[];
  viewMode: "globe" | "map";
  userLocation?: { lng: number; lat: number } | null;
  countryStatuses?: Record<string, CountryStatus>;
  focusCountry?: string | null;
  sizeVariant?: "default" | "compact";
  initialGlobeZoom?: number;
  showGlobeBackdrop?: boolean;
};

const countryStyle = (status: CountryStatus | undefined): L.PathOptions => {
  const colors: Record<CountryStatus, { fillColor: string; color: string }> = {
    visited: { fillColor: "#CF8D45", color: "#7A3F00" },
    "want-to-visit-again": { fillColor: "#FABE7D", color: "#CF8D45" },
    "want-to-go": { fillColor: "#7A3F00", color: "#5A392B" },
  };
  const color = status ? colors[status] : { fillColor: "#EAB681", color: "#5A392B" };
  return { color: color.color, fillColor: color.fillColor, fillOpacity: 0.72, opacity: 0.95, weight: 1.2 };
};

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div class="user-location-ring user-location-ring-outer"></div><div class="user-location-ring user-location-ring-inner"></div><div class="user-location-dot"></div>`,
  iconSize: [58, 58],
  iconAnchor: [29, 29]
});

const calculateCountryCenter = (countriesData: CountriesGeoJson | null, countryName: string): L.LatLngExpression | null => {
  if (!countriesData || !countryName.trim()) return null;
  const points: Array<[number, number]> = [];
  const addRing = (ring: number[][]) => ring.forEach(([lng, lat]) => {
    if (typeof lng === "number" && typeof lat === "number") points.push([lat, lng]);
  });

  countriesData.features.forEach((feature) => {
    if (feature.properties?.name?.trim() !== countryName.trim()) return;
    if (feature.geometry?.type === "Polygon") addRing(feature.geometry.coordinates[0] ?? []);
    if (feature.geometry?.type === "MultiPolygon") feature.geometry.coordinates.forEach((polygon) => addRing(polygon[0] ?? []));
  });

  if (!points.length) return null;
  return [
    points.reduce((sum, [lat]) => sum + lat, 0) / points.length,
    points.reduce((sum, [, lng]) => sum + lng, 0) / points.length
  ];
};

const Map: React.FC<MapProps> = ({
  countriesData,
  selectedCountries,
  viewMode,
  userLocation,
  countryStatuses = {},
  focusCountry = null,
  sizeVariant = "default",
  initialGlobeZoom = DEFAULT_INITIAL_GLOBE_ZOOM,
  showGlobeBackdrop = true
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const countryLayerRef = useRef<L.GeoJSON | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const countriesDataRef = useRef(countriesData);
  const selectedCountriesRef = useRef(selectedCountries);
  const countryStatusesRef = useRef(countryStatuses);
  const userLocationRef = useRef(userLocation ?? null);
  const focusCountryRef = useRef(focusCountry?.trim() || null);
  const viewModeRef = useRef(viewMode);
  const initialGlobeZoomRef = useRef(initialGlobeZoom);
  const showGlobeBackdropRef = useRef(showGlobeBackdrop);
  const lastFocusedCountryRef = useRef<string | null>(null);

  const globeSize = sizeVariant === "compact" ? "60vw" : "min(82vw, 82vh)";
  const flatMapWidth = "min(100%, 800px)";
  const flatMapHeight = "min(48vh, 560px)";

  const refreshCountries = () => {
    const map = mapRef.current;
    if (!map) return;
    countryLayerRef.current?.removeFrom(map);
    const data = countriesDataRef.current;
    if (!data) {
      countryLayerRef.current = null;
      return;
    }

    const layer = L.geoJSON(data, {
      style: (feature) => {
        const countryName = feature?.properties?.name?.trim() ?? "";
        const status = countryStatusesRef.current[countryName] ??
          (selectedCountriesRef.current.includes(countryName) ? "visited" : undefined);
        return countryStyle(status);
      }
    });
    layer.addTo(map);
    countryLayerRef.current = layer;
  };

  const focusMapOnCountry = (countryName: string) => {
    const map = mapRef.current;
    const center = calculateCountryCenter(countriesDataRef.current, countryName);
    if (!map || !center) return;
    lastFocusedCountryRef.current = countryName;
    map.flyTo(center, viewModeRef.current === "globe" ? 3.8 : 4.2, { duration: 0.9 });
  };

  useEffect(() => {
    initialGlobeZoomRef.current = initialGlobeZoom;
    showGlobeBackdropRef.current = showGlobeBackdrop;
  }, [initialGlobeZoom, showGlobeBackdrop]);

  useEffect(() => {
    countriesDataRef.current = countriesData;
    selectedCountriesRef.current = selectedCountries;
    countryStatusesRef.current = countryStatuses;
    focusCountryRef.current = focusCountry?.trim() || null;
    refreshCountries();
    if (focusCountryRef.current && focusCountryRef.current !== lastFocusedCountryRef.current) {
      focusMapOnCountry(focusCountryRef.current);
    }
  }, [countriesData, selectedCountries, countryStatuses, focusCountry]);

  useEffect(() => {
    userLocationRef.current = userLocation ?? null;
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.removeFrom(map);
    if (userLocation) {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userLocationIcon, interactive: false }).addTo(map);
      if (!focusCountryRef.current) map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 2.2), { duration: 0.9 });
    } else {
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
  }, [viewMode, initialGlobeZoom]);

  useEffect(() => {
    if (viewMode !== "map" || !mapContainer.current) return;

    if (!mapContainer.current) return;
    const map = L.map(mapContainer.current, {
      center: [20, 0],
      zoom: 1.15,
      minZoom: MIN_MAP_ZOOM,
      worldCopyJump: false,
      zoomControl: false
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      opacity: showGlobeBackdropRef.current ? 0.5 : 0
    }).addTo(map);
    mapRef.current = map;
    refreshCountries();

    if (userLocationRef.current) {
      userMarkerRef.current = L.marker([userLocationRef.current.lat, userLocationRef.current.lng], { icon: userLocationIcon, interactive: false }).addTo(map);
    }
    if (focusCountryRef.current) focusMapOnCountry(focusCountryRef.current);

    return () => {
      userMarkerRef.current = null;
      countryLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [viewMode]);

  return (
    <div
      className="map-canvas-shell"
      ref={mapContainer}
      data-view-mode={viewMode}
      style={{
        background: showGlobeBackdrop ? "#FFEAD4" : "transparent",
        width: viewMode === "globe" ? globeSize : flatMapWidth,
        height: viewMode === "globe" ? globeSize : flatMapHeight,
        borderRadius: viewMode === "globe" ? "9999px" : "0.85rem"
      }}
    >
      {viewMode === "globe" && countriesData && (
        <div className="globe-map-renderer" aria-hidden="true">
          <WelcomeGlobe countriesData={countriesData} />
        </div>
      )}
    </div>
  );
};

export default Map;
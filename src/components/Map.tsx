import React, { useCallback, useEffect, useRef } from "react";
import { config, ErrorEvent, Map as MapLibreMap, Marker, type ExpressionSpecification, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { type CountriesGeoJson } from "../types/countries";
import type { CountryStatus } from "../pages/Home";

const DEFAULT_INITIAL_GLOBE_ZOOM = 1.35;
const MIN_MAP_ZOOM = 0.5;
const MAPTILER_STYLE_URL = "https://api.maptiler.com/maps/0196a729-51f8-7a04-8b3a-22b8d925ea1b/style.json?key=FelxstvCdS6k0g9YnLdK";
const COUNTRIES_SOURCE_ID = "tripjournal-countries";
const COUNTRIES_FILL_LAYER_ID = "tripjournal-countries-fill";
const COUNTRIES_BORDER_LAYER_ID = "tripjournal-countries-border";
config.WORKER_URL = mapLibreWorkerUrl;

export type MapProps = {
  countriesData: CountriesGeoJson | null;
  selectedCountries: string[];
  viewMode: "globe" | "map";
  userLocation?: { lng: number; lat: number } | null;
  countryStatuses?: Record<string, CountryStatus>;
  visibleStatuses?: Set<CountryStatus | "not-explored">;
  focusCountry?: string | null;
  sizeVariant?: "default" | "compact";
  initialGlobeZoom?: number;
  showGlobeBackdrop?: boolean;
};

const userLocationMarkup = `<div class="user-location-ring user-location-ring-outer"></div><div class="user-location-ring user-location-ring-inner"></div><div class="user-location-dot"></div>`;

const getCountryFillColors = (mode: "globe" | "map"): ExpressionSpecification => mode === "globe"
  ? [
    "match",
    ["get", "tripStatus"],
    "visited", "#CF8D45",
    "want-to-visit-again", "#EAB681",
    "want-to-go", "#7A3F00",
    "#A97A53"
  ]
  : [
    "match",
    ["get", "tripStatus"],
    "visited", "#CF8D45",
    "want-to-visit-again", "#EAB681",
    "want-to-go", "#7A3F00",
    "#A97A53"
  ] as ExpressionSpecification;

const getFilteredCountryFillColors = (mode: "globe" | "map", visibleStatuses?: Set<CountryStatus | "not-explored">): ExpressionSpecification => {
  if (visibleStatuses?.size === 0) return ["literal", "#fffdf9"] as ExpressionSpecification;
  if (!visibleStatuses || visibleStatuses.size === 4) return getCountryFillColors(mode);
  const base = { visited: "#CF8D45", "want-to-visit-again": "#EAB681", "want-to-go": "#7A3F00", "not-explored": "#A97A53" };
  const muted = "#f0eeeb";
  return ["match", ["get", "tripStatus"],
    "visited", visibleStatuses.has("visited") ? base.visited : muted,
    "want-to-visit-again", visibleStatuses.has("want-to-visit-again") ? base["want-to-visit-again"] : muted,
    "want-to-go", visibleStatuses.has("want-to-go") ? base["want-to-go"] : muted,
    visibleStatuses.has("not-explored") ? base["not-explored"] : muted
  ] as ExpressionSpecification;
};

const calculateCountryCenter = (countriesData: CountriesGeoJson | null, countryName: string): [number, number] | null => {
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
  visibleStatuses,
  focusCountry = null,
  sizeVariant = "default",
  initialGlobeZoom = DEFAULT_INITIAL_GLOBE_ZOOM
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const countriesDataRef = useRef(countriesData);
  const selectedCountriesRef = useRef(selectedCountries);
  const countryStatusesRef = useRef(countryStatuses);
  const visibleStatusesRef = useRef(visibleStatuses);
  const userLocationRef = useRef(userLocation ?? null);
  const focusCountryRef = useRef(focusCountry?.trim() || null);
  const viewModeRef = useRef(viewMode);
  const initialGlobeZoomRef = useRef(initialGlobeZoom);
  const lastFocusedCountryRef = useRef<string | null>(null);

  const globeSize = sizeVariant === "compact" ? "min(52vw, 52vh)" : "min(68vw, 68vh)";
  const flatMapWidth = "min(100%, 800px)";
  const flatMapHeight = "min(48vh, 560px)";

  const refreshCountries = useCallback(() => {
    const map = mapRef.current;
    const source = map?.getSource(COUNTRIES_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    const data = countriesDataRef.current;
    if (!data) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    source.setData({
      ...data,
      features: data.features.map((feature) => {
        const countryName = feature.properties?.name?.trim() ?? "";
        const status = countryStatusesRef.current[countryName] ??
          (selectedCountriesRef.current.includes(countryName) ? "visited" : undefined);
        return {
          ...feature,
          properties: { ...feature.properties, tripStatus: status ?? "not-explored" }
        };
      })
    });
  }, []);

  const focusMapOnCountry = (countryName: string) => {
    const map = mapRef.current;
    const center = calculateCountryCenter(countriesDataRef.current, countryName);
    if (!map || !center) return;
    lastFocusedCountryRef.current = countryName;
    map.flyTo({ center: [center[1], center[0]], zoom: viewModeRef.current === "globe" ? 3.8 : 4.2, duration: 900 });
  };

  const addCountryLayers = useCallback((map: MapLibreMap) => {
    if (!map.getSource(COUNTRIES_SOURCE_ID)) {
      map.addSource(COUNTRIES_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
    }
    if (!map.getLayer(COUNTRIES_FILL_LAYER_ID)) {
      map.addLayer({
        id: COUNTRIES_FILL_LAYER_ID,
        type: "fill",
        source: COUNTRIES_SOURCE_ID,
        paint: {
          "fill-color": getFilteredCountryFillColors(viewModeRef.current, visibleStatusesRef.current),
          "fill-opacity": 1
        }
      });
    }
    if (!map.getLayer(COUNTRIES_BORDER_LAYER_ID)) {
      map.addLayer({
        id: COUNTRIES_BORDER_LAYER_ID,
        type: "line",
        source: COUNTRIES_SOURCE_ID,
        paint: {
          "line-color": viewModeRef.current === "globe" ? "#5A392B" : "#234A4D",
          "line-opacity": 0.72,
          "line-width": 1.2
        }
      });
    }
    refreshCountries();
  }, [refreshCountries]);

  const configureGlobeStyle = (map: MapLibreMap) => {
    if (map.getLayer("Background")) {
      map.setPaintProperty("Background", "background-color", "#D6D3CF");
    }
    map.setTerrain(null);
  };

  useEffect(() => {
    initialGlobeZoomRef.current = initialGlobeZoom;
  }, [initialGlobeZoom]);

  useEffect(() => {
    countriesDataRef.current = countriesData;
    selectedCountriesRef.current = selectedCountries;
    countryStatusesRef.current = countryStatuses;
    visibleStatusesRef.current = visibleStatuses;
    focusCountryRef.current = focusCountry?.trim() || null;
    refreshCountries();
    if (focusCountryRef.current && focusCountryRef.current !== lastFocusedCountryRef.current) {
      focusMapOnCountry(focusCountryRef.current);
    }
  }, [countriesData, selectedCountries, countryStatuses, visibleStatuses, focusCountry, refreshCountries]);

  useEffect(() => {
    userLocationRef.current = userLocation ?? null;
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    if (userLocation) {
      const markerElement = document.createElement("div");
      markerElement.className = "user-location-marker";
      markerElement.innerHTML = userLocationMarkup;
      userMarkerRef.current = new Marker({ element: markerElement, anchor: "center" })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
      if (!focusCountryRef.current) {
        map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: Math.max(map.getZoom(), 2.2), duration: 900 });
      }
    } else {
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(COUNTRIES_FILL_LAYER_ID)) {
      map.setPaintProperty(COUNTRIES_FILL_LAYER_ID, "fill-color", getFilteredCountryFillColors(viewMode, visibleStatusesRef.current));
    }
    if (map.getLayer(COUNTRIES_BORDER_LAYER_ID)) {
      map.setPaintProperty(COUNTRIES_BORDER_LAYER_ID, "line-color", viewMode === "globe" ? "#5A392B" : "#234A4D");
    }
    map.setProjection({ type: viewMode === "globe" ? "globe" : "mercator" });
    map.resize();
  }, [viewMode, initialGlobeZoom]);

  useEffect(() => {
    if (!mapContainer.current) return;
    let map: MapLibreMap | null = null;
    let disposed = false;

    const initializeMap = async () => {
      const response = await fetch(MAPTILER_STYLE_URL);
      if (!response.ok) {
        throw new Error(`Map style request failed with status ${response.status}`);
      }

      const style = await response.json() as StyleSpecification;
      delete style.terrain;
      delete (style as StyleSpecification & { fog?: unknown }).fog;

      if (disposed || !mapContainer.current) return;

      map = new MapLibreMap({
        container: mapContainer.current,
        style,
        center: [0, 20],
        zoom: viewModeRef.current === "globe" ? initialGlobeZoomRef.current : 1.15,
        minZoom: MIN_MAP_ZOOM,
        renderWorldCopies: false
      });
      mapRef.current = map;
      map.on("load", () => {
        if (!map) return;
        map.setProjection({ type: viewModeRef.current === "globe" ? "globe" : "mercator" });
        configureGlobeStyle(map);
        addCountryLayers(map);
        if (userLocationRef.current) {
          const markerElement = document.createElement("div");
          markerElement.className = "user-location-marker";
          markerElement.innerHTML = userLocationMarkup;
          userMarkerRef.current = new Marker({ element: markerElement, anchor: "center" })
            .setLngLat([userLocationRef.current.lng, userLocationRef.current.lat])
            .addTo(map);
        }
        if (focusCountryRef.current) focusMapOnCountry(focusCountryRef.current);
      });
      map.on("error", (event: ErrorEvent) => console.error("MapTiler map error", event.error));
    };

    initializeMap().catch((error: unknown) => {
      if (!disposed) console.error("MapTiler map error", error);
    });

    return () => {
      disposed = true;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [addCountryLayers]);

  return (
    <div
      className="map-canvas-shell"
      ref={mapContainer}
      data-view-mode={viewMode}
      style={{
        width: viewMode === "globe" ? globeSize : flatMapWidth,
        height: viewMode === "globe" ? globeSize : flatMapHeight,
        borderRadius: viewMode === "globe" ? "9999px" : "0.85rem"
      }}
    />
  );
};

export default Map;

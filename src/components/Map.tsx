import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import { type CountriesGeoJson } from "../types/countries";
import type { CountryStatus } from "../pages/Home";

const ENV = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const MAPTILER_API_KEY = ENV?.VITE_MAPTILER_API_KEY || "FelxstvCdS6k0g9YnLdK";

const GLOBE_WATER_COLOR      = "#F2DFC4";

// Status colors — from the dropdown/badge screenshots
const COLOR_VISITED            = "#cf8d45";
const COLOR_WANT_RETURN        = "#fabe7d";
const COLOR_TO_BE_VISITED      = "#7a3f00";
const COLOR_NOT_EXPLORED_BADGE = "#694b3d";

const OUTLINE_VISITED            = "#3A1F0A";
const OUTLINE_WANT_RETURN        = "#9A6020";
const OUTLINE_TO_BE_VISITED      = "#4A2000";
const OUTLINE_NOT_EXPLORED_BADGE = "#4A3800";

function resolveStyleUrl(): string | maptilersdk.StyleSpecification | maptilersdk.ReferenceMapStyle {
  const styleEnv = ENV?.VITE_MAPTILER_STYLE_URL || ENV?.VITE_MAPTILER_STYLE_ID;
  if (!styleEnv) return maptilersdk.MapStyle.STREETS;
  
  if (styleEnv.startsWith("http") || styleEnv.includes("/style.json")) {
    const url = new URL(styleEnv.startsWith("http") ? styleEnv : `https://api.maptiler.com/${styleEnv.replace(/^\/+/, "")}`);
    if (url.hostname.includes("maptiler.com") && !url.searchParams.has("key")) url.searchParams.set("key", MAPTILER_API_KEY);
    return url.toString();
  }
  
  return styleEnv as string;
}

const STYLE_URL = resolveStyleUrl();
maptilersdk.config.apiKey = MAPTILER_API_KEY;

const COUNTRY_LAYER_ID        = "tripjournal-country-fill";
const COUNTRY_OUTLINE_LAYER_ID = "tripjournal-country-outline";
const COUNTRY_SOURCE_ID        = "tripjournal-countries-geojson";
const USER_LOCATION_PIN_COLOR  = "#50300d";
const USER_LOCATION_PIN_STROKE = "#eab681";
const DEFAULT_INITIAL_GLOBE_ZOOM = 1.35;
const MIN_GLOBE_ZOOM = 0.5;

const createUserLocationPinElement = () => {
  const marker = document.createElement("div");
  marker.setAttribute("aria-hidden", "true");
  marker.className = "user-location-marker";
  marker.style.setProperty("--user-location-color", USER_LOCATION_PIN_COLOR);
  marker.style.setProperty("--user-location-stroke", USER_LOCATION_PIN_STROKE);
  const ringOuter = document.createElement("div");
  ringOuter.className = "user-location-ring user-location-ring-outer";
  const ringInner = document.createElement("div");
  ringInner.className = "user-location-ring user-location-ring-inner";
  const dot = document.createElement("div");
  dot.className = "user-location-dot";
  marker.appendChild(ringOuter);
  marker.appendChild(ringInner);
  marker.appendChild(dot);
  return marker;
};

const isLocationOnVisibleSide = (center: { lng: number; lat: number }, loc: { lng: number; lat: number }) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi1 = toRad(center.lat), phi2 = toRad(loc.lat);
  const deltaLambda = toRad(loc.lng - center.lng);
  const cosAngle = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) <= Math.PI / 2 + 1e-6;
};

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

const EMPTY_FEATURE_COLLECTION: CountriesGeoJson = { type: "FeatureCollection", features: [] };

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
  const mapContainer   = useRef<HTMLDivElement | null>(null);
  const mapRef         = useRef<maptilersdk.Map | null>(null);
  const countriesDataRef     = useRef<CountriesGeoJson | null>(countriesData);
  const selectedCountriesRef = useRef<string[]>(selectedCountries);
  const countryStatusesRef   = useRef<Record<string, CountryStatus>>(countryStatuses);
  const viewModeRef          = useRef<"globe" | "map">(viewMode);
  const userLocationRef      = useRef<{ lng: number; lat: number } | null>(userLocation ?? null);
  const focusCountryRef      = useRef<string | null>(focusCountry ?? null);
  const userLocationOverlayRef        = useRef<HTMLDivElement | null>(null);
  const hasCenteredOnUserLocationRef  = useRef(false);
  const lastFocusedCountryRef         = useRef<string | null>(null);
  const highlightRefreshFrameRef      = useRef<number | null>(null);
  const initialGlobeZoomRef           = useRef<number>(Math.max(MIN_GLOBE_ZOOM, initialGlobeZoom));
  const showGlobeBackdropRef          = useRef<boolean>(showGlobeBackdrop);

  const globeSize    = sizeVariant === "compact" ? "60vw" : "min(78vw, 78vh)";
  const flatMapWidth  = "min(100%, 800px)";
  const flatMapHeight = "min(48vh, 560px)";

  useEffect(() => { initialGlobeZoomRef.current = Math.max(MIN_GLOBE_ZOOM, initialGlobeZoom); }, [initialGlobeZoom]);
  useEffect(() => { showGlobeBackdropRef.current = showGlobeBackdrop; }, [showGlobeBackdrop]);

  const applyTransparentBackdrop = React.useCallback((map: maptilersdk.Map) => {
    const canvas = map.getCanvas();
    if (!canvas) return;

    canvas.style.backgroundColor = "transparent";
    canvas.style.setProperty("background", "transparent", "important");

    const container = map.getContainer();
    if (container) {
      container.style.background = "transparent";
      container.style.setProperty("background", "transparent", "important");
    }

    const setPropIfChanged = (id: string, type: 'paint' | 'layout', key: string, value: string | number | boolean | null) => {
      try {
        const current = type === 'paint' ? map.getPaintProperty(id, key) : map.getLayoutProperty(id, key);
        if (current === value) return;
        if (type === 'paint') {
          map.setPaintProperty(id, key, value);
        } else {
          map.setLayoutProperty(id, key, value);
        }
      } catch { /* ignore */ }
    };

    try {
      type StyleLayer = { id: string; type: string };
      const layers = (map.getStyle().layers ?? []) as StyleLayer[];
      layers.forEach((layer) => {
        // Never touch our own country highlight layers
        if (layer.id === COUNTRY_LAYER_ID || layer.id === COUNTRY_OUTLINE_LAYER_ID) return;

        const layerId = layer.id.toLowerCase();
        const isGlobe = viewModeRef.current === "globe";
        const showBackdrop = showGlobeBackdropRef.current;

        if (layer.type === "background") {
          if (isGlobe && showBackdrop) {
            setPropIfChanged(layer.id, "paint", "background-opacity", 1);
          } else {
            setPropIfChanged(layer.id, "paint", "background-opacity", 0);
          }
        }

        if (layer.type === "raster") {
          if (isGlobe && showBackdrop) {
            setPropIfChanged(layer.id, "paint", "raster-opacity", 1);
          } else {
            setPropIfChanged(layer.id, "paint", "raster-opacity", 0);
          }
        }

        if (layer.type === "fill" && (layerId.includes("water") || layerId.includes("ocean") || layerId.includes("sea"))) {
          if (isGlobe && showBackdrop) {
            setPropIfChanged(layer.id, "paint", "fill-opacity", 1);
          } else {
            setPropIfChanged(layer.id, "paint", "fill-opacity", 0);
          }
        }

        if (layer.type === "line" && (layerId.includes("water") || layerId.includes("ocean"))) {
          if (isGlobe && showBackdrop) {
            setPropIfChanged(layer.id, "paint", "line-color", GLOBE_WATER_COLOR);
            setPropIfChanged(layer.id, "paint", "line-opacity", 1);
          } else {
            setPropIfChanged(layer.id, "paint", "line-opacity", 0);
          }
        }

        if (layer.type === "sky") {
          setPropIfChanged(layer.id, "layout", "visibility", "none");
        }
      });
    } catch { /* ignore */ }
  }, []);

  const ensureHighlightLayers = React.useCallback((map: maptilersdk.Map) => {
    if (!map.getSource(COUNTRY_SOURCE_ID)) {
      map.addSource(COUNTRY_SOURCE_ID, { type: "geojson", data: EMPTY_FEATURE_COLLECTION });
    }

    const layers = (map.getStyle().layers || []) as maptilersdk.LayerSpecification[];
    let beforeId: string | undefined;
    for (const layer of layers) {
      if (layer.type === "symbol" || (layer.id && layer.id.toLowerCase().includes("label"))) {
        beforeId = layer.id;
        break;
      }
    }

    if (!map.getLayer(COUNTRY_LAYER_ID)) {
      map.addLayer({
        id: COUNTRY_LAYER_ID,
        type: "fill",
        source: COUNTRY_SOURCE_ID,
        paint: {
          "fill-color": [
            "match", ["get", "status"],
            "visited",             COLOR_VISITED,
            "want-to-visit-again", COLOR_WANT_RETURN,
            "want-to-go",          COLOR_TO_BE_VISITED,
            "not-explored",        COLOR_NOT_EXPLORED_BADGE,
            "rgba(0,0,0,0)"  // no-status: fully transparent, show base map
          ],
          "fill-opacity": [
            "match", ["get", "status"],
            "visited",             1.0,
            "want-to-visit-again", 1.0,
            "want-to-go",          1.0,
            "not-explored",        1.0,
            0  // no-status: invisible
          ],
          "fill-outline-color": "rgba(0,0,0,0)"
        }
      }, beforeId);
    }

    if (!map.getLayer(COUNTRY_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: COUNTRY_OUTLINE_LAYER_ID,
        type: "line",
        source: COUNTRY_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": [
            "match", ["get", "status"],
            "visited",             OUTLINE_VISITED,
            "want-to-visit-again", OUTLINE_WANT_RETURN,
            "want-to-go",          OUTLINE_TO_BE_VISITED,
            "not-explored",        OUTLINE_NOT_EXPLORED_BADGE,
            "rgba(0,0,0,0)"
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.9, 3, 1.4, 6, 2.2],
          "line-opacity": [
            "match", ["get", "status"],
            "visited",             0.95,
            "want-to-visit-again", 0.95,
            "want-to-go",          0.95,
            "not-explored",        0.95,
            0
          ],
          "line-blur": 0.12
        }
      }, beforeId);
    }
  }, []);

  const ensureUserLocationOverlay = React.useCallback(() => {
    if (userLocationOverlayRef.current || !mapContainer.current) return;
    const overlay = createUserLocationPinElement();
    overlay.classList.add("user-location-overlay");
    mapContainer.current.appendChild(overlay);
    userLocationOverlayRef.current = overlay;
  }, []);

  const updateUserLocationOverlay = React.useCallback((map: maptilersdk.Map) => {
    const overlay = userLocationOverlayRef.current;
    const location = userLocationRef.current;
    if (!overlay) return;
    if (!location || !map.isStyleLoaded()) {
      overlay.style.opacity = "0";
      overlay.dataset.visible = "false";
      return;
    }
    let visible = true;
    try {
      if (viewModeRef.current === "globe") {
        const center = map.getCenter();
        visible = isLocationOnVisibleSide(center, location);
      }
    } catch {
      visible = true;
    }
    if (!visible) {
      overlay.style.opacity = "0";
      overlay.dataset.visible = "false";
      return;
    }
    const point = map.project([location.lng, location.lat]);
    overlay.style.opacity = "1";
    overlay.style.left = `${point.x}px`;
    overlay.style.top = `${point.y}px`;
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.dataset.visible = "true";
  }, []);

  const syncUserLocationOverlay = React.useCallback((map: maptilersdk.Map) => {
    ensureUserLocationOverlay();
    updateUserLocationOverlay(map);
    const location = userLocationRef.current;
    if (!location || hasCenteredOnUserLocationRef.current) return;
    hasCenteredOnUserLocationRef.current = true;
    map.easeTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 2.2), duration: 900, essential: true });
  }, [ensureUserLocationOverlay, updateUserLocationOverlay]);

  const syncHighlightedCountries = React.useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    ensureHighlightLayers(map);
    const source = map.getSource(COUNTRY_SOURCE_ID);
    if (!source || !("setData" in source)) return;
    // Only include countries that have an explicit status assigned
    const statusMap = countryStatusesRef.current;
    const highlightedFeatures =
      countriesDataRef.current?.features.map((feature) => {
        const countryName = feature.properties?.name?.trim() ?? "";
        const geometry = feature.geometry;
        if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return null;
        if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return null;
        const status = statusMap[countryName];
        // Pass status as-is if set, otherwise "no-status" so fill-opacity expression hides it
        return {
          ...feature,
          properties: { ...feature.properties, status: status ?? "no-status" }
        };
      }).filter((f): f is typeof f & object => f !== null) ?? [];

    (source as maptilersdk.GeoJSONSource).setData({ type: "FeatureCollection", features: highlightedFeatures });

  }, [ensureHighlightLayers]);

  const scheduleHighlightRefresh = React.useCallback(() => {
    if (highlightRefreshFrameRef.current !== null) window.cancelAnimationFrame(highlightRefreshFrameRef.current);
    highlightRefreshFrameRef.current = window.requestAnimationFrame(() => {
      highlightRefreshFrameRef.current = null;
      syncHighlightedCountries();
    });
  }, [syncHighlightedCountries]);

  const calculateCountryCenter = React.useCallback((countryName: string): [number, number] | null => {
    const normalizedName = countryName.trim();
    if (!normalizedName || !countriesDataRef.current) return null;
    let lngSum = 0, latSum = 0, pointCount = 0;
    const accumulateRing = (ring: number[][]) => {
      ring.forEach((pair) => {
        const lng = pair?.[0], lat = pair?.[1];
        if (typeof lng !== "number" || typeof lat !== "number") return;
        lngSum += lng; latSum += lat; pointCount += 1;
      });
    };
    countriesDataRef.current.features.forEach((feature) => {
      if ((feature.properties?.name?.trim() ?? "") !== normalizedName) return;
      const geometry = feature.geometry;
      if (!geometry) return;
      if (geometry.type === "Polygon") { accumulateRing(geometry.coordinates[0] ?? []); return; }
      if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((p) => accumulateRing(p[0] ?? []));
    });
    if (pointCount === 0) return null;
    return [lngSum / pointCount, latSum / pointCount];
  }, []);

  const centerMapOnCountry = React.useCallback((map: maptilersdk.Map, countryName: string) => {
    const center = calculateCountryCenter(countryName);
    if (!center) return;
    map.easeTo({ center, zoom: viewModeRef.current === "globe" ? 3.8 : 4.2, pitch: 0, duration: 900, essential: true });
  }, [calculateCountryCenter]);

  useEffect(() => {
    const oldMode = viewModeRef.current;
    viewModeRef.current = viewMode;
    const map = mapRef.current;
    if (!map) return;

    if (oldMode !== viewMode) {
      if (viewMode === "globe") {
        try { map.setProjection("globe"); } catch { /* ignore */ }
        map.jumpTo({ center: [0, 20], zoom: initialGlobeZoomRef.current, pitch: 0, bearing: 0 });
      } else {
        try { map.setProjection("mercator"); } catch { /* ignore */ }
      }
    }
    map.once('styledata', () => applyTransparentBackdrop(map));
    map.resize();
    map.triggerRepaint();
  }, [viewMode, applyTransparentBackdrop]);

  useEffect(() => {
    focusCountryRef.current = focusCountry?.trim() || null;
    const map = mapRef.current;
    const countryToFocus = focusCountryRef.current;
    if (!map || !countryToFocus) return;
    const focusIfReady = () => {
      if (!map.isStyleLoaded() || lastFocusedCountryRef.current === countryToFocus) return;
      lastFocusedCountryRef.current = countryToFocus;
      centerMapOnCountry(map, countryToFocus);
    };
    focusIfReady();
    map.once("idle", focusIfReady);
  }, [focusCountry, countriesData, viewMode, centerMapOnCountry]);

  useEffect(() => {
    countriesDataRef.current = countriesData;
    selectedCountriesRef.current = selectedCountries;
    countryStatusesRef.current = countryStatuses;
    focusCountryRef.current = focusCountry?.trim() || null;
    scheduleHighlightRefresh();
    const map = mapRef.current;
    if (map) { map.resize(); map.triggerRepaint(); }
  }, [countriesData, selectedCountries, countryStatuses, focusCountry, scheduleHighlightRefresh]);

  useEffect(() => {
    userLocationRef.current = userLocation ?? null;
    const map = mapRef.current;
    if (map) syncUserLocationOverlay(map);
  }, [userLocation, syncUserLocationOverlay]);

  useEffect(() => {
    if (!mapContainer.current) return;
    let animationFrameId = 0, lastFrameTime = 0;
    let isUserInteracting = false;
    const rotationSpeedDegPerSec = 1.2;

    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      canvasContextAttributes: { alpha: true },
      terrain: false,
      projection: viewModeRef.current === "globe" ? "globe" : "mercator",
      center: [0, 20],
      zoom: viewModeRef.current === "globe" ? initialGlobeZoomRef.current : 1.15,
      minZoom: 0,
      renderWorldCopies: false,
      pitch: 0,
      navigationControl: false,
      geolocateControl: false,
      scaleControl: false,
      terrainControl: false,
      fullscreenControl: false,
      maptilerLogo: false,
      forceNoAttributionControl: true
    });

    mapRef.current = map;

    const animateRotation = (timestamp: number) => {
      if (!lastFrameTime) lastFrameTime = timestamp;
      const deltaSeconds = (timestamp - lastFrameTime) / 1000;
      lastFrameTime = timestamp;
      
      if (isUserInteracting || Boolean(userLocationRef.current) || Boolean(focusCountryRef.current) || viewModeRef.current !== "globe" || document.hidden) {
        animationFrameId = window.requestAnimationFrame(animateRotation);
        return;
      }

      const center = map.getCenter();
      const nextLng = (((center.lng - deltaSeconds * rotationSpeedDegPerSec) + 540) % 360) - 180;
      map.setCenter([nextLng, center.lat]);
      animationFrameId = window.requestAnimationFrame(animateRotation);
    };

    map.on("load", () => {
      try {
        const canvasEl = map.getCanvas();
        canvasEl.style.mixBlendMode = "multiply";
        canvasEl.style.background = "transparent";
        canvasEl.style.backgroundColor = "transparent";
      } catch { /* ignore */ }

      if (viewModeRef.current === "globe") map.jumpTo({ center: [0, 20], zoom: initialGlobeZoomRef.current, pitch: 0, bearing: 0 });

      map.resize();
      map.triggerRepaint();
      applyTransparentBackdrop(map);

      // try { map.setFog(null); } catch { /* ignore */ }
      try { map.setTerrain(null); } catch { /* ignore */ }

      const gl =
        (map.getCanvas().getContext("webgl2", { alpha: true }) as WebGL2RenderingContext | null) ??
        (map.getCanvas().getContext("webgl", { alpha: true }) as WebGLRenderingContext | null);
      if (gl) gl.clearColor(0, 0, 0, 0);

      ensureHighlightLayers(map);
      syncUserLocationOverlay(map);
      scheduleHighlightRefresh();

      if (focusCountryRef.current) {
        centerMapOnCountry(map, focusCountryRef.current);
        lastFocusedCountryRef.current = focusCountryRef.current;
      }

      map.on("styledata", () => {
        if (!map.isStyleLoaded()) return;
        applyTransparentBackdrop(map);
        ensureHighlightLayers(map);
        syncUserLocationOverlay(map);
        scheduleHighlightRefresh();
      });

      map.on("render", () => {
        if (gl) gl.clearColor(0, 0, 0, 0);
        updateUserLocationOverlay(map);
      });

      map.once("idle", () => { scheduleHighlightRefresh(); });
      map.on("dragstart",  () => { isUserInteracting = true; });
      map.on("dragend",    () => { isUserInteracting = false; });
      map.on("touchstart", () => { isUserInteracting = true; });
      map.on("touchend",   () => { isUserInteracting = false; });

      animationFrameId = window.requestAnimationFrame(animateRotation);
    });

    return () => {
      if (highlightRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(highlightRefreshFrameRef.current);
      }
      window.cancelAnimationFrame(animationFrameId);
      userLocationOverlayRef.current?.remove();
      userLocationOverlayRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [applyTransparentBackdrop, centerMapOnCountry, ensureHighlightLayers, scheduleHighlightRefresh, syncUserLocationOverlay, updateUserLocationOverlay]);

  return (
    <div
      className="map-canvas-shell"
      ref={mapContainer}
      data-view-mode={viewMode}
      style={{
        background: "transparent",
        backgroundColor: "transparent",
        width:  viewMode === "globe" ? globeSize : flatMapWidth,
        height: viewMode === "globe" ? globeSize : flatMapHeight,
        borderRadius: viewMode === "globe" ? "9999px" : "0.85rem",
      }}
    />
  );
};

export default Map;

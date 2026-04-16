import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import { type CountriesGeoJson } from "../types/countries";

const ENV = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const MAPTILER_API_KEY =
  ENV?.VITE_MAPTILER_API_KEY ?? "FelxstvCdS6k0g9YnLdK";

const MAPTILER_STYLE_ID =
  ENV?.VITE_MAPTILER_STYLE_ID ?? "0196a729-51f8-7a04-8b3a-22b8d925ea1b";

const MAPTILER_STYLE_URL = ENV?.VITE_MAPTILER_STYLE_URL;
const GLOBE_BACKGROUND_COLOR = "#FFEAD4";
const GLOBE_WATER_COLOR = "#FFEAD4";
const FALLBACK_STYLE_ID = "0196a729-51f8-7a04-8b3a-22b8d925ea1b";
const DEFAULT_STYLE_URL = `https://api.maptiler.com/maps/${FALLBACK_STYLE_ID}/style.json?key=${MAPTILER_API_KEY}`;

const resolveStyleUrl = () => {
  const normalizeMaptilerUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // Convert share/dashboard URLs into API style.json endpoints.
      if ((host === "cloud.maptiler.com" || host.endsWith(".maptiler.com")) && !parsed.pathname.endsWith("/style.json")) {
        const mapsMatch = parsed.pathname.match(/\/maps\/([^/?#]+)/i);
        const styleId = mapsMatch?.[1];
        if (styleId) {
          return `https://api.maptiler.com/maps/${styleId}/style.json`;
        }
      }

      // Convert API map URLs without /style.json into style URLs.
      if (host === "api.maptiler.com") {
        const apiMapsMatch = parsed.pathname.match(/^\/maps\/([^/?#]+)\/?$/i);
        if (apiMapsMatch?.[1]) {
          return `https://api.maptiler.com/maps/${apiMapsMatch[1]}/style.json`;
        }
      }

      return url;
    } catch {
      return url;
    }
  };

  const appendKeyIfNeeded = (url: string) => {
    if (!MAPTILER_API_KEY || !url.includes("api.maptiler.com") || url.includes("key=")) {
      return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}key=${MAPTILER_API_KEY}`;
  };

  const configuredStyle = (MAPTILER_STYLE_URL?.trim() || MAPTILER_STYLE_ID.trim()).replace(/^['"]|['"]$/g, "");

  if (!configuredStyle) {
    return DEFAULT_STYLE_URL;
  }

  // Human-readable style names (e.g. "Streets Default v2") are not valid style IDs/URLs.
  if (configuredStyle.includes(" ")) {
    return DEFAULT_STYLE_URL;
  }

  const toSafeUrl = (candidate: string) => {
    try {
      const parsed = new URL(candidate);
      if (!parsed.pathname.includes("/style.json")) {
        return DEFAULT_STYLE_URL;
      }
      return candidate;
    } catch {
      return DEFAULT_STYLE_URL;
    }
  };

  if (configuredStyle.startsWith("http://") || configuredStyle.startsWith("https://")) {
    return toSafeUrl(appendKeyIfNeeded(normalizeMaptilerUrl(configuredStyle)));
  }

  if (configuredStyle.includes("/style.json")) {
    return toSafeUrl(appendKeyIfNeeded(`https://api.maptiler.com/${configuredStyle.replace(/^\/+/, "")}`));
  }

  return toSafeUrl(`https://api.maptiler.com/maps/${encodeURIComponent(configuredStyle)}/style.json?key=${MAPTILER_API_KEY}`);
};

const STYLE_URL = resolveStyleUrl();

maptilersdk.config.apiKey = MAPTILER_API_KEY;

const COUNTRY_LAYER_ID = "tripjournal-country-fill";
const COUNTRY_OUTLINE_LAYER_ID = "tripjournal-country-outline";
const COUNTRY_SOURCE_ID = "tripjournal-countries-geojson";
const USER_LOCATION_PIN_COLOR = "#50300d";
const USER_LOCATION_PIN_STROKE = "#eab681";

type MapProps = {
  countriesData: CountriesGeoJson | null;
  selectedCountries: string[];
  viewMode: "globe" | "map";
  userLocation?: { lng: number; lat: number } | null;
};

const EMPTY_FEATURE_COLLECTION: CountriesGeoJson = {
  type: "FeatureCollection",
  features: []
};

const Map: React.FC<MapProps> = ({
  countriesData,
  selectedCountries,
  viewMode,
  userLocation
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const countriesDataRef = useRef<CountriesGeoJson | null>(countriesData);
  const selectedCountriesRef = useRef<string[]>(selectedCountries);
  const viewModeRef = useRef<"globe" | "map">(viewMode);
  const userLocationRef = useRef<{ lng: number; lat: number } | null>(userLocation ?? null);
  const userLocationMarkerRef = useRef<maptilersdk.Marker | null>(null);
  const hasCenteredOnUserLocationRef = useRef(false);
  const highlightRefreshFrameRef = useRef<number | null>(null);

  const globeSize = "min(82vw, 82vh)";
  const flatMapWidth = "min(95vw, 1400px)";
  const flatMapHeight = "min(48vh, 560px)";

  const applyTransparentBackdrop = (map: maptilersdk.Map) => {
    const globeBackdrop = viewModeRef.current === "globe" ? GLOBE_BACKGROUND_COLOR : "transparent";
    const canvas = map.getCanvas();
    canvas.style.backgroundColor = globeBackdrop;
    canvas.style.setProperty("background", globeBackdrop, "important");
    map.getContainer().style.background = globeBackdrop;
    map.getContainer().style.setProperty("background", globeBackdrop, "important");

    // Fog mutations on globe projection are noisy in current SDK versions and can trigger warnings.

    try {
      map.getStyle().layers?.forEach((layer) => {
        if (layer.type === "background") {
          if (viewModeRef.current === "globe") {
            map.setLayoutProperty(layer.id, "visibility", "visible");
            map.setPaintProperty(layer.id, "background-color", GLOBE_BACKGROUND_COLOR);
            map.setPaintProperty(layer.id, "background-opacity", 1);
          } else {
            map.setLayoutProperty(layer.id, "visibility", "none");
            map.setPaintProperty(layer.id, "background-color", "rgba(0, 0, 0, 0)");
            map.setPaintProperty(layer.id, "background-opacity", 0);
          }
        }

        const layerId = layer.id.toLowerCase();
        if (layerId.includes("background")) {
          try {
            map.setLayoutProperty(layer.id, "visibility", viewModeRef.current === "globe" ? "visible" : "none");
          } catch {
            // Ignore layout mutations for incompatible layer definitions.
          }
        }

        if (layerId.includes("water") || layerId.includes("ocean") || layerId.includes("sea")) {
          try {
            if (layer.type === "fill") {
              if (viewModeRef.current === "globe") {
                map.setPaintProperty(layer.id, "fill-color", GLOBE_WATER_COLOR);
                map.setPaintProperty(layer.id, "fill-opacity", 1);
              } else {
                map.setPaintProperty(layer.id, "fill-color", "rgba(0, 0, 0, 0)");
                map.setPaintProperty(layer.id, "fill-opacity", 0);
              }
            }

            if (layer.type === "line") {
              if (viewModeRef.current === "globe") {
                map.setPaintProperty(layer.id, "line-color", GLOBE_WATER_COLOR);
                map.setPaintProperty(layer.id, "line-opacity", 1);
              } else {
                map.setPaintProperty(layer.id, "line-opacity", 0);
              }
            }

            if (layer.type === "raster") {
              if (viewModeRef.current === "globe") {
                map.setPaintProperty(layer.id, "raster-opacity", 1);
                map.setPaintProperty(layer.id, "raster-saturation", -0.35);
                map.setPaintProperty(layer.id, "raster-brightness-min", 0.78);
                map.setPaintProperty(layer.id, "raster-brightness-max", 0.9);
              } else {
                map.setPaintProperty(layer.id, "raster-opacity", 0);
              }
            }
          } catch {
            // Ignore paint mutations for layers that don't expose the expected properties.
          }
        }

        const maybeSkyLayer = layer as { id: string; type?: string };
        if (maybeSkyLayer.type === "sky") {
          map.setLayoutProperty(maybeSkyLayer.id, "visibility", "none");
        }
      });
    } catch {
      // Ignore style mutation failures while style is still changing.
    }
  };

  const ensureHighlightLayers = (map: maptilersdk.Map) => {
    if (!map.getSource(COUNTRY_SOURCE_ID)) {
      map.addSource(COUNTRY_SOURCE_ID, {
        type: "geojson",
        data: EMPTY_FEATURE_COLLECTION
      });
    }

    if (!map.getLayer(COUNTRY_LAYER_ID)) {
      map.addLayer({
        id: COUNTRY_LAYER_ID,
        type: "fill",
        source: COUNTRY_SOURCE_ID,
        paint: {
          "fill-color": "#e96f4a",
          "fill-opacity": 0.72,
          "fill-outline-color": "rgba(0, 0, 0, 0)"
        }
      });
    }

    if (!map.getLayer(COUNTRY_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: COUNTRY_OUTLINE_LAYER_ID,
        type: "line",
        source: COUNTRY_SOURCE_ID,
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#ffd9b0",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.9, 3, 1.4, 6, 2.2],
          "line-opacity": 0.95,
          "line-blur": 0.12
        }
      });
    }
  };

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

  const syncUserLocationMarker = (map: maptilersdk.Map) => {
    if (!map.isStyleLoaded()) {
      return;
    }

    const location = userLocationRef.current;
    if (!location) {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      hasCenteredOnUserLocationRef.current = false;
      return;
    }

    if (!userLocationMarkerRef.current) {
      userLocationMarkerRef.current = new maptilersdk.Marker({
        element: createUserLocationPinElement(),
        anchor: "center"
      });
      userLocationMarkerRef.current.setLngLat([location.lng, location.lat]).addTo(map);
    } else {
      userLocationMarkerRef.current.setLngLat([location.lng, location.lat]);
    }

    if (!hasCenteredOnUserLocationRef.current) {
      map.easeTo({
        center: [location.lng, location.lat],
        zoom: Math.max(map.getZoom(), 2.2),
        duration: 900,
        essential: true
      });
      hasCenteredOnUserLocationRef.current = true;
    }
  };

  const syncHighlightedCountries = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    ensureHighlightLayers(map);

    const source = map.getSource(COUNTRY_SOURCE_ID);
    if (!source || !("setData" in source)) {
      return;
    }

    const selectedCountrySet = new Set(
      selectedCountriesRef.current.map((country) => country.trim()).filter((country) => country.length > 0)
    );

    const highlightedFeatures =
      countriesDataRef.current?.features.filter((feature) => {
        if (!selectedCountrySet.has(feature.properties?.name?.trim() ?? "")) {
          return false;
        }

        const geometry = feature.geometry;
        if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
          return false;
        }

        return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
      }) ?? [];

    (source as { setData: (data: unknown) => void }).setData({
      type: "FeatureCollection",
      features: highlightedFeatures
    });

    try {
      map.moveLayer(COUNTRY_LAYER_ID);
      map.moveLayer(COUNTRY_OUTLINE_LAYER_ID);
    } catch {
      // Layer ordering can fail transiently during style updates.
    }
  };

  const scheduleHighlightRefresh = () => {
    if (highlightRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightRefreshFrameRef.current);
    }

    highlightRefreshFrameRef.current = window.requestAnimationFrame(() => {
      highlightRefreshFrameRef.current = null;
      syncHighlightedCountries();
    });
  };

  useEffect(() => {
    viewModeRef.current = viewMode;

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const applyViewModeProjection = () => {
      if (viewMode === "globe") {
        try {
          (map as unknown as { setProjection?: (projection: string) => void }).setProjection?.("globe");
        } catch {
          // Ignore projection API issues on older SDK/runtime combinations.
        }

        map.jumpTo({
          center: [0, 20],
          zoom: 1.35,
          pitch: 0
        });
      } else {
        try {
          (map as unknown as { setProjection?: (projection: string) => void }).setProjection?.("mercator");
        } catch {
          // Ignore projection API issues on older SDK/runtime combinations.
        }
      }

      // Re-apply style mutations on every mode switch so water visibility is deterministic.
      applyTransparentBackdrop(map);
      map.resize();
      map.triggerRepaint();
    };

    applyViewModeProjection();
  }, [viewMode]);

  useEffect(() => {
    countriesDataRef.current = countriesData;
    selectedCountriesRef.current = selectedCountries;
    scheduleHighlightRefresh();

    const map = mapRef.current;
    if (map) {
      map.resize();
      map.triggerRepaint();
    }
  }, [countriesData, selectedCountries]);

  useEffect(() => {
    userLocationRef.current = userLocation ?? null;

    const map = mapRef.current;
    if (map) {
      syncUserLocationMarker(map);
    }
  }, [userLocation]);

  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }

    let animationFrameId = 0;
    let lastFrameTime = 0;
    let isUserInteracting = false;
    const rotationSpeedDegPerSec = 1.2;

    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      canvasContextAttributes: {
        alpha: true
      },
      projection: viewModeRef.current === "globe" ? "globe" : "mercator",
      center: [0, 20],
      zoom: viewModeRef.current === "globe" ? 1.35 : 1.15,
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
      if (!lastFrameTime) {
        lastFrameTime = timestamp;
      }

      const deltaSeconds = (timestamp - lastFrameTime) / 1000;
      lastFrameTime = timestamp;

      const hasUserLocation = Boolean(userLocationRef.current);

      if (isUserInteracting || hasUserLocation || viewModeRef.current !== "globe") {
        animationFrameId = window.requestAnimationFrame(animateRotation);
        return;
      }

      const center = map.getCenter();
      const nextLng = (((center.lng - deltaSeconds * rotationSpeedDegPerSec) + 540) % 360) - 180;
      map.setCenter([nextLng, center.lat]);
      animationFrameId = window.requestAnimationFrame(animateRotation);
    };

    map.on("load", () => {
      if (viewModeRef.current === "globe") {
        map.jumpTo({
          center: [0, 20],
          zoom: 1.35,
          pitch: 0
        });
      }

      map.resize();
      map.triggerRepaint();

      applyTransparentBackdrop(map);

      try {
        (map as unknown as { setFog?: (fog: null) => void }).setFog?.(null);
      } catch {
        // Ignore fog API differences across SDK/runtime versions.
      }

      try {
        (map as unknown as { setTerrain?: (terrain: null) => void }).setTerrain?.(null);
      } catch {
        // Ignore terrain API differences across SDK/runtime versions.
      }

      const gl =
        (map.getCanvas().getContext("webgl2", { alpha: true }) as WebGL2RenderingContext | null) ??
        (map.getCanvas().getContext("webgl", { alpha: true }) as WebGLRenderingContext | null);

      if (gl) {
        gl.clearColor(0, 0, 0, 0);
      }

      ensureHighlightLayers(map);
      syncUserLocationMarker(map);
      scheduleHighlightRefresh();

      map.on("styledata", () => {
        if (!map.isStyleLoaded()) {
          return;
        }

        applyTransparentBackdrop(map);

        try {
          (map as unknown as { setFog?: (fog: null) => void }).setFog?.(null);
        } catch {
          // Ignore fog API differences across SDK/runtime versions.
        }

        try {
          (map as unknown as { setTerrain?: (terrain: null) => void }).setTerrain?.(null);
        } catch {
          // Ignore terrain API differences across SDK/runtime versions.
        }

        ensureHighlightLayers(map);
        syncUserLocationMarker(map);
        scheduleHighlightRefresh();
      });

      map.on("render", () => {
        if (gl) {
          gl.clearColor(0, 0, 0, 0);
        }
      });

      map.once("idle", () => {
        scheduleHighlightRefresh();
      });

      map.on("dragstart", () => {
        isUserInteracting = true;
      });

      map.on("dragend", () => {
        isUserInteracting = false;
      });

      map.on("touchstart", () => {
        isUserInteracting = true;
      });

      map.on("touchend", () => {
        isUserInteracting = false;
      });

      animationFrameId = window.requestAnimationFrame(animateRotation);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      map.remove();
    };
  }, []);

  return (
    <div
      className="map-canvas-shell"
      ref={mapContainer}
      data-view-mode={viewMode}
      style={{
        background: viewMode === "globe" ? GLOBE_BACKGROUND_COLOR : "transparent",
        width: viewMode === "globe" ? globeSize : flatMapWidth,
        height: viewMode === "globe" ? globeSize : flatMapHeight,
        borderRadius: viewMode === "globe" ? "9999px" : "0.85rem",
        alignSelf: "center",
        transform: "translateY(0)"
      }}
    />
  );
};

export default Map;

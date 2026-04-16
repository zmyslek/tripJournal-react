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
const DEFAULT_STYLE_URL = `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_API_KEY}`;

const resolveStyleUrl = () => {
  const normalizeMaptilerUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // Convert share/dashboard URLs into API style.json endpoints.
      if ((host === "cloud.maptiler.com" || host.endsWith(".maptiler.com")) && !parsed.pathname.endsWith("/style.json")) {
        const mapsMatch = parsed.pathname.match(/\/maps\/([^\/?#]+)/i);
        const styleId = mapsMatch?.[1];
        if (styleId) {
          return `https://api.maptiler.com/maps/${styleId}/style.json`;
        }
      }

      // Convert API map URLs without /style.json into style URLs.
      if (host === "api.maptiler.com") {
        const apiMapsMatch = parsed.pathname.match(/^\/maps\/([^\/?#]+)\/?$/i);
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

  const configuredStyle = (MAPTILER_STYLE_URL?.trim() || MAPTILER_STYLE_ID.trim()).replace(/^['\"]|['\"]$/g, "");

  if (!configuredStyle) {
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

  return toSafeUrl(`https://api.maptiler.com/maps/${configuredStyle}/style.json?key=${MAPTILER_API_KEY}`);
};

const STYLE_URL = resolveStyleUrl();

maptilersdk.config.apiKey = MAPTILER_API_KEY;

const COUNTRY_LAYER_ID = "tripjournal-country-fill";
const COUNTRY_OUTLINE_LAYER_ID = "tripjournal-country-outline";
const COUNTRY_SOURCE_ID = "tripjournal-countries-geojson";
const USER_LOCATION_SOURCE_ID = "tripjournal-user-location";
const USER_LOCATION_DOT_LAYER_ID = "tripjournal-user-location-dot";
const USER_LOCATION_RING_LAYER_ID = "tripjournal-user-location-ring";

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
  const highlightRefreshFrameRef = useRef<number | null>(null);

  const globeSize = "min(82vw, 82vh)";
  const flatMapWidth = "min(95vw, 1400px)";
  const flatMapHeight = "min(48vh, 560px)";

  const applyTransparentBackdrop = (map: maptilersdk.Map) => {
    const canvas = map.getCanvas();
    canvas.style.backgroundColor = "transparent";
    canvas.style.setProperty("background", "transparent", "important");
    map.getContainer().style.background = "transparent";
    map.getContainer().style.setProperty("background", "transparent", "important");

    // Fog mutations on globe projection are noisy in current SDK versions and can trigger warnings.

    try {
      map.getStyle().layers?.forEach((layer) => {
        if (layer.type === "background") {
          map.setLayoutProperty(layer.id, "visibility", "none");
          map.setPaintProperty(layer.id, "background-color", "rgba(0, 0, 0, 0)");
          map.setPaintProperty(layer.id, "background-opacity", 0);
        }

        const layerId = layer.id.toLowerCase();
        if (layerId.includes("background")) {
          try {
            map.setLayoutProperty(layer.id, "visibility", "none");
          } catch {
            // Ignore layout mutations for incompatible layer definitions.
          }
        }

        if (layerId.includes("water") || layerId.includes("ocean") || layerId.includes("sea")) {
          try {
            if (layer.type === "fill") {
              if (viewModeRef.current === "globe") {
                map.setPaintProperty(layer.id, "fill-color", GLOBE_BACKGROUND_COLOR);
                map.setPaintProperty(layer.id, "fill-opacity", 1);
              } else {
                map.setPaintProperty(layer.id, "fill-color", "rgba(0, 0, 0, 0)");
                map.setPaintProperty(layer.id, "fill-opacity", 0);
              }
            }

            if (layer.type === "line") {
              if (viewModeRef.current === "globe") {
                map.setPaintProperty(layer.id, "line-color", GLOBE_BACKGROUND_COLOR);
                map.setPaintProperty(layer.id, "line-opacity", 1);
              } else {
                map.setPaintProperty(layer.id, "line-opacity", 0);
              }
            }

            if (layer.type === "raster") {
              if (viewModeRef.current === "globe") {
                map.setPaintProperty(layer.id, "raster-opacity", 1);
                map.setPaintProperty(layer.id, "raster-saturation", -1);
                map.setPaintProperty(layer.id, "raster-brightness-min", 0.92);
                map.setPaintProperty(layer.id, "raster-brightness-max", 0.96);
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
          "fill-outline-color": "#ffd9b0"
        }
      });
    }

    if (!map.getLayer(COUNTRY_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: COUNTRY_OUTLINE_LAYER_ID,
        type: "line",
        source: COUNTRY_SOURCE_ID,
        paint: {
          "line-color": "#ffd9b0",
          "line-width": 1.8
        }
      });
    }
  };

  const syncUserLocationMarker = (map: maptilersdk.Map) => {
    if (!map.isStyleLoaded()) {
      return;
    }

    if (!map.getSource(USER_LOCATION_SOURCE_ID)) {
      map.addSource(USER_LOCATION_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });
    }

    if (!map.getLayer(USER_LOCATION_RING_LAYER_ID)) {
      map.addLayer({
        id: USER_LOCATION_RING_LAYER_ID,
        type: "circle",
        source: USER_LOCATION_SOURCE_ID,
        paint: {
          "circle-radius": 10,
          "circle-color": "rgba(255, 224, 194, 0.28)",
          "circle-stroke-color": "#ffd9b0",
          "circle-stroke-width": 2
        }
      });
    }

    if (!map.getLayer(USER_LOCATION_DOT_LAYER_ID)) {
      map.addLayer({
        id: USER_LOCATION_DOT_LAYER_ID,
        type: "circle",
        source: USER_LOCATION_SOURCE_ID,
        paint: {
          "circle-radius": 5,
          "circle-color": "#e96f4a",
          "circle-stroke-color": "#ffd9b0",
          "circle-stroke-width": 1.5
        }
      });
    }

    const source = map.getSource(USER_LOCATION_SOURCE_ID);
    if (!source || !("setData" in source)) {
      return;
    }

    const location = userLocationRef.current;
    if (!location) {
      (source as { setData: (data: unknown) => void }).setData({
        type: "FeatureCollection",
        features: []
      });
      return;
    }

    (source as { setData: (data: unknown) => void }).setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [location.lng, location.lat]
          }
        }
      ]
    });

    try {
      map.moveLayer(USER_LOCATION_RING_LAYER_ID);
      map.moveLayer(USER_LOCATION_DOT_LAYER_ID);
    } catch {
      // Ignore transient layer ordering errors during style refresh.
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
      countriesDataRef.current?.features.filter((feature) => selectedCountrySet.has(feature.properties?.name?.trim() ?? "")) ?? [];

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
      zoom: viewModeRef.current === "globe" ? 1 : 1.15,
      pitch: viewModeRef.current === "globe" ? 20 : 0,
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

      if (isUserInteracting || viewModeRef.current !== "globe") {
        animationFrameId = window.requestAnimationFrame(animateRotation);
        return;
      }

      const center = map.getCenter();
      const nextLng = (((center.lng - deltaSeconds * rotationSpeedDegPerSec) + 540) % 360) - 180;
      map.setCenter([nextLng, center.lat]);
      animationFrameId = window.requestAnimationFrame(animateRotation);
    };

    map.on("load", () => {
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

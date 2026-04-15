import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { type CountriesGeoJson } from "../types/countries";

const STYLE_URL =
  "https://api.maptiler.com/maps/0196a729-51f8-7a04-8b3a-22b8d925ea1b/style.json?key=FelxstvCdS6k0g9YnLdK";

const COUNTRY_LAYER_ID = "tripjournal-country-fill";
const COUNTRY_OUTLINE_LAYER_ID = "tripjournal-country-outline";
const COUNTRY_SOURCE_ID = "tripjournal-countries-geojson";

type MapProps = {
  countriesData: CountriesGeoJson | null;
  selectedCountries: string[];
  viewMode: "globe" | "map";
};

const EMPTY_FEATURE_COLLECTION: CountriesGeoJson = {
  type: "FeatureCollection",
  features: []
};

const buildSelectedFilter = (selectedCountries: string[]) => {
  const normalizedCountries = selectedCountries
    .map((country) => country.trim())
    .filter((country) => country.length > 0);

  if (normalizedCountries.length === 0) {
    return ["==", "name", "__tripjournal_no_match__"];
  }

  return ["in", "name", ...normalizedCountries];
};

const Map: React.FC<MapProps> = ({ countriesData, selectedCountries, viewMode }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const countriesDataRef = useRef<CountriesGeoJson | null>(countriesData);
  const selectedCountriesRef = useRef<string[]>(selectedCountries);
  const viewModeRef = useRef<"globe" | "map">(viewMode);

  const globeSize = "min(70vw, 70vh)";
  const flatMapWidth = "min(78vw, 1100px)";
  const flatMapHeight = "min(48vh, 560px)";

  const rebuildHighlightLayers = (map: maptilersdk.Map) => {
    if (map.getLayer(COUNTRY_OUTLINE_LAYER_ID)) {
      map.removeLayer(COUNTRY_OUTLINE_LAYER_ID);
    }

    if (map.getLayer(COUNTRY_LAYER_ID)) {
      map.removeLayer(COUNTRY_LAYER_ID);
    }

    if (map.getSource(COUNTRY_SOURCE_ID)) {
      map.removeSource(COUNTRY_SOURCE_ID);
    }

    map.addSource(COUNTRY_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_FEATURE_COLLECTION
    });

    map.addLayer({
      id: COUNTRY_LAYER_ID,
      type: "fill",
      source: COUNTRY_SOURCE_ID,
      paint: {
        "fill-color": "#e96f4a",
        "fill-opacity": 0.72,
        "fill-outline-color": "#fff4e6"
      }
    });

    map.addLayer({
      id: COUNTRY_OUTLINE_LAYER_ID,
      type: "line",
      source: COUNTRY_SOURCE_ID,
      paint: {
        "line-color": "#fff4e6",
        "line-width": 1.8
      }
    });
  };

  const updateHighlightedCountries = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    rebuildHighlightLayers(map);

    const source = map.getSource(COUNTRY_SOURCE_ID);
    if (!source || !("setData" in source)) {
      return;
    }

    (source as { setData: (data: unknown) => void }).setData(countriesDataRef.current ?? EMPTY_FEATURE_COLLECTION);

    const selectedFilter = buildSelectedFilter(selectedCountriesRef.current) as unknown as Parameters<
      maptilersdk.Map["setFilter"]
    >[1];

    map.setFilter(COUNTRY_LAYER_ID, selectedFilter);
    map.setFilter(COUNTRY_OUTLINE_LAYER_ID, selectedFilter);

    try {
      map.moveLayer(COUNTRY_LAYER_ID);
      map.moveLayer(COUNTRY_OUTLINE_LAYER_ID);
    } catch {
      // Layer ordering can fail transiently during style updates.
    }
  };

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    countriesDataRef.current = countriesData;
    selectedCountriesRef.current = selectedCountries;
    updateHighlightedCountries();

    const map = mapRef.current;
    if (map) {
      map.resize();
      map.triggerRepaint();
    }
  }, [countriesData, selectedCountries]);

  useEffect(() => {
    if (!mapContainer.current) return;
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
      const canvas = map.getCanvas();
      canvas.style.backgroundColor = "transparent";
      map.getContainer().style.background = "transparent";

      map.getStyle().layers?.forEach((layer) => {
        if (layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
      });

      rebuildHighlightLayers(map);

      updateHighlightedCountries();

      map.on("styledata", () => {
        if (!map.isStyleLoaded()) {
          return;
        }

        rebuildHighlightLayers(map);
        updateHighlightedCountries();
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const targetProjection = viewMode === "globe" ? "globe" : "mercator";

    if (map.isStyleLoaded()) {
      try {
        (map as unknown as { setProjection?: (projection: string) => void }).setProjection?.(targetProjection);
      } catch {
        // Ignore projection API issues on older SDK/runtime combinations.
      }

      map.easeTo({
        center: [0, 20],
        zoom: viewMode === "globe" ? 1 : 1.15,
        pitch: viewMode === "globe" ? 20 : 0,
        duration: 500
      });

      map.resize();
      updateHighlightedCountries();
    }
  }, [viewMode]);

  return (
    <div
      className="map-canvas-shell"
      ref={mapContainer}
      style={{
        background: "transparent",
        width: viewMode === "globe" ? globeSize : flatMapWidth,
        height: viewMode === "globe" ? globeSize : flatMapHeight,
        borderRadius: viewMode === "globe" ? "9999px" : "0.85rem",
        transform: viewMode === "globe" ? "translateY(-0.75rem)" : "translateY(0)"
      }}
    />
  );
};

export default Map;
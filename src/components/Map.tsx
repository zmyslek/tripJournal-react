import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { getCountryName, type CountriesGeoJson } from "../types/countries";

const STYLE_URL =
  "https://api.maptiler.com/maps/0196a729-51f8-7a04-8b3a-22b8d925ea1b/style.json?key=FelxstvCdS6k0g9YnLdK";

const COUNTRY_LAYER_ID = "country-fill";
const COUNTRY_OUTLINE_LAYER_ID = "country-outline";
const COUNTRY_SOURCE_ID = "countries-geojson";

type MapProps = {
  countriesData: CountriesGeoJson | null;
  selectedCountries: string[];
};

const EMPTY_FEATURE_COLLECTION: CountriesGeoJson = {
  type: "FeatureCollection",
  features: []
};

const Map: React.FC<MapProps> = ({ countriesData, selectedCountries }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const countriesDataRef = useRef<CountriesGeoJson | null>(countriesData);
  const selectedCountriesRef = useRef<string[]>(selectedCountries);
  const globeSize = "min(70vw, 70vh)";

  const updateHighlightedCountries = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const source = map.getSource(COUNTRY_SOURCE_ID);
    if (!source || !("setData" in source)) {
      return;
    }

    const selectedCountrySet = new Set(selectedCountriesRef.current);
    const highlightedData: CountriesGeoJson = {
      type: "FeatureCollection",
      features:
        countriesDataRef.current?.features.filter((feature) => selectedCountrySet.has(getCountryName(feature))) ?? []
    };

    (source as { setData: (data: unknown) => void }).setData(highlightedData);
  };

  useEffect(() => {
    countriesDataRef.current = countriesData;
    selectedCountriesRef.current = selectedCountries;
    updateHighlightedCountries();
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
      projection: "globe",
      center: [0, 20],
      zoom: 1,
      pitch: 20,
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

      if (isUserInteracting) {
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

      // Hide basemap layers so only our country highlight layers render.
      map.getStyle().layers?.forEach((layer) => {
        if (layer.id !== COUNTRY_LAYER_ID && layer.id !== COUNTRY_OUTLINE_LAYER_ID) {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }

        if (layer.type === "background") {
          map.setPaintProperty(layer.id, "background-opacity", 0);
        }
      });

      if (!map.getSource(COUNTRY_SOURCE_ID)) {
        map.addSource(COUNTRY_SOURCE_ID, {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION
        });

        map.addLayer({
          id: COUNTRY_LAYER_ID,
          type: "fill",
          source: COUNTRY_SOURCE_ID,
          paint: {
            "fill-color": "#fabe7d",
            "fill-opacity": 0.58,
            "fill-outline-color": "#ffead4"
          }
        });

        map.addLayer({
          id: COUNTRY_OUTLINE_LAYER_ID,
          type: "line",
          source: COUNTRY_SOURCE_ID,
          paint: {
            "line-color": "#ffead4",
            "line-width": 1.35
          }
        });
      }

      updateHighlightedCountries();

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
      style={{
        background: "transparent",
        width: globeSize,
        height: globeSize
      }}
    />
  );
};

export default Map;
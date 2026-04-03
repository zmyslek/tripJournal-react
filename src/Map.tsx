import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

const STYLE_URL =
  "https://api.maptiler.com/maps/0196a729-51f8-7a04-8b3a-22b8d925ea1b/style.json?key=FelxstvCdS6k0g9YnLdK";

const FRANCE_LAYER_ID = "france-fill";
const FRANCE_OUTLINE_LAYER_ID = "france-outline";
const FRANCE_SOURCE_ID = "france-geojson";

// const highlightedCountries = ["Spain", "France", "Germany"];

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const globeSize = "min(70vw, 70vh)";

  useEffect(() => {
    if (!mapContainer.current) return;
    let animationFrameId = 0;
    let lastFrameTime = 0;
    let isUserInteracting = false;
    const rotationSpeedDegPerSec = 1.2;

    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: STYLE_URL,
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

    map.on("load", async () => {
      try {
        const response = await fetch("/countries.geojson");
        const countries = await response.json();
        const france = {
          ...countries,
          features: countries.features.filter((feature: { properties?: { [key: string]: string } }) =>
            feature.properties?.name === "France"
          )
        };

        if (!map.getSource(FRANCE_SOURCE_ID)) {
          map.addSource(FRANCE_SOURCE_ID, {
            type: "geojson",
            data: france
          });

          map.addLayer({
            id: FRANCE_LAYER_ID,
            type: "fill",
            source: FRANCE_SOURCE_ID,
            paint: {
              "fill-color": "#ff4fa3",
              "fill-opacity": 0.78,
              "fill-outline-color": "#ffd1e8"
            }
          });

          map.addLayer({
            id: FRANCE_OUTLINE_LAYER_ID,
            type: "line",
            source: FRANCE_SOURCE_ID,
            paint: {
              "line-color": "#ffd1e8",
              "line-width": 1.5
            }
          });
        }
      } catch (error) {
        console.error("Failed to load France GeoJSON", error);
      }

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
      ref={mapContainer}
      style={{
        width: globeSize,
        height: globeSize
      }}
    />
  );
};

export default Map;
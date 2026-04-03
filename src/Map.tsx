import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

const STYLE_URL =
  "https://api.maptiler.com/maps/0196a729-51f8-7a04-8b3a-22b8d925ea1b/style.json?key=FelxstvCdS6k0g9YnLdK";

// const highlightedCountries = ["Spain", "France", "Germany"];

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      projection: "globe",
      center: [0, 20],
      zoom: 1.2,
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

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "70vh",
        height: "70vh"
      }}
    />
  );
};

export default Map;
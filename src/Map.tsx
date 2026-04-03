import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

const STYLE_URL =
  "https://api.maptiler.com/maps/0196a729-51f8-7a04-8b3a-22b8d925ea1b/style.json?key=FelxstvCdS6k0g9YnLdK";

const highlightedCountries = ["Spain", "France", "Germany"];

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
      pitch: 20
    });

    mapRef.current = map;

    // map.on("load", async () => {
    //   const response = await fetch("/countries.geojson");
    //   // const countriesData = await response.json();

    //   // map.addSource("countries", {
    //   //   type: "geojson",
    //   //   data: countriesData
    //   // });

    // //   map.addLayer({
    // //     id: "countries-fill",
    // //     type: "fill",
    // //     source: "countries",
    // //     paint: {
    // //       "fill-color": [
    // //         "match",
    // //         ["get", "name"],
    // //         ...highlightedCountries.flatMap((country) => [
    // //           country,
    // //           "#4f46e5"
    // //         ]),
    // //         "#d1d5db"
    // //       ],
    // //       "fill-opacity": 0.8
    // //     }
    // //   });

    //   map.addLayer({
    //     id: "countries-border",
    //     type: "line",
    //     source: "countries",
    //     paint: {
    //       "line-color": "#ffffff",
    //       "line-width": 0.8
    //     }
    //   });
    // });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "100vh"
      }}
    />
  );
};

export default Map;
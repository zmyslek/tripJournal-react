import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve("public/countries.geojson");

const raw = readFileSync(inputPath, "utf8");
const geojson = JSON.parse(raw);

const roundCoord = (value) => Number(value.toFixed(3));

const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];

const normalizePoint = (point) => [roundCoord(point[0]), roundCoord(point[1])];

const normalizeLine = (line, isRing) => {
  const normalized = line.map(normalizePoint);
  const deduped = [];

  for (const point of normalized) {
    if (deduped.length === 0 || !samePoint(deduped[deduped.length - 1], point)) {
      deduped.push(point);
    }
  }

  if (isRing) {
    if (deduped.length === 0) {
      return deduped;
    }

    if (!samePoint(deduped[0], deduped[deduped.length - 1])) {
      deduped.push([...deduped[0]]);
    }

    if (deduped.length < 4) {
      while (deduped.length < 4) {
        deduped.push([...deduped[deduped.length - 1]]);
      }
    }
  }

  return deduped;
};

const normalizeGeometry = (geometry) => {
  if (!geometry) {
    return geometry;
  }

  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) => normalizeLine(ring, true))
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => normalizeLine(ring, true))
      )
    };
  }

  if (geometry.type === "LineString") {
    return {
      ...geometry,
      coordinates: normalizeLine(geometry.coordinates, false)
    };
  }

  if (geometry.type === "MultiLineString") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((line) => normalizeLine(line, false))
    };
  }

  if (geometry.type === "Point") {
    return {
      ...geometry,
      coordinates: normalizePoint(geometry.coordinates)
    };
  }

  if (geometry.type === "MultiPoint") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(normalizePoint)
    };
  }

  return geometry;
};

const normalized = {
  type: geojson.type,
  name: geojson.name,
  features: (geojson.features ?? []).map((feature) => ({
    type: "Feature",
    properties: {
      name: feature?.properties?.name ?? "",
      "ISO3166-1-Alpha-3": feature?.properties?.["ISO3166-1-Alpha-3"] ?? "",
      "ISO3166-1-Alpha-2": feature?.properties?.["ISO3166-1-Alpha-2"] ?? ""
    },
    geometry: normalizeGeometry(feature.geometry)
  }))
};

writeFileSync(inputPath, JSON.stringify(normalized));

console.log(`Optimized countries GeoJSON written to ${inputPath}`);

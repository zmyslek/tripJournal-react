import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve("public/countries.geojson");

const raw = readFileSync(inputPath, "utf8");
const geojson = JSON.parse(raw);

const roundCoord = (value) => Number(value.toFixed(3));

// Maximum distance (in degrees) a simplified line may drift from the source line.
const SIMPLIFY_TOLERANCE = 0.01;
const MIN_RING_POINTS = 4;

const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];

const normalizePoint = (point) => [roundCoord(point[0]), roundCoord(point[1])];

const squaredSegmentDistance = (point, start, end) => {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;

  return dx * dx + dy * dy;
};

// Douglas-Peucker simplification. Keeps the first and the last point.
const simplifyLine = (line) => {
  if (line.length <= 2) {
    return line;
  }

  const squaredTolerance = SIMPLIFY_TOLERANCE * SIMPLIFY_TOLERANCE;
  const keep = new Uint8Array(line.length);
  keep[0] = 1;
  keep[line.length - 1] = 1;

  const stack = [[0, line.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let maxDistance = 0;
    let maxIndex = -1;

    for (let index = first + 1; index < last; index += 1) {
      const distance = squaredSegmentDistance(line[index], line[first], line[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = index;
      }
    }

    if (maxDistance > squaredTolerance) {
      keep[maxIndex] = 1;
      stack.push([first, maxIndex], [maxIndex, last]);
    }
  }

  return line.filter((_, index) => keep[index] === 1);
};

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

    const simplified = simplifyLine(deduped);
    if (simplified.length >= MIN_RING_POINTS) {
      return simplified;
    }

    while (deduped.length < MIN_RING_POINTS) {
      deduped.push([...deduped[deduped.length - 1]]);
    }

    return deduped;
  }

  return simplifyLine(deduped);
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

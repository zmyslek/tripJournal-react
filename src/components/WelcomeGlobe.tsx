import type { CountriesGeoJson } from "../types/countries";

export interface WelcomeGlobeProps {
  countriesData: CountriesGeoJson;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

const SVG_SIZE = 1000;
const CENTER = SVG_SIZE / 2;
const RADIUS = 435;
const VIEW_LAT = 20;
const VIEW_LON = -18;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function projectPoint(lon: number, lat: number): ProjectedPoint | null {
  const lonRad = toRadians(lon - VIEW_LON);
  const latRad = toRadians(lat);
  const centerLatRad = toRadians(VIEW_LAT);

  const visibility = Math.sin(centerLatRad) * Math.sin(latRad) + Math.cos(centerLatRad) * Math.cos(latRad) * Math.cos(lonRad);
  if (visibility <= 0) {
    return null;
  }

  const x = CENTER + RADIUS * Math.cos(latRad) * Math.sin(lonRad);
  const y = CENTER - RADIUS * (Math.cos(centerLatRad) * Math.sin(latRad) - Math.sin(centerLatRad) * Math.cos(latRad) * Math.cos(lonRad));
  return { x, y };
}

function ringToPath(ring: number[][]): string {
  const projected = ring
    .map(([lon, lat]) => projectPoint(lon, lat))
    .filter((point): point is ProjectedPoint => point !== null);

  if (projected.length < 2) {
    return "";
  }

  return projected
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ") + " Z";
}

function featureToPath(feature: CountriesGeoJson["features"][number]): string {
  const geometry = feature.geometry;
  if (!geometry) {
    return "";
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToPath).filter(Boolean).join(" ");
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => polygon.map(ringToPath)).filter(Boolean).join(" ");
  }

  return "";
}

function getFillColor(name: string): string {
  const palette = ["#EAB681", "#CF8D45", "#FABE7D", "#C97E36", "#D9A15E"];
  const hash = Array.from(name).reduce((value, character) => value + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function WelcomeGlobe({ countriesData }: WelcomeGlobeProps): React.ReactElement {
  const paths = countriesData.features
    .map((feature) => {
      const name = feature.properties?.name?.trim() ?? "";
      if (!name) {
        return null;
      }

      const path = featureToPath(feature);
      if (!path) {
        return null;
      }

      return {
        name,
        path,
        fill: getFillColor(name)
      };
    })
    .filter((feature): feature is { name: string; path: string; fill: string } => feature !== null);

  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className="block h-full w-full"
      role="img"
      aria-label="Globe preview"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="welcome-globe-ocean" cx="40%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#fff3e4" />
          <stop offset="52%" stopColor="#f7d8b0" />
          <stop offset="100%" stopColor="#eab681" />
        </radialGradient>
        <radialGradient id="welcome-globe-atmosphere" cx="50%" cy="50%" r="50%">
          <stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#fff8ef" stopOpacity="0.75" />
        </radialGradient>
        <clipPath id="welcome-globe-clip">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} />
        </clipPath>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#welcome-globe-ocean)" />
      <g clipPath="url(#welcome-globe-clip)">
        <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="url(#welcome-globe-ocean)" />
        {paths.map((feature) => (
          <path
            key={feature.name}
            d={feature.path}
            fill={feature.fill}
            fillOpacity={0.34}
            stroke="#5A392B"
            strokeOpacity={0.4}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            opacity={0.95}
          />
        ))}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#welcome-globe-atmosphere)" />
      </g>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#5A392B" strokeOpacity={0.22} strokeWidth={2} />
    </svg>
  );
}

export default WelcomeGlobe;

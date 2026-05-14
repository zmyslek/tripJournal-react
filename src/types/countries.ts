import type { Feature, FeatureCollection, Geometry } from "geojson";

export type CountryProperties = {
  name?: string;
};

export type CountryFeature = Feature<Geometry, CountryProperties>;

export type CountriesGeoJson = FeatureCollection<Geometry, CountryProperties>;

export const getCountryName = (feature: CountryFeature): string =>
  feature.properties?.name?.trim() ?? "";

// Status colors for consistent styling across all pages
export const STATUS_COLORS = {
  visited: "bg-[#CF8D45]",          // Mid Tan
  wantToVisitAgain: "bg-[#FABE7D]", // Light Peach
  wantToGo: "bg-[#7A3F00]",         // Dark Brown
  notVisited: "bg-[#FFEAD4]",       // Paper Cream
  textPrimary: "text-[#7A3F00]",    // Dark Brown
  textLight: "text-[#FABE7D]"       // Light Peach
};

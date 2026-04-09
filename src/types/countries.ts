import type { Feature, FeatureCollection, Geometry } from "geojson";

export type CountryProperties = {
  name?: string;
};

export type CountryFeature = Feature<Geometry, CountryProperties>;

export type CountriesGeoJson = FeatureCollection<Geometry, CountryProperties>;

export const getCountryName = (feature: CountryFeature): string =>
  feature.properties?.name?.trim() ?? "";

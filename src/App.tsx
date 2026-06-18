import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import posthog from "posthog-js";
import MainLayout from "./components/MainLayout.tsx";

const Home = lazy(() => import("./pages/Home.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const Gallery = lazy(() => import("./pages/Gallery.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const HelpCenter = lazy(() => import("./pages/HelpCenter.tsx"));
const Policies = lazy(() => import("./pages/Policies.tsx"));
const CountryTrips = lazy(() => import("./pages/CountryTrips.tsx"));
const Itineraries = lazy(() => import("./pages/Itineraries.tsx"));
const COUNTRY_STATUS_CACHE_KEY = "tripjournal:country-statuses:v1";
const COUNTRY_ADDED_CACHE_KEY = "tripjournal:country-added-dates:v1";

export type CountryStatus = "want-to-go" | "visited" | "want-to-visit-again";
type CountryStatusMap = Record<string, CountryStatus>;
type CountryAddedDateMap = Record<string, string>;

function getCachedCountryStatuses(): CountryStatusMap {
    try {
        const cachedStatuses = localStorage.getItem(COUNTRY_STATUS_CACHE_KEY);
        if (!cachedStatuses) {
            return {};
        }

        const parsedStatuses = JSON.parse(cachedStatuses) as Record<string, unknown>;
        if (!parsedStatuses || typeof parsedStatuses !== "object") {
            return {};
        }

        const normalizedStatuses: CountryStatusMap = {};

        Object.entries(parsedStatuses).forEach(([countryName, statusValue]) => {
            if (typeof countryName !== "string" || countryName.trim().length === 0) {
                return;
            }

            if (statusValue === "want-to-go" || statusValue === "visited" || statusValue === "want-to-visit-again") {
                normalizedStatuses[countryName] = statusValue;
            }
        });

        return normalizedStatuses;
    } catch {
        return {};
    }
}

function getCachedCountryAddedDates(): CountryAddedDateMap {
    try {
        const cachedDates = localStorage.getItem(COUNTRY_ADDED_CACHE_KEY);
        if (!cachedDates) {
            return {};
        }

        const parsedDates = JSON.parse(cachedDates) as Record<string, unknown>;
        if (!parsedDates || typeof parsedDates !== "object") {
            return {};
        }

        const normalizedDates: CountryAddedDateMap = {};
        Object.entries(parsedDates).forEach(([countryName, dateValue]) => {
            if (typeof countryName !== "string" || !countryName.trim()) {
                return;
            }

            if (typeof dateValue !== "string") {
                return;
            }

            const parsedDate = new Date(dateValue);
            if (Number.isNaN(parsedDate.getTime())) {
                return;
            }

            normalizedDates[countryName] = parsedDate.toISOString();
        });

        return normalizedDates;
    } catch {
        return {};
    }
}

function PostHogPageView() {
    const location = useLocation();
    useEffect(() => {
        posthog.capture("$pageview", { $current_url: window.location.href });
    }, [location]);
    return null;
}

function RouteFallback() {
    return <div className="h-20" />;
}

function App() {
    const [countryStatuses, setCountryStatuses] = useState<CountryStatusMap>(() => getCachedCountryStatuses());
    const [countryAddedDates, setCountryAddedDates] = useState<CountryAddedDateMap>(() => getCachedCountryAddedDates());

    useEffect(() => {
        try {
            localStorage.setItem(COUNTRY_STATUS_CACHE_KEY, JSON.stringify(countryStatuses));
        } catch {
            // Ignore cache write failures.
        }
    }, [countryStatuses]);

    useEffect(() => {
        try {
            localStorage.setItem(COUNTRY_ADDED_CACHE_KEY, JSON.stringify(countryAddedDates));
        } catch {
            // Ignore cache write failures.
        }
    }, [countryAddedDates]);

    const setCountryStatus = (countryName: string, status: CountryStatus | null) => {
        setCountryStatuses((prevStatuses) => {
            if (status === null) {
                const nextStatuses = { ...prevStatuses };
                delete nextStatuses[countryName];
                return nextStatuses;
            }

            return {
                ...prevStatuses,
                [countryName]: status
            };
        });

        setCountryAddedDates((prevDates) => {
            if (status === null) {
                const nextDates = { ...prevDates };
                delete nextDates[countryName];
                return nextDates;
            }

            if (prevDates[countryName]) {
                return prevDates;
            }

            return {
                ...prevDates,
                [countryName]: new Date().toISOString()
            };
        });
    };

    // Temporary compatibility with Home-codex: this page expects `visitedCountries`.
    const visitedCountries = Object.entries(countryStatuses)
        .filter(([, status]) => status === "visited" || status === "want-to-visit-again")
        .map(([countryName]) => countryName);

  return (
    <>
      <PostHogPageView />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />

          <Route element={<MainLayout />}>
            <Route
              path="/countries"
              element={
                <Home
                  visitedCountries={visitedCountries}
                  countryStatuses={countryStatuses}
                  countryAddedDates={countryAddedDates}
                  setCountryStatus={setCountryStatus}
                />
              }
            />
            <Route
              path="/trips/:countryName"
              element={<CountryTrips countryStatuses={countryStatuses} />}
            />
            <Route
              path="/itineraries/:countryName"
              element={
                <Itineraries
                  countryStatuses={countryStatuses}
                  countryAddedDates={countryAddedDates}
                />
              }
            />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/policies/:policySlug" element={<Policies />} />
          </Route>

          <Route
            path="/map-only"
            element={
              <Home
                visitedCountries={visitedCountries}
                countryStatuses={countryStatuses}
                countryAddedDates={countryAddedDates}
                setCountryStatus={setCountryStatus}
              />
            }
          />

          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;

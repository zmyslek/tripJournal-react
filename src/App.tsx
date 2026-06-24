import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import posthog from "posthog-js";
import MainLayout from "./components/MainLayout.tsx";
import { supabase } from "./lib/supabase/client";
import { loadCountryStatuses, setCountryStatus as saveCountryStatus, type CountryVisitStatus } from "./lib/supabase/journal";

const Home = lazy(() => import("./pages/Home.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const Gallery = lazy(() => import("./pages/Gallery.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const HelpCenter = lazy(() => import("./pages/HelpCenter.tsx"));
const Policies = lazy(() => import("./pages/Policies.tsx"));
const CountryTrips = lazy(() => import("./pages/CountryTrips.tsx"));
const Itineraries = lazy(() => import("./pages/Itineraries.tsx"));
export type CountryStatus = CountryVisitStatus;
type CountryStatusMap = Record<string, CountryStatus>;
type CountryAddedDateMap = Record<string, string>;

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
    const [countryStatuses, setCountryStatuses] = useState<CountryStatusMap>({});
    const [countryAddedDates, setCountryAddedDates] = useState<CountryAddedDateMap>({});

    useEffect(() => {
        let mounted = true;

        const loadCountryState = async () => {
            try {
                const rows = await loadCountryStatuses();
                if (!mounted) {
                    return;
                }

                const nextStatuses: CountryStatusMap = {};
                const nextDates: CountryAddedDateMap = {};

                rows.forEach((row) => {
                    nextStatuses[row.country_name] = row.status;
                    nextDates[row.country_name] = row.added_at;
                });

                setCountryStatuses(nextStatuses);
                setCountryAddedDates(nextDates);
            } catch {
                if (!mounted) {
                    return;
                }

                setCountryStatuses({});
                setCountryAddedDates({});
            }
        };

        void loadCountryState();

        const { data: subscription } = supabase.auth.onAuthStateChange(() => {
            void loadCountryState();
        });

        return () => {
            mounted = false;
            subscription.subscription.unsubscribe();
        };
    }, []);

    const setCountryStatus = (countryName: string, status: CountryStatus | null) => {
        const currentAddedAt = countryAddedDates[countryName] ?? null;

        setCountryStatuses((prevStatuses) => {
            const nextStatuses = { ...prevStatuses };
            if (status === null) {
                delete nextStatuses[countryName];
            } else {
                nextStatuses[countryName] = status;
            }
            return nextStatuses;
        });

        setCountryAddedDates((prevDates) => {
            const nextDates = { ...prevDates };
            if (status === null) {
                delete nextDates[countryName];
            } else {
                nextDates[countryName] = currentAddedAt ?? new Date().toISOString();
            }
            return nextDates;
        });

        void saveCountryStatus(countryName, status, currentAddedAt).catch((error) => {
            console.error("Failed to save country status:", error);
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

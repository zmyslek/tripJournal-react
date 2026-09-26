import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";
import { appDependencies } from "./app/composition.ts";
import type { CountryStatus } from "./domain/country/Country.ts";

const Home = lazy(() => import("./pages/Home.tsx"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Policies = lazy(() => import("./pages/Policies"));
const CountryTrips = lazy(() => import("./pages/CountryTrips"));
const Itineraries = lazy(() => import("./pages/Itineraries"));
const AdminSeed = lazy(() => import("./pages/AdminSeed"));
function RouteFallback() {
    return <div className="h-20" />;
}

function App() {
    const [countryState, setCountryState] = useState(() => appDependencies.countryStatus.load());

    useEffect(() => {
        appDependencies.countryStatus.save(countryState);
    }, [countryState]);

    const setCountryStatus = (countryName: string, status: CountryStatus | null) => {
        setCountryState((previousState) => appDependencies.countryStatus.update(previousState, countryName, status));
    };

    // Temporary compatibility with Home-codex: this page expects `visitedCountries`.
    const visitedCountries = Object.entries(countryState.statuses)
        .filter(([, status]) => status === "visited" || status === "want-to-visit-again")
        .map(([countryName]) => countryName);

    return (
        <Routes>
            <Route
                path="/welcome"
                element={
                    <Suspense fallback={<RouteFallback />}>
                        <Welcome />
                    </Suspense>
                }
            />
            <Route element={<MainLayout />}>
                <Route
                    path="/home"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Home
                                pageMode="home"
                                visitedCountries={visitedCountries}
                                countryStatuses={countryState.statuses}
                                countryAddedDates={countryState.addedDates}
                                setCountryStatus={setCountryStatus}
                            />
                        </Suspense>
                    }
                />
                <Route
                    path="/countries"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Home
                                pageMode="countries"
                                visitedCountries={visitedCountries}
                                countryStatuses={countryState.statuses}
                                countryAddedDates={countryState.addedDates}
                                setCountryStatus={setCountryStatus}
                            />
                        </Suspense>
                    }
                />
                <Route
                    path="/trips/:countryName"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <CountryTrips countryStatuses={countryState.statuses} />
                        </Suspense>
                    }
                />
                <Route
                    path="/itineraries/:countryName"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Itineraries
                                countryStatuses={countryState.statuses}
                                countryAddedDates={countryState.addedDates}
                            />
                        </Suspense>
                    }
                />
                <Route
                    path="/gallery"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Gallery />
                        </Suspense>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Profile />
                        </Suspense>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Settings />
                        </Suspense>
                    }
                />
                <Route
                    path="/admin-seed"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <AdminSeed />
                        </Suspense>
                    }
                />
                <Route
                    path="/help-center"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <HelpCenter />
                        </Suspense>
                    }
                />
                <Route
                    path="/policies/:policySlug"
                    element={
                        <Suspense fallback={<RouteFallback />}>
                            <Policies />
                        </Suspense>
                    }
                />
            </Route>

            <Route
                path="/map-only"
                element={
                    <Suspense fallback={<RouteFallback />}>
                        <Home
                                pageMode="home"
                            visitedCountries={visitedCountries}
                            countryStatuses={countryState.statuses}
                            countryAddedDates={countryState.addedDates}
                            setCountryStatus={setCountryStatus}
                        />
                    </Suspense>
                }
            />

            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
    );
}

export default App;

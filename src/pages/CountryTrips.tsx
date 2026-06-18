import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Map from "../components/Map";
import { useCountriesData } from "../hooks/useCountriesData";
import { useCountryDetails } from "../hooks/useCountryDetails";
import { useScrollToTop } from "../hooks/useScrollToTop";
import paperBackground from "../assets/wrinkled-paper.png";
import type { CountryStatus } from "./Home";
import { decodeCountryParam } from "../utils/countryRouting";
import { itineraryKey, readItineraries, seedItinerariesFromCatalog, type ItineraryItem } from "../utils/itineraryStorage";
import SpotifyPlaylistGenerator from "../components/SpotifyPlaylistGenerator";

type CountryStatusMap = Record<string, CountryStatus>;
type GalleryMediaKind = "image" | "video" | "unsupported";

interface CountryGalleryItem {
    id: string;
    src: string;
    label: string;
    kind: GalleryMediaKind;
}

interface CountryTripsProps {
    countryStatuses: CountryStatusMap;
}

interface RatingProps {
    value?: number;
}

interface HeicPreviewProps {
    src: string;
    alt?: string;
    eager?: boolean;
}

const galleryManifestUrl = `${import.meta.env.BASE_URL}temporary-gallery/manifest.json`;
const galleryPublicRoot = `${import.meta.env.BASE_URL}temporary-gallery/`;
const imageExtensions = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "bmp", "svg"]);
const videoExtensions = new Set(["mp4", "mov", "webm", "m4v", "avi", "mkv", "wmv", "flv", "3gp", "mpeg"]);

function extensionOf(src: string): string {
    try {
        const match = src.match(/\.([a-z0-9]+)(?:$|[?#])/i);
        return match ? match[1].toLowerCase() : "";
    } catch {
        return "";
    }
}

function formatDate(dateValue: string | undefined): string {
    if (!dateValue) {
        return "Not set";
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return "Not set";
    }

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function itineraryDestination(item: ItineraryItem, fallbackCountryName: string): string {
    if (item.destination) {
        return item.destination;
    }

    if (item.locationType === "city" && item.city) {
        return `${item.city}, ${fallbackCountryName}`;
    }

    return fallbackCountryName;
}

function itineraryPreviewNote(item: ItineraryItem): string {
    const summary = item.summary?.slice(0, 2).map((entry) => `${entry.label}: ${entry.value}`).join(" | ");
    if (summary) {
        return summary;
    }

    return item.description;
}

function loadCountryGallery(countryName: string): Promise<CountryGalleryItem[]> {
    return fetch(galleryManifestUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Manifest fetch failed: ${response.status}`);
            }

            return response.json() as Promise<unknown>;
        })
        .then((manifest) => {
            // Manifest can be either { country: [...] } or an array of paths
            const entries: string[] = [];

            if (Array.isArray(manifest)) {
                // manifest is an array of paths like "Spain/Valencia/...")
                for (const p of manifest) {
                    if (typeof p === "string") entries.push(p);
                }
            } else if (manifest && typeof manifest === "object") {
                // object keyed by country
                for (const key of Object.keys(manifest as Record<string, unknown>)) {
                    const val = (manifest as Record<string, unknown>)[key];
                    if (Array.isArray(val)) {
                        for (const p of val) if (typeof p === "string") entries.push(p);
                    }
                }
            }

            const countryLower = countryName.toLowerCase();

            const paths = entries.filter((p) => {
                const normalized = p.replaceAll('\\', '/');
                const first = normalized.split('/')[0] ?? "";
                return first.toLowerCase() === countryLower;
            });

            return paths
                .map((path) => {
                    const ext = extensionOf(path);
                    const kind: GalleryMediaKind = videoExtensions.has(ext)
                        ? "video"
                        : imageExtensions.has(ext)
                            ? "image"
                            : "unsupported";

                    return {
                        id: path,
                        src: `${galleryPublicRoot}${path}`,
                        label: path,
                        kind
                    };
                })
                .filter((item) => item.kind !== "unsupported");
        })
        .catch(() => []);
}

function Rating({ value = 0 }: RatingProps) {
    const stars = [0, 1, 2, 3, 4];

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
                {stars.map((i) => {
                    const fill = Math.max(0, Math.min(1, value - i));
                    const id = `grad-${i}`;

                    return (
                        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id={id} x1="0" x2="1">
                                    <stop offset={`${fill * 100}%`} stopColor="#f5d8b3" />
                                    <stop offset={`${fill * 100}%`} stopColor="#ffffff00" />
                                </linearGradient>
                            </defs>
                            <path d="M12 .587l3.668 7.431L23.4 9.75l-5.6 5.462L19.335 24 12 19.77 4.665 24l1.535-8.788L.6 9.75l7.732-1.732L12 .587z" fill={`url(#${id})`} stroke="#f5d8b3" />
                        </svg>
                    );
                })}
            </div>
            <div className="font-[Cormorant_Garamond] text-sm text-[#ffead4]">{value.toFixed(1)} / 5</div>
        </div>
    );
}

function HeicPreview({ src, alt, eager = false }: HeicPreviewProps) {
    const ref = useRef<HTMLImageElement | null>(null);
    const hasStarted = useRef(false);
    const [isVisible, setIsVisible] = useState(eager);

    useEffect(() => {
        if (eager || !ref.current || !("IntersectionObserver" in window)) {
            hasStarted.current = true;
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                for (const ent of entries) {
                    if (ent.isIntersecting && !hasStarted.current) {
                        hasStarted.current = true;
                        setIsVisible(true);
                        io.disconnect();
                        break;
                    }
                }
            },
            { rootMargin: "200px" }
        );

        io.observe(ref.current);

        return () => {
            io.disconnect();
        };
    }, [eager]);

    if (!isVisible && !eager) {
        return <div className="h-full w-full bg-[#ddd]" />;
    }

    return <img ref={ref} src={src} alt={alt ?? ""} loading={eager ? "eager" : "lazy"} className="h-full w-full object-cover" />;
}

function CountryTrips({ countryStatuses }: CountryTripsProps) {
    const { countryName: encodedCountryName = "" } = useParams();
    const navigate = useNavigate();
    const routeCountryName = decodeCountryParam(encodedCountryName).trim();

    const { countriesData } = useCountriesData();
    const { details: countryDetails, isLoading: detailsLoading } = useCountryDetails(routeCountryName);
    const { showScrollTop, scrollToTop } = useScrollToTop();

    const [galleryItems, setGalleryItems] = useState<CountryGalleryItem[]>([]);
    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
    const [galleriesLoaded, setGalleriesLoaded] = useState(false);
    const [remainingGallery, setRemainingGallery] = useState<CountryGalleryItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const INITIAL_GALLERY_LIMIT = 24;

    const countryNames = useMemo(() => {
        if (!countriesData) {
            return [];
        }

        return Array.from(
            new Set(
                countriesData.features
                    .map((feature) => feature.properties?.name?.trim() ?? "")
                    .filter((name) => name.length > 0)
            )
        );
    }, [countriesData]);

    const resolvedCountryName = useMemo(() => {
        const matched = countryNames.find((name) => name.toLowerCase() === routeCountryName.toLowerCase());
        return matched ?? routeCountryName;
    }, [countryNames, routeCountryName]);

    const countryStatus = routeCountryName ? countryStatuses[routeCountryName] ?? null : null;

    useEffect(() => {
        if (!routeCountryName) {
            return;
        }

        void loadCountryGallery(routeCountryName).then((items) => {
            setGalleryItems(items.slice(0, INITIAL_GALLERY_LIMIT));
            setRemainingGallery(items.slice(INITIAL_GALLERY_LIMIT));
            setCurrentGalleryIndex(0);
            setGalleriesLoaded(true);
        });
    }, [routeCountryName]);

    const itineraryPreviewItems = useMemo<ItineraryItem[]>(() => {
        if (!routeCountryName) {
            return [];
        }

        const seeded = seedItinerariesFromCatalog(routeCountryName);
        const stored = readItineraries(routeCountryName);
        return (stored.length > 0 ? stored : seeded).slice(0, 2);
    }, [routeCountryName]);

    function handleCreateItinerary() {
        if (!routeCountryName) return;

        const now = new Date().toISOString();
        const newItinerary: ItineraryItem = {
            id: crypto.randomUUID(),
            title: `${resolvedCountryName} trip board`,
            locationType: "country",
            city: "",
            destination: resolvedCountryName,
            startDate: "",
            endDate: "",
            status: "planned",
            description: "New planning board. Add the route, dates, day plan, bookings, packing, checklist, and notes here.",
            createdAt: now,
            updatedAt: now,
            mood: "",
            travelStyle: "",
            budget: "",
            summary: [
                { label: "Route", value: "Add the cities or regions you want to cover." },
                { label: "Priority", value: "Add the main reason for this trip." }
            ],
            dayPlan: [],
            packingList: [
                { group: "Documents", done: false, items: [{ name: "Passport/ID", done: false }, { name: "Insurance", done: false }] },
                { group: "Clothing", done: false, items: [{ name: "Comfortable shoes", done: false }, { name: "Weather layers", done: false }] }
            ],
            checklist: [{ task: "Choose travel dates", done: false, due: "" }],
            hotels: [],
            transport: [],
            notes: []
        };

        const existing = readItineraries(routeCountryName);
        const seeded = seedItinerariesFromCatalog(routeCountryName);
        const next = [newItinerary, ...(existing.length > 0 ? existing : seeded)];

        try {
            localStorage.setItem(itineraryKey(routeCountryName), JSON.stringify(next));
        } catch {
            // Ignore storage failures and still navigate to the editor.
        }

        navigate(`/itineraries/${encodeURIComponent(resolvedCountryName)}?open=${newItinerary.id}`);
    }

    useEffect(() => {
        if (galleryItems.length === 0) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentGalleryIndex((prev) => (prev + 1) % galleryItems.length);
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [galleryItems.length]);

    const currentImage = galleryItems[currentGalleryIndex];
    const selectedImage = galleryItems[selectedIndex];

    function handleOpenModal(index: number) {
        setSelectedIndex(index);
        setIsModalOpen(true);
    }

    function handleCloseModal() {
        setIsModalOpen(false);
    }

    function handlePreviousModal() {
        setSelectedIndex((previous) => (previous - 1 + galleryItems.length) % galleryItems.length);
    }

    function handleNextModal() {
        setSelectedIndex((previous) => (previous + 1) % galleryItems.length);
    }

    if (isModalOpen && selectedImage) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#5a392b]/35 p-[3vw] backdrop-blur-sm sm:p-[4vw]"
                onClick={handleCloseModal}
            >
                <div
                    className="flex max-h-[92svh] max-w-[96vw] flex-col items-center gap-5 overflow-visible"
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        onClick={handleCloseModal}
                        className="flex h-[clamp(2.6rem,5.4vw,3.4rem)] w-[clamp(2.6rem,5.4vw,3.4rem)] items-center justify-center self-end rounded-full border border-[#ffead4]/55 bg-[#5a392b]/92 text-[clamp(1rem,2vw,1.3rem)] font-semibold text-[#ffead4] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:border-[#ffead4]/85 hover:bg-[#5a392b]"
                        aria-label="Close modal"
                    >
                        x
                    </button>

                    <div className="flex max-w-full items-center justify-center gap-5">
                        <button
                            onClick={handlePreviousModal}
                            className="flex h-[clamp(2.6rem,5.4vw,3.4rem)] w-[clamp(2.6rem,5.4vw,3.4rem)] shrink-0 items-center justify-center rounded-full border border-[#ffead4]/55 bg-[#5a392b]/92 text-[clamp(1rem,2vw,1.3rem)] font-semibold text-[#ffead4] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:border-[#ffead4]/85 hover:bg-[#5a392b]"
                            aria-label="Previous image"
                        >
                            &lt;
                        </button>

                        <div className="flex max-h-[calc(92svh-8.5rem)] max-w-[calc(96vw-8.5rem)] items-center justify-center overflow-hidden rounded-[1rem] bg-[#fff4e7]">
                            {selectedImage.kind === "video" ? (
                                <video
                                    src={selectedImage.src}
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    className="max-h-[calc(92svh-8.5rem)] max-w-[calc(96vw-8.5rem)] object-contain"
                                />
                            ) : (
                                <img
                                    src={selectedImage.src}
                                    alt={selectedImage.label}
                                    className="max-h-[calc(92svh-8.5rem)] max-w-[calc(96vw-8.5rem)] object-contain"
                                />
                            )}
                        </div>

                        <button
                            onClick={handleNextModal}
                            className="flex h-[clamp(2.6rem,5.4vw,3.4rem)] w-[clamp(2.6rem,5.4vw,3.4rem)] shrink-0 items-center justify-center rounded-full border border-[#ffead4]/55 bg-[#5a392b]/92 text-[clamp(1rem,2vw,1.3rem)] font-semibold text-[#ffead4] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:border-[#ffead4]/85 hover:bg-[#5a392b]"
                            aria-label="Next image"
                        >
                            &gt;
                        </button>
                    </div>

                    <div className="rounded-full bg-[#5a392b]/75 px-4 py-2 text-[clamp(0.72rem,1.6vw,0.95rem)] text-[#ffead4]">
                        {selectedIndex + 1} / {galleryItems.length}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] pb-[max(3rem,8vh)] pt-[max(1.5rem,4vh)]">
            <section className="overflow-hidden rounded-t-[1.35rem] border border-[#8f5a20]/35 shadow-[0_18px_42px_rgb(80_48_13_/_20%)]">
                <div
                    className="bg-[#5a392b] px-6 py-6 sm:px-8"
                    style={{
                        backgroundImage: `linear-gradient(rgb(90 57 43 / 0.96), rgb(90 57 43 / 0.96)), url(${paperBackground})`,
                        backgroundSize: "cover"
                    }}
                >
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Your travels</p>
                            <h1 className="mt-2 font-[Adamina] text-[clamp(1.9rem,4.2vw,3rem)] text-[#fff4e7]">{resolvedCountryName}</h1>
                            {countryDetails && (
                                <p className="mt-3 font-[Cormorant_Garamond] text-[1.1rem] text-[#f7dfca] max-w-2xl">{countryDetails.description}</p>
                            )}
                            {!detailsLoading && !countryDetails && (
                                <p className="mt-3 font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]/80">Explore your memories, itineraries, and travel experiences.</p>
                            )}
                        </div>

                        <div className="flex w-48 flex-col items-end gap-3">
                            <div className="flex items-center gap-2">
                                <Rating value={4.5} />
                            </div>

                            <button
                                type="button"
                                onClick={handleCreateItinerary}
                                className="rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2 font-[Adamina] text-[0.83rem] uppercase tracking-[0.08em] text-[#5a392b] no-underline transition hover:bg-[#eab681]"
                            >
                                Plan itinerary
                            </button>

                            <div className="mt-1">
                                <span
                                    className={[
                                        "inline-flex items-center gap-2 rounded-full px-3 py-1 font-[Adamina] text-[0.75rem] uppercase tracking-[0.08em]",
                                        countryStatus === "visited"
                                            ? "border border-[#f3e1c7] bg-[#f6dfc1] text-[#5a392b] shadow-[0_2px_8px_rgb(90_57_43_/_18%)]"
                                            : countryStatus === "want-to-go"
                                                ? "border border-[#fabe7d] bg-[#fff4e7] text-[#7a3f00]"
                                                : countryStatus === "want-to-visit-again"
                                                    ? "border border-[#cf8d45] bg-[#7a3f00] text-[#ffead4]"
                                                    : "border border-[#ffead4]/20 bg-[#ffead4]/10 text-[#ffead4]"
                                    ].join(" ")}
                                >
                                    {countryStatus === "visited" ? "Visited" : countryStatus ?? "Not selected"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_1fr]">
                <section className="flex min-h-[420px] items-center justify-center overflow-hidden self-start">
                    <div className="w-full max-w-[820px]">
                        <Map
                            countriesData={countriesData}
                            selectedCountries={countryStatus ? [resolvedCountryName] : []}
                            viewMode="globe"
                            countryStatuses={countryStatuses}
                            focusCountry={resolvedCountryName}
                        />
                    </div>
                </section>

                {galleriesLoaded && (
                    <section className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 shadow-[0_12px_28px_rgb(80_48_13_/_14%)]">
                        {galleryItems.length > 0 && currentImage ? (
                            <button
                                type="button"
                                onClick={() => handleOpenModal(currentGalleryIndex)}
                                className="relative aspect-[3/4] w-full max-h-[clamp(20rem,50vh,35rem)] cursor-zoom-in overflow-hidden"
                            >
                                {currentImage.kind === "image" ? (
                                    <HeicPreview src={currentImage.src} alt={currentImage.label} eager />
                                ) : (
                                    <video src={currentImage.src} poster={paperBackground} className="h-full w-full bg-[#fff4e7] object-cover" />
                                )}

                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#5a392b] to-transparent px-4 py-4">
                                    <p className="font-[Adamina] text-[0.75rem] uppercase tracking-[0.08em] text-[#ffead4]">
                                        {currentGalleryIndex + 1} / {galleryItems.length}
                                    </p>
                                </div>

                                {galleryItems.length > 1 && (
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentGalleryIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)}
                                            className="rounded-full bg-[#000]/40 p-2 text-[#ffead4] transition hover:bg-[#000]/60"
                                            aria-label="Previous image"
                                        >
                                            ←
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentGalleryIndex((prev) => (prev + 1) % galleryItems.length)}
                                            className="rounded-full bg-[#000]/40 p-2 text-[#ffead4] transition hover:bg-[#000]/60"
                                            aria-label="Next image"
                                        >
                                            →
                                        </button>
                                    </div>
                                )}
                            </button>
                        ) : (
                            <div className="flex h-[20rem] items-center justify-center bg-[#ffead4]/85 p-6">
                                <div className="text-center">
                                    <p className="font-[Cormorant_Garamond] text-[1.15rem] text-[#6a4630]">
                                        No photos yet
                                    </p>
                                    <p className="mt-2 font-[Cormorant_Garamond] text-[1rem] text-[#8f5a20]">
                                        Upload your travel photos to get started
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <section className="mt-8 overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 shadow-[0_12px_28px_rgb(80_48_13_/_14%)]">
                <div
                    className="bg-[#5a392b] px-6 py-5 sm:px-8"
                    style={{
                        backgroundImage: `linear-gradient(rgb(90 57 43 / 0.97), rgb(90 57 43 / 0.97)), url(${paperBackground})`,
                        backgroundSize: "cover"
                    }}
                >
                    <h2 className="font-[Adamina] text-[1.8rem] text-[#fff4e7]">Travel integrations</h2>
                    <p className="mt-2 font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca] max-w-xl">Connect your travel experiences with music, fitness, and video data.</p>
                </div>

                <div className="bg-[#ffead4]/85 p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <SpotifyPlaylistGenerator 
                            tripId={itineraryPreviewItems[0]?.id} 
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            currentPlaylistId={(itineraryPreviewItems[0] as any)?.spotify_playlist_id}
                            countryName={resolvedCountryName}
                        />

                        <div className="rounded-[1rem] border-2 border-[#eab681]/60 bg-[#fff4e7] p-6">
                            <p className="font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#7a3f00]">👟 Step Counter</p>
                            <h3 className="mt-3 font-[Adamina] text-[1.1rem] text-[#50300d]">Track Your Movement</h3>
                            <p className="mt-2 font-[Cormorant_Garamond] text-[0.95rem] text-[#6a4630] max-w-2xl">Connect your fitness tracker or health app to see steps walked, distance traveled, and activity summaries for each day of your journey.</p>
                            <button type="button" className="mt-4 rounded-full border border-[#eab681] bg-[#eab681] px-4 py-2 font-[Adamina] text-[0.82rem] uppercase tracking-[0.08em] text-[#5a392b] transition hover:bg-[#cf8d45]">Connect Steps</button>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[1rem] border-2 border-[#fabe7d]/60 bg-[#fff4e7] p-6">
                        <p className="font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#7a3f00]">🎬 TikTok</p>
                        <h3 className="mt-3 font-[Adamina] text-[1.4rem] text-[#50300d]">Travel Videos</h3>
                        <p className="mt-3 font-[Cormorant_Garamond] text-[1.1rem] text-[#6a4630] max-w-2xl">Discover travel videos from {resolvedCountryName}. Explore trending content, travel vlogs, and local culture videos from TikTok creators.</p>
                        <button type="button" className="mt-4 rounded-full border border-[#fabe7d] bg-[#fabe7d] px-5 py-2.5 font-[Adamina] text-[0.85rem] uppercase tracking-[0.08em] text-[#5a392b] transition hover:bg-[#cf8d45]">Explore Videos</button>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 p-6">
                    <div className="overflow-hidden rounded-[1.25rem] border border-[#8f5a20]/25 bg-[#fff4e7] shadow-[0_10px_24px_rgb(80_48_13_/_10%)]">
                        <div className="border-b border-[#8f5a20]/15 bg-[#ffead4]/75 px-5 py-4">
                            <p className="font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">Itineraries</p>
                            <h3 className="mt-2 font-[Adamina] text-[1.2rem] text-[#50300d]">{resolvedCountryName} trip boards</h3>
                        </div>

                        <div className="bg-[#ffead4]/85 p-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                {itineraryPreviewItems.map((it) => (
                                    <article key={it.id} className="overflow-hidden rounded-[1rem] border border-[#8f5a20]/20 bg-[#fff4e7] shadow-[0_6px_16px_rgb(80_48_13_/_10%)]">
                                        <div className="border-b border-[#8f5a20]/12 bg-[#f6dfc1] px-4 py-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-[Adamina] text-[0.7rem] uppercase tracking-[0.2em] text-[#8f5a20]">Connected itinerary</p>
                                                    <Link
                                                        to={`/itineraries/${encodeURIComponent(resolvedCountryName)}?open=${it.id}`}
                                                        className="mt-1 inline-block font-[Adamina] text-[1.05rem] text-[#50300d] no-underline hover:underline"
                                                    >
                                                        {it.title}
                                                    </Link>
                                                </div>
                                                <span className="rounded-full border border-[#8f5a20]/20 bg-[#fff4e7] px-3 py-1 font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#7a3f00]">{it.status}</span>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto]">
                                            <div>
                                                <p className="font-[Cormorant_Garamond] text-[1rem] text-[#6a4630]">
                                                    {itineraryDestination(it, resolvedCountryName)}
                                                </p>
                                                <p className="mt-2 line-clamp-3 font-[Cormorant_Garamond] text-[1rem] text-[#50300d]">
                                                    {itineraryPreviewNote(it)}
                                                </p>
                                            </div>

                                            <div className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4] px-4 py-3 text-right">
                                                <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#8f5a20]">Dates</p>
                                                <p className="mt-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d]">{formatDate(it.startDate)}</p>
                                                <p className="font-[Cormorant_Garamond] text-[0.98rem] text-[#6a4630]">to {formatDate(it.endDate)}</p>
                                                <Link
                                                    to={`/itineraries/${encodeURIComponent(resolvedCountryName)}?open=${it.id}`}
                                                    className="mt-3 inline-block rounded-full border border-[#cf8d45] bg-[#cf8d45] px-3 py-1 font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#5a392b] no-underline transition hover:bg-[#eab681]"
                                                >
                                                    Open board
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[1.25rem] border border-[#8f5a20]/25 bg-[#fff4e7] shadow-[0_10px_24px_rgb(80_48_13_/_10%)]">
                        <div className="border-b border-[#8f5a20]/15 bg-[#ffead4]/75 px-5 py-4">
                            <p className="font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">Gallery</p>
                            <h3 className="mt-2 font-[Adamina] text-[1.2rem] text-[#50300d]">Photos, one by one</h3>
                        </div>

                        <div className="grid gap-0 lg:grid-cols-[1fr_auto_1fr]">
                            <button
                                type="button"
                                onClick={() => setCurrentGalleryIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)}
                                disabled={galleryItems.length <= 1}
                                className="hidden items-center justify-center border-r border-[#8f5a20]/15 bg-[#fff4e7] px-4 py-6 text-[#7a3f00] transition hover:bg-[#f6dfc1] disabled:cursor-not-allowed disabled:opacity-40 lg:flex"
                                aria-label="Previous photo"
                            >
                                ←
                            </button>

                            <div className="relative min-h-[22rem] bg-transparent">
                                {galleryItems.length === 0 ? (
                                    <div className="flex min-h-[22rem] items-center justify-center bg-[#ffead4]/85 p-6 text-center font-[Cormorant_Garamond] text-[1.1rem] text-[#6a4630]">No photos yet</div>
                                ) : (
                                    <div className="grid gap-3 p-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                        {galleryItems.map((item, index) => (
                                            <button key={item.id} type="button" onClick={() => handleOpenModal(index)} className="group relative aspect-[3/4] overflow-hidden rounded-[0.9rem] bg-[#fff4e7] shadow-[0_8px_20px_rgb(80_48_13_/_10%)]">
                                                {item.kind === "image" ? <HeicPreview src={item.src} alt={item.label} /> : <video src={item.src} poster={paperBackground} className="block h-full w-full bg-[#fff4e7] object-cover" />}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#ffead4]">{index + 1}</p>
                                                        <p className="font-[Cormorant_Garamond] text-[0.9rem] text-[#f7dfca]">Open</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}

                                        {remainingGallery.length > 0 && (
                                            <button type="button" onClick={() => { const next = remainingGallery.slice(0, INITIAL_GALLERY_LIMIT); setGalleryItems((prev) => [...prev, ...next]); setRemainingGallery((prev) => prev.slice(INITIAL_GALLERY_LIMIT)); }} className="aspect-[3/4] rounded-[0.9rem] border border-dashed border-[#8f5a20]/35 bg-[#ffead4]/80 px-4 py-4 font-[Adamina] text-[0.82rem] uppercase tracking-[0.08em] text-[#7a3f00]">Load more</button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button type="button" onClick={() => setCurrentGalleryIndex((prev) => (prev + 1) % galleryItems.length)} disabled={galleryItems.length <= 1} className="hidden items-center justify-center border-l border-[#8f5a20]/15 bg-[#fff4e7] px-4 py-6 text-[#7a3f00] transition hover:bg-[#f6dfc1] disabled:cursor-not-allowed disabled:opacity-40 lg:flex" aria-label="Next photo">→</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/25 shadow-[0_12px_28px_rgb(80_48_13_/_12%)]">
                <div
                    className="bg-[#5a392b] px-6 py-5 sm:px-8"
                    style={{
                        backgroundImage: `linear-gradient(rgb(90 57 43 / 0.97), rgb(90 57 43 / 0.97)), url(${paperBackground})`,
                        backgroundSize: "cover"
                    }}
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Itinerary</p>
                            <h2 className="mt-2 font-[Adamina] text-[1.8rem] text-[#fff4e7]">Plan your trip</h2>
                            <p className="mt-2 max-w-2xl font-[Cormorant_Garamond] text-[1.05rem] text-[#f7dfca]">
                                Detailed boards for this country live here: route notes, daily plans, packing, bookings, and linked temporary-gallery photos.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleCreateItinerary}
                            className="rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2 font-[Adamina] text-[0.83rem] uppercase tracking-[0.08em] text-[#5a392b] no-underline transition hover:bg-[#eab681]"
                        >
                            Add new
                        </button>
                    </div>
                </div>

                <div className="bg-[#ffead4]/90 p-6 sm:p-8">
                    {itineraryPreviewItems.length === 0 ? (
                        <div className="rounded-[1rem] border border-dashed border-[#8f5a20]/25 bg-[#fff4e7] p-6 text-[#6a4630]">
                            <p className="font-[Adamina] text-[1rem] text-[#50300d]">No saved itineraries yet</p>
                            <p className="mt-2 font-[Cormorant_Garamond] text-[1.05rem]">
                                Start with a new itinerary on the separate page and it will appear here as a preview.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {itineraryPreviewItems.map((item) => (
                                <article key={item.id} className="overflow-hidden rounded-[1rem] border border-[#8f5a20]/20 bg-[#fff4e7] shadow-[0_6px_16px_rgb(80_48_13_/_10%)]">
                                    <div className="border-b border-[#8f5a20]/12 bg-[#f6dfc1] px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-[Adamina] text-[0.7rem] uppercase tracking-[0.2em] text-[#8f5a20]">Saved itinerary</p>
                                                <h3 className="mt-1 font-[Adamina] text-[1.15rem] text-[#50300d]">{item.title}</h3>
                                            </div>
                                            <span className="rounded-full border border-[#8f5a20]/20 bg-[#fff4e7] px-3 py-1 font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#7a3f00]">
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto]">
                                        <div>
                                            <p className="font-[Cormorant_Garamond] text-[1rem] text-[#6a4630]">
                                                {itineraryDestination(item, resolvedCountryName)}
                                            </p>
                                            <p className="mt-2 line-clamp-4 font-[Cormorant_Garamond] text-[1.02rem] text-[#50300d] whitespace-pre-wrap">
                                                {itineraryPreviewNote(item)}
                                            </p>
                                        </div>

                                        <div className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4] px-4 py-3 text-right">
                                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#8f5a20]">Dates</p>
                                            <p className="mt-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d]">{formatDate(item.startDate)}</p>
                                            <p className="font-[Cormorant_Garamond] text-[0.98rem] text-[#6a4630]">to {formatDate(item.endDate)}</p>
                                            <Link
                                                to={`/itineraries/${encodeURIComponent(resolvedCountryName)}?open=${item.id}`}
                                                className="mt-3 inline-block rounded-full border border-[#cf8d45] bg-[#cf8d45] px-3 py-1 font-[Adamina] text-[0.72rem] uppercase tracking-[0.08em] text-[#5a392b] no-underline transition hover:bg-[#eab681]"
                                            >
                                                Open board
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-[max(2rem,4%)] right-[max(2rem,5%)] flex h-[clamp(2.5rem,8vw,3rem)] w-[clamp(2.5rem,8vw,3rem)] items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:bg-[#7a3f00] hover:-translate-y-1"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <span className="text-xl">↑</span>
                </button>
            )}
        </div>
    );
}

export default CountryTrips;

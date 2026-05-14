import { useEffect, useMemo, useReducer, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCountriesData } from "../hooks/useCountriesData";
import { useScrollToTop } from "../hooks/useScrollToTop";
import paperBackground from "../assets/wrinkled-paper.png";
import type { CountryStatus } from "./Home";
import { decodeCountryParam } from "../utils/countryRouting";
import {
    type ItineraryItem,
    type ItineraryLocationType,
    type ItineraryStatus,
    itineraryKey,
    readItineraries,
    seedItinerariesFromCatalog
} from "../utils/itineraryStorage";

type CountryStatusMap = Record<string, CountryStatus>;
type CountryAddedDateMap = Record<string, string>;
type GalleryMediaKind = "image" | "video";

interface ItinerariesProps {
    countryStatuses?: CountryStatusMap;
    countryAddedDates?: CountryAddedDateMap;
}

type ItineraryAction =
    | { type: "hydrate"; payload: ItineraryItem[] }
    | { type: "update"; payload: ItineraryItem }
    | { type: "remove"; payload: string };

interface TripGalleryItem {
    id: string;
    src: string;
    path: string;
    kind: GalleryMediaKind;
}

type SummaryEntry = NonNullable<ItineraryItem["summary"]>[number];
type DayEntry = NonNullable<ItineraryItem["dayPlan"]>[number];
type PackingGroup = NonNullable<ItineraryItem["packingList"]>[number];
type ChecklistEntry = NonNullable<ItineraryItem["checklist"]>[number];
type HotelEntry = NonNullable<ItineraryItem["hotels"]>[number];
type TransportEntry = NonNullable<ItineraryItem["transport"]>[number];
type NoteEntry = NonNullable<ItineraryItem["notes"]>[number];

const galleryManifestUrl = `${import.meta.env.BASE_URL}temporary-gallery/manifest.json`;
const galleryPublicRoot = `${import.meta.env.BASE_URL}temporary-gallery/`;
const imageExtensions = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "bmp", "svg"]);
const videoExtensions = new Set(["mp4", "mov", "webm", "m4v", "avi", "mkv", "wmv", "flv", "3gp", "mpeg"]);
const STATUS_LABELS: Record<ItineraryStatus, string> = {
    planned: "Planned",
    "in-progress": "In progress",
    done: "Done"
};

function extensionOf(path: string): string {
    const match = path.match(/\.([a-z0-9]+)(?:$|[?#])/i);
    return match ? match[1].toLowerCase() : "";
}

function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function toPublicGalleryUrl(path: string): string {
    return `${galleryPublicRoot}${path}`;
}

function matchesGalleryFilter(path: string, itinerary: ItineraryItem): boolean {
    const normalizedPath = normalize(path);
    const filters = itinerary.galleryFilters ?? [];

    if (filters.length > 0) {
        return filters.some((filter) => {
            const countryMatches = normalizedPath.startsWith(`${normalize(filter.country)}/`);
            const cityMatches = filter.city ? normalizedPath.includes(`/${normalize(filter.city)}/`) : true;
            return countryMatches && cityMatches;
        });
    }

    const city = itinerary.city ? normalize(itinerary.city) : "";
    const destination = itinerary.destination ? normalize(itinerary.destination) : "";
    return Boolean(city && normalizedPath.includes(`/${city}/`)) || Boolean(destination && normalizedPath.includes(destination));
}

function itineraryReducer(state: ItineraryItem[], action: ItineraryAction): ItineraryItem[] {
    if (action.type === "hydrate") return action.payload;
    if (action.type === "update") return state.map((item) => (item.id === action.payload.id ? action.payload : item));
    if (action.type === "remove") return state.filter((item) => item.id !== action.payload);
    return state;
}

function makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string): string {
    if (!value) return "Not set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function displayValue(value: string | undefined): string {
    return value && value.trim().length > 0 ? value : "Not set";
}

function CheckMark({ done }: { done: boolean }) {
    return (
        <span className={[
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.3rem] border text-[0.72rem] font-semibold",
            done ? "border-[#7a3f00] bg-[#7a3f00] text-[#fff4e7]" : "border-[#8f5a20]/35 bg-[#fffaf4] text-transparent"
        ].join(" ")}>
            {done ? "✓" : ""}
        </span>
    );
}

function FieldLabel({ children }: { children: string }) {
    return <span className="font-[Adamina] text-[0.68rem] uppercase tracking-[0.12em] text-[#8f5a20]">{children}</span>;
}

function StaticField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
    return (
        <div className={["grid gap-1 rounded-[0.75rem] border border-[#8f5a20]/12 bg-[#fffaf4] px-4 py-3", className].join(" ")}>
            <FieldLabel>{label}</FieldLabel>
            <p className="font-[Cormorant_Garamond] text-[1.08rem] leading-[1.3] text-[#50300d] whitespace-pre-wrap">{value}</p>
        </div>
    );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "min-h-11 rounded-[0.65rem] border border-[#8f5a20]/20 bg-[#fffaf4] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/25",
                props.className ?? ""
            ].join(" ")}
        />
    );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={[
                "rounded-[0.65rem] border border-[#8f5a20]/20 bg-[#fffaf4] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/25",
                props.className ?? ""
            ].join(" ")}
        />
    );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={[
                "min-h-11 rounded-[0.65rem] border border-[#8f5a20]/20 bg-[#fffaf4] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/25",
                props.className ?? ""
            ].join(" ")}
        />
    );
}

function SmallButton({ children, tone = "light", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "light" | "solid" | "danger" }) {
    const classes = tone === "solid"
        ? "border-[#cf8d45] bg-[#cf8d45] text-[#5a392b] hover:bg-[#eab681]"
        : tone === "danger"
            ? "border-[#b16a55]/45 bg-[#fff4e7] text-[#8d3324] hover:bg-[#f6dfc1]"
            : "border-[#8f5a20]/30 bg-[#fffaf4] text-[#7a3f00] hover:bg-[#f6dfc1]";

    return (
        <button
            {...props}
            className={[
                "min-h-10 rounded-full border px-3 py-1 font-[Adamina] text-[0.68rem] uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-45",
                classes,
                props.className ?? ""
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function SectionShell({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="overflow-hidden rounded-[1rem] border border-[#8f5a20]/20 bg-[#fffaf4] shadow-[0_10px_24px_rgb(80_48_13_/_10%)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#8f5a20]/15 bg-[#ffead4]/75 px-5 py-4 sm:px-6">
                <div>
                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.22em] text-[#8f5a20]">{eyebrow}</p>
                    <h2 className="mt-2 font-[Adamina] text-[1.35rem] text-[#50300d]">{title}</h2>
                </div>
                {action}
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

function Itineraries(props: ItinerariesProps) {
    void props.countryStatuses;
    void props.countryAddedDates;

    const { countryName: encodedCountryName = "" } = useParams();
    const routeCountryName = decodeCountryParam(encodedCountryName).trim();
    const { countriesData } = useCountriesData();
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const location = useLocation();
    const navigate = useNavigate();

    const [itineraries, dispatchItineraries] = useReducer(itineraryReducer, []);
    const [manifestPaths, setManifestPaths] = useState<string[]>([]);
    const [editingItineraryId, setEditingItineraryId] = useState<string | null>(null);

    const countryNames = useMemo(() => {
        if (!countriesData) return [];

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

    useEffect(() => {
        const seeded = routeCountryName ? seedItinerariesFromCatalog(routeCountryName) : [];
        const payload = seeded.length > 0 ? seeded : (routeCountryName ? readItineraries(routeCountryName) : []);
        dispatchItineraries({ type: "hydrate", payload });
    }, [routeCountryName]);

    const focusedItineraryId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get("open");
    }, [location.search]);

    useEffect(() => {
        if (!routeCountryName) return;

        try {
            localStorage.setItem(itineraryKey(routeCountryName), JSON.stringify(itineraries));
        } catch {
            // Ignore storage failures.
        }
    }, [itineraries, routeCountryName]);

    useEffect(() => {
        let cancelled = false;

        const loadManifest = async () => {
            try {
                const response = await fetch(galleryManifestUrl);
                if (!response.ok) throw new Error(`Manifest error: ${response.status}`);
                const data: unknown = await response.json();
                if (!cancelled) {
                    setManifestPaths(Array.isArray(data) ? data.filter((entry): entry is string => typeof entry === "string") : []);
                }
            } catch {
                if (!cancelled) setManifestPaths([]);
            }
        };

        void loadManifest();
        return () => {
            cancelled = true;
        };
    }, []);

    const primaryItinerary = useMemo(() => {
        if (focusedItineraryId) {
            const found = itineraries.find((it) => it.id === focusedItineraryId);
            if (found) return found;
        }

        return itineraries[0] ?? null;
    }, [focusedItineraryId, itineraries]);

    const canShowGallery = primaryItinerary?.status !== "planned";

    const tripGalleryItems = useMemo<TripGalleryItem[]>(() => {
        if (!primaryItinerary || !canShowGallery) return [];

        return manifestPaths
            .filter((path) => matchesGalleryFilter(path, primaryItinerary))
            .map((path) => {
                const ext = extensionOf(path);
                const kind: GalleryMediaKind = videoExtensions.has(ext) ? "video" : "image";
                return { id: path, src: toPublicGalleryUrl(path), path, kind };
            })
            .filter((item) => imageExtensions.has(extensionOf(item.path)) || videoExtensions.has(extensionOf(item.path)));
    }, [canShowGallery, manifestPaths, primaryItinerary]);

    const updateCurrent = (patch: Partial<ItineraryItem>) => {
        if (!primaryItinerary) return;

        dispatchItineraries({
            type: "update",
            payload: {
                ...primaryItinerary,
                ...patch,
                updatedAt: new Date().toISOString()
            }
        });
    };

    const deleteCurrent = () => {
        if (!primaryItinerary) return;

        setEditingItineraryId(null);
        dispatchItineraries({ type: "remove", payload: primaryItinerary.id });
        const next = itineraries.find((item) => item.id !== primaryItinerary.id);
        navigate(
            {
                pathname: location.pathname,
                search: next?.id ? `?open=${encodeURIComponent(next.id)}` : ""
            },
            { replace: true }
        );
    };

    const updateSummary = (summary: SummaryEntry[]) => updateCurrent({ summary });
    const updateDays = (dayPlan: DayEntry[]) => updateCurrent({ dayPlan });
    const updatePacking = (packingList: PackingGroup[]) => updateCurrent({ packingList });
    const updateChecklist = (checklist: ChecklistEntry[]) => updateCurrent({ checklist });
    const updateHotels = (hotels: HotelEntry[]) => updateCurrent({ hotels });
    const updateTransport = (transport: TransportEntry[]) => updateCurrent({ transport });
    const updateNotes = (notes: NoteEntry[]) => updateCurrent({ notes });

    if (!routeCountryName) {
        return (
            <section className="mx-auto w-full max-w-[min(95vw,1180px)] px-[max(1.25rem,5%)] py-[max(2.2rem,7vh)]">
                <p className="font-[Adamina] text-[1.2rem] text-[#50300d]">No country selected.</p>
                <Link to="/countries" className="font-[Cormorant_Garamond] text-[1.15rem] text-[#7a3f00] underline underline-offset-4">Back to Countries</Link>
            </section>
        );
    }

    if (!primaryItinerary) {
        return (
            <div className="mx-auto w-full max-w-[min(95vw,1040px)] px-[max(1rem,4%)] py-[max(2rem,7vh)]">
                <section className="rounded-[1rem] border border-dashed border-[#8f5a20]/35 bg-[#fffaf4] p-6 text-[#50300d]">
                    <p className="font-[Adamina] text-[1.2rem]">No itinerary found for {resolvedCountryName}</p>
                    <p className="mt-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#6a4630]">Create a trip from the country page, then open the board here.</p>
                    <Link to={`/trips/${encodeURIComponent(resolvedCountryName)}`} className="mt-4 inline-block rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2 font-[Adamina] text-[0.78rem] uppercase tracking-[0.08em] text-[#5a392b] no-underline transition hover:bg-[#eab681]">Back to country</Link>
                </section>
            </div>
        );
    }

    const summary = primaryItinerary.summary ?? [];
    const dayPlan = primaryItinerary.dayPlan ?? [];
    const packingList = primaryItinerary.packingList ?? [];
    const checklist = primaryItinerary.checklist ?? [];
    const hotels = primaryItinerary.hotels ?? [];
    const transport = primaryItinerary.transport ?? [];
    const notes = primaryItinerary.notes ?? [];
    const isEditing = editingItineraryId === primaryItinerary.id;

    return (
        <div className="mx-auto w-full max-w-[min(96vw,1440px)] px-[max(1rem,4%)] pb-[max(3.5rem,10vh)] pt-[max(1.5rem,4vh)] text-[#50300d]">
            <section className="overflow-hidden rounded-[1.1rem] border border-[#8f5a20]/30 bg-[#fff4e7] shadow-[0_18px_42px_rgb(80_48_13_/_16%)]">
                <div
                    className="bg-[#5a392b] p-6 text-[#fff4e7] sm:p-8"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.95), rgb(90 57 43 / 0.98)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="max-w-3xl">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Trip planner</p>
                            <h1 className="mt-3 font-[Adamina] text-[clamp(2rem,5vw,3.8rem)] leading-tight">{primaryItinerary.title}</h1>
                            <p className="mt-4 font-[Cormorant_Garamond] text-[1.22rem] leading-[1.35] text-[#f7dfca]">{primaryItinerary.description}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link to={`/trips/${encodeURIComponent(resolvedCountryName)}`} className="rounded-full border border-[#ffead4]/45 bg-[#ffead4]/12 px-4 py-2 font-[Adamina] text-[0.78rem] uppercase tracking-[0.08em] text-[#ffead4] no-underline transition hover:bg-[#ffead4]/22">Back to country</Link>
                            <div className="flex overflow-hidden rounded-full border border-[#ffead4]/40 bg-[#ffead4]/12">
                                <button
                                    type="button"
                                    onClick={() => setEditingItineraryId(null)}
                                    className={[
                                        "px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition",
                                        !isEditing ? "bg-[#ffead4] text-[#5a392b]" : "text-[#ffead4] hover:bg-[#ffead4]/18"
                                    ].join(" ")}
                                >
                                    View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingItineraryId(primaryItinerary.id)}
                                    className={[
                                        "px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition",
                                        isEditing ? "bg-[#cf8d45] text-[#5a392b]" : "text-[#ffead4] hover:bg-[#ffead4]/18"
                                    ].join(" ")}
                                >
                                    Edit
                                </button>
                            </div>
                            {isEditing && <SmallButton type="button" tone="danger" onClick={deleteCurrent}>Delete trip</SmallButton>}
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    <div className="grid gap-4 bg-[#ffead4]/90 p-5 sm:p-6 lg:grid-cols-3">
                        <label className="grid gap-1">
                            <FieldLabel>Title</FieldLabel>
                            <TextInput value={primaryItinerary.title} onChange={(event) => updateCurrent({ title: event.target.value })} />
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>Status</FieldLabel>
                            <SelectInput value={primaryItinerary.status} onChange={(event) => {
                                const status = event.target.value as ItineraryStatus;
                                updateCurrent({
                                    status,
                                    galleryFilters: status === "planned" ? [] : primaryItinerary.galleryFilters
                                });
                            }}>
                                <option value="planned">Planned</option>
                                <option value="in-progress">In progress</option>
                                <option value="done">Done</option>
                            </SelectInput>
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>Location type</FieldLabel>
                            <SelectInput value={primaryItinerary.locationType} onChange={(event) => updateCurrent({ locationType: event.target.value as ItineraryLocationType })}>
                                <option value="country">Country-wide</option>
                                <option value="city">City</option>
                            </SelectInput>
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>Destination</FieldLabel>
                            <TextInput value={primaryItinerary.destination ?? ""} onChange={(event) => updateCurrent({ destination: event.target.value })} />
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>City</FieldLabel>
                            <TextInput value={primaryItinerary.city} onChange={(event) => updateCurrent({ city: event.target.value })} />
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>Travel style</FieldLabel>
                            <TextInput value={primaryItinerary.travelStyle ?? ""} onChange={(event) => updateCurrent({ travelStyle: event.target.value })} />
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>Start date</FieldLabel>
                            <TextInput type="date" value={primaryItinerary.startDate} onChange={(event) => updateCurrent({ startDate: event.target.value })} />
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>End date</FieldLabel>
                            <TextInput type="date" value={primaryItinerary.endDate} onChange={(event) => updateCurrent({ endDate: event.target.value })} />
                        </label>
                        <label className="grid gap-1">
                            <FieldLabel>Budget</FieldLabel>
                            <TextInput value={primaryItinerary.budget ?? ""} onChange={(event) => updateCurrent({ budget: event.target.value })} />
                        </label>
                        <label className="grid gap-1 lg:col-span-3">
                            <FieldLabel>Mood</FieldLabel>
                            <TextInput value={primaryItinerary.mood ?? ""} onChange={(event) => updateCurrent({ mood: event.target.value })} />
                        </label>
                        <label className="grid gap-1 lg:col-span-3">
                            <FieldLabel>Description</FieldLabel>
                            <TextArea rows={3} value={primaryItinerary.description} onChange={(event) => updateCurrent({ description: event.target.value })} />
                        </label>
                    </div>
                ) : (
                    <div className="grid gap-4 bg-[#ffead4]/90 p-5 sm:p-6 lg:grid-cols-3">
                        <StaticField label="Status" value={STATUS_LABELS[primaryItinerary.status]} />
                        <StaticField label="Location type" value={primaryItinerary.locationType === "country" ? "Country-wide" : "City"} />
                        <StaticField label="Destination" value={displayValue(primaryItinerary.destination)} />
                        <StaticField label="City" value={displayValue(primaryItinerary.city)} />
                        <StaticField label="Travel style" value={displayValue(primaryItinerary.travelStyle)} />
                        <StaticField label="Budget" value={displayValue(primaryItinerary.budget)} />
                        <StaticField label="Start date" value={formatDate(primaryItinerary.startDate)} />
                        <StaticField label="End date" value={formatDate(primaryItinerary.endDate)} />
                        <StaticField label="Mood" value={displayValue(primaryItinerary.mood)} className="lg:col-span-3" />
                        <StaticField label="Description" value={displayValue(primaryItinerary.description)} className="lg:col-span-3" />
                    </div>
                )}
            </section>

            <div className="mt-8 grid gap-8">
                <SectionShell
                    eyebrow="Journey plan"
                    title="Summary database"
                    action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updateSummary([...summary, { label: "New detail", value: "" }])}>Add row</SmallButton> : undefined}
                >
                    {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {summary.map((item, index) => (
                                <article key={`${item.label}-${index}`} className="grid gap-3 rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/60 p-4">
                                    <TextInput value={item.label} onChange={(event) => updateSummary(summary.map((entry, entryIndex) => entryIndex === index ? { ...entry, label: event.target.value } : entry))} />
                                    <TextArea rows={3} value={item.value} onChange={(event) => updateSummary(summary.map((entry, entryIndex) => entryIndex === index ? { ...entry, value: event.target.value } : entry))} />
                                    <SmallButton type="button" tone="danger" onClick={() => updateSummary(summary.filter((_, entryIndex) => entryIndex !== index))}>Delete row</SmallButton>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {summary.map((item, index) => (
                                <article key={`${item.label}-${index}`} className="rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/60 p-4">
                                    <p className="font-[Adamina] text-[0.75rem] uppercase tracking-[0.12em] text-[#8f5a20]">{item.label}</p>
                                    <p className="mt-3 font-[Cormorant_Garamond] text-[1.08rem] leading-[1.35] text-[#50300d] whitespace-pre-wrap">{displayValue(item.value)}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </SectionShell>

                <SectionShell
                    eyebrow="Itinerary database"
                    title="Day-by-day plan"
                    action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updateDays([...dayPlan, { day: `Day ${dayPlan.length + 1}`, date: "", title: "New activity", time: "", location: "", notes: "", log: "" }])}>Add day</SmallButton> : undefined}
                >
                    {isEditing ? (
                        <div className="space-y-4">
                            {dayPlan.map((day, index) => (
                                <article key={`${day.day}-${index}`} className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                    <div className="grid gap-3 lg:grid-cols-[0.6fr_0.75fr_1fr_0.75fr]">
                                        <TextInput value={day.day} onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, day: event.target.value } : entry))} />
                                        <TextInput value={day.date} placeholder="Date" onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, date: event.target.value } : entry))} />
                                        <TextInput value={day.title} placeholder="Title" onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry))} />
                                        <TextInput value={day.time} placeholder="Time" onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, time: event.target.value } : entry))} />
                                    </div>
                                    <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr_1fr]">
                                        <TextInput value={day.location} placeholder="Location" onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, location: event.target.value } : entry))} />
                                        <TextInput value={day.log ?? ""} placeholder="Travel log note" onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, log: event.target.value } : entry))} />
                                    </div>
                                    <TextArea className="mt-3" rows={3} value={day.notes} placeholder="Notes" onChange={(event) => updateDays(dayPlan.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} />
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                        <SmallButton type="button" disabled={index === 0} onClick={() => {
                                            const next = [...dayPlan];
                                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                            updateDays(next);
                                        }}>Move up</SmallButton>
                                        <SmallButton type="button" disabled={index === dayPlan.length - 1} onClick={() => {
                                            const next = [...dayPlan];
                                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                            updateDays(next);
                                        }}>Move down</SmallButton>
                                        <SmallButton type="button" tone="danger" onClick={() => updateDays(dayPlan.filter((_, entryIndex) => entryIndex !== index))}>Delete</SmallButton>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dayPlan.map((day, index) => (
                                <article key={`${day.day}-${index}`} className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.12em] text-[#8f5a20]">{displayValue(day.day)}</p>
                                            <h3 className="mt-2 font-[Adamina] text-[1.2rem] text-[#50300d]">{displayValue(day.title)}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-[Cormorant_Garamond] text-[1rem] text-[#50300d]">{displayValue(day.date)}</p>
                                            <p className="font-[Cormorant_Garamond] text-[0.98rem] text-[#6a4630]">{displayValue(day.time)}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 font-[Cormorant_Garamond] text-[1.05rem] text-[#6a4630]">{displayValue(day.location)}</p>
                                    <p className="mt-3 font-[Cormorant_Garamond] text-[1.08rem] leading-[1.35] text-[#50300d] whitespace-pre-wrap">{displayValue(day.notes)}</p>
                                    {day.log && <p className="mt-3 rounded-[0.7rem] bg-[#fffaf4] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] italic text-[#6a4630]">{day.log}</p>}
                                </article>
                            ))}
                        </div>
                    )}
                </SectionShell>

                <section className="grid gap-8 lg:grid-cols-2">
                    <SectionShell
                        eyebrow="Packing list"
                        title="Categories and items"
                        action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updatePacking([...packingList, { group: "New category", done: false, items: [] }])}>Add category</SmallButton> : undefined}
                    >
                        {isEditing ? (
                            <div className="space-y-4">
                                {packingList.map((group, groupIndex) => (
                                    <article key={`${group.group}-${groupIndex}`} className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={() => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, done: !entry.done } : entry))}>
                                                <CheckMark done={group.done} />
                                            </button>
                                            <TextInput value={group.group} onChange={(event) => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, group: event.target.value } : entry))} />
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {group.items.map((item, itemIndex) => (
                                                <div key={`${item.name}-${itemIndex}`} className="grid gap-2 sm:grid-cols-[auto_1fr_7rem_auto]">
                                                    <button type="button" onClick={() => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, items: entry.items.map((innerItem, innerIndex) => innerIndex === itemIndex ? { ...innerItem, done: !innerItem.done } : innerItem) } : entry))}>
                                                        <CheckMark done={item.done} />
                                                    </button>
                                                    <TextInput value={item.name} onChange={(event) => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, items: entry.items.map((innerItem, innerIndex) => innerIndex === itemIndex ? { ...innerItem, name: event.target.value } : innerItem) } : entry))} />
                                                    <TextInput value={item.quantity ?? ""} placeholder="Qty" onChange={(event) => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, items: entry.items.map((innerItem, innerIndex) => innerIndex === itemIndex ? { ...innerItem, quantity: event.target.value } : innerItem) } : entry))} />
                                                    <SmallButton type="button" tone="danger" onClick={() => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, items: entry.items.filter((_, innerIndex) => innerIndex !== itemIndex) } : entry))}>Delete</SmallButton>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                            <SmallButton type="button" onClick={() => updatePacking(packingList.map((entry, entryIndex) => entryIndex === groupIndex ? { ...entry, items: [...entry.items, { name: "New item", done: false }] } : entry))}>Add item</SmallButton>
                                            <SmallButton type="button" tone="danger" onClick={() => updatePacking(packingList.filter((_, entryIndex) => entryIndex !== groupIndex))}>Delete category</SmallButton>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {packingList.map((group, groupIndex) => (
                                    <article key={`${group.group}-${groupIndex}`} className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                        <div className="flex items-center gap-3">
                                            <CheckMark done={group.done} />
                                            <h3 className="font-[Adamina] text-[1rem] text-[#50300d]">{displayValue(group.group)}</h3>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {group.items.map((item, itemIndex) => (
                                                <div key={`${item.name}-${itemIndex}`} className="grid gap-2 sm:grid-cols-[auto_1fr_7rem]">
                                                    <CheckMark done={item.done} />
                                                    <p className="font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{displayValue(item.name)}</p>
                                                    <p className="font-[Cormorant_Garamond] text-[1rem] text-[#6a4630]">{displayValue(item.quantity)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </SectionShell>

                    <SectionShell
                        eyebrow="Checklist"
                        title="Custom tasks"
                        action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updateChecklist([...checklist, { task: "New task", done: false, due: "" }])}>Add task</SmallButton> : undefined}
                    >
                        {isEditing ? (
                            <div className="space-y-3">
                                {checklist.map((item, index) => (
                                    <div key={`${item.task}-${index}`} className="grid gap-2 rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-3 sm:grid-cols-[auto_1fr_8rem_auto]">
                                        <button type="button" onClick={() => updateChecklist(checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, done: !entry.done } : entry))}>
                                            <CheckMark done={item.done} />
                                        </button>
                                        <TextInput value={item.task} onChange={(event) => updateChecklist(checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, task: event.target.value } : entry))} />
                                        <TextInput value={item.due ?? ""} placeholder="Due" onChange={(event) => updateChecklist(checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, due: event.target.value } : entry))} />
                                        <SmallButton type="button" tone="danger" onClick={() => updateChecklist(checklist.filter((_, entryIndex) => entryIndex !== index))}>Delete</SmallButton>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {checklist.map((item, index) => (
                                    <div key={`${item.task}-${index}`} className="grid gap-2 rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-3 sm:grid-cols-[auto_1fr_8rem]">
                                        <CheckMark done={item.done} />
                                        <p className="font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d]">{displayValue(item.task)}</p>
                                        <p className="font-[Cormorant_Garamond] text-[1rem] text-[#6a4630]">{displayValue(item.due)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionShell>
                </section>

                <section className="grid gap-8 lg:grid-cols-2">
                    <SectionShell
                        eyebrow="Bookings"
                        title="Transport"
                        action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updateTransport([...transport, { name: "New transport", mode: "", departure: "", arrival: "", person: "", fare: "", notes: "" }])}>Add transport</SmallButton> : undefined}
                    >
                        {isEditing ? (
                            <div className="space-y-4">
                                {transport.map((item, index) => (
                                    <article key={`${item.name}-${index}`} className="grid gap-3 rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <TextInput value={item.name} placeholder="Name" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, name: event.target.value } : entry))} />
                                            <TextInput value={item.mode} placeholder="Mode" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, mode: event.target.value } : entry))} />
                                            <TextInput value={item.departure} placeholder="Departure" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, departure: event.target.value } : entry))} />
                                            <TextInput value={item.arrival} placeholder="Arrival" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, arrival: event.target.value } : entry))} />
                                            <TextInput value={item.person ?? ""} placeholder="Person" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, person: event.target.value } : entry))} />
                                            <TextInput value={item.fare ?? ""} placeholder="Fare" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, fare: event.target.value } : entry))} />
                                        </div>
                                        <TextArea rows={2} value={item.notes ?? ""} placeholder="Notes" onChange={(event) => updateTransport(transport.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} />
                                        <SmallButton type="button" tone="danger" onClick={() => updateTransport(transport.filter((_, entryIndex) => entryIndex !== index))}>Delete transport</SmallButton>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {transport.map((item, index) => (
                                    <article key={`${item.name}-${index}`} className="rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <StaticField label="Name" value={displayValue(item.name)} />
                                            <StaticField label="Mode" value={displayValue(item.mode)} />
                                            <StaticField label="Departure" value={displayValue(item.departure)} />
                                            <StaticField label="Arrival" value={displayValue(item.arrival)} />
                                            <StaticField label="Person" value={displayValue(item.person)} />
                                            <StaticField label="Fare" value={displayValue(item.fare)} />
                                        </div>
                                        {item.notes && <p className="mt-3 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d] whitespace-pre-wrap">{item.notes}</p>}
                                    </article>
                                ))}
                            </div>
                        )}
                    </SectionShell>

                    <SectionShell
                        eyebrow="Bookings"
                        title="Hotels"
                        action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updateHotels([...hotels, { name: "New hotel", status: "Draft", checkIn: "", checkOut: "", location: "", notes: "" }])}>Add hotel</SmallButton> : undefined}
                    >
                        {isEditing ? (
                            <div className="space-y-4">
                                {hotels.map((hotel, index) => (
                                    <article key={`${hotel.name}-${index}`} className="grid gap-3 rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <TextInput value={hotel.name} placeholder="Name" onChange={(event) => updateHotels(hotels.map((entry, entryIndex) => entryIndex === index ? { ...entry, name: event.target.value } : entry))} />
                                            <TextInput value={hotel.status} placeholder="Status" onChange={(event) => updateHotels(hotels.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: event.target.value } : entry))} />
                                            <TextInput value={hotel.checkIn} placeholder="Check-in" onChange={(event) => updateHotels(hotels.map((entry, entryIndex) => entryIndex === index ? { ...entry, checkIn: event.target.value } : entry))} />
                                            <TextInput value={hotel.checkOut} placeholder="Check-out" onChange={(event) => updateHotels(hotels.map((entry, entryIndex) => entryIndex === index ? { ...entry, checkOut: event.target.value } : entry))} />
                                        </div>
                                        <TextInput value={hotel.location} placeholder="Location" onChange={(event) => updateHotels(hotels.map((entry, entryIndex) => entryIndex === index ? { ...entry, location: event.target.value } : entry))} />
                                        <TextArea rows={2} value={hotel.notes ?? ""} placeholder="Notes" onChange={(event) => updateHotels(hotels.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} />
                                        <SmallButton type="button" tone="danger" onClick={() => updateHotels(hotels.filter((_, entryIndex) => entryIndex !== index))}>Delete hotel</SmallButton>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {hotels.map((hotel, index) => (
                                    <article key={`${hotel.name}-${index}`} className="rounded-[0.75rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <StaticField label="Name" value={displayValue(hotel.name)} />
                                            <StaticField label="Status" value={displayValue(hotel.status)} />
                                            <StaticField label="Check-in" value={displayValue(hotel.checkIn)} />
                                            <StaticField label="Check-out" value={displayValue(hotel.checkOut)} />
                                        </div>
                                        <div className="mt-3">
                                            <StaticField label="Location" value={displayValue(hotel.location)} />
                                        </div>
                                        {hotel.notes && <p className="mt-3 font-[Cormorant_Garamond] text-[1.05rem] text-[#50300d] whitespace-pre-wrap">{hotel.notes}</p>}
                                    </article>
                                ))}
                            </div>
                        )}
                    </SectionShell>
                </section>

                <SectionShell
                    eyebrow="Trip diary"
                    title="Notes"
                    action={isEditing ? <SmallButton type="button" tone="solid" onClick={() => updateNotes([...notes, { id: makeId("note"), date: new Date().toISOString().slice(0, 10), title: "New note", text: "", style: "plain" }])}>Add note</SmallButton> : undefined}
                >
                    {isEditing ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {notes.map((note, index) => (
                                <article key={note.id} className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                    <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                                        <TextInput value={note.title} onChange={(event) => updateNotes(notes.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry))} />
                                        <TextInput type="date" value={note.date} onChange={(event) => updateNotes(notes.map((entry, entryIndex) => entryIndex === index ? { ...entry, date: event.target.value } : entry))} />
                                    </div>
                                    <SelectInput className="mt-3" value={note.style ?? "plain"} onChange={(event) => updateNotes(notes.map((entry, entryIndex) => entryIndex === index ? { ...entry, style: event.target.value as NoteEntry["style"] } : entry))}>
                                        <option value="plain">Plain</option>
                                        <option value="handwritten">Handwritten</option>
                                    </SelectInput>
                                    <TextArea
                                        rows={5}
                                        value={note.text}
                                        onChange={(event) => updateNotes(notes.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: event.target.value } : entry))}
                                        className={note.style === "handwritten" ? "mt-3 text-[1.25rem] italic leading-relaxed" : "mt-3"}
                                        placeholder="Write a diary note, scanned note text, recap, or memory..."
                                    />
                                    <SmallButton className="mt-3" type="button" tone="danger" onClick={() => updateNotes(notes.filter((_, entryIndex) => entryIndex !== index))}>Delete note</SmallButton>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {notes.map((note) => (
                                <article key={note.id} className="rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4]/55 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className="font-[Adamina] text-[1.05rem] text-[#50300d]">{displayValue(note.title)}</h3>
                                        <p className="font-[Cormorant_Garamond] text-[0.98rem] text-[#6a4630]">{formatDate(note.date)}</p>
                                    </div>
                                    <p className="mt-2 font-[Adamina] text-[0.68rem] uppercase tracking-[0.12em] text-[#8f5a20]">{note.style === "handwritten" ? "Handwritten style" : "Plain note"}</p>
                                    <p className={["mt-3 whitespace-pre-wrap font-[Cormorant_Garamond] text-[1.08rem] leading-[1.4] text-[#50300d]", note.style === "handwritten" ? "text-[1.18rem] italic" : ""].join(" ")}>
                                        {displayValue(note.text)}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </SectionShell>

                {canShowGallery && (
                    <SectionShell eyebrow="Gallery" title="Trip photos">
                        {tripGalleryItems.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {tripGalleryItems.map((item) => (
                                    <div key={item.id} className="overflow-hidden rounded-[0.85rem] border border-[#8f5a20]/15 bg-[#ffead4] shadow-[0_8px_18px_rgb(80_48_13_/_10%)]">
                                        <div className="aspect-[4/3]">
                                            {item.kind === "video" ? (
                                                <video src={item.src} controls muted playsInline className="h-full w-full object-cover" />
                                            ) : (
                                                <img src={item.src} alt={item.path} className="h-full w-full object-cover" loading="lazy" />
                                            )}
                                        </div>
                                        <p className="truncate px-3 py-2 font-[Cormorant_Garamond] text-[0.95rem] text-[#6a4630]">{item.path}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-[0.75rem] border border-dashed border-[#8f5a20]/25 bg-[#ffead4]/45 p-4 font-[Cormorant_Garamond] text-[1.05rem] text-[#6a4630]">
                                This trip can show photos once matching media exists in temporary-gallery and the trip is linked to that folder.
                            </p>
                        )}
                    </SectionShell>
                )}
            </div>

            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-[max(2rem,4%)] right-[max(2rem,5%)] flex h-[clamp(2.5rem,8vw,3rem)] w-[clamp(2.5rem,8vw,3rem)] items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:-translate-y-1 hover:bg-[#7a3f00]"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <span className="text-xl">↑</span>
                </button>
            )}
        </div>
    );
}

export default Itineraries;

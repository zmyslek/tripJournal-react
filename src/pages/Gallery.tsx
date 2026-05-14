import { useState, useEffect, useMemo, useRef } from 'react';
import CircularGallery from '../components/CircularGallery';
import GalleryQuiz from '../components/GalleryQuiz';
import PhotoUploadButton from '../components/PhotoUploadButton';
import EmptyGalleryState from '../components/EmptyGalleryState';
import PhotoRandomizer from '../components/PhotoRandomizer';
import VideoCard from '../components/VideoCard';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { useGalleryStorage } from '../hooks/useGalleryStorage';
import paperBackground from '../assets/wrinkled-paper.png';
import { getExtensionFromPath, inferMediaKindFromName, type MediaKind } from '../utils/mediaFiles';

interface GalleryItem {
    kind: MediaKind;
    src: string;
    text: string;
}

export type { GalleryItem };

interface GallerySection {
    label: string;
    items: GalleryItem[];
}

const galleryManifestUrl = `${import.meta.env.BASE_URL}temporary-gallery/manifest.json`;
const galleryPublicRoot = `${import.meta.env.BASE_URL}temporary-gallery/`;
const imageExtensions = new Set(['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'tif', 'tiff', 'bmp', 'svg']);
const videoExtensions = new Set(['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'mpeg']);
const videoPosterCache = new Map<string, string>();

let cachedManifestPaths: string[] | null = null;
const initialVisibleItemsPerSection = 15;
const loadMoreStep = 15;

function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
}

function selectRandomImages(items: GalleryItem[], maxCount: number): GalleryItem[] {
    const images = items.filter(item => item.kind === 'image');
    return shuffle(images).slice(0, Math.min(maxCount, images.length));
}

function escapeSvgText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getVideoCoverUrl(source: string, label: string): string {
    const cacheKey = `${source}|${label}`;
    const cached = videoPosterCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const cleanLabel = label.trim() || source.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Video';
    const shortLabel = cleanLabel.length > 34 ? `${cleanLabel.slice(0, 34)}…` : cleanLabel;
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#5a392b" />
                    <stop offset="100%" stop-color="#8f5a20" />
                </linearGradient>
                <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(255,244,231,0.26)" />
                    <stop offset="100%" stop-color="rgba(255,244,231,0.04)" />
                </linearGradient>
            </defs>
            <rect width="1280" height="720" fill="url(#bg)" />
            <rect width="1280" height="720" fill="url(#sheen)" />
            <rect x="72" y="72" width="1136" height="576" rx="38" fill="rgba(255,234,212,0.11)" stroke="rgba(255,234,212,0.28)" stroke-width="3" />
            <circle cx="640" cy="304" r="114" fill="rgba(255,255,255,0.9)" />
            <path d="M606 250v108l95-54-95-54z" fill="#5a392b" />
            <text x="640" y="508" text-anchor="middle" font-family="Adamina, serif" font-size="48" fill="#fff4e7">${escapeSvgText(shortLabel)}</text>
            <text x="640" y="566" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="28" fill="#f6d7b5">Tap to play</text>
        </svg>
    `;

    const coverUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    videoPosterCache.set(cacheKey, coverUrl);
    return coverUrl;
}

function spreadHighlightItems(sections: GallerySection[]): GalleryItem[] {
    const highlightImagesPerSection = 3;
    const buckets = sections
        .map(section => ({
            label: section.label,
            items: selectRandomImages(section.items, highlightImagesPerSection)
        }))
        .filter(bucket => bucket.items.length > 0);

    const spreadItems: GalleryItem[] = [];
    let hasMoreItems = true;

    while (hasMoreItems) {
        hasMoreItems = false;

        for (const bucket of buckets) {
            const nextItem = bucket.items.shift();
            if (nextItem) {
                spreadItems.push(nextItem);
                hasMoreItems = true;
            }
        }
    }

    return spreadItems;
}

function toGalleryPublicUrl(relativePath: string) {
    return `${galleryPublicRoot}${relativePath}`;
}

function buildGalleryCollections(relativePaths: string[]) {
    const sectionMap = new Map<string, Map<string, Array<{ kind: MediaKind; src: string; text: string; ext: string }>>>();
    const looseItemsMap = new Map<string, { kind: MediaKind; src: string; text: string; ext: string }>();

    relativePaths
        .sort((pathA, pathB) => pathA.localeCompare(pathB))
        .forEach(relativePath => {
            const segments = relativePath.split('/');
            const filename = segments[segments.length - 1];
            const ext = getExtensionFromPath(filename);
            const inferredKind = inferMediaKindFromName(filename);
            const kind: MediaKind | null = inferredKind ?? (videoExtensions.has(ext) ? 'video' : imageExtensions.has(ext) ? 'image' : null);

            if (!kind) {
                return;
            }

            const src = toGalleryPublicUrl(relativePath);
            const base = filename.replace(/\.[^/.]+$/, '');

            // Accept files at varying depths. Use the first two segments as country/city
            // so nested folders (country/city/whatever/file.jpg) are included.
            if (segments.length === 1) {
                looseItemsMap.set(base, { kind, src, text: '', ext });
                return;
            }

            if (segments.length >= 2) {
                const countryName = segments[0];
                const cityName = segments.length >= 3 ? segments[1] : 'Imported';
                const sectionLabel = segments.length >= 3 ? `${countryName}/${cityName}` : countryName;
                // Use the rest of the path (after country/city) as the base identifier.
                // Two-segment paths are folder/file imports, so keep them together.
                const remainder = segments.length >= 3 ? segments.slice(2).join('/') || base : filename;
                const sectionBucket = sectionMap.get(sectionLabel) ?? new Map();
                let items: Array<{ kind: MediaKind; src: string; text: string; ext: string }> = sectionBucket.get(remainder) ?? [];
                
                // For images, prefer higher-priority formats (jpg, png, etc.)
                // For videos, keep all (mp4, webm, mov, etc.)
                if (kind === 'image') {
                    const preferredExts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'svg'];
                    const prefIndex = (extName: string) => {
                        const index = preferredExts.indexOf(extName);
                        return index === -1 ? preferredExts.length : index;
                    };
                    const existing = items.find(i => i.kind === 'image');
                    if (!existing || prefIndex(ext) < prefIndex(existing.ext)) {
                        items = items.filter(i => i.kind !== 'image');
                        items.push({ kind, src, text: `${countryName}/${cityName}`, ext });
                    }
                } else if (kind === 'video') {
                    // Always add videos; they will be rendered separately
                    items.push({ kind, src, text: `${countryName}/${cityName}`, ext });
                }

                if (items.length > 0) {
                    sectionBucket.set(remainder, items);
                    sectionMap.set(sectionLabel, sectionBucket);
                }
                return;
            }
        });

    function pickPreferred(itemsMap: Map<string, Array<{ kind: MediaKind; src: string; text: string; ext: string }>>) {
        const out: GalleryItem[] = [];
        for (const entries of itemsMap.values()) {
            for (const entry of entries) {
                out.push({ kind: entry.kind, src: entry.src, text: entry.text });
            }
        }
        return out;
    }

    const sections: GallerySection[] = Array.from(sectionMap.entries())
        .sort(([labelA], [labelB]) => labelA.localeCompare(labelB))
        .map(([label, itemsMap]) => ({
            label,
            items: shuffle(pickPreferred(itemsMap))
        }));

    const looseItems = Array.from(looseItemsMap.values()).map(v => ({ kind: v.kind, src: v.src, text: v.text }));
    const highlights = sections.length > 0 ? spreadHighlightItems(sections) : shuffle(looseItems.filter(item => item.kind === 'image'));

    return {
        highlights,
        sections
    };
}

function getInitialSelectedItems(highlights: GalleryItem[]): GalleryItem[] {
    return highlights;
}

interface GalleryStripProps {
    items: GalleryItem[];
    bend: number;
    onItemClick: (item: GalleryItem) => void;
}

interface ResolvedGalleryItem {
    image: string;
    text: string;
    original: GalleryItem;
}

function GalleryStrip({ items, bend, onItemClick }: GalleryStripProps) {
    const circularItems = useMemo<ResolvedGalleryItem[]>(() => {
        return items.map(item => {
            if (item.kind === 'video') {
                return {
                    image: getVideoCoverUrl(item.src, item.text),
                    text: item.text,
                    original: item
                };
            }

            return {
                image: item.src,
                text: item.text,
                original: item
            };
        });
    }, [items]);

    return (
        <div className="relative w-full max-w-full overflow-hidden">
            <div className="group relative mx-auto h-[clamp(19rem,60svh,44rem)] w-full max-w-full overflow-hidden sm:h-[clamp(22rem,64svh,48rem)]">
                <div className="h-full w-full origin-center transform-gpu transition-transform duration-300 sm:group-hover:scale-[1.01]">
                    <CircularGallery
                        items={circularItems.map(item => ({ image: item.image, text: item.text }))}
                        bend={bend}
                        textColor="#ffead4"
                        borderRadius={0.05}
                        scrollSpeed={1.35}
                        scrollEase={0.06}
                        font="bold clamp(1rem,2.4vw,1.75rem) Adamina"
                        onItemClick={clickedItem => {
                            const match = circularItems.find(item => item.image === clickedItem.image);
                            if (match) {
                                onItemClick(match.original);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function useGalleryManifest(): { paths: string[]; loading: boolean; hasError: boolean } {
    const [paths, setPaths] = useState<string[]>(cachedManifestPaths ?? []);
    const [loading, setLoading] = useState(!cachedManifestPaths);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (cachedManifestPaths) {
            return;
        }

        let cancelled = false;

        const loadManifest = async () => {
            try {
                const response = await fetch(galleryManifestUrl);
                if (!response.ok) {
                    throw new Error(`Manifest error: ${response.status}`);
                }

                const data: unknown = await response.json();
                const validPaths = Array.isArray(data) ? data.filter((entry): entry is string => typeof entry === 'string') : [];

                if (!cancelled) {
                    cachedManifestPaths = validPaths;
                    setPaths(validPaths);
                    setHasError(false);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Gallery manifest load failed:', err);
                    setPaths([]);
                    setHasError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadManifest();

        return () => {
            cancelled = true;
        };
    }, []);

    return { paths, loading, hasError };
}

function Gallery() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { paths: manifestPaths, loading: manifestLoading, hasError: manifestError } = useGalleryManifest();
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const galleryCollections = useMemo(() => buildGalleryCollections(manifestPaths), [manifestPaths]);
    const [selectedItems, setSelectedItems] = useState<GalleryItem[]>(() => getInitialSelectedItems(galleryCollections.highlights));
    const [visibleItemsBySection, setVisibleItemsBySection] = useState<Record<string, number>>({});
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);
    
    // User-uploaded photos
    const { flatPhotos, uploadPhotos, isLoading: isUploading, error: uploadError, deletePhoto } = useGalleryStorage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [visibleUserPhotos, setVisibleUserPhotos] = useState(initialVisibleItemsPerSection);
    const [isEditing, setIsEditing] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    // Combine manifest items with user uploads, and separate images/videos
    const { combinedImages, combinedVideos } = useMemo(() => {
        const userPhotoItems: GalleryItem[] = flatPhotos.map(photo => ({
            kind: inferMediaKindFromName(photo.name, photo.type) ?? 'image',
            src: photo.url,
            text: photo.dateAdded
        }));

        const allItems = [...userPhotoItems, ...galleryCollections.highlights];
        return {
            combinedImages: allItems.filter(i => i.kind === 'image'),
            combinedVideos: allItems.filter(i => i.kind === 'video')
        };
    }, [flatPhotos, galleryCollections.highlights]);

    const combinedAllItems = useMemo(() => [...combinedImages, ...combinedVideos], [combinedImages, combinedVideos]);

    const activeSelectedItems = selectedItems.length > 0 ? selectedItems : [...combinedVideos, ...combinedImages];

    useEffect(() => {
        window.requestAnimationFrame(() => {
            setVisibleItemsBySection(previousState => {
                const nextState: Record<string, number> = {};

                galleryCollections.sections.forEach(section => {
                    nextState[section.label] = previousState[section.label] ?? initialVisibleItemsPerSection;
                });

                return nextState;
            });
        });
    }, [galleryCollections.sections]);

    // Adjust scroll-to-top button so it doesn't overlap the footer
    useEffect(() => {
        function adjustScrollButton() {
            const footer = document.querySelector("footer");
            const baseBottom = window.innerHeight * 0.02;
            if (!footer) {
                setScrollBtnBottom(baseBottom);
                return;
            }

            const rect = footer.getBoundingClientRect();
            const overlap = Math.max(0, window.innerHeight - rect.top);
            const padding = window.innerHeight * 0.01;
            if (overlap > 0) {
                setScrollBtnBottom(baseBottom + overlap + padding);
            } else {
                setScrollBtnBottom(baseBottom);
            }
        }

        adjustScrollButton();
        window.addEventListener("scroll", adjustScrollButton, { passive: true });
        window.addEventListener("resize", adjustScrollButton);
        return () => {
            window.removeEventListener("scroll", adjustScrollButton);
            window.removeEventListener("resize", adjustScrollButton);
        };
    }, []);

    const handleItemClick = (items: GalleryItem[], item: GalleryItem) => {
        const index = items.findIndex(currentItem => currentItem.src === item.src);
        setSelectedItems(items);
        setSelectedIndex(index >= 0 ? index : 0);
        setIsModalOpen(true);
    };

    const handlePrevious = () => {
        if (activeSelectedItems.length === 0) {
            return;
        }

        setSelectedIndex(prev => (prev - 1 + activeSelectedItems.length) % activeSelectedItems.length);
    };

    const handleNext = () => {
        if (activeSelectedItems.length === 0) {
            return;
        }

        setSelectedIndex(prev => (prev + 1) % activeSelectedItems.length);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleLoadMore = (sectionLabel: string) => {
        setVisibleItemsBySection(previousState => ({
            ...previousState,
            [sectionLabel]: (previousState[sectionLabel] ?? initialVisibleItemsPerSection) + loadMoreStep
        }));
    };

    const handleLoadMoreUserPhotos = () => {
        setVisibleUserPhotos(previousCount => previousCount + loadMoreStep);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (files: FileList) => {
        await uploadPhotos(files, 'User Uploads');
    };

    const handleDeleteClick = (photoId: string) => {
        setPhotoToDelete(photoId);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (photoToDelete) {
            await deletePhoto(photoToDelete);
            setIsDeleteConfirmModalOpen(false);
            setPhotoToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteConfirmModalOpen(false);
        setPhotoToDelete(null);
    };

    return (
        <>
            <section className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] pt-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="gallery-title">
                <div
                    className="overflow-hidden rounded-t-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]"
                    style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <div
                        className="relative min-h-[11rem] bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:px-9"
                        style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                    >
                        <div className="relative flex flex-wrap items-start justify-between gap-6">
                            <div className="max-w-[46rem]">
                                <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Travel moments</p>
                                <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4">
                                    <h1 id="gallery-title" className="font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                        Gallery
                                    </h1>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ffead4]/70 bg-[#fff4e7]/10 px-2 py-1 shadow-[0_0_0_1px_rgb(255_234_212_/_14%)]">
                                        <span className="pl-2 font-[Adamina] text-[0.66rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Mode</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className={["min-w-16 rounded-full px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition", !isEditing ? "bg-[#ffead4] text-[#5a392b] shadow-sm" : "text-[#ffead4] hover:bg-[#ffead4]/18"].join(' ')}
                                            aria-pressed={!isEditing}
                                        >
                                            View
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className={["min-w-16 rounded-full px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition", isEditing ? "bg-[#ffead4] text-[#5a392b] shadow-sm" : "text-[#ffead4] hover:bg-[#ffead4]/18"].join(' ')}
                                            aria-pressed={isEditing}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                    Explore your travel photographs and moments from around the world.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <PhotoUploadButton
                                    onUpload={handleFileUpload}
                                    isLoading={isUploading}
                                    inputRef={fileInputRef}
                                />
                                {uploadError && (
                                    <p className="text-sm text-red-600">{uploadError}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Show empty state if no photos at all */}
            {galleryCollections.highlights.length === 0 && flatPhotos.length === 0 && !manifestLoading ? (
                <section className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] py-16">
                    <EmptyGalleryState onUploadClick={handleUploadClick} />
                </section>
            ) : (
                <>
                    <section className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] pb-10 pt-10 text-[#50300d]">
                        {manifestLoading ? (
                            <p className="mb-6 font-[Cormorant_Garamond] text-[1.2rem] text-[#5a392b]">Loading gallery media...</p>
                        ) : null}

                        {manifestError ? (
                            <p className="mb-6 font-[Cormorant_Garamond] text-[1.2rem] text-[#7a3f00]">
                                Gallery media could not be loaded. Check public/temporary-gallery/manifest.json.
                            </p>
                        ) : null}

                        {/* User uploads section */}
                        {flatPhotos.length > 0 && (
                            <div className="mb-12">
                                <div className="mb-4 flex items-end justify-between gap-4">
                                    <div>
                                        <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">Your photos</p>
                                        <h2 className="mt-2 font-[Adamina] text-[clamp(1.8rem,3vw,2.5rem)] leading-none text-[#5a392b]">
                                            Recent Uploads
                                        </h2>
                                    </div>
                                </div>
                                {(() => {
                                    const visiblePhotos = flatPhotos.slice(0, visibleUserPhotos);
                                    const hasMorePhotos = flatPhotos.length > visibleUserPhotos;
                                    
                                    // Separate videos from images
                                    const videoPhotos = visiblePhotos.filter(p => inferMediaKindFromName(p.name, p.type) === 'video');
                                    const imagePhotos = visiblePhotos.filter(p => inferMediaKindFromName(p.name, p.type) !== 'video');

                                    return (
                                        <>
                                            {/* Videos section */}
                                            {videoPhotos.length > 0 && (
                                                <div className="mb-8">
                                                    <p className="mb-3 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">Videos</p>
                                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                                        {videoPhotos.map(video => {
                                                            const posterUrl = getVideoCoverUrl(video.url, video.dateAdded);
                                                            return (
                                                                <VideoCard
                                                                    key={video.id}
                                                                    item={{
                                                                        kind: 'video',
                                                                        src: video.url,
                                                                        text: video.dateAdded
                                                                    }}
                                                                    posterUrl={posterUrl}
                                                                    onClick={() => handleItemClick([
                                                                        ...videoPhotos.map(v => ({
                                                                            kind: 'video' as MediaKind,
                                                                            src: v.url,
                                                                            text: v.dateAdded
                                                                        })),
                                                                        ...imagePhotos.map(p => ({
                                                                            kind: 'image' as MediaKind,
                                                                            src: p.url,
                                                                            text: p.dateAdded
                                                                        }))
                                                                    ], {
                                                                        kind: 'video',
                                                                        src: video.url,
                                                                        text: video.dateAdded
                                                                    })}
                                                                    isEditing={isEditing}
                                                                    onDelete={() => handleDeleteClick(video.id)}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Images section */}
                                            {imagePhotos.length > 0 && (
                                                <>
                                                    {isEditing ? (
                                                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                                            {imagePhotos.map(photo => (
                                                                <div key={photo.id} className="relative">
                                                                    <img src={photo.url} alt={photo.dateAdded} className="h-44 w-full object-cover rounded-lg" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteClick(photo.id)}
                                                                        className="absolute top-2 right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#5a392b] shadow hover:bg-white transition"
                                                                        aria-label={`Delete ${photo.name}`}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <GalleryStrip
                                                            items={imagePhotos.map(photo => ({
                                                                kind: 'image' as const,
                                                                src: photo.url,
                                                                text: photo.dateAdded
                                                            }))}
                                                            bend={0.5}
                                                            onItemClick={item => handleItemClick(
                                                                [
                                                                    ...videoPhotos.map(v => ({
                                                                        kind: 'video' as MediaKind,
                                                                        src: v.url,
                                                                        text: v.dateAdded
                                                                    })),
                                                                    ...imagePhotos.map(p => ({
                                                                        kind: 'image' as MediaKind,
                                                                        src: p.url,
                                                                        text: p.dateAdded
                                                                    }))
                                                                ],
                                                                item
                                                            )}
                                                        />
                                                    )}
                                                </>
                                            )}

                                            {hasMorePhotos ? (
                                                <div className="mt-5 flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={handleLoadMoreUserPhotos}
                                                        className="rounded-full border border-[#cf8d45] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.88rem] text-[#ffead4] transition hover:bg-[#7a3f00]"
                                                    >
                                                        Load more ({flatPhotos.length - visibleUserPhotos} left)
                                                    </button>
                                                </div>
                                            ) : null}
                                        </>
                                    );
                                })()}
                            </div>
                        )}



                        {/* Highlights (80%) and Shuffle/Randomizer (20%) — side-by-side on large screens */}
                        {(galleryCollections.highlights.length > 0 || combinedAllItems.length > 0) && (
                            <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(18rem,1fr)] lg:items-start">
                                <div className="min-w-0">
                                    {galleryCollections.highlights.length > 0 && (
                                        <div className="min-h-0">
                                            <div className="mb-4 flex items-end justify-between gap-4">
                                                <div>
                                                    <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">Gallery overview</p>
                                                    <h2 className="mt-2 font-[Adamina] text-[clamp(1.8rem,3vw,2.5rem)] leading-none text-[#5a392b]">
                                                        Highlights
                                                    </h2>
                                                </div>
                                            </div>

                                            <GalleryStrip
                                                items={galleryCollections.highlights}
                                                bend={1.1}
                                                onItemClick={item => handleItemClick(galleryCollections.highlights, item)}
                                            />

                                            <div className="mb-8 mt-6 flex justify-center gap-4 lg:justify-start">
                                                <button
                                                    onClick={() => setIsQuizOpen(true)}
                                                    disabled={galleryCollections.highlights.length === 0}
                                                    className="px-6 py-3 rounded-lg bg-[#7A3F00] text-[#FFEAD4] font-semibold hover:bg-[#5A392B] disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                >
                                                    Quiz: Guess the Location
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    {combinedImages.length > 0 && (
                                        <div className="sticky top-[6rem] max-h-[calc(100vh-8rem)] min-w-0 overflow-y-auto">
                                            <PhotoRandomizer
                                                items={combinedImages}
                                                onPhotoClick={(item) => handleItemClick(combinedImages, item)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="flex flex-1 flex-col gap-10 pb-16">
                        {galleryCollections.sections.map(section => (
                            <section key={section.label} className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] text-[#50300d]">
                                {(() => {
                                    const visibleCount = visibleItemsBySection[section.label] ?? initialVisibleItemsPerSection;
                                    const visibleItems = section.items.slice(0, visibleCount);
                                    const visibleImages = visibleItems.filter(i => i.kind === 'image');
                                    const visibleVideos = visibleItems.filter(i => i.kind === 'video');
                                    const hasMoreItems = section.items.length > visibleCount;

                                    return (
                                        <>
                                    <div className="mb-4 flex items-end justify-between gap-4">
                                        <div>
                                            <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">Destination</p>
                                            <h2 className="mt-2 font-[Adamina] text-[clamp(1.75rem,2.8vw,2.35rem)] leading-none text-[#5a392b]">
                                                {section.label}
                                            </h2>
                                        </div>
                                    </div>

                                    {visibleImages.length > 0 && (
                                        <GalleryStrip
                                            items={visibleImages}
                                            bend={0}
                                            onItemClick={item => handleItemClick(visibleImages, item)}
                                        />
                                    )}

                                    {visibleVideos.length > 0 && (
                                        <>
                                            <div className="mt-6 mb-3 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">
                                                {visibleVideos.length} video{visibleVideos.length !== 1 ? 's' : ''}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                                {visibleVideos.map(v => (
                                                    <VideoCard
                                                        key={v.src}
                                                        item={v}
                                                        posterUrl={getVideoCoverUrl(v.src, v.text)}
                                                        onClick={() => handleItemClick(visibleVideos, v)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {hasMoreItems ? (
                                        <div className="mt-5 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => handleLoadMore(section.label)}
                                                className="rounded-full border border-[#cf8d45] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.88rem] text-[#ffead4] transition hover:bg-[#7a3f00]"
                                            >
                                                Load more ({section.items.length - visibleCount} left)
                                            </button>
                                        </div>
                                    ) : null}
                                            </>
                                        );
                                    })()}
                                </section>
                            ))}
                        </div>
                </>
            )}

            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#5a392b]/35 p-[3vw] backdrop-blur-sm sm:p-[4vw]"
                    onClick={handleCloseModal}
                >
                    <div
                        className="flex max-h-[92svh] max-w-[96vw] flex-col items-center gap-5 overflow-visible"
                        onClick={e => e.stopPropagation()}
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
                                onClick={handlePrevious}
                                className="flex h-[clamp(2.6rem,5.4vw,3.4rem)] w-[clamp(2.6rem,5.4vw,3.4rem)] shrink-0 items-center justify-center rounded-full border border-[#ffead4]/55 bg-[#5a392b]/92 text-[clamp(1rem,2vw,1.3rem)] font-semibold text-[#ffead4] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:border-[#ffead4]/85 hover:bg-[#5a392b]"
                                aria-label="Previous image"
                            >
                                &lt;
                            </button>

                            <div className="flex max-h-[92svh] max-w-[100vw] items-center justify-center overflow-hidden rounded-[1rem]">
                                    {activeSelectedItems[selectedIndex]?.kind === 'video' ? (
                                        <video
                                            key={activeSelectedItems[selectedIndex]?.src ?? 'video-player'}
                                            src={activeSelectedItems[selectedIndex]?.src ?? ''}
                                            poster={paperBackground}
                                            controls
                                            autoPlay
                                            muted
                                            playsInline
                                            onError={(e) => console.warn('Video playback error', e)}
                                            className="max-h-[92svh] max-w-[100vw] bg-[#fff4e7] object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={activeSelectedItems[selectedIndex]?.src ?? ''}
                                            alt={activeSelectedItems[selectedIndex]?.text || 'Gallery item'}
                                            className="max-h-[92svh] max-w-[100vw] object-contain"
                                        />
                                    )}
                                </div>

                            <button
                                onClick={handleNext}
                                className="flex h-[clamp(2.6rem,5.4vw,3.4rem)] w-[clamp(2.6rem,5.4vw,3.4rem)] shrink-0 items-center justify-center rounded-full border border-[#ffead4]/55 bg-[#5a392b]/92 text-[clamp(1rem,2vw,1.3rem)] font-semibold text-[#ffead4] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:border-[#ffead4]/85 hover:bg-[#5a392b]"
                                aria-label="Next image"
                            >
                                &gt;
                            </button>
                        </div>

                        <div className="rounded-full bg-[#5a392b]/75 px-4 py-2 text-[clamp(0.72rem,1.6vw,0.95rem)] text-[#ffead4]">
                            {selectedIndex + 1} / {activeSelectedItems.length}
                        </div>
                    </div>
                </div>
            )}

            <GalleryQuiz
                isOpen={isQuizOpen}
                onClose={() => setIsQuizOpen(false)}
                galleryItems={galleryCollections.highlights}
            />

            {/* Delete confirmation modal */}
            {isDeleteConfirmModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#5a392b]/35 p-4 backdrop-blur-sm"
                    onClick={handleCancelDelete}
                >
                    <div
                        className="flex flex-col items-center gap-6 rounded-2xl border border-[#cf8d45]/40 bg-[#ffead4]/95 p-8 shadow-lg max-w-sm"
                        onClick={e => e.stopPropagation()}
                        style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.95), rgb(255 234 212 / 0.95)), url(${paperBackground})`, backgroundSize: "cover" }}
                    >
                        <div className="text-center">
                            <h2 className="font-[Adamina] text-xl text-[#5a392b]">Delete Photo?</h2>
                            <p className="mt-3 font-[Cormorant_Garamond] text-[#7a3f00]">
                                Are you sure you want to delete this picture? This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                className="flex-1 rounded-lg border border-[#cf8d45] bg-transparent px-4 py-2.5 font-[Adamina] text-sm text-[#7a3f00] transition hover:bg-[#5a392b]/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="flex-1 rounded-lg bg-[#7a3f00] px-4 py-2.5 font-[Adamina] text-sm text-[#ffead4] transition hover:bg-[#5a392b]"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{ bottom: `${scrollBtnBottom}px` }}
                    className="fixed right-[max(2rem,5%)] flex h-[clamp(2.5rem,8vw,3rem)] w-[clamp(2.5rem,8vw,3rem)] items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:bg-[#7a3f00] hover:-translate-y-1"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <span className="text-xl">↑</span>
                </button>
            )}
        </>
    );
}

export default Gallery;

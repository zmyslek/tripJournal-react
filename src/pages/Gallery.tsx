/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useMemo, useRef } from 'react';
import CircularGallery from '../components/CircularGallery';
import GalleryQuiz from '../components/GalleryQuiz';
import PhotoUploadButton from '../components/PhotoUploadButton';
import EmptyGalleryState from '../components/EmptyGalleryState';
import PhotoRandomizer from '../components/PhotoRandomizer';
import VideoCard from '../components/VideoCard';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { useGalleryStorage, type GalleryItem } from '../hooks/useGalleryStorage';
import paperBackground from '../assets/wrinkled-paper.png';
import { inferMediaKindFromName, type MediaKind } from '../utils/mediaFiles';

const videoPosterCache = new Map<string, string>();

const initialVisibleItemsPerSection = 15;
const loadMoreStep = 15;

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

function Gallery() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isQuizOpen, setIsQuizOpen] = useState(false);
    const { sections, highlights, flatPhotos, uploadPhotos, deletePhoto, isLoading, error } = useGalleryStorage();
    const [selectedItems, setSelectedItems] = useState<GalleryItem[]>([]);
    const [visibleItemsBySection, setVisibleItemsBySection] = useState<Record<string, number>>({});
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    const combinedImages = useMemo(() => 
        flatPhotos.filter(i => i.kind === 'image'), 
    [flatPhotos]);

    const activeSelectedItems = selectedItems.length > 0 ? selectedItems : highlights;

    useEffect(() => {
        window.requestAnimationFrame(() => {
            setVisibleItemsBySection(previousState => {
                const nextState: Record<string, number> = {};

                sections.forEach(section => {
                    nextState[section.label] = previousState[section.label] ?? initialVisibleItemsPerSection;
                });

                return nextState;
            });
        });
    }, [sections]);

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

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (files: FileList) => {
        // Note: Logic for choosing targetPath (Country/City) should be added to UI
        await uploadPhotos(files, 'General');
    };

    const handleDeleteClick = (item: GalleryItem) => {
        setPhotoToDelete(item);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (photoToDelete && photoToDelete.fullPath) {
            await deletePhoto(photoToDelete.fullPath);
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
                                    isLoading={isLoading}
                                    inputRef={fileInputRef}
                                />
                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {flatPhotos.length === 0 && !isLoading ? (
                <section className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] py-16">
                    <EmptyGalleryState onUploadClick={handleUploadClick} />
                </section>
            ) : (
                <>
                    <section className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] pb-10 pt-10 text-[#50300d]">
                        {isLoading ? (
                            <p className="mb-6 font-[Cormorant_Garamond] text-[1.2rem] text-[#5a392b]">Loading gallery media...</p>
                        ) : null}

                        {/* Highlights and Shuffle/Randomizer */}
                        {(highlights.length > 0 || combinedImages.length > 0) && (
                            <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(18rem,1fr)] lg:items-start">
                                <div className="min-w-0">
                                    {highlights.length > 0 && (
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
                                                items={highlights}
                                                bend={1.1}
                                                onItemClick={item => handleItemClick(highlights, item)}
                                            />

                                            <div className="mb-8 mt-6 flex justify-center gap-4 lg:justify-start">
                                                <button
                                                    onClick={() => setIsQuizOpen(true)}
                                                    disabled={highlights.length === 0}
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
                                                items={combinedImages as any}
                                                onPhotoClick={(item: any) => handleItemClick(combinedImages, item)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="flex flex-1 flex-col gap-10 pb-16">
                        {sections.map(section => (
                            <section key={section.label} className="mx-auto w-full max-w-[min(100%,1380px)] px-[max(1.25rem,5%)] text-[#50300d]">
                                {(() => {
                                    const visibleCount = visibleItemsBySection[section.label] ?? initialVisibleItemsPerSection;
                                    const visibleItems = section.items.slice(0, visibleCount);
                                    const visibleImages = visibleItems.filter(i => i.kind === 'image') as GalleryItem[];
                                    const visibleVideos = visibleItems.filter(i => i.kind === 'video') as GalleryItem[];
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
                                                        onClick={() => handleItemClick(visibleVideos, v as any)}
                                                        isEditing={isEditing}
                                                        onDelete={() => handleDeleteClick(v as any)}
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
                galleryItems={highlights}
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

import { useState, useEffect } from 'react';
import CircularGallery from '../components/CircularGallery';
import { useScrollToTop } from '../hooks/useScrollToTop';
import paperBackground from '../assets/wrinkled-paper.png';

interface GalleryItem {
    image: string;
    text: string;
}

const galleryImageModules = import.meta.glob('../assets/temporary-gallery/*.{jpeg,jpg,png,webp}', {
    eager: true
}) as Record<string, { default: string }>;

function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[index]] = [copy[index], copy[randomIndex]];
    }

    return copy;
}

const galleryItems: GalleryItem[] = shuffle(
    Object.entries(galleryImageModules)
        .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
        .map(([, moduleData]) => ({
            image: moduleData.default,
            text: ''
        }))
);

function Gallery() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);

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

    const handleItemClick = (item: GalleryItem) => {
        const index = galleryItems.findIndex(i => i.image === item.image);
        setSelectedIndex(index >= 0 ? index : 0);
        setIsModalOpen(true);
    };

    const handlePrevious = () => {
        setSelectedIndex(prev => (prev - 1 + galleryItems.length) % galleryItems.length);
    };

    const handleNext = () => {
        setSelectedIndex(prev => (prev + 1) % galleryItems.length);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            <section className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] pt-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="gallery-title">
                <div
                    className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]"
                    style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <div
                        className="relative min-h-[11rem] bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:px-9"
                        style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                    >
                        <div className="relative flex flex-wrap items-start justify-between gap-6">
                            <div>
                                <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Travel moments</p>
                                <h1 id="gallery-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                    Gallery
                                </h1>
                                <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                    Explore your travel photographs and moments from around the world.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Gallery content - completely separate from header */}
            <div className="flex flex-1 flex-col">
                <div className="group relative mx-auto h-[clamp(19rem,60svh,44rem)] w-[100vw] max-w-[100vw] overflow-hidden sm:h-[clamp(22rem,64svh,48rem)] lg:w-[96vw] lg:max-w-[96vw]">
                    <div className="h-full w-full origin-center transform-gpu transition-transform duration-300 sm:group-hover:scale-[1.01]">
                        <CircularGallery
                            items={galleryItems}
                            bend={1.1}
                            textColor="#ffead4"
                            borderRadius={0.05}
                            scrollSpeed={1.35}
                            scrollEase={0.06}
                            font="bold clamp(1rem,2.4vw,1.75rem) Adamina"
                            onItemClick={handleItemClick}
                        />
                    </div>
                </div>
            </div>

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

                            <div className="flex max-h-[calc(92svh-8.5rem)] max-w-[calc(96vw-8.5rem)] items-center justify-center overflow-hidden rounded-[1rem]">
                                <img
                                    src={galleryItems[selectedIndex]?.image}
                                    alt={galleryItems[selectedIndex]?.text || 'Gallery item'}
                                    className="max-h-[calc(92svh-8.5rem)] max-w-[calc(96vw-8.5rem)] object-contain"
                                />
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
                            {selectedIndex + 1} / {galleryItems.length}
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
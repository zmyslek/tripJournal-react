import { useState } from 'react';
import CircularGallery from '../components/CircularGallery';

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
        [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
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
        <section className="flex min-h-[calc(100svh-8.75rem)] w-full max-w-none flex-col overflow-x-hidden py-[3vh] sm:py-[4vh]" aria-label="Gallery page">
            <div className="mx-auto w-full max-w-[92vw] px-[4vw] sm:max-w-[88vw] sm:px-[3vw] lg:max-w-[84vw] lg:px-[2vw]">
                <p className="font-[Adamina] text-[clamp(0.68rem,1.15vw,0.85rem)] uppercase tracking-[0.28em] text-[#7a3f00]">
                    Temporary gallery
                </p>
                <h2 className="mt-[0.8vh] font-[Adamina] text-[clamp(2.2rem,5.2vw,3.6rem)] leading-none text-[#5a392b]">
                    Gallery
                </h2>
            </div>

            <div className="group relative mx-auto mt-[3vh] h-[clamp(19rem,60svh,44rem)] w-[100vw] max-w-[100vw] overflow-hidden sm:h-[clamp(22rem,64svh,48rem)] lg:w-[96vw] lg:max-w-[96vw]">
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
        </section>
    );
}

export default Gallery;

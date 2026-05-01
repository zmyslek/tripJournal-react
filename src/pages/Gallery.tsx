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
                        className="relative flex max-h-[88svh] max-w-[94vw] items-center justify-center overflow-hidden rounded-[1.2rem]"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={galleryItems[selectedIndex]?.image}
                            alt={galleryItems[selectedIndex]?.text || 'Gallery item'}
                            className="max-h-[88svh] max-w-[94vw] object-contain"
                        />

                        <button
                            onClick={handleCloseModal}
                            className="absolute right-[2.5vw] top-[2.5vw] flex h-[clamp(2.2rem,5vw,2.8rem)] w-[clamp(2.2rem,5vw,2.8rem)] items-center justify-center rounded-full bg-[#5a392b]/55 text-[#ffead4] transition-all hover:bg-[#5a392b]/80"
                            aria-label="Close modal"
                        >
                            x
                        </button>

                        <button
                            onClick={handlePrevious}
                            className="absolute left-[2.5vw] top-1/2 flex h-[clamp(2.4rem,5.5vw,3.2rem)] w-[clamp(2.4rem,5.5vw,3.2rem)] -translate-y-1/2 items-center justify-center rounded-full bg-[#5a392b]/55 text-[#ffead4] transition-all hover:bg-[#5a392b]/80"
                            aria-label="Previous image"
                        >
                            &lt;
                        </button>

                        <button
                            onClick={handleNext}
                            className="absolute right-[2.5vw] top-1/2 flex h-[clamp(2.4rem,5.5vw,3.2rem)] w-[clamp(2.4rem,5.5vw,3.2rem)] -translate-y-1/2 items-center justify-center rounded-full bg-[#5a392b]/55 text-[#ffead4] transition-all hover:bg-[#5a392b]/80"
                            aria-label="Next image"
                        >
                            &gt;
                        </button>

                        <div className="absolute bottom-[2.5vw] left-1/2 -translate-x-1/2 rounded-full bg-[#5a392b]/55 px-[3vw] py-[1.2vw] text-[clamp(0.72rem,1.6vw,0.95rem)] text-[#ffead4]">
                            {selectedIndex + 1} / {galleryItems.length}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Gallery;

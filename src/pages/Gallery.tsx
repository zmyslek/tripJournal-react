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
        <section className="flex min-h-[calc(100vh-8.75rem)] w-full max-w-none flex-col overflow-x-hidden py-6 sm:py-8" aria-label="Gallery page">
            <div className="mx-auto w-full max-w-[92rem] px-4 sm:px-6 lg:px-8">
                <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.28em] text-[#7a3f00] sm:text-[0.8rem]">
                    Temporary gallery
                </p>
                <h2 className="mt-2 font-[Adamina] text-[2.4rem] leading-none text-[#5a392b] sm:text-[3rem] lg:text-[3.4rem]">
                    Gallery
                </h2>
            </div>

            <div className="group relative mx-auto mt-6 h-[clamp(24rem,68vh,46rem)] w-full max-w-none overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-[#f3dfbd]/80 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-[#f3dfbd]/80 to-transparent" />
                <div className="h-full w-full origin-center transform-gpu transition-transform duration-300 group-hover:scale-[1.01]">
                    <CircularGallery
                        items={galleryItems}
                        bend={1.1}
                        textColor="#ffead4"
                        borderRadius={0.055}
                        scrollSpeed={1.45}
                        scrollEase={0.055}
                        font="bold 28px Adamina"
                        onItemClick={handleItemClick}
                    />
                </div>
            </div>

            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#5a392b]/35 p-4 backdrop-blur-sm"
                    onClick={handleCloseModal}
                >
                    <div
                        className="relative flex max-h-[90vh] max-w-[92vw] items-center justify-center overflow-hidden rounded-lg"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={galleryItems[selectedIndex]?.image}
                            alt={galleryItems[selectedIndex]?.text || 'Gallery item'}
                            className="max-h-[90vh] max-w-[92vw] object-contain"
                        />

                        <button
                            onClick={handleCloseModal}
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#5a392b]/55 text-[#ffead4] transition-all hover:bg-[#5a392b]/80"
                            aria-label="Close modal"
                        >
                            x
                        </button>

                        <button
                            onClick={handlePrevious}
                            className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#5a392b]/55 text-[#ffead4] transition-all hover:bg-[#5a392b]/80"
                            aria-label="Previous image"
                        >
                            &lt;
                        </button>

                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#5a392b]/55 text-[#ffead4] transition-all hover:bg-[#5a392b]/80"
                            aria-label="Next image"
                        >
                            &gt;
                        </button>

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#5a392b]/55 px-4 py-2 text-sm text-[#ffead4]">
                            {selectedIndex + 1} / {galleryItems.length}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Gallery;

import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import type { GalleryItem } from '../pages/Gallery';

export interface PhotoRandomizerProps {
  items: GalleryItem[];
  onPhotoClick?: (item: GalleryItem) => void;
}

/**
 * Component for randomly cycling through photos with shuffle button
 * Shows one random photo at a time
 */
export function PhotoRandomizer({ items, onPhotoClick }: PhotoRandomizerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Only select image items
  const imageItems = items.filter(item => item.kind === 'image');

  if (imageItems.length === 0) {
    return null;
  }

  const currentItem = imageItems[currentIndex];

  const handleShuffle = () => {
    const randomIndex = Math.floor(Math.random() * imageItems.length);
    setCurrentIndex(randomIndex);
  };

  const getPhotoUrl = () => currentItem?.src || '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#8f5a20]">
            Feeling random?
          </p>
          <h3 className="mt-2 font-[Adamina] text-[clamp(1.5rem,2.5vw,2rem)] text-[#5a392b]">
            Shuffle Through Photos
          </h3>
        </div>
        <button
          onClick={handleShuffle}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7A3F00] text-[#FFEAD4] font-[Cormorant_Garamond] font-semibold hover:bg-[#5A392B] transition"
          title="Get a random photo"
        >
          <Shuffle size={18} />
          <span className="hidden sm:inline">Shuffle</span>
        </button>
      </div>

      <div className="rounded-lg overflow-hidden bg-[#5A392B] flex items-center justify-center h-64 sm:h-80 cursor-pointer group"
        onClick={() => onPhotoClick?.(currentItem)}>
        <div className="relative w-full h-full">
          <img
            src={getPhotoUrl()}
            alt={currentItem.text || 'Random photo'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Caption below image: show date or location */}
      {currentItem.text && (
        <div className="mt-2 text-center">
          <p className="font-[Cormorant_Garamond] text-[#5A392B] text-sm sm:text-base">{currentItem.text}</p>
        </div>
      )}
    </div>
  );
}

export default PhotoRandomizer;

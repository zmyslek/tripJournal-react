import { type GalleryItem } from '../pages/Gallery';
import paperBackground from '../assets/wrinkled-paper.png';

export interface VideoCardProps {
  item: GalleryItem;
  posterUrl: string | null;
  onClick: () => void;
  isEditing?: boolean;
  onDelete?: () => void;
}

export function VideoCard({ item, posterUrl, onClick, isEditing = false, onDelete }: VideoCardProps) {
  const imageUrl = posterUrl || paperBackground;

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="group relative aspect-square w-full overflow-hidden rounded-lg bg-[#5A392B] shadow-lg transition hover:shadow-xl active:scale-95"
        aria-label={`Play video: ${item.text}`}
      >
        {/* Poster image */}
        <img
          src={imageUrl}
          alt={item.text || 'Video'}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg group-hover:bg-white transition-all group-hover:scale-110">
            <svg
              className="h-8 w-8 ml-0.5 text-[#5A392B]"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>

        {/* Date label at bottom */}
        {item.text && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <p className="text-sm text-white line-clamp-1">{item.text}</p>
          </div>
        )}
      </button>

      {isEditing && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-2 right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#5a392b] shadow"
          aria-label={`Delete ${item.text}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default VideoCard;

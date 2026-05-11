import { Upload } from 'lucide-react';

export interface EmptyGalleryStateProps {
  onUploadClick: () => void;
}

/**
 * Component displayed when gallery has no photos
 * Encourages user to upload their first adventure
 */
export function EmptyGalleryState({ onUploadClick }: EmptyGalleryStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="rounded-2xl bg-[#FFEAD4] border-2 border-[#CF8D45] p-12 text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-[#7A3F00]/10 p-4">
            <Upload size={48} className="text-[#7A3F00]" />
          </div>
        </div>

        <h2 className="font-[Adamina] text-2xl text-[#7A3F00] mb-3">
          No photos yet
        </h2>

        <p className="font-[Cormorant_Garamond] text-[#5A392B] text-lg mb-6 leading-relaxed">
          Upload your first travel photo and start building your adventure gallery!
        </p>

        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7A3F00] text-[#FFEAD4] font-[Cormorant_Garamond] font-semibold hover:bg-[#5A392B] transition"
        >
          <Upload size={20} />
          Upload Your First Photo
        </button>
      </div>

      <p className="mt-8 font-[Cormorant_Garamond] text-[#7A3F00]/60 text-sm">
        Supported formats: JPG, PNG, GIF, WEBP, HEIC, and more
      </p>
    </div>
  );
}

export default EmptyGalleryState;

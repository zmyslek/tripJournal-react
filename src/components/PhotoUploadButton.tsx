import { Upload } from 'lucide-react';
import { useRef } from 'react';

export interface PhotoUploadButtonProps {
  onUpload: (files: FileList, location: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Button component for uploading photos to gallery
 * Accepts images and HEIC files
 */
export function PhotoUploadButton({
  onUpload,
  isLoading = false,
  disabled = false,
  inputRef
}: PhotoUploadButtonProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const finalRef = inputRef ?? internalRef;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    await onUpload(e.target.files, 'User Uploads');

    // Reset input so selecting same files again triggers onChange
    if (finalRef && 'current' in finalRef && finalRef.current) {
      finalRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={finalRef}
        type="file"
        multiple
        accept="image/*,video/*,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload photos"
        disabled={disabled || isLoading}
      />

      <button
        onClick={() => finalRef.current?.click()}
        disabled={disabled || isLoading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7A3F00] text-[#FFEAD4] font-[Cormorant_Garamond] font-semibold hover:bg-[#5A392B] transition disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upload photos"
      >
        <Upload size={20} />
        {isLoading ? 'Uploading...' : 'Upload Photos/Videos'}
      </button>
    </>
  );
}

export default PhotoUploadButton;

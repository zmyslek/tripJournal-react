import { useState, useCallback, useEffect } from 'react';
import idb from '../utils/idb';
import { inferMediaKindFromName, isSupportedMediaFile } from '../utils/mediaFiles';

export interface StoredPhoto {
  id: string;
  // url is either a data URL or a placeholder `idb:<key>` for blobs stored in IndexedDB
  url: string;
  name: string;
  type: string;
  uploadedAt: string;
  location: string | null;
  dateAdded: string;
  blobKey?: string;
}

const STORAGE_KEY = 'galleryPhotos';

function isHeicFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext === 'heic' || ext === 'heif';
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

async function convertHeicToJpeg(blob: Blob): Promise<Blob | null> {
  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    return jpegBlob;
  } catch {
    return null;
  }
}

function getStoredPhotos(): StoredPhoto[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed: StoredPhoto[] = data ? JSON.parse(data) : [];
    // Migrate any legacy `idb:` URLs to the safe transparent placeholder
    return parsed.map(p => ({
      ...p,
      url: typeof p.url === 'string' && p.url.startsWith('idb:') ? TRANSPARENT_PLACEHOLDER : p.url
    }));
  } catch (err) {
    console.error('[Gallery Storage] Failed to parse:', err);
    return [];
  }
}

const TRANSPARENT_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function savePhotos(photos: StoredPhoto[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (err) {
    console.error('[Gallery Storage] Failed to save:', err);
  }
}

export function useGalleryStorage() {
  const [photos, setPhotos] = useState<StoredPhoto[]>(getStoredPhotos);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhotos = useCallback(async (files: FileList, location = 'Unsorted'): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const fileArray = Array.from(files);
      const newPhotos: StoredPhoto[] = [];

      for (const file of fileArray) {
        if (!isSupportedMediaFile(file.name, file.type) && !isHeicFile(file.name)) {
          continue;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const now = new Date();

        let displayBlob: Blob = file;
        let displayType = file.type;
        let blobKey: string | undefined;
        const inferredKind = inferMediaKindFromName(file.name, file.type);

        if (isHeicFile(file.name)) {
          const converted = await convertHeicToJpeg(file);
          if (converted) {
            displayBlob = converted;
            displayType = 'image/jpeg';
          } else {
            setError(`Failed to convert HEIC file: ${file.name}`);
            continue;
          }
        }

        if (inferredKind === 'video') {
          try {
            // Quick compatibility check: the declared MIME may still be unsupported,
            // but `canPlayType` gives a heuristic we can warn on.
            try {
              const probe = document.createElement('video');
              const playable = probe.canPlayType(file.type || '');
              if (!playable) {
                setError(`Uploaded video "${file.name}" may not be playable in this browser.`);
              }
            } catch {
              // ignore environment where document isn't available
            }

            await idb.saveBlob(id, file);
            blobKey = id;
            // store a safe placeholder immediately; the effect will resolve
            // `blobKey` into an object URL and update the photo entry.
            newPhotos.push({
              id,
              url: TRANSPARENT_PLACEHOLDER,
              name: file.name,
              type: displayType || 'video/mp4',
              uploadedAt: now.toISOString(),
              location,
              dateAdded: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              blobKey: id
            });
            continue;
          } catch {
            // fall back to data URL
          }
        }

        const dataUrl = await blobToDataUrl(displayBlob);

        if (inferredKind === 'image' || displayType.startsWith('image/') || isHeicFile(file.name)) {
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Invalid image data'));
            img.src = dataUrl;
          });
        }

        newPhotos.push({
          id,
          url: dataUrl,
          name: file.name,
          type: displayType || (inferredKind === 'video' ? 'video/mp4' : 'image/png'),
          uploadedAt: now.toISOString(),
          location,
          dateAdded: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          blobKey
        });
      }

      if (newPhotos.length > 0) {
        const updated = [...newPhotos, ...photos];
        setPhotos(updated);
        savePhotos(updated);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      console.error('[Gallery Storage] Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [photos]);

  const deletePhoto = useCallback((photoId: string) => {
    const toDelete = photos.find(p => p.id === photoId);
    const updated = photos.filter(p => p.id !== photoId);
    setPhotos(updated);
    savePhotos(updated);
    try {
      if (toDelete) {
        if (typeof toDelete.url === 'string' && toDelete.url.startsWith('blob:')) {
          try { URL.revokeObjectURL(toDelete.url); } catch { /* ignore */ }
        }
        if (toDelete.blobKey) {
          void idb.deleteBlob(toDelete.blobKey).catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
  }, [photos]);

  const clearAllPhotos = useCallback(() => {
    try {
      for (const p of photos) {
        if (typeof p.url === 'string' && p.url.startsWith('blob:')) {
          try { URL.revokeObjectURL(p.url); } catch { /* ignore */ }
        }
      }
    } catch {
      /* ignore */
    }

    setPhotos([]);
    localStorage.removeItem(STORAGE_KEY);
    void idb.clearAllBlobs().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveIdb = async () => {
      // If there are raw `idb:` URLs present, first swap them to a safe
      // transparent placeholder so components don't attempt to load an
      // unsupported scheme (which causes net::ERR_UNKNOWN_URL_SCHEME).
      if (photos.some(p => typeof p.url === 'string' && p.url.startsWith('idb:'))) {
        const placeholderNext = photos.map(p =>
          typeof p.url === 'string' && p.url.startsWith('idb:') ? { ...p, url: TRANSPARENT_PLACEHOLDER } : p
        );
        setPhotos(placeholderNext);
        // Return early; on the next effect run we'll resolve blobs using blobKey.
        return;
      }

      // Resolve any stored blobKeys into object URLs, but only for rows that
      // still have a placeholder URL. Re-creating object URLs on every render
      // causes churn and can break gallery image/video loads.
      const next = [...photos];
      let didChange = false;
      for (let i = 0; i < next.length; i += 1) {
        const p = next[i];
        const key = p.blobKey ?? undefined;
        if (!key) continue;
        if (typeof p.url === 'string' && p.url.startsWith('blob:')) {
          continue;
        }
        try {
          const blob = await idb.getBlob(key);
          if (blob) {
            const objUrl = URL.createObjectURL(blob);
            next[i] = { ...p, url: objUrl };
            didChange = true;
          }
        } catch {
          // ignore resolution errors
        }
        if (cancelled) return;
      }

      if (didChange) {
        setPhotos(next);
      }
    };

    void resolveIdb();

    return () => { cancelled = true; };
  }, [photos]);

  const flatPhotos = photos;

  return {
    allPhotos: { Unsorted: photos },
    flatPhotos,
    uploadPhotos,
    deletePhoto,
    clearAllPhotos,
    isLoading,
    error,
    photoCount: photos.length
  };
}


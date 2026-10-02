import { useState, useCallback, useEffect } from 'react';
import idb from '../utils/idb';
import { inferMediaKindFromName, isSupportedMediaFile } from '../utils/mediaFiles';
import { createGalleryPhoto, TRANSPARENT_MEDIA_PLACEHOLDER, type GalleryPhoto } from '../domain/gallery/GalleryPhoto';
import { supabase } from '../lib/supabase/client';

export type StoredPhoto = GalleryPhoto;

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

const TRANSPARENT_PLACEHOLDER = TRANSPARENT_MEDIA_PLACEHOLDER;

function savePhotos(photos: StoredPhoto[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (err) {
    console.error('[Gallery Storage] Failed to save:', err);
  }
}

interface RemotePhotoRow {
  id: string;
  storage_url: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  trip_entries: { location_label: string | null } | { location_label: string | null }[] | null;
}

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function getRemotePhotos(userId: string): Promise<StoredPhoto[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_url, caption, taken_at, created_at, trip_entries(location_label), trips!inner(user_id)')
    .eq('trips.user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RemotePhotoRow[];
  return Promise.all(rows.map(async (photo) => {
    const date = photo.taken_at ?? photo.created_at;
    const storagePath = photo.storage_url;
    const signedUrlResult = storagePath.startsWith('http')
      ? { data: { signedUrl: storagePath }, error: null }
      : await supabase.storage.from('trip-media').createSignedUrl(storagePath, 3600);

    if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
      throw signedUrlResult.error ?? new Error(`Unable to create a URL for ${storagePath}.`);
    }

    const entry = firstRelation(photo.trip_entries);
    return {
      id: photo.id,
      url: signedUrlResult.data.signedUrl,
      name: photo.caption?.trim() || `Photo ${formatDate(date)}`,
      type: '',
      uploadedAt: date,
      location: entry?.location_label?.trim() || 'Travel moments',
      dateAdded: formatDate(date),
      blobKey: storagePath
    };
  }));
}

async function ensureGalleryTrip(userId: string): Promise<string> {
  const { data: existingTrip, error: lookupError } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', userId)
    .eq('title', 'Gallery uploads')
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }
  if (existingTrip?.id) {
    return existingTrip.id as string;
  }

  const { data: createdTrip, error: createError } = await supabase
    .from('trips')
    .insert({ user_id: userId, title: 'Gallery uploads', status: 'draft' })
    .select('id')
    .single();

  if (createError || !createdTrip?.id) {
    throw createError ?? new Error('Unable to create the gallery trip.');
  }
  return createdTrip.id as string;
}

export function useGalleryStorage() {
  const [photos, setPhotos] = useState<StoredPhoto[]>(getStoredPhotos);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRemote, setIsRemote] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRemote = async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (!cancelled) setError(authError.message);
        return;
      }
      if (!data.user) {
        return;
      }

      try {
        const remotePhotos = await getRemotePhotos(data.user.id);
        if (!cancelled) {
          setIsRemote(true);
          setPhotos(remotePhotos);
          setError(null);
        }
      } catch (remoteError: unknown) {
        if (!cancelled) {
          setIsRemote(true);
          setError(remoteError instanceof Error ? remoteError.message : 'Unable to load your uploaded media.');
        }
      }
    };

    void loadRemote();
    return () => { cancelled = true; };
  }, []);

  const uploadPhotos = useCallback(async (files: FileList, location = 'Unsorted'): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }

      if (authData.user) {
        const tripId = await ensureGalleryTrip(authData.user.id);
        const uploadedPaths: string[] = [];
        const createdEntryIds: string[] = [];
        const createdPhotoIds: string[] = [];
        try {
          for (const file of Array.from(files)) {
            if (!isSupportedMediaFile(file.name, file.type) && !isHeicFile(file.name)) {
              continue;
            }

            let uploadBlob: Blob = file;
            let uploadType = file.type || 'application/octet-stream';
            if (isHeicFile(file.name)) {
              const converted = await convertHeicToJpeg(file);
              if (!converted) {
                throw new Error(`Failed to convert HEIC file: ${file.name}`);
              }
              uploadBlob = converted;
              uploadType = 'image/jpeg';
            }

            const storagePath = `${authData.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const { error: uploadError } = await supabase.storage
              .from('trip-media')
              .upload(storagePath, uploadBlob, { contentType: uploadType, upsert: false });
            if (uploadError) {
              throw uploadError;
            }
            uploadedPaths.push(storagePath);

            const { data: entry, error: entryError } = await supabase
              .from('trip_entries')
              .insert({ trip_id: tripId, title: file.name, location_label: location, body: '' })
              .select('id')
              .single();
            if (entryError || !entry?.id) {
              throw entryError ?? new Error(`Unable to create a media entry for ${file.name}.`);
            }

            const { data: photo, error: photoError } = await supabase
              .from('photos')
              .insert({ trip_id: tripId, entry_id: entry.id, storage_url: storagePath, caption: file.name })
              .select('id')
              .single();
            if (photoError) {
              throw photoError;
            }
            if (photo?.id) {
              createdPhotoIds.push(photo.id as string);
            }
          }

          setIsRemote(true);
          setPhotos(await getRemotePhotos(authData.user.id));
          return;
        } catch (remoteUploadError) {
          if (createdPhotoIds.length > 0) {
            await supabase.from('photos').delete().in('id', createdPhotoIds);
          }
          if (createdEntryIds.length > 0) {
            await supabase.from('trip_entries').delete().in('id', createdEntryIds);
          }
          if (uploadedPaths.length > 0) {
            await supabase.storage.from('trip-media').remove(uploadedPaths);
          }
          throw remoteUploadError;
        }
      }

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
            newPhotos.push(createGalleryPhoto({
              id,
              url: TRANSPARENT_PLACEHOLDER,
              name: file.name,
              type: displayType,
              kind: 'video',
              uploadedAt: now,
              location,
              blobKey: id
            }));
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

        newPhotos.push(createGalleryPhoto({
          id,
          url: dataUrl,
          name: file.name,
          type: displayType,
          kind: inferredKind ?? 'image',
          uploadedAt: now,
          location,
          blobKey
        }));
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
    if (isRemote) {
      const photo = photos.find(currentPhoto => currentPhoto.id === photoId);
      if (!photo) return;

      void (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const { error: photoError } = await supabase.from('photos').delete().eq('id', photoId);
          if (photoError) throw photoError;
          if (photo.blobKey) {
            const { error: storageError } = await supabase.storage.from('trip-media').remove([photo.blobKey]);
            if (storageError) throw storageError;
          }
          setPhotos(currentPhotos => currentPhotos.filter(currentPhoto => currentPhoto.id !== photoId));
        } catch (deleteError: unknown) {
          setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the media.');
        } finally {
          setIsLoading(false);
        }
      })();
      return;
    }

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
  }, [isRemote, photos]);

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
  }, [photos]);

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


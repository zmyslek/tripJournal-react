import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import { inferMediaKindFromName, type MediaKind } from '../utils/mediaFiles';

export interface GalleryItem {
    kind: MediaKind;
    src: string;
    text: string;
    name: string;
    id: string;
    fullPath: string;
}

export interface GallerySection {
    label: string;
    items: GalleryItem[];
}

export function useGalleryStorage() {
    const [sections, setSections] = useState<GallerySection[]>([]);
    const [highlights, setHighlights] = useState<GalleryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const flatPhotos = useMemo(() => sections.flatMap(s => s.items), [sections]);

    const loadGallery = useCallback(async () => {
        try {
            await Promise.resolve();

            setIsLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Fetch unique location_labels from trip_entries
            const { data: entries, error: dbError } = await supabase
                .from('trip_entries')
                .select('location_label')
                .not('location_label', 'is', null);

            if (dbError) throw dbError;

            const uniqueLabels = Array.from(new Set(entries.map(e => e.location_label)));
            const allSections: GallerySection[] = [];
            const allItems: GalleryItem[] = [];

            // 2. List contents for each location_label
            for (const label of uniqueLabels) {
                if (!label) continue;

                const { data: files, error: storageError } = await supabase.storage
                    .from('USER-CONTENT')
                    .list(label, {
                        limit: 100,
                        sortBy: { column: 'name', order: 'desc' },
                    });

                if (storageError || !files || files.length === 0) continue;

                // Filter for supported media
                const validFiles = files.filter(f => f.id && inferMediaKindFromName(f.name));
                if (validFiles.length === 0) continue;

                // 3. Create Signed URLs in bulk for this folder
                const filePaths = validFiles.map(f => `${label}/${f.name}`);
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('USER-CONTENT')
                    .createSignedUrls(filePaths, 3600);

                if (signedError || !signedData) continue;

                const sectionItems: GalleryItem[] = signedData
                    .map((s, idx) => {
                        if (!s.signedUrl) return null;
                        const file = validFiles[idx];
                        const pathParts = label.split('/');
                        const labelText = pathParts.slice(-2).join('/') || 'Imported';

                        return {
                            id: file.id,
                            kind: inferMediaKindFromName(file.name) ?? 'image',
                            src: s.signedUrl,
                            name: file.name,
                            text: labelText,
                            fullPath: `${label}/${file.name}`
                        };
                    })
                    .filter((item): item is GalleryItem => item !== null);

                allSections.push({
                    label: label.split('/').slice(-2).join('/') || label,
                    items: sectionItems
                });
                allItems.push(...sectionItems);
            }

            setSections(allSections.sort((a, b) => a.label.localeCompare(b.label)));

            // Shuffle and pick items for highlights
            const shuffled = [...allItems];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setHighlights(shuffled.slice(0, 12));

        } catch (err) {
            console.error("Gallery fetch failed:", err);
            setError(err instanceof Error ? err.message : "Failed to load gallery");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadPhotos = useCallback(async (files: FileList, targetPath: string) => {
        setIsLoading(true);
        try {
            for (const file of Array.from(files)) {
                const filePath = `${targetPath}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('USER-CONTENT')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
            }
            await loadGallery();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setIsLoading(false);
        }
    }, [loadGallery]);

    const deletePhoto = useCallback(async (photoPath: string) => {
        try {
            const { error: deleteError } = await supabase.storage
                .from('USER-CONTENT')
                .remove([photoPath]);

            if (deleteError) throw deleteError;
            await loadGallery();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    }, [loadGallery]);

    useEffect(() => {
        const id = setTimeout(() => { void loadGallery(); }, 0);
        return () => clearTimeout(id);
    }, [loadGallery]);

    return { sections, highlights, flatPhotos, uploadPhotos, deletePhoto, isLoading, error, refresh: loadGallery };
}
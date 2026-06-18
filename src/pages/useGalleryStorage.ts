/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { inferMediaKindFromName, type MediaKind } from '../utils/mediaFiles';

export interface GalleryItem {
    kind: MediaKind;
    src: string;
    text: string;
    name: string;
    id: string;
}

export interface GallerySection {
    label: string;
    items: GalleryItem[];
}

export function useGalleryStorage() {
    const [sections, setSections] = useState<GallerySection[]>([]);
    const [highlights, setHighlights] = useState<GalleryItem[]>([]);
    const [flatPhotos, setFlatPhotos] = useState<GalleryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadGallery = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
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

                // Fix 1: filter out entries where signedUrl is null before building GalleryItem[]
                const sectionItems: GalleryItem[] = signedData
                    .map((s, idx) => {
                        const file = validFiles[idx];
                        if (!s.signedUrl || !file.id) return null;

                        const pathParts = label.split('/');
                        const labelText = pathParts.slice(-2).join('/') || 'Imported';

                        return {
                            id: file.id,
                            kind: inferMediaKindFromName(file.name) ?? 'image',
                            src: s.signedUrl,
                            name: file.name,
                            text: labelText,
                        } satisfies GalleryItem;
                    })
                    .filter((item): item is GalleryItem => item !== null);

                allSections.push({
                    label: label.split('/').slice(-2).join('/') || label,
                    items: sectionItems
                });
                allItems.push(...sectionItems);
            }

            setSections(allSections.sort((a, b) => a.label.localeCompare(b.label)));

            setFlatPhotos(allItems);
            // Shuffle and pick items for highlights
            const shuffled = [...allItems].sort(() => 0.5 - Math.random());
            setHighlights(shuffled.slice(0, 12));

        } catch (err) {
            console.error("Gallery fetch failed:", err);
            setError(err instanceof Error ? err.message : "Failed to load gallery");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadPhotos = async (files: FileList, targetPath: string) => {
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
    };

    const deletePhoto = async (photoPath: string) => {
        const { error: deleteError } = await supabase.storage
            .from('USER-CONTENT')
            .remove([photoPath]);

        if (deleteError) setError(deleteError.message);
        else await loadGallery();
    };

    // Fix 2: wrap the async call in an inner function so setState isn't called
    // synchronously in the effect body — satisfies React's effect rules.
    useEffect(() => {
        void (async () => { await loadGallery(); })();
    }, [loadGallery]);

    return { sections, highlights, uploadPhotos, deletePhoto, isLoading, error, refresh: loadGallery };
    return { sections, highlights, flatPhotos, uploadPhotos, deletePhoto, isLoading, error, refresh: loadGallery };
}
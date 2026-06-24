import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import {
    deleteGalleryItem,
    loadGalleryItems,
    uploadGalleryFiles,
    type GalleryRow
} from "../lib/supabase/journal";
import { type MediaKind } from "../utils/mediaFiles";

export interface GalleryItem {
    kind: MediaKind;
    src: string;
    text: string;
    name: string;
    id: string;
    fullPath: string;
    label: string;
    locationLabel: string | null;
}

export interface GallerySection {
    label: string;
    items: GalleryItem[];
}

const GALLERY_BUCKET = "USER-CONTENT";

function rowToItem(row: GalleryRow, signedUrl: string): GalleryItem {
    const label = row.location_label?.trim() || "Gallery";
    const name = row.storage_path.split("/").pop() ?? row.storage_path;

    return {
        id: row.id,
        kind: row.media_kind,
        src: signedUrl,
        text: row.caption?.trim() || label,
        name,
        fullPath: row.storage_path,
        label,
        locationLabel: row.location_label
    };
}

async function loadSignedItems(): Promise<GalleryItem[]> {
    const rows = await loadGalleryItems();
    if (rows.length === 0) {
        return [];
    }

    const paths = rows.map((row) => row.storage_path);
    const { data, error } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrls(paths, 3600);
    if (error) {
        throw error;
    }

    return rows
        .map((row, index) => {
            const signedUrl = data?.[index]?.signedUrl;
            if (!signedUrl) {
                return null;
            }

            return rowToItem(row, signedUrl);
        })
        .filter((item): item is GalleryItem => item !== null);
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
            const items = await loadSignedItems();
            const grouped = new Map<string, GalleryItem[]>();

            items.forEach((item) => {
                const key = item.label;
                const bucket = grouped.get(key) ?? [];
                bucket.push(item);
                grouped.set(key, bucket);
            });

            const nextSections = Array.from(grouped.entries())
                .map(([label, items]) => ({
                    label,
                    items: items.sort((left, right) => left.name.localeCompare(right.name))
                }))
                .sort((left, right) => left.label.localeCompare(right.label));

            setSections(nextSections);
            setFlatPhotos(items);

            const shuffled = [...items].sort(() => 0.5 - Math.random());
            setHighlights(shuffled.slice(0, 12));
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : "Failed to load gallery");
            setSections([]);
            setFlatPhotos([]);
            setHighlights([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadPhotos = useCallback(async (files: FileList, targetPath: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await uploadGalleryFiles(files, targetPath);
            await loadGallery();
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
        } finally {
            setIsLoading(false);
        }
    }, [loadGallery]);

    const deletePhoto = useCallback(async (photoPath: string) => {
        try {
            await deleteGalleryItem(photoPath);
            await loadGallery();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
        }
    }, [loadGallery]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void loadGallery();
        }, 0);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [loadGallery]);

    return { sections, highlights, flatPhotos, uploadPhotos, deletePhoto, isLoading, error, refresh: loadGallery };
}

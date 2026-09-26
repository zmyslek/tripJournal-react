import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";

export interface SupabaseGalleryPhoto {
    id: string;
    url: string;
    name: string;
    type: string;
    location: string;
    dateAdded: string;
}

interface SupabasePhotoRow {
    id: string;
    storage_url: string;
    caption: string | null;
    taken_at: string | null;
    created_at: string;
    trips: { title: string } | { title: string }[] | null;
    trip_entries: { location_label: string | null } | { location_label: string | null }[] | null;
}

function firstRelation<T>(relation: T | T[] | null): T | null {
    return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

export function useSupabaseGallery() {
    const [photos, setPhotos] = useState<SupabaseGalleryPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadPhotos = async () => {
            const { data, error: queryError } = await supabase
                .from("photos")
                .select("id, storage_url, caption, taken_at, created_at, trips(title), trip_entries(location_label)")
                .order("created_at", { ascending: false });

            if (!isMounted) {
                return;
            }

            if (queryError) {
                setError(queryError.message);
                setIsLoading(false);
                return;
            }

            const rows = (data ?? []) as SupabasePhotoRow[];
            setPhotos(rows.map(photo => {
                const date = photo.taken_at ?? photo.created_at;
                const name = photo.caption?.trim() || `Photo ${formatDate(date)}`;
                const trip = firstRelation(photo.trips);
                const entry = firstRelation(photo.trip_entries);

                return {
                    id: photo.id,
                    url: photo.storage_url,
                    name,
                    type: "",
                    location: entry?.location_label?.trim() || trip?.title?.trim() || "Travel moments",
                    dateAdded: formatDate(date)
                };
            }));
            setError(null);
            setIsLoading(false);
        };

        void loadPhotos();

        return () => {
            isMounted = false;
        };
    }, []);

    return { photos, isLoading, error };
}

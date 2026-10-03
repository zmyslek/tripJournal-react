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
            const { data: authData, error: authError } = await supabase.auth.getSession();
            if (authError) {
                throw authError;
            }

            // Trip media is in a private bucket. Only load the signed-in user's
            // photos and turn each stored object path into a usable, temporary URL.
            const user = authData.session?.user;
            if (!user) {
                setPhotos([]);
                setError(null);
                setIsLoading(false);
                return;
            }

            const { data, error: queryError } = await supabase
                .from("photos")
                .select("id, storage_url, caption, taken_at, created_at, trips!inner(title, user_id), trip_entries(location_label)")
                .eq("trips.user_id", user.id)
                .order("created_at", { ascending: false });

            if (queryError) {
                throw queryError;
            }

            if (!isMounted) {
                return;
            }

            const rows = (data ?? []) as SupabasePhotoRow[];
            const mappedPhotos = await Promise.all(rows.map(async photo => {
                const { data: signed, error: signedUrlError } = photo.storage_url.startsWith("http")
                    ? { data: { signedUrl: photo.storage_url }, error: null }
                    : await supabase.storage.from("trip-media").createSignedUrl(photo.storage_url, 3600);

                if (signedUrlError || !signed?.signedUrl) {
                    throw signedUrlError ?? new Error("Unable to create a URL for a gallery photo.");
                }

                const date = photo.taken_at ?? photo.created_at;
                const name = photo.caption?.trim() || `Photo ${formatDate(date)}`;
                const trip = firstRelation(photo.trips);
                const entry = firstRelation(photo.trip_entries);

                return {
                    id: photo.id,
                    url: signed.signedUrl,
                    name,
                    type: "",
                    location: entry?.location_label?.trim() || trip?.title?.trim() || "Travel moments",
                    dateAdded: formatDate(date)
                };
            }));
            if (!isMounted) return;
            setPhotos(mappedPhotos);
            setError(null);
            setIsLoading(false);
        };

        void loadPhotos().catch((loadError: unknown) => {
            if (!isMounted) return;
            setError(loadError instanceof Error ? loadError.message : "Unable to load gallery photos.");
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    return { photos, isLoading, error };
}

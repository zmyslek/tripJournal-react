import { useEffect, useState } from "react";

export interface UnsplashPhoto {
    urls: {
        regular: string;
        small: string;
    };
    links: {
        download_location: string;
    };
    user: {
        name: string;
        links: {
            html: string;
        };
    };
}

const UNSPLASH_APP_NAME = "tripjournal";

export async function fetchUnsplashPhoto(photoId: string): Promise<UnsplashPhoto> {
    const response = await fetch(`/api/unsplash-photo?id=${encodeURIComponent(photoId)}`);

    if (!response.ok) {
        throw new Error(`Unsplash photo request returned ${response.status} for ${photoId}.`);
    }

    return await response.json() as UnsplashPhoto;
}

export function useUnsplashPhoto(photoId: string): UnsplashPhoto | null {
    const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);

    useEffect(() => {
        let isCurrent = true;

        fetchUnsplashPhoto(photoId)
            .then((resolvedPhoto) => {
                if (isCurrent) {
                    setPhoto(resolvedPhoto);
                }
            })
            .catch((error: unknown) => {
                console.error(`Failed to load Unsplash photo ${photoId}.`, error);
            });

        return () => {
            isCurrent = false;
        };
    }, [photoId]);

    return photo;
}

export function requestUnsplashDownload(photo: UnsplashPhoto): void {
    void fetch("/api/unsplash-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ download_location: photo.links.download_location })
    }).catch((error: unknown) => {
        console.error("Failed to register Unsplash photo download.", error);
    });
}

export function getUnsplashProfileUrl(photo: UnsplashPhoto): string {
    const profileUrl = new URL(photo.user.links.html);
    profileUrl.searchParams.set("utm_source", UNSPLASH_APP_NAME);
    profileUrl.searchParams.set("utm_medium", "referral");
    return profileUrl.toString();
}

export const unsplashHomepageUrl = `https://unsplash.com/?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`;

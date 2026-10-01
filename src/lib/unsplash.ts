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
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY?.trim();

export async function fetchUnsplashPhoto(photoId: string): Promise<UnsplashPhoto> {
    if (!UNSPLASH_ACCESS_KEY) {
        throw new Error("Missing VITE_UNSPLASH_ACCESS_KEY. Unsplash images require an API access key.");
    }

    const response = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
    });

    if (!response.ok) {
        throw new Error(`Unsplash returned ${response.status} for ${photoId}.`);
    }

    return await response.json() as UnsplashPhoto;
}

export function useUnsplashPhoto(photoId: string): UnsplashPhoto | null {
    const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);

    useEffect(() => {
        if (!UNSPLASH_ACCESS_KEY) {
            console.error("Missing VITE_UNSPLASH_ACCESS_KEY. Unsplash images require an API access key.");
            return;
        }

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
    if (!UNSPLASH_ACCESS_KEY) {
        return;
    }

    void fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
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

import type { MediaKind } from "../../utils/mediaFiles.ts";

export interface GalleryPhoto {
    id: string;
    url: string;
    name: string;
    type: string;
    uploadedAt: string;
    location: string | null;
    dateAdded: string;
    blobKey?: string;
}

export const TRANSPARENT_MEDIA_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function createGalleryPhoto(input: {
    id: string;
    name: string;
    type: string;
    url: string;
    kind: MediaKind;
    location: string | null;
    uploadedAt: Date;
    blobKey?: string;
}): GalleryPhoto {
    return {
        id: input.id,
        url: input.url,
        name: input.name,
        type: input.type || (input.kind === "video" ? "video/mp4" : "image/png"),
        uploadedAt: input.uploadedAt.toISOString(),
        location: input.location,
        dateAdded: input.uploadedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        blobKey: input.blobKey
    };
}
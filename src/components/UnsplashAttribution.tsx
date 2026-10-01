import { getUnsplashProfileUrl, unsplashHomepageUrl, type UnsplashPhoto } from "../lib/unsplash";

export function UnsplashAttribution({ photo }: { photo: UnsplashPhoto | null }) {
    if (!photo) {
        return null;
    }

    return (
        <span className="font-[Cormorant_Garamond] text-[0.78rem] text-[#fff4e7]/80">
            Photo by <a href={getUnsplashProfileUrl(photo)} target="_blank" rel="noreferrer" className="underline underline-offset-2">{photo.user.name}</a> on <a href={unsplashHomepageUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">Unsplash</a>
        </span>
    );
}

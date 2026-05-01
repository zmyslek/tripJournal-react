import { useMemo, useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useScrollToTop } from "../hooks/useScrollToTop";
import compassAvatar from "../assets/avatars/compass.png";
import globeAvatar from "../assets/avatars/globe.png";
import mountainsAvatar from "../assets/avatars/mountains.png";
import passportAvatar from "../assets/avatars/passport.png";
import postcardAvatar from "../assets/avatars/postcard.png";
import suitcaseAvatar from "../assets/avatars/suitcase.png";
import paperBackground from "../assets/wrinkled-paper.png";

type ProfileForm = {
    name: string;
    email: string;
    travelStyle: string;
    currentFocus: string;
    avatar: string;
};

const avatarOptions = [
    { id: "compass", label: "Compass", src: compassAvatar },
    { id: "suitcase", label: "Suitcase", src: suitcaseAvatar },
    { id: "mountains", label: "Mountains", src: mountainsAvatar },
    { id: "passport", label: "Passport", src: passportAvatar },
    { id: "postcard", label: "Postcard", src: postcardAvatar },
    { id: "globe", label: "Globe", src: globeAvatar }
];

const profileStats = [
    { label: "Visited", value: "18" },
    { label: "Wishlist", value: "7" },
    { label: "Returns", value: "4" }
];

const defaultProfile: ProfileForm = {
    name: "John Doe",
    email: "john.doe@example.com",
    travelStyle: "Slow routes, old streets, good notes",
    currentFocus: "Planning the next chapter",
    avatar: compassAvatar
};

const PROFILE_CACHE_KEY = "tripjournal:profile:v1";

function getCachedProfile(): ProfileForm {
    try {
        const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!cachedProfile) {
            return defaultProfile;
        }

        const parsedProfile = JSON.parse(cachedProfile);
        if (!parsedProfile || typeof parsedProfile !== "object") {
            return defaultProfile;
        }

        return {
            name: typeof parsedProfile.name === "string" && parsedProfile.name.trim() ? parsedProfile.name : defaultProfile.name,
            email: typeof parsedProfile.email === "string" && parsedProfile.email.trim() ? parsedProfile.email : defaultProfile.email,
            travelStyle: typeof parsedProfile.travelStyle === "string" && parsedProfile.travelStyle.trim() ? parsedProfile.travelStyle : defaultProfile.travelStyle,
            currentFocus: typeof parsedProfile.currentFocus === "string" && parsedProfile.currentFocus.trim() ? parsedProfile.currentFocus : defaultProfile.currentFocus,
            avatar: typeof parsedProfile.avatar === "string" && parsedProfile.avatar.trim() ? parsedProfile.avatar : defaultProfile.avatar
        };
    } catch {
        return defaultProfile;
    }
}

function Profile() {
    const [profile, setProfile] = useState<ProfileForm>(() => getCachedProfile());
    const [draftProfile, setDraftProfile] = useState<ProfileForm>(() => getCachedProfile());
    const [isEditing, setIsEditing] = useState(false);
    const { showScrollTop, scrollToTop } = useScrollToTop();    const [scrollBtnBottom, setScrollBtnBottom] = useState(window.innerHeight * 0.02);

    // Adjust scroll-to-top button so it doesn't overlap the footer
    useEffect(() => {
        function adjustScrollButton() {
            const footer = document.querySelector("footer");
            const baseBottom = window.innerHeight * 0.02;
            if (!footer) {
                setScrollBtnBottom(baseBottom);
                return;
            }

            const rect = footer.getBoundingClientRect();
            const overlap = Math.max(0, window.innerHeight - rect.top);
            const padding = window.innerHeight * 0.01;
            if (overlap > 0) {
                setScrollBtnBottom(baseBottom + overlap + padding);
            } else {
                setScrollBtnBottom(baseBottom);
            }
        }

        adjustScrollButton();
        window.addEventListener("scroll", adjustScrollButton, { passive: true });
        window.addEventListener("resize", adjustScrollButton);
        return () => {
            window.removeEventListener("scroll", adjustScrollButton);
            window.removeEventListener("resize", adjustScrollButton);
        };
    }, []);
    const initials = useMemo(() => {
        return profile.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "JD";
    }, [profile.name]);

    const openEditor = () => {
        setDraftProfile(profile);
        setIsEditing(true);
    };

    const updateDraft = (field: keyof ProfileForm, value: string) => {
        setDraftProfile((currentProfile) => ({
            ...currentProfile,
            [field]: value
        }));
    };

    const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                updateDraft("avatar", reader.result);
            }
        });
        reader.readAsDataURL(file);
    };

    const saveProfile = () => {
        setProfile(draftProfile);
        try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(draftProfile));
        } catch {
            // Ignore profile cache write failures.
        }
        setIsEditing(false);
    };

    return (
        <section className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] py-[max(2rem,6vh)] text-[#50300d]" aria-labelledby="profile-title">
            <div
                className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)] transition-all"
                style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <div
                    className="relative min-h-[11rem] bg-[#5a392b] px-6 py-7 text-[#ffead4] sm:px-9"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <div className="relative flex flex-wrap items-start justify-between gap-6">
                        <div>
                            <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Travel profile</p>
                            <h1 id="profile-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                {profile.name}
                            </h1>
                            <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                A personal overview for the places you have visited, the routes you are planning, and the memories you keep coming back to.
                            </p>
                        </div>
                        <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f6d7b5]/70 bg-[#cf8d45] font-[Adamina] text-[1.9rem] text-[#fff4e7]">
                            {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : initials}
                        </div>
                    </div>
                </div>

                <div className="grid gap-7 px-6 py-7 sm:px-9 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div>
                        <div className="rounded-[1rem] border border-[#cf8d45]/35 bg-[#fff4e7]/52 p-5 shadow-[inset_0_0_24px_rgb(143_90_32_/_8%)]">
                            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Traveler name</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.name}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Email address</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.email}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Favorite travel style</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.travelStyle}</p>
                                </div>
                                <div className="rounded-[0.8rem] border border-[#cf8d45]/25 bg-[#ffead4]/45 px-4 py-3">
                                    <p className="font-[Adamina] text-[0.78rem] uppercase tracking-[0.18em] text-[#7a3f00]">Current focus</p>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.25rem] text-[#50300d]">{profile.currentFocus}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            {profileStats.map((stat) => (
                                <article key={stat.label} className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/72 p-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)] interactive-transition hover:shadow-[inset_0_0_16px_rgb(143_90_32_/_12%),0_4px_12px_rgb(122_63_0_/_15%)] hover:-translate-y-0.5">
                                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">{stat.label}</p>
                                    <p className="mt-2 font-[Adamina] text-[2rem] leading-none text-[#50300d]">{stat.value}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                    <aside className="flex flex-col gap-3 rounded-[1rem] p-4">
                        <Link
                            to="/help-center"
                            className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-4 py-2.5 text-center font-[Adamina] text-[0.92rem] text-[#50300d] no-underline interactive-transition hover:-translate-y-px hover:bg-[#f6dfc1] hover:shadow-[0_4px_12px_rgb(122_63_0_/_15%)]"
                        >
                            Help center
                        </Link>
                        <button
                            type="button"
                            className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-4 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] interactive-transition hover:-translate-y-px hover:bg-[#7a3f00] hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] active:translate-y-px"
                            onClick={openEditor}
                        >
                            Edit profile
                        </button>
                        <button
                            type="button"
                            className="rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2.5 font-[Adamina] text-[0.92rem] text-[#fff4e7] transition hover:-translate-y-px hover:bg-[#b97731]"
                        >
                            Log out
                        </button>
                    </aside>
                </div>
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#50300d]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
                    <div className="max-h-[92svh] w-full max-w-[820px] overflow-y-auto rounded-[1.2rem] border border-[#8f5a20]/35 bg-[#ffead4] p-5 shadow-[0_24px_54px_rgb(35_18_8_/_35%)] sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-[Adamina] text-[0.68rem] uppercase tracking-[0.22em] text-[#7a3f00]">Profile settings</p>
                                <h2 id="edit-profile-title" className="mt-2 font-[Adamina] text-[2rem] text-[#50300d]">Edit profile</h2>
                            </div>
                            <button type="button" className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-3 py-1.5 font-[Adamina] text-[#50300d]" onClick={() => setIsEditing(false)}>
                                Close
                            </button>
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
                            <div>
                                <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-[#cf8d45] bg-[#cf8d45]">
                                    <img src={draftProfile.avatar} alt="Selected avatar preview" className="h-full w-full object-cover" />
                                </div>
                                <p className="mt-4 font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Choose avatar</p>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {avatarOptions.map((avatar) => (
                                        <button
                                            key={avatar.id}
                                            type="button"
                                            className={`overflow-hidden rounded-full border bg-[#fff4e7] p-1 interactive-transition hover:-translate-y-px hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] ${draftProfile.avatar === avatar.src ? "border-[#7a3f00] ring-2 ring-[#cf8d45] shadow-[0_0_8px_rgb(199_141_69_/_30%)]" : "border-[#cf8d45]/45 hover:border-[#cf8d45]/70"}`}
                                            onClick={() => updateDraft("avatar", avatar.src)}
                                            aria-label={`Use ${avatar.label} avatar`}
                                        >
                                            <img src={avatar.src} alt="" className="h-14 w-14 rounded-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                                <label className="mt-4 block rounded-[0.8rem] border border-dashed border-[#cf8d45] bg-[#fff7ee]/70 px-4 py-3 text-center font-[Adamina] text-[0.9rem] text-[#50300d]">
                                    Upload your own
                                    <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                                </label>
                            </div>

                            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Name</span>
                                    <input value={draftProfile.name} onChange={(event) => updateDraft("name", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Email</span>
                                    <input type="email" value={draftProfile.email} onChange={(event) => updateDraft("email", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Favorite travel style</span>
                                    <input value={draftProfile.travelStyle} onChange={(event) => updateDraft("travelStyle", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#7a3f00]">Current focus</span>
                                    <input value={draftProfile.currentFocus} onChange={(event) => updateDraft("currentFocus", event.target.value)} className="w-full rounded-[0.7rem] border border-[#cf8d45]/55 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1.1rem] text-[#50300d] outline-none interactive-transition hover:border-[#cf8d45]/70 focus:border-[#7a3f00] focus:ring-2 focus:ring-[#cf8d45]/35 focus:shadow-[0_0_8px_rgb(199_141_69_/_20%)]" />
                                </label>
                                <div className="flex flex-wrap justify-end gap-3 pt-2">
                                    <button type="button" className="rounded-full border border-[#cf8d45] bg-[#fff7ee] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#50300d] interactive-transition hover:-translate-y-px hover:bg-[#f6dfc1] hover:shadow-[0_4px_12px_rgb(122_63_0_/_15%)] active:translate-y-px" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="rounded-full border border-[#7a3f00] bg-[#5a392b] px-5 py-2.5 font-[Adamina] text-[0.92rem] text-[#ffead4] interactive-transition hover:-translate-y-px hover:bg-[#7a3f00] hover:shadow-[0_4px_12px_rgb(122_63_0_/_20%)] active:translate-y-px">
                                        Save profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{ bottom: `${scrollBtnBottom}px` }}
                    className="fixed right-[max(2rem,5%)] flex h-[clamp(2.5rem,8vw,3rem)] w-[clamp(2.5rem,8vw,3rem)] items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:bg-[#7a3f00] hover:-translate-y-1"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <span className="text-xl">↑</span>
                </button>
            )}
        </section>
    );
}

export default Profile;

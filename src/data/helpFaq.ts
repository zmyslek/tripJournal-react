export type HelpFaq = {
    id: string;
    question: string;
    answer: string;
};

export type HelpFaqSection = {
    id: string;
    title: string;
    description: string;
    faqs: HelpFaq[];
};

export const helpFaqSections: HelpFaqSection[] = [
    {
        id: "map",
        title: "Map & Countries",
        description: "Country statuses, map views, filters, search, and saved travel data.",
        faqs: [
            {
                id: "save-map",
                question: "How does TripJournal save my map?",
                answer: "Country statuses are saved in this browser using local storage. If you return on the same device and browser, your visited and wishlist countries should still be there."
            },
            {
                id: "change-status",
                question: "How do I change a country status?",
                answer: "Use the country search or the All Countries list on the home page, then choose Not explored, To be visited, Visited, or Want to return from the status menu."
            },
            {
                id: "map-colors",
                question: "What do the map colors mean?",
                answer: "Each color follows a country status: visited, to be visited, want to return, or not explored. The filters under the map let you choose which groups are visible."
            },
            {
                id: "map-globe-toggle",
                question: "How do I switch between the globe and flat map?",
                answer: "Use the round map button under the map. It switches the same saved country data between globe view and flat map view."
            },
            {
                id: "map-filters",
                question: "Why did some countries disappear from the map?",
                answer: "The map filter buttons control which statuses are highlighted. Turn Visited, To be visited, Want to return, or Not explored back on to show those countries again."
            },
            {
                id: "country-search",
                question: "Why do I only see country results after typing?",
                answer: "The search area stays quiet until you type. Once you enter a country name or part of one, matching countries appear with status menus beside them."
            },
            {
                id: "country-list-sort",
                question: "Can I sort the country list?",
                answer: "Yes. In the All Countries section, use the Sort by menu to order countries A to Z, Z to A, or grouped by status."
            },
            {
                id: "wrong-country",
                question: "What if my location marks the wrong country?",
                answer: "You can change that country manually from the search field or the All Countries list. Browser location can be approximate, especially near borders."
            },
            {
                id: "country-data-loading",
                question: "What should I do if the map data does not load?",
                answer: "Refresh the page first. TripJournal loads country outlines from the bundled countries.geojson file and may also cache that data in local storage."
            },
            {
                id: "map-accuracy",
                question: "Are the country borders and names official travel guidance?",
                answer: "No. The map is for journaling and planning only. Do not rely on it for border, visa, legal, safety, or emergency decisions."
            }
        ]
    },
    {
        id: "gallery",
        title: "Gallery",
        description: "Opening, browsing, and understanding the temporary travel gallery.",
        faqs: [
            {
                id: "gallery-open",
                question: "How do I open a gallery photo?",
                answer: "Click a photo in the circular gallery. It opens in a larger modal view with previous, next, and close controls."
            },
            {
                id: "gallery-navigation",
                question: "How do I move through gallery photos?",
                answer: "After opening a photo, use the left and right controls to move through the gallery. The counter at the bottom shows your current position."
            },
            {
                id: "gallery",
                question: "Can I add my own gallery photos?",
                answer: "The current gallery uses bundled placeholder travel photos. Uploads are not connected yet, but the page is structured so personal photos can be added later."
            },
            {
                id: "gallery-captions",
                question: "Why do the gallery photos not have captions yet?",
                answer: "The gallery is currently using temporary bundled photos. Final captions can be added when the gallery content is replaced with real journal entries."
            },
            {
                id: "photos-not-loading",
                question: "Why are gallery photos slow to load?",
                answer: "The temporary gallery uses full travel images, so slower connections may need a moment. The page still keeps each image bundled with the app."
            }
        ]
    },
    {
        id: "profile",
        title: "Profile",
        description: "Profile editing, avatar choices, uploads, and what is stored locally.",
        faqs: [
            {
                id: "edit-profile",
                question: "How do I edit my profile information?",
                answer: "Open the Profile page and choose Edit profile. You can update your name, email, travel style, current focus, and avatar."
            },
            {
                id: "avatar-upload",
                question: "Can I upload my own avatar?",
                answer: "Yes. In Edit profile, choose Upload your own and select an image from your device. The uploaded image is previewed in the profile editor."
            },
            {
                id: "avatar-save",
                question: "Will my uploaded avatar stay after I refresh?",
                answer: "Yes for now. Profile details and uploaded avatar previews are saved in this browser's local storage until you clear site data."
            },
            {
                id: "different-device",
                question: "Will my profile appear on another device?",
                answer: "Not yet. Profile details are saved locally in this browser, so another phone, laptop, or browser will start with the default profile."
            },
            {
                id: "profile-backend",
                question: "Is there an account backend already?",
                answer: "No. The profile editor is browser-side for now, which keeps it simple until a backend is added later."
            }
        ]
    },
    {
        id: "privacy",
        title: "Privacy & Storage",
        description: "Local storage, cookies, geolocation, and policy pages.",
        faqs: [
            {
                id: "location",
                question: "Why did the app ask for my location?",
                answer: "If you allow location access, TripJournal can mark the country you appear to be in as visited. Your coordinates are only used in the current session."
            },
            {
                id: "privacy",
                question: "Is my travel list public?",
                answer: "No. The current app does not publish profiles, galleries, or country lists. Your saved country statuses stay in local browser storage."
            },
            {
                id: "cookie-notice",
                question: "What happens when I accept or reject the cookie notice?",
                answer: "TripJournal saves only that choice in local storage so the notice does not keep appearing. Rejecting it does not erase your country selections."
            },
            {
                id: "reset",
                question: "Can I reset my saved travel data?",
                answer: "For now, reset saved choices by clearing this site's local storage in your browser settings. A built-in reset action can be added when account settings are expanded."
            },
            {
                id: "clear-browser-data",
                question: "What data should I clear if something looks stuck?",
                answer: "Clear this site's local storage in your browser settings. That can remove saved country statuses, profile details, cookie choice, and cached country outline data."
            },
            {
                id: "policies",
                question: "Where can I read the privacy, cookie, terms, and accessibility notes?",
                answer: "Use the policy links in the footer. They explain local storage, location, map services, cookies, terms of use, and accessibility limitations."
            }
        ]
    },
    {
        id: "troubleshooting",
        title: "Troubleshooting",
        description: "Browser support, performance, contact form behavior, and offline expectations.",
        faqs: [
            {
                id: "browser-support",
                question: "Which browser should I use?",
                answer: "A modern browser such as Chrome, Edge, Firefox, or Safari is best. The interactive map and gallery depend on current browser graphics features."
            },
            {
                id: "map-performance",
                question: "Why does the map feel heavy on my device?",
                answer: "The map uses interactive graphics and country outline data. Closing other heavy tabs, using a modern browser, or switching views can help on older devices."
            },
            {
                id: "contact-form",
                question: "Does the contact form send a real message?",
                answer: "The contact form is a designed support area, but it is not connected to a backend yet. It can be wired to email or a support service later."
            },
            {
                id: "offline-use",
                question: "Can I use TripJournal offline?",
                answer: "Some bundled pages and images may remain available after loading, but the app is not designed as a full offline app yet. Maps and fonts may need network access."
            },
            {
                id: "changes-not-saving",
                question: "Why are my changes not saving?",
                answer: "Make sure local storage is enabled for this site. Private browsing modes, strict browser settings, or storage cleanup tools can remove saved app data."
            }
        ]
    }
];

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
                answer: "If you are logged in, your country statuses are saved to your account and will appear on any device you sign in from. If you are not logged in, they are saved in this browser using local storage only."
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
            },
            {
                id: "sync-across-devices",
                question: "Will my country data sync across devices?",
                answer: "Yes, once you are logged in. Your country statuses are tied to your account and will appear on any device or browser you sign into. Without an account, data stays in local storage on that device only."
            },
            {
                id: "export-countries",
                question: "Can I export my visited countries list?",
                answer: "Not yet, but exporting your country list as a file or shareable format is planned for a future update."
            },
            {
                id: "region-territories",
                question: "Does TripJournal include territories and regions?",
                answer: "The map focuses on internationally recognized countries. Some dependent territories are included based on the map data source, but not all regions are separately countable."
            },
            {
                id: "country-name-dispute",
                question: "Why is a country named differently on your map?",
                answer: "TripJournal uses country names from its map data source. Names may vary for disputed regions or territories. The app is for personal journaling and not a source of official geopolitical claims."
            },
            {
                id: "visited-definition",
                question: "What counts as 'visited'?",
                answer: "That is up to you. Some travelers mark a layover as visited, while others only mark places where they spent time. Use the status that matches your personal travel definition."
            },
            {
                id: "time-tracking",
                question: "Can I track how long I spent in each country?",
                answer: "Not built-in yet, but you can add that detail to your country notes. If you log each visit date in your notes, you can review your travel timeline from there."
            }
        ]
    },
    {
        id: "gallery",
        title: "Gallery",
        description: "Opening, browsing, uploading, and managing your travel gallery.",
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
                answer: "Yes. Once you are logged in, you can upload your own travel photos and they will appear in your personal gallery. The current placeholder photos are replaced once you start adding your own."
            },
            {
                id: "photo-upload-limits",
                question: "Is there a photo size or file type limit?",
                answer: "Photos must be in JPG, PNG, or WEBP format. Individual files should be under 10MB for the best upload experience. Very large files may take longer to process depending on your connection."
            },
            {
                id: "delete-photo",
                question: "Can I delete a photo I uploaded?",
                answer: "Yes. Open the photo in the gallery and use the delete option. Deleted photos are permanently removed from your account and cannot be recovered."
            },
            {
                id: "gallery-captions",
                question: "Can I add captions or dates to my photos?",
                answer: "Yes. When uploading a photo or editing an existing one, you can add a caption and a travel date. These appear with the photo in the gallery view."
            },
            {
                id: "photos-private",
                question: "Are my photos private?",
                answer: "Yes. Your uploaded photos are only visible to you when you are logged in. TripJournal does not make your gallery public or share it with other users."
            },
            {
                id: "photos-not-loading",
                question: "Why are gallery photos slow to load?",
                answer: "Photo load times depend on your connection speed and the size of the images. If photos are consistently slow, try refreshing the page or checking your connection."
            },
            {
                id: "gallery-editing",
                question: "Can I edit a photo after uploading it?",
                answer: "You can edit the caption and date associated with a photo. To make changes to the image itself (crop, rotate, filter), save your edits in another app first, then re-upload a new version."
            },
            {
                id: "gallery-organizing",
                question: "Can I organize photos by country or date?",
                answer: "Photos are organized by upload date by default. You can also sort by country if you add location metadata to each photo when uploading."
            },
            {
                id: "photo-storage-limit",
                question: "How many photos can I store?",
                answer: "Premium accounts can store up to 1,000 photos. Free accounts can store up to 100 photos. Contact support if you need a higher limit."
            },
            {
                id: "download-photos",
                question: "Can I download or backup my photos?",
                answer: "Yes. You can download individual photos from the gallery view. Bulk download and automatic backup options are planned for a future update."
            }
        ]
    },
    {
        id: "profile",
        title: "Profile",
        description: "Account creation, profile editing, avatar choices, and cross-device sync.",
        faqs: [
            {
                id: "create-account",
                question: "How do I create an account?",
                answer: "Open the Profile page and choose Sign up. Enter your email and a password to create your account. You can also continue without an account and use TripJournal with local storage only."
            },
            {
                id: "login-logout",
                question: "How do I log in or log out?",
                answer: "Use the Sign in button on the Profile page to log in with your email and password. To log out, open the Profile page and choose Sign out. Your data stays saved to your account."
            },
            {
                id: "reset-password",
                question: "How do I reset my password?",
                answer: "On the Sign in page, choose Forgot password and enter your email address. You will receive a reset link. Follow the link to set a new password and sign back in."
            },
            {
                id: "edit-profile",
                question: "How do I edit my profile information?",
                answer: "Open the Profile page and choose Edit profile. You can update your name, email, travel style, current focus, and avatar."
            },
            {
                id: "avatar-upload",
                question: "Can I upload my own avatar?",
                answer: "Yes. In Edit profile, choose Upload your own and select an image from your device. The uploaded image is saved to your account and will appear across devices."
            },
            {
                id: "avatar-save",
                question: "Will my uploaded avatar stay after I refresh?",
                answer: "Yes. If you are logged in, your avatar is saved to your account permanently. If you are not logged in, it is saved in local storage for that browser session only."
            },
            {
                id: "different-device",
                question: "Will my profile appear on another device?",
                answer: "Yes, once you are logged in. Your profile details, avatar, country statuses, notes, and photos are all tied to your account and sync across any device you sign into."
            },
            {
                id: "delete-account",
                question: "Can I delete my account and all my data?",
                answer: "Yes. Go to Profile, open account settings, and choose Delete account. This permanently removes your account, country statuses, notes, photos, and all other stored data. This action cannot be undone."
            },
            {
                id: "profile-backend",
                question: "Is there an account backend already?",
                answer: "Yes. TripJournal uses a backend to store your account, country data, notes, and photos securely. Local storage is only used as a fallback when you are not logged in."
            }
        ]
    },
    {
        id: "notes",
        title: "Notes & Journal",
        description: "Adding, editing, and managing notes and journal entries for your travels.",
        faqs: [
            {
                id: "add-note",
                question: "How do I add a note to a country?",
                answer: "Open a country from the map or the All Countries list and choose Add note. You can write free-form text, add a travel date, and attach photos to that entry."
            },
            {
                id: "note-photos",
                question: "Can I attach photos to a note?",
                answer: "Yes. When creating or editing a note, use the attach photo option to link one or more photos from your gallery or upload new ones directly to that note."
            },
            {
                id: "notes-private",
                question: "Are my notes private?",
                answer: "Yes. Your journal notes are only visible to you when you are logged in. They are never shared publicly or with other users."
            },
            {
                id: "edit-delete-note",
                question: "Can I edit or delete a note?",
                answer: "Yes. Open the note from the country page or your journal and choose Edit to update it or Delete to remove it permanently. Deleted notes cannot be recovered."
            },
            {
                id: "notes-offline",
                question: "Can I write notes without an internet connection?",
                answer: "TripJournal is not a full offline app yet. Notes require a connection to save to your account. Writing notes offline with local sync is planned for a future update."
            },
            {
                id: "note-character-limit",
                question: "Is there a character limit for notes?",
                answer: "No hard limit, but very long notes may load more slowly. For best performance, keep individual notes under 10,000 characters."
            },
            {
                id: "format-notes",
                question: "Can I format my notes with bold, italic, or links?",
                answer: "Basic formatting is not yet available. Notes are stored as plain text. Rich text formatting and inline media are planned for a future update."
            },
            {
                id: "share-note",
                question: "Can I share a note with others?",
                answer: "Not yet. Your journal notes are private to your account. Sharing individual notes or diary entries is planned for a future update."
            },
            {
                id: "note-reminder",
                question: "Can I set reminders for notes?",
                answer: "Reminders are not yet available. You can add reminders in your device's calendar if you want to revisit a specific country or note."
            }
        ]
    },
    {
        id: "account-security",
        title: "Account & Security",
        description: "API keys, data encryption, account safety, and what is stored on our servers.",
        faqs: [
            {
                id: "api-keys-storage",
                question: "How do I store my API keys safely?",
                answer: "API keys you save in TripJournal are stored encrypted in our database. They are never exposed in plain text and are only decrypted server-side when needed. Never share your TripJournal password with anyone."
            },
            {
                id: "api-keys-visible",
                question: "Who can see my API keys?",
                answer: "Only you can access your stored API keys through your account. TripJournal staff do not have access to your decrypted keys. Keys are stored with encryption at rest."
            },
            {
                id: "data-on-delete",
                question: "What happens to my data if I delete my account?",
                answer: "All your data is permanently deleted from our servers, including your profile, country statuses, notes, photos, and any stored API keys. This process is irreversible."
            },
            {
                id: "data-encrypted",
                question: "Is my data encrypted?",
                answer: "Yes. All data is transmitted over HTTPS and sensitive fields such as API keys are encrypted at rest in the database. Your password is never stored in plain text."
            },
            {
                id: "account-security-tips",
                question: "How do I keep my account secure?",
                answer: "Use a strong unique password for your TripJournal account, do not share your login with others, and sign out on shared devices. If you suspect unauthorized access, reset your password immediately."
            },
            {
                id: "session-expiry",
                question: "How long does my login session last?",
                answer: "Your session stays active for a reasonable period of inactivity. On shared or public devices, always sign out manually after use to protect your account."
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
                answer: "If you allow location access, TripJournal can mark the country you appear to be in as visited. Your coordinates are only used in the current session and are never stored on our servers."
            },
            {
                id: "privacy",
                question: "Is my travel list public?",
                answer: "No. Your country statuses, notes, and gallery are private to your account. TripJournal does not publish or share any of your travel data with other users."
            },
            {
                id: "cookie-notice",
                question: "What happens when I accept or reject the cookie notice?",
                answer: "TripJournal saves only that choice in local storage so the notice does not keep appearing. Rejecting it does not erase your country selections or account data."
            },
            {
                id: "reset",
                question: "Can I reset my saved travel data?",
                answer: "Yes. If you are logged in, you can reset your country statuses from your account settings. If you are using local storage only, clear this site's local storage from your browser settings."
            },
            {
                id: "clear-browser-data",
                question: "What data should I clear if something looks stuck?",
                answer: "Clear this site's local storage in your browser settings. That can remove cached country statuses, profile details, cookie choice, and country outline data. Your account data on the server is not affected."
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
                answer: "Yes. The contact form sends your message directly to our support team. You should receive a confirmation email after submitting. If you do not, check your spam folder or try again."
            },
            {
                id: "offline-use",
                question: "Can I use TripJournal offline?",
                answer: "Some bundled pages and images may remain available after loading, but the app is not designed as a full offline app yet. Maps, photos, and notes require a network connection to load and save."
            },
            {
                id: "changes-not-saving",
                question: "Why are my changes not saving?",
                answer: "If you are logged in, check your internet connection as changes need to reach our servers. If you are not logged in, make sure local storage is enabled for this site. Private browsing modes or strict browser settings can prevent saving."
            },
            {
                id: "lost-data",
                question: "I lost my country data after switching browsers. What happened?",
                answer: "If you were not logged in, your data was stored in local storage which is specific to that browser. Log in to your account to access your data from any browser or device going forward."
            },
            {
                id: "mobile-performance",
                question: "Does TripJournal work well on mobile?",
                answer: "Yes. TripJournal is optimized for mobile and tablet devices. If the map feels slow, try closing other apps or refreshing the page."
            },
            {
                id: "pale-colors",
                question: "Why do the colors on my screen look different?",
                answer: "Your browser color profile or display settings may affect how TripJournal looks. Try adjusting your device's display settings. Different screens and devices may render colors slightly differently."
            },
            {
                id: "report-bug",
                question: "How do I report a bug?",
                answer: "Use the contact form in the Help Center and describe what happened, what you expected, and which browser and device you are using. Our team will investigate and follow up with you."
            },
            {
                id: "feature-request",
                question: "Can I suggest a new feature?",
                answer: "Yes. Use the contact form to send your feature idea to the team. Include why you think it would be useful. We review all suggestions carefully."
            }
        ]
    }
];
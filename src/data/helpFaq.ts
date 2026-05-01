export type HelpFaq = {
    id: string;
    question: string;
    answer: string;
};

export const helpFaqs: HelpFaq[] = [
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
        id: "location",
        question: "Why did the app ask for my location?",
        answer: "If you allow location access, TripJournal can mark the country you appear to be in as visited. Your coordinates are only used in the current session."
    },
    {
        id: "gallery",
        question: "Can I add my own gallery photos?",
        answer: "The current gallery uses bundled placeholder travel photos. Uploads are not connected yet, but the page is structured so personal photos can be added later."
    },
    {
        id: "reset",
        question: "Can I reset my saved travel data?",
        answer: "For now, reset saved choices by clearing this site's local storage in your browser settings. A built-in reset action can be added when account settings are expanded."
    },
    {
        id: "different-device",
        question: "Will my journal appear on another device?",
        answer: "Not yet. TripJournal currently saves data in the browser you are using, so another phone, laptop, or browser will start with a fresh map."
    },
    {
        id: "map-colors",
        question: "What do the map colors mean?",
        answer: "Each color follows a country status: visited, to be visited, want to return, or not explored. The filters under the map let you choose which groups are visible."
    },
    {
        id: "wrong-country",
        question: "What if my location marks the wrong country?",
        answer: "You can change that country manually from the search field or the All Countries list. Browser location can be approximate, especially near borders."
    },
    {
        id: "privacy",
        question: "Is my travel list public?",
        answer: "No. The current app does not publish profiles, galleries, or country lists. Your saved country statuses stay in local browser storage."
    },
    {
        id: "photos-not-loading",
        question: "Why are gallery photos slow to load?",
        answer: "The temporary gallery uses full travel images, so slower connections may need a moment. The page still keeps each image bundled with the app."
    },
    {
        id: "browser-support",
        question: "Which browser should I use?",
        answer: "A modern browser such as Chrome, Edge, Firefox, or Safari is best. The interactive map and gallery depend on current browser graphics features."
    }
];

export type ItineraryStatus = "planned" | "in-progress" | "done";
export type ItineraryLocationType = "country" | "city";

export interface ItineraryDraft {
    title: string;
    locationType: ItineraryLocationType;
    city: string;
    startDate: string;
    endDate: string;
    status: ItineraryStatus;
    description: string;
}

export interface ItineraryItem {
    id: string;
    title: string;
    locationType: ItineraryLocationType;
    city: string;
    startDate: string;
    endDate: string;
    status: ItineraryStatus;
    description: string;
    createdAt: string;
    updatedAt: string;
    destination?: string;
    coverPhoto?: string;
    mood?: string;
    travelStyle?: string;
    budget?: string;
    summary?: Array<{ label: string; value: string }>;
    dayPlan?: Array<{ day: string; date: string; title: string; time: string; location: string; notes: string; log?: string }>;
    packingList?: Array<{ group: string; done: boolean; items: Array<{ name: string; done: boolean; quantity?: string }> }>;
    checklist?: Array<{ task: string; done: boolean; due?: string }>;
    hotels?: Array<{ name: string; status: string; checkIn: string; checkOut: string; location: string; notes?: string }>;
    transport?: Array<{ name: string; mode: string; departure: string; arrival: string; person?: string; fare?: string; notes?: string }>;
    notes?: Array<{ id: string; date: string; title: string; text: string; style?: "plain" | "handwritten" }>;
    galleryFilters?: Array<{ country: string; city?: string }>;
}

type StoredItineraryItem = Omit<ItineraryItem, "status"> & { status: ItineraryStatus | "booked" };

const ITINERARY_CACHE_PREFIX = "tripjournal:itineraries:v1:";

export const EMPTY_ITINERARY_DRAFT: ItineraryDraft = {
    title: "",
    locationType: "country",
    city: "",
    startDate: "",
    endDate: "",
    status: "planned",
    description: ""
};

export const STATUS_LABELS: Record<ItineraryStatus, string> = {
    planned: "Planned",
    "in-progress": "In progress",
    done: "Done"
};

export const STATUS_COLORS: Record<ItineraryStatus, string> = {
    planned: "border-l-4 border-l-[#7a3f00]",
    "in-progress": "border-l-4 border-l-[#cf8d45]",
    done: "border-l-4 border-l-[#5a392b]"
};

function normalizeCountryName(countryName: string): string {
    return countryName.trim().toLowerCase();
}

export function itineraryKey(countryName: string): string {
    return `${ITINERARY_CACHE_PREFIX}${normalizeCountryName(countryName)}`;
}

function createItem(seed: Omit<ItineraryItem, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string; updatedAt?: string }): ItineraryItem {
    const now = new Date().toISOString();
    return {
        ...seed,
        id: seed.id ?? crypto.randomUUID(),
        title: seed.title,
        locationType: seed.locationType,
        city: seed.city,
        startDate: seed.startDate,
        endDate: seed.endDate,
        status: seed.status,
        description: seed.description,
        createdAt: seed.createdAt ?? now,
        updatedAt: seed.updatedAt ?? now
    };
}

export const SEEDED_ITINERARIES: Record<string, ItineraryItem[]> = {
    spain: [
        createItem({
            id: "seed-spain-barcelona-page",
            title: "Barcelona long weekend",
            locationType: "city",
            city: "Barcelona",
            destination: "Barcelona, Spain",
            startDate: "2026-05-12",
            endDate: "2026-05-16",
            status: "in-progress",
            mood: "architecture, beach hours, late dinners",
            travelStyle: "walkable city break",
            budget: "Mid-range with two splurge meals",
            coverPhoto: "Spain/Barcelona/679447804_3890480984418223_2061042379303955720_n.jpg",
            galleryFilters: [{ country: "Spain", city: "Barcelona" }],
            description: "A detailed Barcelona page shaped like the Notion trip planner: one central journey plan, day-by-day blocks, practical bookings, and photo memories connected from the temporary gallery.",
            summary: [
                { label: "Base", value: "Eixample, close to Passeig de Gracia and easy metro links" },
                { label: "Trip rhythm", value: "Early Gaudi tickets, slow lunches, beach or viewpoint at golden hour" },
                { label: "Must book", value: "Sagrada Familia tower slot, Park Guell timed entry, final-night rooftop table" },
                { label: "Photo focus", value: "Modernisme details, Gothic Quarter lanes, Barceloneta light, market colors" }
            ],
            dayPlan: [
                { day: "Day 1", date: "May 12", title: "Arrival, Eixample, and first tapas", time: "15:00-23:00", location: "Eixample -> El Born", notes: "Check in, unpack camera gear, walk Passeig de Gracia for Casa Batllo and La Pedrera exteriors, then drift into El Born for pintxos and vermouth. Keep dinner flexible because arrival delays are likely.", log: "Save first impressions and mark favorite streets for a later photo walk." },
                { day: "Day 2", date: "May 13", title: "Gaudi core day", time: "08:30-18:30", location: "Sagrada Familia, Sant Pau, Gracia", notes: "Take the first realistic Sagrada Familia entry to avoid the noon crush. Continue to Recinte Modernista de Sant Pau, lunch in Gracia, then Park Guell late afternoon when the light softens.", log: "Compare interior stained-glass photos with Park Guell mosaic shots." },
                { day: "Day 3", date: "May 14", title: "Gothic Quarter, market, and beach", time: "09:30-22:30", location: "Barri Gotic -> La Boqueria -> Barceloneta", notes: "Start with Cathedral alleys before they fill up, snack through La Boqueria, rest after lunch, then walk the waterfront from Port Vell to Barceloneta. Dinner should be seafood or tapas near the marina.", log: "Tag beach photos separately from old-town architecture." },
                { day: "Day 4", date: "May 15", title: "Montjuic and final rooftop", time: "10:00-23:30", location: "Montjuic, Poble-sec, rooftop dinner", notes: "Cable car or bus up Montjuic, museum gardens, Olympic viewpoints, then Poble-sec for casual bites. Reserve a rooftop for the last night and leave time to pack before bed.", log: "Pick one panorama as the trip cover if it beats the current image." },
                { day: "Day 5", date: "May 16", title: "Slow checkout", time: "08:00-12:30", location: "Hotel -> airport", notes: "Breakfast near the hotel, backup photo export, check drawers, and leave for the airport with a 30-minute buffer for transit changes." }
            ],
            packingList: [
                { group: "Clothing", done: true, items: [{ name: "Light layers", done: true }, { name: "Comfortable walking shoes", done: true }, { name: "Dinner outfit", done: false }] },
                { group: "Electronics", done: true, items: [{ name: "Phone charger", done: true }, { name: "Power bank", done: true }, { name: "Camera batteries", done: false, quantity: "2 spare" }] },
                { group: "Documents", done: true, items: [{ name: "ID/passport", done: true }, { name: "Travel insurance PDF", done: true }, { name: "Hotel confirmation", done: true }] }
            ],
            checklist: [
                { task: "Reserve Sagrada Familia tower", done: true, due: "May 1" },
                { task: "Download offline map", done: true, due: "May 10" },
                { task: "Choose final rooftop restaurant", done: false, due: "May 11" },
                { task: "Back up gallery photos after trip", done: false, due: "May 17" }
            ],
            hotels: [
                { name: "Boutique base near Eixample", status: "Confirmed", checkIn: "May 12, 15:00", checkOut: "May 16, 11:00", location: "Eixample, Barcelona", notes: "Ask for a quiet room away from the main road." }
            ],
            transport: [
                { name: "Airport transfer", mode: "Metro/Aerobus", departure: "May 12, after landing", arrival: "Eixample, 45-60 min", person: "Both travelers", fare: "EUR 6-12", notes: "Use taxi if luggage is heavy." },
                { name: "Return airport run", mode: "Aerobus", departure: "May 16, 12:30", arrival: "Airport by 13:15", fare: "EUR 7" }
            ]
        }),
        createItem({
            id: "seed-spain-valencia-page",
            title: "Valencia photo journal",
            locationType: "city",
            city: "Valencia",
            destination: "Valencia, Spain",
            startDate: "2026-04-23",
            endDate: "2026-04-26",
            status: "done",
            mood: "sunny old town, futuristic curves, beach lunch",
            travelStyle: "camera-first city wandering",
            budget: "Value hotels, food-heavy days",
            coverPhoto: "Spain/Valencia/20260424_115346.jpg",
            galleryFilters: [{ country: "Spain", city: "Valencia" }],
            description: "A filled-in Valencia board with completed days, photo-led notes, packing history, and the gallery connected to the exact Valencia folder.",
            summary: [
                { label: "Base", value: "Old town edge for Central Market mornings and easy bus links" },
                { label: "Best day", value: "City of Arts and Sciences into Turia Gardens" },
                { label: "Food notes", value: "Horchata stop, market snacks, paella near the waterfront" },
                { label: "Photo focus", value: "Ceramic signs, market produce, white futuristic architecture, beach textures" }
            ],
            dayPlan: [
                { day: "Day 1", date: "Apr 23", title: "Arrival and old town loop", time: "14:30-20:30", location: "Ciutat Vella", notes: "Arrived, dropped bags, photographed Plaza de la Reina and the cathedral area, then wandered toward Central Market streets before dinner.", log: "Several strong street shots from late afternoon." },
                { day: "Day 2", date: "Apr 24", title: "Market, silk exchange, and Turia walk", time: "09:00-18:00", location: "Central Market -> La Lonja -> Turia", notes: "Breakfast at the market, La Lonja details, then a long Turia Gardens walk. Keep the midday block slow because the light gets harsh.", log: "Best architectural details came from La Lonja and market edges." },
                { day: "Day 3", date: "Apr 25", title: "City of Arts and beach", time: "10:00-19:30", location: "Ciutat de les Arts -> Malvarrosa", notes: "Spent the main photo block around the City of Arts and Sciences, then continued toward the beach for lunch and videos. Leave space for spontaneous stops.", log: "Most of the temporary gallery is from this day; keep it attached to the board." },
                { day: "Day 4", date: "Apr 26", title: "Checkout and photo cleanup", time: "09:00-12:00", location: "Hotel", notes: "Final breakfast, exported favorites, checked duplicate photos, and marked which clips need trimming." }
            ],
            packingList: [
                { group: "Photo kit", done: true, items: [{ name: "Phone lens cloth", done: true }, { name: "Power bank", done: true }, { name: "USB-C cable", done: true }] },
                { group: "Clothes", done: true, items: [{ name: "Light jacket", done: true }, { name: "Walking shoes", done: true }, { name: "Sunglasses", done: true }] },
                { group: "Comfort", done: true, items: [{ name: "Water bottle", done: true }, { name: "Sunscreen", done: false }, { name: "Blister plasters", done: true }] }
            ],
            checklist: [
                { task: "Sort Valencia gallery selects", done: false, due: "Apr 28" },
                { task: "Trim City of Arts clips", done: false, due: "Apr 29" },
                { task: "Write restaurant notes", done: true, due: "Apr 26" }
            ],
            hotels: [
                { name: "Old town apartment hotel", status: "Completed", checkIn: "Apr 23, 14:00", checkOut: "Apr 26, 11:00", location: "Ciutat Vella, Valencia", notes: "Good walking location; street noise acceptable." }
            ],
            transport: [
                { name: "Metro from airport", mode: "Metro", departure: "Apr 23, 13:40", arrival: "City center, 14:15", fare: "EUR 5" },
                { name: "Beach transfer", mode: "Bus/tram", departure: "Apr 25, afternoon", arrival: "Malvarrosa", fare: "Local ticket" }
            ]
        })
    ],
    barcelona: [
        createItem({
            id: "seed-barcelona-notion-page",
            title: "Barcelona city break",
            locationType: "city",
            city: "Barcelona",
            destination: "Barcelona, Spain",
            startDate: "2026-05-12",
            endDate: "2026-05-16",
            status: "in-progress",
            coverPhoto: "Spain/Barcelona/679447804_3890480984418223_2061042379303955720_n.jpg",
            galleryFilters: [{ country: "Spain", city: "Barcelona" }],
            description: "Stay near Eixample, walk the Gothic Quarter, visit Sagrada Familia early, and reserve dinner at a rooftop restaurant on the last night.",
            summary: [
                { label: "Base", value: "Eixample" },
                { label: "Must book", value: "Sagrada Familia and Park Guell" },
                { label: "Gallery", value: "Connected to Spain/Barcelona" }
            ],
            dayPlan: [
                { day: "Day 1", date: "May 12", title: "Arrival and Eixample", time: "15:00", location: "Eixample", notes: "Check in, see Casa Batllo, dinner in El Born." },
                { day: "Day 2", date: "May 13", title: "Gaudi day", time: "08:30", location: "Sagrada Familia", notes: "Timed entry, Sant Pau, Gracia lunch, Park Guell late afternoon." },
                { day: "Day 3", date: "May 14", title: "Beach + tapas day", time: "10:00", location: "Barceloneta", notes: "Morning beach, marina lunch, El Born tapas crawl." },
                { day: "Day 4", date: "May 15", title: "Montjuic", time: "10:00", location: "Montjuic", notes: "Gardens, viewpoints, Poble-sec dinner." }
            ],
            packingList: [
                { group: "Essentials", done: false, items: [{ name: "Walking shoes", done: true }, { name: "Power bank", done: true }, { name: "Dinner outfit", done: false }] }
            ],
            checklist: [
                { task: "Reserve rooftop", done: false, due: "May 11" },
                { task: "Download offline map", done: true, due: "May 10" }
            ],
            hotels: [{ name: "Eixample boutique stay", status: "Confirmed", checkIn: "May 12", checkOut: "May 16", location: "Barcelona" }],
            transport: [{ name: "Airport to Eixample", mode: "Aerobus", departure: "May 12", arrival: "45-60 min", fare: "EUR 7" }]
        })
    ],
    valencia: [
        createItem({
            id: "seed-valencia-notion-page",
            title: "Old town exploration",
            locationType: "city",
            city: "Valencia",
            destination: "Valencia, Spain",
            startDate: "2026-04-23",
            endDate: "2026-04-24",
            status: "done",
            coverPhoto: "Spain/Valencia/20260424_115346.jpg",
            galleryFilters: [{ country: "Spain", city: "Valencia" }],
            description: "Visited the historic center, Central Market, and Plaza de la Reina. Captured photo notes and cafe ideas for the next trip.",
            summary: [
                { label: "Base", value: "Ciutat Vella" },
                { label: "Best route", value: "Central Market, La Lonja, Turia, City of Arts" },
                { label: "Gallery", value: "Connected to Spain/Valencia" }
            ],
            dayPlan: [
                { day: "Day 1", date: "Apr 23", title: "Old town arrival", time: "14:30", location: "Ciutat Vella", notes: "Cathedral area, market streets, easy dinner." },
                { day: "Day 2", date: "Apr 24", title: "Market and Turia", time: "09:00", location: "Central Market", notes: "Breakfast, La Lonja, long garden walk." },
                { day: "Day 3", date: "Apr 25", title: "City of Arts + beach route", time: "10:00", location: "City of Arts and Sciences", notes: "Photo block, beach lunch, waterfront videos." }
            ],
            packingList: [{ group: "Photo kit", done: true, items: [{ name: "Power bank", done: true }, { name: "Lens cloth", done: true }, { name: "Sunscreen", done: false }] }],
            checklist: [{ task: "Sort gallery favorites", done: false, due: "Apr 28" }],
            hotels: [{ name: "Old town stay", status: "Completed", checkIn: "Apr 23", checkOut: "Apr 26", location: "Valencia" }],
            transport: [{ name: "Airport metro", mode: "Metro", departure: "Apr 23", arrival: "City center", fare: "EUR 5" }]
        })
    ],
    australia: [
        createItem({
            id: "seed-sydney-harbour-page",
            title: "Sydney harbour and coast",
            locationType: "city",
            city: "Sydney",
            destination: "Sydney, Australia",
            startDate: "2026-06-08",
            endDate: "2026-06-14",
            status: "planned",
            mood: "harbour walks, ferries, surf beaches",
            travelStyle: "outdoor city week",
            budget: "Moderate, save on lunches and spend on one harbour dinner",
            description: "A Sydney itinerary page connected to the Australia/Sydney gallery folder, with harbour days, coast walks, ferry routes, and practical booking blocks.",
            summary: [
                { label: "Base", value: "Circular Quay or Surry Hills for transit and food access" },
                { label: "Anchor plan", value: "Harbour first, Bondi to Coogee, Manly ferry, Blue Mountains buffer" },
                { label: "Must pack", value: "Wind layer, swimwear, SPF, reusable bottle" },
                { label: "Photo focus", value: "Opera House angles, ferries, coastal pools, dusk skyline" }
            ],
            dayPlan: [
                { day: "Day 1", date: "Jun 8", title: "Arrival and Circular Quay", time: "15:00-21:00", location: "Circular Quay, The Rocks", notes: "Check in, short walk around the harbour, dinner in The Rocks. Keep it low pressure after the long travel day." },
                { day: "Day 2", date: "Jun 9", title: "Opera House, Botanic Garden, ferry sunset", time: "08:30-20:00", location: "Opera House -> Botanic Garden -> ferry", notes: "Morning photos before crowds, garden walk, lunch near the quay, then a ferry loop for skyline shots." },
                { day: "Day 3", date: "Jun 10", title: "Bondi to Coogee", time: "09:00-17:30", location: "Bondi, Tamarama, Bronte, Coogee", notes: "Coastal walk with swim stops if weather allows. Carry water and leave room for a long lunch near Bronte." },
                { day: "Day 4", date: "Jun 11", title: "Manly ferry and North Head", time: "10:00-19:30", location: "Manly", notes: "Take the ferry as part of the experience, walk to Shelly Beach, optional North Head viewpoint, return near sunset." },
                { day: "Day 5", date: "Jun 12", title: "Surry Hills food day", time: "10:30-22:00", location: "Surry Hills, Newtown", notes: "Cafe morning, bookstores and small shops, then Newtown dinner. Use this as a weather buffer." },
                { day: "Day 6", date: "Jun 13", title: "Blue Mountains option", time: "07:00-19:00", location: "Katoomba", notes: "Train to Katoomba if weather is clear. If not, swap for museums and harbour neighborhoods." },
                { day: "Day 7", date: "Jun 14", title: "Checkout", time: "08:00-12:00", location: "Hotel -> airport", notes: "Pack, backup photos, leave early for airport transfer." }
            ],
            packingList: [
                { group: "Clothing", done: false, items: [{ name: "Wind jacket", done: false }, { name: "Swimwear", done: true }, { name: "Walking shoes", done: true }] },
                { group: "Day bag", done: false, items: [{ name: "Sunscreen", done: true }, { name: "Water bottle", done: true }, { name: "Transit card setup", done: false }] }
            ],
            checklist: [
                { task: "Book refundable harbour dinner", done: false, due: "Jun 1" },
                { task: "Check Blue Mountains weather", done: false, due: "Jun 11" },
                { task: "Download Opal/contactless transit notes", done: true, due: "Jun 7" }
            ],
            hotels: [{ name: "Harbour-access hotel", status: "Shortlist", checkIn: "Jun 8", checkOut: "Jun 14", location: "Circular Quay or Surry Hills", notes: "Prioritize train access over room size." }],
            transport: [
                { name: "Airport train", mode: "Train", departure: "Jun 8", arrival: "City in 20-30 min", fare: "Contactless fare" },
                { name: "Manly ferry", mode: "Ferry", departure: "Jun 11 morning", arrival: "Manly Wharf", fare: "Opal/contactless" }
            ]
        })
    ],
    sydney: [
        createItem({
            id: "seed-sydney-city-page",
            title: "Sydney harbour and coast",
            locationType: "city",
            city: "Sydney",
            destination: "Sydney, Australia",
            startDate: "2026-06-08",
            endDate: "2026-06-14",
            status: "planned",
            description: "Harbour walks, ferries, Bondi to Coogee, Manly, and a Blue Mountains weather-buffer day.",
            summary: [{ label: "Gallery", value: "Connected to Australia/Sydney" }, { label: "Style", value: "Outdoor city week" }],
            dayPlan: [
                { day: "Day 1", date: "Jun 8", title: "Circular Quay arrival", time: "15:00", location: "Circular Quay", notes: "Low-pressure harbour walk and dinner." },
                { day: "Day 2", date: "Jun 9", title: "Opera House and ferry", time: "08:30", location: "Harbour", notes: "Morning photos, Botanic Garden, ferry sunset." },
                { day: "Day 3", date: "Jun 10", title: "Bondi to Coogee", time: "09:00", location: "Eastern beaches", notes: "Coastal walk and swim stops." },
                { day: "Day 4", date: "Jun 11", title: "Manly", time: "10:00", location: "Manly", notes: "Ferry, Shelly Beach, sunset return." }
            ],
            packingList: [{ group: "Outdoor", done: false, items: [{ name: "SPF", done: true }, { name: "Wind layer", done: false }] }],
            checklist: [{ task: "Choose harbour dinner", done: false, due: "Jun 1" }],
            hotels: [{ name: "Harbour-access hotel", status: "Shortlist", checkIn: "Jun 8", checkOut: "Jun 14", location: "Sydney" }],
            transport: [{ name: "Airport train", mode: "Train", departure: "Jun 8", arrival: "City", fare: "Contactless" }]
        })
    ],
    germany: [
        createItem({
            id: "seed-germany-nurburgring-page",
            title: "Germany road and Nürburgring weekend",
            locationType: "country",
            city: "Nürburgring",
            destination: "Nürburgring, Germany",
            startDate: "2026-07-03",
            endDate: "2026-07-07",
            status: "planned",
            mood: "motorsport, forest roads, small towns",
            travelStyle: "car-based weekend",
            budget: "Fuel, track tickets, simple hotels",
            description: "A Germany itinerary centered on the Nürburgring gallery: arrival logistics, track-day viewing, Eifel drives, and practical car-trip notes.",
            summary: [
                { label: "Base", value: "Guesthouse near Nürburg or Adenau" },
                { label: "Anchor plan", value: "Track viewing, museum, Eifel road loop, castle viewpoint" },
                { label: "Must check", value: "Public driving calendar and weather before committing to the route" },
                { label: "Photo focus", value: "Cars, paddock details, forest roads, village evenings" }
            ],
            dayPlan: [
                { day: "Day 1", date: "Jul 3", title: "Arrive and settle near the ring", time: "14:00-21:00", location: "Nürburg/Adenau", notes: "Pick up car, check into guesthouse, do a gentle evening loop without rushing. Confirm parking and next-day ticket plan." },
                { day: "Day 2", date: "Jul 4", title: "Nürburgring main day", time: "08:30-18:00", location: "Nürburgring", notes: "Start early for viewing points, museum or ring boulevard midday, then late afternoon photos around the paddock area." },
                { day: "Day 3", date: "Jul 5", title: "Eifel drive and castle stop", time: "10:00-17:30", location: "Eifel region", notes: "Scenic drive with coffee stops, Nürburg castle viewpoint, and flexible weather alternatives." },
                { day: "Day 4", date: "Jul 6", title: "Adenau slow day", time: "10:30-20:00", location: "Adenau", notes: "Cafe morning, edit photos, buy small supplies, relaxed dinner." },
                { day: "Day 5", date: "Jul 7", title: "Return car", time: "08:00-13:00", location: "Airport/rail station", notes: "Refuel before return, photograph car condition, keep toll/parking receipts." }
            ],
            packingList: [
                { group: "Driving", done: false, items: [{ name: "Driving licence", done: true }, { name: "Rental confirmation", done: true }, { name: "Sunglasses", done: false }] },
                { group: "Weather", done: false, items: [{ name: "Rain shell", done: false }, { name: "Warm layer", done: true }, { name: "Comfortable shoes", done: true }] }
            ],
            checklist: [
                { task: "Check Nürburgring public schedule", done: false, due: "Jun 28" },
                { task: "Confirm rental insurance coverage", done: false, due: "Jun 25" },
                { task: "Save offline route maps", done: true, due: "Jul 2" }
            ],
            hotels: [{ name: "Guesthouse near Adenau", status: "Shortlist", checkIn: "Jul 3", checkOut: "Jul 7", location: "Adenau/Nürburg", notes: "Parking required." }],
            transport: [
                { name: "Rental car pickup", mode: "Car", departure: "Jul 3, 12:00", arrival: "Nürburgring area by 15:00", fare: "Rental + fuel" },
                { name: "Return drive", mode: "Car", departure: "Jul 7, 08:00", arrival: "Airport/rail station", notes: "Refuel within 10 km of dropoff." }
            ]
        })
    ],
    sweden: [
        createItem({
            id: "seed-sweden-stockholm-page",
            title: "Sweden island city plan",
            locationType: "country",
            city: "Stockholm",
            destination: "Stockholm and archipelago, Sweden",
            startDate: "2026-08-18",
            endDate: "2026-08-24",
            status: "planned",
            mood: "islands, design shops, quiet water views",
            travelStyle: "public-transit city and archipelago week",
            budget: "Moderate with picnic lunches",
            description: "A detailed Sweden sample page. No Sweden photos exist in the current temporary-gallery manifest yet, so the gallery block is ready and will populate automatically once Sweden media is added.",
            summary: [
                { label: "Base", value: "Södermalm for cafes, viewpoints, and transit" },
                { label: "Anchor plan", value: "Gamla Stan, Djurgården museums, metro art, Vaxholm archipelago day" },
                { label: "Must book", value: "Vasa Museum slot if needed, archipelago boat, refundable hotel" },
                { label: "Photo focus", value: "Waterfront reflections, old town color, subway art, ferry decks" }
            ],
            dayPlan: [
                { day: "Day 1", date: "Aug 18", title: "Arrival and Södermalm viewpoint", time: "15:00-21:00", location: "Södermalm", notes: "Check in, walk Monteliusvägen for sunset, simple dinner nearby." },
                { day: "Day 2", date: "Aug 19", title: "Gamla Stan and city hall", time: "09:00-18:00", location: "Gamla Stan, Stadshuset", notes: "Old town early, Royal Palace exterior, lunch by the water, City Hall tower if available." },
                { day: "Day 3", date: "Aug 20", title: "Djurgården museum day", time: "09:30-17:30", location: "Djurgården", notes: "Vasa Museum first, Nordic Museum or ABBA depending on mood, garden walk before returning." },
                { day: "Day 4", date: "Aug 21", title: "Metro art and design shops", time: "10:00-19:00", location: "Tunnelbana, Norrmalm, Östermalm", notes: "Build a small metro art route, then design stores and food hall browsing." },
                { day: "Day 5", date: "Aug 22", title: "Vaxholm archipelago day", time: "08:30-18:30", location: "Vaxholm", notes: "Boat out, fortress views, picnic lunch, ferry-deck photos on return." },
                { day: "Day 6", date: "Aug 23", title: "Slow Stockholm buffer", time: "10:30-21:00", location: "Södermalm and waterfront", notes: "Use this for weather swaps, shopping, laundry, or a long fika stop." },
                { day: "Day 7", date: "Aug 24", title: "Checkout", time: "08:00-12:00", location: "Hotel -> airport", notes: "Pack, export notes, take Arlanda Express or airport coach." }
            ],
            packingList: [
                { group: "Clothing", done: false, items: [{ name: "Rain jacket", done: false }, { name: "Light sweater", done: true }, { name: "Comfortable shoes", done: true }] },
                { group: "Documents", done: true, items: [{ name: "Passport/ID", done: true }, { name: "Hotel confirmation", done: true }, { name: "Insurance", done: false }] },
                { group: "Transit", done: false, items: [{ name: "SL app/card setup", done: false }, { name: "Boat ticket screenshot", done: false }] }
            ],
            checklist: [
                { task: "Book refundable Stockholm hotel", done: false, due: "Jul 15" },
                { task: "Pick archipelago boat route", done: false, due: "Aug 1" },
                { task: "Add Sweden photos to temporary-gallery", done: false, due: "After trip" }
            ],
            hotels: [{ name: "Södermalm design hotel", status: "Shortlist", checkIn: "Aug 18", checkOut: "Aug 24", location: "Stockholm", notes: "Prefer breakfast included because mornings start early." }],
            transport: [
                { name: "Airport to city", mode: "Train/coach", departure: "Aug 18", arrival: "Stockholm C", fare: "SEK TBD" },
                { name: "Vaxholm boat", mode: "Ferry", departure: "Aug 22 morning", arrival: "Vaxholm", fare: "SEK TBD" }
            ]
        })
    ]
};

export function readItineraries(countryName: string): ItineraryItem[] {
    try {
        const raw = localStorage.getItem(itineraryKey(countryName));
        if (!raw) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((item): item is StoredItineraryItem => {
                return (
                    Boolean(item)
                    && typeof item === "object"
                    && typeof item.id === "string"
                    && typeof item.title === "string"
                    && (item.locationType === "country" || item.locationType === "city")
                    && typeof item.city === "string"
                    && typeof item.startDate === "string"
                    && typeof item.endDate === "string"
                    && (item.status === "planned" || item.status === "in-progress" || item.status === "booked" || item.status === "done")
                    && typeof item.description === "string"
                    && typeof item.createdAt === "string"
                    && typeof item.updatedAt === "string"
                );
            })
            .map((item): ItineraryItem => ({
                ...item,
                status: item.status === "booked" ? "in-progress" : item.status
            }));
    } catch {
        return [];
    }
}

export function seedItinerariesFromCatalog(countryName: string): ItineraryItem[] {
    const key = normalizeCountryName(countryName);
    const cached = readItineraries(countryName);
    const seed = SEEDED_ITINERARIES[key] ?? [];

    if (cached.length > 0) {
        if (seed.length === 0) {
            return cached;
        }

        const seedIds = new Set(seed.map((item) => item.id));
        const customItems = cached.filter((item) => !seedIds.has(item.id));
        const merged = [...seed, ...customItems];

        if (
            merged.length === cached.length
            && merged.every((item, index) => JSON.stringify(item) === JSON.stringify(cached[index]))
        ) {
            return cached;
        }

        try {
            localStorage.setItem(itineraryKey(countryName), JSON.stringify(merged));
        } catch {
            // Ignore storage failures.
        }

        return merged;
    }

    if (seed.length > 0) {
        try {
            localStorage.setItem(itineraryKey(countryName), JSON.stringify(seed));
        } catch {
            // Ignore storage failures.
        }
    }

    return seed;
}

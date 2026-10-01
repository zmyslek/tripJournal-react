# TripJournal Architecture

This document describes the current runtime architecture of TripJournal. It focuses on the boundaries between the browser application, browser persistence, Vercel functions, Supabase, and third-party services.

## C4 Model

### System Context

```mermaid
    C4Context
    title TripJournal system context

    Person(traveler, "Traveler", "Plans trips, records destinations, and views travel memories")
    System(tripJournal, "TripJournal", "A travel journal for tracking countries, planning itineraries, and browsing trip media")
    System_Ext(supabase, "Supabase", "Authentication and PostgreSQL data protected by row-level security")
    System_Ext(restCountries, "REST Countries API", "Country metadata used by the country details endpoint")
    System_Ext(unsplash, "Unsplash API", "Travel imagery displayed in selected views")
    System_Ext(mapTiles, "OpenStreetMap tile services", "Map tiles rendered through Leaflet or MapLibre")
    System_Ext(analytics, "PostHog and Vercel Insights", "Product and performance telemetry")
    System_Ext(stripe, "Stripe", "Optional checkout provider")

    Rel(traveler, tripJournal, "Uses", "HTTPS")
    Rel(tripJournal, supabase, "Authenticates and stores gallery/trip data", "HTTPS")
    Rel(tripJournal, restCountries, "Retrieves country details", "HTTPS via Vercel function")
    Rel(tripJournal, unsplash, "Loads travel imagery", "HTTPS")
    Rel(tripJournal, mapTiles, "Loads map tiles", "HTTPS")
    Rel(tripJournal, analytics, "Sends telemetry when configured", "HTTPS")
    Rel(tripJournal, stripe, "Starts checkout when enabled", "HTTPS")
```

### Container View

```mermaid
    C4Container
    title TripJournal containers

    Person(traveler, "Traveler", "Uses TripJournal in a web browser")

    System_Boundary(tripJournal, "TripJournal") {
        Container(spa, "React SPA", "React, TypeScript, Vite", "Renders routes and coordinates client-side state")
        Container(browserStorage, "Browser storage", "localStorage", "Stores country statuses, profile, settings, itineraries, consent, and cached auth data")
        Container(staticAssets, "Static assets", "Vite build in docs/", "Serves the SPA bundle and countries.geojson")
        Container(vercelFunctions, "Serverless API functions", "Vercel Functions", "Provides country details, admin seed, and optional checkout operations")
    }

    System_Ext(supabase, "Supabase", "Auth and PostgreSQL database")
    System_Ext(restCountries, "REST Countries API", "Country metadata")
    System_Ext(unsplash, "Unsplash API", "Travel imagery")
    System_Ext(mapTiles, "OpenStreetMap tile services", "Map tiles")
    System_Ext(analytics, "PostHog and Vercel Insights", "Telemetry")
    System_Ext(stripe, "Stripe", "Checkout")

    Rel(traveler, spa, "Uses", "HTTPS")
    Rel(spa, staticAssets, "Loads bundled assets", "HTTPS")
    Rel(spa, browserStorage, "Reads and writes local state")
    Rel(spa, supabase, "Authenticates and queries gallery/trip data", "HTTPS")
    Rel(spa, vercelFunctions, "Calls protected/server-side operations", "HTTPS")
    Rel(spa, unsplash, "Loads imagery", "HTTPS")
    Rel(spa, mapTiles, "Loads map tiles", "HTTPS")
    Rel(spa, analytics, "Sends telemetry when configured", "HTTPS")
    Rel(vercelFunctions, restCountries, "Fetches country details", "HTTPS")
    Rel(vercelFunctions, supabase, "Uses service role for admin seed", "HTTPS")
    Rel(vercelFunctions, stripe, "Creates checkout sessions when enabled", "HTTPS")
```

The React SPA contains the route pages, shared components, hooks, application services, and infrastructure adapters described below. The browser storage and API boundaries are shown as separate containers because they own persistence and server-side behavior outside the React component tree.

### Component View: React SPA

This view zooms into the React SPA container. The application currently uses a small dependency-composition root and a country-status vertical slice as its clearest example of the application, domain, and infrastructure boundaries.

```mermaid
    C4Component
    title React SPA component view

    Container_Boundary(spa, "React SPA") {
        Component(app, "App", "React component", "Owns route registration, lazy page loading, and country status state")
        Component(layout, "MainLayout", "React component", "Provides shared navigation, footer, consent, and outlet")
        Component(pages, "Route pages", "React components", "Home, trips, itineraries, gallery, profile, settings, help, and policies")
        Component(components, "Shared components and hooks", "React components and hooks", "Maps, gallery, media, country data, and browser behavior")
        Component(composition, "Dependency composition", "TypeScript module", "Wires application services to infrastructure adapters")
        Component(countryService, "Country status service", "Application service", "Loads, saves, and updates country status state")
        Component(countryRepository, "Country status repository port", "TypeScript interface", "Defines persistence operations without choosing storage")
    }

    Container(browserStorage, "Browser storage", "localStorage", "Persists country status and other client-owned state")
    Container(vercelFunctions, "Serverless API functions", "Vercel Functions", "Provides server-side and protected operations")
    System_Ext(supabase, "Supabase", "Authentication and PostgreSQL data")

    Rel(app, layout, "Renders routes inside")
    Rel(app, composition, "Uses dependencies")
    Rel(app, countryService, "Loads and updates country state")
    Rel(layout, pages, "Hosts")
    Rel(pages, components, "Uses")
    Rel(composition, countryService, "Creates")
    Rel(composition, countryRepository, "Injects adapter through port")
    Rel(countryService, countryRepository, "Reads and writes through")
    Rel(countryRepository, browserStorage, "Implemented by local adapter")
    Rel(components, supabase, "Queries gallery and trip data")
    Rel(pages, vercelFunctions, "Calls API endpoints")
```

### Code View: Country Status Slice

The code-level view follows the country-status update path, which is the most explicit layered slice in the current codebase. The domain decides what a valid status transition is; the application service coordinates it; the infrastructure adapter persists it; and `App` supplies the UI state boundary.

```mermaid
    C4Code
    title Country status code view

    Container_Boundary(countrySlice, "Country status slice") {
        Component(appComponent, "App", "src/App.tsx", "Owns React state and passes status actions to pages")
        Component(compositionRoot, "appDependencies", "src/app/composition.ts", "Composes the service with its repository")
        Component(service, "CountryStatusService", "src/application/country/CountryStatusService.ts", "Coordinates load, save, and update operations")
        Component(repositoryPort, "CountryStatusRepository", "src/application/country/CountryStatusRepository.ts", "Application-owned persistence contract")
        Component(countryEntity, "Country and changeCountryStatus", "src/domain/country/Country.ts", "Encapsulates country status rules")
        Component(localRepository, "LocalCountryStatusRepository", "src/infrastructure/country/LocalCountryStatusRepository.ts", "Serializes validated state to localStorage")
    }

    Container(browserStorage, "Browser storage", "localStorage", "Client-side persistence")

    Rel(appComponent, compositionRoot, "Uses appDependencies")
    Rel(appComponent, service, "Loads, saves, and updates state")
    Rel(compositionRoot, service, "Creates")
    Rel(compositionRoot, localRepository, "Provides implementation")
    Rel(service, repositoryPort, "Depends on")
    Rel(service, countryEntity, "Applies status transition")
    Rel(localRepository, repositoryPort, "Implements")
    Rel(localRepository, browserStorage, "Reads and writes JSON")
```

## Onion Architecture

TripJournal follows an onion-style dependency direction for business behavior. The domain is independent of React, browser APIs, Supabase, Vercel, and third-party services. Application services depend on domain rules and ports; infrastructure implements those ports; the UI and composition root sit at the outside and assemble the system.

```mermaid
flowchart TB
    subgraph Outer[Presentation and composition]
        UI[React pages and shared components]
        Root[Dependency composition and route wiring]
    end

    subgraph Infrastructure[Infrastructure adapters]
        Local[localStorage repositories]
        SupabaseAdapter[Supabase client and gallery hooks]
        Api[Vercel API functions]
        External[REST Countries, Unsplash, maps, analytics, Stripe]
    end

    subgraph Application[Application layer]
        Services[Use cases and application services]
        Ports[Repository and service ports]
    end

    subgraph Domain[Domain core]
        Entities[Country, user, and gallery domain models]
        Rules[Status transition and business rules]
    end

    UI --> Services
    Root --> Services
    Services --> Ports
    Services --> Rules
    Rules --> Entities
    Local -. implements .-> Ports
    SupabaseAdapter -. implements .-> Ports
    Api --> External
    UI --> SupabaseAdapter
    UI --> Api
```

The arrows from adapters toward ports are intentionally dashed: infrastructure conforms to application-owned contracts rather than becoming a dependency of the domain. Some current UI integrations, such as Supabase gallery queries, are still called directly from hooks and are shown as an area for continued boundary hardening.

## Deployment View

```mermaid
    flowchart LR
        traveler[Traveler browser]
        hosting[Static hosting\nGitHub Pages or Vercel]
        functions[Vercel serverless functions]
        storage[(Browser localStorage)]
        supabase[(Supabase Auth and PostgreSQL)]
        countries[REST Countries]
        unsplash[Unsplash]
        maps[OpenStreetMap tiles]
        telemetry[PostHog and Vercel Insights]
        stripe[Stripe optional]

        traveler -->|HTTPS| hosting
        hosting -->|Loads SPA assets| traveler
        traveler -->|Reads and writes| storage
        traveler -->|Auth and gallery queries| supabase
        traveler -->|Country and protected operations| functions
        traveler -->|Images| unsplash
        traveler -->|Map tiles| maps
        traveler -->|Telemetry| telemetry
        functions -->|Country metadata| countries
        functions -->|Admin and relational data| supabase
        functions -.->|Checkout when enabled| stripe
```

## Primary Data Flow

```mermaid
    sequenceDiagram
        actor Traveler
        participant UI as React UI
        participant Service as CountryStatusService
        participant Domain as Country domain rules
        participant Store as localStorage repository
        participant Supabase as Supabase

        Traveler->>UI: Selects a country status
        UI->>Service: update(state, country, status)
        Service->>Domain: changeCountryStatus(...)
        Domain-->>Service: Updated country or removal
        Service-->>UI: New immutable state
        UI->>Service: save(state) after state change
        Service->>Store: Persist status and added date
        Store-->>Service: Completed local write
        UI->>Supabase: Query gallery/trip media when needed
        Supabase-->>UI: Authorized media records
```

## Main Containers

| Container | Responsibility | Main implementation |
| --- | --- | --- |
| React SPA | Renders the user interface and coordinates client-side state | `src/main.tsx`, `src/App.tsx` |
| Route pages | Home, countries, trips, itineraries, gallery, profile, settings, help, and policies | `src/pages/` |
| Shared UI and hooks | Layout, map, gallery, country data, Supabase gallery queries, and browser behavior | `src/components/`, `src/hooks/` |
| Browser storage | Persists country statuses, profile, settings, itineraries, auth cache, cookie consent, and cached GeoJSON | `localStorage` calls in `src/` |
| Static deployment | Serves the Vite build and bundled assets | `vite.config.ts`, output directory `docs/` |
| Vercel functions | Server-side proxy and protected operations | `api/` |
| Supabase Auth | Email and provider authentication, session persistence, and auth callbacks | `src/lib/supabase/client.ts` |
| Supabase database | Users, trips, destinations, entries, photos, activities, likes, comments, and API keys | `supabase/migrations/` |

## Data Ownership

### Browser-owned state

- Country statuses and added dates are managed by the country status service and saved to local storage.
- Profile and settings are cached in local storage.
- Itineraries are stored using the itinerary storage utilities.
- Cookie consent and the local auth cache are stored in local storage.
- `countries.geojson` is fetched from the deployed static assets and cached locally.

### Supabase-owned state

- Authentication sessions are managed by Supabase Auth.
- Gallery data is queried from `photos`, with related `trips` and `trip_entries` data.
- The database schema also supports trips, destinations, entries, activities, likes, comments, subscriptions, and API keys.
- Row-level security controls which authenticated users can access database records.

### External-service state

- Unsplash hosts the photos displayed by travel and gallery views.
- OpenStreetMap provides map tile data.
- PostHog and Vercel services receive telemetry when configured.
- Stripe is available through a checkout API function, but should be shown as optional unless a page actively calls that endpoint.

## Important Runtime Flows

### Application startup

1. `src/main.tsx` initializes PostHog and renders the React root.
2. `HashRouter` handles client-side navigation.
3. `src/App.tsx` registers routes and lazy-loads page bundles.
4. The application loads country status from the local repository.
5. `MainLayout` supplies shared navigation, footer, cookie consent, and the page outlet.

### Authentication

1. The Welcome page calls Supabase Auth for session lookup and sign-in.
2. Supabase persists and refreshes the session through the configured client.
3. A successful session is copied into the local auth/profile cache.
4. The user is redirected to `/home`.
5. Profile logout calls Supabase sign-out and clears local profile/auth cache entries.

### Country status tracking

1. Home receives country state from `App`.
2. The country status service updates the in-memory state.
3. A React effect saves the state through `LocalCountryStatusRepository`.
4. The browser restores the state on the next application load.

### Gallery and trip media

1. Gallery and trip pages call `useSupabaseGallery`.
2. The Supabase client queries `photos` and related trip records.
3. The hook maps database rows into UI gallery items.
4. The browser renders the returned media URLs and may request Unsplash photos separately for decorative or travel content.

### Country details

1. A country trip page calls `/api/country-details?name=...`.
2. The Vercel function requests matching data from REST Countries.
3. The function returns normalized JSON and applies a shared cache header.

### Admin sample-data seed

1. The admin page calls `/api/admin/seed-sample` in production.
2. The Vercel function validates the admin token and optional Basic Auth/IP restrictions.
3. The function uses the Supabase service role to create an auth user and sample relational data.
4. In development, the page writes a local seed result instead of calling the remote endpoint.

## Source References

- [Application bootstrap](../src/main.tsx)
- [Routes and country state](../src/App.tsx)
- [Dependency composition](../src/app/composition.ts)
- [Supabase client](../src/lib/supabase/client.ts)
- [Supabase gallery hook](../src/hooks/useSupabaseGallery.ts)
- [Country data hook](../src/hooks/useCountriesData.ts)
- [Vercel API functions](../api/)
- [Supabase schema](../supabase/migrations/20260603_0001_initial_schema.sql)
- [Vite deployment configuration](../vite.config.ts)

## Diagram Conventions

- Solid arrows represent active runtime flows.
- Dashed arrows represent optional or not-yet-connected integrations.
- Cylinders represent persistent data stores.
- The `docs/` directory is generated by Vite; keep source documentation in `documentation/`.
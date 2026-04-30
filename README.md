# TripJournal

TripJournal is a travel-focused web app that lets users mark visited countries on an interactive world map or globe, then keep that selection persisted locally for quick return sessions.

The project emphasizes a tactile, journal-inspired visual language (paper and leather textures), smooth map interactions, and fast loading through route-level lazy loading.

## Project Status

TripJournal is currently in active development. Core map interactions and the foundational user experience are implemented, but feature depth, content completion, and production hardening are still in progress.

Planned release scope includes richer per-trip storytelling features, including Spotify connection for trip soundtrack context and step counter tracking for each trip.

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Configuration](#configuration)
6. [Available Scripts](#available-scripts)
7. [Project Structure](#project-structure)
8. [Screenshots and Prototype](#screenshots-and-prototype)
9. [Design Concept - Style Tile](#design-concept---style-tile)
10. [Deployment Notes](#deployment-notes)
11. [Roadmap](#roadmap)
12. [Author](#author)

## Overview

TripJournal is a map-first travel journaling experience designed to help users build a personal, visual record of the places they have visited. Instead of relying on forms or list-heavy interfaces, the application centers interaction around an immersive world view where countries can be discovered, searched, and selected directly in context. This approach makes travel tracking feel more intuitive and emotionally engaging, while still preserving the practical clarity needed for everyday use. The home flow combines a searchable country interface, live map highlighting, and a simple toggle between globe and flat-map presentations so users can switch between an exploratory perspective and a more analytical one depending on what they need at that moment.

From a product behavior standpoint, TripJournal prioritizes continuity and performance. Country selections are persisted in local storage so sessions feel stable and personal, while countries GeoJSON data is cached to reduce repeated network overhead and keep map rendering responsive. The map layer architecture is structured to maintain deterministic highlight behavior across style loading cycles, and route-level lazy loading helps limit the initial bundle impact so the experience starts quickly even with a map-heavy interface. The app also includes geolocation-aware country auto-detection on first load (when permission is available), lightweight consent-state persistence, and foundational page routes for Gallery and Profile that establish a clear path for future expansion into richer media and traveler identity features.

Visually, the project is intentionally framed as a modern interpretation of a physical travel journal. A warm, editorial palette, serif typography, textured backgrounds, and soft shadow treatment create a tactile aesthetic that differentiates it from generic dashboard patterns while keeping interface hierarchy clear and readable. Motion is used with restraint but purpose, including ambient globe rotation and subtle location feedback, to support orientation rather than decoration. Together, these choices position TripJournal as both a functional tracking tool and a presentation-ready front-end concept that can evolve toward a full-featured travel product with account systems, trip metadata, and media storytelling.

## Core Features

- Interactive map and globe mode toggle.
- Search and filter flow for country selection.
- Automatic initial country detection based on geolocation (best effort).
- Smooth rotating globe behavior when idle.
- Highlighted country overlays with dedicated map source/layers.
- User location visual marker with pulse animation.
- Local caching for large countries GeoJSON payload and selected countries.
- Lazy-loaded routes for improved initial load performance.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- MapTiler SDK
- ESLint

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm 10+ recommended

### Installation

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

Create a local environment file before running the app in environments where you want custom map styles or keys.

Suggested file:

```text
.env.local
```

Suggested variables:

```env
VITE_MAPTILER_API_KEY=YOUR_MAPTILER_KEY
VITE_MAPTILER_STYLE_ID=YOUR_STYLE_ID
# Optional alternative if you prefer a direct style URL
# VITE_MAPTILER_STYLE_URL=https://api.maptiler.com/maps/your-style-id/style.json?key=YOUR_MAPTILER_KEY
```

Notes:

- The map component contains safe style URL normalization and fallback behavior.
- A default key/style fallback exists in code for development continuity, but using your own key is recommended for production.

## Available Scripts

- `npm run dev`: Start Vite dev server.
- `npm run build`: Type-check and build production assets.
- `npm run build:docs`: Build output intended for docs hosting flow.
- `npm run predeploy`: Pre-deploy build hook.
- `npm run lint`: Run ESLint.
- `npm run preview`: Preview the built app.

## Project Structure

```text
src/
  components/
    MainLayout.tsx
    Map.tsx
  hooks/
    useCountriesData.ts
  pages/
    Home.tsx
    Gallery.tsx
    Profile.tsx
  types/
    countries.ts
  css/
    index.css
    map.css
public/
  countries.geojson
scripts/
  optimize-countries.mjs
docs/
  ...built static assets
```

## Screenshots and Prototype

Use this section as a publication-ready media area when sharing the project.

### Screenshots (Placeholders)

- Home view (globe mode): `TODO add screenshot`
- Home view (flat map mode): `TODO add screenshot`
- Country search and selection panel: `TODO add screenshot`
- Cookie notice UI: `TODO add screenshot`
- Mobile responsive view: `TODO add screenshot`

Recommended folder convention:

```text
docs/media/screenshots/
```

### Prototype (Placeholders)

- Figma file: `TODO add prototype link`
- Interactive prototype: `TODO add prototype link`
- Design handoff notes: `TODO add handoff link`

## Design Concept - Style Tile

This section documents the visual direction and can be maintained as a living style tile for ongoing design consistency.

### Brand Direction

- Theme: Heritage travel journal
- Tone: Warm, editorial, tactile, nostalgic
- UX goal: Encourage exploration while keeping interactions legible and calm

### Color Palette

| Token | Hex | Usage |
| --- | --- | --- |
| Leather Brown | `#50300D` | Primary text, outlines, map marker color |
| Sand Gold | `#EAB681` | Borders, highlights, action accents |
| Paper Cream | `#FFEAD4` | Background base, globe water/background tint |
| Soft Parchment | `#F6DFC1` | Secondary surfaces and buttons |
| Clay Accent | `#E96F4A` | Selected country fills |

### Typography

| Role | Typeface | Rationale |
| --- | --- | --- |
| Display/Navigation | Adamina | Elegant serif for brand-like headlines |
| UI Body/Content | Cormorant Garamond | Readable editorial texture for journal feel |

### Texture and Atmosphere

- Leather texture used in navigation and footer bands.
- Wrinkled paper background used as the main app canvas.
- Soft shadowing and rounded corners to mimic physical card layering.

### UI Components and Motion

- Circular profile badge and rounded controls reinforce vintage map instruments.
- Globe auto-rotation creates ambient motion when idle.
- Pulsing user-location marker communicates current position without intrusive UI.

### Accessibility and Clarity Principles

- Maintain strong contrast on text and interactive elements.
- Keep touch targets at comfortable mobile sizes.
- Preserve visible focus and state changes on controls.

### Style Tile Visual Placeholder

- Style tile image board: `TODO add style tile image`
- Suggested file path: `docs/media/style-tile/style-tile-v1.png`
- Optional alternates:
  - `docs/media/style-tile/style-tile-v2.png`
  - `docs/media/style-tile/style-tile-mobile.png`

## Deployment Notes

- Routing is currently configured with HashRouter for static hosting compatibility.
- Built assets can be published from the generated output used in the docs flow.
- Keep the countries dataset optimized to avoid heavy payload regressions.

## Deploying to GitHub Pages (docs/ folder)

This repository is configured to emit production builds into the `docs/` folder (see `vite.config.ts`). To publish to GitHub Pages from the `docs/` folder on the `main` branch, follow these steps:

1. Build the site:

```bash
npm ci
npm run build
```

2. Commit the generated `docs/` output (or let CI produce it) and push to GitHub `main` branch.

3. In your repository settings on GitHub, go to **Pages** and set the source to:
- Branch: `main`
- Folder: `/docs`

4. (Optional) If your site contains files that begin with an underscore, or to avoid Jekyll processing, keep the included `docs/.nojekyll` file (already added).

Notes:
- `vite.config.ts` uses `base: './'` and `build.outDir: 'docs'` which produce relative asset paths suitable for GitHub Pages.
- If you prefer an automated workflow, consider a small GitHub Action that runs `npm run build` and commits the `docs/` output, or use the `gh-pages` package (note: adding new deps requires review).


## Roadmap

- Add real content and media flows for Gallery page.
- Add editable traveler profile data model.
- Add cloud sync and authenticated accounts.
- Add country-level notes, trips, and date metadata.
- Add Spotify integration to attach playlists or listening context to trips.
- Add per-trip step counter tracking and presentation.
- Add analytics dashboard for travel coverage and trends.

## Author

TripJournal is being developed by Zuzanna Mysłek.

- GitHub: https://github.com/zmyslek
- LinkedIn: https://www.linkedin.com/in/zuzanna-mys%C5%82ek-3414a8297/

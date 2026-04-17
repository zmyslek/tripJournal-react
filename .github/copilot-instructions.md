# TripJournal — Copilot Instructions

## Project Overview
TripJournal is a travel journaling web app centered on an interactive world map/globe.
Users mark visited countries, which are persisted in local storage. The visual language
is tactile and editorial — heritage travel journal aesthetic (paper, leather, warm palette).
Goal: a polished, hosted, monetized product with a freemium model.

## Author
Zuzanna Mysłek — solo developer.

## Tech Stack
- React 19 (functional components only, no class components)
- TypeScript (strict — no `any`, type everything explicitly)
- Vite
- React Router (HashRouter for static hosting compatibility)
- Tailwind CSS (utility-first, no custom CSS unless Tailwind can't handle it)
- MapTiler SDK (map and globe rendering)
- ESLint
- Backend: planned but not yet started — flag any backend assumptions

## Project Structure
```
src/
  components/     # Reusable UI components (e.g. MainLayout, Map)
  hooks/          # Custom hooks (e.g. useCountriesData)
  pages/          # Route-level pages (Home, Gallery, Profile)
  types/          # Shared TypeScript types
  css/            # Global styles (index.css, map.css)
public/
  countries.geojson
scripts/          # Build/optimization scripts
```

## Code Conventions

### General
- Functional components only, always with explicit TypeScript prop types
- Export both the component and its prop types from the same file
- Prefer `async/await` over `.then()` chains
- Handle all async errors explicitly — no silent failures
- Keep components focused and small; split if a component exceeds ~150 lines
- No magic numbers — use named constants or Tailwind tokens

### TypeScript
- Strict mode is on — never use `any`
- Define shared types in `src/types/` and import from there
- Prefer `interface` for object shapes, `type` for unions/aliases

### Tailwind
- Use Tailwind utility classes for all styling
- Follow the project color palette using Tailwind arbitrary values:
  - Dark Brown:     `#7A3F00` — primary text, outlines, map marker
  - Light Peach:    `#FABE7D` — highlights, warm accents
  - Mid Tan:        `#CF8D45` — borders, secondary accents
  - Sand Gold:      `#EAB681` — borders, highlights, action accents
  - Deep Brown:     `#5A392B` — dark surfaces, footer, nav bands
  - Paper Cream:    `#FFEAD4` — background base, globe water tint
- Never break the heritage travel journal aesthetic — warm, editorial, tactile
- Two design versions are planned (brown OG + modern grey) — build with the brown palette
  as default; keep components flexible enough to support theming later

### Typography
- Display/Navigation: Adamina (serif)
- UI Body/Content: Cormorant Garamond
- Keep type hierarchy consistent — don't introduce new typefaces

### State & Storage
- Country selections are persisted in localStorage — always keep this in sync
- Countries GeoJSON is cached to avoid repeated network overhead — don't bypass the cache
- No external state library currently — use React state and custom hooks
- Backend + auth are planned; design local state so it can migrate to server state later

### MapTiler / Map
- Map layer architecture must maintain deterministic highlight behavior across style loading cycles
- Always use safe style URL normalization and fallback behavior (already implemented)
- Globe auto-rotation runs when idle — don't interfere unless explicitly asked
- User location marker uses pulse animation — preserve this behavior

### Performance
- Routes are lazy-loaded — keep this pattern for any new pages added
- Avoid heavy imports at the top level; prefer dynamic imports where appropriate
- Don't regress the countries GeoJSON payload size — run the optimize script if touching that data

### Accessibility
- Maintain strong contrast on text and interactive elements
- Keep touch targets at comfortable mobile sizes (min 44x44px)
- Preserve visible focus and state changes on all controls

### Licensing & Commercial Use
- All assets, APIs, and libraries must have licenses compatible with commercial use
- Flag any dependency or API that may not allow commercial use — do not silently add it
- Stripe is the planned payment provider — keep payment flows in isolated components

## What to Avoid
- No class components
- No `any` types
- Don't install new dependencies without flagging it and explaining the tradeoff
- Don't introduce inline styles — use Tailwind
- Don't break the HashRouter setup — required for static hosting
- Don't skip error handling in async operations
- Don't add decorative motion — only purposeful animation (project uses restraint)
- Don't hardcode the brown theme in ways that make the future grey theme impossible

## Planned Features (roadmap — don't implement unless asked)

### Frontend (in progress / next up)
- Gallery page — photo viewer, randomizer, quiz ("where was this photo taken?"), auto-import from device if possible
- Profile page — basic traveler info and settings
- Help center — FAQ, contact support, optional chatbot
- "Want to visit" countries/cities — trip planning skeleton with itinerary customization
- More animations — content animations inspired by playful/editorial style

### API Integrations (frontend-only first, backend later)
- TikTok API — videos matching selected locations
- Spotify API — per-location/city playlists; two modes: trip playlist + post-trip replay (songs listened to during trip by play count)
- Step counter API — per-trip and per-day step tracking, Strava-style

### Content & Personalization
- Notes/diary per trip — text entries, date-stamped, Snapchat-style recaps, location stickers, printability
- Seasonal/holiday features — Easter, Christmas stickers and UI touches per country
- Mascot — in-app helper character, also used for branding
- LLM chatbot — support bot (evaluate usefulness and pricing before implementing)

### Monetization (freemium model)
- Premium tier via Stripe — price TBD based on cost/market analysis
- Free premium for life: first 50 beta users, first 100 users
- Friend referral system — refer a friend, get 1 month free premium
- Premium trial period — evaluate conversion after trial
- Hotel booking — future partnership (only if profitable)

### Design
- Two themes: OG brown (current default) + modern grey — A/B test planned
- Figma prototype for all pages

### Backend (not started — don't assume any backend exists yet)
- Cloud sync + authenticated accounts
- Country-level notes, trips, and date metadata
- Analytics dashboard for travel coverage and trends

### Legal / Business (before release — not code)
- Cookie policy
- Commercial-use licenses for all assets and APIs
- Terms of use / privacy policy
- Tax setup
- MoSCoW prioritization document

## Environment
- Node.js 20+, npm 10+
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- MapTiler API key via `VITE_MAPTILER_API_KEY` in `.env.local`
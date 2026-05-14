# TripJournal Development Instructions

Note: This is a roadmap/reference document, not an auto-loaded Copilot instruction file.
Use `.github/copilot-instructions.md` for always-on guidance and `.github/instructions/*.instructions.md` for scoped guidance.

## Overview
This document specifies all outstanding work required to complete TripJournal as a polished, hosted, monetized travel journal web app. Tasks are organized by phase: Frontend Completion → Backend → Monetization & Launch.

---

## PHASE 1: Frontend Completion (High Priority)

### Gallery Page Implementation
- [ ] **View all photos from trips** - gallery page showing all uploaded images
- [ ] **Photo randomizer** - feature to randomly cycle through photos
- [ ] **Quiz feature** - "where was this photo taken?" with location hints
- [ ] **Auto-import from device** - detect and import gallery photos if possible
- [ ] **HEIC file support** - handle HEIC format conversion (script exists: `scripts/convert-gallery-heic.mjs`) (secondary) or handle heic files to work (primary)
- [ ] **Upload photos button** - tile-sized upload button in gallery section
- [ ] **Remove text/number overlays** - add date-added instead of count
- [ ] **Show first 15 photos** - implement "load more" button (brown styled)
- [ ] **Remove reload on navigation** - load photos once on page entry
- [ ] **AI captions/alt text** - auto-generate captions and location tags using AI
- [ ] **Style better for no data** - handle empty gallery state gracefully

### Profile Page Implementation
- [ ] **Basic traveler info** - display user avatar, name, bio
- [ ] **Settings link** - navigation to settings page
- [ ] **Edit profile navigation** - link to settings → account options
- [ ] **Avatar change functionality** - save avatar changes in localStorage (later: backend)
- [ ] **Subscription status display** - show current plan (free/monthly/yearly/lifetime)
- [ ] **Style status tiles** - improve visited/want-to-visit/passport status display
- [ ] **Account options** - change password, delete account, delete profile
- [ ] **Logout button** - clear session and navigate to Welcome page
- [ ] **Remove "last locally saved"** - cleanup unused UI element

### Settings Page Implementation
- [ ] **Notifications settings** - email/push notification preferences
- [ ] **Premium plan details** - show what's included in each tier (free/monthly/yearly/lifetime/trial)
- [ ] **Plans styling** - similar to ChatGPT pricing layout
- [ ] **API integrations UI** - show Spotify, TikTok, step counter with premium lock
- [ ] **Blurred premium features** - restrict non-premium with upgrade link
- [ ] **Plan selection modal** - show available plans (users cannot self-serve change yet)
- [ ] **Payment methods** - eventually support: Stripe, PayPal, Apple Pay, Google Pay, iDEAL
- [ ] **Invoice management** - display invoices for paid users
- [ ] **Update styling** - consistent with brown heritage journal aesthetic

### Help Center & Policies
- [ ] **FAQ searchbar** - search through FAQ items
- [ ] **Show all categories** - organize like StudyTracker style
- [ ] **Contact support container** - layout for support section
- [ ] **Contact support functionality** - email form or chatbot integration
- [ ] **More questions** - add additional FAQ entries as needed
- [ ] **About & policies page** - merge About and Policies, add links to documentation
- [ ] **Update policies text** - ensure legally correct before launch
- [ ] **Link to README** - provide link to GitHub repo documentation in app

### Map & Globe Fixes (Functional Issues)
- [ ] **Fix globe transparency** - set to 100% opacity (currently slightly transparent)
- [ ] **Make flat map min zoom fit all** - ensure all countries visible at min zoom
- [ ] **Remove horizontal scroll** - no bottom/horizontal scroll in map view
- [ ] **Globe size adjustment** - make globe view smaller for better UI balance
- [ ] **Status color unification** - use consistent color scheme across all country status displays
- [ ] **Right sidebar height** - make smaller to fit contents without excessive padding
- [ ] **Change open button** - replace existing open button with better affordance

### Itineraries Page (Complex - Requires Full Redesign)
- [ ] **Make Notion-like** - redesign as full itinerary planning tool (reference: user's Notion pages)
- [ ] **Create itinerary** - new trip/itinerary creation flow
- [ ] **Edit itinerary** - full CRUD for itineraries
- [ ] **Add day-by-day plan** - Notion-style day planning with checklist
- [ ] **Packing list** - pre-made categories (on/off toggle)
- [ ] **Bookings section** - capture flight, hotel, activity bookings
- [ ] **Import from trip** - reuse items from previous trips
- [ ] **Customizable checklists** - allow users to modify any list
- [ ] **Remove button location** - don't create new itinerary from Itineraries page (use Country page)
- [ ] **Style like notes section** - merge visual style with bottom section then remove duplicate
- [ ] **Section scrolling** - "Plan itinerary" button should scroll to itineraries section

### Country Page Enhancements
- [ ] **Add notes section** - display notes from itinerary with handwriting font option
- [ ] **Add notes in itinerary** - include written text field
- [ ] **AI note scanning** - scan handwritten notes and convert to text
- [ ] **Support multiple languages** - fonts that support different character sets
- [ ] **Location-specific content** - TikTok videos, Spotify playlists, photo gallery per location

### Navigation & UX
- [ ] **Change settings/help icons** - replace text buttons with icon buttons, style appropriately
- [ ] **Add settings icon to footer** - place next to help center icon
- [ ] **Arrow to scroll to top** - implement scroll-to-top functionality
- [ ] **Nav bar heading scroll** - clicking map heading should scroll to country list or create better country view
- [ ] **Fix nav slowness in gallery** - manual reload issue when navigating from gallery

### Design & Animations
- [ ] **Remove bottom section after merging** - once itineraries styled, remove old section
- [ ] **Animate content for fun** - subtle animations inspired by Stanley's site aesthetic
- [ ] **More animations** - playful, editorial style animations (restraint emphasized)
- [ ] **Two design versions** - OG brown + modern grey (A/B test later)
- [ ] **Figma prototype all pages** - create design system in Figma

---

## PHASE 2: Backend Setup (Not Started)

### Database & User Management
- [ ] **Choose DB provider** - Supabase recommended (already in copilot-instructions.md)
- [ ] **User model design** - email, password, profile picture, plan, visited countries, gallery
- [ ] **Create ERD** - map relationships and data structure
- [ ] **Authentication flow** - Google login, Facebook login, email + password
- [ ] **Session management** - secure token handling
- [ ] **Password reset** - email-based password recovery

### API Design
- [ ] **Country management endpoints** - fetch, update visited status, get country details
- [ ] **Trips/itinerary endpoints** - CRUD operations for trips and itineraries
- [ ] **Gallery endpoints** - upload, fetch, delete photos
- [ ] **User settings endpoints** - update profile, preferences, subscription
- [ ] **Notes endpoints** - save and retrieve trip notes/diary entries

### Data Migration
- [ ] **LocalStorage → Backend** - migrate persisted countries data to backend
- [ ] **Plan sync strategy** - how to handle offline → online transitions
- [ ] **Cloud backup** - periodic backup strategy

### Security & Encryption
- [ ] **Ensure encryption** - all sensitive data encrypted in transit and at rest
- [ ] **Rate limiting** - protect endpoints from abuse
- [ ] **CORS configuration** - secure cross-origin requests

---

## PHASE 3: API Integrations

### Spotify API
- [ ] **Playlist creation** - auto-create playlists per location/city
- [ ] **Trip playlists** - songs listened to during trip
- [ ] **Post-trip replay** - songs ordered by listen count
- [ ] **Error handling** - graceful fallback if Spotify unavailable
- [ ] **Premium only** - restrict to premium users

### TikTok API
- [ ] **Search by location** - find #CountryName and #CityName videos
- [ ] **Display videos** - embed or link to TikTok videos
- [ ] **Refresh mechanism** - periodically update video feed
- [ ] **Licensing** - verify commercial use allowed

### Step Counter API (Strava-style)
- [ ] **Per-trip tracking** - cumulative steps per trip
- [ ] **Per-day breakdown** - daily step count
- [ ] **Strava integration** - allow import from Strava if available
- [ ] **Visualization** - charts or progress bars

### Other APIs (Future)
- [ ] **AI Chatbot** - evaluate usefulness and pricing before implementing
- [ ] **Handwriting recognition** - process handwritten notes from photos
- [ ] **Location tagging** - auto-tag photos with location data

---

## PHASE 4: Monetization & Business (Planned)

### Payment Processing
- [ ] **Stripe integration** - primary payment processor
- [ ] **Payment methods** - credit card, PayPal, Apple Pay, Google Pay, iDEAL
- [ ] **Invoice generation** - create and email invoices
- [ ] **Tax handling** - calculate taxes based on user location
- [ ] **Refund policy** - implement and document

### Subscription Plans
- [ ] **Define plan tiers** - Free, Monthly, Yearly, Lifetime options
- [ ] **Premium trial** - 1 week or 1 month (configurable, monitor conversion)
- [ ] **Plan details** - list features included in each tier
- [ ] **User management** - show current plan, allow plan changes, handle downgrades

### Launch Offers
- [ ] **First 50 users** - free premium for life (beta launch incentive)
- [ ] **First 100 users** - free premium for life (soft launch incentive)
- [ ] **Friend referral** - refer friend → 1 month free premium
- [ ] **Email subscribers** - give early access and discounts to newsletter signups

### Pricing Strategy
- [ ] **Cost analysis** - calculate server/API/storage costs
- [ ] **Market analysis** - research competing travel apps
- [ ] **User projections** - estimate user growth and revenue
- [ ] **Decide premium price** - balance profitability with attractiveness
- [ ] **Dynamic pricing** - monitor and adjust based on market response

### Legal & Compliance
- [ ] **Cookie policy** - format correctly, ensure legally compliant
- [ ] **Terms of use** - document acceptable use
- [ ] **Privacy policy** - data handling and user rights
- [ ] **License compliance** - verify all assets/APIs have commercial-use licenses
- [ ] **Tax setup** - register for VAT/sales tax if required
- [ ] **Sponsorship agreements** - legal templates for sponsor/ad deals

---

## PHASE 5: Marketing & Growth

### Content & Brand
- [ ] **Create mascot** - persona for app branding and in-app helper character
- [ ] **Social media strategy** - decide platforms: Instagram, TikTok, Twitter, LinkedIn
- [ ] **Influencer outreach** - contact small travel influencers (focus on free vs. paid partnerships)
- [ ] **Blog/content** - travel tips, destination guides, user stories
- [ ] **Email marketing** - newsletter with app updates and travel content

### Pre-Launch Marketing (Before Code Complete)
- [ ] **Figma prototype** - create compelling design prototypes
- [ ] **Landing page** - GitHub README with description, images, Figma link
- [ ] **Logo** - contact Nina, Kinga, or use AI
- [ ] **Branding** - establish color palette (OG brown + future grey)
- [ ] **Plan 10+ posts** - schedule content before launch
- [ ] **Canva templates** - one-color content for consistent visuals

### Launch Phase (At Release)
- [ ] **Beta version** - limited beta for first 50 users
- [ ] **Marketing countdown** - build hype 1-2 weeks before launch
- [ ] **Social media blast** - post on all platforms
- [ ] **Paid ads** - Google Ads targeting travelers
- [ ] **Press outreach** - travel blogs, tech media

### Post-Launch Growth (3-6 Months)
- [ ] **Premium trial conversion** - monitor conversion rate, adjust trial length
- [ ] **Sponsorship proposals** - prepare deck for travel companies (hotels, Booking.com)
- [ ] **Paid advertising** - Google Ads, travel company partnerships
- [ ] **User engagement** - regular updates, seasonal features (Easter/Christmas)
- [ ] **Seasonal features** - location-specific stickers and UI touches
- [ ] **Hotel booking integration** - only if profitable (future partnership)

### Analytics & Monitoring
- [ ] **PostHog integration** - user tracking and analytics
- [ ] **Conversion funnel** - track signup → trial → paid
- [ ] **User retention** - monitor churn and engagement
- [ ] **Revenue tracking** - cost vs. profit analysis
- [ ] **Feature usage** - which features drive engagement

---

## PHASE 6: Feature Roadmap (Lower Priority)

### Additional Features (To Implement After MVP)
- [ ] **Want to visit list** - track countries/cities for trip planning
- [ ] **Trip notes** - structured diary entries with date and stickers
- [ ] **Snapchat-style recaps** - auto-generated trip summaries
- [ ] **Printability** - print trips, journal entries, photo albums
- [ ] **Search & filtering** - search photos by location, date, tags
- [ ] **Sharing** - share trips or photos with friends
- [ ] **Collaboration** - invite friends to co-plan trips
- [ ] **Budget tracking** - per-trip expense tracking
- [ ] **Weather integration** - historical weather for visited dates
- [ ] **Map styles** - multiple map themes and overlays

### Design Variants
- [ ] **Modern grey theme** - secondary design, test A/B against brown
- [ ] **Dark mode** - optional dark theme for accessibility
- [ ] **Mobile optimization** - ensure mobile-first responsive design

---

## Technical Debt & Maintenance

### Performance
- [ ] **Monitor bundle size** - keep GeoJSON payload optimized
- [ ] **Lazy-load routes** - continue pattern for new pages
- [ ] **Image optimization** - compress photos before upload
- [ ] **Caching strategy** - effective LocalStorage and HTTP caching

### Code Quality
- [ ] **Strict TypeScript** - maintain no-any policy
- [ ] **ESLint compliance** - no warnings at build time
- [ ] **Component size** - keep components under ~150 lines
- [ ] **Accessibility** - WCAG 2.1 AA compliance
- [ ] **Testing** - unit tests for hooks and utilities (future)

### Documentation
- [ ] **README updates** - keep deployment and setup docs current
- [ ] **Code comments** - document complex logic
- [ ] **Architecture decisions** - record ADRs (Architecture Decision Records)
- [ ] **API documentation** - once backend exists

---

## Environment & Deployment

### Current Setup
- Node.js 20+, npm 10+
- Vite for bundling
- React 19 (functional components only)
- TypeScript (strict mode)
- Tailwind CSS (utility-first)
- MapTiler SDK
- ESLint

### Hosting & CI/CD
- [ ] **Vercel deployment** - planned hosting platform
- [ ] **GitHub Actions** - automate tests and builds
- [ ] **Environment variables** - manage secrets and API keys
- [ ] **Custom domain** - purchase and configure domain
- [ ] **HTTPS/SSL** - auto-renewed certificate (Vercel handles)

### Database Hosting
- [ ] **Supabase** - managed PostgreSQL (recommended)
- [ ] **Backup strategy** - daily backups with disaster recovery
- [ ] **CDN** - serve assets globally

---

## DEFINITION OF DONE (Launch Checklist)

Before releasing to production:

- [ ] All Phase 1 Frontend tasks complete
- [ ] Backend API functional and tested
- [ ] Monetization fully implemented (Stripe, plans, trials)
- [ ] All legal documents (policies, licenses, terms) approved
- [ ] Security audit completed
- [ ] Performance tested (load times, bundle size)
- [ ] Mobile responsive on all major devices
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Marketing materials ready
- [ ] Analytics integration (PostHog) active
- [ ] Monitoring/error tracking (Sentry) setup
- [ ] Customer support system ready

---

## SUCCESS METRICS

- **User Growth**: 100+ users by 1 month post-launch, 1000+ by 3 months
- **Conversion**: 10-20% free → premium trial, 30-50% trial → paid
- **Retention**: 60%+ 30-day retention, 40%+ 90-day retention
- **Revenue**: Positive unit economics within 3-6 months
- **NPS**: Target NPS > 50 (promoters - detractors)

---

## NOTES & CONSTRAINTS

- **Aesthetic**: Heritage travel journal vibe (paper, leather, warm brown palette)
- **Architecture**: React functional components, strict TypeScript, Tailwind-only styling
- **Data**: Always sync LocalStorage with backend when available
- [ ] **APIs**: All must support commercial use; flag any licensing issues
- **No Class Components**: Functional components and custom hooks only
- **Errors**: Never silent failures; always log and handle async errors explicitly
- **Performance**: Lazy-load routes, minimize GeoJSON payload, cache aggressively

---

## POINTS OF UNCERTAINTY (To Clarify)

1. **Backend timeline**: When to start backend work (before/after Phase 1 complete)?
2. **Chatbot priority**: Worth implementing LLM chatbot, or skip for MVP?
3. **Hotel booking**: Pursue partnership with Booking.com, or keep travel planning simple?
4. **Premium pricing**: $2.99/mo, $29.99/yr, or different based on market research?
5. **Sponsor strategy**: When to approach potential sponsors (launch or wait for traction)?
6. **Influencer budget**: Budget and approach for influencer outreach?

---

**Last Updated**: May 5, 2026
**Status**: Planning Phase
**Owner**: Zuzanna Mysłek

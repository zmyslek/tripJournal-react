# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for TripJournal. Session Replay, Error Tracking, and Support are enabled; setup-health, error lifecycle, and support-ticket signal sources are enabled; the scout troop, one app-specific scout, and two Replay Vision monitors are active.

Findings will begin appearing in the [Self-driving inbox](https://eu.posthog.com/project/193186/inbox) within about 30 minutes as new activity is collected and scheduled checks run.

## AI data processing

Approved by the organization-level setup gate.

## GitHub

GitHub was already connected before this setup run. No additional GitHub Issues responder was enabled because no external tools were selected.

## Products enabled

| Product | Result | Client check |
| --- | --- | --- |
| Session Replay | Already enabled | Web client initialization does not disable session recording. |
| Error Tracking | Enabled | Web client initialization does not disable exception capture. |
| Support (Conversations) | Enabled | An inbound Support channel is still required before tickets can arrive. |

The app is a browser-based React/Vite application using `posthog-js`; its initialization in `src/utils/posthog.ts` contains no replay or error-tracking opt-out overrides.

## Signal sources

| Source product | Source type | Action |
| --- | --- | --- |
| `health_checks` | `health_issue` | Enabled — configuration `01a0dce7-ac65-72c2-bd4e-eed67b97625f`. |
| `error_tracking` | `issue_created` | Enabled — configuration `01a0dce7-ac30-714a-aeb1-1c13c743abbe`. |
| `error_tracking` | `issue_reopened` | Enabled — configuration `01a0dce7-ac1b-74b3-8db1-065902a60300`. |
| `error_tracking` | `issue_spiking` | Enabled — configuration `01a0dce7-ac3e-70fb-a162-a31adbe6dad2`. |
| `conversations` | `ticket` | Enabled — configuration `01a0dce7-ac2c-7f69-b991-9ccc8105cec1`. |
| `signals_scout` | `cross_source_issue` | On by default; no opt-out row was created. |
| Session Replay | retired responder | Skipped; Replay Vision scanners are the supported route into the inbox. |

## Connected tools

No external tools were selected in the connected-tools prompt. GitHub Issues, Linear, Jira, Sentry, and Zendesk were left unused; no connected-tool responders or warehouse sources were created.

## Scout troop

The verified budget is **100 runs/day**, with **0 used** and **100 remaining** at setup time. The project is enrolled in early access; the current announcement says: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

### Active scouts

| Scout | Why it is active |
| --- | --- |
| General | Covers cross-product patterns and surfaces without a dedicated specialist. |
| Web analytics | Watches web traffic, attribution, landing-page health, bounces, and 404 changes. |
| Observability gaps | Finds meaningful event activity that lacks insight, dashboard, or alert coverage. |
| Travel-journal journey | Watches app-specific progression from welcome through country exploration, trip planning, itineraries, and gallery use. |

### Disabled scouts

| Scout | Reason |
| --- | --- |
| AI observability | No LLM telemetry was found. |
| Anomaly detection | No established dashboard or insight fleet is present. |
| APM | No server tracing/APM surface was found. |
| Conversations | Support is enabled but no inbound channel or ticket activity is configured yet. |
| CSP violations | No CSP reporting configuration was found. |
| Customer analytics | No account/group analytics surface was found. |
| Data pipelines | No CDP, batch export, or transformation surface was found. |
| Data warehouse | No warehouse source was selected or configured. |
| Error tracking | Covered by the native Error Tracking sources. |
| Experiments | No active experiments were found. |
| Feature flags | No active feature-flag surface was found. |
| Inbox validation | Kept paused on this fresh setup; there are no resolved Self-driving reports to validate yet. |
| Insight alerts | No insight-alert surface was found. |
| Logs | No PostHog Logs surface was found. |
| MCP tool calls | No product MCP telemetry surface was found. |
| PR follow-up | No delivery/merged-PR monitoring surface was configured. |
| Product analytics | No saved funnel, retention, or lifecycle surface was found. |
| Replay Vision | Kept off; it is an aggregate analyst layer, while the monitors below provide replay coverage. |
| Revenue analytics | Payments are preview/planned only; no live revenue integration was found. |
| Session replay | Covered by the Replay Vision monitors. |
| Skills store | Skill-store hygiene is not a product surface for this app. |
| Surveys | No surveys were found. |
| Tasks | No PostHog Tasks surface was found. |
| Web vitals | No established web-vitals surface was found. |

The disabled scouts can be enabled later from the inbox if their corresponding product surface becomes active.

## Custom scouts

### Created

| Scout | What it watches | Discriminator | Why custom coverage is useful |
| --- | --- | --- | --- |
| `signals-scout-travel-journal-journey` | The route progression from welcome to country exploration, trips, itineraries, and gallery. | Stable visits to an earlier stage combined with a material fall in continuation to the next stage. | The active web scout owns traffic and landing-page health, while this scout owns TripJournal’s internal travel-planning journey. |

The custom scout was grounded in `src/App.tsx` and the country, itinerary, and gallery flows. It cross-checks Error Tracking and Replay Vision before reporting a route-specific impact, avoiding duplicate defect reports.

The gallery upload/storage and itinerary editing surfaces were considered separately. They were not added as separate scouts because their visible failure modes are already better covered by Error Tracking and Replay Vision, and the app currently has no dedicated success/failure event pair for those operations.

If this scout becomes noisy, set its config’s `emit` value to `false` in PostHog to switch it to dry-run mode.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes qualifying observations into the inbox. These are the only objects created here that spend Replay Vision quota. Findings arrive at half weight, so they need independent corroboration before becoming a report.

| Monitor | Status | Scope | Sampling | Estimate |
| --- | --- | --- | --- | --- |
| Trip planning breakage | Created | Recordings on the `/trips/` and `/itineraries/` completion flow, covering country-to-trip and itinerary planning. | 50% | 0 observations / 0 credits per month from the current one-day estimate. |
| Travel journal frustration | Created | Recordings containing `$rageclick`; no URL filter was added, keeping it distinct from the breakage monitor. | 100% | 30 observations / 150 credits per month from the current one-day estimate. |

Replay Vision has a remaining quota of 2,500 credits for the current period and was not exhausted. Session recordings already exist, so the monitors can begin observing immediately.

You can rate observations from either scanner in [Replay Vision](https://eu.posthog.com/project/193186/replay-vision); those ratings produce recommendations you can review for improving scanner configuration.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so the enabled Support ticket responder receives tickets.

## Files changed

| File | Change |
| --- | --- |
| `posthog-self-driving-report.md` | Created this setup report. |

No application source files were modified.

## What happens next

The scout coordinator picks up fresh scout configurations within about 30 minutes. Scout runs draw from the verified daily budget, then findings cluster into reports in the [Self-driving inbox](https://eu.posthog.com/project/193186/inbox); immediately actionable reports can begin coding tasks.

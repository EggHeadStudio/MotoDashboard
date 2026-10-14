# MotoDashboard — Batch 7

## Milestone 0 audit and plan — 2026-10-14

Baseline `4c9fa7d`, clean main matching origin/main. The operator reports Batch 6B
deployed/core working; this is not independent console/physical-device acceptance.
The complete pasted Batch 7 request was read. Previous security/migration evidence
and all future requirements are retained. No application code changed during this
audit; no push, deployment, production data operation or software installation.

### Reuse and confirmed source findings

- Public profiles use `#/rider/{UUID}` and known-ID server reads. Public root/listing
  and private owner records are separate; vehicle reads require source privacy,
  incarnation, opt-in mapping and current slots. Original Garage remains private.
  Existing minimal displayProfiles includes private-profile names for addressed
  invitation search; it is unsuitable as public-only People discovery.
- Discover currently provides Clubs and Ride/Drive/Meet/Event, 20-row bounded
  queries and snapshot cursors. Existing 18 composites/exemption remain required.
  No searchable opt-in public-profile directory exists.
- Showcase controls are buried behind "Showcase options" and Profile's featured
  selector; Garage cards lack explicit effective publication state. Owner reads can
  preview private safe cards, so visitor-mode preview needs current policy/source
  verification, not just opening an owner-readable URL and calling it public.
- `setFollowMapView` hard-codes first zoom 16 and starts animated pans per sample.
  Whole-map rotation multiplies by aspect/bearing-dependent CSS scale; portrait
  angles can enlarge the map several times. Current per-sample heading smoothing
  plus CSS transitions and unreliable `originalEvent` gesture detection add uneven
  motion/zoom override risk. One accepted GPS pipeline/watch is already shared.
- Completed rides reuse the live dashboard behind a detail strip. Live clock,
  weather/status/speed and controls remain visible despite stopped GPS. Keep
  route loading/exports/history and use a dedicated read-only mode.
- Local schema v2 routes contain latitude/longitude/timestamp/accuracy/speedKmh/
  heading and explicit `{break:true,timestamp}` separators. Cloud schema v1 uses
  validated/hash-checked JSON chunks with the same points. Timestamps enable replay
  without new GPS/Firestore uploads or an incompatible recording schema.
- Firestore uses memory cache, 12s wrapper deadlines, safe operation codes and one
  failed-read retry. Promise.race does not cancel underlying SDK work; repeated
  timed-out UI reads and stale responses need coalescing/epoch guards. Existing
  optional background errors should remain local. No offline service worker exists.
  Production Wi-Fi/cellular root cause cannot be inferred from source inspection.

### Design and sequence

1. **People search:** dedicated exact safe profileDirectory, signed-in only, lowercase
   name prefix, min two characters, max 10/page, snapshot cursor for duplicate names.
   No anonymous enumeration or querying private user/displayProfiles collections.
   Enforce privacy/removal/current-name coupling through atomic Rules getAfter checks.
   Keep legacy public profiles safe; index them only on owned login/save, never
   publish private accounts. Add one needed composite and tests/validator gate.
2. **Showcase:** reuse bounded own settings/card mappings, explicit publication/
   featured/effective-state labels, direct publish/hide/featured/link/visitor preview.
   Verify visitor privacy/current source even for owner preview. No silent publishing.
3. **Camera:** coverage by larger rotation canvas rather than CSS magnification;
   serial visual camera and stable heading, speed-aware zoom/default preference,
   manual gestures interrupt until explicit recenter. Keep recorded samples intact.
4. **Saved viewer:** isolated read-only interface, only available recorded metadata,
   route overview, History back and existing exports. Never display historical weather.
5. **Replay:** pure model using ordered valid timestamps, binary seek and segment/gap
   boundaries, timestamp interpolation only within an actual recorded segment;
   controls/marker/progress/follow/overview, no current GPS or additional uploads.
6. **Network:** bounded visible recovery, coalesced reads and stale-loading cleanup,
   safe distinct diagnostics and no blind write replay. Retain documented live diagnosis.
7. **Final checks/docs:** all existing security and Worker regressions, browser/Pages,
   EN/FI/layout, rules/index/workflow gates; report exact final counts and untested
   production/native devices. Update current plan/schema/runbook; commit and stop.

Sources: [Rules string normalization](https://firebase.google.com/docs/reference/rules/rules.String),
[query constraints](https://firebase.google.com/docs/firestore/security/rules-query),
[document cursor pagination](https://firebase.google.com/docs/firestore/query-data/query-cursors),
[Leaflet camera API](https://leafletjs.com/reference.html#map-setview).

### Boundaries and open risks

Firestore Rules can bound rows/auth/fields but do not provide per-account rate
limiting. UI cooldown/min-prefix/page bounds reduce casual enumeration; determined
authenticated scraping/abuse remains a wider-release concern requiring a reviewed
trusted rate/App Check design. Never describe client throttling as authorization.
No paid search/storage/media/backend, new Worker protocol or weaker origin/ACL is
needed. Existing profile/Club retirement/erasure and token/lease limitations remain.
Media/customization, final branding/polish and optional marketplaces are future
milestones in IDEA.md Section 23, together with all prior agreed requirements.

## Progress

- Milestone 0: complete; source implementation has not begun.
- Milestones 1–7: pending sequential implementation and actual verification.
- Physical/native Safari/production account tests: NOT RUN.
- Push/deployment/production writes: NOT PERFORMED.

Each subsequent milestone records actual files/checks/commit and remaining limits.

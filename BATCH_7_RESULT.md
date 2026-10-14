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

- Milestones 0–6: complete locally with checks/commits.
- Milestone 7: final full verification/documentation pending.
- Physical/native Safari/production account tests: NOT RUN.
- Push/deployment/production writes: NOT PERFORMED.

Each subsequent milestone records actual files/checks/commit and remaining limits.

## Milestone 1 — People discovery

New profileDirectory repository/synchronization, People discovery view and Batch 7
EN/FI dictionary; connected to existing Discover/native hash profiles. Exact seven
public fields (id, displayName, searchName, nullable category, accent, visibility,
updatedAt); signed-in search only, limit 10, document-snapshot pagination. Minimum
two characters, 500ms submission cooldown and 50 loaded matches before refining.
No global user download or private recipient/profile/Garage query. Club member and
Group participant profile links remain connected to the existing public resolver.

Directory writes prove immutable own alias, active/Public preferences, current
private name and safe root name. Privacy/retirement cannot retain the directory;
name/category/accent edits cannot retain a stale entry. Existing Public profiles
index through owned login/save, never through admin backfill or private publishing.
All profile/showcase/affiliation transactions preserve that coupling.

One new composite: **profileDirectory(visibility ASC, searchName ASC)**, Collection
scope, retaining all previous 18 and routeChunks.pointsJson exemption. Validator,
workflow summary/security gate and browser fixtures reflect **19**. No Worker,
secret, paid service or runtime dependency changes.

Actual emulator found a helper collision (renamed) and Firestore Rules lower()
folding ASCII only. EN/FI normalization explicitly folds A–Z/Ä/Ö/Å in both client
and Rules; other scripts remain valid/case-preserved. Broader accent/script folding
needs a reviewed trusted normalizer, not client-forged normalized names. A REST
duplicate-name test also needed explicit document-name ordering in its cursor;
the browser SDK already derives this from a DocumentSnapshot.

Checks: **96 new actual-emulator assertions**, including eight-write showcase/index
transactions, privacy/retirement/malicious fields, rename, foreign access and 23
duplicate-name results over three pages; **135 existing 6B assertions** pass.
**5 Batch 7 browser cases + 20 Batch 6B cases** pass. **10 deployment contracts**,
index/config validation and **3 YAML/15 Bash** checks pass; all completed final
checks zero failed/skipped. Production indexes/phone policy remain NOT RUN.
Only M1 checks have run; the complete final regression is still milestone 7.

## Milestone 2 — clear showcase controls and visitor preview

Garage cards distinguish unpublished/private, selected while profile Private,
effectively visible, featured and unavailable/unverified. Direct Show on profile
still requires the separate public description/consent form; Hide removes the card,
not the private vehicle. Featured changes use current owner transaction data,
preserving theme/privacy and directory consistency. Profile/Garage both link to the
public URL and Preview as visitor. Existing Showcase options remains useful for
editing its separate public text; no duplicate publishing system or paid restriction.

`profileVisitor.js` checks an owner's current server preferences and source mappings/
visibility/incarnations/member/rank before that owner sees the shared-page view.
Private/retired owner profiles are unavailable in this mode; retained owner-readable
private vehicles cannot masquerade as visitor-visible. Foreign/anonymous reads are
still enforced by actual Rules. This preview does not impersonate an anonymous SDK
identity or certify production permission; real second-account/anonymous acceptance
remains required. All openings use server reads and bounded child concurrency.

Garage status loads only up to four published mappings/cards, rather than one status
read per private Garage item. Unknown errors are labeled unverified; no automatic
publication. An owner visitor preview adds bounded private proof reads (up to three
per vehicle plus affiliation source/rank checks and preference recheck); ordinary
public rendering never exposes those private proofs.

Checks: **8 cumulative Batch 7 browser cases**, **20 Batch 6B cases**, **96 new Rules
assertions** and **2 Pages groups (309 references/87 URLs)** pass, zero final
failed/skipped. Existing 135 6B Rules assertions passed with the unchanged M1 policy.
No Rules/index/Worker change is introduced by M2. Phone/native Safari remain NOT RUN.

## Milestone 3 — smooth heading/follow camera

Confirmed source causes: initial zoom 16; bearing/aspect-dependent CSS scale;
per-sample animated pans plus CSS rotation transitions; unreliable originalEvent
gesture detection and native rotated pinch operating beside custom rotation.
The replacement uses one visual requestAnimationFrame owner, actual-fix center
interpolation, short-angle heading smoothing and no overlapping Leaflet animations.
Overscanned square coverage preserves the same visual zoom instead of scaling;
north-up returns to the normal viewport after its smooth transition.

Default follow zoom is 15 and configurable (13–17) from Home Map preferences.
Speed bands have hysteresis and widen follow, with bounded half-step zoom at most
every four seconds. Automatic camera/heading avoids accuracy above 35m; the original
55m recorder threshold is unchanged. No extrapolated position or modified timestamp,
distance, speed or route point enters recording/live transmission.

Real pointer/touch/wheel/keyboard gestures interrupt follow until Center. Rotated
pinch/drag uses the visual angle and center zoom, with native rotated pinch disabled
to avoid competing handlers. HUD/attribution/live labels remain unrotated. Hidden
shell/document suspends visual frames, logout clears old camera data, and page exit
cancels pending frames. Raster keepBuffer is reduced from 12 to 3; themes/providers
are retained and physical rendering/provider performance remains manual acceptance.

New module/test: follow-camera.js and camera-tests.js. Removed superseded
setFollowMapView/computeRotationVisualScale/per-sample smoothing constant only after
reference checks; no entire working module/test was removed. Recording code/schema,
Rules/indexes and Worker are unchanged in M3.

Checks: **26 deterministic camera assertions**, **11 cumulative Batch 7 browser
cases**, and **the full existing browser matrix** pass (zero final failed/skipped).
Actual Leaflet tests check no magnification, one watcher, default/urban/highway
behavior, manual hold/recenter/north transition and original saved GPS values.
Old instantaneous-north assertion now waits for the requested smooth transition.
No physical Safari/GPS/rendering benchmark or production test is claimed.

## Milestone 4 — dedicated saved-ride viewer

New saved-ride UI/styles isolate title/date, recorded elapsed/moving duration,
distance/average/max/vehicle, route and History back/export/share. Missing statistics
are omitted; an absent vehicle says Not recorded, never the current Garage default.
Current weather/GPS/network/clock/speed/orientation/sharing/recording UI is hidden
and inert. Old GPS position/accuracy layers are removed; no watch starts. Existing
active-record/live conflict guard remains. Language changes are supported in the
viewer without destroying controls; a test caught/fixed a parent-label text binding.

Route bounds use one pass instead of allocating a second full point array. Completed
routes are read-only references, avoiding a duplicate route clone. Portrait/landscape
fit accounts for metadata coverage; navigation/logout closes and clears the private
view. Export/share feedback appears inside the viewer. Superseded last-point helper
and its unused app wrapper/import were removed after reference checks; recorder
sampling/statistics/storage/export schema remains unchanged.

Checks: **12 cumulative Batch 7 browser cases**, 26 nested camera assertions and
the **full existing browser matrix** pass; cloud fresh-storage JSON/GPX/share and
GPS/history/account regressions retained. A targeted rotation/resize check confirms
finite Leaflet center and usable bounded landscape panel. Zero final failures/skips;
physical phones/native Safari and production tests remain NOT RUN.

## Milestone 5 — recorded route replay

Pure ride-replay model indexes original points with typed time/source/segment arrays,
uses binary seek and interpolates only within a valid observed interval. Explicit
breaks, >15s gaps, invalid coordinates and impossible recorded jumps separate paths;
position is hidden between their anchors. Missing/nonmonotonic times, zero-duration,
empty/single-point routes get overview-only feedback. Duplicate observations are
handled without invented intervals. No stored schema/statistic/source point is changed.

Saved viewer supplies Play/Pause, timeline/seek, 1×/2×/4×/8×, Restart/completion,
vehicle marker, route progress, opt-in camera follow and Full route overview. Manual
map gestures clear replay follow; background/page exit pauses; close/logout tears
down marker/routes/frames/listeners. No current GPS, live publisher, SDK write or
extra upload exists in replay. Existing validated lazy cloud routes and local routes
both use the same model. Current instrumentation stays hidden.

One pass prepares the model; display geometry is capped around 2,501 sampled points
with separate gap paths. The complete original points remain available for binary
seek and unchanged exports. Progress path drawing is throttled to 10Hz; marker
interpolation uses one RAF. Simplification is explicitly disclosed for long routes.
This is an approximate visual replay of recorded fixes, not missing telemetry or a
claim that the vehicle followed a known exact road between samples.

Checks: **25 deterministic replay assertions** (including 50,000 points, gaps,
invalid/missing/duplicate times/coordinates, dateline and immutable originals),
**14 cumulative Batch 7 browser cases**, 26 camera assertions and full existing
browser regressions pass, zero final failed/skipped. Actual local saved replay tests
cover controls/end/follow/overview and zero active GPS/extra Firestore writes; teardown
removes replay marker/UI. No native Safari/physical phone benchmark is claimed.

## Milestone 6 — bounded request recovery and safe diagnostics

Identical same-account/reference/query/method pending reads share one SDK operation
using SDK refEqual/queryEqual. A timed-out caller can attach to the same underlying
read; it cannot create a new duplicate query storm. No result cache or cross-account
reuse is added; entries clear on settlement/account change and are bounded at 128.
An SDK request cannot be cancelled by Promise.race; a permanently stalled channel
may require tab reload/reopen while preserving local storage. No forced polling or
global network reset is introduced without production transport evidence.

Own-service initialization has a 12s deadline, public profile opening a 25s workflow
deadline with visible Refresh, live identity a 12s deadline before existing ticket/
socket deadlines. Initial Group observation has a scoped timeout without granting
authority; its listener can still recover. Offline/TIMEOUT/PERMISSION/PRECONDITION/
AUTH/UNAVAILABLE/NETWORK are distinct, enum-scoped diagnostics. Caller errors are
separate sanitized objects so shared work cannot overwrite another operation's label.
No payload/UID/location/token is logged; read diagnostic aggregates contain counts only.
Writes are never coalesced or replayed on timeout; original refresh-before-retry warning
and one transient read retry remain. Optional People errors remain inline, and explicit
retry bypasses submission cooldown (a browser test caught the lost immediate Retry).

Checks: **16 cumulative Batch 7 browser cases** and **13 Batch 6A cases** pass,
zero final failed/skipped; pending-read reuse, safe scopes, failure/retry, shared Group
watch recovery and exact teardown are covered. Cloudflare Worker/protocol/config/
secrets remain unchanged. Production Wi-Fi/cellular failure remains unconfirmed;
final runbook requires safe operation/domain/timing comparison, not a claim of cure.

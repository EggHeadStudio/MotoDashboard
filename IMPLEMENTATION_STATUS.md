# MotoDashboard - Implementation Status

## Current registration fix and roadmap update - 2026-10-10

Baseline: `198d72a` (`first new working deployment`), following security commit
`eea3d0d`. The user reports that the existing application is deployed to GitHub
Pages, connected to the real MotoDash project and working locally/publicly.
That report supersedes the older local-only deployment status below; this session
did not independently certify Console contents, inventory, all two-account security
paths or physical devices. Historical checklist evidence remains dated evidence.

**Implemented locally:** registration-only required Confirm password input with
exact matching before the Firebase call. Both fields must be nonempty; original
six-character validation and Firebase policy errors remain. English/Finnish labels
and mismatch messages use the central dictionary. Mismatch focuses confirmation,
marks it invalid and links it to the live status message, preserving both inputs
for correction. Both registration fields use `new-password`; login continues with
`current-password` and no confirmation constraint. Existing submission guard blocks
repeated requests. Both fields clear on successful/failed Auth requests, mode change
and dialog close. The app adds no password logging/storage, and confirmation is
never passed to the Firebase adapter/SDK.

Only this registration behavior was implemented. Firebase adapters/configuration,
Firestore/RTDB rules, indexes, GPS/maps/weather/recording/history/Garage/Clubs,
stylesheet, manifest and deployment workflow are unchanged.

| Changed file | Purpose |
| --- | --- |
| `index.html` | Registration confirmation row and accessible atomic status |
| `js/auth-ui.js` | Registration validation, focus/error lifecycle and confirmation cleanup |
| `js/i18n/dictionary.js` | Exact English/Finnish confirmation labels and mismatch errors |
| `tests/password_confirmation_browser.py` | 17 named registration/login/accessibility/mobile regression cases |
| `tests/firebase_mocks.py`, `tests/batch2_browser.py` | Fill confirmation in existing successful registration scenarios |
| `tests/run_browser.py` | Include the new regression suite in the normal full browser run |
| `IDEA.md`, this file | Immediate fix result, future milestones, priorities and actual validation evidence |

### Verification actually performed

Commands from the repository root:

```powershell
$env:PYTHONPATH = "$env:TEMP\motodash-test-tools"
python -u tests/run_browser.py
python -u tests/run_release_paths.py
git diff --check
```

| Final check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Full Chromium browser regression | 15 PASS groups | 0 | 0 |
| Confirmation suite, included in the full run | 17 named cases | 0 | 0 |
| Deterministic GPS/route/heading/storage/weather, included in the full run | 36 assertions | 0 | 0 |
| Pages/degraded-Firebase regression | 2 PASS groups | 0 | 0 |

Counts overlap as indicated; do not add the included cases to the group total.
The initial confirmation run failed a close-cleanup assertion because it checked
before the asynchronous dialog close event; the test now waits for the actual
cleanup/focus state. The final full run passes with the required expectation intact.

Coverage: matching success, exact whitespace/case mismatch, empty original/confirmation,
zero SDK registration calls for invalid input, existing minimum, stricter Firebase
policy errors, English/Finnish live errors/labels, accessible status/focus, duplicate
submit denial, unchanged login and no password-reset implementation. The synthetic
SDK receives only Auth/email/password arguments. App local/session storage and profile
records contain neither test password; synthetic `__mockAccounts` fixture storage is
explicitly separate and is never a production credential source.

Existing Auth/profile/persistence/error/retry/account-isolation scenarios pass.
The full suite also covers native JS parsing/linking, dictionary parity/fallback,
DOM IDs/relative imports, retained dashboard/GPS/maps/weather/recording/history,
Garage, scoped rides/exports, Club joining/approvals/roles/ranks/branding/Wall and
real Firebase 13.0.0 SDK imports with cloud APIs blocked.
Pages checks find 103 references and 44 distinct local URLs returning HTTP 200
under `/MotoDashboard/`; unavailable Firebase still permits guest recording/history.
No emulator rerun was needed for this form-only change: authorization/schema files
are unchanged. The earlier 102 baseline + 137 security results below remain historical,
not newly executed results. No live Firebase test or production operation was run.

320x568, 390x844 portrait and 568x320 landscape modal bounds, scroll reachability,
44px controls and keyboard navigation pass. English/Finnish 320px screenshots were
saved outside the repository and visually inspected. They are simulated Chromium
viewports, not real phone/software-keyboard/password-manager certification.

### Roadmap additions (planning only)

- SECTION 2: Account Management / Authentication Enhancement groups forgot password,
  change password, Google popup/redirect/linking and complete account deletion.
- Complete deletion is mandatory before wider public beta: recent reauthentication,
  trusted resumable cleanup of personal/Garage/ride/chunk/Club/media data, explicit
  owned-Club policy, no orphaned records or stale-job resurrection, preserved
  nonpersonal retired-ID reservations, then coordinated Firebase Auth deletion.
- SECTION 3 + SECTION 9: later Media & Branding covers all Garage vehicle images,
  Club logos/banners, rank graphics/presets/hierarchy and optional themed sessions;
  secure optimized uploads, access rules, replacement/deletion and safe fallbacks.
- Section 8 explicitly documents the current Blaze requirement for Firebase Storage
  and Functions deployment, approval for billing/service selection, regional usage
  costs and monitoring. No service or billing plan was changed.
- SECTION 16: major modern/premium/minimalist mobile redesign using one design
  system, after core functionality including Official Activities and before public
  launch; preserve riding readability, touch/accessibility and both languages.
- Section 15.10 records the new priorities and beta/launch gates. Group Sessions,
  Live Group Map, Lobby, QR, Official Activities/rewards and every other agreed
  original product requirement remain. No existing section was renumbered.

### Manual acceptance remaining and stop

- On physical Android/iPhone browsers, check registration in both languages,
  software keyboard, scrolling, screen-reader error announcement, tab/focus behavior
  and password-manager/autofill use with two `new-password` fields.
- After separately authorized publication, verify this new confirmation flow against
  live Firebase: mismatch/empty creates no account; a matching policy-compliant
  password registers; login and stricter-policy feedback work.
- Continue recording exact Console/index/inventory/two-account/device evidence using
  DEPLOYMENT_CHECKLIST.md; generic reported functionality is not every security check.

Local commit message: `fix: confirm password during registration` (see `git log -1`).
No push, deployment, production-data modification or next batch is part of this
session. **STOP after the local commit; wait for explicit user approval.**

## Historical Security Fix Batch - 2026-10-10

User-authorized security corrections are complete locally. Base commit:
`a598aec90849c56c13e3a1490875793b9b0937ba`. One separate local security commit
contains the following files; no push, rules deployment or production-data changes.
RTDB, Firebase configuration, indexes and the Pages workflow remain unchanged.

| Changed file | Purpose |
| --- | --- |
| `firestore.rules` | Member-only canonical reads, exact safe pages, atomic projection integrity and irreversible retirement/child guards; client hard deletion denied |
| `js/data/club-page.js` | Explicit presentation-only field selector, without authorization fields |
| `js/firebase/clubRepository.js` | Safe nonmember reads/joins, synchronized page writes and atomic retirement instead of recursive purge |
| `js/club-ui.js` | Visible retirement/retention explanation before the destructive action |
| `js/i18n/dictionary.js` | Matching English/Finnish permanent-retirement labels, explanation and confirmation |
| `tests/run_rules.py` | Preserve baseline coverage with the stronger privacy/retirement contract |
| `tests/run_security_rules.py` | Track the four formerly failing security expectations and related positive/negative regressions |
| `tests/clubs_browser.py` | Safe nonmember model and retained-ID retirement UI/repository regression |
| `tests/run_release_paths.py` | Portable Pages paths, scoped worker cleanup and unavailable-Firebase guest checks |
| `DEPLOYMENT_CHECKLIST.md` | Current security results, preserved historical failures, pending release gates and ordered migration/manual acceptance |
| `DATA_MODEL.md`, `README.md`, `tests/RULES_TESTING.md`, `IDEA.md`, this file | Current data/access/retirement contract, reproducible tests and agreed product scope |

**Root causes and corrections:** canonical public Club gets/queries returned
`ownerUid` and `lastMembershipUid`. Private canonical reads now require live
membership/Owner; exact safe `clubPages/{id}` supports public/unlisted/invited browsing.
No frontend filtering is relied on. Rules require synchronized pages on every
canonical change and reject malformed pages even on reads.

Previous parent deletion allowed a different founder to reuse an ID, exposing its
old private Wall and reusing invitations. Repository creation keeps fresh UUIDs,
independent of names. Archived owner-only Clubs now retire atomically: state deleted,
page/directory/founder ref removed, canonical ID reservation and private children
retained. Hard deletion, replacement/reactivation and every retained-child access
are denied, including former Owner and addressed invite/request read exceptions.
The four original failed assertions are corrected through authorization changes.

**Executed verification:** baseline emulator **102 passed / 0 failed / 0 skipped**;
additional security suite **137 passed / 0 failed / 0 skipped**. The additional runner
rebuilds the baseline first; do not count its repeated baseline run twice. Baseline
counts include fixture reads, additional counts exclude fixture setup/inspection.
Full browser suite: **14 PASS groups**, including **36 deterministic assertions**;
Pages/degraded-Firebase suite: **2 PASS groups**, **103 references**, **44 local URLs
HTTP 200** under `/MotoDashboard/`. No failed/skipped cases. `git diff --check` passes.

Real rules tests use only emulator 1.20.2/Java 21 at fixed localhost `demo-motodash`.
Browser product scenarios use SDK fixtures; real pinned SDK imports block cloud API
requests. Existing creation/edit/join/approval/leave/roles/ranks/branding/Info Wall,
Garage/private history, localization, dashboard/maps/GPS/weather/recording pass.
No live-project Auth, Firestore persistence/security, migration or phone success
is inferred from these results. No real account credentials were created.

**Remaining release blockers:** Console/deployed rules (B3), production indexes
(B4), real-account/two-account/physical-device acceptance (B5), and approved existing
Club inventory/backfill/old deleted-orphan ID reservations (B6). Production data was
not read or modified. Old clients require the coordinated compatible rollout.
Retirement is irreversible access revocation, not physical erasure; future trusted
operator erasure must preserve the canonical retired-ID reservation forever.
Previously disclosed data cannot be retracted. Rules do not constrain IAM/Admin
bypass; migration/erasure operators must preserve that invariant. SDK transaction
contention/load and physical-browser acceptance remain manual work.

**NOT RELEASE READY. STOP after this local security commit.** Deployment and
production-data work require a separately authorized session. Exact procedures:
[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

## Historical Batch 2 record (2026-10-09)

The test counts below are historical. Current security fixes and the data contract
above supersede the old public canonical reads and physical Club deletion behavior.

Date: 2026-10-09. Historical scope: user-authorized **Batch 2**, following Batch 1
commit `fcfbb81` on `main`. All eight milestones are implemented locally and
separately committed. A final documentation commit records this review.
**No GitHub push, Pages deployment, Firebase rules/index publication, live-project
write or physical phone test was performed.** RTDB remains default-deny.

## Milestones and commits

| Milestone | Implemented locally | Commit |
| --- | --- | --- |
| 1: Firebase/security | Dedicated config validation, one app, same-project services, shared Auth state, localized data errors, exact schema/authorization rules and real emulator tests | `244a035` |
| 2: Personal Garage | 12 categories; view/add/edit/delete/default/choose; validation, owner guard, private Firestore repository, localized mobile dialog and placeholders | `e1169ae` |
| 3: Dashboard vehicles | Compact selection before starting; immutable historical vehicle ID/display snapshot/category; deletion preserves ride identity | `c4cc85a` |
| 4: Private cloud rides | Local account scopes, completed-only manifests/immutable bounded chunks, durable retry jobs, stable IDs, revisions, deletion fences and safe Auth changes | `cc9c0b0` |
| 5: History/export | Paged own cloud history, cached validated route details, rename/delete, JSON v1, segmented GPX 1.1, Web Share/cancellation/download fallback | `57a79b3` |
| 6: Clubs | Creation/edit/page/discovery, own Club index, open/approval/UID invite/private admission, reject/reapply/approve, multiple memberships, leaving, archive and guarded deletion | `468e776` |
| 7: Roles/ranks | Central permission helpers, Owner/Admin/Host/Member controls, custom rank CRUD/assignment, no permission from titles or self-promotion | `b9b0783` |
| 8: Branding/Wall | Controlled readable primary/accent/route colors, category identity, five safe links, plain Info Wall, future theme data and final review fixes | `3ea8edd` |

Each milestone had automated checks before continuing. The final review additionally
fixed missing-own-membership reads needed for legitimate joining, UID invitation
form capture before disabling inputs, private-Club directory deletion attempts,
stale account responses, rank paging/reference display, signed-in active refresh
restoration, detached localization binding cleanup and explicit name conflict recovery.
No authorization was broadened to global authenticated writes.

## Current architecture and data

Static `index.html`, one `css/dashboard.css` and native browser ES modules still
serve directly from repository root. `.github/workflows/deploy.yml` uploads `.`
on main push/manual dispatch; no workflow change, build, npm dependency, Node
application runtime, framework, TypeScript or custom application backend was added.
All app paths remain relative and browser tests run under `/MotoDashboard/`.

The existing Leaflet/maps, Open-Meteo, GPS pipeline, speed/heading/route recorder
and dashboard lifecycle remain in place. Feature screens are native responsive
dialogs. `auth-state.js` provides the identity boundary; every repository also
rechecks SDK Auth and server rules remain authoritative. Firestore uses memory
cache. Account changes flush the old local record, stop GPS/Wake Lock, hide old
routes/markers/history/Garage/Clubs and ignore stale responses. Guest rides have
a separate local scope and are never claimed or uploaded on login.

Local schema remains v2 with optional ownership/vehicle/sync fields. IndexedDB and
per-record localStorage fallback are filtered by UID; clearing one scope preserves
other scopes/preferences. Local writes and conditional sync acknowledgement are
serialized within each store. Active rides remain local. Only completed rides
upload: cloud schema v1 manifest, <=128 points/48,000 characters per immutable
route chunk, <=32 chunks per write batch, SHA-256 route hash and ready marker.
There are no per-GPS Firebase writes. Durable upsert/delete jobs survive refresh
and retry on login/online/manual retry. A permanent per-ID tombstone prevents
stale uploads resurrecting deleted rides. Name revision conflicts preserve the
local copy; confirmed Reload cloud version discards the pending edit, without
silently overwriting another device. Export a copy first if needed.

History queries return 20 manifests per page; routes fetch in 32-chunk pages only
for detail/export. Deletions/rename remain queued while disconnected. Delete all
fetches all account history pages before queuing deletion, aborting if it cannot
verify the cloud inventory. A saved vehicle snapshot survives Garage deletion.

Clubs use canonical immutable ownerUid, membership subdocuments and private
account refs, synchronized safe-page/discovery projections, join requests and
7-day UID-addressed invitations. Private Clubs are hidden from unrelated accounts.
Owner cannot leave/transfer; archive closes admission and discovery. Permanent
retirement requires archive and no other members, preserves the canonical ID
reservation and denies retained children (superseding Batch 2's unsafe purge).
Admin can manage other Host/Member accounts and
branding/ranks/requests; cannot change Owner/other Admin/own role or privacy/policy.
Host/Member have read/self-leave only in this batch. Visible ranks grant no rights.

Branding applies inside the Club page. Six-digit colors choose black/white text
with at least 4.5:1 contrast; links are parsed/revalidated as HTTPS without
credentials, with length bounds and noopener/noreferrer. User content uses
textContent. Info Wall is a 4,000-character plain-text announcement. Placeholder
logos avoid unconfigured uploads and external image tracking. Prepared theme data
never changes the current dashboard or starts Group Sessions.

Exact contracts: [DATA_MODEL.md](DATA_MODEL.md), [EXPORT_SCHEMA.md](EXPORT_SCHEMA.md)
and `firestore.rules`/`firestore.indexes.json`.

## Files created/changed in Batch 2

New app modules:

- `js/auth-state.js`, `js/ui/forms.js`.
- `js/data/schema.js`, `permissions.js`, `route-codec.js`, `branding.js`.
- `js/firebase/access.js`, `garageRepository.js`, `sessionRepository.js`, `clubRepository.js`.
- `js/garage-ui.js`, `club-ui.js`, `club-members-ui.js`, `club-branding-ui.js`.
- `js/session-sync.js`, `js/session-export.js`.

Modified app/config: `index.html`, `css/dashboard.css`, `js/app.js`,
`js/auth-ui.js`, `js/firebase/firebase.js`, `js/session-store.js`,
`js/session-manager.js`, `js/i18n/dictionary.js`, `js/i18n/i18n.js`,
`firestore.rules`. Added `firestore.indexes.json`. Existing dedicated web config,
RTDB rules, manifest, deployment workflow and map/GPS/weather modules are retained.

Documentation: `IDEA.md`, `README.md`, this status file, `DATA_MODEL.md`,
`EXPORT_SCHEMA.md`, `tests/RULES_TESTING.md`.
Tests: expanded `tests/run_browser.py`/`firebase_mocks.py`; new
`tests/batch2_browser.py`, `clubs_browser.py`, `run_rules.py`.
Existing deterministic `tests/domain-tests.js` is retained.

## Executed automated verification

Commands: `python tests/run_browser.py`, `python tests/run_rules.py`, and focused
`python tests/run_browser.py --clubs-only` after the final URL-bound correction.
Python Playwright/Chromium and the official Firestore emulator 1.20.2/Java 21 were
available as development tools outside the app. `git diff --check` passed.

- Native browser parsing/linking of all app modules, relative paths, DOM IDs,
  English/Finnish dictionary parity/fallback/interpolation, locale refresh and
  console/unhandled-rejection monitoring passed.
- 36 deterministic GPS/route/heading/storage/weather assertions passed, plus
  simulated real-Leaflet recording/finish/history/details/heading/theme/offline/
  active-refresh/permission-retry browser scenarios.
- SDK fixtures passed registration/login/logout/profile/language/retry/UID guard;
  Garage motorcycle/car CRUD/default/selection/reload/logout-login and narrow
  viewport checks; vehicle snapshots; durable failed upload/retry; 300 points in
  three bounded chunks; zero duplicate writes; scoped clearing; signed-in active
  refresh; logout during recording and a different account's hidden history.
- Fresh local storage restored cloud history and a 300-point route. Cloud rename,
  conflict detection/confirmed recovery, deletion fences and refresh were checked.
  JSON downloaded/parsed as schema v1. GPX XML parsed with separate segments,
  latitude/longitude attributes, UTC timestamps and escaped track names. Web Share
  success/cancel and actual download fallback passed.
- Club fixtures passed CRUD, multiple membership policies, request rejection/
  reapplication/approval, UID invite consumption, private leaving, multiple Clubs,
  archive/deletion protection, role/rank changes and escalation guards, five links,
  invalid/credential/expanded URL rejection, color contrast, plain injection strings,
  Wall reload and unchanged dashboard theme. Portrait/narrow/landscape dialogs fit.
- Real pinned Firebase 13.0.0 browser modules imported; concurrent initialization
  returned one MotoDash app; Auth persistence and same-app/project Firestore/RTDB
  instances and invalid config rejection passed with all cloud APIs blocked.
- **97 real local Firestore emulator request assertions passed**, including valid
  transactional schemas, query authorization, unsigned/other-account denials,
  profile admin-field denial, Garage default integrity, Club role escalation,
  private membership/Wall, approval/invites, coupled counts/refs, archive/deletion,
  immutable ride/chunks/revisions, resurrection denial and a 32-chunk batch's
  access-call budget. These include fixture inspection requests; SDK mocks do
  not execute rules. The isolated emulator project was `demo-motodash`, never
  the production project. RTDB default-deny was retained/reviewed, not engine-tested.

## Live acceptance and setup still required

Live Firebase operations: **NOT TESTED**. Physical phones/Safari/installed PWA:
**NOT TESTED**. No successful cloud authentication, production persistence,
production rules enforcement or two-device synchronization is claimed.

1. User reviews Batch 1 + 2 diffs and verifies the existing **motodash-87bf8**
   Console web app config matches `firebase-config.js`: apiKey, authDomain,
   projectId, appId, messagingSenderId, databaseURL (and existing storageBucket).
   Values exist; none were invented or taken from another project. Verify default
   Firestore provisioning/region and the RTDB Europe West instance.
2. Enable/verify Email/Password and authorized domains `eggheadstudio.github.io`
   and localhost as appropriate. Account loading and denied writes leave local
   dashboard recording usable.
3. User backs up current rules and publishes reviewed `firestore.rules` through
   Console > Firestore Database > Rules, and reviewed root-deny
   `database.rules.json` through RTDB > Rules. The agent has not deployed them.
4. Add the `sessions` COLLECTION query composite index (`uploadState` ascending,
   `startedAt` descending), and exempt `routeChunks.pointsJson` from single-field
   indexing as declared in `firestore.indexes.json`. Wait for index readiness.
5. Follow [exact rules/live checklist](tests/RULES_TESTING.md): real test accounts,
   two browser profiles/devices, private cross-account reads/writes, Garage CRUD,
   completed recording/offline/retry/rename/delete, Club admission/role/rank/Wall
   permissions and all RTDB denial. Playground alone cannot exercise full atomic
   membership transactions; the real local emulator already covers those.
6. On physical Android/iPhone and Safari/Chromium, verify portrait/landscape,
   actual GPS stationary/moving/stopping/gaps, heading/manual map gestures, real
   providers, permission retry, background/foreground/lock, storage failures,
   login/logout while recording, share/download and installed-manifest behavior.
7. User handles publication after review. Main push can automatically deploy Pages;
   no push or workflow invocation was performed.

## Known limitations and remaining product work

No known failing automated scenario remains. Production configuration/provider/
SDK-network behavior and physical acceptance are still unverified.

- No multi-tab recording lock: simultaneous recording/edits in one browser can
  race local writes; use one recording tab pending a concurrency-hardening batch.
  Cloud metadata revisions detect conflicting remote names; no automatic merge.
- Local storage is not encrypted. Browser/OS owners can inspect it. Storage quota,
  forced termination, full-route local snapshots and device suspension remain
  limits. If local data is erased during an incomplete upload, missing chunks
  cannot be reconstructed from an uploading-only manifest on another device.
- Firebase operation deadlines do not cancel SDK operations already submitted;
  account guards prevent subsequent batches/UI leakage and rules enforce ownership.
  Cloud sync runs while the page is open; there is no background upload guarantee.
- Deleted ride tombstones persist as small records to prevent resurrection. They
  require a future trusted retention/account-deletion policy. Refresh reads their
  bounded pages; very large histories require measured cost/retention work.
- GPS/routes are owner-supplied data, unsuitable as trusted Official Event results.
  Rules bound JSON chunks but cannot parse/cryptographically validate route content;
  clients check coordinates/timestamps/counts/hash on retrieval/export.
- Private cloud rides have no public URLs, Replay or import. Garage visibility is
  stored preference only; uploaded photos/logos/public portfolio are deferred.
- No ownership transfer, full profile editing, password reset/account deletion,
  Group Sessions, live locations, Lobby, QR/NFC joining, Official Events, Stripe
  or subscription enforcement was added. RTDB stays locked; the future hybrid
  authorization coordinator decision remains required before live sharing.
- The manifest alone does not provide offline cold start/background GPS. Existing
  optional Fullscreen/Wake Lock and theme coupling/provider buffers still need
  physical-device acceptance. Language retry intent after a failed profile write
  remains in memory and may need another explicit change after refresh.

## Next recommended batch and stop

First review/deploy/test the prepared rules/indexes and verify live persistence and
physical phones. Then separately approve profile/privacy/account-deletion and
recording concurrency work. Group Session authorization, admission and explicit
sharing consent must be designed/tested before any live location or Lobby work.

**STOP: Batch 2 is complete locally. Await explicit approval before additional
implementation, pushing or deploying.**

---

The following Batch 1 record is historical. Its old statements about shared local
rides, profile-only rules and missing Garage/Clubs are superseded by the current
Batch 2 status above; its original test evidence and device limitations remain.

# Historical Batch 1 record (superseded by the current Batch 2 status above)

Date: 2026-10-09. Baseline: `4813196` on `main`.
Scope: the user's three-milestone Batch 1 attachment, including the explicit removal
of historical ride migration requirements. Full IDEA.md and Section 0 audit were reviewed.

## Completion

| Milestone | Status | Local commit |
| --- | --- | --- |
| 1 — English/Finnish localization | Implemented; automated browser checks passed. Device acceptance pending. | `1862efa` — `feat: add English and Finnish localization` |
| 2 — Dashboard/GPS reliability | Implemented; simulated browser and deterministic checks passed. Real GPS/device acceptance pending. | `ca8a7c7` — `fix: improve GPS recording and map reliability` |
| 3 — Firebase/Auth foundation | Implemented locally; SDK imports/initialization and mocked flows passed. Console setup, rules and live operations pending. | `feat: prepare Firebase authentication foundation` |

Each milestone was checked before continuing and has a separate local implementation
commit; inspect `git log -3 --oneline` for the final third hash.
No commits were pushed. No GitHub Pages, Firebase rules or production changes were deployed.
The retained Pages workflow deploys repository root on `main` push/manual dispatch,
so pushing these commits is itself a potential publication step requiring approval.
No Garage, Clubs, memberships, ranks, group sessions, Lobby, QR, billing or backend
features were started. The full product plan remains in IDEA.md.

## Implemented features and architecture

Localization: English default, central en/fi dotted keys, `t(key, params)`, fallback,
mobile language controls, local preference, render bindings for dynamic text,
locale-aware numbers/dates, translated status/weather/history/dialog/ARIA/auth text.
User ride names are never translated. No dashboard business logic changed in Milestone 1.

Reliability: a DOM-free GPS pipeline rejects stale/future/duplicate/out-of-order,
inaccurate/invalid and unrealistic samples before metrics/map updates. Confirmed
movement uses GPS timestamp intervals; gaps over 15 seconds reset continuity.
Stops, quality loss, watch restarts and refresh establish a new route segment rather
than crediting interruption distance/time. Repeated coordinates cannot generate movement.
Only accepted route samples update the unsmoothed validated peak. Existing speed
smoothing, map providers and Open-Meteo remain in use.

Automatic heading now calls the existing candidate/smoothing logic. Rotation follows
the shortest angular transition across north; stationary unreliable headings are ignored.
Map tiles, route, markers and accuracy circle share the map transform; controls/attribution
and HUD remain in fixed layers. Unsupported rotation falls back safely. Heading and
theme preferences survive refresh. The existing theme behavior is preserved.

Finish stops the GPS watch, resets the pipeline, releases Wake Lock, cancels the
save timer and awaits a captured completed record. Late callbacks are ignored. Completed
history shows statistics/detail and fitted routes without recording. The dashboard has no
post-finish GPS consumer in this batch, so the watch is stopped until a new/resumed ride.

Final review corrected the GPS error overlay order: its retry button was covered
by the start screen. The permission-denied/retry browser test now exercises a real
click without forcing it. Loading labels and Finnish Rename text were corrected;
debug/error render bindings now change language dynamically. Account additions also
retain browser zoom and scroll on short screens.

Local session schema v2 uses unique IDs, per-record queued immutable writes and async
authoritative IndexedDB load before auto-restore. Transactions settle on completion;
localStorage provides per-record fallback/tombstones. Save/delete/clear failures are
visible. Unrelated settings are retained. Old ride formats are not migrated; the obsolete
IDB sessions store is removed during upgrade. Existing preference stores remain.

Firebase: the existing `motodash-87bf8` web config now exports data only. One named
lazy initializer uses pinned browser SDK 13.0.0 and local Auth persistence. Account UI
is independent of local dashboard readiness. Email/password registration/login/logout,
listener, validation, loading and localized errors are implemented. Password inputs
are cleared after submission and dialog close; the app does not store passwords.

Firestore profiles at `users/{uid}` contain only UID, displayName, email, language,
createdAt, updatedAt. Transactional creation avoids overwriting existing creation
time. Language changes are serialized and errors remain retryable. The device choice
controls UI; login does not override it. Profile loading is bounded to 12 seconds in
the UI, and stale results from an earlier account are ignored. An underlying SDK
operation may still complete after the UI timeout; rules remain authoritative.
Firestore uses default memory cache, without enabling persistent disk profile caching.

Only Auth and private profile operations have callers. RTDB's lazy boundary is prepared
but unused, with no listeners/locations/presence. Firestore rules allow only own-profile
get/create/approved-field update and deny all other collections. RTDB rules deny all access.
Auth success and profile failure are shown separately; denied profiles are never called saved.

## File inventory

New application modules:

- `js/i18n/dictionary.js`, `js/i18n/i18n.js`.
- `js/position-pipeline.js`.
- `js/auth-ui.js`.
- `js/firebase/firebase.js`, `auth.js`, `firestore.js`, `profileRepository.js`, `realtime.js`.

New development/documentation files:

- `tests/run_browser.py`, `tests/domain-tests.js`, `tests/firebase_mocks.py`, `tests/.gitignore`.
- `database.rules.json`, `IMPLEMENTATION_STATUS.md`.

Existing previously untracked files reconciled and added to Git:

- `IDEA.md`: preserves the completed baseline audit; adds approval scope, honest status and batch result.
- `firebase-config.js`: preserves existing project values; replaces bare npm import/initializer with config export.
- `firestore.rules`: fills the previously empty file with restrictive profile rules.

Existing tracked files modified:

- `index.html`, `css/dashboard.css`, `manifest.webmanifest`, `README.md`.
- `js/app.js`, `config.js`, `gps.js`, `map.js`, `map-rotation.js`.
- `js/route-recorder.js`, `session-manager.js`, `session-store.js`, `speed.js`.
- `js/ui.js`, `utils.js`, `weather.js`.

No app dependencies, package manager files, framework or build configuration were added.
The large existing app orchestrator was retained rather than broadly rewritten.

## Automated checks actually executed

Environment: Windows, Python 3, Python Playwright and headless Chromium (Chrome for
Testing 153 browser binary). The Python tools/browser were installed outside the repo;
they are development tooling, not production dependencies. No physical phone,
Safari or interactive desktop Chrome session was tested.

Command used in this workspace:

```powershell
$env:PYTHONPATH = "$env:TEMP\motodash-test-tools"
python tests/run_browser.py
```

README includes normal optional test-tool installation instructions. Test server serves
the parent directory and opens `/MotoDashboard/`, exercising the Pages project subpath.

Executed and passed:

1. English/Finnish dictionary parity, English fallback and parameter interpolation;
   live label/status switching, local preference refresh and unchanged user ride names.
   Simulated permission-denied text/debug localization and GPS retry were also checked.
2. Literal translation-key/relative import checks, duplicate DOM ID check, native
   browser parse/link of all application modules, page-error and rejection monitoring.
3. Real Leaflet 1.9.4 with tile/weather fixtures: simulated recording, route layers,
   localized weather, nonzero stats, finish/history and completed-detail view.
4. GPS watch cleanup; automatic heading, unrotated HUD/controls, overlay SVG; all
   theme buttons, north-up mode, preference refresh, active-session auto-restore,
   offline/online labels. Optional Fullscreen/Wake Lock absence was simulated.
5. **36 deterministic domain assertions:** stationary and noisy identical coordinates;
   walking/normal movement; duplicate/out-of-order, stale/future timestamps; poor
   accuracy and jumps; stop/resume and large gaps; completed immutability; accepted
   peak/time/distance; 359°→1° smoothing; stationary/unsupported/north/stale heading;
   finite rotated pan; schema validation; real browser IndexedDB snapshots/load/delete;
   localStorage fallback/clear with preferences; total storage failure; weather HTTP
   failure and offline no-fetch behavior.
6. **SDK mocks only:** registration/login/logout, minimum form validation, password
   clearing, single initialization/persistence call, six-field private profile,
   refresh Auth restoration, en/fi account labels, profile language update,
   bad credentials/network errors, denied profile retry, failed language-update retry,
   another-UID repository guard, 320×568 modal bounds and Escape close.
7. Firebase CDN failure leaves local dashboard ready and displays account retry.
8. **Real downloaded Firebase 13.0.0 SDK:** app/Auth/Firestore/RTDB module imports and
   expected exports; concurrent service calls use the same dedicated named app;
   Auth local persistence initializes. Cloud API requests were blocked. No accounts,
   cloud profile writes or database rule behavior were tested by this check.
9. `git diff --check`; source review for profile allowlists/default deny, dedicated
   config, relative paths, no application bare package imports/Admin credentials or
   unrelated project references. RTDB rules JSON parsed and reviewed.

Mobile screenshots were captured in the OS temporary directory and visually inspected:
start screen at 390×844 and account dialog at 320×568. These are simulated viewports,
not device compatibility certification. No map tile stress/prefetch load test was run.

## Manual acceptance checklist

- [ ] Serve over localhost/HTTPS; select English/Finnish on start, dashboard and
  account panel, refresh, and inspect dates/numbers, errors, history and long labels.
- [ ] On physical iPhone and Android browsers, check portrait/landscape, scroll,
  keyboard, zoom, safe areas, modal focus/Escape/close and 44px controls. Record
  which OS/browser versions were actually used.
- [ ] With real GPS, test permission denied/retry, stationary, walking and a safe
  normal ride; stop/resume, tunnels/poor accuracy, delayed fixes and interruption.
  Verify distance, moving time, accepted maximum, no gap bridges and no stationary route clusters.
- [ ] Check reliable heading-up, north-up, wraparound, manual rotation/pan/zoom,
  markers/routes/accuracy alignment, every theme, center/follow and fixed attribution/HUD.
- [ ] Refresh during recording; verify one restored session and no interruption
  time/distance. Finish, check watch termination and history; open, rename, delete,
  clear and reload. Confirm settings remain. Use disposable new rides for destructive tests.
- [ ] Test network loss/restoration, real weather/tile failure, Wake Lock/Fullscreen
  denied/unsupported, foreground/background/screen lock. Document gaps; do not
  assume an installed PWA records continuously in the background.
- [ ] Review security rules, then perform the separate approval/deployment checkpoint below.
- [ ] After approved setup, test two real accounts: registration/login/logout/refresh,
  private profile/timestamps/language, invalid credentials and inaccessible profiles.
  Verify changing account does not show the prior profile; local ride history remains device-scoped.

## Firebase setup and approval still required

1. Confirm Console ownership/config for `motodash-87bf8`, default Firestore database
   and the configured Europe West RTDB instance. Existing Console state was not inspected.
2. Verify Email/Password provider, configured password policy and authorized hosts:
   `eggheadstudio.github.io`, `localhost`, and `127.0.0.1` if used. See README for paths.
3. Review `firestore.rules` and `database.rules.json`; obtain **explicit approval**
   before applying either. No rules were deployed. Preserve/back up existing Console rules.
4. Run Rules Playground/emulator checks (not performed here). Allow exact own-profile
   get/create/update with matching token email and server timestamps; deny signed-out,
   other-UID, added admin/role, changed UID/createdAt, extra fields, list/delete,
   nested/unrecognized collections and all RTDB reads/writes. Test both positive/negative cases.
5. After approval, publish through each service's Rules tab, then verify real Auth
   and Firestore operations using dedicated accounts. Do not weaken rules if setup fails.

No live Firestore write success or deployed authorization protection is claimed.
Code preparation does not establish the security of currently deployed Console rules.
README provides official documentation links and the manual setup/publication steps.

## Known limitations and risks

- No unresolved failure was observed in the executed scenarios. Untested real-device,
  live SDK API and rules behavior are explicitly pending, not treated as passed.
- Foreground browser GPS is the platform limit; no offline cold start/background
  recording guarantee or offline map download. CDN/provider connectivity is still needed.
- GPS confirmation, minimum point distance and new anchors conservatively omit small
  portions of movement around starts/stops/outages. Physical tuning may be required.
- A >220 km/h / >500m sample is rejected by current safety/quality thresholds. These
  inherited constraints may under-record legitimate fast movement or sparse callbacks.
- IndexedDB/localStorage capacity and browser eviction remain limits. Both unavailable
  means in-memory recording with a visible save error; closing the page can lose it.
  Page-hide flush is best effort. Long routes still rewrite one full local record.
- No multi-tab active-recording lock. Use one recording tab; simultaneous edits to
  the same ride can conflict. This requires a separately approved local concurrency change.
- Local rides are shared within this browser, independent of Auth. No cloud ride sync,
  account ownership/migration, backup export or account deletion UI exists yet.
- Profile deletion is intentionally denied until an account/privacy deletion flow is designed.
  Password reset, verification and profile-edit screens are outside this foundation batch.
- Language-update retry intent is in memory; after a refresh, local language remains,
  but a failed cloud preference may need another explicit language change.
- CDN failure may require reload if failed module loading is retained by the browser.
  SDK operation completion after a profile UI timeout remains possible.
- Existing theme coupling to HUD/route and wide Leaflet tile buffer remain unchanged;
  provider load and physical rotation gestures still need manual validation.

## Next recommended checkpoint

Review this batch, run the phone checklist, approve/test/deploy the proposed rules
and verify live Auth/profile behavior. Only after those checks and explicit approval
should the next implementation milestone address Section 3 profile/Garage and the
remaining account/dashboard integration. No next feature has been implemented here.

**STOP after Batch 1. Await explicit approval for further implementation, push or deployment.**


## Batch 3 identity milestone - local result

Safe names replace normal-UI UIDs. New module: js/firebase/displayProfiles.js.
Own profile initialization atomically maintains a two-field signed-in display projection;
60-second identity cache clears on account change. Private emails/profiles stay protected.
Club owners, members, requests and name-based invitation selection use that projection.
Club links preserve Pages base paths; missing names localize without exposing partial IDs.
Validation: original Firestore 102 assertions + additional security 137 + identity 16,
all passed, zero failed/skipped. Full browser suite passed all 15 printed groups, including
17 registration cases and 36 domain assertions; Club tests now cover owner/member names,
missing-profile fallback, language switching and hidden diagnostics. Emulator and mock
evidence only; no live Firebase or physical device claim.
Remaining Batch 3 milestones are in progress. RTDB live tracking needs a trusted coordinator.


### Batch 3 milestone 1 - Group Session security/data foundation

Added js/data/group-session.js and js/firebase/groupRepository.js. Immutable generated
UUID identity, four states, Ride/Drive/Meet/Event, all existing Garage categories, optional
Club association and 50-participant prototype ceiling. groupSessions contains private
authorization and precise meeting details; groupPages contains an exact safe summary
without membership UIDs or precise locations. Atomic creation includes founder participant
and private users/{uid}/groupRefs navigation. No hard deletion or identity reuse.
Personal hosting requires authentication; Club hosting requires current Owner/Admin/Host.
Firestore emulator: 56 new assertions passed, zero failed/skipped; previous 102 passed.
No deployment or real Firebase/device test. Participation/discovery/live map are separate
subsequent milestones; RTDB remains locked.

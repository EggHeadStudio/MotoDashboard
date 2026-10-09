# MotoDashboard — Implementation Batch 1 Status

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
# Batch 2 progress (2026-10-09)

Authorized scope: eight local milestones, separate commits, no push/deployment.
M1 adds auth-state.js, firebase/access.js, data/schema.js and permissions.js,
DATA_MODEL.md, firestore.indexes.json, expanded firestore.rules, and real local
emulator tests/RULES_TESTING.md + run_rules.py. Dedicated config validation,
localized data errors and Auth publication are integrated. RTDB remains locked.
Executed: 67 real emulator allow/deny assertions; Batch 1 browser baseline passes.
No live Firebase operations, rules deployment or physical phone testing occurred.
Further milestone entries will replace this progress note after the final review.


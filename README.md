> **Latest: Batch 5, 2026-10-12.** MotoDash now has Home, Discover, Rides, Clubs and Profile navigation, a shared charcoal/gold design system, vehicle/community/event cards and clearer invitation/Lobby errors. These changes are local. Review [Batch 5 results](BATCH_5_RESULT.md) and the latest [deployment checklist](DEPLOYMENT_CHECKLIST.md) before publishing. The production Firebase error is not yet verified as fixed.

Display names are required, trimmed and 3–30 Unicode characters; owners can edit
them. Live sharing requires active Group admission and explicit consent, reuses
the existing GPS watcher/Leaflet map, and shows safe names, vehicle/rank/status,
freshness and approximate straight-line separation. `live-config.js` now points to
**https://motodash-live.old-sound-55f2.workers.dev**. Ticket requests use HTTPS;
the client derives WSS for sockets, independent of the /MotoDashboard/ frontend
path. No credential is stored in this public configuration. Setting endpoint to
an empty string disables live sharing. A direct Worker root navigation returning
origin_denied is expected; it is not an instruction to relax Origin validation.

Only cloudflare/ uses npm/Node 22+, installed by the manual GitHub Actions workflow
on its runner; no local installation is required. The static frontend requires
no build. GitHub Pages Source must be
GitHub Actions; its workflow publishes only the frontend allowlist, never the
server project. See the setup guide for exact reader IAM, secret, budget and
two-phone acceptance steps. Firestore Spark capacity is insufficient for the
documented 1,000+ active-user workload without a separate billing decision.

The agent verified read-only production health/CORS responses, not authenticated
production membership or GPS sharing. Current local browser regressions load this
production config but intercept HTTP/WebSocket transport; no test coordinates or
Firebase writes are sent to production. Worker code, Firebase services/rules,
GPS pipeline, consent requirements and deployment workflows are unchanged.

After approval, publish the reviewed frontend update through GitHub and wait for
the existing Pages workflow. Refresh both phones at
**https://eggheadstudio.github.io/MotoDashboard/**. Do not redeploy the Worker for
this endpoint-only update. Exact two-phone acceptance steps are in the current
production-endpoint section of [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

# MotoDashboard

A modular static HTML/CSS/JavaScript dashboard for phone browsers. It deploys directly
to GitHub Pages without npm, a bundler or a frontend build step. The live gateway is a separate server component.
English is the default; Finnish is available from the language selector.

## Features

- GPS speed, accuracy and network status; distance, moving time, average and validated maximum speed.
- Existing Leaflet maps/providers, themes, automatic heading-up, north-up and manual rotation.
- Segmented route recording, local history, resume, rename, deletion and completed ride details.
- Schema v2 IndexedDB storage with localStorage fallback and visible save failures.
- Open-Meteo weather, temperature and wind.
- Optional email/password accounts and a minimal private Firebase profile.
- Personal Garage with 12 categories, defaults and saved ride vehicle snapshots.
- Account-owned completed ride cloud sync with bounded route chunks and durable retries.
- Private history, JSON/GPX file export and Web Share with download fallback.
- Clubs, approvals/account-addressed invitations, technical roles and separate visible ranks.
- Controlled Club colors/links and a plain-text Info Wall.
- Safe member display names, generic avatars and shared Club links; private profiles stay protected.
- Group Sessions for Ride/Drive/Meet/Event, prototype hosting, lifecycle controls and private participation.
- Approval/invitation joining, selected vehicle nickname/category sharing and manual rider statuses.
- Paginated Lobby discovery, session invitation links and locally generated QR codes.
- Group overview with roster status counts and explicit coverage/presence limitations.
- Install manifest, safe-area layout, optional Fullscreen and Wake Lock.

The manifest does not provide offline cold starts or background GPS. No offline
service worker is installed. Browser suspension and platform support still limit recording.
Use the vehicle's instruments as the primary speedometer; GPS accuracy varies.

Live groups use a separate Cloudflare Worker/Durable Object service. Configuration,
secrets and deployment require operator setup; Firebase RTDB stays deny-all.
Need help is informational and provides no emergency response. See LIVE_TRACKING.md.

## Local development

From the repository root, use an HTTP server, for example with Python 3:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000/`. Stop with Ctrl+C. Do not use `file://`: modules
and Firebase expect HTTP, and location requires a secure context. Phone testing
needs HTTPS; a plain HTTP LAN IP is not equivalent to localhost.
This is only a development file server; production remains a static site.

To check the project subpath, serve the parent folder:

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory ..
```

Open `http://localhost:8000/MotoDashboard/`.

## Firebase setup

The existing dedicated project is **`motodash-87bf8`**. Configuration is in
[`firebase-config.js`](firebase-config.js); do not create another project.
In Firebase Console, select this project, then **Project settings → General → Your apps →
Web app → SDK setup and configuration → Config**. Compare apiKey, authDomain,
projectId, storageBucket, messagingSenderId and appId with that file. Find databaseURL
on **Build → Realtime Database**; the existing URL is the Europe West instance.
Keep the config export; initialization belongs only to `js/firebase/firebase.js`.

Web configuration identifies the project and is public client configuration.
Never commit service-account keys or Admin SDK credentials. Auth and Rules enforce access.
[Firebase configuration guidance](https://firebase.google.com/docs/web/setup#config-object).

**Build → Authentication → Sign-in method:** enable **Email/Password**. Review the
project's password policy and abuse settings. The form checks a six-character registration
minimum; Firebase enforces the actual policy. Errors are localized. A user can be
signed in even when a profile write is denied.
[Password authentication](https://firebase.google.com/docs/auth/web/password-auth).

**Authentication → Settings → Authorized domains:** review/add `eggheadstudio.github.io`
and `localhost`; add `127.0.0.1` if browsing using that host. Enter hostnames without
HTTPS, ports or `/MotoDashboard/`. Do not assume localhost is already authorized in a
recently created project. Add a custom domain only if used.
[Authorized-domain guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices).

The browser SDK is pinned to **13.0.0** using gstatic CDN ES modules.
`js/firebase/firebase.js` owns one named `MotoDash` initializer and explicit local Auth
persistence. Account loading never blocks local recording. If the CDN fails, retry;
reload after restoring connectivity if the browser retains the failed module load.
[CDN imports](https://firebase.google.com/docs/web/alt-setup),
[Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence).

### Services used

| Service | Current use |
| --- | --- |
| Authentication | Email/password registration, login, logout and persistent state listener. |
| Cloud Firestore | Private profile, Garage, completed rides/chunks, Club memberships/roles/ranks/Wall and a minimal public Club directory. Default memory cache; no shared persistent SDK disk cache. |
| Realtime Database | Locked and unused. No frontend initializer/import remains. |
| Storage / Analytics / Functions | Not used. A configured bucket does not enable uploads. |

Profiles contain exactly `uid`, `displayName`, `email`, `language`, `createdAt`,
`updatedAt`. UID/creation time are immutable; language is `en` or `fi`.
The device's saved language controls the UI and is not overridden on login.
New profiles use that language; explicit changes while signed in update the profile.
A failed update keeps the local choice and offers retry in the account panel.

Guest rides stay in a separate local scope. New signed-in rides record locally and
upload privately only after completion. Logout/account changes stop the GPS watch,
flush the previous owner's local ride and clear its visible route/history/Garage/Clubs.
Returning to that account restores its records; legacy rides are not claimed/uploaded.
Pending uploads/deletions retry on login/reconnection or Retry ride sync. Cloud history
pages load 20 rides; route chunks download only for detail/export. Conflicting names
can be resolved with the confirmed Reload cloud version action; export first to keep
the local edit. Browser storage is not encryption and is accessible to the OS/browser
owner. Settings remain device-wide.
Map providers receive tile requests; weather requests send coordinates to Open-Meteo.

### Security rules: approval required before deployment

[`firestore.rules`](firestore.rules) applies exact field/type allowlists, immutable
ownership/timestamps, own-only profiles/Garage/private rides, canonical Club ownership,
atomic membership/index/count changes, restricted roles, separate ranks and Wall rights.
System privileges and every unknown path are denied. Profiles remain exactly six fields;
extra admin fields, other-account access and profile listing/deletion are denied.
[`database.rules.json`](database.rules.json) denies all RTDB reads and writes.
**Neither rules file has been deployed or tested against a live database.**
[Firebase field restrictions](https://firebase.google.com/docs/firestore/security/rules-fields).

Real local Firestore emulator assertions are in `tests/run_rules.py`; browser SDK fixtures
remain separate. See [rules tests/manual acceptance](tests/RULES_TESTING.md) and
[data contract](DATA_MODEL.md). No live Firebase or physical device test is claimed.

The 2026-10-10 security revision makes canonical Club documents member-only and
adds a safe `clubPages/{id}` projection for nonmembers. It replaces client deletion
with irreversible retirement: the ID stays reserved, old invitations stop working
and all retained private data is denied. This is access revocation, not physical
erasure. Existing Clubs/orphaned subtrees require approved operator inventory and
safe-page backfill before rollout; follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).
The additional regression suite is `python tests/run_security_rules.py`.

**Only after explicit approval:**

1. Select `motodash-87bf8` and confirm the intended database.
2. **Build → Firestore Database → Rules:** back up current rules, paste `firestore.rules`,
   review/test, then **Publish**. Confirm the default Firestore database is configured.
   Direct profile-document operations need no query indexes. Add the `sessions`
   collection index on `uploadState` ascending + `startedAt` descending and the
   `routeChunks.pointsJson` single-field exemption from `firestore.indexes.json`.
3. **Build → Realtime Database → Rules:** back up current rules, paste
   `database.rules.json`, review/test and **Publish** for the configured Europe West instance.
4. Use dedicated test accounts to verify real registration/login/refresh/profile updates
   and cross-account denial. A signed-in message alone does not prove a Firestore write.

This batch did not inspect/change Console rules, providers, project ownership or regions.
If profiles fail, check setup, connection and permissions; do not permit global access.
[Managing/deploying rules](https://firebase.google.com/docs/rules/manage-deploy).

## GitHub Pages

Repository: [EggHeadStudio/MotoDashboard](https://github.com/EggHeadStudio/MotoDashboard).
Project URL: [MotoDashboard](https://eggheadstudio.github.io/MotoDashboard/).

The existing `.github/workflows/deploy.yml` publishes an explicit frontend-only artifact and deploys
with GitHub Actions on pushes to `main` or an approved manual workflow run.
After explicit publishing approval, verify **Repository Settings → Pages → Build and
deployment → Source: GitHub Actions**, then push the reviewed commits or trigger the
workflow. A push to `main` can therefore publish automatically. `index.html` is at the
root; `.nojekyll` is retained. No framework build or Firebase Hosting deployment is required.
[GitHub Pages publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Scripts/styles/icons/manifest/config use relative paths suitable for `/MotoDashboard/`.
Verify that URL after publishing and hard-refresh older tabs. Authorized domains uses
the host `eggheadstudio.github.io`, not the project path.
No push, Pages deployment or rule publication was performed in this batch.

## Structure

```text
index.html / css/dashboard.css       Dashboard, language selector and account dialog
firebase-config.js                  Existing public MotoDash config, export only
js/app.js                           Dashboard orchestration and recording lifecycle
js/config.js / dom.js / ui.js        Existing constants and UI helpers
js/i18n/dictionary.js / i18n.js       en/fi keys, bindings and locale formatting
js/position-pipeline.js / speed.js   Timestamp/quality gate and speed/movement logic
js/map.js / map-rotation.js          Existing providers, layers and rotation
js/route-recorder.js                 Accepted points and segmented rendering
js/session-manager.js / session-store.js   Schema v2, history and local persistence
js/weather.js / gps.js / utils.js    Existing weather, GPS and geometry helpers
js/auth-ui.js                        Account state/form/error UI and language sync
js/auth-state.js                     Shared account identity boundary
js/garage-ui.js                      Personal Garage dialog/next-ride selection
js/club-ui.js                        Club page/discovery/membership lifecycle
js/club-members-ui.js                Role and custom rank controls
js/club-branding-ui.js               Safe local Club branding and Info Wall
js/ui/forms.js                       Native dialogs, safe fields and localized actions
js/data/{schema,permissions,route-codec,branding}.js    Validation/permissions/hashes/contrast
js/data/club-page.js                 Exact safe Club presentation projection
js/session-sync.js / session-export.js    Durable jobs and JSON/GPX/file sharing
js/firebase/firebase.js / auth.js    Lazy single initializer and Auth operations
js/firebase/firestore.js             Lazy Firestore service
js/firebase/profileRepository.js     Own-profile operations only
js/firebase/{garage,session,club}Repository.js    Scoped product repositories
firestore.rules / database.rules.json     Undeployed least-privilege rules
firestore.indexes.json / DATA_MODEL.md / EXPORT_SCHEMA.md   Data/query/export contract
tests/                              Development-only Python/native-browser checks
manifest.webmanifest                Install metadata; no offline worker
```

## Verification

Python and Playwright are optional development tools, outside the app runtime:

```powershell
python -m pip install playwright
python -m playwright install chromium
python tests/run_browser.py
```

No npm/build step. Tests serve the real `/MotoDashboard/` path, use real Leaflet with
tile/weather fixtures and simulate GPS. Auth and product UI use SDK fixtures. A separate
test downloads/imports the real pinned Firebase modules and initializes services while
blocking cloud API requests. First run needs internet for cached Leaflet/Firebase files.
See [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) for executed checks, remaining
live setup, limitations and the manual phone checklist.
# Batch 2 data boundaries

See [DATA_MODEL.md](DATA_MODEL.md) for exact paths, privacy, Club permissions and
ride lifecycle, and [rules test instructions](tests/RULES_TESTING.md) for isolated
local emulator tests and the live checklist. Realtime Database stays locked.
No rules or indexes have been deployed by the agent. All services use the dedicated
MotoDash config; incomplete or mismatched config fails gracefully. Public Garage
visibility is a future sharing preference: Garage documents remain owner-only.


## Batch 5 navigation and operator preparation

- **Home:** Start Ride, selected vehicle, actual upcoming groups, owned Clubs and latest ride.
- **Discover:** real featured public/approval activities, Rides/Meets/Events/Clubs tabs,
  category chips and collapsed server filters. Empty states contain no demo activities.
- **Rides:** existing private/local history and Group Sessions; sync/storage is contextual.
- **Clubs:** create/find/open/join/request/manage, branding, private Wall and member/rank cards.
- **Profile:** current display identity, Account settings (private email/name editing),
  language, Garage, loaded saved-ride statistics, memberships and logout.

Personal dashboard/GPS/weather/map/heading/recording/history/export and opt-in Cloudflare
live sharing still use the existing modules. The frontend remains build-free under
/MotoDashboard/; css/ and js/ are copied by the unchanged Pages workflow.

Operators must compare the complete current firestore.rules, verify all 18 composites
(including the new clubDirectory category/name index) and required single-field indexes
in motodash-87bf8 before treating cloud features as ready. Publish the reviewed main
branch for Pages and the manual Firebase workflow, then deploy Rules/indexes through
Actions and perform real two-account/phone acceptance. See
[FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md) for the simplified Console/Actions setup
and DEPLOYMENT_CHECKLIST.md for exact indexes and acceptance procedures.
No local Node/npm/Wrangler installation is needed; Batch 5 requires no Worker deployment.

UI error codes distinguish permission, Firebase precondition/index, network, auth,
recipient, duplicate/expired/invalid-or-revoked invite and unexpected failures. The
reported production error has not been proven fixed. Each invitation recipient must
finish application profile setup; name-prefix search is case-sensitive, names need
not be unique. Private users/ membership documents are never a public search surface.

Development-only checks: tests/run_browser.py (or --batch5-only),
tests/run_security_rules.py, tests/run_group_rules.py, tests/run_identity_rules.py,
tests/run_batch5_rules.py, tests/run_realtime_rules.py and tests/run_release_paths.py.
These use existing development tools/fixtures or fixed localhost demo emulators,
not production Firebase. No testing tools are installed or shipped with the application.


## Manual Firebase deployment for the prototype

Main includes .github/workflows/deploy-firebase.yml, firebase.deploy.json,
firebase-deployer-role.json and the reviewed validation scripts. Use the dedicated
motodash-firebase-deployer account with only the custom role and add its JSON as the
repository secret FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON. No local Node/npm/Firebase
CLI, deployment branch, WIF provider or environment configuration is needed.

After you push main, the existing Pages workflow deploys the frontend. Firebase is a
separate manual run: Actions -> Validate or deploy MotoDash Firestore, branch main.
For an approved deployment choose deploy, type motodash-87bf8 and leave scope
rules-and-indexes; validation runs automatically first. Validate mode is an optional
check without deployment. Only Firestore Rules/indexes deploy;
wait for all 18 indexes Enabled and run live acceptance before claiming cloud readiness.
See [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md) for exact steps and secure rollback.

# MotoDashboard deployment and acceptance checklist

Updated **2026-10-12** after the operator's successful Batch 5 deployment report.
This is the current runbook. Older preparation, security reproductions and full
migration/probe records are preserved in [the historical checklist](docs/history/pre-batch6/DEPLOYMENT_CHECKLIST.md).
The audit performed no push, deployment, branch deletion or production-data operation.

## Current state and remaining gates

| Classification | State / required follow-up |
| --- | --- |
| INFORMATION | Batch 5 UI published at https://eggheadstudio.github.io/MotoDashboard/, per operator. |
| INFORMATION | Firebase Authentication/Firestore configured; Firestore Rules deployment succeeded and all 18 composites are Enabled, per operator. The previous one-index/missing-17 blocker is resolved by that report. |
| INFORMATION | motodash-live Worker and SQLite Durable Objects deployed; production endpoint configured. |
| INFORMATION | Main contains the current Pages, manual Firebase and manual Worker workflows. No deployment branch is needed. |
| BLOCKER ? wider public beta | Full account deletion is not implemented. Auth-only deletion and client recursive deletion are unacceptable substitutes. |
| BLOCKER ? acceptance | Real-user/two-account/two-phone behavior and effective live security remain untested. Do not mark the release fully validated from publication or emulator results. |
| WARNING | Exact published commit/Rules version, retained single-field exemptions, IAM/key policy and legacy-data inventory should be recorded by the operator. This audit did not access private consoles. |
| WARNING | Club retirement denies access but retains private children/ID reservations. Never erase the reservation or reuse a retired ID. |
| WARNING | Token revocation, Spark/read quotas, whole-service abuse, mobile suspension and provider commercial terms remain operational limitations. |

## Architecture and exact sources

| Service | Source / responsibility |
| --- | --- |
| Pages frontend | `.github/workflows/deploy.yml`; index.html, public config, manifest/icon/logo, css/ and js/ only |
| Firebase Auth | `firebase-config.js`, `js/firebase/firebase.js`, `js/firebase/auth.js`; one named MotoDash app |
| Firestore default database | `firestore.rules`, `firestore.indexes.json`, `firebase.deploy.json`; persistent data/admission, no live GPS collection |
| Firebase deployment identity | `firebase-deployer-role.json`; dedicated motodash-firebase-deployer account, configuration permissions only |
| RTDB | `database.rules.json`: root read/write false; no runtime transport or initialization |
| Cloudflare live transport | `cloudflare/wrangler.jsonc`, `cloudflare/src/`; motodash-live, LIVE_ROOMS -> LiveRoom, SQLite v1 migration |
| Public live endpoint | `live-config.js`: https://motodash-live.old-sound-55f2.workers.dev |

Firebase project **motodash-87bf8**, database **(default)**. Public web config fields:
apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket and the legacy
databaseURL. Values are present in source; databaseURL does not activate RTDB and
storageBucket does not establish a provisioned upload service.

## Record Firebase Console settings without changing data

1. Project settings -> General: verify the intended Web app matches firebase-config.js;
   authDomain is motodash-87bf8.firebaseapp.com and projectId is motodash-87bf8.
2. Authentication -> Sign-in method: Email/Password. Google sign-in remains future work;
   do not enable/change providers as part of this audit.
3. Authentication -> Settings -> Authorized domains: **eggheadstudio.github.io**,
   **localhost**, and the Firebase Auth default domain. Use hostnames only, no scheme
   or /MotoDashboard/ path. Record actual policy/password settings when testing recovery.
4. Firestore -> Rules: save effective published source/time and compare the complete
   text with firestore.rules at the deployed commit. A green deployment is publication
   evidence, not a two-account authorization test.
5. Firestore -> Indexes: retain the operator's all-18-Enabled evidence and compare each
   exact definition below. Verify the pointsJson exemption and automatic query indexes.
6. RTDB, if provisioned: verify deny-all without enabling/reading its data. Its source
   is database.rules.json and it is outside the Firebase workflow's deployment scope.
7. Cloudflare Dashboard: record Worker version, LIVE_ROOMS binding/migration and exact
   variables. Verify reader IAM is read-only and FIRESTORE_SERVICE_ACCOUNT is an encrypted
   secret by name/type only. Do not expose its JSON to the browser or this repository.

## Exact composite indexes and exemptions

All 18 definitions use **Collection** scope. They are reported Enabled. Keep the
source inventory authoritative for future reviewed deployments; no need to recreate
or delete indexes during this audit.

| # | Collection | Ordered fields |
| --- | --- | --- |
| 1 | `sessions` | uploadState ASC, startedAt DESC |
| 2 | `lobbyEvents` | visibility ASC, state ASC, startsAt ASC |
| 3 | `lobbyEvents` | visibility ASC, state ASC, clubId ASC, startsAt ASC |
| 4 | `lobbyEvents` | visibility ASC, state ASC, meetingArea ASC, startsAt ASC |
| 5 | `lobbyEvents` | visibility ASC, state ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 6 | `lobbyEvents` | visibility ASC, state ASC, category ASC, startsAt ASC |
| 7 | `lobbyEvents` | visibility ASC, state ASC, category ASC, clubId ASC, startsAt ASC |
| 8 | `lobbyEvents` | visibility ASC, state ASC, category ASC, meetingArea ASC, startsAt ASC |
| 9 | `lobbyEvents` | visibility ASC, state ASC, category ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 10 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, startsAt ASC |
| 11 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, clubId ASC, startsAt ASC |
| 12 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, meetingArea ASC, startsAt ASC |
| 13 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 14 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, startsAt ASC |
| 15 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, clubId ASC, startsAt ASC |
| 16 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, meetingArea ASC, startsAt ASC |
| 17 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 18 | `clubDirectory` | category ASC, name ASC |

Single-field exemption: **routeChunks.pointsJson**, `indexes: []`. Retain automatic
collection indexes for displayProfiles.displayName, clubDirectory.name/category,
owned clubRefs/groupRefs.joinedAt, participant joinedAt, invite createdAt and request
requestedAt. The emulator does not enforce production composite-index availability.

## Read-only legacy Club inventory and migration boundary

Deployment success does not prove that the database was empty. An earlier fresh-project
report preceded actual Group use, so do not assume a globally empty database.

1. Inspect clubs, clubPages, clubDirectory and users/*/clubRefs using trusted Console
   read-only access. Compare public-safe field allowlists against DATA_MODEL.md/Rules.
   Inspect known deleted/retired IDs, retained members/invites/ranks/wall/joinRequests
   and any subtrees whose parent is missing. A root collection count cannot certify
   that no orphaned subcollection exists.
2. Compare known historical deleted IDs/operator records with permanent canonical
   reservations. An unavailable/failed listing is unknown, not an empty inventory.
3. Record date, operator, project/database, inspected paths/known IDs, completeness and
   decision. Only a complete empty legacy inventory permits migration **not applicable**.
   Current new-schema records need acceptance/schema review but not invented migration.
4. If unsafe legacy projections or unreserved old IDs exist, plan a separately approved
   trusted repair. Preserve original evidence, field privacy and permanent reservations.
   Never client-purge recursively, attach old children to a new Club, delete data to
   make tests pass, or weaken Rules. No migration/physical erasure was run by this audit.

The full historical B6 inventory and trusted-repair rationale is retained in archive
sections **10.1/10.2**. Use it as evidence/design guidance, not instructions to redeploy
an obsolete Rules/frontend version. Group projections/children require their own
safe-schema inventory when planning complete account erasure.

## Future deployments ? browser/Actions only

The current deployment is complete per operator; the following applies to future
approved changes. Main remains the only required release branch.

- **Pages:** an approved `git push origin main` starts Deploy to GitHub Pages; Source
  is GitHub Actions. Its artifact allowlist excludes rules/tests/Worker/credentials.
- **Firebase:** use [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md). One repository
  secret, FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON, from the dedicated configuration
  deployer, using exactly firebase-deployer-role.json. Actions -> Validate or deploy
  MotoDash Firestore -> main -> deploy -> confirmation motodash-87bf8 ->
  rules-and-indexes. Every run validates before deployment. Validate-only is optional.
- **Worker:** use [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md). Manual deploy-cloudflare.yml,
  locked cloudflare dependencies and existing Wrangler config. GitHub Secrets are
  CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. The independent read-only Firestore
  credential stays only in Cloudflare's FIRESTORE_SERVICE_ACCOUNT secret.

No action deploys automatically from this audit. Firebase/Worker workflows do not
run on push. Keep all three identities/credential purposes separate; preserve current
origin validation, DO migrations, private Rules and locked RTDB.

## Two-account live security and product acceptance ? pending

Choose disposable accounts A/B with distinct display names and independent browser
profiles. There are no bundled credentials. The operator runs these tests only when
choosing to create test data; this audit did not. Record deployed versions, device/
browser, time, operation, expected/actual result and safe Firebase error code. Keep
UIDs/document IDs privately; never save passwords, tokens, invite secrets or locations.

1. Test EN/FI registration/confirmation, login/logout/refresh/name editing and guest
   recording. Each account completes profile sync so its minimal displayProfiles
   projection exists. Missing projections are distinct from missing composite indexes.
2. Each account creates/edits/selects/deletes its own Garage vehicle. Record/finish a
   ride, verify private manifest/chunks/ready state, reload history, rename, export
   JSON/GPX and retry an offline completed upload without duplicate chunks.
3. Verify B cannot read/update/delete A's profile, vehicles, session manifest, chunks,
   tombstones or private account refs. Use actual signed-in client SDK probes; the
   Console Data editor uses privileged IAM and does not prove client access. Confirm
   equivalent legitimate B operations succeed and denial is permission-denied, not
   a network/missing-index/missing-document artifact.
4. A creates public/open, approval and private disposable Clubs. Before joining, B
   may read only eligible safe page/directory data; canonical Club, A's membership,
   private Wall/ranks/approvals/invites must deny. Private pages deny without invitation.
   Inspect projection allowlists for absence of UID ledgers/tokens/private fields.
5. B joins as Member, requests independent approval or consumes the addressed invite.
   Member cannot self-promote to Owner/Admin/Host, change branding/Wall or edit Owner.
   Visible Captain rank grants no rights. A can legitimately manage roles/ranks;
   authorized Admin can manage permitted members/branding/Wall but not Owner/self role
   or protected Club policy. A third account is needed for the full Admin/Host matrix;
   record unavailable paths as NOT RUN rather than claiming two accounts cover them.
6. Test leave/reload revocation. A archives/retires an owner-only Club with retained
   Wall/rank and old B invitation: old page/invite/children deny, ID recreation and
   reactivation deny, and a fresh new Club receives a fresh UUID. Do not delete the
   reservation or recursively remove children. Complete physical account erasure is
   still future trusted work.
7. A creates public, approval, unlisted and private Groups, with optional organizing
   Club/vehicle. Verify correct visibility, participant count/capacity, organizer roles,
   removed/banned rejoin denial and terminal-state closure. B receives/selects an
   addressed invite; wrong account, expired/revoked/rotated token, unknown recipient,
   duplicate send and logged-out return all produce correct outcomes. QR resolves the
   exact Pages hash route. Display-name search is case-sensitive and names are not unique.
8. Discover: test Ride/Drive/Meet/Event, category/date/approximate-area/Club combinations,
   pagination and empty/error states against actual production data. Private/unlisted/
   terminal sessions stay absent; safe rows do not contain live coordinates. Reported
   prior invitation/Lobby symptoms remain pending reproduction/acceptance, despite
   the resolved missing-index deployment issue.
9. Signed-out/outsider access, arbitrary unknown collections, systemAdmins writes,
   forged technical permissions and Firestore live-location paths must deny. Use
   production Rules Playground where suitable and emulator transactions for atomic
   cases. Retain locked RTDB; do not enable it to test live transport.

Detailed direct-client probes and complete role/retirement cases are retained in the
[historical checklist](docs/history/pre-batch6/DEPLOYMENT_CHECKLIST.md), sections 7/8
and 11.1. The authorization expectations remain current; do not follow its old rollout
order or obsolete index counts. A probe unexpectedly allowed can modify disposable
records, which is why the operator must explicitly choose that testing window.

## Two-phone live and dashboard acceptance ? pending

Use Android Chromium and iPhone Safari over HTTPS, safely on foot/stationary, both
foreground. The detailed 11-case checklist is in CLOUDFLARE_SETUP.md section 12.

1. A starts a Group. B is denied live entry before actual admission. Both opt in
   separately; grant GPS. Public discovery/hosting alone does not authorize positions.
2. Verify readable peer markers/name/vehicle/rank/status, no visible UID/email, HTTPS
   ticket + WSS socket, roughly 5s moving and 30s stationary cadence and no route replay.
3. Record a personal ride concurrently; verify heading/north-up/themes/weather/export
   and one shared GPS watcher. Change status only when stopped; separation is fresh
   straight-line distance, not road distance/order/emergency response.
4. Stop live sharing, leave, logout and complete/cancel: sharing stops, markers clear,
   no future updates sent. Removal of a silent B must revoke receiving within the
   30s lease; no private frames go to expired authorization, including late alarms.
5. Test network interruption/reconnect, no new consent after login, ticket replacement,
   stale at 45s/expiry at 120s, background/lock-screen gaps and visible foreground recovery.
6. Test keyboards/text scaling/focus/safe areas/portrait/landscape, QR camera and sharing
   on both languages/devices. Installation metadata is not offline/background support.

## Rollback and incident boundaries

Keep a known secure frontend commit, effective Rules source/date and Worker version
as private operator records. Do not commit credentials or rely on a rollback to erase
application data. An approved main commit restoring compatible frontend files starts
Pages; do not force-push or revive pre-security-fix code.

Rules rollback uses only secure, schema-compatible reviewed source: optional Console
history publication, or main commit -> workflow validation -> explicit scope rules-only.
Preserve all 18 indexes/exemptions and retired-ID invariants. A combined deployment
can partially publish Rules before an index failure; inspect both panels before retry.

Worker rollback preserves namespace/migrations and security compatibility; see
CLOUDFLARE_SETUP.md section 14. Disabling routing alone may not close existing sockets;
verify expired authority no longer receives positions. Retain RTDB deny-all throughout.

## Test records and Batch 6

Audit-local results, removed/retained files and technical debt are in
[REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md). User acceptance remains pending. Complete
account deletion, media/backend/IAM/cost review, provider commercial licensing and
other future launch requirements remain in [IDEA.md](IDEA.md). No Batch 6 feature was
implemented and no release was declared fully accepted.

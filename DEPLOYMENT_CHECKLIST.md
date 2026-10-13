# MotoDashboard deployment and acceptance checklist

Updated **2026-10-13** for Batch 6B. The operator reports **6A deployed/working**;
**6B is implemented/tested locally and is not deployed**. Use the following current
runbook. The older 6A publication instructions below describe the preceding rollout.

## Batch 6B publication — current browser-only runbook

No deployment or production data operation was performed by the agent. Run these
steps only after approving the local commits. No Node/npm/CLI installation or new
deployment branch is needed on this computer.

| Classification | Finding / correction |
| --- | --- |
| BLOCKER — 6B publication | Publish new **firestore.rules**, Worker **LIVE_IDENTITIES/LiveIdentity + v2 migration**, then the compatible frontend. Existing 6A backend versions do not implement 6B privacy/ownership paths. |
| BLOCKER — acceptance | Production two-account/phone tests and native Safari are NOT RUN. Local emulator/workerd/Chromium evidence does not certify live policy. |
| BLOCKER — wider public beta | Trusted complete account deletion remains absent; all new projection/mapping/claim paths must join its inventory. Auth-only deletion is insufficient. |
| WARNING | Previously downloaded public content cannot be retracted. Anonymous known-ID reads add ACL reads/quota and need abuse controls before wider use. |
| WARNING | Members-only profile policy, uploads and paid entitlements are deferred. Four showcase/two affiliation slots are prototype read/payload bounds, not subscriptions. |
| WARNING | Auth-disabled/revoked tokens can last until expiry; background GPS and operational quotas remain unaccepted. Browsers without Web Locks and writable IndexedDB cannot safely start a personal recorder. |
| INFORMATION | Existing **18** composites and routeChunks.pointsJson exemption remain unchanged; all 18 Enabled is operator-reported. No new indexes, secrets, IAM write grant, Firebase service or paid infrastructure is required. |
| INFORMATION | 6B defaults existing profiles/vehicles to unpublished, including legacy Public preferences. Collections are created only by explicit owner actions; no automatic production migration/backfill. |

### 1. Publish reviewed main without starting Pages prematurely

1. Read BATCH_6B_RESULT.md. Record the reviewed main SHA, currently deployed secure
   frontend/Rules/Worker versions and current namespace IDs for rollback.
2. Ask the prototype testers to stop live sharing and finish or safely save their
   personal rides. Close old live tabs and wait **two minutes** before the Worker
   upgrade, covering the previous backend's abandoned-socket/lease window. This is
   a quiet rollout, not a data purge; retain Clubs, Groups, rides and reservations.
3. GitHub repository → **Actions → Deploy to GitHub Pages → … → Disable workflow**.
   The existing published site stays online. This pauses main's automatic Pages
   trigger without editing the workflow or creating another branch.
   [GitHub's browser procedure](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).
4. In the VS Code terminal, after choosing to publish:

   ```powershell
   git switch main
   git status --short
   git log --oneline origin/main..main
   git push origin main
   ```

   Expect a clean tree and the reviewed local commits. No force push. This makes
   backend source available to manual Actions; it does not deploy either backend.

### 2. Firestore — manual workflow from that main revision

1. **Actions → Validate or deploy MotoDash Firestore → Run workflow**.
2. Branch **main**; operation **deploy**; confirmation **motodash-87bf8**; scope
   **rules-and-indexes**. A separate **operation=validate** run is optional: deploy already
   requires the validation job, including **tests/run_batch6b_rules.py**.
3. Existing GitHub Secret **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON** must belong to
   **motodash-firebase-deployer@motodash-87bf8.iam.gserviceaccount.com**, with the
   unchanged **firebase-deployer-role.json** configuration-only permissions.
   Never reuse Cloudflare's read-only reader key.
4. Confirm both jobs succeed for the intended SHA. Sources are **firestore.rules**,
   **firestore.indexes.json**, **firebase.deploy.json**, database **(default)** in
   **motodash-87bf8**. No Auth, Hosting, RTDB, Storage or Cloudflare deployment occurs.
5. Firebase Console → select **MotoDash / motodash-87bf8** → **Build → Firestore
   Database → Rules**. Verify publication time and full source, including
   `publicProfileAvailable`, `showcaseAvailable`, `affiliationAvailable`, private
   owner mappings and default deny. Preserve all earlier private/retired-ID rules.
6. **Indexes → Composite:** retain all **18 Enabled**, comparing the table below.
   **Single field:** retain routeChunks.pointsJson exemption and automatic indexes
   for notifications.createdAt/readAt, displayProfiles.displayName and existing refs.
7. **Authentication → Settings → Authorized domains:** retain
   **eggheadstudio.github.io** and **localhost**, without `/MotoDashboard/` in the
   domain entry. Email/password stays enabled. No new Firebase settings are needed.
8. Keep **database.rules.json** read/write false; do not deploy or enable RTDB.

### 3. Cloudflare — append the coordinator migration

1. **Actions → Deploy MotoDash Cloudflare Worker → Run workflow → main**.
   **No additional inputs.** Use the same reviewed revision. Its npm test/dry-run
   gate includes actual workerd coordinator tests before deployment.
2. Existing GitHub Secrets: **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**.
   The official Wrangler Action uses **cloudflare/wrangler.jsonc**, Worker
   **motodash-live**, preserving **LIVE_ROOMS → LiveRoom / v1** and appending
   **LIVE_IDENTITIES → LiveIdentity / v2**. Do not delete/recreate v1 or either namespace.
3. Cloudflare Dashboard → **Workers & Pages → motodash-live → Settings → Bindings**:
   verify both Durable Object bindings and the new SQLite namespace. Record deployed
   version/namespace evidence. The migration is created by Wrangler, not a frontend
   toggle or a manually invented replacement namespace.
4. Verify unchanged variables **FIREBASE_PROJECT_ID=motodash-87bf8** and
   **ALLOWED_ORIGINS=https://eggheadstudio.github.io**, and existing encrypted
   **FIRESTORE_SERVICE_ACCOUNT**. Keep its read-only IAM; no new secret or Firestore
   write access is required. No origin wildcard, scheduled trigger or paid service.
5. Endpoint stays **https://motodash-live.old-sound-55f2.workers.dev**; HTTPS tickets
   and WSS sockets remain. Direct navigation returning origin_denied is expected
   and does not prove authenticated live behavior. Monitor actual request/storage/read
   quotas: coordinator renewals add about 3 requests/minute per active UID.

### 4. Publish Pages last

1. **Actions → Deploy to GitHub Pages → Enable workflow**.
2. **Run workflow → main**, no additional inputs. Confirm success and the reviewed SHA.
3. Open **https://eggheadstudio.github.io/MotoDashboard/**. Reload/close old tabs;
   verify **1.4.0-batch6b** via the existing version diagnostics. Do not clear local
   rides/IndexedDB to force an update. There is no new service worker to deploy.
4. Confirm anonymous landing, intentional guest entry, private navigation after
   login, EN/FI, public `#/rider/{opaque-id}` refresh and unchanged Group invitation/QR
   return. All frontend assets remain relative beneath `/MotoDashboard/`.
5. Run the acceptance procedure below and record outcomes. Deployment success is
   separate from effective Rules, cross-device authorization and physical GPS.

### 5. Two-account/two-phone acceptance — NOT RUN

Use disposable accounts **A/B**, Android Chromium and iPhone Safari, over HTTPS,
stationary/on foot and foreground. Choose a deliberate testing window; these steps
create test data. Record versions, language, device/browser, safe error codes and
expected/actual outcomes; never save passwords, tokens or precise locations in logs.

1. Signed out: EN/FI landing, proposed prices, Sign in/Create account, reduced motion,
   natural scrolling/portrait/landscape. No GPS prompt. Try dashboard then explicitly
   Start Ride; permission denial/retry and explicit guest refresh Resume work.
2. A adds two vehicles with private notes. Public preferences alone publish nothing.
   A configures a bio/accent/banner, opts into Public profile and explicitly publishes
   selected cards with separate public text. B opens the copied profile URL signed
   out and after refresh. Name/category/cards appear; email, UID, private notes,
   unselected Garage, history, precise location and technical roles do not.
3. A makes the profile Private: new B server reads of root/cards deny. Restore Public,
   then make a vehicle Private or delete it: the card/featured reference disappears;
   raw retained-card reads deny. A can manage its own Garage/history; B's own signed-in
   SDK reads/writes to A's private records and projection/mapping writes must deny.
   The privileged Console editor is not a client-permission test.
4. A explicitly publishes current identity/rank from a public Club. Private Club
   identity cannot publish. Privacy/rank/membership changes deny the stale card;
   A updates/removes it. Visible ranks never grant technical rights.
5. A records and shares in active Group **X**; B is actually admitted and opts in.
   Verify two readable markers, Group-selected vehicle, stats, stale status and one
   GPS watcher. Browse all five screens: bell and Return to Ride remain reachable;
   return preserves record/vehicle/stats/socket. Home does not stop sharing.
6. Second personal Start offers Return/Cancel and preserves the old ride. Open the
   same account in another tab: competing personal resume/Start cannot start GPS.
   Close/release the owner tab, then explicitly Resume the durable record.
7. For the actual same-UID cross-device test, keep A sharing in X on phone 1; sign
   phone 2 out of B and into **A**. A is admitted to another active Group **Y** on that
   phone. Starting Y must return the active-ride conflict, leave X on phone 1 running
   and send no Y coordinates. Return on phone 2 is sharing-off until explicit consent.
   Explicit same-X reconnect may replace its earlier publisher, never another Group.
8. Stop/leave/end/logout: markers/private live state clear. Ending a Group does not
   finish an independent personal record. Logout stops GPS and returns to landing.
   Refresh never auto-restores live consent; remembered Group authority is rechecked.
9. Remove/ban B or end X while B is silent: expired authority receives no later
   positions within the documented lease bound. Test network loss/reconnect and
   lock-screen suspension: abandoned claims expire; new active sharing never overlaps
   an expired old receiver. Capture safe diagnostics on Wi-Fi and mobile data if needed.

Use the earlier full role/retirement/QR procedure below for existing functionality.
A third account is still needed for the complete Admin/Host permission matrix.
Mark unavailable physical/authorization paths NOT RUN rather than inferred PASS.

### 6. Safe rollback

- Keep the current secure Rules/Worker while rolling back compatible frontend files
  to a reviewed secure commit. Restore only frontend paths in a new main commit;
  do not force push or accidentally revert migrations/backend security files.
- Once v2 exists, retain both class exports, bindings and migration history even
  when disabling new UI. Never roll back to a Worker that lacks global coordination
  and describe it as exclusive. Drain sharing before any reviewed backend rollback.
- Rules rollback must be a reviewed **schema-compatible secure revision**. A pre-6B
  Rules history can deny three-field displayProfiles and break invitations/search;
  do not publish it blindly. Use the manual Firebase workflow's **rules-only** scope
  with the same project confirmation for a compatible secure fix. Leave indexes intact.
- For a real public-data incident, a deliberately reviewed stricter deny-public policy
  is safer than widening access. Inspect Console source/publication and effective client
  denials. Back up evidence, preserve immutable reservations and do not purge data.

Full source/model, counts, operational limitations and commits: BATCH_6B_RESULT.md.
No live acceptance item above is marked complete by local automation.
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
| INFORMATION — Batch 6A | The operator reports its Rules/Worker/frontend deployed and working. Batch 6B publication requirements are the current runbook above. |
| BLOCKER — wider public beta | Full account deletion is not implemented. Auth-only deletion and client recursive deletion are unacceptable substitutes. |
| BLOCKER — acceptance | Real-user/two-account/two-phone behavior and effective live security remain untested. Do not mark the release fully validated from publication or emulator results. |
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
| Cloudflare live transport | `cloudflare/wrangler.jsonc`, `cloudflare/src/`; motodash-live, LIVE_ROOMS/LiveRoom/v1 retained plus local LIVE_IDENTITIES/LiveIdentity/v2 |
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
implemented by the historical cleanup audit. Batch 6A's local implementation and
new acceptance boundary are retained below. Batch 6B is implemented locally; use
the current publication and acceptance runbook at the top of this document.

## Historical Batch 6A publication and acceptance — superseded by 6B above

**Nothing was deployed by the agent.** This section is for the operator after
approving the local commits. No software installation is needed on this computer.

### 1. Review and publish the same main revision

1. Read BATCH_6A_RESULT.md, especially the expiry/retention and deferred fan-out limits.
2. Review the local commits and clean working tree. When approving publication,
   run `git push origin main`. This starts the existing Pages workflow automatically.
   It does not start Firebase or Cloudflare deployment. No new branch is required.
3. Open repository **Actions → Deploy to GitHub Pages** and wait for the main run to
   succeed. Record its commit SHA. The frontend artifact remains its existing allowlist.
4. Continue with both manual backend workflows from that same published main revision.
   During mixed versions, Open writes/notifications may fail closed until Rules are
   published; the older Worker lacks the new expiry enforcement until its own update.
   Finish this short prototype publication window before inviting testers.

### 2. Firebase Rules — manual Actions or Console

Existing GitHub Secret: **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON** from the dedicated
**motodash-firebase-deployer@motodash-87bf8.iam.gserviceaccount.com**, with the unchanged
firebase-deployer-role.json permissions. Do not reuse Cloudflare's reader credential.

1. GitHub **Actions → Validate or deploy MotoDash Firestore → Run workflow**.
2. Choose branch **main**, operation **deploy**, confirmation **motodash-87bf8**,
   scope **rules-and-indexes**. The 18 index definitions are unchanged; reapplying
   this exact inventory is supported. If choosing a reviewed Rules-only publication,
   scope **rules-only** leaves the already Enabled composites untouched.
3. Start the run yourself. Check the validation job, including the new
   **run_batch6a_rules.py**, then the deployment job. No production credentials are
   exposed to the demo test job. Rules are sourced from **firestore.rules** and config
   **firebase.deploy.json**, only database **(default)** in **motodash-87bf8**.
4. Firebase Console → choose **MotoDash / motodash-87bf8** → **Build → Firestore Database
   → Rules**. Verify successful publication date/source, including activityCategory,
   groupDeadline/groupUsable and users/{uid}/notifications source proofs.
5. Alternative Console-only Rules publication: open **firestore.rules** in the GitHub
   main revision, copy the **entire file**, replace the Console Rules editor contents,
   confirm its compile check, then choose **Publish**. Preserve all default-deny,
   retired-ID, private-ride/vehicle and role boundaries. Do not paste fragments or
   relax a denied request. This publishes Rules only, not indexes.
6. Firestore **Indexes → Composite**: verify all **18 Enabled**, as already reported.
   No 19th composite is required for this batch. Compare the exact table above.
7. **Indexes → Single field**: retain routeChunks.pointsJson exemption. Do not exempt
   notifications.createdAt/readAt; the latest-30 and unread-null queries require their
   automatic collection single-field indexes (createdAt DESC, readAt ASC).
8. **Authentication → Settings → Authorized domains**: retain **eggheadstudio.github.io**
   and **localhost**, no /MotoDashboard/ path in the domain entry. Email/password stays
   enabled. No Auth/Hosting/Storage/RTDB setting or data migration is required by 6A.
9. Keep RTDB read/write false; do not deploy or enable it for this batch.

Rules success or 18 Enabled indexes is not a successful live-account test. Record
version evidence separately. Historical Group/invitation data remains; this batch
uses existing fields and applies the deadline to legacy Groups without rewriting them.
Old notifications are not backfilled. Privileged Console reads do not test client Rules.

### 3. Cloudflare — existing manual workflow

Reuse existing GitHub Secrets **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**.

1. **Actions → Deploy MotoDash Cloudflare Worker → Run workflow → main**. Start it
   manually; review its successful dry-run/tests and final deployment.
2. It uses unchanged **cloudflare/wrangler.jsonc**, Worker **motodash-live**, binding
   **LIVE_ROOMS → LiveRoom**, existing SQLite **v1** migration. Do not recreate the DO
   namespace or add a migration for this source-only update.
3. Cloudflare Dashboard → Workers & Pages → **motodash-live** → **Settings**. Verify
   **FIREBASE_PROJECT_ID=motodash-87bf8**, **ALLOWED_ORIGINS=https://eggheadstudio.github.io**,
   existing encrypted **FIRESTORE_SERVICE_ACCOUNT**, and LIVE_ROOMS binding.
4. Keep the Firestore reader's existing read-only IAM role. No Firestore write grant,
   notification writer key, scheduled trigger or paid service is required.
5. Record deployed Worker version. Endpoint remains
   **https://motodash-live.old-sound-55f2.workers.dev**; frontend HTTPS tickets/WSS unchanged.
6. Refresh any already-open frontend tabs. Reconnect-test existing live rooms too;
   prior sockets/attachments are bounded on authority recheck. Direct navigation with
   no allowed Origin still returns origin_denied and is not an authenticated live test.

### 4. Production MD-NETWORK diagnostic procedure

The reported failure remains **unreproduced**, including whether switching networks
resolved DNS/proxy/SDK transport or coincided with another request finally completing.

1. Confirm the deployed main revision and app version **1.3.0-batch6a**. Reload an old
   open tab; if a removed legacy SW was controlling it, close/reopen and reload again.
   Preserve IndexedDB/local ride data. Do not clear all site storage just to test caches.
2. Record time, app language, operation (Home load, Group open/invite/start/join,
   dashboard sharing, approval, Discover, history), browser/OS and displayed safe code.
   **MD-NETWORK/GROUP-INVITE**, **MD-TIMEOUT/GROUP-LOAD**, **MD-PERMISSION/...** and
   **MD-PRECONDITION/...** distinguish failing scope. Cloudflare's connected indicator
   is independent of Firestore connectivity. Screenshot only safe UI, not account/location data.
3. If existing desktop DevTools are available, use this safe in-memory report on the
   MotoDashboard page; it contains only at/code, never request payloads or credentials:

   ```javascript
   console.table((await import('./js/firebase/access.js')).getDataDiagnostics())
   ```

   Group-watch codes also appear briefly in the GPS/network status area. Auth/CDN
   initialization failures retain the separate Account retry UI; they may not enter
   this Firestore request history. A Promise.all deadline can still say DATA when
   no individual operation error identifies a narrower scope; record the visible action too.
4. Network panel: reproduce **one action at a time**, and distinguish domains/endpoint
   class only: **www.gstatic.com** (SDK imports), **identitytoolkit.googleapis.com** /
   **securetoken.googleapis.com** (Auth), **firestore.googleapis.com** (Firestore),
   **motodash-live...workers.dev** (live), tiles/weather (providers). Note HTTP outcome,
   DNS/TLS failure, blocking or stalled Firestore Listen/channel without sharing query
   strings, request body/headers, document paths, tokens, HAR or coordinates.
5. Compare the same accounts/action: both Wi-Fi; A Wi-Fi/B cellular; A cellular/B Wi-Fi;
   both cellular. Keep session/foreground state comparable. Record VPN, content blocker,
   private browsing and DNS/proxy differences if known. Two users on one Wi-Fi alone
   does not prove the cause. Do not weaken origin checks or Rules during comparison.
6. On **OFFLINE**, reconnect and Refresh. On **TIMEOUT**, a write can still commit;
   refresh the actual invitation/approval/session before sending it again. A read gets
   at most one transient retry; no high-frequency polling or blind write replay.
7. On **PERMISSION**, verify actual account/membership/organizer and latest published
   Rules; do not classify this as Wi-Fi. On **PRECONDITION**, inspect the actual Firebase
   error locally for an index link/precondition and compare the deployed inventory;
   generic failed-precondition does not establish a missing index by itself.
8. If Firestore channel buffering persists on a controlled network, retain safe timing
   evidence and review SDK transport before a separately tested configuration change.
   Auto-detect long polling is already default; forced polling is not a demonstrated fix.
   [Firebase transport documentation](https://firebase.google.com/docs/reference/js/firestore.firestoresettings).

### 5. Exact two-phone / two-account Batch 6A acceptance

Run safely stationary/on foot, foreground HTTPS, with accounts A/B and separate
browser profiles: **iPhone Safari** and **Android Chromium**. Record actual versions
and results. These production operations are performed by the operator only.

1. Verify EN/FI registration/login and own Garage on both. Create a real car/bicycle/
   motorcycle; Garage must not offer Open. Verify local recording/history/export and
   private cloud history still work; B cannot read A's private vehicle/ride/profile.
2. A creates an **Open / Any vehicle** Club/Group. Discover's Open filter finds that
   public/approval activity. B joins using a different permitted Garage category.
   Private Groups remain absent from public discovery; approval/invite/bans still enforce.
3. A invites registered B through the actual recipient selector. B's bell increments;
   A cannot read B's notification collection. Open B's notification, verify timestamp,
   mark-read/badge decrement and correct Group navigation. A must not gain arbitrary
   notification creation privileges from hosting another unrelated Group.
4. Test B's Group approval and Club membership approval independently. Each creates
   B's matching notification only after A's authorized approval. Rejected requests
   produce no false approval. Check FI text and read state across reload.
5. Sign B out, open **#/notifications**, choose Sign in / register, sign back in and
   close Account: return to the notification sheet with no stacked modals. B's rows
   must disappear immediately on logout; signing A in must not show B's rows.
6. A activates a Group within the allowed start window; B must actually be admitted.
   Both separately consent and grant GPS. Verify peer name/vehicle/status labels are
   normal width, not vertical columns, at narrow portrait and landscape. Rotate phones,
   test text scaling, all HUD panels/controls, safe areas and no map-obscuring status toast.
7. Toggle GPS/network collapse: compact live indicator and accessible details remain.
   Exercise weather/themes/heading/map center and personal recording concurrently.
8. A taps Back from the live-only dashboard. Choose **Home · keep Group running**:
   A's sharing stops, Group remains active, B can still share. A returns and must
   consent again. Then choose **End Group for everyone**: both clear markers and
   cannot reconnect/restart. B has no global-end privilege. Verify explicit Cancel too.
9. In another active Group, A completes/cancels from management while B shares.
   B's state/markers update via Firestore/Worker, promptly within the authority lease.
   If B records a personal ride simultaneously, that recording/watch continues;
   finish and verify its independent saved history afterward.
10. For expiry, create a disposable Group with scheduled start around the current
    minute and end **3–5 minutes later** (end >= start). Both consent; close A's tab
    without completing. Keep B foreground and let the deadline pass. B must stop;
    refreshing/reconnecting/new admission/status changes must deny even if Console
    still shows stored state active. Inspect history as retained, not physically purged.
    Also verify an abandoned no-end Group is bounded by start +24h; do not wait 24h
    and then falsely mark that case tested from the short explicit-end case alone.
11. Try starting a Group more than 2h early, extending active times, restarting terminal
    identity and old invitation after end/expiry: each must deny; original record and
    personal ride history remain intact. Revoked/stale invitation notifications are
    informational references, never an admission grant.
12. Reproduce network interruption and Wi-Fi/cellular comparison using procedure 4.
    Record exact safe failing scope, graceful recovery, no repeated toasts and no
    hidden duplicate GPS watchers. Leave, logout, removal and end must stop sharing.

Club announcement and Group update/cancel **notification fan-out is not implemented**;
do not mark it tested or complete. Active Group watchers/live clients still receive
terminal state. Secure trusted delivery, notification retention/backfill and physical
account erasure remain explicit future requirements. No acceptance case above was
marked completed by the agent.

### 6. Compatible rollback

Record a reviewed frontend SHA, current Rules source/hash and Worker version before
publication. Preserve new deadline/notification privacy and all earlier security fixes.
Rules-only rollback through the existing typed-confirmation workflow must pass all
emulator suites; do not revert to older rules that remove these safeguards. A frontend
rollback may omit new notifications/Open UI, while retained records remain protected.
Worker rollback must preserve expiry enforcement, origin/token validation and LIVE_ROOMS
namespace/migrations; an old unbounded Worker is not an acceptable completed 6A rollback.
If no compatible prior Worker exists, prepare/test a corrective deployment instead.
Verify existing sockets cease unauthorized access. No data purge or RTDB activation
is part of rollback.

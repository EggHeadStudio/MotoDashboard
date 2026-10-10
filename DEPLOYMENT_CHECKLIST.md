# MotoDashboard deployment checklist and security fix result

Security fix date: 2026-10-10. Base commit: `a598aec90849c56c13e3a1490875793b9b0937ba`.
The 2026-10-09 review evidence below is retained as historical reproduction.

**BLOCKER - NOT RELEASE READY.** B1/B2 are corrected locally with passing regressions.
Actual Console configuration, deployed rules/indexes, existing-data migration and
real-account/device acceptance remain unverified (B3-B6). The currently public app
and active Firebase rules have not been changed by this security batch.

Authorized work: Club security corrections, related tests/docs and one local commit.
No push, Pages deployment, Firebase rules/index publication, production-data changes
or real Auth accounts. RTDB remains locked. Historical claims that the pre-deployment
review changed only documentation describe that earlier review, not this batch.

Classification: **BLOCKER** must be resolved before release approval;
**WARNING** requires a documented mitigation/acceptance;
**INFORMATION** records a verified fact or scope boundary.
Instructions below are for a later, explicitly authorized deployment/test session.

## 1. Release findings and required corrections

| ID | Classification | Finding and resolution |
| --- | --- | --- |
| B1 | INFORMATION | **Resolved locally, not deployed.** Canonical `clubs/{id}` gets are member/Owner-only; listing is denied. Exact `clubPages/{id}` presentation has no owner/membership UIDs or authorization fields. Canonical/page/count changes are atomic; read rules also reject malformed/stale projections. Raw public/unlisted and field-injection regressions pass. |
| B2 | INFORMATION | **Resolved locally, not deployed.** Irreversible retirement retains `clubs/{id}` as the ID reservation. All private children require a live parent. Client hard deletion, same-ID replacement/reactivation, stale invite reads/admission and former privileges are denied. Repository generates independent UUIDs and performs no recursive purge. |
| B3 | BLOCKER | Active Firebase Console settings and deployed rules are unknown. Verify the dedicated project/web app, Email/Password, default Firestore database, authorized domains and actual rule contents. Review corrected B1/B2 and complete migration gate B6 before publishing revised Firestore rules. Retain locked RTDB rules. |
| B4 | BLOCKER | Required production index availability is unknown; the emulator does not establish production index readiness. Verify/create the exact index and exemption in section 5, and wait for readiness. |
| B5 | BLOCKER | Real Auth/persistence/two-account security and physical phone acceptance are absent. Complete sections 7–9 after approved setup; retain evidence of results. This is an acceptance gate, not a claim that those flows are known to fail. |
| B6 | BLOCKER | Existing Club inventory/backfill and old deleted/orphan ID reservations are not verified. New pages and retired-ID invariants require an approved trusted operator migration before rollout. Follow section 10; an empty verified inventory satisfies the data-work portion. No production data was inspected or modified in this batch. |
| W1 | WARNING | At the historical pre-deployment review, the frontend was already public and remote `main`, local `main` and `origin/main` pointed to the reviewed commit; the public HTML, app JS, config and static rules file match local contents. Review the current deployment and backend exposure promptly. A rules file served by Pages is not the rules active in Firebase. |
| W2 | WARNING | No service worker is shipped/registered. Startup unregisters only this app's exact scope and catches errors. Cleanup cannot run if an older worker serves code that never reaches it; unregistering also does not replace the already-loaded page. Verify upgraded installed instances and use the recovery procedure in section 6. |
| W3 | WARNING | Local IndexedDB/localStorage is plaintext and can be inspected by someone sharing the OS/browser. Account filtering is not encryption; use separate browser profiles for security acceptance. |
| W4 | WARNING | No multi-tab recording lock; local edits may race. Use one recording tab. Metadata revisions detect cloud name conflicts but are not a full concurrency solution. |
| W5 | WARNING | Erasing local storage during an incomplete upload can lose missing chunks. Export completed rides before clearing data; verify upload completion first. Forced termination, quota and browser eviction remain risks. |
| W6 | WARNING | Deadlines do not cancel submitted SDK operations; retry jobs run while the page is open. Test logout/reconnect and delayed responses. No background synchronization guarantee. |
| W7 | WARNING | Parent deletion does not recursively delete children. Ride rules require a fence but allow manifest deletion before all chunks are removed; the app normally purges chunks. Club retirement now retains inaccessible data and a permanent reservation; physical erasure requires an operator that preserves that reservation. Plan trusted retention/account deletion; do not delete Auth users and assume their Firestore data disappears. |
| W8 | WARNING | Rules bound route payloads but cannot parse their JSON or prove GPS authenticity, chunk completeness or SHA-256 correctness. Retrieval validates routes in the client. Owner-supplied statistics are not trusted Official Event evidence. |
| W9 | WARNING | Rules' link validation is broader than the client URL parser; a manager can directly store credential-bearing HTTPS URLs. Rendering revalidates links, uses plain text and `noopener/noreferrer`. Maintain that rendering guard and consider tighter server validation later. |
| W10 | WARNING | Invite rules enforce future expiry but no seven-day upper bound; seven days is a client convention. Archived managers can still edit ranks/Wall, and Owner can reactivate a Club. Archived state may be reactivated; deleted state cannot. Verify intended archived policies and transaction races. |
| W11 | WARNING | Pages workflow uploads repository root and performs no tests. Docs, tests and rules can be public. Keep credentials out of all tracked files and consider an allowlist artifact and required checks in an approved maintenance change. |
| W12 | WARNING | CDN/maps/weather remain network dependencies; no offline cold start or background GPS guarantee. Physical Safari/Android, installed-manifest behavior, provider availability, battery/load and gesture acceptance remain pending. |
| W13 | WARNING | Visible version remains `1.2`; manifest URL contains `?v=1.1`, and app/CSS module URLs are not versioned. These are not reliable deployment identifiers. Compare published files/commit and hard-refresh after approved releases. |
| W14 | WARNING | Auth accounts can exist even when profile writes fail. Password reset, account deletion and full profile editing are future work. Use disposable acceptance accounts and document operator cleanup/support for the initial prototype. |
| W15 | WARNING | No App Check integration, abuse quotas or billing monitoring was exercised. Review Console policy and usage monitoring; do not enable App Check enforcement without an approved compatible client change. |
| I1 | INFORMATION | Dedicated config is `motodash-87bf8`; no Monopoly configuration or Admin/service-account private key patterns found in current files or 40 reachable Git revisions. This is a pattern review, not a guarantee against every possible secret format. |
| I2 | INFORMATION | All seven configured web fields are present. Auth/Firestore share one named `MotoDash` app; the prepared RTDB adapter uses that same app and has no application caller. |
| I3 | INFORMATION | Private profiles, Garage and rides remain owner-only; Garage `public/club` visibility is a stored future preference, not shared access. Custom ranks never grant permissions. See the verified authorization matrix below. |
| I4 | INFORMATION | `/MotoDashboard/` static paths/native browser imports, English/Finnish and the retained dashboard passed local checks. No app build step is needed. |
| I5 | INFORMATION | Group Sessions, live locations, Lobby, QR, Official activities, uploads and billing remain outside Batch 2. Their unknown paths are denied. This review implements none of them. |

### B1: historical confirmed reproduction (fixed locally on 2026-10-10)

`firestore.rules:139` requires `lastMembershipUid` on the canonical Club; membership
transactions update it. `firestore.rules:173` allows signed-in nonmembers to get a
public/unlisted Club, and public active queries can also return the full document.
Reading the minimal `clubDirectory` instead in the UI does not close direct access.

Local emulator reproduction: Alice creates a public Club; Erin joins; unrelated Dave
gets `clubs/open`. Expected: membership ledger UID absent. Actual: HTTP 200 containing
`lastMembershipUid: "erin"`. Private roster reads are correctly denied, but this field
still reveals the most recent joining/leaving account. The public canonical document
also exposes owner UID and member count; explicitly decide which presentation fields
are public. Do not attempt to hide sensitive fields with client rendering.
Firestore authorizes whole-document reads, so protection requires document separation.
[Firebase field access guidance](https://firebase.google.com/docs/firestore/security/rules-fields).

### B2: historical confirmed reproduction (fixed locally on 2026-10-10)

`firestore.rules:187` checks archive, count and removal of founder/directory. It does
not require a deletion fence or isolate old children. `clubRepository.deleteClub()`
purges known children first, but a client can bypass that repository.

Only normal client permissions were used for this reproduction:

1. Alice creates private `lifecycle-review`, writes a private Wall and invites Carol.
2. Alice archives the Club and atomically deletes founder membership, own Club ref
   and Club parent, leaving Wall/invite documents. Rules allow this.
3. Bob creates a new private Club using the same document ID and valid founder/ref
   transaction. Rules allow this despite the existing children.
4. Bob reads the original private Wall: expected deny, actual HTTP 200.
5. Carol's old invite allows reading the recreated private Club: expected deny,
   actual HTTP 200. Consuming that invite to join also succeeds unexpectedly.

UUID generation in the UI is not authorization: a direct client supplies the ID.
Archive/deletion rules do prevent erasing active members in the tested normal model;
that protection does not establish safe child cleanup or safe ID reuse.
Firestore does not recursively delete subcollections with their parent.
[Firebase deletion behavior](https://firebase.google.com/docs/firestore/manage-data/delete-data).

## 2. Configuration and exact Firebase Console checks

**INFORMATION — existing public web configuration:** `firebase-config.js` exports
configuration only. `js/firebase/firebase.js` is the sole initializer, using pinned
gstatic Firebase 13.0.0 browser modules and local Auth persistence.
`auth.js`, `firestore.js`, `realtime.js` and all repositories use its app/services.
Firestore uses the default database and memory cache. No Storage/Analytics/Admin SDK
initialization is present.

| Field | Checked-in value/status | Console verification |
| --- | --- | --- |
| `apiKey` | Present in `firebase-config.js`; public web key | Compare exact value with Web app Config; verify API restrictions permit the intended Auth/Firestore use. |
| `authDomain` | `motodash-87bf8.firebaseapp.com` | Must match the dedicated Web app, not Pages URL or another project. |
| `projectId` | `motodash-87bf8` | Console project selector and General settings must match exactly. |
| `storageBucket` | `motodash-87bf8.firebasestorage.app` | Present but unused; do not enable uploads or permissive Storage rules for this batch. |
| `messagingSenderId` | `349373433221` | Compare with Web app Config/project number. No messaging feature uses it. |
| `appId` | `1:349373433221:web:d30008f951cf31e11430ec` | Select this Web app registration. |
| `databaseURL` | `https://motodash-87bf8-default-rtdb.europe-west1.firebasedatabase.app` | Match the RTDB instance in Console; retain locked rules. |

**INFORMATION — configuration fields still missing: none for Batch 2.**
`measurementId` is unnecessary because Analytics is unused. Storage bucket validation
is not part of the initializer's guard because Storage is unused. Existing values
have not been authenticated against Console ownership/registration. A populated config
does not prove that any provider/database is provisioned.
[Firebase web configuration](https://firebase.google.com/docs/web/setup).

**BLOCKER B3 — operator verification, before any release approval:**

1. Firebase Console → project selector: select **motodash-87bf8**. Project settings →
   General → Your apps → Web app → SDK setup and configuration → Config: compare all
   fields above with the file. Do not create a replacement project or mix registrations.
2. Build → Authentication → Sign-in method: verify **Email/Password enabled**.
   Email-link, Google/redirect, anonymous and phone sign-in are not needed by this UI.
3. Authentication → Settings: verify password policy and quotas/abuse configuration.
   The form checks a six-character registration minimum; the backend enforces its actual
   policy. Test localized errors for any stricter policy. No real test credentials have
   been created by this review; `*.example.test`/`fixture-password` are SDK fixtures only.
   [Firebase password authentication](https://firebase.google.com/docs/auth/web/password-auth).
4. Authentication → Settings → Authorized domains: verify the hostnames in section 4.
5. Build → Firestore Database: verify a **Standard/native Cloud Firestore default
   database `(default)`** usable by the web SDK. Record its actual region; no Firestore
   region is declared in web config, and it cannot be inferred from the RTDB URL.
6. Firestore → Rules: export/retain the current deployed rules and timestamp. Compare
   actual contents with this security batch's revised rules after approval and B6. Never
   use test-mode/global authenticated access as a workaround for a failed operation.
7. Firestore → Indexes: verify section 5, including readiness and single-field settings.
8. Build → Realtime Database: select the exact Europe West instance; verify deployed
   root `.read: false` and `.write: false`. No live location access is authorized.
9. Record project access, usage/quota monitoring and any existing App Check enforcement.
   Check that deployment roles belong to the intended operator. Never put a service
   account, private key, Admin token or user password into the Pages artifact.

## 3. Rules review and local verification

**INFORMATION — files reviewed against actual repositories/schema:**
`firestore.rules`, `database.rules.json`, `firestore.indexes.json`, `DATA_MODEL.md`,
all `js/firebase/*.js`, `js/data/schema.js`, `js/data/permissions.js` and client sync.
IDEA.md, IMPLEMENTATION_STATUS.md and README.md were read completely. Historical
audit/Batch 1 statements were interpreted using the later Batch 2 scope/status.

| Authorization requirement | Classification | Actual result |
| --- | --- | --- |
| Another account's profile read/edit/delete | INFORMATION | Own UID and exact six-field allowlist; cross-account read/update/delete denied. Client profile deletion also denied for owner. |
| Another account's Garage read/edit/delete | INFORMATION | UID path ownership; cross-account get/query/create/update/delete denied, even when vehicle visibility says public. |
| Another account's private history read/modify | INFORMATION | Owner-only manifests/chunks/tombstones; foreign get/query/rename/delete/chunk read/delete/fence creation denied. |
| Self-granted system administration | INFORMATION | Extra profile field denied; systemAdmins/Official/badge/unknown writes and reads denied. No client system-admin grant path. |
| Self-granted Club Owner/Admin/Host | INFORMATION | Open admission yields Member; privileged self-admission and role changes denied. Creating one's own new Club legitimately grants its founder Owner. Owner UID is immutable thereafter. |
| Membership admission and Club roles | INFORMATION | Atomic membership/account ref/count coupling; approval manager decision; valid UID invite consumed on join; Owner/Admin/Host/Member boundaries exercised. Retirement denies all old-child access and ID reuse. |
| Visible custom ranks | INFORMATION | Captain has no effect on rule permission predicates; Member with Captain still cannot edit Wall. |
| Club branding | INFORMATION | Owner/Admin only; Host/Member/outsider updates denied. Admin cannot change owner/privacy/policy/name/category. Colors bounded to six-digit hex. |
| Info Wall | INFORMATION | Members read; Owner/Admin write/delete; plain-text bounded field contract. Foreign/Host/Member writes denied. Retired-parent guards prevent stale Wall access even for former Owners. |
| Public Club/private membership separation | INFORMATION | Safe pages and directory contain only presentation; private canonical reads/listing and foreign roster/invite/request access are denied. Retired parents block every private child. |
| Unknown collections/operations | INFORMATION | Final recursive default deny; explicit matches contain no global authenticated allowance. Rule allows are additive, so default deny does not erase an earlier grant. |
| RTDB live locations | INFORMATION | Checked-in root read/write false; no app call sites. Actual deployed rules and RTDB rules-engine testing remain unverified. |

### Current security-batch executed results (2026-10-10)

**INFORMATION — local emulator only:** official Firestore emulator 1.20.2, Java 21,
`127.0.0.1:8185`, fixed project `demo-motodash`. `tests/run_rules.py` loads current rules
and resets only the local demo database. Unsigned emulator identities are not live
Firebase accounts. Admin bypass is limited to fixture inspection/malformed-page seeding; reproduced B1/B2
operations used ordinary authenticated client permissions.

| Test run | Passed | Failed | Skipped | Meaning |
| --- | ---: | ---: | ---: | --- |
| Baseline: `python tests/run_rules.py` | 102 | 0 | 0 | Real local emulator request assertions, including fixture inspections; prior 97 cases adapted to the stronger page/retirement contract, plus five assertions. |
| Additional: `python tests/run_security_rules.py` | 137 | 0 | 0 | Additional collected security expectations; setup/inspection excluded. Runner independently rebuilds baseline first, so its 102 baseline results are not counted twice. |
| Full browser: `python tests/run_browser.py` | 14 PASS groups | 0 | 0 | Includes 36 deterministic domain assertions; actual dashboard plus SDK product fixtures and separate real SDK imports with cloud blocked. |
| Pages/degraded Firebase: `python tests/run_release_paths.py` | 2 PASS groups | 0 | 0 | 103 references, 44 distinct local URLs HTTP 200 under /MotoDashboard/; scoped worker cleanup and guest recording/history without Firebase. |

Historical pre-fix results were 97 baseline passes and **41 passes / 4 failures**
in the temporary additional review script. All four original security goals now pass:

| Former failure | Expected / former actual | Root cause | Current correction and regression |
| --- | --- | --- | --- |
| Public metadata omits membership UID | No UID / HTTP 200 with lastMembershipUid | Canonical whole-document public get/list | Member-only canonical; exact safe page; public/unlisted raw gets, canonical query denial and extra-field/malformed-page regressions. |
| New founder cannot read old Wall | Deny / HTTP 200 | Parent removed without a permanent reservation; child authorization attached to reused ID | Parent cannot be hard deleted; retired state is irreversible; same-ID replacement denied and retained Wall denied. |
| Stale invite cannot expose new Club | Deny / HTTP 200 | Invite outlived parent and was trusted after ID reuse | Live-parent/active-invite guard; safe/canonical/retained invite reads denied after retirement. |
| Stale invite cannot admit membership | Deny / successful join | Membership admission trusted the previous Club's unexpired invite | Retired-parent admission denied, no new page/ref/member, old invite cannot be consumed, fresh UUID does not inherit it. |

Regression scripts are now tracked and portable: `tests/run_security_rules.py` and
`tests/run_release_paths.py`. The historical TEMP scripts remain historical artifacts,
not the current test instructions. No assertion was changed to permit an unauthorized
operation. Positive founder/join/approval/invite/leave/role/rank/branding/Wall flows pass.
Positive retirement, forbidden hard deletion/reactivation/recreation, former Owner/Admin
rights, retained approvals/ranks/Wall/invites, cross-account Garage/rides and exact
atomic projection integrity are covered. Rules were strengthened, not relaxed.

**WARNING — untested authorization paths/limits:**

- Exhaustive cross-Club role combinations; Admin attempting another Admin; every
  rank/request/invite/ref create/update/delete permutation and malformed field boundary.
- Contended concurrent browser SDK joins/removals and archive/retirement races.
  Atomic commits, stale invitations, incomplete retirement denial and privacy changes
  are covered; real SDK concurrency/load and expiry-between-read-and-commit remain pending.
- Large Club transaction access-call budgets, mixed-size batches and hostile route
  payload completeness. The existing 32-route-chunk batch passes the local engine.
- Real browser SDK transactions against the emulator: UI tests use SDK fixtures,
  whereas actual rules tests use REST commit/query requests and server transforms.
- RTDB emulator authorization, actual Console-deployed rules, live account claims,
  production composite-index enforcement and administrator/IAM bypass configuration.

No skipped tests conceal these gaps. Unimplemented product paths are denied rather
than tested as features. **No real Firebase authorization/persistence success is claimed.**

To rerun the existing checks locally, from the repository root:

```powershell
java -jar "$env:TEMP\motodash-firestore-emulator-1.20.2.jar" --host 127.0.0.1 --port 8185 --project_id demo-motodash --rules firestore.rules
```

In another terminal:

```powershell
python tests/run_rules.py
python tests/run_security_rules.py
$env:PYTHONPATH = "$env:TEMP\motodash-test-tools"
python tests/run_browser.py
python tests/run_release_paths.py
```

Tool installation alternatives/download instructions are in README.md and
tests/RULES_TESTING.md. The temporary emulator started for this review is stopped
after verification. Never replace the demo endpoint with production.

## 4. Exact files and authorized domains

| Item | Classification | Exact target/action, only after approval |
| --- | --- | --- |
| Firestore rules | BLOCKER B3/B6 | Root **`firestore.rules`** → `motodash-87bf8` / `(default)` Firestore → Rules. B1/B2 are corrected and tested locally; **deployment is not authorized**. Complete Console verification and migration gate B6 before publishing this reviewed revision. |
| RTDB rules | INFORMATION | Root **`database.rules.json`** → the configured Europe West RTDB instance → Rules. Preserve both root `.read` and `.write` as false. |
| Firestore indexes | BLOCKER B4 | Root **`firestore.indexes.json`**, settings detailed below. |
| Pages Auth host | INFORMATION | **`eggheadstudio.github.io`**, without scheme, port or `/MotoDashboard/`. |
| Local development host | INFORMATION | **`localhost`**; **`127.0.0.1`** only if used as the URL host. Explicitly verify entries; newer projects may not include localhost automatically. |
| Existing Auth host | INFORMATION | Retain **`motodash-87bf8.firebaseapp.com`** if already present; do not change authDomain to the Pages project path. |
| Future custom domain | INFORMATION | Add only an actually configured host, then test it separately. No custom domain assumed here. |

Firebase documents the newer-project localhost default change in its
[Authentication troubleshooting guide](https://firebase.google.com/docs/auth/faq-and-troubleshooting).
Authorized domains are not data authorization and do not replace Firestore rules.

Security-batch file SHA-256 fingerprints (UTF-8 with LF newlines):

```text
firestore.rules
8D65B1AA6B00AB483AB6BDD1F749256EDAE8D97248FF2EC5A923396150EF7F5B
database.rules.json
BAAFBA819B7E9CD03209B6E9968D641A58E91E20DFC2D9290A21D92D350CD3A5
firestore.indexes.json
E518BE5975106627ADE17D13E9A4603BDE816CAD62FCBEA684CE514AFEAE2064
```

**INFORMATION:** No `firebase.json`/CLI deployment target is checked in. These
instructions use Console publication; do not assume `firebase deploy` is configured.
Rules served by Pages do not publish themselves to Firebase.

## 5. Required Firestore indexes

**BLOCKER B4 — Firestore → Indexes → Composite → Add index:**

| Setting | Value |
| --- | --- |
| Collection ID | `sessions` |
| Query scope | **Collection**, not Collection group |
| First field | `uploadState` — Ascending |
| Second field | `startedAt` — Descending |

This supports owner-scoped completed history with `where(uploadState == "ready")`,
`orderBy(startedAt, "desc")`, `limit(20)` and cursor pagination. Do not query every
user's sessions in a collection-group query.

**BLOCKER B4 — Firestore → Indexes → Single field → Add exemption:**
collection group/collection ID `routeChunks`, field path `pointsJson`, disable its
single-field indexes (ascending, descending and array, as applicable). The JSON
payload is never queried. This matches `fieldOverrides[].indexes: []`.
Preserve ordinary indexing for `sequence`, `deletedAt`, directory `name`, Club ref
`joinedAt` and request `state`. Current queries need no additional declared composite
index. Verify any newly proposed query before adding indexes.

Wait for the composite index to finish building; retain evidence of its enabled
state. Emulator success does not establish that it exists in production.
[Firebase index management](https://firebase.google.com/docs/firestore/query-data/indexing).

## 6. GitHub Pages compatibility, state and publication procedure

**INFORMATION — Git state at review start:** branch `main`, clean tree; HEAD and
local `origin/main` equal the reviewed commit. Read-only `git ls-remote origin
refs/heads/main` also returned that commit. Origin is
`https://github.com/EggHeadStudio/MotoDashboard.git`. No ahead/behind difference
was present. The earlier review added this document only. This batch started with it untracked and otherwise clean; security source/tests/docs are included in one new local commit. Remote state was not refreshed during this batch.

**WARNING W1 — existing public deployment:** static GETs returned HTTP 200 for
`index.html`, `js/app.js`, `firebase-config.js` and `firestore.rules` at
`https://eggheadstudio.github.io/MotoDashboard/`; each matched reviewed local text
after CRLF normalization. This supersedes any assumption that Batch 2 is still
local-only. No conclusion about deployed backend rules follows from those responses.

**INFORMATION — local compatibility verified:** HTML/CSS references, relative ES
imports and manifest start/scope/icon paths stay within `/MotoDashboard/`; 43 unique
local URLs returned HTTP 200. No root-relative assets, missing targets or bare package
imports were found. Native Chromium parsed/linked every application module. Genuine
pinned Firebase modules imported without a build step; direct CDN GETs for app/Auth/
Firestore/Database 13.0.0 also returned HTTP 200 during this review. Cloud APIs were blocked.
Local GPS/map/weather/recording/history and en/fi checks passed with simulated inputs.

**WARNING W2 — update/cache acceptance:** no worker is currently shipped or registered
by this source. The scope-filtered cleanup was tested with app and sibling registrations:
only this app was unregistered. An existing controlling worker or root-scope worker can
still serve stale code; do not claim automatic cache upgrade for every previously
installed instance. After an approved publication, close/reopen old tabs and inspect
DevTools → Application → Service Workers and Network. If stale, unregister only the
MotoDashboard worker, then hard-refresh. Do not clear IndexedDB/localStorage or all
origin storage as a first step: that can erase local rides, and sibling Pages apps
share this origin. Preserve/export local rides before any destructive cache recovery.

**BLOCKER — future publication steps are gated by B3-B6:**

1. Review this separately committed B1/B2 correction and passing suites. Complete
   Console/index preparation and approve/execute migration gate B6 in section 10.
2. Obtain explicit approval for backend publication and dedicated-account acceptance.
   Back up existing rules, publish revised `firestore.rules` and locked
   `database.rules.json` to the exact targets above; add/verify indexes. Perform live
   acceptance from localhost/HTTPS before another public release.
3. Review GitHub repository Settings → Pages → Build and deployment → Source:
   **GitHub Actions**. Verify `.github/workflows/deploy.yml` and the `github-pages`
   environment permit only the intended branch/operator. Retain `.nojekyll`.
4. Inspect `git status`, `git diff --check` and the complete release diff; stage only
   reviewed files and commit the approved changes. Do not include temp artifacts or
   credentials. Determine whether upstream moved and review any incoming changes.
5. After explicit publishing approval, push the reviewed branch:

   ```powershell
   git push origin main
   ```

   The existing workflow triggers on `main` push and uploads root `.` without a
   build/test step. A push is a potential immediate publication. If the intended commit
   is already remote, use Actions → Deploy to GitHub Pages → Run workflow → `main`
   only after the same approval; do not create an unnecessary empty commit.
6. Check successful checkout/configure/upload/deploy steps, deployed commit and
   environment URL. Open **https://eggheadstudio.github.io/MotoDashboard/** with the
   trailing slash. Check Network for 404/import/CORS errors; hard-refresh an older
   tab and test a fresh separate browser profile.
7. Repeat smoke/security/device acceptance below against the published version.
   Record which source commit, rules revision and indexes were tested together.
   If it fails, stop the rollout and review a known compatible rollback; do not
   loosen backend rules to restore a UI operation.

[GitHub Pages publishing configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 7. Real Firebase acceptance procedure — NOT RUN

**BLOCKER B5 — requires later explicit authorization to create disposable test data:**

1. Review corrected B1/B2, complete migration gate B6, and finish sections 2, 4 and 5. Verify active rules before using
   accounts. Record project, Web app ID, database, rule revision and index state.
2. Serve the parent directory locally:

   ```powershell
   python -m http.server 8000 --bind 127.0.0.1 --directory ..
   ```

   Open `http://localhost:8000/MotoDashboard/` in two separate browser profiles.
   This is the real-config frontend, so its Auth/Firestore operations use the real
   project. Do not run live tests before they are authorized.
3. Register accounts A and B with operator-controlled real emails and unique passwords
   meeting Console policy; record UIDs, never passwords, in acceptance notes.
   Confirm both Auth user creation and the six-field private Firestore profile.
4. Sign out/sign in, reload and reopen. Verify persisted identity, wrong-password
   errors and explicit profile failure/retry. Change en/fi and verify local choice
   plus profile update timestamp; an Auth success message alone is insufficient.
5. A creates motorcycle/car vehicles; edit/default/choose/delete/reload. Confirm own
   Firestore data and vehicle snapshot persistence in completed rides after deletion.
6. Record and finish a disposable ride. Verify local save, private manifest/chunks,
   final `ready` state and a single stable ID. Open history from a fresh A profile;
   confirm query/index success, lazy route download, statistics and JSON/GPX export.
7. Disconnect while recording/finishing/renaming, then reconnect/retry. Verify pending
   jobs remain visible and no duplicate chunks/rides appear. Do not erase the local
   record during an incomplete upload. Check name conflict recovery between A's devices.
8. Delete a disposable completed ride; confirm tombstone, removal of chunks/manifest
   and stale retry denial. Repeat refresh; do not use valuable existing rides.
9. Create public open, approval, unlisted invite and private invite Clubs. Exercise
   request/reject/reapply/approve, UID invite consume, multiple membership, leave,
   role/rank changes, safe links/colors and Info Wall. Run the security procedure below.
10. Confirm B1/B2 corrected cases deny raw access, stale invites and generation reuse.
    Check archive/nonempty retirement protection, failed atomic retirement and retained-ID protection.
11. Verify RTDB denied in Console Rules simulator and, if approved, with actual
    authenticated reads/writes to disposable paths. Keep it locked and unused.
12. Clean up only the approved disposable records/accounts using an operator-reviewed
    procedure that includes subcollections/refs/tombstones/owned Clubs. Deleting an
    Auth user does not clean up that data automatically. Record actual results/errors.

## 8. Two-account security procedure — NOT RUN

**BLOCKER B5 — use Firebase client SDK/rules, not Console data-editor or Admin access.**
The Console editor operates with administrator permissions and is not proof of client
denial. Rules Playground is useful for individual documents; use real UI/SDK or the
emulator for multi-document transactions.

1. Use independent browser profiles for A and B. In A, make a disposable private
   profile/Garage vehicle/completed ride; record document IDs and A's UID. A must first
   succeed at the legitimate operation being tested, so a schema error is not mistaken
   for cross-account security.
2. In B's DevTools on the app page, import the existing initialized SDK:

   ```javascript
   const reviewService = await import(new URL('./js/firebase/firestore.js', location.href));
   const { db, sdk } = await reviewService.getFirestoreService();
   // Substitute the disposable account/document IDs recorded by the operator.
   const foreignVehicle = sdk.doc(db, 'users', 'ACCOUNT_A_UID', 'vehicles', 'VEHICLE_ID');
   await sdk.getDoc(foreignVehicle); // Must reject: permission-denied.
   await sdk.updateDoc(foreignVehicle, {
     nickname: 'Unauthorized test', updatedAt: sdk.serverTimestamp()
   }); // Must reject: permission-denied.
   ```

   Repeat separately with `deleteDoc`; do not chain calls after an expected rejection.
   UI hiding and client own-UID guards alone are not proof of server enforcement.
3. As B, attempt A profile get/update, vehicle get/query/update/delete, session
   get/query/rename/delete and route-chunk get/query/delete. All must reject with
   **permission-denied**, not merely missing-document/network/index errors. Include a
   write of an A-owned deletion fence. For profile mutation, use B's token email in
   the proposed email field so the email check does not mask the UID ownership check.
4. Repeat signed out. B must never see A's local/cloud data after logout/account switch
   on the same device either. Log out A during recording, sign in B, then return to A:
   the unfinished ride remains A's, with no ownership transfer or continued GPS watch.
5. As B, attempt adding `systemAdmin: true` to B's own valid profile, or writing
   `systemAdmins/B`, `officialActivities/test`, unknown collections and badge grants.
   All must deny. Confirm a normal own-profile language update succeeds as a control.
6. A creates an open Club; B joins as Member. B directly attempts own role `owner`,
   `admin` and `host`, forging ownerUid or count, and writing another user's membership
   or account ref. These must deny. A may assign B Host/Admin through approved controls;
   B cannot self-assign them. Legitimate founder ownership of B's own Club is allowed.
7. A assigns B visible Captain while B remains Member. B Wall/branding/rank/role writes
   must still deny. Repeat as Host; in Batch 2 Host has no manager rights. Promote B
   to Admin: branding/Wall/rank operations should succeed, but own role changes,
   Owner edits and policy/privacy/ownership changes must deny.
8. A creates a separate private invite Club. Before invitation B must be denied
   canonical Club and roster/Wall reads; B's own missing invite/request/member documents
   may be readable without granting Club access. After a valid UID invite B can read
   safe `clubPages/id` metadata (canonical remains denied) and join only by consuming the invite. Test expiration and
   revocation. Approval joining must require A's independent decision.
9. Verify nonmembers cannot read rosters/requests for others, Wall, ranks or private
   account refs. Read public/unlisted `clubPages/id`: only its exact safe fields
   may be present. `clubs/id` gets and collection queries must deny for nonmembers;
   discovery queries use `clubDirectory`, not canonical data or page listing.
10. With disposable owner-only Clubs, archive then permanently retire using the UI.
    Confirm canonical state deleted, no page/directory/founder ref, retained children
    denied to A/B/invitees, no reactivation/hard deletion/same-ID recreation. Old
    invitations must fail to read/join. Create a new Club with the same name: its
    UUID differs and no old Wall/ranks/requests/members/permissions are inherited.
    Do not physically erase the reservation in operator cleanup.
11. For complete Admin-versus-other-Admin/Host/Member management acceptance, use a
    third disposable account C. Two accounts establish basic isolation/roles but
    cannot represent Owner, acting Admin and a separate target simultaneously.
12. Record each expected/actual outcome and Firebase error code. A successful
    unauthorized operation is a release blocker. Do not weaken rules to pass tests.

## 9. Physical phones and release sign-off — NOT RUN

**BLOCKER B5 — Android Chromium and iPhone Safari over HTTPS:** verify both languages,
portrait/landscape, dialogs/keyboard/zoom/safe areas, actual GPS permission/retry,
stationary/moving/stopped/gap/refresh behavior, heading/north/manual rotation, fixed
HUD/attribution, weather/map failures, recording/history, logout while recording,
JSON/GPX share/download and unsupported Wake Lock/Fullscreen. Test installed-manifest
launch and an older installed instance after updating. Record OS/browser versions.
Test foreground/background/screen lock without promising uninterrupted tracking.

**BLOCKER — release sign-off remains pending:**

- [x] B1 fixed locally and raw metadata get/query privacy tests pass (not deployed).
- [x] B2 fixed locally and retirement/recreation/stale-invite tests pass (not deployed).
- [x] Revised rules/schema reviewed locally; all emulator regression expectations pass.
- [ ] Existing-data inventory/backfill and orphan/deleted-ID reservations verified (B6).
- [ ] Actual Console configuration/rules/locked RTDB verified (B3).
- [ ] Required indexes enabled and tested against real history (B4).
- [ ] Authorized real accounts/persistence/security and phone acceptance pass (B5).
- [ ] Warnings have a documented mitigation/acceptance for the bounded prototype.
- [ ] Explicit deployment approval records the source commit and backend revisions.

## 10. Existing-data migration and retirement operations - NOT RUN

**BLOCKER B6:** local fixes are not an automatic production migration. Existing
live Clubs have no safe page until it is backfilled; older deleted parents may
have orphaned private children and no ID reservation. Unknown production inventory
must not be treated as empty. Existing deployed clients also expect public canonical
reads and hard deletion, and are incompatible with this tightened contract.

Later, with explicit production-data/deployment approval, a trusted operator must:

1. Select `motodash-87bf8` / `(default)`, back up current rules, export relevant
   Club data using operator tooling and record the intended source revision. Do not
   expose private exports through Pages or commit them. Inventory active/archived
   parents, membership/ref counts, Wall, ranks, requests and invitations, including
   subtrees whose parent is missing and any known previously deleted IDs. A parent
   listing alone misses orphaned subcollections. Do not infer deleted IDs from names.
2. Establish a maintenance window and temporarily deny all Club canonical, page,
   directory and Club-ref client reads/writes while preserving unrelated owner-only
   profile/Garage/ride restrictions and locked RTDB. Stop incompatible clients from
   creating/editing/deleting during inventory/backfill. This temporary rule revision
   requires explicit review and approval; none is prepared/deployed by this batch.
3. Reserve every known deleted/orphaned Club ID permanently as `clubs/{id}` with
   `state: 'deleted'`. A minimal trusted operator reservation is sufficient; client
   reads/writes remain denied. Never recreate an active Club at such an ID or attach
   its old children to new members. Do not remove the reservation during cleanup.
4. Validate existing live canonical documents against the current exact contract.
   Resolve inconsistent membership counts, roles and private refs using reviewed
   operator actions; do not weaken rules or fabricate ownership. Backfill each live
   `clubPages/{id}` with exactly the 14 fields in `js/data/club-page.js`, matching
   canonical values/timestamps. Never copy canonical documents wholesale: ownerUid,
   lastMembershipUid, schemaVersion and createdAt are intentionally excluded.
5. Reconcile directory entries to public active Clubs only, preserving the minimal
   seven-field allowlist. Remove safe pages/directory for retired reservations and
   stale account refs; retained private children may remain inaccessible. Validate
   every resulting page/map, count and reservation. If the verified inventory is
   empty, record that evidence and skip unnecessary writes.
6. Review and publish this batch's final `firestore.rules` (section 4 fingerprint),
   retain locked `database.rules.json`, verify indexes and test from the compatible
   local frontend before public rollout. Revised read rules deny malformed pages;
   a failed backfill produces a visible error rather than leaking private fields.
   Follow sections 6-9 for approved frontend publication and actual acceptance.
7. Record migrated/reserved IDs and acceptance outcomes in operator-controlled
   private records. Never roll back to rules allowing public canonical reads or
   hard deletion merely to restore compatibility with an old tab.

**WARNING - physical erasure and retained-data operations:** the Spark prototype
adds no Cloud Function or trusted server. Retirement requires no new paid service:
it is one bounded client transaction with immediate denied access. It preserves
private data and consumes storage; it does not promise erasure or a retention period.
Future trusted erasure must remove children/account refs as appropriate while leaving
the retired canonical reservation forever. No insecure client recursive deletion
is implemented. Administrators/IAM bypass rules and can break the invariant if they
erase or reactivate the reservation. Review that operator workflow separately.

**INFORMATION - historical exposure:** the fix cannot retract UID/Wall/invitation
data previously returned under the old rules. Previously deleted IDs must be
inventoried/reserved before opening access; future lifecycle tests prove the invariant
after adoption, not the absence of every orphan in production. B6 remains a release
blocker until a trusted operator confirms the inventory and migration.

**STOP. Security fixes complete locally; no further implementation, push, deployment or production-data action is authorized by this document.**

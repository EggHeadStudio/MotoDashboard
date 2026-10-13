# MotoDashboard — Batch 6A result

> Subsequent operator report: Batch 6A is deployed and working. The record below
> preserves its original local completion/test evidence. Current Batch 6B source
> and publication steps are in BATCH_6B_RESULT.md and DEPLOYMENT_CHECKLIST.md.

Date: **2026-10-13**. Frontend version: **1.3.0-batch6a**.

Batch 6A is local implementation and verification. The operator reports Batch 5,
Firebase Rules/all 18 Enabled indexes and the Worker deployed and manually tested.
These new changes have **not** been pushed or deployed. No production data or
credentials were accessed or changed. Batch 6B has not begun.

## Dashboard root cause and corrections

The reproduced vertical rectangle was **`.live-rider-label` inside Leaflet's
`.live-rider-tooltip`**, not the recording statistics grid. The absolute tooltip
used automatic shrink-to-fit width. Its child had only `max-width:170px` and
`overflow-wrap:anywhere`, allowing intrinsic width to collapse to a character.
At 320px, the real Leaflet browser fixture measured **26px wide × 984px tall**,
with rider name, vehicle/category, Club/rank, status and last-location numbers.
That content explains its resemblance to ride statistics underneath the speedometer.
The actual statistics panel measured **296px × 67px** in that portrait fixture.

- Give the label an explicit 170px width, viewport bound and normal word wrapping.
  Bound each identity line with ellipsis; the complete permitted text remains in
  the label's title and DOM for accessible detail. Preserve marker, label and rotation.
- Replace automatic HUD placement with named grid areas. The empty spacer previously
  occupied the landscape right column, moving the bottom panel and controls onto
  extra rows below the viewport. Use flexible columns and scrollable bounded panels.
- Compact short portrait panels, safe-area padding and reachable bottom controls.
  Move the dashboard language selector into the controls flex layout; its former
  fixed bottom-left position overlapped action buttons in the narrow visual fixture.
- Move `#live-dashboard` into `#status-stack`; connected text is **Live · sharing** /
  **Live · jaetaan**, with colored dot, full accessible label/title and click-through.
  The collapsed GPS/network tab retains a live indicator. No permanent large toast.
- Show connecting/failure status on the requested live dashboard before GPS admission;
  GPS still starts only after authorization. Existing personal-recording controls
  continue to own their visibility.
- The notification bell retains its SVG/badge when language changes. Its text binding
  initially replaced those children during testing; that defect was corrected.
  Header wrapping now also supports 320px and 200% text.

Chromium checks cover 320/390px portrait, 844px landscape and 1280px desktop with
real Leaflet. Native Safari/WebKit was **not run**: this Windows tool cache contains
Chromium only. Physical iPhone Safari acceptance is required; this is a shared
layout correction, not a Safari workaround.

## Firebase network investigation and recovery

The reported Wi-Fi/cellular production failure has **not been reproduced**. No
claim is made that Wi-Fi was its cause or that production MD-NETWORK is resolved.
Cloudflare can continue working while an independent Firestore read fails.

Review found one cached named Firebase app, separate lazy Firestore initialization,
default memory cache, account guards and scoped legacy service-worker unregister.
No RTDB initialization, second GPS watcher, unconditional second socket or duplicate
Firebase app was introduced. Home concurrently hydrated Groups and Clubs, each
with multiple reads per row; a failed unrelated read could produce a generic Home
message. The original 12s deadline also classified every timeout as `unavailable`.

Corrections:

1. Whitelist operation labels: Group load/list/invite/approve/state/edit/admission,
   identity search/load, Lobby, Club discovery/management, Garage and private rides.
   Inline feedback adds safe codes such as **MD-NETWORK/GROUP-INVITE**. No raw error
   messages, document paths, UID, email, token, invitation secret or coordinate is logged.
2. Distinguish browser-reported offline, deadline exceeded, network unavailable,
   permission denied and precondition/index failures. Browser `onLine` is a hint,
   not evidence that Firestore is reachable. Failed-precondition is not asserted to
   be an index fault without its actual provider evidence.
3. Retry an explicitly failed read once after 300ms, with account checks. Never
   replay a timed-out/uncertain write. The 12s UI deadline does not cancel an SDK
   operation; refresh the authoritative result before manually retrying a write.
4. Bound Group/Club row hydration to four concurrent rows per list; preserve order,
   partial results, query limits and account ownership. Home failed loads can recover
   on the online event or explicit Refresh. This reduces concurrency, not total N+1 reads.
5. Deduplicate identical transient toast messages for eight seconds. Background Home
   failures stay on Home; Group-watch diagnostics use the compact network status area.
6. Provide a maximum 20-entry **in-memory safe diagnostic history**, containing only
   code and time, via `getDataDiagnostics()`. Nothing is persisted or sent remotely.

The SDK already auto-detects long polling by default. No unproven forced-polling,
cache persistence, browser-specific transport or security relaxation was added.
See [Firebase transport settings](https://firebase.google.com/docs/reference/js/firestore.firestoresettings).
The exact operator reproduction procedure is in DEPLOYMENT_CHECKLIST.md below.

## Open activity category

`ACTIVITY_CATEGORIES` extends the 12 real Garage categories with **open**. Clubs,
Groups, Lobby filters and discovery use it. EN/FI labels are **Open / Any vehicle**
and **Avoin / Kaikki ajoneuvot**. Garage continues using `CATEGORIES`; Rules reject
an Open vehicle and private ride snapshots retain their real vehicle categories.
Open Groups accept permitted own-Garage snapshots of different categories; they
do not bypass membership, approval/invitation, bans or capacity. Existing categories
and documents remain valid. Query shapes and all 18 composites remain unchanged.

## Group lifecycle and expiration

- Existing scheduled → active/cancelled and active → completed/cancelled transitions
  remain organizer-controlled. Terminal records cannot restart or be recreated.
- Back from an authorized Host's live-only dashboard offers Home without ending,
  or End for everyone, plus cancellation. Home stops local sharing and leaves the
  Group running. Ending uses the secured repository; ordinary participants receive
  no global-end permission. During a failed authority lookup, Home remains available
  and ending is not guessed. Independent personal recording is preserved.
- A shared, account-scoped `groupPages` listener serves an open Group and its live
  consumer. It detaches on close/account change/stop and clears denied live data.
  Terminal state disables consent; server frames/leases independently close receivers
  and clear private markers. Closed Home summaries still refresh on demand.
- **Deadline = earlier of endsAt, if set, and startsAt + 24h.** Start is allowed at
  most **2h early**. Thus an early-started Group can run at most 26h from activation.
  Active startsAt/endsAt cannot be extended. Scheduled rescheduling is allowed only
  before its existing deadline; an expired identity cannot be revived by changing times.
- Firestore Rules enforce server time for activation/admission/status/invitations/
  approvals. Worker authority enforces the same deadline and clamps each socket's
  lease to it. Existing Durable Object alarms recheck/end sockets; expired tickets
  and reconnect attempts fail. Rules/Worker enforcement does not depend on browser timers.
- An expired active Group displays completed; an expired scheduled Group displays
  cancelled. Browser timers update presentation only. **No trusted Firestore writer
  was added:** the stored state can remain active/scheduled after expiry, while all
  live/admission rights are denied. An organizer may persist a terminal state.
- Terminal Groups/projections/participants/requests/invitations are retained for
  historical context; there is no automatic purge or complete account erasure.
  Lobby rendering filters expired rows, but retained stale rows can consume a query
  page until an organizer terminalizes them. Pagination remains bounded and available.

This uses the existing SQLite DO/alarm infrastructure and read-only Firestore
credential. No new paid service, cron deployment, write IAM grant, recursive deletion,
DO namespace or migration is required. [Cloudflare alarm API](https://developers.cloudflare.com/durable-objects/api/alarms/).

Group listeners are shared, disposed safely across account changes, and restart on
manual reopening/online after a terminal SDK listener error.

The extra lifecycle checks initially exceeded Firestore's expression budget for
an existing Club Admin edit. Group role checks were factored to avoid repeatedly
evaluating availability/roles, preserving canonical Owner, technical Admin and
creator-Host permissions. All original positive/negative role tests pass.

## Notification center and security boundary

Implemented: header bell, bounded unread count, mobile native sheet, EN/FI,
timestamps, unread styling, mark as read, target navigation, empty state, logged-out
Auth return and account isolation. No push notifications or high-frequency polling.

Private path: **users/{recipientUid}/notifications/{notificationId}**.
Exact fields: **type, sourceId, actorUid, createdAt, readAt**.

| Type | Source proof / notification ID |
| --- | --- |
| group-invite | Authorized addressed invite created in the same transaction; invitedBy and createdAt match requester/server time; gi-{inviteToken} |
| group-approved | Real pending → approved request in the same transaction; decidedBy/time match; ga-{groupId} |
| club-approved | Real pending → approved Club request plus actual approved membership; ca-{clubId} |

Rules permit intended-user reads/readAt marking/deletion. Content creation or reset
requires the actual authorized source transition in the same atomic operation.
Arbitrary text, asserted sender, other recipient, stale replay and unknown types deny.
The invitation token appears only in the intended recipient's private notification
document ID; it never appears in public projections or diagnostic logs.

Approval IDs are deterministic per recipient/source. A later legitimate reapproval
refreshes that record through the same source-proof rule. Existing historical
invitations/approvals are not backfilled. An old invitation notification does not
grant admission after revocation, expiry or a terminal Group.

Two account-scoped listeners: latest 30 ordered by createdAt; unread readAt==null
limited to 50, displayed **50+** when capped. Older unread records therefore do not
disappear from the badge merely because they leave the latest page. Both listeners
detach/clear on logout; failed listeners restart on reopening/online. Read volume
and retention still need production measurement. Automatic collection single-field
indexes suffice; there is no new composite or document field exemption.

**Deferred, explicitly fail-closed:** relevant Club event announcement fan-out and
Group update/cancellation notification fan-out. These remain agreed requirements.
The current Worker cannot write notifications, and large client fan-out is not
atomic/safely reliable within Rules read/batch limits. Implement later with an
approved trusted delivery identity, event proofs, recipient privacy, deduplication,
rate/retention policy and cost review. Group state changes still reach active
watchers/live clients now; no insecure broadcast collection was substituted.

## Deployment and verification

See **DEPLOYMENT_CHECKLIST.md — Batch 6A publication and acceptance** for exact
browser-only Firebase/Worker procedures and the two-phone test matrix.

Required publication sources:

- Frontend: current main commit through existing `.github/workflows/deploy.yml`.
- Rules: **firestore.rules**, via manual **deploy-firebase.yml**; its validation gate
  now includes **tests/run_batch6a_rules.py**. Config remains **firebase.deploy.json**.
- Indexes: **firestore.indexes.json**, unchanged **18** composites + routeChunks.pointsJson
  exemption. Keep notifications.createdAt/readAt automatic collection indexes enabled.
- Worker: **cloudflare/src/firestoreAuthz.js** and **LiveRoom.js**, via existing manual
  **deploy-cloudflare.yml**, using unchanged **cloudflare/wrangler.jsonc**.
- RTDB: keep **database.rules.json** deny-all. Do not deploy/enable live RTDB.

Existing Secrets/settings are reused; no new secret or IAM permission is needed.
Firebase deployer and Cloudflare read-only authority reader remain separate.
New features fail closed during a mixed frontend/Rules deployment; the old Worker
does not enforce the new deadline until explicitly updated.

## Test results

Final results are completed before the documentation commit. Distinct suite counts
exclude repeated baseline runs and nested cases. Emulator/workerd/browser fixtures
are local evidence, not production Firebase or physical-phone tests.

| Check | Result |
| --- | --- |
| Firestore | **705 passed, 0 failed/skipped**: 102 baseline + 137 security + 273 Group + 32 identity + 82 Batch 5 + 79 Batch 6A |
| Cloudflare | Dry-run build + **50 passed, 0 failed/skipped**, including **13 workerd** cases; expiry alarm tested against actual local DO runtime |
| Browser | **24 legacy PASS groups + 20 Batch 5 + 13 Batch 6A named cases**; 0 failed/skipped in the complete final run; mocked transports, real Leaflet and real SDK imports with cloud APIs blocked |
| RTDB | **68 passed, 0 failed/skipped**, deny-all demo only |
| Pages | **2 PASS groups**, **247 references / 74 unique URLs HTTP 200** beneath /MotoDashboard/; unavailable-Firebase guest GPS/history preserved |
| Deployment | **10 contract cases**, exact 18 composites/exemption, **3 YAML / 15 Bash blocks**, manual backend/project/scope/security-gate and existing DO migration checks |
| Source | Native ES-module linking, EN/FI parity, import paths, git diff whitespace checks; no private key or new runtime package |

Early development runs exposed the label, landscape layout, bell translation,
header overflow and Rules-expression limit issues described above. An initial
new test used the wrong exact sign-in label and was corrected to the existing
“Sign in / register” text. Some early full-browser attempts timed out during reload/account switching.
Their origin is unconfirmed; targeted suites and the final complete run passed.
Retain this as test-stability debt, not evidence of the reported production
MD-NETWORK cause. Partial attempts were not counted as complete passes.

## Changed files and local commits

52 files changed from the pre-batch main baseline. Existing Pages workflow,
Firebase config/index JSON, RTDB Rules and Wrangler config are preserved.

```text
.github/workflows/deploy-firebase.yml
BATCH_6A_RESULT.md
CLOUDFLARE_SETUP.md
DATA_MODEL.md
DEPLOYMENT_CHECKLIST.md
FIREBASE_DEPLOYMENT.md
IDEA.md
IMPLEMENTATION_STATUS.md
LIVE_TRACKING.md
README.md
cloudflare/src/LiveRoom.js
cloudflare/src/firestoreAuthz.js
cloudflare/tests/authz.test.js
cloudflare/tests/firestore-rest.test.js
cloudflare/tests/runtime.test.js
css/dashboard.css
css/design-system.css
firestore.rules
index.html
js/app.js
js/club-ui.js
js/config.js
js/data/group-lifecycle.js
js/data/group-session.js
js/data/schema.js
js/firebase/access.js
js/firebase/clubRepository.js
js/firebase/displayProfiles.js
js/firebase/garageRepository.js
js/firebase/groupRepository.js
js/firebase/groupWatch.js
js/firebase/lobbyRepository.js
js/firebase/notificationRepository.js
js/firebase/sessionRepository.js
js/group-ui.js
js/i18n/product.js
js/live/live-map.js
js/live/live-ui.js
js/lobby-ui.js
js/ui/forms.js
js/ui/host-return.js
js/ui/icons.js
js/ui/navigation.js
js/ui/notifications.js
js/ui/shell.js
js/ui/toast.js
tests/RULES_TESTING.md
tests/batch6a_browser.py
tests/firebase_mocks.py
tests/live_browser.py
tests/run_batch6a_rules.py
tests/run_browser.py
```

Local milestones: **c48301e** dashboard root fix; **673137f** safe request diagnostics;
**ceab063** Open/lifecycle/source-verified notifications and security/browser coverage.
A final documentation commit records this result. No commit was pushed.

## Remaining acceptance and limitations

1. **Production MD-NETWORK remains unconfirmed.** Capture operation code/time and
   controlled network comparison; do not blame Wi-Fi or two devices on one network.
2. **New Rules and Worker are not deployed.** Do not treat the deployed Batch 5
   rules/Worker as implementing these source changes.
3. **iPhone Safari/Android real GPS acceptance is not completed by local tests.**
   Device keyboard/safe-area/rotation, network recovery and real alarms require acceptance.
4. Two notification broadcast requirements remain deferred; no push or backfill.
5. Expiration revokes rights but does not physically update/purge every retained
   Firestore state. Complete account deletion remains future trusted work.
6. Existing token-revocation window, quotas/abuse limits, background suspension,
   multi-tab recording and provider/commercial limitations remain.

Stop after this batch. No automatic push/deploy or Batch 6B implementation.

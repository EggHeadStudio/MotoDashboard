# MotoDashboard — Batch 4 result

All milestones **0–10 completed locally**. No push, Cloudflare deployment,
Firebase Rules deployment or production-data operation was performed. Stop after
this batch; implementation or publication beyond it requires explicit approval.

## Architecture and audit outcome

GitHub Pages serves native HTML/CSS/ES modules. Firebase Auth/Firestore retains
the dedicated **motodash-87bf8** identity and permanent private/product records.
A separate trusted Cloudflare Worker authenticates Firebase JWTs and reads actual
admission from Firestore using server-only read-only IAM. One SQLite-backed,
hibernatable Durable Object per Group Session transports latest-only WebSocket
state. RTDB stays locked and unused. The frontend still has no npm/build step.

The audit reused existing auth-state, profile/display projection, UUID Group
parents/participants/bans, Club retirement/technical-role rules, Garage vehicle
snapshots, dictionary, Group extension hook, accepted position pipeline and
Leaflet instance. The large app.js closure remains; four separate live modules
limit the added coupling. Existing weather, heading/north-up/themes, HUD, route
recording, private history/chunks/outbox, Garage, Clubs/Wall/ranks, Lobby/QR and
language persistence remain covered by the full browser/emulator suite.

The RTDB coordinator blocker from Batch 3 is superseded by implemented trusted
Firestore checks, not a frontend ACL workaround. Historical Batch 3 evidence is
retained. No cloud high-frequency trajectory, Cloud Function, additional watcher,
new service worker or commercial/redesign feature is introduced.

## Milestones

| Milestone | Result |
| --- | --- |
| M0 audit/plan | Current live architecture and ordered plan adapted; historical requirements retained. |
| M1 identity | Trimmed Unicode 3–30 names required before registration; owner edit/reload and legacy correction; no email/UID fallback; confirmation preserved. |
| M2 backend foundation | Separate JavaScript package/lock, official Wrangler/Miniflare/workerd, SQLite migration and LIVE_ROOMS binding. |
| M3 authentication | Fixed trusted Google certificate endpoint, RS256 signature/issuer/audience/time checks, pinned project and one-use 30s bound ticket. |
| M4 authorization | Consistent Firestore parent/children/Club readTime, actual participant/no ban/current lifecycle, read-only OAuth IAM, deadline/outage denial. |
| M5 rooms | Isolated serialized hibernatable room, bounded payload/rates/riders/tickets, duplicate replacement/reconnect, leases/periodic revocation and snapshot privacy. |
| M6 protocol | Exact versioned compact JSON, ~5s moving/30s stationary, identical-coordinate suppression, heartbeat freshness without route backlog, byte/cost model. |
| M7 frontend | Explicit consent and backend admission before sharing; existing GPS watcher/map, safe vehicle/rank labels, cleanup on Back/leave/logout/access loss/end. |
| M8 status/regroup | Four trusted informational statuses, fresh/stale/no-fix/disconnected counts, localized last-update time/age and fresh straight-line separation. |
| M9 cleanup | Only unused frontend RTDB adapter removed, no RTDB initializer/import, deny-all tests retained; Pages uploads frontend allowlist. |
| M10 final checks/docs | Full regression, Unicode server compatibility correction, periodic silent revocation/ticket expiry, setup/rollback/budget/acceptance documentation. |

## Security and privacy boundaries

POST ID token only in Authorization, never URL/log/localStorage. Socket connects
without a URL token and sends the one-use random ticket as its first frame. Hash,
UID, Origin, session and expiry are kept briefly in the room; admission is checked
again on redemption. Pending sockets receive no private data. Client roles, names
or status claims cannot grant access. Cryptographic verification uses a fixed
project/issuer/audience and trusted key URL, not a JWT decode shortcut.

Trusted reader cannot write data. Current code reads only Group/participants/bans,
optional organizing Club and displayProfiles. IAM bypasses client rules; even a
minimal get-only credential can read other known private paths if compromised,
so the operator must protect it. Custom ranks are visible identity, not authority.
Active Group participation is mandatory; a host role alone is insufficient.

Thirty-second leases expire fail-closed; alarm timing cannot make expired receivers
eligible. All removed sockets are pruned before private broadcasts from a check.
Revocation is bounded polling, not instant notification. Signed Firebase ID tokens
are not checked against account disable/revocation and can remain valid until expiry
(<=1h). The browser clears consent on account switch/logout. A future immediate
Auth revocation mechanism is not claimed implemented.

Latest coordinates are in bounded socket attachments, surviving hibernation;
durable application SQLite stores room ID and temporary ticket hashes only. No
history arrays or raw ID tokens. Markers become stale after 45s and expire at
120s; disconnect/removal clears them. Heartbeats without fresh GPS cannot extend
location freshness. Snapshot age uses serverTime so phone display clock skew
cannot make a stale marker current. Fresh publishing still requires a reasonable
sample clock. Separation is approximate, excludes stale locations, and makes no
road/order/speed/emergency promise. No background GPS guarantee.

## Final local evidence

| Suite | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Original Firestore emulator | 102 | 0 | 0 |
| Additional security emulator | 137 | 0 | 0 |
| Group/Lobby emulator | 273 | 0 | 0 |
| Identity/name emulator | 32 | 0 | 0 |
| RTDB locked foundation | 68 | 0 | 0 |
| Worker Node/workerd | 47 | 0 | 0 |
| Full browser | 24 groups | 0 | 0 |
| Pages paths/fallback | 2 groups | 0 | 0 |

**612 distinct emulator assertions**; repeated original assertions inside security/
Group runners counted once. Worker suite includes **12 real local Miniflare/workerd
integration cases** with ephemeral signed RSA Firebase fixtures and mocked
Google/Firestore/OAuth responses. Root npm test discovers the same 47 cases and
is not extra distinct coverage. Worker test script first builds a fresh dry-run
bundle. Production dependency audit reported zero known vulnerabilities at run time.

Worker coverage: valid/invalid/expired/wrong-project JWTs, malformed claims/signature,
outsider/removed/banned/terminal session/retired Club, Origin and one-use bindings,
ticket replay/expiry, room isolation, simultaneous riders, duplicate replacement,
reconnect snapshot, binary/oversized/extra-field/rate/coordinate/cadence/jump bounds,
stale snapshot exclusion, session completion and **silent alarm-based revocation**
without a client revalidate request. Expired leases also guard outgoing frames.

Browser uses SDK/HTTP/socket fixtures; it does not enforce production Firebase
rules. Includes 17 password confirmation cases, 36 existing domain assertions,
Unicode/trim/emoji boundaries, profile save/reload, missing legacy-name correction,
all existing Garage/Club/Group/Lobby/QR flows, live consent/clean token transport,
safe Leaflet labels, marker age, rate/clock-skew/scope/late-response checks and
one watcher shared with personal recording. Actual pinned Firebase 13.0.0 browser
imports/single app are separately verified with cloud APIs blocked.

Pages runner: **182 literal references / 62 unique local URLs HTTP 200** under
/MotoDashboard/, no root-relative assets/broken imports, scoped legacy worker
cleanup and Firebase-unavailable guest recording/history. Artifact publishing
uses `_site` containing only explicitly allowed frontend files/directories.

New boundary tests initially exposed a real positive-case failure: 30 emoji were
denied by string-size validation. RE2 character quantifiers now align server bounds
with frontend Unicode code points; 30 allowed, 2/31 denied. Canonical trim checks
also reject padded direct writes while allowing unchanged legacy language updates.
No permission assertion was weakened. A Finnish sentence encoding defect was
corrected. These interim failures are not hidden; the final suites passed.

Not tested: deployed Worker/real Firebase IAM/rules/inventory/indexes, real phones/
cameras, runtime eviction/rehydration in production, mobile background suspension,
actual production CPU/heap/latency/quotas. These are pending acceptance gates, not
skipped runnable test cases or claimed production successes.

## Files created and removed

Created:

- `CLOUDFLARE_SETUP.md`, `BATCH_4_RESULT.md`, root `.gitignore`, `live-config.js`.
- `js/data/identity.js`; `js/live/live-client.js`, `live-map.js`, `live-summary.js`, `live-ui.js`.
- `tests/identity_browser.py`, `tests/live_browser.py`, `tests/live-client-tests.js`.
- `cloudflare/.gitignore`, `README.md`, `PROTOCOL.md`, `package.json`, `package-lock.json`, `wrangler.jsonc`.
- `cloudflare/src/index.js`, `auth.js`, `firestoreAuthz.js`, `tickets.js`, `LiveRoom.js`, `protocol.js`.
- `cloudflare/tests/foundation.test.js`, `auth.test.js`, `authz.test.js`, `firestore-rest.test.js`, `protocol.test.js`, `runtime.test.js`.
- `cloudflare/tools/estimate-cost.js`.

Removed: **js/firebase/realtime.js** only. It had no application importer; the
initializer-only browser check is replaced with explicit no-RTDB guards. Locked
RTDB emulator tests and database.rules.json remain; no database was deleted.

Modified: existing app/auth/profile/config/Group UI integration, index.html,
dashboard.css, dictionary, firestore.rules name bounds, browser/identity runners,
Pages workflow and IDEA/LIVE_TRACKING/DATA_MODEL/IMPLEMENTATION_STATUS/
DEPLOYMENT_CHECKLIST/README/tests documentation. Full exact list is available via
`git diff --name-status 7487b43..HEAD`. node_modules/dist/local state and temporary
fixture keys are ignored, not included in Git or Pages.

## Separate commits

| SHA | Purpose |
| --- | --- |
| 8257f79 | M0 Cloudflare architecture/plan |
| 8191b19 | M1 safe display names/owner editing |
| e4fefdb | M2 Worker/SQLite room foundation |
| 3e25fb3 | M3 verified tokens/bound tickets |
| 6e500c4 | M4 trusted read-only Firestore admission |
| 8744181 | M5 isolated live rooms/revocation |
| 1c1e667 | M6 compact protocol/cadence |
| 7a90585 | M7 consent/GPS/Leaflet integration |
| b243d32 | M8 statuses/presence/separation |
| 9f62e57 | M9 unused RTDB cleanup/coverage |
| 807407a | M10 Unicode/periodic security regressions and reproducible costs |
| 0eb4735 | M10 localized marker timestamps and clock-skew regression |

The final documentation commit follows; its exact SHA is reported in the final
response and `git log --oneline 7487b43..HEAD`.

No commit was pushed. The starting checkout was clean at 7487b43.

## Cost model and deployment blockers

Full reproducible assumptions/bytes/requests/duration/memory/bandwidth are in
CLOUDFLARE_SETUP.md step 13; run `node cloudflare/tools/estimate-cost.js`.
Ten live hours per active user/month, average ten-rider rooms, all-moving 5s cadence:

| Active users/month | Cloudflare Paid estimate/month USD | Authority reads/month |
| --- | ---: | ---: |
| 100 | $5 | 562,000 |
| 1,000 | $5–$17.50 | 5,620,000 |
| 10,000 | $6.20–$68.70 | 56,200,000 |

Cloudflare-only range depends on eligible idle/hibernation time; upper assumes
full active-room duration and current overage rounding. No production duration/
CPU measurement. Firebase charges, tax, extra account workloads, abuse/reconnects
are extra. Free may work for a small trial, but limits are daily and can fail.
Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
and [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

**BLOCKER** — no verified Cloudflare account/actual endpoint/binding/secret/reader
IAM or live acceptance. **BLOCKER** — actual Firebase rules/indexes/domains and
legacy inventory still unverified. **BLOCKER at modeled 1,000+ scale on Spark** —
authority reads alone exceed free 50k/day. Operator must make a billing/capacity
decision; 100 users still need peak-day headroom. No automatic upgrade occurs.
**WARNING** — polling/token-expiry revocation limits, privileged reader read reach,
no account-wide HTTP abuse cap, full account erasure pending and background GPS
limitations. Do not declare release ready from these local results.

Exact user actions: CLOUDFLARE_SETUP.md steps 1–14 cover account/MFA/plan, Node and
Wrangler, binding/migration, fixed Firebase project, get-only custom reader role,
protected server secret, local mock testing, approved deployment, exact Origins,
actual live-config.js HTTPS origin, GitHub Actions publication, two-phone security
acceptance, billing monitoring and safe rollback. Auth authorized domains are
eggheadstudio.github.io and localhost; Worker Origin is https://eggheadstudio.github.io.
Production configuration is deliberately not fabricated. All live-test boxes
remain unchecked. STOP after Batch 4 and await explicit approval.

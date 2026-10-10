# Cloudflare setup for MotoDashboard Batch 4

Status: implemented and tested locally; **not deployed or release approved**.
Every account, billing, IAM, key, deployment, frontend publication and live-test
step below requires the **user/operator**. No account ID, deployment ID or Worker
URL has been supplied. `live-config.js` deliberately has an empty endpoint.

The frontend remains static GitHub Pages native ESM. Only `cloudflare/` uses npm
and a server bundle. Firebase **motodash-87bf8** Auth/Firestore remains permanent
identity/data/authorization; RTDB remains locked. Read DEPLOYMENT_CHECKLIST.md
before any publication. These instructions describe future actions, not actions
performed in Batch 4.

## 1. Create and secure your Cloudflare account

Open [Cloudflare dashboard](https://dash.cloudflare.com/), sign up or sign in,
verify your email and enable MFA. Select your actual account under Workers &
Pages. A purchased domain is not required for a workers.dev deployment. Do not
enable automatic repository deployment; this batch has no production CI secrets.

## 2. Select a Workers plan and a budget

SQLite Durable Objects work on Workers Free and Paid. Free is suitable only for
an intentionally small trial; daily quota exhaustion fails requests. For the
model below, choose Workers Paid only after approving its minimum monthly charge
and overage budget. A website plan is separate from a Workers plan. Other workers
in your account share allowances. Review the current pricing links below before
buying; this document is an estimate, not a billing guarantee.

## 3. Prepare the existing Worker project

Install Node 22+ and npm, and Git for Windows (the tests use its OpenSSL for
ephemeral signed fixtures). In PowerShell from the repository root:

```powershell
Set-Location cloudflare
npm.cmd ci
npm.cmd test
npm.cmd run check
```

Stop on a nonzero command result. `test` also regenerates the bundle before
running Node and actual local Miniflare/workerd tests. `check` is only a dry run;
it does not publish. The frontend requires neither npm nor a build.

## 4. Review the Durable Object migration

Open `cloudflare/wrangler.jsonc`. Keep `LiveRoom` exported from `src/index.js` and
the `v1` migration containing `new_sqlite_classes: ["LiveRoom"]`. Wrangler creates
the SQLite namespace during the first approved deployment. Do not create a second
unrelated namespace or remove/reuse migration tags. Future schema migrations need
their own new tag and rollback review. No SQL GPS table is created.

## 5. Review the binding and account selection

Keep binding name `LIVE_ROOMS`, class `LiveRoom`, Worker name `motodash-live`.
The entry module uses this binding, with `idFromName(sessionId)`, to isolate rooms.
No namespace ID is invented or manually pasted. Later, run:

```powershell
npx.cmd wrangler login
npx.cmd wrangler whoami
```

Confirm the actual account before publishing. If multiple accounts exist, choose
your intended account explicitly in Wrangler using the actual dashboard value;
do not copy another project's account. No login was performed by the agent.

## 6. Verify Firebase and permanent rules first

In Firebase Console select **motodash-87bf8**, default Firestore database and the
web app matching `firebase-config.js`. Enable Email/Password; verify authorized
domains **eggheadstudio.github.io** and **localhost** (domain only, no path).
Verify all public web config fields against Console. `databaseURL` is historical
and optional to Auth/Firestore; it is never used by the frontend.

Follow the existing read-only production inventory gate B6. If verified free of
legacy Club records/orphans, record migration N/A; do not infer emptiness from the
user report. Record/export the current deployed rules before future approved
publication. Exact sources: root **firestore.rules**, **database.rules.json**,
**firestore.indexes.json**. Keep database.rules.json deny-all. Verify all **17**
composite indexes (one private-history, sixteen Lobby combinations) and the route
chunk single-field exemption. No Cloudflare live index or Firestore GPS collection
is needed. These rules include Batch 4's normalized name checks. Publishing is
an operator action, not part of this batch.

Keep `FIREBASE_PROJECT_ID: "motodash-87bf8"` in Wrangler. Code also pins that
project; changing a variable alone cannot authorize another Firebase project.

## 7. Create the least-privilege reader and protect the secret

In Google Cloud Console, select the same project. Verify Firestore API enabled.
IAM & Admin → Roles → Create role: give it only **datastore.entities.get**.
Then IAM & Admin → Service Accounts → Create a dedicated live authorization
reader; assign no broad default role. In IAM grant that account the custom
read-only role. This application uses document batchGet, not queries or writes;
the [official method permission table](https://docs.cloud.google.com/firestore/native/docs/security/iam)
specifies that permission. Verify the actual deployed IAM permissions with the
operator's live test. Do not add Editor, Owner, Firebase Admin, Datastore User,
create/update/delete permissions or impersonation/token-creator grants.

Only if custom roles are unavailable, review `roles/datastore.viewer` as a broader
**read-only** alternative with the operator; it includes unnecessary list and
metadata access. IAM access bypasses Firestore client rules. Even the minimal
reader can read other known document paths within its granted database/project;
Firestore IAM is not a per-collection privacy boundary. Current code only reads
the Group parent, its participants/bans, organizing Club and displayProfiles.
It never reads private profiles, Garage or ride history. A compromised reader
credential would still have greater read reach; restrict operators and rotate
keys. No service account with write privileges is appropriate.

Service account → Keys → Add key → JSON. If organizational policy forbids keys,
**stop deployment** and arrange an approved keyless credential mechanism in a
later batch; do not relax IAM. Store the downloaded file outside this repository
in protected storage. Never put it in firebase-config.js, live-config.js, browser
code, Git, a ticket, a URL, an issue, or a terminal command literal. Required
secret JSON fields are `project_id`, `client_email`, `private_key`.

After step 9 creates the fail-closed Worker, enter the path interactively and pipe
the file to Wrangler's encrypted secret store:

```powershell
$readerKeyPath = Read-Host 'Absolute path to the protected reader JSON file'
Get-Content -LiteralPath $readerKeyPath -Raw | npx.cmd wrangler secret put FIRESTORE_SERVICE_ACCOUNT
```

Do not print the file or record terminal input. Secret upload creates a new
Worker version; verify the account/name first. Never enable payload/header logs.
Current observability and Wrangler metrics are off. Hashes of one-use tickets
are stored temporarily; raw Firebase tokens are not stored/logged by code.

## 8. Run Wrangler locally without production data

```powershell
npm.cmd run dev -- --var ALLOWED_ORIGINS:http://localhost:8000
```

This uses local DO storage. `/health` returns the service/version; without the
secret a ticket returns 503. That is expected fail-closed behavior, not an
authorization bypass to fix. `npm.cmd test` exercises working admission using
generated signed identities and mocked Google/Firestore responses, without any
production key or network call. Use those tests for local development.

For an approved local frontend inspection, serve the repository's parent from
another terminal at the repository root:

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory ..
```

Open `http://localhost:8000/MotoDashboard/`. A local endpoint is allowed only for
localhost/127.0.0.1. Do not publish a localhost endpoint. A manually configured
real Firebase login in this browser is a **real** project operation; it is not
covered by the mocks. `.dev.vars` is ignored, but production keys should not be
copied there merely to run tests. Stop local servers with Ctrl+C.

## 9. Deploy only after approval

After recording the account, rules/index/inventory evidence, IAM and budget:

```powershell
npm.cmd run check
npx.cmd wrangler deploy
```

The first deployment without a secret safely denies tickets. Then perform the
secure secret upload in step 7. Record the actual Worker URL, version, migration
and timestamp printed by Wrangler. Open that actual URL plus `/health`. A healthy
response proves only routing, not correct Firebase access. Test a valid admitted
account before enabling the frontend. No such deployment was run in Batch 4.

## 10. Configure exact allowed origins

Production `ALLOWED_ORIGINS` is **https://eggheadstudio.github.io**. An origin has
no `/MotoDashboard/` path. Keep exact comma-separated origins, no wildcard, null
origin or credentials. A different authorized hosting origin requires its actual
value and review. Remove localhost from production. Apply a reviewed variable
change by another explicit deployment. CORS and Origin checks protect browser
connections; they do not replace identity/Firestore authorization and are not
protection against a nonbrowser client forging an Origin.

## 11. Set the frontend endpoint and publish the static artifact

In root `live-config.js`, replace the empty `endpoint` string with the **actual
HTTPS origin** from step 9, without path/query/fragment/credentials. The client
derives the WSS `/v1/sessions/{id}/connect` URL. Never paste a token. Until this
setting is supplied, live sharing shows a localized setup message and makes no
live requests; guest and personal GPS/recording still work.

Review the change, commit it separately, and push **only after explicit approval**.
GitHub repository Settings → Pages → Source: **GitHub Actions**. The existing
`.github/workflows/deploy.yml` copies an explicit frontend allowlist to `_site`;
do not publish repository root or add cloudflare/, node_modules, tests or secrets.
An approved push to main runs that workflow; alternatively dispatch it manually.
Inspect its artifact and deployment result, then open
`https://eggheadstudio.github.io/MotoDashboard/`. Asset and import paths are
relative. No new service worker is installed; the scoped legacy cleanup stays.

## 12. Two-account and two-phone acceptance — all pending

Record device/browser, user labels, deployed versions, time and observed result;
do not store raw tokens, invite secrets or coordinates in an issue. Use disposable
accounts/data only after the user approves live test writes. There are no baked-in
test credentials. Test over HTTPS with Android Chromium and iPhone Safari.

1. Register A and B with distinct 3–30 character names and matching passwords;
   test invalid/trimmed/Unicode names and owner editing in English/Finnish.
2. A creates/starts a Group. B must be denied a ticket/coordinates before admission.
   Test private and approval admission, then accept B using existing controls.
3. Before checking consent: no ticket or location message. Check consent and start
   both phones. Verify names, selected vehicle, opted-in Club/rank and no UID/email
   labels. DevTools should show an Authorization header on the POST, no token in
   the socket URL, and a short-lived ticket only in the first socket frame. Keep
   credentials in memory; never paste them into URLs or saved commands.
4. Walk/move safely: both see current markers; moving updates roughly 5s, stationary
   less frequently, unchanged coordinates suppressed. Personal recording, routes,
   heading/north-up, themes, weather and controls continue with one GPS watcher.
5. Change OK/Fuel/Mechanical/Need help: current Firestore status reaches both
   phones. These are advisory. Separation uses only fresh straight-line positions;
   it is not road distance, rider order, speed ranking or emergency assistance.
6. Stop GPS fixes but keep connection: stale after 45s, expired at 120s; marker
   disappears. Sample-less heartbeat must not make old coordinates fresh. Close
   connection: marker clears. Offline/reconnect gets current snapshot, no backlog.
7. Remove/ban B while B sends **nothing**: admission ends on the periodic authority
   check (30s lease). B must receive no private frame after lease expiry, even if
   alarms are late. Verify another connection cannot redeem a pre-removal ticket.
   Then complete/cancel the session and verify all sockets close/markers clear.
8. Test another room C: no positions cross rooms. Reuse one ticket: second attempt
   denied; wait over 30s before redemption: denied. Wrong Origin/project/expired
   JWT/outsider fails; a Club rank or host role alone is not admission. Use a
   controlled local test harness for malformed/binary/oversized/rate cases rather
   than capturing a production token into a script.
9. Second connection for A replaces the first; no reconnect takeover loop. Logout,
   leaving, Back and loss of membership stop sharing and clear markers. Personal
   recording may retain its watcher until finished; consent alone never saves a
   cloud ride. Switch account while a request is pending: no cross-account data.
10. Temporarily interrupt backend access in an approved test window: fail closed,
    visible localized error, GPS publishing stops, personal recording survives.
    Background/lock-screen suspension may stop updates; do not claim always-on GPS.
11. Run existing two-account private profile/Garage/ride and Club administration
    procedures in DEPLOYMENT_CHECKLIST.md. Block cross-account writes/reads and
    role escalation. Inspect current rules/index status separately from IAM reads.

Physical hibernation/eviction recovery, mobile suspension, IAM propagation, real
latency and quota behavior remain acceptance gates; local workerd is not evidence
of deployed Cloudflare or real Firebase success.

## 13. Usage, measurements and budget

Open Cloudflare Worker metrics and Durable Objects metrics/billing: track Worker
requests/CPU, actual incoming messages, DO billable units, duration and SQLite
rows/storage. Incoming messages in metrics are **not** the discounted billing
units. Watch Firebase Firestore Usage plus Google Cloud billing/budget alerts for
reads/egress. Alerts notify; they are not guaranteed hard spending caps. No
automatic billing upgrade or resource purge is implemented.

Reproduce estimates with `node tools/estimate-cost.js` inside cloudflare/.
Measured UTF-8 serialized fixtures: client position **167 bytes**, server position
**263**, fanout heartbeat **121**, own ack **72**, room_update **103**, ten-rider
snapshot **3,841**. These are representative message sizes, not captured production
traffic. Bounded worst-field fixture: one socket attachment **1,571 bytes**, ticket
record **280**; 50 attachments + 100 tickets ≈ **106.6 KB serialized state**, plus
JS/crypto/runtime/SQLite overhead. This is not a measured heap bound; DO duration
billing uses allocated 128 MB. Empty SQLite metadata and retained session IDs
accumulate with rooms; no GPS history is retained in storage.

Model: 30-day month; each active user participates in **five two-hour sessions**,
ten simultaneous admitted users per room, all moving continuously at 5s cadence,
25s heartbeats, five connects/month, four controls/connect, 10s room alarms and
authority checks about every 20s. One user sends about **1,733 messages/session**
or **8,665/month**; one ten-rider session about **17,330 incoming messages**.
Initial snapshot/control/transport allowance is included in outbound estimates
(20% overhead); reconnect storms and abusive traffic are additional. An all-50
rider room has roughly five times the position fanout per user-hour.

| Monthly active users | 100 | 1,000 | 10,000 |
| --- | ---: | ---: | ---: |
| Live user-hours / room-hours | 1,000 / 100 | 10,000 / 1,000 | 100,000 / 10,000 |
| Incoming client messages | 866,500 | 8,665,000 | 86,650,000 |
| Worker HTTP requests incl. preflight | 1,500 | 15,000 | 150,000 |
| DO request units, alarms + HTTP + messages/20 | 80,325 | 803,250 | 8,032,500 |
| Full active-room duration, GB-s | 46,080 | 460,800 | 4,608,000 |
| Estimated outbound GB incl. allowance | 2.52 | 25.19 | 251.90 |
| Firestore authority document reads | 562,000 | 5,620,000 | 56,200,000 |
| Cloudflare Paid monthly range, USD | **$5** | **$5–$17.50** | **$6.20–$68.70** |

The upper duration estimate assumes no useful hibernation savings. Lower figures
assume enough eligible idle time to stay within included duration; they are not
promised. Current rounded overage units are included. Model assumes Worker CPU
stays within its included allocation (150k HTTP requests could average 200ms
before 30m CPU-ms); no production CPU benchmark exists. SQLite rows/storage are
expected well below Paid included quotas here; they must be monitored. Paid model
is Cloudflare only, excluding tax, other account workloads and **Firebase costs**.
Cloudflare Workers has no separate egress charge; Firebase response egress can
be charged. One-room authorization check reads parent + 3 docs/rider (including
missing ban lookups), plus a Club when present; **31 document reads per check**
for a ten-rider room is a conservative count. Initial ticket/redemption adds eight
reads/connect. Optional Club adds one read/check; browser/profile/Lobby/recording,
extra controls/reconnects and rule-dependent client reads add more.

**Capacity blocker on Firebase Spark:** its free quota is 50,000 reads/day.
This model's authority reads alone average ~18,733 / 187,333 / 1,873,333 per day.
100 users may fit only with distributed traffic and other usage headroom; a peak
day can still exhaust quota. 1,000/10,000 at this usage requires an explicit
Firebase billing/quota decision or a separately designed reduction in live usage.
Do not weaken authorization checks to fit a quota. Firebase regional prices and
actual database location are unverified; no combined bill is invented. Review
location-specific pricing and set budgets before increasing participation.
Free Cloudflare can be $0 for a small trial, but modeled 1,000-user full duration
averages 15,360 GB-s/day versus 13,000 included; 10,000 also exceeds daily DO
requests/SQLite writes. Bursts matter at every size. Paid estimates are safer
planning figures, not evidence the Free plan can sustain this workload.

Rate bounds cap a room's messages/sockets/tickets, not the entire public service's
bill. HTTP attempts, many rooms and repeated redemption still consume resources;
no account-wide abuse limiter is included. Monitor and apply reviewed Cloudflare
rate/abuse controls before broad public launch. Polling has a 30s authority lease;
Auth-disabled/revoked tokens are not looked up and can remain valid until ID-token
expiry (up to 1h). Current browser logout stops its own connection. This limitation
must be included in incident response and future immediate-revocation design.

Pricing sources checked 2026-10-10: [Workers](https://developers.cloudflare.com/workers/platform/pricing/),
[Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/),
[Firestore](https://firebase.google.com/docs/firestore/pricing).

## 14. Roll back safely

Before publishing, retain the current secure frontend commit, deployed Worker
version ID, Wrangler configuration, secret key version and exported Firebase
rules. These are operator records; do not commit secret content.

For a live incident, stop new live use: publish reviewed `live-config.js` with an
empty endpoint and/or disable the Worker route. Existing open tabs can keep old
configuration; for urgent disconnection invalidate the reader key/permissions
and disable routing, then verify sockets no longer receive positions after the
current 30s lease. Route changes alone must not be assumed to close existing
sockets. Do not log JWTs to debug. Rotate any potentially exposed secret.

Worker dashboard → deployed Worker → Deployments → Rollback to a known secure
compatible version, or use `npx.cmd wrangler rollback` and select the recorded
version. Confirm the binding/secret/current rules remain compatible. First release
has no older secure Worker: disable live instead. Rollbacks do not undo namespace
migrations or erase data; do not delete namespaces to achieve rollback.

For frontend, create a reviewed revert commit restoring the secure version or
empty endpoint and publish through the same GitHub Actions workflow after approval.
Avoid force-pushing main. Old tabs may need refresh; there is no new offline cache.

Firestore Console → Rules: restore **only** a reviewed secure compatible saved
rules revision. Never restore rules from before Club confidentiality/retired-ID
fixes just to make UI work. Keeping current secure rules with disabled live is
preferable. Keep RTDB deny-all. Rules rollback does not restore/delete documents,
change indexes or undo product writes. No production restore/purge is automated.

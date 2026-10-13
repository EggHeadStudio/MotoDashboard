> **Current Batch 6B (2026-10-13):** the operator reports 6A deployed/working.
> 6B is local and adds **LIVE_IDENTITIES → LiveIdentity / SQLite v2**, retaining
> **LIVE_ROOMS → LiveRoom / v1**. Use the current [deployment checklist](DEPLOYMENT_CHECKLIST.md)
> before the older setup/6A source-only instructions below. No new secrets/IAM write
> grant or paid service. Drain sharing, deploy the coordinator before new Pages,
> preserve both namespaces/migrations and perform same-account two-device conflicts.
> Abandoned connected ownership is bounded by 45s without inbound activity; authority
> leases remain 30s. Quota usage increases by coordinator renewals (about 3/min/UID).

> **Current operator report, 2026-10-12:** motodash-live and LIVE_ROOMS Durable Objects are deployed, the production frontend endpoint is configured, Batch 5 is published, Firestore Rules deployed and all 18 composites Enabled. Real two-account/two-phone acceptance remains pending. This guide now covers maintenance/redeployment and acceptance; no setup/deployment action was performed by this audit. Firebase deployment identity and the Cloudflare read-only Firestore credential are separate.

# Cloudflare maintenance and acceptance for MotoDashboard

Updated 2026-10-12: **browser-only deployment through GitHub Actions**. You do not
need to install Node.js, npm, Wrangler, Git or other software on this computer.
The operator reports **motodash-live and Durable Objects deployed**. This audit
did not inspect private consoles or change the deployed configuration. Local tests
and deployment success do not certify authenticated live/mobile readiness.
Every account, billing, IAM, key, deployment, frontend publication and live-test
step below is for the **user/operator** when maintaining the service or testing it.
The configured Worker URL is **https://motodash-live.old-sound-55f2.workers.dev**;
account/deployment IDs remain operator records, and live-config.js already contains
the public endpoint.

The frontend remains static GitHub Pages native ESM. Only `cloudflare/` uses npm
and a server bundle, installed on GitHub-hosted runners. Firebase
**motodash-87bf8** Auth/Firestore remains permanent
identity/data/authorization; RTDB remains locked. Read DEPLOYMENT_CHECKLIST.md
before any publication. Initial setup is reported complete. The instructions below apply only to future
operator-approved maintenance; historical preparation evidence is preserved. The new workflow is
[.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml).
It has **workflow_dispatch only**: publishing repository changes does not start
Worker deployment. The existing GitHub Pages workflow is independent and unchanged.

## 1. Select the account containing the existing Worker

Open [Cloudflare dashboard](https://dash.cloudflare.com/), sign up or sign in,
verify your email and enable MFA. Select your actual account under Workers &
Pages and open **motodash-live**. Do not create a replacement Worker. A purchased
domain is not required for workers.dev. Leave Cloudflare Git integration/automatic
Workers Builds disabled or disconnected for this Worker so pushes cannot deploy it.
The manual GitHub workflow handles source deployment instead.

## 2. Select a Workers plan and a budget

SQLite Durable Objects work on Workers Free and Paid. Free is suitable only for
an intentionally small trial; daily quota exhaustion fails requests. For the
model below, choose Workers Paid only after approving its minimum monthly charge
and overage budget. A website plan is separate from a Workers plan. Other workers
in your account share allowances. Review the current pricing links below before
buying; this document is an estimate, not a billing guarantee.

## 3. Create the Cloudflare deployment API token in your browser

Cloudflare profile → API Tokens → Create Token → Create Custom Token. Name it
for MotoDash GitHub deployment. Grant these **Account** permissions:

- **Workers Scripts: Edit** (API permission name Workers Scripts Write).
- **Account Settings: Read** (account/workers.dev settings).

Account Resources → Include → **Specific account** → the account containing
motodash-live. No DNS/Zone/Workers Routes permissions are needed because this
configuration deploys only to workers.dev, not a custom-domain zone. Do not use
the Global API Key or a broadly scoped administrator token. Durable Object class
migrations/bindings travel with the Worker upload, not a separate Firebase grant.
If using the “Edit Cloudflare Workers” template, remove unrelated KV/R2/Zone/User
permissions and scope the account. Create the token and copy it only into the
GitHub secret in step 5. Do not paste it into a repository file or issue.

## 4. Review the Durable Object migration

Open `cloudflare/wrangler.jsonc` in GitHub. Keep `LiveRoom` exported from
`src/index.js` and
the `v1` migration containing `new_sqlite_classes: ["LiveRoom"]`. Wrangler creates
the SQLite namespace during the first deployment that adds this class, including
to an existing starter Worker. If the class/migration was already deployed with
this same configuration, normal redeployments retain the existing namespace.
Do not create a second unrelated namespace or remove/reuse migration tags.
Future schema migrations need
their own new tag and rollback review. No SQL GPS table is created.

Before the first run, inspect motodash-live → Bindings and the account's Durable
Objects page. The expected binding is **LIVE_ROOMS → LiveRoom on motodash-live**,
using **SQLite**, not another Worker's class. If no such namespace exists, let
Wrangler create it; do not add an unrelated placeholder manually. If an existing
LiveRoom uses legacy KV, a different migration history, or another class/namespace,
stop and review that deployed configuration before running the workflow. This
preparation does not verify remote namespace history and does not delete/rename
any namespace to bypass a conflict. The current migrations array remains
supported; switching to a new lifecycle format is unnecessary for GitHub Actions.
See the [supported migration contract](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/).

## 5. Create exactly two GitHub repository Actions secrets

Keep binding name `LIVE_ROOMS`, class `LiveRoom`, Worker name `motodash-live`.
The entry module uses this binding, with `idFromName(sessionId)`, to isolate rooms.
No namespace ID is invented or manually pasted. In Cloudflare, copy the **Account
ID** from the account/Worker overview; use the account ID, not a zone ID, script
ID or namespace ID. Then in GitHub **EggHeadStudio/MotoDashboard** → Settings →
Secrets and variables → Actions → Repository secrets → New repository secret:

| Exact name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | The account-scoped deployment token from step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | The actual Cloudflare Account ID containing motodash-live |

Use **Secrets**, not Variables. No additional GitHub secret or manually created
GITHUB_TOKEN is required. Firebase's private reader JSON is **not** a GitHub
secret for this workflow; it stays in Cloudflare in step 7. The workflow checks
missing secret names without printing values, and gives credentials only to that
check and the final official deployment action. Tests receive no deployment keys.
Official action inputs and installed-Wrangler reuse:
[cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action).

## 6. Verify Firebase and permanent rules first

In Firebase Console select **motodash-87bf8**, default Firestore database and the
web app matching `firebase-config.js`. Enable Email/Password; verify authorized
domains **eggheadstudio.github.io** and **localhost** (domain only, no path).
Verify all public web config fields against Console. `databaseURL` is historical
and optional to Auth/Firestore; it is never used by the frontend.

Follow the current checklist's read-only legacy inventory guidance; the historical B6 rationale is archived. If verified free of
legacy Club records/orphans, record migration N/A; do not infer emptiness from the
user report. Record/export the current deployed rules before future approved
publication. Exact sources: root **firestore.rules**, **database.rules.json**,
**firestore.indexes.json**. Keep database.rules.json deny-all. Verify all **18**
composite indexes (one private-history, sixteen Lobby combinations and Club category/name) and the route
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

Use an existing text viewer to obtain the complete downloaded JSON contents;
no software installation is required. In Cloudflare → Workers & Pages →
**motodash-live** → Settings → Variables and Secrets → Add:

- Type: **Secret**, not Text or JSON/plaintext variable.
- Name: **FIRESTORE_SERVICE_ACCOUNT**.
- Value: the **complete reader service-account JSON**, including the three required
  fields above. Preserve the JSON escaping of private_key; do not paste just the
  key or an Auth ID token.

Save/Deploy the secret using the Dashboard control. This is a separate operator
configuration action; the workflow never uploads or replaces this secret. If it
already exists, verify its purpose/IAM and leave it in place rather than exposing
its value. Dashboard-created Worker secrets persist across normal Wrangler
deployments. Verify the secret's **name/type** after deployment; do not log its
value. Secret changes may create a Worker version; verify the account/name first.
Never enable payload/header logs.
Dashboard secret controls:
[Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
Current observability and Wrangler metrics are off. Hashes of one-use tickets
are stored temporarily; raw Firebase tokens are not stored/logged by code.

## 8. Maintain the existing workflow on main

.github/workflows/deploy-cloudflare.yml, cloudflare/ source and package-lock.json
already exist on main. No upload/registration branch is needed. For a future reviewed
change, update the intended source/config on main through the normal GitHub browser
or local commit process. An approved main push starts Pages; it never dispatches
this separate Worker workflow. The operator needs no local Node/npm/Wrangler.

GitHub must allow Actions for this repository and these official actions:
actions/checkout@v6, actions/setup-node@v6, cloudflare/wrangler-action@v4. The job
uses ubuntu-latest, Node 22 and npm ci, followed by npm test (dry-run bundle plus
mock-backed local workerd tests). The Ubuntu runner supplies OpenSSL for generated
fixture keys. Failed dependency installation/tests stop the job before deployment.
No private Firebase credential, live project writes or rule deployment is part
of these tests. Publishing to main may run the existing **GitHub Pages** workflow;
it does **not** run this Worker workflow. Both deployments remain independent.

## 9. Manually deploy the existing Worker from GitHub Actions

After recording the account, rules/index/inventory evidence, IAM and budget,
open GitHub → Actions → **Deploy MotoDash Cloudflare Worker** → Run workflow →
select the reviewed default/main branch revision → Run workflow. Manual dispatch
is available once the workflow exists on the repository's default branch. It has
no push, pull_request or schedule trigger. Concurrent runs are serialized rather
than cancelling an in-progress Worker deployment.

The official Cloudflare action executes **deploy --config wrangler.jsonc** from
**cloudflare/**. It uses the lockfile-installed Wrangler (currently 4.149.0),
the two GitHub secrets and the existing config's **name: motodash-live**. It does
not deploy a named staging environment or another Worker, change Firebase data,
publish Firebase Rules, upload the frontend or import private reader credentials.
Secret output is suppressed; never enable debug tracing or print env/secrets.

Wait for a green run, then in Cloudflare confirm the motodash-live deployment
version/time, LIVE_ROOMS binding/SQLite namespace, variables and secret name/type.
Settings → Domains & Routes: confirm the **workers.dev** route is active; the
existing config sets workers_dev to true. No custom domain is required.
Record the actual workers.dev URL from the Dashboard and open its `/health` path.
Health proves routing only, not Firebase access. With the reader secret absent,
live ticket requests fail closed; do not weaken checks to fix this. Complete the
admitted-account acceptance test before wider use. The operator reports successful deployment; this audit performed no GitHub run or
Cloudflare deployment and does not mark admitted-account acceptance completed.

## 10. Configure exact allowed origins

Production `ALLOWED_ORIGINS` is **https://eggheadstudio.github.io**. An origin has
no `/MotoDashboard/` path. Keep exact comma-separated origins, no wildcard, null
origin or credentials. A different authorized hosting origin requires its actual
value and review. Remove localhost from production. Apply a reviewed variable
change in **cloudflare/wrangler.jsonc** via GitHub, then run this manual workflow
again. Wrangler's versioned configuration is authoritative for these nonsecret
variables; a Dashboard-only edit can be overwritten by the next deployment.
In motodash-live → Settings → Variables and Secrets, verify these **Text** values
after deployment (the config supplies them; no duplicate GitHub secrets needed):

| Name | Exact value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `motodash-87bf8` |
| `ALLOWED_ORIGINS` | `https://eggheadstudio.github.io` |

CORS and Origin checks protect browser connections; they do not replace
identity/Firestore authorization and are not
protection against a nonbrowser client forging an Origin.

## 11. Preserve the configured frontend endpoint and Pages artifact

Root live-config.js already points to
**https://motodash-live.old-sound-55f2.workers.dev**. Keep the HTTPS origin without
path/query/fragment/credentials; the client derives the WSS connection route.
Do not replace it with an empty string during routine cleanup. An intentional
incident rollback may disable live by clearing it, with the consequences in step 14.
Batch 5 is already published, per operator. Frontend changes and Worker deployment
remain independent; no private value belongs in the endpoint configuration.

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

The reproducible model is in cloudflare/tools/estimate-cost.js. Reading the script
and estimates in GitHub requires no local tools; any future model execution can
use a GitHub-hosted runner instead of this computer.
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

Worker dashboard → **motodash-live** → Deployments → Rollback to a known secure
compatible recorded version using Dashboard controls. Confirm the binding/secret/
current rules remain compatible. Do not run the manual workflow immediately after
rollback unless its selected source revision is the intended version. First release
has no older secure Worker: disable live instead. Rollbacks do not undo namespace
migrations or erase data; do not delete namespaces to achieve rollback.

For frontend, use GitHub's browser editor to restore the reviewed secure files or
set live-config.js endpoint to an empty string, commit the reviewed rollback after
approval, and let the existing Pages workflow publish it.
Avoid force-pushing main. Old tabs may need refresh; there is no new offline cache.

Firestore Console → Rules: restore **only** a reviewed secure compatible saved
rules revision. Never restore rules from before Club confidentiality/retired-ID
fixes just to make UI work. Keeping current secure rules with disabled live is
preferable. Keep RTDB deny-all. Rules rollback does not restore/delete documents,
change indexes or undo product writes. No production restore/purge is automated.

## Historical workflow preparation verification — 2026-10-11

The workflow and existing config are checked locally for YAML syntax, manual-only
trigger, action input names, working directory, credential references and room
binding/migration/export alignment. No new software is installed for deployment;
Node/npm/Wrangler installation in this workflow is confined to GitHub runners.
This is configuration validation, not a GitHub-hosted run or a production test.
No push, workflow dispatch, Cloudflare change or Firebase operation is performed.
On that date the frontend workflow and cloudflare/wrangler.jsonc were unchanged.
Batch 6B now appends LIVE_IDENTITIES/v2; its current procedure is at the top of this guide.


## Historical post-Batch 5 audit

The existing Worker/DO binding, v1 SQLite migration, exact origin, protocol and
credential configuration are preserved. Local Worker checks are in REPOSITORY_AUDIT.md;
operator-reported deployment is separate from mock-backed workerd testing and the
pending section 12 phone checklist. Read quotas, lease/token revocation and erasure
remain future reliability/privacy work; no RTDB transport should be enabled.

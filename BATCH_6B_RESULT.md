# MotoDashboard — Batch 6B

## Milestone 0 — audit and implementation plan (2026-10-13)

The operator reports Batch 6A deployed and the prototype working. That report
supersedes earlier local-only publication notes; it is not an independent console
or physical-device test. Batch 6B is authorized for local implementation only.
No push, deployment, production writes or Batch 7 work is authorized.

The new Batch 6B scope supersedes the earlier proposal named account recovery.
Password recovery/change, Google linking, complete deletion, uploads, Official
activities/rewards, Stripe/subscriptions, NFC and merchandise remain future work.

### Reuse and findings

- Keep static Pages `/MotoDashboard/`, native modules, existing design tokens,
  forms/icons, EN/FI dictionary, single Firebase initializer and private schemas.
- Keep the six-field private user document, private Garage and ride history.
  Garage `public` is currently only a preference: never automatically publish it.
- Existing member/participant identity uses bounded `displayProfiles` reads;
  extend that safe signed-in projection with an optional validated public alias.
- Anonymous Home currently exposes ordinary navigation. Add a separate landing
  route and intentional guest entry, preserving private invitation/Auth returns.
- The recorder can currently confirm creation of a second active record, and
  guest refresh can start GPS automatically. Replace these with explicit return
  and safe owned recovery. Maintain one existing GPS pipeline and watcher.
- Rooms currently authorize each Group independently. A browser-only check cannot
  enforce one live Group across devices. Add a trusted UID-keyed SQLite Durable
  Object coordinator using the existing Worker infrastructure, not Firestore writes.
- Keep existing tests, RTDB deny-all, the 18 indexes and historical security records.

### Privacy design

`#/rider/{random-public-id}` uses an immutable opaque alias, never an Auth UID.
A private owner reservation and own profile settings control an exact minimal
`publicProfiles` projection. Public/Private only in this batch; Members-only needs
a separately defined audience policy and remains planned. Defaults are private.

Public vehicle/affiliation cards have their own opaque IDs and bounded known-ID
reads (no public collection listing). Private mappings link to original Garage
and Club records. Rules check the current parent privacy, original vehicle
visibility/existence and current public Club/membership/rank before returning a
card. This denies stale child documents after privacy/deletion/revocation, without
putting private vehicle IDs, UIDs or private Club affiliations into public roots.
Vehicle descriptions are separately entered public text, not copied private notes.
Limits are prototype payload/read bounds, not paid entitlement enforcement.

### Sequential milestones / verification

1. Landing: semantic original SVG/CSS hero, real-feature sections, proposed pricing,
   EN/FI, reduced-motion enhancement, guest/Auth/invitation regression; local commit.
2. Public profiles: owner reservation/preferences, minimal projection, hash resolver,
   safe contextual links, emulator privacy/ownership tests; local commit.
3. Garage showcase: explicit publish/unpublish, safe snapshots and immediate source
   privacy/deletion gates, bounded reads and future capability concepts; local commit.
4. Customization: mobile owner editor, bio/category/featured/preset accent/banner,
   public Club/rank opt-in, strict validation and UI tests; local commit.
5. Continuity: separate recording/participation/sharing/view state, header Return to
   Ride beside the bell, owned restoration, navigation/reload/logout tests; local commit.
6. Exclusivity: fail-fast personal recorder ownership and trusted cross-device live
   lease acquisition/renewal/release/expiry, race and stale-release tests; local commit.
7. Full browser, actual demo Firestore/RTDB emulators, local workerd, Pages and workflow
   validation. Physical Safari/phones and live Firebase remain explicitly NOT RUN.
8. Final documentation, deployment order, mobile acceptance and limitations; commit.

### Infrastructure feasibility and remaining gates

An additional SQLite class/binding with an append-only migration is supported by
the existing Cloudflare deployment; retain the current LiveRoom namespace and v1
migration. No new paid service or write-enabled Firebase credential is proposed.
Extra coordinator requests/storage count against the account's quotas. See
[Cloudflare SQLite storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
and [migration guidance](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/).
Firestore per-operation/batch document-access limits constrain projections and
will be tested with the real emulator, not assumed from browser fixtures. See
[Firebase atomic Rules validation](https://firebase.google.com/docs/firestore/manage-data/transactions).

Full account erasure, disabled-token revocation before expiry, public-read abuse,
capacity and background GPS guarantees remain outside this batch. Public visibility
cannot retract content already downloaded. No claim of production testing is made.

## Progress

**Milestones 0–8 complete locally.** Publication and real-device acceptance remain
pending approval. Nothing was pushed/deployed; no production data was changed.

### Milestone 1 — landing

Dedicated semantic anonymous landing with original SVG, six real-feature sections,
proposed Free/Rider/Host/Club prices, accessible scrolling and optional observer
reveal. EN/FI and reduced motion; content remains visible without JavaScript.
Explicit guest dashboard/history entry; anonymous refresh never requests GPS.
Existing private invitation and notification Auth routes are preserved.

Checks: six Batch 6B landing cases, six existing Group/invitation browser groups,
20 Batch 5 cases and two Pages compatibility groups pass. Pages checks cover
252 references / 77 URLs under `/MotoDashboard/`. No physical phone test.

### Milestone 2 — public profile foundation

Own-only preferences and permanent opaque owner reservations; strict minimal
public projection, Public/Private defaults and irreversible retirement Rules.
Known-ID public routes, missing/private-unavailable states, refreshed hash routes,
optional signed-in display alias and contextual member/participant links. Private
user schema is unchanged. Existing accounts are never auto-published.

Checks: 44 new actual-emulator assertions and 32 identity assertions pass; original
private/Club/Group security and six Group browser regression groups pass. Seven
Batch 6B browser cases pass, including explicit publishing and refreshed profile
routes. Browser fixtures do not prove permissions; emulator denials do.

### Milestone 3 — explicit Garage showcase

Separate public-description form and required vehicle opt-in; up to four bounded
cards with silhouettes and one featured selection. Private descriptions, source
IDs and ownership never enter cards. Existing public preferences do not publish.
Garage edits synchronize an opted-in safe card; private/Club visibility, deletion
or unpublishing removes its reference/card. Rules independently deny retained cards
if the source is private/missing, the profile is private/retired or the original
vehicle incarnation no longer matches. No paid tier is enforced; Free/Rider
capability concepts are future design only, not client-issued entitlements.

Checks: 81 cumulative new emulator assertions, 102 original assertions, nine
Batch 6B browser cases and 20 Batch 5 regressions pass. Missing-card transaction
reads are explicitly tested in the actual emulator as well as publication writes.

### Milestone 4 — controlled profile customization

Mobile owner editor for synchronized display name, plain-text bio, real vehicle
category, featured published card, four accent presets and three built-in banners.
Initial avatar needs no media service. Public/Private visibility, explicit public
Club/rank cards and removal controls; Club picker uses latest 20 owned memberships.
No HTML rendering, arbitrary CSS, uploads, billing, system roles or client entitlement.

Affiliation roots contain opaque card aliases. Child Rules require a currently public
live Club, current membership incarnation and current visible rank/name. Privacy,
leave/rejoin or rank changes deny old cards until explicit owner update; root profile
and unrelated showcase cards remain usable. Members-only visibility is deferred
until its exact audience is specified. Full account erasure remains future work.

Checks: 119 cumulative actual-emulator assertions and 13 Batch 6B browser cases
pass, including Club identity, safe literal markup, name synchronization, anonymous
routes and responsive Finnish presentation. Physical-phone/Safari acceptance pending.

### Milestone 5 — ride continuity

Separate owned recording/recovery, selected active Group, sharing/connection and
dashboard-view state. Compact header Return to Ride sits beside the notification
bell on all five screens. It preserves the existing record/vehicle/statistics/GPS
watch; completed-history detail cannot silently replace an active recorder.
Browsing/Home retains enabled sharing. Explicit Stop/leave/end/logout still stops it.
This intentionally supersedes Batch 6A's Home-stops-sharing behavior and copy.

Own personal recording can recover after authenticated refresh without stealing a
Profile/invitation route; guests explicitly Resume. Group return hints contain no
coordinates and are revalidated against current admission/deadline. Reload never
restores live consent. Sharing-off Group return shows an explicit Group control
without starting GPS. Logout clears hints/private live state, retaining owned local
rides. Unavailable/offline unverified Group hints fail closed rather than granting access.

Checks: 15 Batch 6B browser cases, live transport/client regressions, 13 Batch 6A
cases and Pages compatibility pass. Native phone/Safari/background behavior pending.

### Milestone 6 — exclusive operational ride

Second personal Start/competing Resume cannot replace the recorder. Web Locks
exclude other tabs; an atomic IndexedDB fallback has 30-second expiring ownership
and nonce-protected release. No safe storage means a visible recording failure,
not an unprotected duplicate recorder. Page exit flushes/stops local ownership;
account changes stop the watcher. Local personal locks are not a cross-device
private-recording service. The server-authoritative cross-device invariant applies
to live Group sharing as requested; personal recording can coexist with that Group.

The existing Worker gains `LIVE_IDENTITIES -> LiveIdentity`, one SQLite coordinator
per verified UID, with append-only **v2** migration. Existing LIVE_ROOMS/v1 remain.
Atomic reservation/activation, connection nonce, bounded renewal/release and alarm
expiry ensure one live Group. Room leases are clamped to coordinator, token and
Group deadlines; expired/stale claims cannot renew. Closed sockets are marked
closed before release, and delayed old releases cannot clear replacement claims.
Old uncoordinated tickets/attachments fail closed in the new code.

UI blocks conflicting activation/sharing and offers localized Return/Cancel.
HTTP/WS conflicts do not silently end or replace the established ride. Scheduling,
Club memberships and organizer lifecycle documents remain independent; the global
server invariant protects the actual live publisher, not every scheduled membership.
No Firestore writer, new secret, paid service or client UID authority is introduced.

Checks: **64 Worker tests** (including actual SQLite/workerd acquisition races,
expiry, stale release and inaccessible coordinator routes), **18 Batch 6B browser
cases** (including real cross-tab locks/fallback), plus live-client regressions pass.
An empty POST stream compatibility issue found by workerd was corrected without
accepting body-supplied identities. Full integration is the next milestone.

### Milestone 7 — final integration and security verification

Final source version **1.4.0-batch6b**. Public openings require server reads; cached
private previews never establish current public visibility. The pinned real SDK
export is verified. Map content is inert/hidden from assistive navigation behind
the landing/shell. Source vehicle identity is retained correctly for Group-only
dashboards; original personal snapshots remain their recorded selection.

Review tightened abandoned-socket ownership: no claim/room lease can outlive 45
seconds without inbound activity, even while authority alarms keep running. Actual
workerd proves another Group can win after abandonment and the old receiver gets
no later coordinates; its late release cannot free the new Group.

| Final check | Result / limits |
| --- | --- |
| Firestore actual demo emulator | **840 distinct passed**, 0 failed/skipped: 102 baseline + 137 security + 273 Groups + 32 identity + 82 Batch 5 + 79 Batch 6A + 135 Batch 6B; repeated baselines counted once |
| Cloudflare | Dry-run build + **66 passed**, 0 failed/skipped, including **17 actual local workerd/SQLite** tests; mocked Google/Firestore, no production identity |
| Full browser | **24 legacy groups + 20 Batch 5 + 13 Batch 6A + 20 Batch 6B** passed, 0 failed/skipped; 36 domain/17 confirmation assertions are nested, not extra suites |
| RTDB | **68 passed**, 0 failed/skipped; deny-all demo, no live RTDB |
| Pages | **2 groups**, **294 references / 83 URLs HTTP 200** under `/MotoDashboard/`; degraded Firebase preserves guest recording/history |
| Deployment | **10 contracts**, exact unchanged 18 composites/exemption, **3 workflow YAMLs / 15 Bash blocks** and v1/v2 binding alignment; no workflow dispatched |
| Not run | Production Firebase/Cloudflare account tests, physical phones/native Safari/WebKit, real GPS and operational quotas |

Early development runs exposed outdated anonymous-navigation/focus assumptions and
synchronous Start assumptions; tests now use visible entry points and wait for
ownership admission while retaining their authorization checks. Workerd caught the
empty-stream POST issue. Browser fixtures now use deterministic document-name
tiebreaks for equal query values. Some intermediate Group-pagination/full-browser
attempts timed out; diagnostic coverage is retained and the final complete run
passed. Their production relevance is unconfirmed; MD-NETWORK is not claimed fixed.
All previous security/QR/GPS/export coverage is retained. No test expectation was
relaxed to authorize private reads or competing live Groups.

### Milestone 8 — final documentation and cleanup

IDEA.md remains the authoritative roadmap; README describes the actual prototype.
IMPLEMENTATION_STATUS distinguishes implemented, locally tested, operator-reported
deployment and pending acceptance. DATA_MODEL and LIVE_TRACKING describe the current
private/public boundary and coordinator. DEPLOYMENT_CHECKLIST contains the exact
browser-only rollout, Console checks, secure rollback and nine physical acceptance
steps. Firebase/Cloudflare guides, the wire contract and Rules-testing guide point
to the current result; dated previous security/migration evidence is retained.

Cleanup review covered runtime/static/dynamic imports, UI registration, styles,
workflow artifacts, configuration, tests and documentation references. **No source
file was removed in this batch:** no additional obsolete file was proven unused.
All new runtime modules have consumers. Tests/fixtures, historical decisions,
locked RTDB coverage, installed development dependencies and ignored build caches
are retained. No temporary screenshots, logs, keys or generated bundles were added
to Git. Review also bounded the signed-in display-profile cache (200 entries/60s)
and clears it on account changes; one shared GPS pipeline remains.
Final documentation checks resolve **44 local Markdown targets**, confirm consumers
for every new runtime module, and find no tracked private-key payload/files.
`git diff --check` and repeated deployment/index/workflow validation pass. The Pages
and Worker workflow files and index/RTDB/deployer/web/live configuration are byte
unchanged relative to the pre-6B Git revision. Local demo emulators are stopped
after verification; existing development tools/dependencies are retained.

#### Exact file inventory relative to pre-6B `bee5038`

**16 new files:**

- Result: `BATCH_6B_RESULT.md`.
- Worker: `cloudflare/src/LiveIdentity.js`, `cloudflare/src/activeClaim.js`,
  `cloudflare/tests/active-claim.test.js`.
- Landing: `css/landing.css`, `js/ui/landing.js`.
- Public identity: `js/data/public-profile.js`,
  `js/firebase/publicProfileRepository.js`, `js/public-profile-ui.js`,
  `js/i18n/batch6b.js`.
- Continuity/ownership: `js/ride-context.js`, `js/recording-lock.js`,
  `js/ui/ride-return.js`.
- Verification: `tests/batch6b_browser.py`, `tests/run_batch6b_rules.py`,
  `tools/validate_workflows.cjs`.

**46 changed files:**

- Docs: `BATCH_6A_RESULT.md`, `CLOUDFLARE_SETUP.md`, `DATA_MODEL.md`,
  `DEPLOYMENT_CHECKLIST.md`, `FIREBASE_DEPLOYMENT.md`, `IDEA.md`,
  `IMPLEMENTATION_STATUS.md`, `LIVE_TRACKING.md`, `README.md`,
  `cloudflare/PROTOCOL.md`, `tests/RULES_TESTING.md`.
- Backend/configuration: `.github/workflows/deploy-firebase.yml`, `firestore.rules`,
  `cloudflare/wrangler.jsonc`, `cloudflare/src/LiveRoom.js`, `cloudflare/src/index.js`.
- Frontend integration: `index.html`, `js/app.js`, `js/auth-ui.js`,
  `js/club-members-ui.js`, `js/config.js`, `js/firebase/access.js`,
  `js/firebase/displayProfiles.js`, `js/firebase/garageRepository.js`,
  `js/firebase/profileRepository.js`, `js/garage-ui.js`,
  `js/group-participants-ui.js`, `js/group-ui.js`, `js/i18n/dictionary.js`,
  `js/i18n/product.js`, `js/live/live-client.js`, `js/live/live-ui.js`,
  `js/ui/navigation.js`, `js/ui/notifications.js`.
- Tests: `cloudflare/tests/foundation.test.js`, `cloudflare/tests/runtime.test.js`,
  `tests/batch2_browser.py`, `tests/batch5_browser.py`, `tests/batch6a_browser.py`,
  `tests/firebase_mocks.py`, `tests/groups_browser.py`, `tests/live-client-tests.js`,
  `tests/live_browser.py`, `tests/navigation_helpers.py`,
  `tests/password_confirmation_browser.py`, `tests/run_browser.py`.

**Removed files: none.** Existing Pages/Worker workflows, Firebase web/live config,
deployer configuration/role, index definitions and locked database Rules are unchanged.
No dependency or frontend build system was introduced. The Firebase workflow adds
the new security suite to its pre-deployment validation gate.

#### Backend changes and authorization findings

- Private `users/{uid}` schema remains unchanged. New own-only profile preferences,
  showcase references and immutable `profileOwners` reservations/source mappings
  accompany exact-field `publicProfiles` root/vehicle/affiliation projections.
  The signed-in minimal `displayProfiles` accepts an optional validated public alias.
- Rules deny public listing, foreign edits/private mapping reads, malicious extra
  fields, transfer/reuse/retired aliases, stale Garage incarnations and stale private
  Club/member/rank identities. Current source state is checked at read time, not
  hidden by frontend filtering. Unknown operations remain denied. Owner management
  reads of safe private previews are separate from anonymous public permission.
- All ordinary public openings use server reads. Previously cached owner previews
  cannot establish a public page. No UID, private source vehicle ID, email, private
  notes, ride history, exact location, approval data or technical role enters a
  public projection. Public Club card IDs are allowed only while the source is public;
  the root carries opaque affiliation aliases so private Club IDs do not remain exposed.
- Up to four vehicle/two affiliation cards require at most seven visible document
  reads per opening, with bounded concurrency and additional Rules dependency reads.
  `firestore.indexes.json` remains **18 unchanged composites** with the retained
  routeChunks.pointsJson single-field exemption. RTDB remains deny-all and unused.
- Worker adds `LiveIdentity` and pure claim decisions while keeping `LiveRoom`.
  Existing **LIVE_ROOMS/v1** and namespaces remain; **LIVE_IDENTITIES/v2** is additive.
  Authenticated UID selects the coordinator; clients cannot call its internal routes
  or supply another identity. Atomic acquisition, connection nonces, bounded leases,
  expiry and safe late release enforce one live Group across devices.
- Same-Group reconnect may replace that account's publisher; another Group cannot
  replace it. Abandoned open sockets cannot extend the claim indefinitely. Scheduling,
  hosting, memberships and personal recording remain independent of live publishing.
  Web Locks/atomic IndexedDB separately prevent competing local personal recorders.
- No new secret/environment variable, write-enabled service credential, paid service,
  Auth/Storage/RTDB deployment or automatic data migration is required. New Durable
  Object binding/migration **is** required; it is not a secret. Wire protocol stays v1.

#### Deployment — approval required, not performed

Follow [the current browser-only runbook](DEPLOYMENT_CHECKLIST.md). In order:

1. Record reviewed SHA/secure rollback versions. Stop sharing/close old live tabs
   and wait two minutes to drain the previous live lease window.
2. Disable **Deploy to GitHub Pages** in GitHub Actions temporarily, then publish
   reviewed `main` only after approval. Its normal main-push trigger otherwise
   publishes the frontend before either manual backend deployment.
3. Run **Validate or deploy MotoDash Firestore**, branch `main`,
   **operation=deploy**, **confirmation=motodash-87bf8**,
   **scope=rules-and-indexes**. It validates all Rules suites before deployment.
   Existing dedicated `FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON` deployer is reused;
   Cloudflare's read-only service account is never reused. Verify new Rules source
   and all 18 indexes Enabled/exemption in the correct Console project/database.
4. Run **Deploy MotoDash Cloudflare Worker**, branch `main`, **no inputs**.
   Existing `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` remain. Verify both bindings,
   appended v2 SQLite migration, exact existing origin/project and encrypted reader
   secret. Do not delete v1 or manually substitute namespaces.
5. Enable and manually run **Deploy to GitHub Pages**, branch `main`, **no inputs**.
   Verify version `1.4.0-batch6b`, assets/hash refresh, then perform mobile acceptance.

This repository contains the necessary workflows on `main`; no new branch or local
software installation is necessary. Rules-first and Worker-before-frontend are
mandatory. Keep both coordinator exports/bindings/migrations in any backend rollback;
keep schema-compatible secure Rules when restoring frontend files. Pre-6B Rules may
reject the new optional display alias and break identity/search if restored blindly.
Never widen permissions or delete reservations as a rollback technique.

#### Manual mobile acceptance — NOT RUN

The exact nine-step procedure is in DEPLOYMENT_CHECKLIST.md. With A/B accounts on
Android Chromium/iPhone Safari: test anonymous EN/FI landing/no GPS and explicit guest
Resume; publish two selected safe cards and open/refresh the opaque URL; privacy,
source deletion, foreign writes and Club/rank changes must deny stale private data.
Then record/share in Group X, navigate all five screens and Return without resetting
statistics/vehicle/GPS/socket. Verify second personal Start/competing tab rejection.
Keep A in X on phone 1 and sign phone 2 into **A** to attempt active Group Y: conflict
must preserve X and send no Y positions. This same-account step is essential; A and
B legitimately sharing different Groups would not test per-UID exclusivity.
Test stop/leave/end/logout, fresh consent after refresh, removal/bans/silent receivers,
network loss and abandoned-claim expiry. Use an additional account for the full
existing Admin/Host matrix. No physical/production acceptance box is marked PASS.

#### Known limits, privacy risks and future entitlements

- **Publication/acceptance blockers:** 6B Rules, coordinated Worker and frontend
  are local only. Actual production accounts, Safari/GPS/background behavior and
  quotas are unaccepted. These are not inferred from emulator/browser fixtures.
- **Wider beta blocker:** complete trusted account erasure remains future work.
  Inventory all new public/private mapping paths and live claims/tickets; Auth-only
  deletion is insufficient. Preserve minimal nonpersonal retired-ID reservations.
- **Operational risks:** already downloaded public content cannot be recalled;
  anonymous known-ID requests/Rules dependency reads need abuse/quota monitoring.
  Coordinator renewals add roughly three requests/minute per active UID. The older
  1,000+ user cost model needs coordinator headroom and explicit billing approval;
  no capacity or free-plan guarantee is claimed. Firebase-disabled/revoked ID tokens
  can remain valid until expiry (up to one hour); immediate revocation is not added.
- **Browser limits:** personal exclusion is origin/account scoped across local tabs,
  not a cross-device recording lock. Neither Web Locks nor writable IndexedDB means
  recording fails visibly. Mobile suspension/background GPS is not guaranteed.
  Offline unverified Group hints fail closed; live sharing never auto-restores consent.
- **Deferred:** Members-only needs a precise enforceable audience. Media uploads,
  full account settings/recovery/change, Google linking and complete deletion are not
  implemented. Equal-value query ordering in fixtures is now deterministic; intermediate
  pagination timeouts remain test-stability debt, not a claimed production diagnosis.
- **Future commerce:** planned Free permits one featured showcase vehicle; Rider
  adds multiple showcase/customization capabilities. Current four/two bounds are
  technical payload limits; all prototype features remain usable without purchasing.
  Prices are indicative only. Future entitlements need trusted verified billing state,
  server-validated ownership/plan enforcement, cancellation/downgrade/grace policy and
  preservation of private Garage/history. UI settings must never grant permissions.
  Stripe, Host/Club policies, photos/logos/banners/rank graphics, Official activities,
  rewards/achievements, subscriptions, NFC and merchandise remain in IDEA.md.

#### Logical local commits

| Milestone | Commit |
| --- | --- |
| 0 Audit/plan | `cd78a3d` |
| 1 Landing | `31eefaa` |
| 2 Public profiles | `f7c3dcf` |
| 3 Garage showcase | `035c0bd` |
| 4 Customization | `738a591` |
| 5 Ride continuity | `a211620` |
| 6 Exclusive ownership | `912e129` |
| 7 Integration/security | `e338e79` |
| 8 Documentation/cleanup | This final documentation commit; obtain its hash with `git log -1 --oneline` |

**STOP. Await explicit approval before pushing, deploying or starting another batch.**

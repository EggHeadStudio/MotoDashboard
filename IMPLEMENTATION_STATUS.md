# Current Batch 8.6 - 2026-10-17

Version **1.6.6-batch8.6**, local product-experience work; no publication by the
agent. The operator now reports Batch 8.5 deployed. Native phone/production
acceptance is not inferred from that report.

- Actual rendered UX audit before changes, shared dark automotive presentation,
  compact Home choices/Start, separate privacy disclosure and reused notices.
- Deliberate Discover destinations/paged cards, own bio/privacy, vehicle collection,
  Club/activity section navigation and clearly separate RSVP/admission.
- Semantic grouped editors, visible validation, dirty guards, private media/theme
  preview, keyboard/focus/text-scaling/reduced-motion improvements.
- Calmer dashboard with the same one GPS/recording/live pipeline; clearer saved
  history/replay controls without live telemetry or changed route timing.
- Fixed stale People loading, dirty modal stacking and Skip-link fragment loss.

**Frontend-only diff:** Rules/indexes, Firebase configuration, locked RTDB,
Worker/protocol/bindings/v1-v4, private R2 and GitHub Actions are unchanged. No data
migration, new secret, query/listener, infrastructure or paid activation. Existing
19 indexes and Batch 8.5 epoch/source/privacy contracts remain required.

Current evidence/commits/gates: [BATCH_8_6_RESULT.md](BATCH_8_6_RESULT.md).
Final local results: **1,116 distinct Firestore assertions**, **118 Worker tests
(20 native workerd/R2/SQLite)**, **130 browser groups/cases**, **68 locked RTDB**,
**2 Pages groups (448 refs/116 URLs)**, **10 deployment contracts**, **3 YAML/15
Bash** checks and **264 matched before/after cases per version** pass. Zero final
failures/skips/visual overflow. Native phone acceptance is separate and NOT RUN.
Rendered findings/evidence: [UX_AUDIT.md](UX_AUDIT.md). Exact publication/rollback
and real-phone checks: current DEPLOYMENT_CHECKLIST.md section. Wider beta still
needs trusted complete erasure, abuse/moderation/provider acceptance. All account,
Official/reward, commercial/NFC/merchandise and final branding scope stays in IDEA.md.
No Batch 9 started. Earlier dated local/deployment statements below are history.

---

# Historical Batch 8.5 - final local verification 2026-10-16

Version **1.6.5-batch8.5**, implemented locally. The operator reports Batch 8
deployed; this batch has not been pushed, deployed or accepted on real phones.

- Shared authorized View/Edit, per-section Save/Cancel, dirty guards, visual palettes
  and correct custom-rank image/fallback precedence, including editor previews.
- Home vehicle/identity/Group launch, locked private ride identity snapshots and
  authorized composite markers, without another GPS watcher or automatic sharing.
- Independent Going/Interested/Not going, atomic exact counts/private Home refs,
  bounded upcoming plans and reused private invitation/approval notification feed.
- Explicit personal/completed Group/Meet/Event contributions, trusted Club log and
  audience-scoped statistics in **CLUB_ACTIVITY/ClubActivity SQLite v4**. No copied
  GPS routes or browser-controlled aggregates. Private/Owner-Admin/members/public
  consent; owner defaults never override existing rider privacy.

Rules change for optional immutable ridingIdentity, separate RSVP and monotonic
activityEpochs coupled to ride deletion/Group departure; indexes stay
**19** plus pointsJson exemption. Existing Worker reader/Auth-lookup secrets and IAM
are reused without additional permissions; no new secret. Retain live v1/v2, media
v3 and private R2. No RTDB/frontend-build/paid-service activation. Deploy reviewed
Rules, Worker/v4, then Pages after approval. See DEPLOYMENT_CHECKLIST.md.

Prototype boundaries: 100 contributions/Club, 30/rider/Club, <=100KB ledger, ten
records/page. Fresh entries and aggregate proofs recheck source/membership. Private monotonic
activityEpochs couple ride deletion and Group departure/removal to immediate
aggregate exclusion. Remaining valid records can temporarily understate totals
until page reads/hourly sweeps reconcile them (up to ten hours, longer on outage). Counts describe only visible
contributions. Group participation is not verified physical attendance. No route
preview/public Club browsing UI or automatic contribution is implied. Private
ride metrics remain user-supplied, unsuitable for trusted rewards.

Final evidence, files and logical commits: [BATCH_8_5_RESULT.md](BATCH_8_5_RESULT.md).
Final local checks: **1,116 distinct Firestore assertions**, **118 Worker tests
(20 native workerd/R2/SQLite)**, **116 browser groups/cases**, **68 locked RTDB**,
**2 Pages groups (435 references/112 URLs)**, **10 deployment contracts** and
**3 YAML/15 Bash** checks pass, with zero final failures or skipped tests.
Physical Safari/Android cameras/GPS, production IAM/rules/DO/quota acceptance remain
NOT RUN. Trusted complete erasure must inventory new RSVP refs and Club DO data;
Auth deletion alone remains insufficient. Wider beta remains gated. All account,
Official/reward, commercial/NFC/merchandise and final-brand requirements remain in
IDEA.md. The following dated Batch 8/earlier descriptions are historical.

---

# Current Batch 8 — 2026-10-15

**Implemented locally, not deployed or accepted on real phones.** Version
1.6.0-batch8. Sequential milestones 0–10 are complete with logical local commits;
final verification and operator documentation are recorded in BATCH_8_RESULT.md.
Final local evidence: **997 Firestore**, **98 Worker (19 native workerd/R2/SQLite)**,
**102 browser groups/cases**, **68 locked RTDB**, **2 Pages groups (356 refs/99 URLs)**,
**10 deployment contracts**, **3 YAML/15 Bash** checks passed, zero final failures/
skips. Latest related media/browser hardening reruns pass; no real Firebase/phone
acceptance inferred. Exact distinctions/intermediate failures: BATCH_8_RESULT.md.
The last explicit operator deployment report was 6B; no new production operation
or paid service was performed by this batch.

Saved details/replay collapse independently, preserve playback/rate and restore
red default route/gold progress. Shared image preparation strips original EXIF/GPS,
bounded cropping/resize produces JPEG or rank PNG. Profile/avatar/banner, six-slot
vehicle galleries/covers/order/showcase, Club/logo/banner, Group/Event/Meet/Ride
banners, decorative rank icons/badges and controlled visual templates are connected.

Private R2 motodash-media uses MEDIA_BUCKET in the existing Worker, new serialized
MediaState/v3 beside retained live v1/v2. Current source/ownership/incarnation,
publication, roles, private audience, bans and Auth revocation are checked server-side.
Quotas/rates/revision fences and deny-first cleanup/journals cover interrupted and
concurrent writes. Firestore mediaRecords contains private references only; all
client operations deny. Existing Rules boundaries and 19 composites stay; the
source adds explicit mirror denial and the manual workflow's new security suite.

Publication gates: operator private-bucket/plan verification, dedicated encrypted
MEDIA_SERVICE_ACCOUNT/IAM and Worker v3, reviewed Rules/indexes, Pages last; real
Firebase/Auth/IAM/media/two-account/phone acceptance NOT RUN. No service-account
key in source/YAML, no public R2, Firebase Storage, RTDB activation or frontend build.
Complete account deletion, wider abuse/moderation/capacity/provider acceptance and
all future account/Official/reward/Stripe/NFC/merch/final-brand requirements remain.
Use DEPLOYMENT_CHECKLIST.md's Batch 8 runbook, not the dated deployment claims below.

---

# MotoDashboard implementation status

**Current, 2026-10-14:** the operator reports Batch 6B deployed/core working.
Batch 7 milestones 0–7 are complete locally under the
new explicit request. See BATCH_7_RESULT.md and IDEA.md Section 22. No application
push/deployment/production operation in this batch. People discovery is implemented
locally with 96 new Rules assertions, 5 browser cases and retained 6B regressions;
new profileDirectory composite raises the source inventory to 19.
Showcase now has direct publish/hide/featured actions, effective visibility labels,
public links and an owner visitor-policy preview. Eight Batch 7 browser cases and
existing 6B security/browser/Pages regressions pass. Production phone acceptance pending.
Camera now uses one visual RAF, unscaled rotation coverage, speed-aware half-step
zoom/hysteresis, Home follow-zoom preference and explicit manual interruption.
Full browser regression passes with 11 Batch 7 cases/26 nested camera assertions;
GPS recording samples and existing live markers/themes remain separate/preserved.
Dedicated saved-ride mode hides/inerts current telemetry and recording controls,
shows only recorded metadata/route, supports EN/FI/export/share and returns to
History. Twelve cumulative Batch 7 cases and the full existing matrix pass.
Recorded replay adds timestamp-based controls, gaps/overview fallback, bounded map
geometry and local/cloud route reuse without new GPS/uploads. Fourteen cumulative
Batch 7 cases, 25 replay assertions and existing regressions pass.
Pending reads now coalesce by same account/SDK reference; initialization/profile/
live identity deadlines and scoped Auth/unavailable diagnostics prevent unbounded
loading. Sixteen cumulative Batch 7 and 13 Batch 6A cases pass; no automatic write
retry or unproven Wi-Fi/transport fix. Final version is 1.5.0-batch7.
Final evidence: **936 distinct Firestore assertions**, **66 Worker (17 actual workerd)**,
**68 locked RTDB**, **93 browser groups/cases** (24 legacy +20 B5 +13 B6A +20 B6B +16 B7),
**26 camera +25 replay nested assertions**, **2 Pages groups (327 references/92 URLs)**,
**10 deployment contracts**, **3 YAML/15 Bash blocks**. Final completed runs have
zero failed/skipped. Physical phones/native Safari/production acceptance are NOT RUN.
Rollout after approval: pause automatic Pages, publish reviewed main, manual Rules/
indexes, wait all 19 Enabled, Pages last. No Worker run/new credential/cost service.
is historical; physical/security acceptance is not inferred from reported publication.

## Historical Batch 6B local evidence (2026-10-13)

Updated **2026-10-13**. The operator now reports Batch 6A deployed and working.
**Batch 6B milestones 0–8 are complete locally**, with sequential commits and the
audit/result in [BATCH_6B_RESULT.md](BATCH_6B_RESULT.md). This scope replaces the earlier
account-recovery proposal without removing future account requirements. No push,
deployment, production operation or Batch 7 implementation was performed.

| Batch 6B area | Local result / remaining boundary |
| --- | --- |
| Anonymous landing | Original SVG/CSS, real-feature sections, indicative prices, EN/FI and reduced motion; explicit guest entry, no automatic GPS |
| Public identity | Private by default, opaque stable URLs, minimal projections, owner-only editing and server reads; Members-only audience deferred |
| Garage showcase | Explicit card opt-in, separate public text, controlled featured selection and source privacy/deletion/incarnation gates; no media or subscription restriction |
| Customization | Safe name/bio/category/preset accent/banner, initial avatar and opted-in current public Club/rank cards; no arbitrary HTML/CSS or technical privileges |
| Ride continuity | Return to Ride beside bell across five screens; owned record/vehicle/statistics and shared GPS preserved; Home retains enabled sharing, refresh requires fresh live consent |
| Personal ownership | Web Locks or atomic expiring IndexedDB lease across tabs; no safe primitive means recording fails visibly; personal recordings are not globally locked across devices |
| Live ownership | Atomic verified-UID SQLite coordinator, nonce-safe renewal/release and bounded abandoned claims; LIVE_IDENTITIES/v2 must be deployed beside retained LIVE_ROOMS/v1 |
| Final documentation | Current model/roadmap, cleanup inventory, browser-only ordered rollout and physical acceptance procedure; no obsolete runtime files were proven safe to remove |

Final checks pass: **840 Firestore**, **66 Worker (17 workerd)**,
**68 locked RTDB**, **77 browser groups/named cases**, **10 deployment contracts**,
**3 YAML / 15 Bash blocks**, and **2 Pages groups (294 references / 83 URLs)**.
Final completed runs: **0 failed, 0 skipped**. Native Safari/phones and real
production Firebase remain NOT RUN. See BATCH_6B_RESULT.md for nested-count rules
and intermediate test failures/refinements; publication is not acceptance.
Required rollout: reviewed Rules → coordinated Worker → Pages, with the existing
automatic Pages workflow paused before publishing main. Index definitions/exemption
are unchanged; no new secrets, IAM write grant or paid service. Real acceptance and
complete account erasure before a wider public beta remain gates.

## Batch 6A reference implementation — deployment reported by operator

| Milestone | Current result / acceptance boundary |
| --- | --- |
| Dashboard | Reproduced Leaflet label at 26px × 984px; explicit width/bounded lines, named HUD grid, portrait/landscape controls and compact status. Chromium fixtures pass; physical Safari/Android pending. |
| Firebase reliability | Safe operation codes, distinct offline/deadline/permission/precondition, read-only bounded retry, four-row hydration concurrency and recoverable Home. Production Wi-Fi/cellular symptom remains unconfirmed. |
| Open activity category | Club/Group/Lobby/discovery validation and Rules accept open; Garage rejects it and keeps 12 real categories. No index/schema migration. |
| Group lifecycle | Shared state listener, Host Home/end confirmation, terminal transitions and server deadline enforced by Rules/Worker/DO alarms. Expired stored records may retain old state; live rights deny. |
| Notification center | Private invitation and Club/Group approval notices, source proofs, bell/count/read/target/Auth return/EN-FI. Club event and Group update/cancel fan-out deferred pending trusted delivery. |
| Publication | 6A deployment/working status now reported by operator. 6B needs its own Rules/Worker/v2/frontend rollout; see the current checklist. |

Evidence and limitations: [BATCH_6A_RESULT.md](BATCH_6A_RESULT.md). Operator steps:
[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

Historical 6A local tests: **705 distinct Firestore assertions**, **50 Worker tests**, **68 RTDB
denials**, **10 deployment contracts**, **3 YAML/15 Bash blocks**, Pages checks and
the full browser matrix (**24 legacy groups + 20 Batch 5 + 13 Batch 6A**).
Final passing runs have **0 failed, 0 skipped**. Physical Safari/WebKit and production
Firebase/device tests are **NOT RUN**, not inferred from mobile Chromium fixtures.

## Evidence levels

- **Implemented:** a connected source-code flow exists.
- **Deployed (operator report):** the user confirms publication/configuration; this
  audit did not access authenticated Firebase/Cloudflare consoles or certify live behavior.
- **Locally tested:** automated fixtures, real localhost emulators or local workerd.
- **Acceptance pending:** actual production accounts, phones, GPS and user workflows.

| Area | Implementation and deployment | Acceptance still pending |
| --- | --- | --- |
| Batch 5 shell/design/localization | Home/Discover/Rides/Clubs/Profile, reusable dark/gold cards/components, native panels/dialogs and EN/FI; Pages publication reported | Safari/Android keyboard, text scaling, accessibility and usability |
| Dashboard/recording/history | Existing GPS/map/heading/weather, validated segmented local recording, account isolation, private completed cloud uploads, retry, exports | Real providers/GPS, suspension/battery, offline recovery and multi-tab use |
| Accounts/Garage | Email/password + confirmation, names/language, private Garage/default/ride vehicle; Auth/Firestore configured | Actual registration/login/refresh, two-account access and missing-profile recovery |
| Clubs | Safe page/directory, technical roles separate from ranks, approvals/addressed invites, branding/Wall, irreversible retirement | Full production permission matrix and retained-ID lifecycle |
| Groups/Lobby/QR | Ride/Drive/Meet/Event, four visibility modes, admission/lifecycle, safe discovery/filters/pagination, Club links and Group QR | Club QR UI is still missing; production query/invitation outcomes and physical QR scan/return flow |
| Live groups | Cloudflare token/ticket/Firestore authorization, DO rooms, consent/current positions/reconnect/status/separation; Worker/DO deployment reported | Authenticated two-phone use, silent revocation, real latency and suspension/hibernation |
| Firebase deployment | Dedicated main-only manual Rules/index workflow; latest Rules deployed and all 18 composites Enabled, per operator | Version/effective-policy acceptance, single-field exemptions and project settings evidence |
| RTDB | Deny-all source, no frontend initializer/transport; retained security tests | Operator policy verification if not recorded; never enable it for live use |

Production URLs: [Pages](https://eggheadstudio.github.io/MotoDashboard/), live Worker
**https://motodash-live.old-sound-55f2.workers.dev**. Allowed browser origin is
**https://eggheadstudio.github.io**. Firebase project is **motodash-87bf8**.
Direct Worker navigation without the allowed Origin is expected to be denied.

## Post-Batch 5 cleanup

- Removed only `js/gestures.js`: no runtime/test/config/workflow consumer; its old
  planning references describe a never-integrated theme-swipe prototype.
- Removed unused `selectedVehicle` import from `js/ui/shell.js`.
- Reviewed generated caches/dry-run artifacts separately from working source;
  retained installed Worker dependencies because the operator cannot install tools.
- Preserved Rules/schema/protocol/GPS/business logic and all useful tests.
- Replaced contradictory current README/status/checklist text; archived full prior
  status/checklist and the unique retired-branch guide under docs/history/pre-batch6.
- Main represents all required Firebase setup functionality. The old branch has an
  unmerged historical commit, so branch deletion is recommended after review; no
  branch has been deleted. Exact optional commands are in REPOSITORY_AUDIT.md.

## Historical post-Batch 5 audit checks ? 2026-10-12

Final results are recorded in [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md). Baseline
reruns and nested named browser cases are counted once, not added as independent suites.
These tests do not certify production indexes, real Firebase access or phone behavior.

Audit results: **24 existing browser groups + 20 Batch 5 cases**, **626 Firestore**
assertions, **68 RTDB deny-all** assertions, **47 Worker** tests, **2 Pages groups**
(218 references / 69 URLs), and **10 deployment-contract cases** passed. All **3
workflow YAMLs / 15 Bash blocks**, 7 confirmation/scope cases and 8 credential-identity
cases passed. Final suites: **0 failed, 0 skipped**. Root npm test rebuilt its removed
bundle and passed the same 47 Worker tests; that rerun is counted once.

## Remaining technical debt and launch gates

- User acceptance is still required; publication alone did not prove the reported
  invitation/Lobby failure resolved. Index absence is no longer a reported blocker.
- Complete account deletion is missing. Retired Club IDs must survive trusted
  erasure; Auth deletion alone would leave Firestore children, ownership and live access.
- Password reset/change and Google sign-in/linking remain planned.
- Club links are shareable, but Club QR generation/share UI is not implemented;
  Group QR code generation is implemented. Preserve the separate Club QR requirement.
- app.js remains large; lifecycle/render/store extraction requires separately
  reviewed regressions. Batch 6B adds exclusive same-origin/account recording locks;
  it does not add a cross-device private-recording service.
- Bounded Group/Club hydration creates multiple document reads per row. Measure
  real reads before changing admission/privacy logic or adding polling/listeners.
- UI intervals/listeners/observers are page-lifetime and should gain teardown before
  future repeated mounts. Display-profile cache now has a 200-entry bound and TTL.
- JSON service-account keys require operator rotation; the Cloudflare read-only reader
  and Firebase configuration deployer must remain separate.
- Live authority leases last 30 seconds; disabled/revoked Auth tokens can remain valid
  until expiry. Whole-service abuse limits, capacity, hibernation and mobile latency
  need measurement. Historical Spark workload/cost estimates are planning evidence.
- Uploaded photos/branding, Official activities/trusted rewards and paid entitlements
  are absent. No Storage service, system-admin UI, Stripe or NFC code is implied.
- No offline cold-start/background tracking guarantee; weather/tile provider licensing
  and commercial terms require a fresh review before monetization.

## Recommended next implementation

The authoritative scope and dependencies are in IDEA.md. Finish approved Batch 6B
publication/phone acceptance and capture remaining operation-specific network
failures. Account recovery/password changes and Pages-compatible Google linking
remain future work requiring explicit approval.
Approve trusted full-deletion ownership/retention/backend/IAM/cost design before
implementing erasure. Wider public beta remains gated on complete deletion and
security/device acceptance. Media, Official rewards and commercial features follow
these foundations and retain their original requirements.

## Historical evidence

Post-audit mobile browser color fix: index.html declares dark color-scheme and
#101214 theme color; design-system.css gives html/body the same opaque background
as the app; manifest install colors match. Mobile Chromium light/dark appearance
checks and both Pages regression groups passed. Native iPhone Safari toolbar
appearance still requires manual verification after publication. No push/deploy.
Safari color sampling reference: [WebKit](https://bugs.webkit.org/show_bug.cgi?id=301756).

Original implementations, failed/repaired security assertions, migration rationale,
older test counts and old authorization boundaries are preserved in the
[pre-Batch 6 status archive](docs/history/pre-batch6/IMPLEMENTATION_STATUS.md),
[checklist archive](docs/history/pre-batch6/DEPLOYMENT_CHECKLIST.md), IDEA.md's dated
historical sections and BATCH_3/4/5_RESULT.md. They are not current deployment instructions.

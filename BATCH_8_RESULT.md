# Batch 8 — local implementation

Authorized scope: milestones 0–10 from the user attachment. Baseline main is clean
and matches origin/main. No push, deployment, production write or paid activation.

## Audit and plan

Reuse Firebase identity, read-only live authority, Pages native modules, private
Garage/projection source gates, Club roles/retirement and Group admission. RTDB
stays locked. R2 is selected and authorized for local implementation; provisioning
and any billing remain operator actions. No Firebase Storage or second project.

Saved-view root cause: replay hard-coded gray overview; panels lacked independent
disclosures. Milestone 0 adds native details panels, dimension recalculation and
red default/gold progress without touching recorded data or exports.

Media will use the existing Worker with private MEDIA_BUCKET, server-generated
object IDs, current source/incarnation checks on every read/write and a durable
serialized registry for quotas, rates, races and garbage collection. Firestore
stores references only; a separate media writer secret is required, preserving the
existing read-only live credential. Public-profile opt-in does not publish photos
automatically. Browser decoding/re-encoding removes EXIF; the server accepts only
strictly inspected raster containers, never arbitrary SVG.

Milestones and exact final tests/commit inventory will be recorded as completed.

Milestone 1: private R2 binding and additive SQLite MediaState/v3; exact source
authorization, per-image publication, signature/dimension/size gates, hashed caller
rates, owner/global quotas, optimistic revision fences, revocation checks and
deny-first deletion with retry journal. Private Firestore mediaRecords mirror
explicitly denies all client operations; previous deny-all already had this effect.
No composite/index change. Existing live bindings/origin/reader are preserved.
Local dry-run build, 11 policy/container groups and actual workerd/R2 lifecycle
passed. The first full Worker run had a duplicate-case cache-header failure;
normalized Headers fixed it, and the actual media runtime rerun passed. Final full
regression will be rerun at milestone 10. No production test is claimed.

Milestone 2: browser signature preflight, mobile-friendly image decode, bounded
crop/zoom/position, 1600px JPEG canvas re-encoding and 1.5MB upload cap. Originals,
EXIF/GPS and arbitrary SVG never upload. Native fetch/XHR use Auth headers only,
no credential URL or image cache, scoped deadlines/progress and account-change
abort/blob revocation. One browser preparation group (five format/rejection paths)
passed, zero failed/skipped; actual phone camera/HEIC remains manual acceptance.

Milestone 3: shared accessible media editor in Profile settings, avatar/banner
slots, independent public photo opt-in, crop/preview/progress/replace/remove;
private/public profile rendering uses current authorized Worker responses and
initial placeholders. Own profile hero also renders private owner media.
Two cumulative browser groups pass (preparation plus Profile/editor EN/FI at320px).
11 backend policy/container groups and the R2 runtime lifecycle passed previously;
production R2/Auth and physical devices remain untested.

Milestone 0 verification: 17 focused browser cases/groups (including 26 camera and
25 replay nested assertions) passed, 0 failed/skipped. Mobile disclosures preserve
playback, speed and more than 250px clear map space with both collapsed; exports,
EN/FI and GPS teardown retained. Physical Safari/device acceptance not run.

Milestone 4: six private vehicle slots, first/featured cover, bounded gallery,
reordering, replace/remove, private Garage cover and independently published
showcase gallery. Current source/profile/ref/incarnation gates revoke public
access on hiding/deletion; private Garage is never broadly readable. Three
cumulative browser groups pass, including two photos/cover reordering. Existing
backend Garage privacy/deletion/incarnation assertions remain unchanged.

Milestone 5: current Owner/Admin branding gates, Club logo/banner and safe
secondary/accent/header/card presets with live preview. Club cards and headers
retain placeholders and readable text. Four cumulative browser groups pass. The
preset test found FormData was captured after selects were disabled; capturing
values before disabling fixed the underlying save failure. Backend role/rank/
revocation denials are retained; no permission-schema change.

Milestone 6: Event/Meet/Ride/Drive use existing Group identity, banner and safe
theme editor, with media on shared Discover/detail/Club activity cards. Private
and unlisted media require admitted audiences; invitations alone are not image
access. Five cumulative browser groups pass (all three requested activity forms).
Baseline browser fixtures now intercept media so no production Worker request is
made; existing live-test token replacement remains supported.

Milestone 7: original vetted Shield/Star/Flag/Wheel SVG paths; plain/pill/crest
badges, controlled colors, rank preview and optimized PNG (<=256px) uploads.
JPEG/SVG rank uploads are denied server-side; raster replacement/removal shares
the safe lifecycle. Club member/rank views render decorative graphics only. Six
cumulative browser groups pass, including icon/badge saving and PNG preparation.
No role, rank authorization or existing Firestore schema changed.

Milestone 8: controlled accent/secondary/header/card/grid-list templates across
profiles, public/private Garage, Clubs and all Group activity types. Live preview
and reset, safe inherited variables/templates, image scrims and contrast checks;
no arbitrary HTML/CSS, entitlement, global logo or typography redesign. Seven
cumulative browser groups pass, including reset/layout and >=4.5 preset text
contrast. Narrow real-phone/text-scale acceptance remains manual.

Milestone 9: source-lifetime cleanup distinct from roles; metadata retry journals
cannot resurrect retired images; bounded source/resource rotation, stream/reader
deadlines, exact dedicated writer identity, optimistic concurrent mutation fences,
quota accounting including temporary/pending/deleting objects and per-photo
publication without re-upload. Auth-disabled/revoked accounts are checked on each
media request; this does not change live-token expiry behavior. Local evidence:
29 media container/policy/state groups, 2 native gateway/R2/SQLite groups, 61 real
Firestore mirror-denial assertions and 8 cumulative media browser groups pass.
Zero final failed/skipped. Final integrated rerun remains milestone 10.


## Milestone 10 — final integrated verification and operator handoff

Version **1.6.0-batch8**, final date **2026-10-15** (scope began 2026-10-14).
All milestones complete as local implementation. **NOT DEPLOYED / real acceptance
NOT RUN**, no paid service activated and no Batch 9. Backend/Pages deployment and
manual tests are explicit remaining gates, not completion inferred from emulators.

| Completed local check | Exact final evidence |
| --- | --- |
| Firestore actual demo emulator | **997 distinct passed**, 0 failed/skipped: 102 baseline +137 Club security +273 Groups +32 identity +82 B5 +79 B6A +135 B6B +96 B7 +61 B8. Repeated baseline executions counted once |
| Worker build/full suite | **98 passed**, 0 failed/skipped, including **19 native workerd/R2/SQLite groups** and 30 new deterministic media container/policy/authority/race/cleanup/quota groups. Google/Firestore/Auth replies are fixtures, not live cloud |
| Browser full regression | **102 groups/named cases passed**, 0 final failed/skipped: 93 prior +1 saved-panel regression +8 media groups. Raw log has 104 PASS lines including two B5/B6A summaries; those are not extra tests |
| Latest focused browser evidence | Final 8 media groups (7 nested prep/rejection paths plus UTF-8 parity/accents), and 17 B7/saved groups pass after related hardening. Counts included above, not added |
| Nested domains | Existing 26 camera/25 replay and 36 domain/17 confirmation assertions remain passing within browser groups, not additional totals |
| Locked RTDB | **68 passed**, 0 failed/skipped; localhost deny-all only |
| GitHub Pages | **2 groups**, **356 literal references /99 local URLs HTTP200** under /MotoDashboard/; Firebase/media unavailable retains guest GPS/history |
| Deployment | **10 contracts**, exact 19 composites/exemption, Firestore-only config, **3 workflow YAML/15 Bash** syntax checks; no workflow dispatched |
| Not run | Production R2/IAM/real Auth revocation/Rules/19-index status, physical cameras/GPS/phones/native Safari/WebKit, live two-account media or latency/CPU/battery/usage measurement |

Intermediate failures/limits retained: first native media test found duplicate-case
cache headers (fixed by normalized Headers); theme saves captured FormData after
disabling selects (fixed by capturing first); new nested disclosures required scoped
browser selectors rather than clicking hidden copies. The first complete browser
run timed out awaiting initial Auth UI in identity fixture; focused unchanged
expectations and the complete rerun passed. No timeout was raised or security
assertion weakened; the transient startup cause remains unconfirmed. Windows ASCII
stdin damaged some new Finnish literals; UTF-8/direct patches repaired them and
accent/key-parity regression now passes. Final hardening adds predecode dimensions/
animation rejection, transparent rank PNG, strict baseline-JPEG marker/metadata
checks, preset inheritance, canonical Club-owner/retained organizer reads, exact
quota replacement accounting and current media refresh/observer teardown.
Every image read also proves current ledger slot/incarnation; a crash after replacing
references but before old-object retirement cannot keep the old ID readable.

### R2, Firestore, Worker and deployment changes

- Existing **motodash-live** gains private **MEDIA_BUCKET → motodash-media**,
  **MEDIA_STATE → MediaState / SQLite v3**, preserving **LIVE_ROOMS/v1**,
  **LIVE_IDENTITIES/v2**, FIREBASE_PROJECT_ID, allowed origin and live secrets.
- New runtime **encrypted Cloudflare MEDIA_SERVICE_ACCOUNT**, exact dedicated
  **motodash-media@motodash-87bf8.iam.gserviceaccount.com**. Custom six-permission
  template: cloudflare/media-writer-role.json. IAM bypasses Rules/project-wide;
  never reuse/increase the live read-only reader or configuration deployer key.
- Firestore **mediaRecords** mirrors references only; all client reads/writes deny.
  Explicit denial is added to the Rules source; previous unknown-path deny already
  enforced it. Existing Profile/Garage/Club/Group/recording schemas stay unchanged.
  **No index change:** 19 composites plus routeChunks.pointsJson exemption retained.
- Manual Firebase workflow adds the real B8 denial suite; existing Worker workflow
  is now explicitly repository/main-only, with existing official action and no inputs.
  Pages artifact/workflow stays intact and includes native media modules/CSS.
- Operator order after approval: verify private R2/plan + dedicated media IAM/secret,
  pause Pages automatic push, publish reviewed main, manual **Validate or deploy
  MotoDash Firestore** (main, deploy, confirmation motodash-87bf8, rules-and-indexes;
  rules-only sufficient if all 19 already verified), wait index Enabled, manual
  **Deploy MotoDash Cloudflare Worker** (main/no inputs), verify v3/R2/live bindings,
  then enable/manual **Deploy to GitHub Pages** (main/no inputs).

No new GitHub secret: keep existing CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID and
FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON. New media key remains solely in encrypted
Cloudflare secret. No R2 S3 credential/public r2.dev, Firebase Storage/Blaze upgrade,
new frontend build/dependency, Cloudflare account or Firebase project.

Exact setup, costs/usage estimates, real two-account media test, mobile acceptance
and compatible frontend/Rules/Worker rollback: **DEPLOYMENT_CHECKLIST.md** current
Batch 8 section. It includes key rotation and forbids dropping existing namespaces,
weakening Rules, clearing private rides or marking privileged Console reads as
client security proof. Expected prototype storage (20 testers ×10 ×250KB ≈50MB)
fits the documented R2 Standard allowance in isolation; other account usage and
Worker/DO/Firestore/Auth costs remain separate. No $0 bill or paid readiness assumed.

### Remaining security and operational limitations

- Real provisioning/IAM/versions/two-account/device acceptance are blockers before
  calling this deployed/accepted. R2 may require billing enrollment; no paid
  activation/plan change is authorized or performed automatically.
- One serialized bounded prototype registry, shared 2500/day allowance and hashed
  per-caller quotas can be exhausted; no internet-scale abuse/availability guarantee.
  Project-level writer IAM is not limited by client Rules to mediaRecords. Protect/
  rotate the secret and monitor current source reads/Auth lookups/DO/R2 operations.
- Server container validation is not full JPEG/WebP entropy decoding or content
  moderation. Sources are preflighted/decoded/re-encoded in browser; only prepared
  supported raster containers pass backend checks, never arbitrary SVG/metadata.
- Privacy and source deletion revoke new fetches. Already downloaded public images
  cannot be recalled. Hourly rotating bounded cleanup may need about 80h at full
  capacity and longer during outages; denied access is not completed physical erasure.
  Completed Groups retain banners; membership/role loss alone is not deletion.
- Future trusted complete account deletion must drain all media mirrors/registries/
  journals/R2 and resolve owned community resources, alongside existing personal,
  live and retired-ID data. Auth-only removal remains inadequate and wider beta gated.
- Existing live lease/token-expiry behavior, native background/GPS/camera limits,
  provider commercial terms, optional members-only profile policy and network-root
  uncertainty remain. No feature or test claims real phone/production verification.
- Account recovery/Google/full erasure, Official activities/safe rewards, broadcast
  notifications/Club QR, subscriptions/Stripe, NFC, merchandise, final global logo/
  typography/mobile/accessibility/performance and optional marketplace remain agreed.

### Logical local commits

| Milestone | Commit |
| --- | --- |
| 0 saved corrections/audit | 3108b5e |
| 1 private R2 authority/lifecycle | 5c1b5a5 |
| 2 preparation/client | 244c8b2 |
| 3 profile media | b318c3a |
| 4 Garage galleries/showcase | c20a28b |
| 5 Club branding | 9d0846b |
| 6 activity banners | 1fdc649 |
| 7 decorative ranks | b5332ec |
| 8 templates/preview/reset | e5965a7 |
| 9 authorization/abuse/cleanup | cae7019 |
| 10 final regression/hardening/docs | This final commit: obtain SHA with git log -1 --oneline |

### Exact file inventory against baseline eb8a271

**20 new /32 modified /0 removed; 52 files.**

| Status | File |
| --- | --- |
| Modified | `.github/workflows/deploy-cloudflare.yml` |
| Modified | `.github/workflows/deploy-firebase.yml` |
| New | `BATCH_8_RESULT.md` |
| Modified | `CLOUDFLARE_SETUP.md` |
| Modified | `DATA_MODEL.md` |
| Modified | `DEPLOYMENT_CHECKLIST.md` |
| Modified | `FIREBASE_DEPLOYMENT.md` |
| Modified | `IDEA.md` |
| Modified | `IMPLEMENTATION_STATUS.md` |
| Modified | `README.md` |
| Modified | `cloudflare/README.md` |
| New | `cloudflare/media-writer-role.json` |
| New | `cloudflare/src/MediaState.js` |
| Modified | `cloudflare/src/index.js` |
| New | `cloudflare/src/mediaFirestore.js` |
| New | `cloudflare/src/mediaImage.js` |
| New | `cloudflare/src/mediaPolicy.js` |
| New | `cloudflare/src/mediaTheme.js` |
| New | `cloudflare/tests/media-fixtures.json` |
| New | `cloudflare/tests/media-image.test.js` |
| New | `cloudflare/tests/media-policy.test.js` |
| New | `cloudflare/tests/media-state.test.js` |
| Modified | `cloudflare/tests/runtime.test.js` |
| Modified | `cloudflare/wrangler.jsonc` |
| New | `css/media.css` |
| Modified | `css/saved-ride.css` |
| Modified | `firestore.rules` |
| Modified | `index.html` |
| Modified | `js/club-branding-ui.js` |
| Modified | `js/club-members-ui.js` |
| Modified | `js/config.js` |
| Modified | `js/garage-ui.js` |
| Modified | `js/group-ui.js` |
| New | `js/i18n/batch8.js` |
| Modified | `js/i18n/dictionary.js` |
| New | `js/media/media-client.js` |
| New | `js/media/media-editor.js` |
| New | `js/media/media-render.js` |
| New | `js/media/prepare-image.js` |
| New | `js/media/theme-editor.js` |
| Modified | `js/public-profile-ui.js` |
| Modified | `js/ui/cards.js` |
| Modified | `js/ui/icons.js` |
| Modified | `js/ui/ride-replay.js` |
| Modified | `js/ui/saved-ride.js` |
| Modified | `tests/batch7_browser.py` |
| New | `tests/batch8_browser.py` |
| Modified | `tests/firebase_mocks.py` |
| Modified | `tests/identity_browser.py` |
| New | `tests/run_batch8_rules.py` |
| Modified | `tests/run_browser.py` |
| Modified | `tools/validate_workflows.cjs` |

Useful security suites/history, locked RTDB, existing credentials/configuration,
Pages deployment and installed/cached development tools are retained. No file was
deleted from the committed baseline. Local demo emulators are stopped after final
checks; no production state changed.

**STOP after Batch 8; await explicit approval before publication or Batch 9.**

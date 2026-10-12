# MotoDashboard post-Batch 5 repository audit

Completed locally on **2026-10-12**, starting from main **0206f3e** and deployment
branch **070b9f2**. This is cleanup/documentation work, not Batch 6 implementation.
No push, production deployment/data operation or local/remote branch deletion occurred.

## Current state and evidence

The operator reports Batch 5 published on GitHub Pages, Firebase Auth/Firestore
configured, current Firestore Rules deployed, all **18 composites Enabled**, and
Cloudflare Worker/Durable Objects deployed. This audit accepts that as deployment
evidence supplied by the operator; it did not access authenticated consoles or
certify effective application authorization. Real-user, two-account and physical-
phone acceptance is still pending. Missing indexes are no longer a reported blocker.
The earlier invitation/Lobby failure still needs actual acceptance/reproduction.

Current URLs: [MotoDashboard](https://eggheadstudio.github.io/MotoDashboard/) and
**https://motodash-live.old-sound-55f2.workers.dev**. Direct Worker navigation without
the allowed Origin can return origin_denied; that does not prove admitted live use.

| Component | Current responsibility |
| --- | --- |
| Pages | Static index.html/CSS/native JS, public configs/install metadata; frontend-only artifact |
| Firebase Auth | Email/password identity and persistence, confirmation, display-name settings |
| Firestore | Private profiles/Garage/ride chunks, Club/Group authorization/admission and safe discovery projections |
| Cloudflare Worker | Fixed-project token verification and read-only Firestore authority gateway |
| One SQLite Durable Object per Group | One-use tickets, isolated hibernatable sockets and latest position state |
| Browser storage | Account-scoped IndexedDB/local fallback/outbox and separate guest rides |
| RTDB | Deny-all and unused; no client initializer/transport/live ACL mirroring |

The configuration deployer and live authorization reader are different service
accounts: the first configures Rules/indexes without document permissions, the second
reads known authority documents and has no write rights. Neither key belongs in Pages.

The eight current documents distinguish implemented code, operator-reported deployment
and pending acceptance. Primary references reviewed for future dependencies:
[Firebase Google redirect/storage restrictions](https://firebase.google.com/docs/auth/web/redirect-best-practices),
[Firestore nested deletion](https://firebase.google.com/docs/firestore/manage-data/delete-data),
[Storage billing prerequisite](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024),
[DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and
[Firestore quotas](https://firebase.google.com/docs/firestore/quotas). No account billing
plan or legacy inventory was inferred from these public documentation pages.

## Scope and inspection

Reviewed the tracked project structure (136 files at baseline), both branches, all
three Actions workflows, Firebase/Cloudflare configuration and security boundaries,
static and runtime-dynamic module paths, CSS/assets/manifest references, test runners/
fixtures, documentation links and ignored generated files. Read the complete IDEA.md
and reviewed the eight requested documents plus test/operator/historical records.

Inspected initialization, GPS/watch ownership, live connection stop/retry, UI listener/
interval ownership, account epochs, route/store/sync wrappers, bounded discovery/read
patterns, error mapping and localization bindings. The native frontend had **62 JS
modules**: **61 reachable** from app.js and one unreachable prototype. After removal,
all 61 retained modules are reachable. Firebase CDN imports are computed from the
pinned SDK base; they were inspected separately and exercised by browser checks.
The worker's entry/DO export/binding/migration are consistent. No missing imports found.

## Files removed

| File(s) | Evidence and disposition |
| --- | --- |
| `js/gestures.js` | Standalone theme-swipe prototype; no static/dynamic runtime import, test dependency, config or workflow consumer. Only three old IDEA audit/proposal references existed. Not a working user flow. Historical references now clearly say removed/superseded. Manual rotation/current map controls are retained. |
| `cloudflare/dist/README.md`, `index.js`, `index.js.map` | Ignored dry-run output; recreated by the supported test/build command. Removed after validation. |
| `cloudflare/cloudflare/dist/index.js`, `index.js.map` | Ignored stale duplicate dry-run output in an unintended nested folder; no runtime/config/test/docs consumer. Current runtime tests build/use cloudflare/dist only. |
| `.wrangler/cache/cf.json` | Ignored generated CLI cache, not configuration/source or a DO namespace. Removed without reading/logging its contents. |
| 12 `tests/__pycache__/*.pyc` and one `tools/__pycache__/*.pyc` | Ignored generated Python bytecode; source tests/tools retained. |

There were **19 distinct local generated files** in the initial cleanup inventory,
in addition to the one tracked module deletion. Final root validation deliberately
rebuilt the three supported Worker outputs; those regenerated files were removed
again afterward. Only explicit workspace-contained files were deleted; no recursive
purge, database/state directory deletion, installed dependency removal or production
operation was used. Generated removals are local housekeeping, not tracked deletions.

No tracked temporary screenshots, accidental debug logs, abandoned live RTDB files,
unused CSS files or unused image assets were found. Browser screenshots/tool caches
under the OS TEMP directory are outside this repository and were not purged.

## Files retained and why

| File/group | Reason |
| --- | --- |
| `database.rules.json`, `tests/run_realtime_rules.py` | Essential deny-all security contract and 68 negative/fixture assertions; not obsolete live code. Only diagnostic wording changed. |
| `firebase-config.js` including legacy databaseURL/storageBucket | Imported public web config. Those fields do not activate RTDB or prove Storage exists; avoid deleting configuration merely because a service is unused. |
| `firestore.rules`, indexes/config/role/validators | Current deployed contract and validated 18-index inventory; unchanged. |
| All `js/firebase/*Repository.js`, data/live/UI modules | Connected runtime flows; ownership/permission/data boundaries are not duplicate algorithms. |
| `css/dashboard.css`, `css/design-system.css` | Both loaded and used; the design system extends existing dashboard behavior and imports its styles. Dynamic classes prevent safe selector deletion from text searches alone. |
| `icon.svg`, `EggHeadStudio_logo.png`, manifest, `.nojekyll` | Referenced by HTML/CSS/install metadata/Pages allowlist. |
| `js/vendor/qrcodegen.js`, vendor README | Runtime QR generation, MIT attribution and independently decoded QR regression coverage. |
| All browser/security/Worker fixtures and tests | Actively run, including raw-client authorization, four original security failures, privacy/retirement, QR and live cleanup. Emulator-only token/key fixtures are not production credentials. |
| `cloudflare/package-lock.json`, installed ignored node_modules | Reproducible Worker tooling and existing tools for a restricted workstation; no local reinstall was necessary. Installed dependencies are not disposable cleanup targets here. |
| BATCH_3/4/5_RESULT.md and dated IDEA audit/results | Useful historical implementation/security/architecture evidence; clearly distinguish past scope from current status. |
| Old full status/checklist/test notes | Preserved under docs/history/pre-batch6; legacy Club inventory/orphans/retired-ID reasoning and detailed probes remain available. |

## Low-risk code/tooling improvements

1. Removed the unused `selectedVehicle` named import from js/ui/shell.js. Vehicle
   change callbacks and all rendering/selection behavior are preserved.
2. Removed the never-integrated gestures module after full reference/dependency checks.
3. Changed root package.json test command from raw node --test to
   **npm --prefix cloudflare test**. Runtime tests require a generated Worker bundle;
   the old command relied on a previous build being present. The current command uses
   the existing locked Worker test/build path and recreates the bundle on a clean checkout.
   It runs the same 47 Worker tests; browser tests remain their separate Python suite.
4. Updated RTDB test diagnostics to say Cloudflare is the live transport. All original
   denial expectations, fixture paths, Rules and assertions are unchanged.

No business-logic rewrite, schema change, Security Rules weakening, protocol change,
new GPS watcher, new websocket/polling or frontend dependency was introduced.

## Branch comparison and optional deletion

Baseline main: **0206f3e1c7adb617c05823c6aa7b560bb144eb0f**.
Old branch: **070b9f21f21d2d65060ec01ec7f0894084f3bcb7**.
Common ancestor: **4c3def567847af53733e36964ffaf54639dd1e81**.

The old branch has one genuinely unmerged historical commit. Main selectively copied
its useful deployment tooling in 0206f3e and retained Batch 5 in 613b5dc/ef5ebe1/bb97402.
Git ancestry does not show a merge, but the functional comparison shows:

- firebase.deploy.json, firebase-deployer-role.json, both validators, current
  firestore.rules/indexes and Batch 5 security-query tests are identical between tips.
- Main's workflow intentionally replaces the obsolete deployment-branch/WIF/environment
  guards with main-only manual dispatch and the dedicated JSON secret. Reverting to
  the branch would reintroduce superseded authentication/setup and older frontend files.
- The only branch-only file was FIREBASE_DEPLOYMENT_BRANCH.md, a retired procedure.
  Its full content is now preserved as docs/history/pre-batch6/FIREBASE_DEPLOYMENT_BRANCH_RETIRED.md.
- Its differing checklist text is superseded; complete main historical evidence is
  archived rather than merging stale deployment instructions into current guidance.

**Recommendation: delete firebase-deployment-setup after reviewing this audit.**
No useful functionality is missing from main, and no automatic merge is needed.
No branch was deleted. From the repository, the operator may execute these commands
only when choosing to delete both branch refs:

```powershell
git switch main
git status --short
git log --left-right --oneline main...firebase-deployment-setup
git diff main firebase-deployment-setup -- firebase.deploy.json firebase-deployer-role.json firestore.rules firestore.indexes.json tools/validate_firebase_deployment.py tests/run_firebase_deployment_contract.py tests/run_batch5_rules.py
git branch -D firebase-deployment-setup
git push origin --delete firebase-deployment-setup
```

Expect a clean tree and no functional differences in the explicit source comparison.
`-D` is deliberate **local branch-reference deletion**, not a force push: `git branch
-d` normally refuses this unmerged historical commit even though its useful changes
were copied. Review the comparison first. Remote deletion is a separate explicit push;
the default main branch, application deployment and production data are unaffected.
If the remote branch gains new commits after this audit, recompare before deleting.
GitHub's repository Branches page also allows operator-controlled remote deletion.

## Documentation updates

| Document | Current result |
| --- | --- |
| IDEA.md | Authoritative product scope retained; actual module tree, completed Group/Lobby/QR/Profile statuses, shipped redesign foundation, historical audit labels and ordered Batch 6 dependencies. All future requirements preserved. |
| README.md | Concise actual feature/architecture/deployment/test overview, privacy and current deployment/acceptance distinction. |
| IMPLEMENTATION_STATUS.md | Current implemented/deployed/local-tested/pending table and explicit remaining debt; old full record archived. |
| DEPLOYMENT_CHECKLIST.md | Current all-18-Enabled/Rules report, exact index table/exemption, separated deployments, legacy inventory, security/phone acceptance and secure rollback. Full older records/probes archived. |
| LIVE_TRACKING.md | Deployed endpoint/Cloudflare roles, current lease/consent/GPS/privacy behavior and pending acceptance; historical blocked RTDB proposal retained only as history. |
| DATA_MODEL.md | Current private/public boundaries, Group recipient guard and 18th Club index; retirement/erasure and future deletion inventory retained. |
| CLOUDFLARE_SETUP.md | Maintenance of the already deployed Worker/configured endpoint, 18-index inventory, existing workflow, separate reader credentials and unchanged DO migration/origin requirements. |
| FIREBASE_DEPLOYMENT.md | Future maintenance/manual main runs with the already successful deployment report; one dedicated secret/custom role, rotation and secure rollback. |
| tests/RULES_TESTING.md | Current counts/prerequisites, fixed demo isolation, preserved deny-all RTDB coverage, proper root test command and pending acceptance. |
| docs/history/pre-batch6/* | Complete former checklist/status/test notes and retired branch guide with explicit historical warnings and repaired relative links. |

Internal Markdown links and local module/asset paths were checked. Future example
collection/file names inside code fences are plans, not missing runtime dependencies.
Earlier financial/workload figures remain dated estimates, not live measurements or
new billing recommendations; verify current providers/plans before commercialization.

## Test results

All final runnable checks completed; **0 assertion failures and 0 skipped tests**.

| Check | Exact result / limitations |
| --- | --- |
| Full browser regression | **24 existing PASS groups + 20 named Batch 5 cases**; includes 36 domain assertions and 17 password-confirmation cases within those groups. Simulated GPS/product SDK/transport, real Leaflet and real pinned Firebase imports with cloud APIs blocked. |
| Firestore emulator | **626 distinct passed, 0 failed/skipped** = 102 baseline + 137 security + 273 Groups/Lobby + 32 identity + 82 Batch 5. Baseline reruns counted once. |
| Locked RTDB emulator | **68 passed, 0 failed/skipped**; current deny-all policy, no production/live RTDB support claim. |
| Cloudflare Worker | Dry-run bundle + **47 passed, 0 failed/skipped**, including **12 local workerd** cases with mocked token/Firestore/OAuth fixtures. |
| Root npm test | Passed the same **47** after deleting the generated bundle first; verified the corrected root command recreates its prerequisite. Rerun not added as another 47 distinct tests. |
| Pages compatibility | **2 PASS groups**, **218 literal references / 69 unique local URLs HTTP 200** under /MotoDashboard/; scoped legacy SW cleanup and unavailable-Firebase guest recording/history. |
| Deployment contracts | **10 passed, 0 failed/skipped**, exact 18 composites/exemption and Firestore-only config verified. |
| Workflow validation | **3 YAML files / 15 Bash blocks** checked; Firebase action SHA pins, main/project/scope/credential guards, **7 confirmation/scope + 8 credential-identity cases**, Pages trigger and Worker binding/migration alignment passed. No workflow dispatched. |
| Static/documentation review | No missing runtime imports; all retained frontend modules reachable; internal Markdown targets checked; no private-key/service-account JSON material in repository files. |

The initial browser attempt stopped at missing cached ZXing on PYTHONPATH; it was
rerun completely with the existing QR tool cache and passed without removing/skipping
coverage or installing software. RTDB startup initially used an invalid local CLI
flag value; corrected to Error before running its suite. These were environment/setup
interruptions, not application/security assertion failures. Logs/previews remain in
OS TEMP outside the repository. Both local demo emulators were stopped after testing.

No production Firebase client test, Cloudflare authenticated phone test, real GPS
ride, current usage/billing measurement or user acceptance was performed by this audit.

## Remaining technical debt and recommendations

| Priority | Finding / evidence | Recommended next step |
| --- | --- | --- |
| Before wider beta | Complete account deletion missing; retirement retains children and ownership references | Trusted idempotent erasure with reauthentication, live revocation, owned Club/Group policy, offline-write fences and permanent nonpersonal reservations |
| First Batch 6 checkpoint | Actual acceptance pending and prior invitation/Lobby symptom unverified | Run current two-account/phone matrix, record effective deployed versions and prioritize reproducible defects |
| Account UX | No password recovery/change or Google linking | Bounded account milestones with EN/FI, enumeration-safe feedback, reauthentication and a Pages-compatible provider/return design |
| Reliability | app.js ~2,115 lines mixes lifecycle/history/rendering; no exclusive multi-tab recorder lock | Preserve behavior now; separately design/test lifecycle extraction and concurrent-tab ownership/recovery |
| Read/performance | listMyGroups/Clubs and public Club cards hydrate multiple documents per row; Home/views can load the same summaries separately | Measure read counts/latency, then reduce redundant presentation reads while preserving canonical authority and UID-scoped cache boundaries |
| Local performance | Cloud history hydration repeatedly reloads the local store for individual records | Measure large-history behavior and consider a scoped snapshot/index; do not rewrite durable revision/delete behavior in cleanup |
| Lifecycle | initLiveUI timers and navigation observers/listeners have page-lifetime ownership; live-map disposer exists but initial map owns its lifetime | Add teardown/idempotent mounts before repeated component mounting; do not label single page-lifetime listeners a demonstrated leak |
| Memory | displayProfiles cache has 60s TTL and account clearing but no overall size/pruning bound | Add a measured bounded cache policy in reliability work; preserve minimal-profile privacy |
| Revocation/operations | 30s admission lease, no immediate Auth-disabled/revoked-token lookup, no whole-service HTTP abuse cap | Incident/abuse design and measured quotas before broad launch; do not weaken leases/checks to lower cost |
| Device/provider limits | No offline cold start/background GPS guarantee; map keepBuffer=12 and provider zoom behavior need real-device/network measurement | Explicit suspension/gap/battery/provider tests; commercial map/weather licensing review before monetization |
| UI completeness | Dark/gold redesign shipped; all light/dark theme, Safari/accessibility/physical camera requirements not accepted | Keep unfinished roadmap checks pending; prioritize real-user findings rather than another visual rewrite |
| Community completeness | Club link sharing exists, but only Group Sessions have QR generation/share UI; qr.js accepts session routes | Retain the agreed Club QR requirement and complete it in an approved community/UX milestone, preserving addressed authorization |
| Tooling maintenance | Firebase action SHAs pinned; Pages/Cloudflare use existing major tags | Review/action-pin upgrades later with tested workflow compatibility; no release-workflow mutation was needed now |

No active obsolete TODO/FIXME markers were found in frontend/Worker JS. Similar
function names in app.js/store/recorder mostly delegate to actual shared modules;
feature-specific action/browse/retry helpers are separate scoped functions. They
were retained. Some deadline races guard UI ownership but do not cancel underlying
SDK operations; state/epoch checks and Rules remain authoritative. No duplicate
Firebase app initialization, concurrent GPS watch path or unconditional extra live
socket was found; regression coverage exercises these boundaries.

## Proposed Batch 6 scope and dependencies

IDEA.md Section 19 is authoritative. Recommended first delivery: **6A acceptance
baseline + 6B password recovery/change/account-settings UX**. Then independently
reviewable **6C Google sign-in/linking**, **6D trusted complete-deletion design and
implementation only after ownership/backend/IAM/cost approval**, and **6E fixes for
measured reliability/onboarding problems**. Wider beta remains gated on full deletion
and actual security/device acceptance. Google redirect storage/Pages constraints
must be resolved before promising that flow; existing read-only Worker credentials
cannot be repurposed as a deletion administrator.

Subsequent approved milestones retain **vehicle photos, Club logos/banners, rank
graphics**, **Official MotoDash activities/all safe completion rules/trusted rewards**,
expanded **achievements/rewards**, **subscriptions/Stripe/trusted entitlements**, **NFC
invitations/hardware** and **merchandise**. They follow lifecycle/privacy/storage and
real demand rather than being silently removed or bundled into an oversized Batch 6.

This audit stops after local cleanup/documentation commits. No Batch 6 code,
automatic push/deploy or branch deletion is authorized by this report.

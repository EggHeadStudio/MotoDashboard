# MotoDashboard implementation status

Updated **2026-10-12**, after the operator reported successful Batch 5 and Firebase
Rules/index deployment. This audit made local cleanup/documentation changes only.
No production data, authentication settings, Rules, Worker or deployment was changed.

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

## Automated checks for this audit

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
- app.js remains roughly 2,115 lines; lifecycle/render/store extraction requires
  separately reviewed regressions. Multiple-tab recording has no exclusive owner lock.
- Bounded Group/Club hydration creates multiple document reads per row. Measure
  real reads before changing admission/privacy logic or adding polling/listeners.
- UI intervals/listeners/observers are page-lifetime and should gain teardown before
  future repeated mounts. Display-profile cache uses TTL but no total size bound.
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

The authoritative proposed Batch 6 scope and dependencies are in IDEA.md. First
record production/two-phone acceptance and prioritize reproducible problems; then
account recovery/password changes and Pages-compatible Google sign-in/linking.
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

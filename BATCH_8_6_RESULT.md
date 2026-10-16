# MotoDashboard Batch 8.6 - local product experience results

2026-10-16. Baseline 5c46455. Operator reports Batch 8.5 deployed. No push,
deployment, production mutation, paid service or Batch 9 is authorized here.

M0: [UX_AUDIT.md](UX_AUDIT.md), **264 baseline rendered cases** across 22 surfaces,
six sizes and EN/FI, plus read-only public landing reference. Actual screenshots
inspected; original screenshot fixture selector was corrected from replaced
club-identity to club-branding before completing the audit. Screenshots/manifest
stay in %TEMP%/motodash-ux86/before, with no private production data committed.

M1: reusable type/spacing/surface/radius/elevation/motion tokens, shared form/check
alignment, cards/dialogs/status/skeleton/toast/media/focus/navigation presentation.
System fonts/original icon vocabulary retained. One focused browser group passes:
normal text/muted/accent contrast >=4.5, six widths/no document overflow and five
existing navigation destinations. No backend/data/recording behavior changed.

M2: compact vehicle/photo/category, personal/Club and optional Group selectors;
Start precedes a separate explicit privacy/contribution disclosure. Removed the
redundant Group Open button (Continue to Group retains that authorized route),
cleared contribution offer when changing identity, styled reused private notices.
Two focused groups and all14 existing Batch8.5 browser groups pass. No new query,
listener, Group creation, GPS watch or automatic contribution/live consent.

M3: explicit Explore/all-activities state plus Ride/Meet/Event/Club/People
destinations in deliberate responsive rows, one purpose heading, balanced media
cards, semantic activity dates and contextual action descriptions. Fixed a real
People transition leaving global Loading stuck; optional query failure gets an
explicit scoped Retry. Existing bounded queries/privacy/pagination are retained.
Three focused groups and the20 named Batch5 regression cases pass.

M4: composed own/public profile heroes, actual already-loaded bio and explicit
privacy state; Edit and Account have separate hierarchy. Garage renders a vehicle
collection with a create toolbar, selected/featured/private states and authorized
View/Edit actions. No photo/profile is published automatically. Four focused
groups and all20 Batch6B browser groups pass, including public projection privacy,
account changes and exclusive recorder/Return to Ride behavior.

M5: reusable focus-aware in-page section navigation (no route change/refetch),
Club overview/upcoming/members/log/Wall hierarchy, clear create/join actions and
integer ride/rider/participation counts. Existing technical-role/private log and
lazy loading boundaries stay unchanged. Five focused groups and three existing
Club regression groups pass. A first Club run timed out waiting for initialization
after reload; an instrumented complete rerun passed without product/test weakening.
The final full matrix repeats this path. Baseline count-format expectations were
updated only for the deliberate integer presentation.

M6: shared Ride/Drive/Meet/Event hero with semantic date, approximate area, actual
organizer and distinct original activity graphics. Compact fallback artwork;
authorized banners keep a full image area. RSVP moves ahead of configuration with
in-page intent/vehicle/participant navigation, remaining separate from admission.
Six focused groups and all6 existing Group/Lobby/invitation/QR groups pass.

M7: semantic general/appearance/visibility/time/admission fieldsets and editor
section jumps reuse original controls, FormData and handlers. Native invalid
fields gain a visible/screen-reader invalid state that clears after correction.
Mode controls expose expanded state and authorized photo/management entry points;
repeated Edit entry no longer adds duplicate dirty-field listeners. Existing crop,
preview/palette/section-save/cancel/publication rules remain. Seven focused groups
and all8 media browser groups pass, including upload/replacement/gallery/theme.

M8: restrained readable speed, opaque high-contrast HUD surfaces, balanced compact
status cards and deliberate touch controls. Preserved map/camera geometry, toggles,
night/monochrome modes, smoothing/recording/live pipeline. Eight focused groups
and both live integration/client groups pass: one GPS watch through Return,
consent/HTTPS-WSS/errors/lease scope and logout/leave/local/remote-end cleanup.
The clear-map assertion measures the actual gap between speed and lower HUD;
an empty start-aligned grid child has zero own height despite a nonzero grid row.

M9: composed saved-ride header, compact locale control, readable tabular statistics,
clear Play action and touch timeline, preserving independent collapsible panels.
No replay/route/timestamp/gap/recording behavior changed. Nine focused groups and
the complete Batch7 People/showcase/camera/saved/replay regression pass, including
red route/gold progress, speeds/seek/gaps/export and zero replay GPS/cloud writes.

M10: dirty modal-close cancellation now prevents a second modal from stacking;
keyboard Skip to content keeps the current route/invitation fragment. Reused
structured honest history empty state, locale-aware navigation labels, no-motion
section focus, safe text scaling and lightweight touch/focus/forced-color feedback.
Twelve focused groups and both Pages groups pass (448 references/116 URLs at this
stage). Existing loading/error retry is scoped, with no automatic uncertain writes.

M11: actual264-case intermediate rendered review followed by corrections to
edge-to-edge card media, compact activity metadata, visible localized section
destinations, short Finnish Home and aligned profile actions. **264 matched before
and264 final after cases** pass at all six sizes/EN-FI, zero document/surface
overflow. Matched baseline comes from a read-only 5c46455 archive with the same
fixture UI setup. Screenshots were visually inspected on mobile/landscape/tablet/
desktop; thirteen focused product groups pass. See UX_AUDIT.md for exact evidence
and findings. Native Safari/physical camera/GPS/subjective acceptance remain NOT RUN.

M12 regression hardening: the full run exposed long Finnish Profile shortcuts
overflowing the two-column390px layout at200% text. Text-relative auto-fit columns,
wrapping owner actions and breakable labels fix the cause; checks now cover320,
390 and430 at200%, with targeted screenshots. Multiple same-kind media theme
editors also now receive distinct form/field/label IDs, preserving existing first
editor IDs and payloads. Fourteen focused groups, all20 Batch5 and all8 media
groups pass. A legacy global empty-state selector was scoped to its actual
Discover results because History now legitimately has an empty state too.

## Final handoff (2026-10-17)

Implementation started October16; final local verification crossed midnight.
Version **1.6.6-batch8.6**, baseline **5c46455**. Milestones 0-12 are complete
locally, including full regression/documentation/local commits. No independent
implementation is blocked. Publication approval and native two-account/phone
acceptance remain separate uncompleted gates. **Nothing pushed/deployed, no
production mutation or paid activation, no Batch9.**

### Design system and screens

css/product-experience.css is a scoped product layer over existing map/media/
design styles: 4/8/12/16/24/32/48 spacing scale, responsive system typography,
dark canvas/surface/raised hierarchy, restrained gold accent, readable text,
consistent corners/inputs/cards/dialogs/targets, quiet skeleton/status feedback,
focus/reduced-motion/forced-color support. No remote font, framework or build.
Existing controlled colors/templates/media permissions remain. Final global logo
and typeface are intentionally a later dedicated brand milestone.

Home, Discover, own/public Profile, Garage, Club and shared Ride/Meet/Event details,
editors, notifications, history/dashboard/saved replay now use that hierarchy.
The redesign also changes actual interaction structure: compact ride decisions,
semantic form groups, accessible section focus, explicit retry and modal/Skip
navigation guards. Existing data/authorization/business flows remain intact.

### Before/after evidence

- **264 matched before and264 after** local cases, plus264 intermediate review
  cases:22 surfaces x6 sizes x2 languages. Viewports320x568,390x844,430x932,
  844x390 landscape,768x1024 and1440x1000. Final document/surface overflow:zero.
- Actual Chromium screenshots inspected, with an additional correction pass for
  small Finnish Start, double-inset card images, offscreen section destinations,
  dense activity metadata and misaligned profile shortcuts. Evidence is rendered,
  not inferred from source or unit-test success. Read-only production landing was
  also captured with cloud requests/mutations blocked; no real login was used.
- Files outside Git: **%TEMP%/motodash-ux86/before/**, **review/**, **after/**, each
  with manifest.json. Compare matching filenames, e.g. home-fi-320x568.png,
  discover-en-390x844.png, profile-en-390x844.png, garage-en-390x844.png,
  club-detail-fi-430x932.png, group-detail-en-430x932.png,
  profile-edit-en-390x844.png, dashboard-en-390x844.png and
  saved-replay-fi-844x390.png. UX_AUDIT.md records the full surface/journey audit.
- Final baseline is a read-only archive of5c46455 in the same TEMP evidence root,
  using the identical fixture harness/UI save-and-select sequence. No temporary
  branch. Original public-profile fixture was corrected to use actual UI save,
  ensuring both versions show the same name/bio/vehicle selection.
- Temporary evidence can be removed by OS cleanup; regenerate with existing
  Playwright/Chromium and fixture dependencies, MOTODASH_VISUAL_PHASE=before/after,
  then python tests/run_browser.py --visual86. For baseline, run the same harness
  against archived5c46455. No application installation/build or real credential.

### Final automated evidence

| Suite | Final result | Scope |
| --- | --- | --- |
| Firestore emulator | 1,116 distinct passed,0 failed/0 skipped | All9 runners; repeated102 baseline counted once, fixed localhost demo only |
| Worker/R2/workerd | 118 passed,0 failed/0 skipped | Includes20 native workerd/R2/SQLite cases; Wrangler dry-run only |
| Browser | 130 groups/cases passed,0 failed/0 skipped | 116 existing +14 product groups; screenshot matrix counted separately |
| Locked RTDB | 68 passed,0 failed/0 skipped | Deny-all, fixed localhost only |
| Pages | 2 groups pass;448 refs/116 URLs HTTP200 | /MotoDashboard/, guest/local recording without Firebase and scoped legacy SW cleanup |
| Deployment | 10 contracts pass | Exact19 indexes/exemption, configuration/scope/credential guards |
| Workflow syntax | 3 YAML/15 Bash checks pass | No workflow executed; manual backend gates unchanged |
| Visual matrix | 264 matched before +264 after,0 final overflow | Chromium local fixtures, not native mobile Safari |

Local logs (TEMP): motodash-batch86-firestore-verified.log,
motodash-batch86-worker.log, motodash-batch86-browser-complete.log,
motodash-ux86-before-matched.log and motodash-ux86-after-final.log.
Actual Rules compilation/authorization ran in the emulator. Browser uses simulated
GPS and SDK fixtures; real Firebase13.0.0 imports are checked with cloud APIs
blocked. Worker fixtures use local runtimes and mocked Firebase/OAuth. These are
not real Firebase/Cloudflare/physical-phone acceptance claims.

Intermediate issues: an emulator cold-start fixture reset exceeded15s; the full
warmed run passed without changing Rules or timeouts. One Club initialization
wait failed on its first focused run; its complete instrumented rerun passed and
the full browser run repeats it. New test selectors were corrected to actual
localized labels/aria-controls, the HUD gap assertion to actual panel geometry,
and the older statistics assertion to deliberate integer count formatting. No
security expectation, useful test or feature was removed to obtain passing tests.
The final full browser run passes132 raw PASS lines: two are already-counted
Batch5/6A suite summaries, giving130 distinct groups/cases. First full attempts
exposed the scoped empty-state selector and the real200% Profile overflow above;
both are corrected and the complete suite was rerun. Three extra Finnish200%
Profile screenshots at320/390/430x568 are in after/, outside the264-case matrix.
Existing cached development tools were reused/repaired from existing bytecode;
no workstation software or paid infrastructure was installed/activated.

### Firebase, Cloudflare and deployment

**No changes** to firestore.rules, firestore.indexes.json, database.rules.json,
firebase.deploy.json, Firebase browser config, live-config.js, any Cloudflare
source/config/binding/protocol/secret/IAM, private R2 or any GitHub Actions workflow.
No schema/migration/index/credential/provider change. There remain19 indexes and
the pointsJson exemption. Current epoch/retirement/role/private-source/consent
protections remain, including immediate aggregate invalidation. GPS/camera/
recording/live/replay computation modules are unchanged.

After explicit approval: verify the reported8.5 backend prerequisites, publish
reviewed main and use existing **Deploy to GitHub Pages**, main/no inputs (main
push also triggers it). **Pages only** for this batch. Do not redeploy Firebase
or Cloudflare unnecessarily. No new secret or environment variable. Full exact
commands/Console checks/rollback: current DEPLOYMENT_CHECKLIST.md section.

### Manual two-phone acceptance - NOT RUN

Use disposable A/B, native iPhone Safari and Android Chromium, stationary/on foot.
No credentials, invitation secrets, private media or precise GPS in evidence.

1. Visitor/register/login/guest/invitation Auth return, actual errors and EN/FI.
2. 320/390/430 portrait, landscape/tablet, text scaling/reduced motion/keyboard;
   Start reachable, no clipping, correct browser chrome/safe areas.
3. Actual vehicle/Club identity, off/separate contribution, authorized Group detail,
   one active ride, no automatic GPS/live/Group/publication by selector changes.
4. Discover prefix search, categories/destinations/pagination/empty/error retry and
   correct public profile/showcase privacy; no fake recommendation counts/content.
5. Profile/Garage/Club/activity View/Edit, real photos/crop/theme/rank replacements,
   section Save/Cancel/validation and dirty close/Back. Decline keeps one modal.
6. Club membership/Join/upcoming/members/ranks/log/visible-only stats/Wall and all
   permission boundaries. Decorative rank never grants management or live access.
7. Ride/Meet/Event RSVP intent separate from actual approval/join/live consent.
8. Both share an approved active Group; actual map/avatar/Club/rank, weather/GPS,
   one connection/watcher, Return, failures and logout/leave/end/removal cleanup.
9. Finish/sync/History/replay/collapse/seek/speed/overview/gaps/colors/export/Back,
   no live telemetry. Private/departed/deleted/retired sources stay excluded.
10. Wi-Fi/cellular/offline/denied media/Worker recovery, local storage preserved;
    actual provider usage and native camera/GPS/suspension. Some role cases need
    a third account: mark unrun cases honestly. Full procedure is in the checklist.

### Remaining UX and release limits

- Native Safari/WebKit, physical phone camera/GPS/background behavior and subjective
  user acceptance remain unrun. Chromium screenshots cannot certify them or prove
  Apple-level quality. Windows fixture screenshots omit native browser chrome.
- Missing/private media uses original line icons/initials; no stock/fake production
  vehicles or riders are inserted. Local tile/raster fixtures do not prove real
  photography or map-provider appearance; verify current authorized photos on phones.
- Existing per-section saves remain explicit; Done editing is not a global save.
  Native selects/file/color controls follow the device UI. Very long text/large
  accessibility sizes may need vertical scrolling; no essential feature is removed.
- The scoped product stylesheet preserves older layers for compatibility. A later
  measured consolidation can retire redundant declarations after device acceptance;
  it is not a reason to rewrite GPS/business logic now.
- Existing bounded Home/RSVP/log/media/read quotas, refresh freshness, private
  publication, conservative aggregate correction and erasure/abuse/commercial gates
  remain as documented in DATA_MODEL.md and BATCH_8_5_RESULT.md.
- No service worker/offline cold-start or guaranteed background GPS was introduced.
  Final logo/typeface, account recovery/Google/trusted full erasure, Official/safe
  rewards, subscriptions/Stripe, NFC/merchandise and all future IDEA.md requirements
  remain. No Batch9 or paid-provider work was started.

### Recommended future branding, proposal only

After real acceptance: approve original logo/mark exploration, optical small-size
app icons, a licensed typeface/system fallback strategy, cohesive activity/rank
iconography and social/merchandise usage. Validate contrast/text scaling/native
browser chrome/performance and existing customizable themes. Do not imitate
proprietary UI, add remote fonts without review or mistake decorative ranks/Club
totals for entitlement or reward authority.

### Local commits

| Commit | Purpose |
| --- | --- |
| 7d15208 | M0 rendered audit and safe evidence harness |
| 62a7d5b | M1 shared premium presentation tokens |
| fab8f90 | M2 compact private-default Home launch |
| aebefdf | M3 Discover destinations/cards/loading/retry |
| 13a5408 | M4 social Profile and Garage collection |
| c9cf32d | M5 Club sections and readable statistics |
| d042417 | M6 unified activities and clear RSVP |
| 6f3fa7d | M7 semantic guarded editors/validation |
| a032cad | M8 calm dashboard presentation |
| 512697d | M9 saved/replay presentation |
| bf2f179 | M10 dirty modal/deep-link/focus guards |
| 7fa35c0 | M11 corrections from matched visual inspection |
| 295cbbc | M12 large-text and multiple-editor accessibility regressions |

The final local documentation/version/results commit is named
`docs: finalize Batch 8.6 evidence and frontend deployment handoff`.
Its exact hash is obtained with `git log -1 --format="%h %s"`; a commit cannot
embed its own final hash. Full sequence: `git log --reverse --oneline 5c46455..HEAD`.
No commit was pushed. Final working tree is checked after that commit.

### Exact file inventory relative to5c46455

No files removed. Existing Firebase/Cloudflare/RTDB/Pages workflows and config,
security/media/history/GPS coverage and all agreed roadmap requirements retained.

| Change | File |
| --- | --- |
| Added | `BATCH_8_6_RESULT.md` |
| Modified | `DEPLOYMENT_CHECKLIST.md` |
| Modified | `IDEA.md` |
| Modified | `IMPLEMENTATION_STATUS.md` |
| Modified | `README.md` |
| Added | `UX_AUDIT.md` |
| Added | `css/product-experience.css` |
| Modified | `index.html` |
| Modified | `js/app.js` |
| Modified | `js/club-ui.js` |
| Modified | `js/config.js` |
| Modified | `js/garage-ui.js` |
| Modified | `js/group-ui.js` |
| Added | `js/i18n/batch86.js` |
| Modified | `js/i18n/dictionary.js` |
| Modified | `js/lobby-ui.js` |
| Modified | `js/media/theme-editor.js` |
| Modified | `js/public-profile-ui.js` |
| Modified | `js/ui/activity-stats.js` |
| Modified | `js/ui/attendance.js` |
| Modified | `js/ui/cards.js` |
| Modified | `js/ui/edit-mode.js` |
| Added | `js/ui/editor-layout.js` |
| Modified | `js/ui/forms.js` |
| Modified | `js/ui/icons.js` |
| Modified | `js/ui/navigation.js` |
| Modified | `js/ui/ride-launch.js` |
| Added | `js/ui/section-nav.js` |
| Modified | `js/ui/shell.js` |
| Modified | `tests/RULES_TESTING.md` |
| Modified | `tests/batch5_browser.py` |
| Modified | `tests/batch85_browser.py` |
| Added | `tests/batch86_browser.py` |
| Modified | `tests/run_browser.py` |
| Added | `tests/visual86_capture.py` |

**STOP after Batch 8.6. Await explicit approval; no publication or Batch 9.**

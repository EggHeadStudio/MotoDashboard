# Batch 8.5 — local implementation record

Baseline: `b48e3c8`, clean `main` matching `origin/main`, 2026-10-15.
The operator reports Batch 8 deployed. Production consoles and phone acceptance
have not been independently inspected. No production operation is authorized.

## Milestone 0 — audit and implementation plan

| Surface | Finding and reuse |
| --- | --- |
| Home | Start/Resume, separate Garage button, latest three admitted Groups and Clubs. Vehicle selection is too far away. No general riding identity or tentative attendance. Reuse Garage state, shared GPS/recording and existing Group links. |
| Discover | Safe paged Club/Lobby/People projections; preserve privacy, invitation routes and bounded queries. Filters already use disclosures. |
| Rides | Private local/cloud history, separate saved viewer/replay and Group panel. Keep recording ownership and live consent independent. |
| Clubs | Owner general editor exists, but branding/media, rank CRUD, member role forms and admission controls share the content page. Split authorized management from readable members/Wall/upcoming content. |
| Profile/public profiles | Own Profile is mostly content; existing public-profile settings is an editor. Add cancellation/dirty guards. Public visitor pages must never acquire editors. |
| Garage/showcase | Every vehicle has up to eight management buttons plus media disclosure. Keep Choose in View; move default/showcase/delete/media to explicit editing. Preserve source/privacy gates and historical vehicle snapshots. |
| Groups/Meets/Events | One shared implementation with lifecycle/admission/participants and banner editor. Reuse it; separate content, editing and ordinary joining. RSVP must be separate from participants. |
| Notifications | Private source-proven invitation/approval listeners already exist; reuse their current state for Home instead of adding polling/fan-out. |
| Dashboard/live | One accepted GPS pipeline, one exclusive recorder/live claim, scoped state listener and Leaflet markers. Existing Group Club identity is a name/rank snapshot tied to organizing Club, not a general next-ride identity. |
| Saved/replay | Independent collapsible controls, timestamp/gap-aware replay, red route/gold progress. Preserve read-only lifecycle and exports. |
| R2/ranks | Correct private resource/slot references exist. Renderer always prepends built-in SVG; generic CSS puts it above uploaded image. Fix image load precedence and restore fallback on failure/removal. |
| Themes | Safe preset enums already exist. Club routeColor still accepts raw HEX text. Use accessible visual controls and retain legacy stored values. |
| Club activity/statistics | No existing attribution ledger/aggregator. Do not infer consent from membership/identity or implement browser-controlled counters. Require source-proven authorization, deletion/revocation handling and bounded trusted aggregation; document any unsafe dependency rather than weaken rules. |

Plan: (1) shared guarded View/Edit UI; (2) navigation/mobile hierarchy; (3) rank
rendering; (4) accessible palettes; (5–6) compact Home launch plus locked personal/
eligible Club identity and safe markers; (7–8) bounded Home invitations/upcoming and
independent RSVP with emulator coverage; (9–11) explicit, privacy-enforced Club
activity/aggregation only where secure dependencies are satisfied; (12–13) complete
UX/security/runtime regression, documentation and deployment/phone instructions.
Each logical milestone receives tests and a local commit. Static Pages, existing
Auth/Firestore, private R2, Worker live protocol, RTDB lock and all future product
requirements remain. No new framework, frontend build or paid service activation.

## Execution results

M1: shared authorized View/Edit controls hide media, branding, rank/role and vehicle
management in default content views. Existing per-section saves remain explicit;
Cancel/closing warns for unsaved fields. Media editors use unique IDs when several
rank editors coexist. Two focused Chromium checks pass (320px and EN/FI parity).
Existing regression fixtures now enter the actual Edit controls; no forced hidden
clicks or permission assertions are removed. Full regression is repeated at M13.

M2: shared navigation checks unsaved changes before switching panels; modal close
accepts a confirmed discard, preventing repeat prompts. Consistent sticky Edit bar,
touch targets, safe-area padding, wrapping and reduced-motion styles reuse the
current design system. Two focused checks and all eight Batch 8 browser groups pass.

M3: confirmed SVG stacking above uploaded rank image; a successfully decoded custom
image now hides the built-in icon, and failed/removed/replaced images restore it.
Resource refresh clears stale presentation classes and URLs. Three focused browser
groups pass including custom-image precedence, replacement, deletion and 403 fallback.
Existing Worker rank authorization/image upload tests are retained for M13.

M4: accessible named palette buttons augment controlled theme presets across all
shared media editors; Club colors/optional route color use native visual selection,
preview, reset and black/white contrast selection instead of raw HEX entry. Existing
values and strict backend validation remain. Theme Cancel restores the saved values.
Four focused browser groups and the eight existing media groups pass.

M5: Home now selects from the already-loaded Garage, renders the chosen cover/
category, and offers bounded existing Groups through their authorized detail flow.
Personal Start does not create/admit a Group or enable sharing. Active recording
locks the selector. Five focused checks pass including switching, no new sharing/
Group creation and 320px overflow. No additional Home Firestore queries were added.

M6: personal/current Club identity is verified at selection and ride start, stored
as an immutable private historical snapshot, and rendered with avatar/Club badge.
Group admission independently verifies the selected Club snapshot; identity can be
changed only while scheduled and remains fixed once active. Worker rechecks current
representation membership independently of live admission; revocation removes Club
decoration without granting/removing unrelated Group rights. Live marker images use
authorized opaque resource requests with text/icon fallbacks, no permanent URLs.
Contribution is a separate opt-in. Six focused browser groups, 32 new actual Rules
assertions and all 11 authority unit groups pass. Existing GPS/live consent is reused.

M8 precedes M7 because Home upcoming depends on RSVP. Going/Interested/Not going
are separate owner records, safe UID-free counts and private Home refs. Rules prove
all three writes and exact deltas atomically; no client-controlled counter. Capacity
is at most 50 Going (also bounded by activity capacity), 200 intent records total;
organizer sees at most the latest 50 named responses. Going never admits a participant,
including public activities (explicit Join stays separate). Approval/private isolation,
forged/duplicate/capacity/concurrent/terminal writes and live separation are tested.
68 cumulative new Rules assertions and seven focused browser groups pass. Existing
full Worker suite also passed 98 before the additional authority test (99 on final run).

M7: Home merges admitted Groups and the latest 20 private attendance refs, hydrates
with bounded concurrency, sorts five upcoming activities chronologically and labels
Going/Interested. Past/terminal/inaccessible activities disappear. Latest five unread
invitation/approval updates reuse the existing private notification listeners and
deep links; no additional listener/polling or broadcast fan-out. Eight focused
browser groups pass. Notices are updates, not a claim that a stale invite is valid;
opening still checks current invitation/admission authority.

M9: dedicated lazy Club log, explicit saved/synced personal-ride and completed Group/
Meet/Event contribution, summary-only payload and rider withdrawal. New trusted
CLUB_ACTIVITY/ClubActivity SQLite v4 uses existing read-only Firestore reader and
the existing media account solely for Auth lookup; no new Firestore writer/secret.
Source/member incarnations, bans, retirement, consent and audience are checked on
the server. Original GPS routes stay owner-only. Limits: 100 contributions/Club,
30/rider/Club, <=100KB ledger, 10 rows/page, 30 calls/caller/Club/minute, queue20.
11 backend groups, one native workerd/SQLite gateway group, nine browser groups and
86 cumulative Rules assertions pass. Direct client activity/counter paths deny.
Statistics foundation is in the same atomic ledger; M10 completes its presentation.
No production provisioning or deployment performed.

M10: audience-scoped rides/hours/distance/unique riders and separate Group/Meet/Event
participations are presented from trusted atomic per-audience/per-rider summaries.
One personal source contributes once per Club; Group participation adds no duplicate
mileage. Rider withdrawal corrects immediately. Final hardening below couples
deletion/departure to a monotonic proof, excluding stale aggregates immediately.
Valid remaining summaries reconcile on page reads/hourly ten-entry sweeps; counts
may temporarily understate activity until reconciliation finishes (up to ten hours
at capacity, longer on outage). The UI explains this conservative behavior.
No full Firestore-history scan or browser counter. Thirteen backend groups and ten
focused browser groups pass, including private aggregate isolation/unique riders.

M11: private, technical Owner/Admin, Club-member and explicit public audiences are
enforced in Worker policy. Owner-only default policy appears only in Edit; it never
changes existing rider audiences. New forms load the default but require fresh
summary consent and a separate unchecked public-consent control. Private Clubs
cannot set a public default. Thirteen backend groups and eleven focused browser
groups pass. No route preview is exposed: the optional preview is deliberately
omitted, retaining owner-only full GPS routes. Public summaries support anonymous
known-Club API reads; the existing Club browsing UI still requires sign-in.

M12: consistency pass hides Group invitation management outside Edit, preserves
ordinary joining/vehicle/status/approval actions, restores unsaved fields and crop
state on Cancel, and guards showcase editing. Rank previews also prioritize the
uploaded graphic. Profile photos survive unrelated Home refreshes; selected identity
appears in participant rosters. Palette labels avoid nested interactive controls,
statistics update their locale and EN/FI layouts pass at 320/390/844/1280 widths.
Regression exposed queued panel-close events overriding a newly opened deep link;
stale close events now leave the newer panel/watch intact. All six Group browser
groups, three Club groups and twelve focused 8.5 groups pass. Legacy tests enter the
visible Edit controls; no security expectations are relaxed. Full matrix follows.

M13 privacy hardening: final review found that source-denied rows alone did not
prevent their old metrics appearing in aggregates before cleanup. Private monotonic
activityEpochs now couple ride tombstones and every Group departure/removal to an
atomic invalidation. Owner-only reads; organizers can only blind-increment another
epoch with an authorized paired removal, never read it or change private profiles.
Worker aggregates are bucketed by epoch and membership incarnation and verify
current proofs in a bounded batch per contributing rider, without scanning personal
history. Old proofs never regain validity. Page reads/alarms reconcile surviving
valid rows; stale totals cannot expose an off-page deleted source. New actual Rules
tests cover missing/rollback/foreign/paired/blind-transform operations and Club
organizer access-call limits. **119 cumulative new Rules**, **18 Club backend
groups** and **13 focused browser groups** pass. No new IAM, secret or index.

## Final outcome - 2026-10-16

**Milestones 0-13 are complete locally. Nothing was pushed, deployed or changed
in production. No paid service was activated. Batch 9 has not started.** Work
started October 15 and final verification crossed midnight. Version is
**1.6.5-batch8.5**. No dependent implementation milestone is blocked; production
publication and real-phone acceptance are separate, uncompleted release gates.

The final UX pass also puts Profile Edit in its hero, makes unknown marker
headings stay unknown, and routes an optional Home Group choice through its
existing authorized detail/join flow. Selecting a different Group changes the
primary action to Continue to Group; it does not start a personal recorder/GPS or
admit the rider. Vehicle/identity changes preserve the planned Group. Current
Group context and explicit live consent remain independent.

### Final local verification

| Check | Passed | Failed | Skipped | Scope / evidence |
| --- | ---: | ---: | ---: | --- |
| Firestore emulator | 1,116 distinct assertions | 0 | 0 | 997 existing +119 Batch 8.5; repeated 102-assertion fixture baseline counted once |
| Worker | 118 tests | 0 | 0 | Includes 20 native workerd/R2/SQLite cases and 18 Club activity backend groups; Wrangler build is dry-run |
| Browser | 116 groups/cases | 0 | 0 | Existing 102 +14 Batch 8.5; 118 PASS lines include two already-counted suite summaries |
| Locked RTDB emulator | 68 assertions | 0 | 0 | Separate fixed localhost deny-all suite; no RTDB frontend import |
| GitHub Pages | 2 groups | 0 | 0 | 435 literal references, 112 unique URLs HTTP 200 under /MotoDashboard/; guest/local recording without Firebase |
| Deployment contracts | 10 | 0 | 0 | Exact 19 composites, single-field exemption, dedicated deployer and Firestore-only scope |
| Workflow validation | 3 YAML /15 Bash blocks | 0 | 0 | Manual backend/main/project gates, existing v1-v3/private R2 preserved and v4 appended; no workflow dispatched |

Actual Firestore compilation/authorization was tested against localhost
demo-motodash. Browser fixtures use simulated GPS, real Leaflet and pinned Firebase
13.0.0 imports with cloud APIs blocked. Worker fixtures mock Firebase/OAuth and
use local workerd/R2/SQLite. Test-only keys/screenshots/logs stay outside the
repository. Existing cached development tools were reused; no workstation
software was installed. These results do not certify production Rules/IAM,
indexes, Auth revocation, native Safari, camera, physical GPS or mobile suspension.

Final full-run logs are in the local temporary directory:
motodash-batch85-rules-complete.log, motodash-batch85-worker-complete.log and
motodash-batch85-browser-verified.log. They are not application assets or committed
artifacts. Reproduction and counting conventions: [test guide](tests/RULES_TESTING.md).
All final checks passed. Intermediate regression failures were corrected, including
the real queued panel-close/deep-link race; hidden editor fixtures now use visible
authorized Edit controls. Permission expectations were not weakened.

### Persistence, Rules, Worker and media changes

- **Rules:** immutable optional private ride identity and current scheduled Group
  identity; separate attendance, UID-free exact counters and private attendanceRefs;
  monotonic private activityEpochs coupled to source tombstones and Group departure.
  Organizers cannot inspect another rider's epoch or advance one independently.
  Unknown paths remain denied. No public membership UID, private profile/Garage,
  route, retired-ID or technical-role boundary is relaxed.
- **Indexes:** firestore.indexes.json is unchanged from b48e3c8: **19 composites**
  and routeChunks.pointsJson exemption. RSVP/ref updatedAt uses automatic
  single-field indexing. No new composite, RTDB deployment or data migration.
- **Worker:** append CLUB_ACTIVITY/ClubActivity with SQLite migration **v4**;
  preserve LIVE_ROOMS/v1, LIVE_IDENTITIES/v2, MEDIA_STATE/v3, MEDIA_BUCKET and
  existing HTTPS/WSS origin/token/consent/lease protocols. New HTTPS Club log
  checks source, member incarnation, epoch, current technical role and consent;
  trusted serialized summaries remain in the Club DO, not browser counters.
- **Secrets/IAM:** no new environment variable, secret or permission. The existing
  read-only FIRESTORE_SERVICE_ACCOUNT reads sources/proofs; existing
  MEDIA_SERVICE_ACCOUNT supplies current Auth lookup. Neither is a deployer.
  No service-account private key is added to the repository.
- **R2/media:** no bucket/schema/public-access change. Rank image load precedence,
  editor preview, refresh/disposal and fallback were corrected; composite markers
  request currently authorized media through the existing API. No permanent image
  URL or private GPS route is published. Source photos keep their opt-in boundary.

Reviewed Rules SHA-256:
`53d8c86948653c12aeff90d5e63c7f2725595eba604b65aaa188b680b6388aec`.
Unchanged indexes SHA-256:
`f1ff84b8f5aff7faccee727da6948ef6be9ba2facf14a0783781832bdb43e03d`.

### Local logical commits

| SHA | Milestone / purpose |
| --- | --- |
| 4a8deca | M0 actual-code audit and plan |
| f84e1d7 | M1 View/Edit separation |
| 1cdd47b | M2 navigation/mobile hierarchy |
| 347edf2 | M3 rank image precedence/fallback |
| 3a2ce5c | M4 palettes and cancellation |
| 910808a | M5 Home launch/vehicle selection |
| 9cc5400 | M6 verified locked identity/composite markers |
| ded22b5 | M8 independent secured RSVP |
| a42b3d4 | M7 Home plans/invitations (after RSVP prerequisite) |
| df27458 | M9 trusted Club Activity Log |
| 19acf94 | M10 trusted statistics presentation |
| f77a0e3 | M11 privacy/default policies |
| 4c7c99e | M12 cross-screen consistency/lifecycle |
| c7f810c | M13 immediate aggregate invalidation security hardening |

The final local commit, `docs: finalize Batch 8.5 verification and deployment handoff`,
contains this report, final UI corrections/tests, version, updated documentation
and the pre-deployment Batch 8.5 security runner. Its exact hash is obtained with
`git log -1 --format="%h %s"`; a commit cannot embed its own final hash.
Use `git log --reverse --oneline b48e3c8..HEAD` for the complete local sequence.

### Required publication order - not executed

Full browser-only inputs, Console checks, mixed-version gates and safe rollback:
[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md), current Batch 8.5 section.

1. After explicit approval, finish rides/stop sharing/close old tabs. Temporarily
   disable **Deploy to GitHub Pages** before publishing main so its push trigger
   cannot publish the frontend ahead of the backends.
2. Publish reviewed clean main with ordinary `git push origin main` (never force).
3. Run **Validate or deploy MotoDash Firestore**, main, operation=deploy,
   confirmation=motodash-87bf8, scope=rules-and-indexes. Rules-only is sufficient
   only after all 19 current indexes are independently confirmed. Verify Console
   published Rules and every required index Enabled.
4. Run **Deploy MotoDash Cloudflare Worker**, main, no inputs. Verify appended
   CLUB_ACTIVITY/ClubActivity SQLite v4, retained existing bindings/private bucket,
   existing project/origin and encrypted secret names in Cloudflare Dashboard.
5. Enable/run **Deploy to GitHub Pages**, main, no inputs. Verify reviewed SHA and
   version 1.6.5-batch8.5 under /MotoDashboard/. Reload older tabs, preserving rides.
6. Execute and record real acceptance below. Workflows passing proves publication,
   not device acceptance. No new secrets are needed for this batch.

Rollback must retain epoch-coupled Leave/Delete behavior, current privacy Rules and
all v1-v4 namespaces. Prefer a reviewed corrective frontend/Worker commit. Blindly
restoring pre-8.5 code can make old clients fail closed; weakening Rules or deleting
DO namespaces/buckets is not a rollback. Full instructions are in the checklist.

### Two-account / two-phone acceptance - all NOT RUN

Use disposable A/B, iPhone Safari and Android Chromium, English/Finnish, stationary
or on foot. Never paste passwords, tokens, invite secrets or precise location.

- Default content/authorized Edit, section Save/Cancel, dirty Back/close, palettes,
  320px/landscape/text scaling and private image fallbacks; B cannot edit A.
- Club rank upload/replace/remove: custom image replaces icon, inaccessible image
  restores fallback, decorative rank grants no technical privileges.
- Home vehicle/personal/eligible Club selection; different Group routes to detail;
  personal Start creates no Group or live consent; identity locks for the ride.
- Going/Interested appears on Home without admission or location access; A approves,
  B explicitly joins, then both separately consent to live sharing.
- Marker avatar/Club badge/rank, map/weather/recording, Return to Ride; leave/end/
  logout/removal stops live sharing. No duplicate GPS watch/socket/recording.
- Complete/sync a private ride; saved viewer/replay/export stay read-only. Explicit
  private contribution is invisible to B; deliberate members/public consent reveals
  only safe summaries. Owner defaults cannot republish earlier private entries.
- Counts/unique riders/participations do not duplicate personal mileage. Withdraw,
  delete an off-page source, remove/leave a Group, revoke role/membership and retire
  Club; next reads/counters exclude invalid authority immediately. Valid surviving
  counts may temporarily understate pending reconciliation.
- Invite/Auth return/notification deep links, Wi-Fi/cellular/offline/Worker failure,
  current IAM/Rules, quota observations and actual camera/GPS/Safari behavior.
  Full role matrix needs a third account; mark unavailable cases NOT RUN.

### Remaining limitations and release gates

- Ledger caps: 100 entries/Club, 30/rider/Club, <=100KB, 10 rows/page,
  30 calls/caller/Club/minute, queue20. Contribution-only personal source caps:
  10,000km/31 moving days. These are prototype bounds, not global abuse protection.
- Fresh aggregate proof checks batch two documents per contributing rider,
  at most100 riders, plus request/page/source/Auth reads. Hourly ten-entry sweeps
  restore valid buckets in up to ten hours at capacity, longer on outages. Deleted
  or departed sources are excluded immediately; surviving counts may understate.
  IAM migrations/erasures bypass Rules and must preserve the same invalidation.
- Home hydrates latest20 RSVP refs and shows five chronological upcoming cards,
  refreshed through existing loading flows; it is not a full attendance calendar.
  Organizer sees at most50 named RSVP responses, max50 Going (bounded by capacity)
  and200 intent records; RSVP never grants admission or live access.
- Club attribution records the currently verified Club/rank at contribution time;
  the ride's original locked identity stays in private history. Optional authorized
  route previews are omitted. Club browsing UI requires sign-in; the known-Club
  API can return deliberately public summaries anonymously.
- Participation is not verified physical attendance; ride metrics are user supplied
  and unsuitable for rewards/billing evidence. No automatic contribution or public
  membership/vehicle/route publication. Previously downloaded bytes cannot be recalled.
- Complete trusted account erasure, Club ownership transfer/retention, service-wide
  moderation/abuse controls and provider-commercial review remain wider-beta gates.
  Erasure must include activityEpochs, RSVP/refs, Club DO proofs/aggregates, media/
  pending cleanup/live records and retain nonpersonal retired-ID reservations.
- No service worker/offline cold-start or guaranteed background/lock-screen GPS.
  Physical two-phone/native Safari, deployed Rules/IAM/revocation and quota tests
  remain unrun. Current local success does not mark the production release ready.

### Next recommended Batch 9 - proposal only

First accept 8.5 on real phones and measure reliability/read/media quotas. Then
separately approve account recovery/password change, Google sign-in/linking and
trusted complete erasure/ownership/retention design. Follow with onboarding and
community notification/Club QR polish. Commercial entitlements, Stripe, Official
activities/rewards, achievements, NFC, merchandise and final global logo/typography
remain in IDEA.md with their security/provider dependencies. Club statistics must
not become reward or billing authority. Nothing in Batch 9 is implemented here.

### Exact changed-file inventory

The following inventory compares this batch with b48e3c8, including final handoff
changes. No files were deleted; useful existing security/media/history coverage
is retained. Existing GitHub Pages deployment and Firestore index files are unchanged.

| Change | File |
| --- | --- |
| Modified | `.github/workflows/deploy-firebase.yml` |
| Added | `BATCH_8_5_RESULT.md` |
| Modified | `CLOUDFLARE_SETUP.md` |
| Modified | `DATA_MODEL.md` |
| Modified | `DEPLOYMENT_CHECKLIST.md` |
| Modified | `FIREBASE_DEPLOYMENT.md` |
| Modified | `IDEA.md` |
| Modified | `IMPLEMENTATION_STATUS.md` |
| Modified | `LIVE_TRACKING.md` |
| Modified | `README.md` |
| Added | `cloudflare/src/ClubActivity.js` |
| Added | `cloudflare/src/clubActivityPolicy.js` |
| Modified | `cloudflare/src/firestoreAuthz.js` |
| Modified | `cloudflare/src/index.js` |
| Modified | `cloudflare/tests/authz.test.js` |
| Added | `cloudflare/tests/club-activity.test.js` |
| Modified | `cloudflare/tests/runtime.test.js` |
| Modified | `cloudflare/wrangler.jsonc` |
| Added | `css/community.css` |
| Modified | `css/media.css` |
| Modified | `firestore.rules` |
| Modified | `index.html` |
| Modified | `js/app.js` |
| Modified | `js/club-branding-ui.js` |
| Modified | `js/club-members-ui.js` |
| Modified | `js/club-ui.js` |
| Added | `js/community/activity-client.js` |
| Modified | `js/config.js` |
| Modified | `js/firebase/access.js` |
| Added | `js/firebase/activityEpoch.js` |
| Added | `js/firebase/attendanceRepository.js` |
| Modified | `js/firebase/groupRepository.js` |
| Modified | `js/firebase/sessionRepository.js` |
| Modified | `js/garage-ui.js` |
| Modified | `js/group-invites-ui.js` |
| Modified | `js/group-participants-ui.js` |
| Modified | `js/group-ui.js` |
| Added | `js/i18n/batch85.js` |
| Modified | `js/i18n/dictionary.js` |
| Modified | `js/live/live-map.js` |
| Modified | `js/map.js` |
| Modified | `js/media/media-editor.js` |
| Modified | `js/media/media-render.js` |
| Modified | `js/media/theme-editor.js` |
| Modified | `js/public-profile-ui.js` |
| Added | `js/riding-identity.js` |
| Added | `js/ui/activity-stats.js` |
| Added | `js/ui/attendance.js` |
| Added | `js/ui/club-activity.js` |
| Added | `js/ui/edit-mode.js` |
| Modified | `js/ui/forms.js` |
| Modified | `js/ui/navigation.js` |
| Modified | `js/ui/notifications.js` |
| Added | `js/ui/palette.js` |
| Added | `js/ui/ride-launch.js` |
| Added | `js/ui/rider-marker.js` |
| Modified | `js/ui/saved-ride.js` |
| Modified | `js/ui/shell.js` |
| Modified | `tests/RULES_TESTING.md` |
| Modified | `tests/batch2_browser.py` |
| Modified | `tests/batch5_browser.py` |
| Modified | `tests/batch6b_browser.py` |
| Modified | `tests/batch7_browser.py` |
| Added | `tests/batch85_browser.py` |
| Modified | `tests/batch8_browser.py` |
| Modified | `tests/clubs_browser.py` |
| Modified | `tests/firebase_mocks.py` |
| Modified | `tests/groups_browser.py` |
| Modified | `tests/navigation_helpers.py` |
| Added | `tests/run_batch85_rules.py` |
| Modified | `tests/run_browser.py` |
| Modified | `tests/run_group_rules.py` |
| Modified | `tests/run_rules.py` |
| Modified | `tools/validate_workflows.cjs` |

**STOP: Batch 8.5 complete locally. Await explicit approval; no push/deploy or Batch 9.**

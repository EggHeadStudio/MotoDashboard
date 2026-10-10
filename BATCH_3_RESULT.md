# MotoDashboard Batch 3 result — 2026-10-10

Baseline: c559371. This batch is implemented and tested **locally**, with the
security-dependent live features deliberately blocked. Earlier Firebase/Pages
operation is user-reported evidence; it does not certify this release's production
rules, indexes or physical devices. No push, deployment or production data access
was performed. Work stops here pending explicit user approval.

## Milestone state

| Milestone | Result |
| --- | --- |
| Additional: remove technical IDs | Completed locally: safe names, generic avatars, readable roles/ranks, owner names, localized missing-name fallback, shared Club URLs and name-based invite selection. IDs remain internal/routing only; startup debug/version labels hidden. |
| 1: Group data model | Completed locally: immutable generated UUIDs, Ride/Drive/Meet/Event, all 12 Garage categories, private canonical records and exact safe summaries, timestamps, capacity and four states. |
| 2: hosting/management | Completed locally: create/edit/start/complete/cancel, dates/areas/policy/capacity, paginated organizing-Club selector. Authenticated personal hosting; current Club Owner/Admin/Host checks. No paid subscriptions. |
| 3: participation | Completed locally: open join, request/approve/reject, addressed invite accept/decline, leave, selected vehicle, roster, removal, capacity/duplicates/impersonation protection. |
| 4: RTDB security foundation | Partial / BLOCKED: proposed ephemeral contract documented; source stays deny-all and locked emulator regressions pass. Trusted cross-database authority is unavailable. |
| 5: live Group map | BLOCKED: no publisher, listeners, live markers, live consent toggle, reconnect/presence or second GPS watcher. |
| 6: identity/status | Partial: safe participant identity, opt-in nickname/category/organizing-Club rank sharing, own manual localized status and stop confirmation. Live marker identity/delivery blocked. |
| 7: Lobby | Completed locally: bounded server filters, date/area/Club selection, snapshot pagination and safe public/approval discovery. Sixteen Lobby composite indexes documented. |
| 8: links/QR | Completed locally: stable addressed URLs, Auth return, invalid/expired/revoked/wrong-account handling, local QR, sharing and independent QR decoding tests. No NFC writing. |
| 9: overview/regroup | Partial: participant count, loaded roster coverage, status totals and checked timestamp. Live active/stale/offline counts, separation/regroup BLOCKED and explicitly unknown. |
| 10: regression | Partial: regression passed for implemented/locked paths. Live-feature tests remain BLOCKED; production and physical-device acceptance remain unverified. |

No agreed product requirement is removed. Official sessions, Stripe/subscriptions,
NFC hardware, merchandise and major redesign are outside this batch. Account
management/Google login/media roadmap requirements remain future work.

## Current architecture

Static HTML/CSS/native JavaScript modules, GitHub Pages, pinned Firebase 13.0.0,
existing Leaflet/OpenStreetMap providers and Open-Meteo. No application backend,
framework or build pipeline is introduced. Auth, Firestore and the prepared unused
RTDB module share named MotoDash app/project motodash-87bf8.

App initializes independent account/Garage/Club/Group/Lobby dialogs. Existing
accepted GPS samples also publish an in-memory motion boolean for the manual
status control; this stores no coordinates and sends no network writes. Existing
local segmented recording/history, completed cloud history, export, themes,
heading-up/HUD, weather and account scope cleanup remain in place.

| New module/file | Purpose |
| --- | --- |
| js/firebase/displayProfiles.js | Minimal names, bounded prefix search, 60-second cache cleared on account changes |
| js/data/group-session.js | Shared Group enums, validated input, safe projection and Pages routing |
| js/firebase/groupRepository.js | Guarded transactions, lifecycle, coupled membership/index/counts, invitations, own snapshots and paginated hosting Clubs |
| js/group-ui.js | Mobile hosting/management, permitted details, Auth-aware route handling |
| js/group-participants-ui.js | Admission, requests, roster, own vehicle/status controls and organizer actions |
| js/rider-motion.js | Advisory motion state from existing validated pipeline; no new GPS watcher |
| js/firebase/lobbyRepository.js | Server-filtered discovery and bounded public Club-name search |
| js/lobby-ui.js | Filters, cards and pagination |
| js/group-invites-ui.js | Addressed invite links, sharing, expiry/revocation and QR dialog |
| js/ui/qr.js, js/vendor/qrcodegen.js | Local SVG QR rendering with MIT Nayuki implementation; license/provenance in js/vendor/README.md |
| js/ui/group-overview.js | Reuses loaded roster, localized counts and honest unknown-presence indication |
| tests/run_group_rules.py | 273 actual emulator assertions for new authorization/model paths |
| tests/run_identity_rules.py | 16 minimal-profile privacy assertions |
| tests/run_realtime_rules.py | 68 locked-foundation checks, fixed local demo namespace |
| tests/groups_browser.py | Six Group/Lobby/QR/role/pagination integration groups with SDK fixtures |
| LIVE_TRACKING.md | Blocked live data/authorization contract and trusted coordination requirements |

Existing profileRepository, Club UI/member UI, app/index/CSS/dictionary and browser
fixtures/runners were updated. Root firestore.rules and firestore.indexes.json
contain the reviewed new permissions/index contracts. database.rules.json is
unchanged and deny-all. DATA_MODEL.md documents all exact fields/paths.

## Data and security boundaries

- Private users documents and Garage/personal rides remain owner-only.
- displayProfiles contains only displayName and updatedAt; signed-in discovery is
  intentional and disclosed. Missing names show Member / Jäsen, never UID fragments.
- groupSessions holds private creator/authorization/precise meeting data.
  groupPages and lobbyEvents contain exactly 17 safe fields, with no member UID,
  invitation secret or precise meeting/live location.
- participants, joinRequests, invites and bans are private session-scoped children.
  users/{uid}/groupRefs is private navigation. Admission/removal/index/count and
  summaries must commit atomically. Founder and IDs remain reserved; terminal
  sessions cannot reopen and removed users cannot rejoin that identity.
- Garage sharing includes only explicitly selected nickname/category. Organizers
  cannot read private Garage or write another person's status. Club identity/rank
  snapshots are validated, informational and opt-in.
- Invitations are UID-addressed, at most seven days and consumed on joining.
  Opaque URL token does not grant bearer authority. Known fragments survive Auth;
  acceptance cleans them. Unknown paths and system-admin grants remain denied.
- Current Club authority is checked; demoted Host loses controls/management even
  while retaining a visible rank. Club retirement closes bound private access.
- RTDB cannot read Firestore membership; a browser ACL mirror would be unsafe.
  No such mirror/custom claim/backend is introduced. See LIVE_TRACKING.md.

## Final validation

| Suite | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Original Firestore | 102 | 0 | 0 |
| Previous security regressions | 137 | 0 | 0 |
| Group/Lobby/participation | 273 | 0 | 0 |
| Minimal identity | 16 | 0 | 0 |
| RTDB locked foundation | 68 | 0 | 0 |
| Full browser runner | 21 groups | 0 | 0 |
| Pages checks | 2 groups | 0 | 0 |

**596 distinct emulator assertions**; the baseline rerun inside two runners is
counted once. Counts include fixture checks. RTDB has two positive administrative
fixture checks; every application read/write is intentionally denied. These
results do not demonstrate working live tracking. Browser includes 17 named
confirmation cases, 36 deterministic GPS/route/storage/weather assertions and six
Group integration groups. The displayed QR decodes to the exact URL using
independent ZXing; expired, revoked, wrong-account and rotated links fail.

Pages verification: 162 literal references, 56 distinct local URLs HTTP 200 under
/MotoDashboard/, no root-relative app assets/bare imports, scoped worker cleanup
and guest recording/history with Firebase unavailable. Native browser imports
parse/link all app modules. Real SDK imports initialize the expected named project
with cloud APIs blocked; feature tests use fixtures. No actual Firebase account,
production database, phone camera, Safari/iOS/Android device or background GPS
behavior was verified. Node/npm was unavailable; browser domain assertions ran.

Integration corrections include current-role UI management, clearing details on
failed/revoked loads, Auth-dialog return ordering, snapshot cursor ordering in the
test fixture and startup synchronization. Permission expectations were not weakened.
Manual stopping confirmation is advisory when reliable GPS is absent.

## Release requirements and remaining risks

**BLOCKER — live release:** trusted authority/revocation across Firestore/RTDB is
unresolved. Live markers/presence/reconnect/separation/regroup cannot be declared
complete. No insecure substitute or production demo mode is enabled.

**BLOCKER — publication:** deploy reviewed firestore.rules before this frontend;
create all sixteen lobbyEvents composite combinations in firestore.indexes.json
and wait for Enabled, retaining the existing private-history index/exemption.
Production configuration/rules/inventory/indexes/live acceptance are unverified.
Do not infer production index readiness from emulators.

**WARNING:** harmless previously public Lobby cards can remain after Club
retirement; opening/admission is denied, and trusted operator cleanup is required.
Retained canonical IDs/children must not be recursively deleted by the browser.

**WARNING:** display names are not unique and signed-in names are discoverable.
Verify the intended recipient. Status screens refresh manually; Need help does
not dispatch an emergency response. Founder cannot leave, removed users cannot
rejoin, maximum 50 participants applies. Approximate-area filter is an exact label.

**WARNING:** bounded pages/cache/manual writes reduce cost, but repeated refreshes
and authenticated hosting are not globally rate limited. Monitor Spark usage.
Group overview reuses loaded roster; it does not query high-frequency history.
No background reliability or RTDB free-tier performance is certified.

Exact Console/Pages order, seventeen composite definitions, two-account/two-phone
procedure, live-test scope and rollback are in DEPLOYMENT_CHECKLIST.md. The next
approved step may publish the independent prototype after required checks; live
development requires a separate trusted-backend design/approval decision. Future
subscription entitlements must be trusted-issued and supplement Club permissions.

# MotoDashboard - Batch 5 result (2026-10-12)

Batch 5 is local preparation. No push, Firebase/Worker deployment or production-data
operation was performed. **Production release is not declared ready:** the reported
Firebase failure and actual deployed rules/index versions still need live verification.
The latest operator procedure is at the end of DEPLOYMENT_CHECKLIST.md.

## Implemented UI

- Shared charcoal surfaces, warm gold actions, spacing/type/radius/surface tokens,
  responsive cards, native sheets, focus styles, status/empty/loading/skeleton/toast
  components and original inline SVG icons. No framework, font download or image upload.
- Home / Discover / Rides / Clubs / Profile bottom navigation, current destination,
  safe areas and Back/Forward routing. Primary browsing uses page panels; account,
  Garage and QR use one native modal layer. Deep invitations return through sign-in.
- Home has a personal display-name greeting, prominent Start Ride, quick group discovery,
  actual bounded upcoming groups and owned Clubs, selected vehicle and latest ride.
  Permanent sync/storage diagnostics moved into a Rides disclosure.
- Profile has display identity, Account settings, language, Garage, Club memberships,
  account-scoped loaded ride statistics and logout. Email stays inside Account settings.
  Name edits update Home/Profile without another profile read. Google sign-in, reset and
  deletion remain future roadmap requirements, not falsely presented as implemented.
- Garage vehicle showcase cards use category silhouettes, nickname/make/model/year,
  selected/default badges and existing create/edit/delete/selection operations.
- Clubs use branded initials, category/policy/count and membership badges, readable
  member identity/role/rank cards, private Wall and contextual management disclosures.
  Details show bounded upcoming **public/approval** Club activities; private activity
  discovery is not implied. Logos/photos remain placeholders as specified.
- Group cards/details show actual category/activity/time/area/host/participants/capacity,
  joining policy/state, share/live/consent and existing session-specific management.
  Invite and member/rank/branding forms use disclosures instead of permanent giant forms.
- Discover initially features the earliest eligible public/approval activities, then
  supports Rides (Ride + Drive), Meets, Events and public Clubs, requested category chips,
  collapsed advanced date/area/Club/activity/category filters and snapshot pagination.
  All discovery filtering happens on the server. No fabricated content or global scan.
- Both English and Finnish dictionaries cover the new interface and safe diagnostics.
  Checked 320/390px portrait, phone landscape, 200% text and reduced-motion layouts.
- Existing GPS pipeline, speed/heading, Leaflet map, weather, recording/history/export,
  Firebase Auth/Firestore and Cloudflare sharing consent/authorization remain in use.
  Opening Group controls from the dashboard reuses its watcher and returns to the map.

## Invitation/Lobby findings and corrections

| Classification | Finding | Result |
| --- | --- | --- |
| INFORMATION | The old error mapper collapsed missing-index/precondition, network and unexpected failures into the generic reported message. | Separate localized, safe MD diagnostic codes; no raw Firebase errors, tokens, private records or index links in product status. |
| INFORMATION | Send could be used without any search-selected recipient; the repository also allowed an unknown target identifier. | Send stays disabled for empty results; repository validates an existing minimal display profile; Group Rules now require that projection. |
| INFORMATION | Reissuing a valid invitation silently replaced its token. | Duplicate guard preserves the existing link; host can revoke before creating another invitation. Existing addressed-token, expiry, role and admission checks remain. |
| INFORMATION | Local Rules and bounded prefix/Lobby queries were compared directly. | Exact recipient prefix, all 16 optional Lobby filter combinations with date bounds, cursor pagination, Ride/Drive and public Club queries are covered locally. No permission broadening. |
| WARNING | Category-based public Club browsing needs another index. | Added category ASC / name ASC on clubDirectory. Existing 16 Lobby indexes and private sessions index remain; total 18. |
| BLOCKER | No exact production error code, index-creation link or confirmed deployed rules/index version was supplied. | Production root cause remains unverified. Missing/old indexes/rules are hypotheses, not a proven fix. Console and two-account acceptance instructions are provided. |

`MD-PRECONDITION` identifies failed-precondition, which is often an index but is not
exclusive to index failures. Invalid/revoked/wrong-account invitation links share a
safe rejection because an absent invite cannot prove which case occurred. Expired
invitations have their own code. Prefix search is case-sensitive and names are not
unique; an Auth user without successful application profile setup may not be found.

## Architecture and read bounds

`js/ui/navigation.js` coordinates routes, page panels and modal focus; `shell.js`
owns presentation of Home/Profile and receives existing history/identity state.
`cards.js`, `icons.js`, `forms.js`, `toast.js` and `css/design-system.css` are reusable
presentation primitives. Domain validation/repositories remain the business boundary.
`app.js` has only initialization/history-summary hooks and removal of its obsolete
history toggle; the GPS pipeline was not rewritten.

Home reads the first 20 owned groupRefs and Club refs, renders at most three of each,
and offers explicit refresh/full-list navigation. Statistics describe completed rides
currently saved/loaded in this browser, not lifetime cloud totals. Discover activity
pages are 20 summaries. Public Club pages are 20 directory rows plus at most 20 safe
pages and 20 **own** membership gets, then cursors; no other user's private profile or
membership is fetched. Club details query a bounded public Lobby page for that Club.
These reads have a real quota cost; they are not an offline cache or global search.

Existing safe projections and private canonical data remain separate. Strict client
write validation protects projection schemas. Trusted/Admin SDK writers bypass Rules;
do not treat list-query map-key predicates as field redaction of malformed Admin data.
Inspect deployed safe collections for private fields before publication.

An exploratory localhost fixture used the Admin bypass to insert an email into a
displayProfiles document; a bounded list returned that entire malformed document.
This is recorded as an operational risk, not as a passing read-denial test. Clients
cannot perform that write: the final regression verifies strict extra-field rejection
and private-profile denial. An operator finding such Admin/legacy records must stop
publication and correct the public projection through a reviewed trusted workflow.

## Validation

| Runner / scope | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Firestore baseline (`run_rules.py`, rerun by other suites) | 102 | 0 | 0 |
| Additional security (`run_security_rules.py`, excluding baseline rerun) | 137 | 0 | 0 |
| Group/Lobby (`run_group_rules.py`, excluding baseline rerun) | 273 | 0 | 0 |
| Identity (`run_identity_rules.py`) | 32 | 0 | 0 |
| Batch 5 exact queries/authorization/index source (`run_batch5_rules.py`) | 82 | 0 | 0 |
| **Distinct Firestore assertions** | **626** | **0** | **0** |
| Locked RTDB (`run_realtime_rules.py`) | 68 | 0 | 0 |
| Cloudflare (`cloudflare/`, existing `npm test`) | 47 | 0 | 0 |
| Existing browser regression groups (`run_browser.py`) | 24 | 0 | 0 |
| New named Batch 5 browser cases (same full runner) | 20 | 0 | 0 |
| Pages paths/Firebase-unavailable (`run_release_paths.py`) | 2 groups | 0 | 0 |

Browser groups contain the existing 17 password-confirmation named cases, 36 domain
assertions and live-client checks; those are not added again to the group totals.
Pages verification checked 218 literal references and 69 unique local HTTP 200 URLs
under /MotoDashboard/. Final browser run includes real pinned Firebase SDK imports
with cloud API requests blocked; application data/transport uses explicit fixtures.
Worker tests use local Worker execution/mocked upstreams. Existing cached development
tools were reused; no software or frontend dependency was installed.

The positive and negative security checks include owned/cross-account records, Club
roles/ranks/Wall/retirement, Group admission/removal/invite validity and route return,
exact search, date/Club exclusion, limited queries and cursor pagination. Initial
development runs exposed navigation-close/login-return and outdated UI-test expectations;
those were corrected and the complete final runners pass. No failures were hidden or
authorization expectations weakened. Saved local screenshots were visually inspected.

Untested live paths: actual deployed rule/index versions, real authenticated Firebase
acceptance, production index enforcement, physical QR cameras/phone GPS and mobile
assistive technology/background suspension. RTDB tests certify deny-all, **not** allowed
live-location functionality. Local results are not real Firebase/device acceptance.

## Manual phone acceptance (pending)

1. Publish only after the Console/rules/index gates in DEPLOYMENT_CHECKLIST.md. On two
   phones A/B open https://eggheadstudio.github.io/MotoDashboard/ and refresh. Verify
   the five destinations, EN/FI, portrait/landscape and Account/Garage keyboard scrolling.
2. Use two distinct test accounts/display names. Confirm profile ready, create a vehicle
   in each own Garage, select it, edit a name and verify Home/Profile. Confirm the other
   email and raw membership UIDs never appear in community/participant UI.
3. A creates a future private/invite Group while stationary, searches B, sends and shares
   QR/link. B opens it signed out, signs into B, returns to that exact Group and explicitly
   joins with their own vehicle. Verify wrong-account, revoke, duplicate and expiry
   behavior using disposable data as described in the Console checklist.
4. A starts the Group. B refreshes its details. On both phones verify live sharing is off
   before consent. Each explicitly checks consent and starts sharing; grant browser GPS
   permission. Verify connected state and the dashboard map on both devices.
5. With both pages foregrounded in a safe stationary test, verify the other phone's marker,
   name, selected vehicle/category, permitted Club/rank and status. Confirm heading/map
   controls, weather, recording and history remain usable. Never rely on GPS speed as
   the primary vehicle instrument. Status changes require stopping confirmation.
6. Temporarily disconnect B. A must show stale/disconnected behavior rather than a fresh
   position indefinitely (fresh/stale threshold 45s, position expiry 120s; disconnected
   sockets may disappear sooner). Restore connectivity and verify reconnection behavior.
   Switch apps/lock a phone separately: no guaranteed background location is promised.
7. B stops sharing: A loses B's location, and B's sharing consent is off. Repeat with B
   leaving, logging out and being removed. A completing/cancelling and remote completion
   must clear sharing/markers. Organizer ends an **active** session using Complete session.
8. Separately start a personal recorded ride before live sharing. Stop live sharing and
   verify personal recording continues; finish/save the personal ride and verify its
   owned history, route, export and the correct vehicle snapshot.
9. Test Discover tabs, all categories, local date/exact area/Club filters, genuine empty
   states and Load more. Verify private/unlisted/terminal sessions stay hidden. Verify
   Club membership, permissions, Wall, branding and ranks with allowed/denied accounts.
10. Check keyboard/VoiceOver/TalkBack, focus/Close/Escape where available, enlarged text,
    safe areas and landscape. Record actual device/browser, commit, rules publish time,
    enabled indexes and safe failure codes; leave every unperformed live test pending.

## Remaining limits and deployment order

No Google/reset/delete account feature, uploaded images, Official Sessions, billing,
subscriptions, Stripe, NFC or merchandise was implemented. These agreed requirements
remain in IDEA.md. Auth persistence, network availability, real Firebase index enforcement,
service-account IAM and physical GPS/mobile background behavior require live acceptance.
Club/group retirement and trusted cleanup limitations from the security batch remain.

Order: inspect safe production schemas and compare the dedicated project/configuration;
manually publish the reviewed **firestore.rules** when authorized; verify all 18 composite
indexes and necessary single-field indexes are Enabled; keep RTDB locked; then publish
the frontend through the existing Pages workflow; finally run real two-account/two-phone
acceptance. Worker code/configuration/workflow need no deployment for this batch.
The existing main-branch Pages workflow deploys on push: do not push before backend gates.

Rollback uses a known secure, schema-compatible frontend/rules version; never permissive
rules or a frontend from before the Club security fixes. Exact browser-only Console,
GitHub publication, security-probe and rollback steps are in DEPLOYMENT_CHECKLIST.md.

## Changed files and local commits

1. `613b5dc` - Firebase validation, diagnostics, bounded discovery/index foundation and
   authorization/query regressions.
2. `ef5ebe1` - Design system, navigation, Home/Profile/Discover/feature presentation,
   modal/route handling, own membership hydration and browser regressions.
3. Final documentation commit - this result, operator checklist, implementation status,
   README and preserved/reordered IDEA roadmap. Its exact hash is in local Git history.

Exact changed-file list follows. There are **44 files** across source, tests and docs;
Worker source, deployment workflows, production endpoint and GPS/map/weather modules
are unchanged. The final worktree is checked after the documentation commit.


- `BATCH_5_RESULT.md`
- `DEPLOYMENT_CHECKLIST.md`
- `IDEA.md`
- `IMPLEMENTATION_STATUS.md`
- `README.md`
- `css/design-system.css`
- `firestore.indexes.json`
- `firestore.rules`
- `index.html`
- `js/app.js`
- `js/auth-state.js`
- `js/auth-ui.js`
- `js/club-branding-ui.js`
- `js/club-members-ui.js`
- `js/club-ui.js`
- `js/firebase/access.js`
- `js/firebase/clubRepository.js`
- `js/firebase/groupRepository.js`
- `js/firebase/lobbyRepository.js`
- `js/garage-ui.js`
- `js/group-invites-ui.js`
- `js/group-participants-ui.js`
- `js/group-ui.js`
- `js/i18n/dictionary.js`
- `js/i18n/product.js`
- `js/lobby-ui.js`
- `js/ui/cards.js`
- `js/ui/forms.js`
- `js/ui/icons.js`
- `js/ui/navigation.js`
- `js/ui/shell.js`
- `js/ui/toast.js`
- `tests/batch2_browser.py`
- `tests/batch5_browser.py`
- `tests/clubs_browser.py`
- `tests/firebase_mocks.py`
- `tests/groups_browser.py`
- `tests/identity_browser.py`
- `tests/live_browser.py`
- `tests/navigation_helpers.py`
- `tests/password_confirmation_browser.py`
- `tests/run_batch5_rules.py`
- `tests/run_browser.py`
- `tests/run_release_paths.py`

**STOP after Batch 5.** Further implementation, push or deployment requires the user's
explicit next instruction. No production fix or live acceptance is claimed by this report.

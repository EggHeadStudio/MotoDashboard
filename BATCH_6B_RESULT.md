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

Milestones 0–7 complete locally. Milestone 8 documentation/cleanup is being finalized.

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

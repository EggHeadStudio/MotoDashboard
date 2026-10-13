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

Milestones 0–1 complete locally. Milestones 2–8 pending.

### Milestone 1 — landing

Dedicated semantic anonymous landing with original SVG, six real-feature sections,
proposed Free/Rider/Host/Club prices, accessible scrolling and optional observer
reveal. EN/FI and reduced motion; content remains visible without JavaScript.
Explicit guest dashboard/history entry; anonymous refresh never requests GPS.
Existing private invitation and notification Auth routes are preserved.

Checks: six Batch 6B landing cases, six existing Group/invitation browser groups,
20 Batch 5 cases and two Pages compatibility groups pass. Pages checks cover
252 references / 77 URLs under `/MotoDashboard/`. No physical phone test.

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

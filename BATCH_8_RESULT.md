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

Milestone 0 verification: 17 focused browser cases/groups (including 26 camera and
25 replay nested assertions) passed, 0 failed/skipped. Mobile disclosures preserve
playback, speed and more than 250px clear map space with both collapsed; exports,
EN/FI and GPS teardown retained. Physical Safari/device acceptance not run.

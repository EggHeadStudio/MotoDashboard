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

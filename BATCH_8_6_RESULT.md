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

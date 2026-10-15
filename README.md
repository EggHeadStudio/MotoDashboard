# MotoDashboard

**Your vehicle. Your crew. Your ride.** MotoDashboard is a mobile-first vehicle and
community prototype, hosted at [GitHub Pages](https://eggheadstudio.github.io/MotoDashboard/).

**The operator reports Batch 8 deployed. Batch 8.5 is implemented locally and awaits
approval/publication and real-phone acceptance.** Console/IAM/device acceptance is
not inferred from publishing Git. Version **1.6.5-batch8.5**. No bundled test credentials.

## Implemented functionality

- Home, Discover, Rides, Clubs and Profile; anonymous landing, explicit guest entry,
  shared dark/gold design and English/Finnish. Indicative subscription prices only.
- Content-first View mode, authorized Edit, per-section Save/Cancel/dirty warnings,
  accessible visual colors and custom-rank image fallback.
- Compact Home vehicle/identity/Group launch, upcoming RSVP plans and private updates.
  Personal/eligible Club identity locks for a ride; composite markers use current
  authorized media. Identity never admits a Group or enables location sharing.
- Going/Interested/Not going stays separate from admission. Explicit Club activity
  summaries and trusted audience-scoped ride/participation statistics, without
  copied GPS routes or rank-derived technical rights.
- Email/password registration/confirmation, login/logout, display-name/language settings.
- GPS dashboard, Leaflet map/heading/north-up/themes, smooth follow/default zoom,
  speed/time/weather/accuracy; one GPS pipeline for recording and consented sharing.
- Automatic movement/stop filtering, local durable account/guest recording, private
  completed cloud history with retry/fences, vehicle snapshots, JSON/GPX/share/export.
- Saved-route viewer with independently collapsible details/replay controls, red
  default route/gold progress, timestamp seek/play/speeds/follow; gaps remain unknown.
- Private Garage CRUD across 12 categories, vehicle choice/default, opt-in public
  showcase cards, direct sharing/featured controls and visitor-policy preview.
- Private-default opaque public profiles, selected vehicle/Club identity, bounded
  signed-in People search and server-enforced privacy/source/incarnation gates.
- Clubs, membership/approval/addressed invites, technical Owner/Admin/Host/Member,
  decorative ranks, controlled branding, safe links/private Info Wall and retirement.
- Ride/Drive/Meet/Event Groups, Open/Any vehicle activities, lifecycle/deadline,
  participation/approval/ban/vehicle selection, bounded Lobby/Discover, invitation QR.
- Private invitation/approval notifications, Return to Ride, recorder tab lock and
  exclusive live Group claim across devices. Broadcast notifications remain planned.
- Cloudflare authorized consented live map, latest positions/status, stale handling,
  reconnect and logout/leave/end cleanup; informational straight-line separation.
- **Batch 8 media:** optimized profile avatars/banners; six-slot vehicle galleries,
  cover/order/replace/remove; Club logos/banners; Group/Event/Meet/Ride banners;
  vetted rank icons or prepared PNG; controlled colors/header/card/grid-list presets,
  preview/reset and tested contrast. Private R2, per-photo public opt-in, current
  permissions, quota/rate/revision checks and cleanup; production acceptance still required.

Local automation covers these flows. Emulator/browser/workerd fixtures do not prove
production IAM, composite-index availability, physical GPS, Safari or camera behavior.

## Architecture and privacy

| Component | Responsibility |
| --- | --- |
| GitHub Pages | Static HTML/CSS/native ES modules under /MotoDashboard/; no build |
| Firebase Auth | Identity, existing email/password sessions |
| Firestore | Private persistent data/authorization and minimal public projections; private media references only |
| Cloudflare motodash-live | Verified HTTPS tickets/WSS live groups, trusted media HTTPS and current access checks |
| SQLite Durable Objects | LIVE_ROOMS/v1, LIVE_IDENTITIES/v2, MEDIA_STATE/v3 and new trusted CLUB_ACTIVITY/v4 |
| Cloudflare R2 | Private motodash-media via MEDIA_BUCKET, optimized raster bytes only; no public r2.dev |
| Browser storage | Scoped local rides/outbox/settings; media blob URLs stay transient |
| Firebase RTDB | Locked and unused |

Endpoint remains **https://motodash-live.old-sound-55f2.workers.dev**. Keep public web
Firebase configuration separate from private credentials. The existing encrypted Worker
**MEDIA_SERVICE_ACCOUNT** is a dedicated media identity; existing
**FIRESTORE_SERVICE_ACCOUNT** stays read-only. Never reuse the configuration deployer.

Private profiles/Garage/rides and membership ledgers remain private. Public profiles
never automatically publish their photos or all Garage images. A public vehicle
photo also needs current source visibility and showcase opt-in. New Worker reads
check current source/role/incarnation; deletion/hiding revokes access. No permanent
R2 URLs or image cache. Previously downloaded public content cannot be recalled.
Club retirement and media cleanup are not complete account erasure. Full trusted
account deletion is still required before wider beta.

Club logs require explicit summary consent, with private, Owner/Admin, members or
separate public audiences. Only visible summaries count. Source deletion revokes
entry reads and stale aggregate proofs immediately. Remaining valid summaries can
temporarily understate totals until reconciliation (ten-hour prototype sweep, longer
on outage). Group participation does not prove physical
attendance; user-supplied mileage is not trusted reward evidence.

The app has install metadata but no service worker/offline cold-start or guaranteed
background/lock-screen GPS. It is not navigation, speed competition or an emergency service.

## Deploying after approval

Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for exact browser-only
workflow, two-account, phone, quota and rollback instructions. Nothing was pushed or
deployed by this batch. Pause automatic Pages before an approved main push; deploy
new Rules, Worker/v4, then Pages. Existing private R2, secrets and IAM are preserved;
no new secret or paid-service activation.
Keep all **19** existing composite definitions and the routeChunks.pointsJson exemption.

| Workflow | Trigger/scope |
| --- | --- |
| Deploy to GitHub Pages | main push or manual; frontend-only artifact |
| Validate or deploy MotoDash Firestore | manual main; Firestore Rules/indexes only, project motodash-87bf8 |
| Deploy MotoDash Cloudflare Worker | manual main; existing Wrangler configuration, retained v1/v2/v3/private R2 and appended ClubActivity/v4 |

Existing GitHub secrets: **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**,
**FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON**. Existing runtime media key belongs only in
Cloudflare's encrypted **MEDIA_SERVICE_ACCOUNT**. No local Node/npm/CLI installation
or new branch is required for deployment. No paid service was activated.

## Testing and roadmap

See [test prerequisites](tests/RULES_TESTING.md): browser fixtures, actual localhost
demo Firestore suites through run_batch85_rules.py, locked RTDB, cloudflare/npm test,
Pages path checks and deployment validation. Existing optional cached tools/Actions
run tests; frontend still has no build. No test targets production.

[IDEA.md](IDEA.md) remains authoritative. Password recovery/change, Google linking,
trusted complete deletion, Official MotoDash activities/safe rewards, broadcast
notifications, Club QR, subscriptions/Stripe/trusted entitlements, NFC, merchandise,
Safe Zone, later ecosystem/optional marketplace and final logo/typography/mobile
accessibility/performance polish remain agreed future work. No Batch 9 started.

- [Batch 8.5 result](BATCH_8_5_RESULT.md), [Batch 8 history](BATCH_8_RESULT.md), [implementation status](IMPLEMENTATION_STATUS.md).
- [Data model](DATA_MODEL.md), [live tracking](LIVE_TRACKING.md), [protocol](cloudflare/PROTOCOL.md).
- [Cloudflare setup](CLOUDFLARE_SETUP.md), [Firebase deployment](FIREBASE_DEPLOYMENT.md).
- [Batch 7](BATCH_7_RESULT.md), [repository audit](REPOSITORY_AUDIT.md), [export schema](EXPORT_SCHEMA.md).
- Dated history retains older security/migration decisions; use the current runbook.

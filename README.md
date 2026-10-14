# MotoDashboard

MotoDashboard is a mobile-first dashboard and community prototype for motorcycles,
cars and other vehicles. **Your vehicle. Your crew. Your ride.**

Open [MotoDashboard](https://eggheadstudio.github.io/MotoDashboard/).

The operator reports **Batch 6B deployed and core features working**, with Firebase
Auth/Firestore and the Cloudflare Worker configured. **Batch 7 is complete locally;
publication and independent real-phone/security acceptance are pending.** Its Rules
and one new People-search index must be deployed first: **19 composites total**.
There are no built-in test accounts or passwords.

## What currently works

- **Home, Discover, Rides, Clubs and Profile** navigation with a shared dark/gold UI,
  loading/empty/error states, native dialogs and English/Finnish localization.
- Anonymous landing with sign-in/register and explicit guest entry; original vector
  artwork, real-feature sections, reduced motion and clearly proposed future prices.
- Opt-in public profiles at shareable hash URLs: bio, category, initial avatar,
  controlled accents/banners, selected Garage cards and permitted public Club/rank
  identity. Existing accounts/vehicles are never automatically published.
- Discover People: bounded signed-in public-name prefix search, duplicate-name
  pagination and public profile/showcase links. Garage has clear sharing/featured
  states and direct publish/hide/featured/visitor-preview actions.
- Personal GPS dashboard: Leaflet map, speed, heading/north-up/manual rotation, map
  presets, clock, Open-Meteo weather, accuracy/network status and optional Wake Lock.
- Local ride recording: validated GPS samples, automatic movement/stop detection,
  segmented routes, distance/moving-time/average/maximum statistics and recovery.
- Ride history, route details, rename/delete, JSON/GPX export, file sharing/download,
  and account-scoped completed-ride synchronization with offline retry.
- Dedicated saved-ride view and timestamp replay with play/pause/seek/speeds,
  progress/overview and optional follow. Gaps hide position; insufficient timing gets
  overview only. Replay uses saved data, no current GPS or additional uploads.
- Smooth unscaled heading-up camera, configurable follow zoom, speed-aware widening
  and manual gestures respected until Center. Visual smoothing never changes recording.
- Email/password registration with password confirmation, login/logout, display-name
  editing and saved language preference. Guest recording remains usable without Firebase.
- Private Garage CRUD, 12 vehicle categories, default/next-ride selection and vehicle
  snapshots preserved in recorded history and Group participation.
- Clubs: discovery, open/approval/addressed-invitation membership, Owner/Admin/Host/
  Member permissions, visible custom ranks, controlled colors/links and private Info Wall.
- Ride/Drive/Meet/Event Group Sessions: lifecycle, private meeting details, participant
  approval/invitations/vehicle selection/removal, safe discovery and local QR sharing.
- Open / Any vehicle activities for Clubs/Groups/discovery; Garage retains real vehicle
  categories. Bounded Group expiry and Host Home/end confirmation preserve personal rides.
- Private in-app invitation and Club/Group approval notifications, unread bell, read
  marking and target links. Club event and Group update broadcast notifications remain planned.
- Opt-in live Group map through Cloudflare: authorized active participants, readable
  identity, current positions, stale/expired markers, reconnect and stop on logout/
  leave/end. Status and approximate straight-line separation are informational.
- Return to Ride across the five screens, preserved recording/vehicle/statistics,
  owned refresh recovery and explicit guest Resume. Home keeps enabled sharing.
- Competing personal recorders are blocked across tabs; a trusted UID coordinator
  enforces one live Group across devices without replacing a different active ride.

These are implemented flows with local automated coverage. Batch 7 needs its Rules,
new index and frontend publication; Cloudflare code/configuration is unchanged. Deployment is separate
from real Firebase/mobile acceptance; successful publication does not certify them.

## Architecture and privacy

| Component | Responsibility |
| --- | --- |
| GitHub Pages | Static HTML/CSS/native ES modules under `/MotoDashboard/`; no frontend build |
| Firebase Authentication | Account identity and email/password sessions |
| Cloud Firestore | Private profiles/Garage/rides/notifications, opt-in public projections, Clubs/roles/invites, Group admission and safe discovery |
| Cloudflare Worker + SQLite objects per Group and UID | Token/Firestore authority, latest-position WebSockets and exclusive live claims |
| Browser IndexedDB/localStorage | Account-scoped local rides/outbox, guest rides and preferences |
| Firebase Realtime Database | Locked and unused; no runtime adapter, imports or live-location writes |

The production live endpoint is **https://motodash-live.old-sound-55f2.workers.dev**.
The client obtains tickets over HTTPS and connects over WSS. Public Firebase web
configuration is not a private key. Service-account keys belong only in the
appropriate encrypted GitHub/Cloudflare secret, never in frontend files.

Canonical Club/Group records and memberships are private. Safe projections contain
no membership ledger, invitation token or precise live position. Custom ranks grant
no technical rights. Original Garage records always remain private. Publishing needs
separate opt-in, a Public profile and a Public source vehicle. Rules deny stale cards
after privacy/deletion and public Club identity after membership/privacy/rank changes.
Public openings require a server response; previously downloaded content cannot be
retracted. Club retirement permanently reserves the ID and denies retained children;
it is access revocation, not physical account/data erasure.

Location sharing requires consent and current active-session admission. Personal
recording and live sharing reuse one GPS watcher. The app has install metadata but
no offline service worker or guaranteed background/lock-screen tracking. It is not
navigation, speed competition or an emergency service.

## Deployment and development

Main is the application/deployment branch. GitHub-hosted runners install deployment
tools; nothing needs to be installed on the operator's computer.

| Workflow | Trigger and scope |
| --- | --- |
| `.github/workflows/deploy.yml` | Main push or manual run; frontend-only Pages artifact |
| `.github/workflows/deploy-firebase.yml` | Manual only; validated Firestore Rules/indexes for `motodash-87bf8` |
| `.github/workflows/deploy-cloudflare.yml` | Manual only; existing `motodash-live` Worker from `cloudflare/wrangler.jsonc` |

See [Firebase deployment](FIREBASE_DEPLOYMENT.md), [Cloudflare setup](CLOUDFLARE_SETUP.md)
and the [deployment/acceptance checklist](DEPLOYMENT_CHECKLIST.md). No routine redeploy
is required just because documentation changed. An approved main push still starts Pages.

For development, serve the repository with an existing static HTTP server; use
localhost for local recording and HTTPS for actual phone tests. Existing optional
development tools run browser fixtures and localhost demo emulators:

```text
python tests/run_browser.py
python tests/run_release_paths.py
python tests/run_security_rules.py
python tests/run_group_rules.py
python tests/run_identity_rules.py
python tests/run_batch5_rules.py
python tests/run_batch6a_rules.py
python tests/run_batch6b_rules.py
python tests/run_batch7_rules.py
python tests/run_realtime_rules.py
python tools/validate_firebase_deployment.py
python tests/run_firebase_deployment_contract.py
```

See [test prerequisites and isolation](tests/RULES_TESTING.md). Browser tests need
Playwright/Chromium and ZXing/Pillow for QR decoding. Emulator tests never target
production. Worker tests run `npm test` in `cloudflare/`, using locked development
dependencies, a dry-run bundle and mocked Google/Firestore replies.

## Roadmap and project records

[IDEA.md](IDEA.md) is the authoritative product roadmap. [Batch 7](BATCH_7_RESULT.md)
records the current implementation, security model, tests and exact publication/phone
acceptance steps. Production MD-NETWORK is not independently claimed resolved.
Password recovery/change, Google account linking and trusted complete-account
deletion remain **planned**, outside the approved Batch 6B scope. Media uploads, vehicle
photos, Club logos/banners, rank graphics, Official activities/rewards, subscriptions,
Stripe, NFC and merchandise remain agreed future requirements. Group QR sharing is
implemented; the separate Club QR sharing UI is still planned alongside existing Club links.
User/vehicle/Club/event media, a dedicated final branding/accessibility/performance
milestone and optional future marketplace ideas remain planned; none is enabled now.

- [Implementation status](IMPLEMENTATION_STATUS.md): current implemented/deployed/tested boundaries.
- [Repository audit](REPOSITORY_AUDIT.md): cleanup evidence, branch recommendation, tests and technical debt.
- [Data model](DATA_MODEL.md), [live architecture](LIVE_TRACKING.md), [wire protocol](cloudflare/PROTOCOL.md).
- [Export format](EXPORT_SCHEMA.md) and dated [Batch 3](BATCH_3_RESULT.md), [Batch 4](BATCH_4_RESULT.md), [Batch 5](BATCH_5_RESULT.md) results.
- [Historical documentation](docs/history/pre-batch6/README.md): previous security/migration evidence, not current operator instructions.

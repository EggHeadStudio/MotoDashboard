# Batch 8.5 - current browser-only deployment and acceptance

Prepared 2026-10-15, final local verification 2026-10-16;
**not pushed/deployed; live acceptance NOT RUN**.
Operator reports Batch 8 deployed. Current source is **1.6.5-batch8.5**.
Use this section; earlier Batch 8/7/6 procedures below are dated history.

## Required changes and gates

| Classification | Finding / resolution |
| --- | --- |
| BLOCKER - publication | Publish reviewed Firestore Rules and Worker/v4 before Pages; old Rules cannot authorize RSVP/epochs/optional identity and old Worker has no Club activity API |
| BLOCKER - acceptance | Real two-account/phone, effective policy/IAM, usage and native Safari acceptance below are NOT RUN. Local fixtures/emulators do not certify production |
| BLOCKER - wider beta | Complete trusted account erasure, service-wide abuse/capacity/moderation and provider-commercial acceptance remain outside this batch |
| WARNING - mixed versions | New Group departure/removal requires a coupled private epoch increment. Close old tabs and reload the new frontend; old clients fail closed. Do not weaken Rules to support an old tab |
| WARNING - summaries | Counts can temporarily understate while still-valid records reconcile after invalidation. Deleted/departed sources are excluded immediately via fresh epoch/member proofs; page reads/hourly ten-entry sweeps restore valid buckets, up to ten hours at capacity, longer on outage |
| WARNING - operations | Club logs add source/Auth/DO reads and hourly checks. Per-Club limits are prototype controls, not a global abuse/billing guarantee. Monitor existing quotas before expanding testers |
| INFORMATION | New Rules source is firestore.rules: private optional ride/participant identity, separate RSVP and activityEpochs. No private profile/vehicle/route/public projection permission is broadened |
| INFORMATION | firestore.indexes.json is unchanged: **19 composites**, routeChunks.pointsJson exemption. RSVP/ref ordering uses automatic updatedAt indexes; no new composite |
| INFORMATION | Existing motodash-live appends **CLUB_ACTIVITY -> ClubActivity / SQLite v4** in cloudflare/wrangler.jsonc. Keep LIVE_ROOMS/v1, LIVE_IDENTITIES/v2, MEDIA_STATE/v3 and private MEDIA_BUCKET |
| INFORMATION | **No new secret, IAM permission, R2 bucket, Firebase service, project, frontend build or paid activation.** Existing read-only Firestore account reads sources/proofs; existing media account supplies Auth lookup only for Club activity |

## Exact sources, secrets and Console verification

- Firebase project **motodash-87bf8**, database **(default)**, config
  **firebase.deploy.json**, Rules **firestore.rules**, indexes
  **firestore.indexes.json**. RTDB **database.rules.json** remains deny-all and is
  outside this workflow. No Auth/Hosting/RTDB/Storage deployment.
- Existing GitHub repository Actions secrets:
  **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON** (dedicated configuration deployer),
  **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**. Add none for this batch.
- Existing encrypted Cloudflare runtime secrets **FIRESTORE_SERVICE_ACCOUNT**
  (read-only datastore.entities.get) and **MEDIA_SERVICE_ACCOUNT** (dedicated
  motodash-media account with existing firebaseauth.users.get for Auth lookup).
  Do not rotate/reuse/expand either as a deployment account. No JSON key in source.
- Existing vars **FIREBASE_PROJECT_ID=motodash-87bf8**,
  **ALLOWED_ORIGINS=https://eggheadstudio.github.io**; retain exact Origin, no path
  or wildcard. Existing Worker **motodash-live.old-sound-55f2.workers.dev**.
- Auth Email/Password and authorized domains **eggheadstudio.github.io**,
  **localhost**, existing Firebase default domain remain. No new provider/settings.
- R2 **motodash-media** stays private, no r2.dev/public domain. Media/rank fixes
  need frontend changes; media storage/schema/bucket policy is unchanged.

## Step-by-step publication - only after approval

1. Record reviewed main SHA, current published Rules source/time and Worker version/
   namespace IDs. Testers finish/save rides, stop sharing and close old tabs; wait
   two minutes for abandoned live claims. Preserve all production/local data.
2. GitHub repository -> **Actions -> Deploy to GitHub Pages -> ... -> Disable
   workflow**. Existing site stays online. This avoids the automatic main push
   publishing the frontend ahead of its backends. No extra branch or local install.
3. In the VS Code PowerShell terminal, after approval:

   ```powershell
   git switch main
   git status --short
   git log --oneline origin/main..main
   git push origin main
   ```

   Expect the reviewed clean local commits; no force push. Publishing Git does not
   deploy Firebase or Cloudflare. Nothing has been pushed by this task.
4. **Actions -> Validate or deploy MotoDash Firestore -> Run workflow**:
   branch **main**, **operation=deploy**, **confirmation=motodash-87bf8**,
   **scope=rules-and-indexes**. If all19 indexes are independently confirmed current,
   **scope=rules-only** suffices. Deploy runs demo validation including
   **tests/run_batch85_rules.py** before production credentials. No software needed
   on this computer. Validate-only is optional; deploy already validates.
5. Firebase Console -> select **MotoDash / motodash-87bf8 -> Firestore Database ->
   Rules**. Compare the complete published source/time with reviewed firestore.rules:
   ridingIdentity/currentRidingIdentity, attendance/summary/refs, activityInvalidated,
   activityEpochs, all prior source/privacy/retired-ID boundaries and final deny-all.
6. **Firestore -> Indexes -> Composite:** verify **19 Enabled**, including
   profileDirectory(visibility ASC,searchName ASC), clubDirectory(category ASC,name
   ASC), all16 Lobby definitions and sessions(uploadState ASC,startedAt DESC).
   **Single field:** keep routeChunks.pointsJson exempt; attendance/attendanceRefs
   updatedAt ordering stays automatically indexed. Emulators do not certify this.
7. **Actions -> Deploy MotoDash Cloudflare Worker -> Run workflow -> main**,
   **no inputs**. Official Wrangler Action uses existing cloudflare/wrangler.jsonc,
   dry-run/build and full local Worker/workerd/R2 tests. Secrets are not printed.
8. Cloudflare Dashboard -> **Workers & Pages -> motodash-live -> Deployments**:
   verify reviewed version ready. **Settings -> Bindings**: LIVE_ROOMS/LiveRoom/v1,
   LIVE_IDENTITIES/LiveIdentity/v2, MEDIA_STATE/MediaState/v3,
   **CLUB_ACTIVITY/ClubActivity/SQLite v4**, MEDIA_BUCKET/motodash-media. Wrangler
   appends v4; do not replace/recreate old namespaces. Verify existing vars and
   encrypted secret names/types above, without revealing their contents.
9. **Actions -> Deploy to GitHub Pages -> Enable workflow -> Run workflow -> main**,
   **no inputs**. Check successful reviewed SHA and
   **https://eggheadstudio.github.io/MotoDashboard/**. Reload/reopen old tabs; keep
   IndexedDB/local rides. Version is **1.6.5-batch8.5** (js/config.js). No service
   worker or cold-start cache reset. Existing frontend deployment is unchanged.
10. Run and record the acceptance procedure below. Green workflows mean published,
    not real account/phone acceptance. Direct Worker navigation origin_denied is
    expected and does not test authenticated activity/live/media requests.

## Two-account / two-phone acceptance - NOT RUN

Use disposable A/B with distinct names, separate sessions, iPhone Safari and Android
Chromium, stationary/on foot and foreground. Choose this production testing window
explicitly. Record safe operation/code/time/device/version/expected/actual only;
never share passwords, JWTs, private photos, invitation secrets or precise GPS.

1. EN/FI registration/login/refresh and guest entry still work. Profile/Garage/Club/
   Group default View shows content, no upload/color/rank/role management forms.
   Authorized Edit opens them; B cannot manage A. Save a section, Cancel unsaved
   fields/crop, test close/Back warnings, missing images and 320px/text scaling.
2. A creates a Club, B joins as Member. A sets rank Captain, uploads/replaces/removes
   its image. Custom image replaces the fallback in member/Club/editor views;
   forbidden/broken images restore a vetted icon. Rank grants no technical rights.
   Check visual colors/preview/reset/cancel, legacy colors, branding and Wall.
3. Home switches vehicles directly and shows selected cover/category. Choose personal
   or eligible Club identity; contribution starts off. Start a personal ride: no
   Group is created, identity/vehicle lock and one recorder/watch remain. Home and
   Return to Ride preserve it. Revoked membership cannot start a new Club identity.
4. A creates a scheduled approval Group/Meet/Event. Select identity before admission
   or scheduled vehicle Save; once active it stays fixed. B selects Interested, then
   Going: plans appear chronologically on Home, but no admission/GPS/live access.
   A approves; B explicitly Joins, then separately consents to location sharing.
   Verify private/invite/wrong-account/expired links and capacity still enforce.
5. Both share in an active Group. Verify readable avatar/Club-badge markers and rank
   detail, with private/denied image fallbacks. Public profile alone never publishes
   unchecked photos; enable each permitted public photo deliberately if desired.
   No extra watcher/socket; weather/map/heading/recording and live statuses remain.
   End/leave/logout/removal clears sharing/markers; refresh requires fresh consent.
6. Home shows unread invitation/approval updates and Going/Interested upcoming plans;
   opening checks the current target, not a notification as authority. Refresh after
   remote cancellation/expiry; terminal/past activities disappear. Deep Auth return
   and notification bell stay usable; A never sees B's private notification list.
7. Finish/save/sync a personal ride, History -> Open. Saved details/replay/export
   remain read-only, without GPS; red route/gold progress and gaps remain honest.
   **Contribute to Club log** -> choose Club/audience, fresh summary consent. Private
   is the initial default unless its owner suggested another; separate public/name
   consent always starts unchecked. Local/pending rides require sync first.
8. A chooses Only me: B and even other Club managers cannot read that entry or count
   it. A's owner-default change must not republish existing private entries. Resubmit
   the same source with deliberate members consent: one entry/ride, no double count.
   B sees only summary/date/name/category/distance/moving time/Club-rank snapshot,
   never route/vehicle notes/UID/source path. Group participation adds no duplicate
   personal distance; Meet/Event participation does not claim verified attendance.
9. Roles audience: only current Owner/Admin, not Host/Member/Captain. Remove the role
   while its log is open; a new Refresh denies those rows/counts. Test private/public
   Club and separate public consent. Known-Club anonymous API reads are allowed only
   for explicitly public summaries; the Club browsing UI still requires sign-in.
10. A removes a contribution: row and counters update immediately. Re-contribute then
    delete its own ride: tombstone and activityEpochs increment commit together; new
    log reads/counters exclude the deleted source, including an off-page entry.
    Valid surviving summaries can temporarily understate totals until page reads/
    hourly reconciliation. Verify Group Leave/Remove invalidates participation too.
    A cannot roll an epoch back; an organizer cannot read it or bump it independently.
11. B leaves/rejoins a Club: old membership incarnation does not revive contributions.
    Retire a disposable owner-only Club: all old private log/media/Wall/invites deny
    and old IDs cannot be recreated. Account Auth deletion alone is not full erasure.
    Full Admin/Host matrix needs a third account; record unrun cases honestly.
12. Wi-Fi/cellular/offline/media/Worker failure: scoped inline feedback, no automatic
    uncertain-write replay, recording remains local. Same-revision concurrent log
    mutation yields one success/one conflict; Refresh actual state. Test EN/FI,
    camera/file crop, portrait/landscape/reduced motion/text scaling and real GPS.

Privileged Firebase/Cloudflare Console reads bypass client permissions and are not
a two-account security test. No live item here is marked completed by local tests.

## Quotas, retention and safe rollback

- Club ledger: **100 entries/Club,30/rider/Club,<=100KB**, ten rows/page, queue20,
 30 calls/caller/Club/minute. Personal source cap10,000km/31 moving days applies only
 to contribution, not private recording. No global distributed abuse guarantee.
- Read-only Firestore proof checks batch current epoch/membership for each eligible
 contributing rider (at most100, two docs each), plus current page/source checks and
 per-signed-in-request Auth lookup. No full personal history or GPS route scan.
- Hourly ten-entry source reconciliation adds bounded reads per nonempty Club and
 persists valid summaries/counters. At the 100-entry bound one sweep takes ten
 hours, longer during outage; request processing cannot postpone an earlier alarm.
 Epoch/member proof invalidation already excludes stale totals immediately.
- Inspect Worker requests/CPU/errors, all DO storage/alarms, Firestore reads/writes/
 denials, Auth lookup quotas and existing R2 operations. Keep prototype testers
 bounded; review usage before public expansion. No paid service was activated and
 no zero-cost guarantee is made. Existing media pricing/limits below remain relevant.
- Do not manually remove/replace source data through privileged IAM without the
 same epoch invalidation. Future trusted migration/complete erasure must include
 activityEpochs, RSVP/ref/count records, Club DO source/UID/epoch/aggregate data,
 pending work, all media/live data and permanent nonpersonal Club reservations.
- Prefer a tested corrective presentation-only frontend commit while keeping
 current Rules and **js/firebase/activityEpoch.js,groupRepository.js,sessionRepository.js**
 compatible. A wholesale pre-8.5 frontend restore can fail Leave/Delete safely;
 don't drop epoch coupling or loosen Rules to disguise it. Preserve local rides.
- Rules correction: same manual Firebase workflow/main, operation deploy, exact
 project confirmation, **scope=rules-only**, all emulator suites pass first. Keep
 optional fields/epochs/RSVP, existing privacy/retirement and 19 indexes/exemption.
- Worker correction keeps all **v1/v2/v3/v4** class exports/bindings/migrations, private
 R2 and secrets. Never delete a namespace/bucket or blindly roll back pre-v4 config.
 An approved corrective Worker can deny the activity route while retaining its
 class/alarms; review cleanup separately. No rollback is a data purge.

Full local source/tests/commits/limitations: BATCH_8_5_RESULT.md. Nothing deployed.

---

# Batch 8 — browser-only deployment and acceptance

Prepared locally 2026-10-15. **NOT DEPLOYED / live acceptance NOT RUN.**
App `1.6.0-batch8`, Firebase `motodash-87bf8`, Worker `motodash-live`, existing
Pages `/MotoDashboard/`. No software installation, new release branch, Firebase
Storage/Blaze upgrade, public bucket, paid Images service or second project.

## Gates and exact sources

| Classification | Finding / resolution |
| --- | --- |
| BLOCKER — media publication | Operator must provision/verify private R2 bucket `motodash-media`, dedicated media IAM/key and encrypted `MEDIA_SERVICE_ACCOUNT`, then publish Worker/v3 before Pages. None was done by the agent. |
| BLOCKER — live acceptance | Real Firebase IAM/Auth revocation, private/public two-account media and physical iPhone/Android tests below are NOT RUN. Local tests do not certify them. |
| BLOCKER — wider beta | Complete trusted account deletion/moderation and measured abuse/capacity remain absent. Media adds to the mandatory erasure inventory. |
| WARNING | R2 activation may require payment details/usage enrollment even when planned usage fits free allowances. Check the existing account; do not approve paid activation/plan upgrades without a separate explicit decision. |
| WARNING | Media writer IAM is project-level: Firestore client Rules cannot restrict its writes to mediaRecords. Code does so; key compromise has broader database impact. Review the custom role and rotation before provisioning. Never grant Owner/Editor/Firebase Admin. |
| WARNING | One serialized MediaState is intentionally a small-prototype bottleneck. Quotas/rates bound usage but an attacker can exhaust a shared allowance. Scaling needs a separately tested sharding/global abuse design. |
| WARNING | Server checks raster signature/container/dimensions/PNG CRC and rejects metadata, animation and SVG; this is not full JPEG/WebP entropy decoding or malware/content moderation. Browsers decode/re-encode before upload. |
| INFORMATION | `firestore.rules` adds explicit mediaRecords client denial; previous default denial already protected unknown paths. All prior permissions stay. `firestore.indexes.json` is unchanged: **19** composites plus routeChunks.pointsJson exemption. |
| INFORMATION | Existing Pages allowlist automatically includes css/media.css and js/media/. Backend files/credentials remain outside Pages. No Pages workflow redesign. |

Sources: `cloudflare/wrangler.jsonc`, `cloudflare/src/MediaState.js`, mediaPolicy.js,
mediaFirestore.js, mediaImage.js and mediaTheme.js; IAM template
`cloudflare/media-writer-role.json`; Firestore files `firestore.rules`,
`firestore.indexes.json`, `firebase.deploy.json`. RTDB `database.rules.json` stays
locked and outside deployment. Existing frontend `live-config.js` endpoint stays
`https://motodash-live.old-sound-55f2.workers.dev` (media HTTPS; live HTTPS/WSS).

## 1. Private R2 bucket — Cloudflare Dashboard

1. Open the **existing Cloudflare account → R2 Object Storage**. Check current plan,
   usage and any activation/payment prompt. No paid service was activated locally;
   stop if provisioning requires an unapproved billing change.
2. If authorized provisioning is available, choose **Create bucket**, exact name
   **motodash-media**, **Standard** storage. Choose the appropriate EU location/
   jurisdiction based on the account's offered settings and privacy needs; record it.
3. Bucket → **Settings**: keep **Public Development URL / r2.dev disabled** and no
   public/custom domain. Do not configure public bucket CORS or create S3 keys for
   the frontend. The Worker binding is the only application access path.
4. Do not add a blanket age-based lifecycle deletion: active profile/vehicle images
   may be old and still valid. App journals/alarms handle stale objects. Inspect any
   preexisting bucket contents/mirror records read-only; do not assume empty or purge.
5. The checked-in binding is **MEDIA_BUCKET → motodash-media**. Wrangler deploy
   attaches it; no manual replacement Worker or bucket is needed.
   [Official R2 binding guide](https://developers.cloudflare.com/r2/get-started/workers-api/).

## 2. Dedicated Google Cloud media account — browser only

1. Open Google Cloud Console and select **motodash-87bf8**. The same project backs
   Firebase; do not create another project or enable the Identity Platform product.
2. **IAM & Admin → Roles → Create role**. Title **MotoDash Media Backend**, ID
   **motodashMedia**, stage **General availability**. Use exactly these permissions
   from `cloudflare/media-writer-role.json`:
   `datastore.databases.get`, `datastore.entities.get`, `datastore.entities.create`,
   `datastore.entities.update`, `datastore.entities.delete`, `firebaseauth.users.get`.
   Do not add list, IAM/admin/configuration or Auth-write permissions.
3. **IAM & Admin → Service Accounts → Create service account**. Account ID must be
   **motodash-media**, email
   **motodash-media@motodash-87bf8.iam.gserviceaccount.com**. The code verifies that
   exact identity, project and service_account type. Assign only the custom role
   just created, on this project. Skip giving users additional impersonation roles.
4. Verify Firestore and the existing **Identity Toolkit API** are available for
   this Firebase project. Auth lookup uses `firebaseauth.users.get`, a current
   disabled/validSince check and cloud-platform scope; no Auth/provider deployment.
   [Official account lookup permissions](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/lookup).
5. Account → **Keys → Add key → Create new key → JSON**. Keep the downloaded file
   outside the repository and shared/synced folders. Never paste it into chat,
   source/YAML, frontend config, screenshots, workflow output or an artifact.
   If your organization forbids key creation, stop and arrange approved workload
   credentials; do not work around its policy or borrow another account's key.
6. Cloudflare → **Workers & Pages → motodash-live → Settings → Variables and Secrets
   → Add → Secret**, name **MEDIA_SERVICE_ACCOUNT**, value the complete JSON.
   Save as **encrypted Secret**. Never use a plain variable. No new GitHub secret
   for this runtime key is needed; the workflow never uploads/prints Worker secrets.
7. Keep **FIRESTORE_SERVICE_ACCOUNT** unchanged with its existing **read-only**
   account. Keep the GitHub Firebase deployer separate. Neither is reused for media.
8. Rotation: create a replacement JSON key for the same media account, update the
   encrypted Worker secret, verify media reads/upload/delete and unchanged live
   sharing, then delete the old key in Google Cloud. Record key IDs/date privately,
   without key payloads. Rotate promptly on exposure and periodically (e.g. 90 days).

Existing GitHub repository Actions secrets are **CLOUDFLARE_API_TOKEN**,
**CLOUDFLARE_ACCOUNT_ID**, **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON**. No R2 S3 token
or media private key belongs in GitHub. The Cloudflare deployment token must cover
the existing account's Workers/DO deployment and binding the existing R2 bucket;
review any missing permission from the deployment error and grant only the needed
R2 binding/read permission, not account-wide administration or unrelated buckets.

## 3. Publish source after approval; deploy backends, Pages last

1. Save current secure frontend SHA, published Rules source/hash and Worker version/
   all namespace IDs for rollback. Ask testers to finish/save rides and stop sharing;
   close old live tabs and allow two minutes for existing claims to expire.
2. GitHub → **Actions → Deploy to GitHub Pages → … → Disable workflow**. The
   published site remains up. This avoids main's Pages push trigger deploying first.
3. In the VS Code PowerShell terminal, after approval:

   ```powershell
   git switch main
   git status --short
   git log --oneline origin/main..main
   git push origin main
   ```

   Expect a clean reviewed tree. No force push, extra branch or local CLI installs.
4. **Actions → Validate or deploy MotoDash Firestore → Run workflow**: branch
   **main**, **operation=deploy**, **confirmation=motodash-87bf8**,
   **scope=rules-and-indexes**. This compiles/tests all suites including Batch 8
   before credentials are available. It deploys only Firestore Rules/indexes.
   If all 19 indexes are independently confirmed current, **scope=rules-only** is
   also sufficient for this batch. Do not infer the 19th Enabled from a push.
5. Firebase Console → project **motodash-87bf8 → Firestore → Rules**: compare the
   whole file/publication time with reviewed `firestore.rules`, including explicit
   `mediaRecords` denial and all existing privacy/retired-ID guards.
6. **Firestore → Indexes → Composite**: verify all **19 Enabled**, including
   profileDirectory **visibility ASC / searchName ASC**, Collection scope. Keep
   every previous definition and **Single field → routeChunks.pointsJson exemption**.
   Emulator success does not certify index building. Auth domains remain
   **eggheadstudio.github.io**, **localhost**, no path/scheme; Email/Password stays.
7. **Actions → Deploy MotoDash Cloudflare Worker → Run workflow → main**,
   **no additional inputs**. Manual main-only workflow uses the existing Wrangler
   file, dry-run and all Worker/workerd tests. No secret values enter test jobs.
8. Cloudflare → **motodash-live → Deployments**: record successful reviewed version.
   **Settings → Bindings** must contain:
   **LIVE_ROOMS → LiveRoom / v1**, **LIVE_IDENTITIES → LiveIdentity / v2**,
   new **MEDIA_STATE → MediaState / SQLite v3**, **MEDIA_BUCKET → motodash-media**.
   Append v3; never delete/recreate v1/v2 or their namespaces. Keep both encrypted
   secrets and **FIREBASE_PROJECT_ID=motodash-87bf8**,
   **ALLOWED_ORIGINS=https://eggheadstudio.github.io**. No origin wildcard or RTDB.
9. Direct Worker navigation may return origin_denied; that is not a media/live
   acceptance test. Media must be exercised from Pages with real Auth/current roles.
10. **Actions → Deploy to GitHub Pages → Enable workflow → Run workflow → main**,
    **no inputs**. Verify SHA/success, HTTPS `/MotoDashboard/`, **1.6.0-batch8**,
    relative media imports/CSS, EN/FI and optional media failure feedback. Preserve
    IndexedDB/private rides; close/reload stale tabs rather than clearing all data.

## 4. Two-account media acceptance — NOT RUN

Use disposable **A/B**, independent sessions, iPhone Safari + Android Chromium,
foreground/stationary. Do not paste tokens/private images/GPS in reports. Privileged
Console viewing does not prove signed-in client security.

1. A saves Profile settings, opens **Images & appearance**, selects/crops avatar
   and banner, uploads privately, replaces/removes each. Confirm optimized preview,
   upload progress, EN/FI feedback, placeholder fallback and refresh persistence.
2. Make A's profile Public. An unchecked photo must remain inaccessible to B and
   signed-out visitors. Enable **Allow public presentation** for one photo; B and
   signed-out known-profile visitors can fetch only that photo. Set profile Private:
   a **new** B/signed-out image fetch denies. Restore Public and then restrict that
   photo again: new reads deny without changing the image ID/pixels.
3. Add private Garage photos in two slots; set cover and move order. Confirm six-slot
   bound, replacement/removal and gallery persistence. Public Garage card opt-in
   alone must not expose unchecked photos. Publish a selected card/photo with a
   Public source vehicle and profile; B sees only the permitted cover/gallery.
   Hide/unpublish/delete the vehicle: new B image fetches deny immediately. Recreate
   a fresh vehicle: no old photos, permissions or alias inheritance.
4. A owns a Club; B is ordinary Member with visible rank **Captain**. A manages logo,
   banner and controlled theme; B can read private Club branding as a member but
   cannot modify it. Promote B to Admin, confirm authorized edit; revoke Admin and
   verify the **same open editor** cannot upload/delete/change publication or theme.
   Outsiders cannot fetch private Club images. Retired Club references must deny.
5. A creates Event, Meet and Group Ride banners and theme. Public/approval images
   require per-photo publication for outside signed-in viewers. Private/unlisted
   images require actual participation or authorized organizer status; links/invite
   possession alone do not make images public. Verify Discover/detail/Club listings,
   membership removal/bans and organizing Club retirement deny current access.
6. Pick built-in rank icons/badges/colors, upload a small PNG/WebP source (prepared
   PNG), replace/remove graphic. B's Captain label/graphic confers no role. Confirm
   arbitrary SVG, spoofed type, >1.5MB payload or oversized dimensions reject.
7. Two A tabs read the same media revision and replace/delete simultaneously:
   one write succeeds, the stale write gets **conflict**. Refresh actual state before
   retry. Check old image IDs cannot retrieve replaced/deleted bytes. Simulate a
   connection failure: UI reports uncertainty and does not blindly replay uploads.
8. Disable disposable B in Firebase Auth or revoke its tokens with a separately
   approved trusted tool: media must deny its old token on a new request. Re-enable
   and reauthenticate for further tests. Do not assume this changes live room leases.
9. Inspect R2 privately: opaque object keys, no originals/EXIF GPS, no r2.dev access.
   Firestore mediaRecords are metadata/references only. Signed-in A/B direct SDK
   get/list/write/delete of mediaRecords must deny, including alleged owner records.
   Avoid printing responses with private IDs/credentials or testing with real content.
10. Observe replaced/deleted object disappearance and pending/retired-source cleanup.
    An hourly alarm scans up to 25 image and 25 resource records, rotating cursors;
    at the full 2,000-record bound, one sweep may take about **80 hours**. Authority
    outage delays cleanup; it never grants reads or becomes deletion proof. New reads
    still check policy immediately. Never mark complete erasure from access denial.

## 5. Mobile and existing-feature acceptance — NOT RUN

- Saved ride: collapse **Ride details** and **Recorded ride replay** independently;
  route map stays usable at 320px portrait/short landscape. Replay advances while
  controls are collapsed, retaining seek position/speed; red route/gold progress,
  fit after toggles, language, export and Back remain correct. No GPS starts.
- Camera/gallery, crop sliders, large touch targets, keyboard focus, safe areas,
  text enlargement, portrait/landscape, contrast/reduced motion and image fallback.
  HEIC/animation/SVG/over-40MP inputs show unsupported feedback; choose JPEG or a
  smaller camera export. Native phone media selection/canvas behavior is unaccepted.
- Recheck login/logout/guest, Garage/history/private exports, Clubs/roles/Wall,
  invitations/approvals/notifications/Discover/QR and Return to Ride.
- A/B join an active Group and explicitly consent; verify both live markers, one
  GPS watcher, map/heading/weather/recording preserved, leave/end/logout revocation,
  network recovery and no automatic sharing after reload. Media is not a new GPS or
  live transport pipeline. Unavailable media never blocks personal recording.

## 6. Limits, retention, costs and monitoring

Hard application limits: **1.5MB**, **1920px** server raster cap; browser output
**1600px** JPEG / **256px** rank PNG; original **12MB/40MP** cap; six photos/vehicle;
**30 files/30MB per canonical resource owner**, **100 configured resources/owner**,
**2,000 files/1GB and 2,000 resource ledgers globally**. Pending/deleting objects
count toward quotas; temporary replacement must fit the projected owner total.
Limits are prototype capacity controls, not subscription entitlements.

Per hashed verified UID (anonymous reads: hashed connecting IP): **120 requests/min**,
**30 mutation attempts/hour**, **10 upload attempts/hour**; global **2,500 request
attempts/UTC day**. One MediaState serializes revisions/quota changes, bounded queue
20. Anonymous users cannot mutate. Distributed callers can exhaust shared capacity;
these bounds are not a complete internet-scale anti-abuse service.

Private/public changes revoke future Worker reads; no permanent R2/public/signed
URLs, CDN cache or service-worker image cache. Responses are no-store/nosniff;
browser images use short-lived blob URLs revoked on detach/logout. Previously
downloaded/public content cannot be recalled. Hidden/private media remains stored
for its owner/member audience; deleting/replacing queues physical deletion. Source
retirement/deletion/incarnation mismatch is garbage-collected; completed Groups
retain banners while their canonical source/Club exists. Roles changing is not a
source deletion. Authority outages keep retry journals fail-closed. Future complete
account deletion must explicitly drain media records/ledgers/journals/R2 and resolve
owned Club/Group media; Auth-only deletion is insufficient.

Estimate: 20 testers ×10 optimized 250KB images ≈**50MB**, 500 uploads/replacements
and 20,000 image reads/month fit current R2 Standard allowances in isolation. Current
allowances: **10GB-month, 1M Class A, 10M Class B**; excess Standard storage **$0.015/
GB-month**, writes **$4.50/M**, reads **$0.36/M**, egress free. Shared account usage,
rounding, Worker/DO and Firestore/Auth calls are separate. No $0 bill is guaranteed.
[Official R2 pricing, checked 2026-10-15](https://developers.cloudflare.com/r2/pricing/).

Inspect Cloudflare R2 storage/operations and Worker CPU/errors/requests + MediaState
storage/alarm behavior; Firebase Firestore reads/writes/storage/denials and Auth
quotas. Each image read rechecks source (several Firestore gets), and every signed-in
media request adds one Auth lookup; upload rechecks authority and performs metadata
commits. Alarms add reads even without active viewers. Existing live reads share
the same Firebase quota. Set available usage/billing alerts and review weekly;
alerts do not cap spend. Never turn on paid Images/Blaze/DO tiers automatically.

## 7. Safe rollback

1. Stop media editing/sharing and preserve reviewed version/namespace evidence.
   Restore compatible frontend files from secure baseline **eb8a271** in a new main
   commit, deploy Pages manually. Do not force push, erase local rides or revert
   backend Rules/migrations wholesale. Old frontend simply ignores media.
2. Keep all **19 indexes**, existing secure Rules and explicit client denial of
   mediaRecords. A Rules correction must be secure/schema-compatible and pass all
   emulator suites; same Firebase workflow, main, deploy, project confirmation,
   **scope=rules-only**. Old default-deny already denies mirrors, but do not revert
   unrelated privacy/role/retired-ID protections.
3. After v3, keep **MediaState export/binding/v3 migration**, private R2 and both
   existing live namespaces. Do not roll back to a config that drops/deletes v3.
   Prefer a corrective Worker revision that denies media routes while retaining
   the class/migration and live behavior, then run all Worker tests and manual deploy.
   Existing object alarms must be considered; routing-only removal does not stop them.
4. For media-key exposure, revoke that dedicated key/role, replace it and audit
   private mirrors/objects via approved operator procedures. The live read-only
   account remains separate. A media kill switch/key removal may pause cleanup;
   retain the journals/bucket and restore trusted access deliberately. Do not grant
   broad client reads or delete namespaces/buckets to disguise an incident.

No deployment, Console change, production write, billing activation or live test was
performed by the agent. Complete local evidence and commits: BATCH_8_RESULT.md.


---

> The following dated Batch 7/6B/6A procedures are historical evidence. Use the Batch 8 runbook above for current publication, new media IAM/secrets and v3/R2.

# MotoDashboard deployment and acceptance checklist

**Current Batch 7 preparation, 2026-10-14:** Batch 6B deployment/core working is now
operator-reported. Batch 7 is local only. Its Rules add profileDirectory privacy/
search coupling and its indexes add **profileDirectory(visibility ASC, searchName
ASC), Collection scope**: **19 total**. Deploy the complete new Rules/index inventory
before the 7 frontend, after approval; wait for the new index Enabled. Existing
manual Firebase workflow validates the new Batch 7 suite. No new secret/paid service
or Worker change is needed for M1. The 6B rollout below is historical; the final
Batch 7 runbook/acceptance is immediately below. Nothing deployed.

## Batch 7 — exact current browser-only publication

Batch 7 is implemented and tested locally, **not deployed by the agent**. Its scope
is Firestore Rules/indexes + static frontend. **No Cloudflare deployment, migration,
new secret/environment variable, Auth/Hosting/RTDB/Storage change or paid service.**
Existing LIVE_ROOMS/v1 and LIVE_IDENTITIES/v2 stay intact. The older 6B rollout below
is historical; do not redeploy that earlier revision over the reviewed Batch 7 source.

1. After approval, record reviewed main SHA and current secure Rules/frontend versions.
   In GitHub Actions temporarily disable **Deploy to GitHub Pages**, leaving the
   current published site online. This prevents main push publishing UI before Rules/index.
2. VS Code terminal: `git switch main`, `git status --short`,
   `git log --oneline origin/main..main`, then **only after approval** `git push origin main`.
   No force push, installation or additional branch. Keep older tabs/profile editors
   idle during the short mixed Rules/UI window; refresh them after publication.
3. Actions → **Validate or deploy MotoDash Firestore** → Run workflow:
   branch **main**, **operation=deploy**, **confirmation=motodash-87bf8**,
   **scope=rules-and-indexes**. Existing **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON** from
   the dedicated configuration deployer remains; never use Cloudflare's read-only key.
   Sources: **firestore.rules**, **firestore.indexes.json**, **firebase.deploy.json**.
   Demo validation includes **run_batch7_rules.py** before any production credentials.
4. Firebase Console → **motodash-87bf8 → Firestore → Rules**: verify current source
   including profileDirectoryMatches/directoryPrivacy, bounded authenticated directory
   queries, unchanged private/profile/showcase/Club/Group boundaries and default deny.
   **Indexes → Composite**: verify all previous 18 remain Enabled, and the new
   **profileDirectory / Collection / visibility ASC + searchName ASC** becomes
   **Enabled**. Total **19**, not just submission success. Retain routeChunks.pointsJson
   exemption; authorized domains **eggheadstudio.github.io** and **localhost** unchanged.
5. Do **not** run Deploy MotoDash Cloudflare Worker for this batch. Its source/config/
   bindings/protocol are unchanged; Dashboard can be inspected read-only for the
   already deployed 6B Worker. Keep origins/secrets/IAM and RTDB deny-all unchanged.
6. Re-enable **Deploy to GitHub Pages** and manually Run workflow on **main**, no
   inputs. Confirm reviewed SHA, **1.5.0-batch7**, `/MotoDashboard/` assets/hash refresh.
   No service worker update or local ride-data clearing. Backend workflow success is
   separate from effective client authorization and physical acceptance.

Existing Public profiles enter the new directory during their owner's login/save;
private accounts/vehicles never publish automatically. No agent-run migration or
production backfill. Record actual rollout/index evidence yourself.

### Batch 7 two-account/mobile acceptance — NOT RUN

Use disposable A/B accounts on Android Chromium/iPhone Safari, stationary/on foot:

1. EN/FI anonymous landing, explicit guest entry/no GPS, login and invitation return.
   Sign in A/B. A is Private: B's **Discover → People** prefix search cannot find A.
2. A explicitly sets profile Public. Search mixed-case name including Ä/Ö/Å; test
   duplicate names, More pages and public URL refresh. Search cards/root must contain
   no email/UID/private notes/history/location. Other accents/scripts preserve case.
3. A creates two vehicles, Show on profile with separate public text/consent, Set as
   featured, View public profile/Preview as visitor. Confirm visible/selected/private
   labels. Hide, edit/delete and profile Private remove visibility; fresh B reads deny.
   Retest permitted Club-member/Group-participant profile links and existing ranks.
4. Home → Map preferences: select a default follow zoom. On a safe test walk/ride,
   compare low/stopped/urban/highway conditions (highway behavior can be simulated,
   do not interact while driving). Heading changes stay smooth/unscaled; poor accuracy
   does not pull the camera. Manual pan/pinch holds until Center. Test themes/markers,
   north transition, portrait/landscape, background resume and one GPS watcher.
5. Finish a local ride, History → Open: only recorded metadata/route/export appear,
   no current GPS/weather/clock/speed/recording/sharing controls. Back returns to History.
   Repeat with lazily loaded private cloud history; B's foreign reads/writes still deny.
6. Replay Play/Pause/seek/1×/2×/4×/8×/Restart/end/follow/overview. Gap position hides;
   short/untimed routes explain overview-only. Test long-route simplification, EN/FI,
   keyboard/text scaling and rotation. No new GPS/Firestore writes during replay;
   closing/logout removes playback/marker/controls. Exports retain full original points.
7. Retest two-phone Group sharing/Return to Ride, same-UID second-Group conflict,
   stop/leave/end/logout/removal and fresh consent after refresh from the 6B checklist.
8. Simulate offline/restore and an optional Discover error. Loading must stop, feedback
   remain inline, Refresh recover. Confirm other GPS/live/local recording stays usable.

### Safe network evidence — root cause remains unconfirmed

Record app version, operation, safe **MD-TIMEOUT/OFFLINE/PERMISSION/PRECONDITION/
AUTH/UNAVAILABLE/NETWORK + operation enum**, device/browser/time and expected/actual
result. Do not infer Wi-Fi, missing index or server failure solely from a generic code.
Compare the same operation on Wi-Fi/cellular, recording blockers/VPN if known.
Existing DevTools, on the app page, can show safe in-memory information:

```javascript
const a = await import('./js/firebase/access.js');
console.table(a.getDataDiagnostics());
console.table(a.getReadDiagnostics());
```

These expose codes/times/aggregate pending/coalesced counts, no paths/tokens/coordinates.
Inspect endpoint class/status/timing locally (Auth, Firestore, Worker, tiles/weather);
never share HAR/headers/payloads/query strings. Check failed-precondition's actual
index/precondition locally against the 19-source inventory. Timed-out writes may
still finish: refresh actual state before resubmission. Pending SDK reads cannot be
aborted by Promise.race; if channel recovery stalls, reload/reopen the app without
clearing IndexedDB/local rides. No forced polling/automatic transport reset is enabled.

### Rollback

Prefer a reviewed compatible frontend restore while keeping the secure new Rules
and all 19 indexes. Do not blindly restore 6B Rules: new clients create profileDirectory
and privacy changes must remove it atomically. Use a reviewed stricter/schema-compatible
Rules correction via the same manual workflow, **scope=rules-only**, same project
confirmation. Keep all indexes/reservations/locked RTDB and Cloudflare namespaces;
no purge or private-read widening. Reverify effective two-account denials afterward.

Publication and physical/production acceptance remain gates. Complete trusted account
deletion, service-wide abuse/quota control and immediate token revocation remain
separate wider-release work. Full evidence: BATCH_7_RESULT.md.

Updated **2026-10-13** for Batch 6B. The operator reports **6A deployed/working**;
**6B is implemented/tested locally and is not deployed**. Use the following current
runbook. The older 6A publication instructions below describe the preceding rollout.

## Historical Batch 6B publication — browser-only runbook

No deployment or production data operation was performed by the agent. Run these
steps only after approving the local commits. No Node/npm/CLI installation or new
deployment branch is needed on this computer.

| Classification | Finding / correction |
| --- | --- |
| BLOCKER — 6B publication | Publish new **firestore.rules**, Worker **LIVE_IDENTITIES/LiveIdentity + v2 migration**, then the compatible frontend. Existing 6A backend versions do not implement 6B privacy/ownership paths. |
| BLOCKER — acceptance | Production two-account/phone tests and native Safari are NOT RUN. Local emulator/workerd/Chromium evidence does not certify live policy. |
| BLOCKER — wider public beta | Trusted complete account deletion remains absent; all new projection/mapping/claim paths must join its inventory. Auth-only deletion is insufficient. |
| WARNING | Previously downloaded public content cannot be retracted. Anonymous known-ID reads add ACL reads/quota and need abuse controls before wider use. |
| WARNING | Members-only profile policy, uploads and paid entitlements are deferred. Four showcase/two affiliation slots are prototype read/payload bounds, not subscriptions. |
| WARNING | Auth-disabled/revoked tokens can last until expiry; background GPS and operational quotas remain unaccepted. Browsers without Web Locks and writable IndexedDB cannot safely start a personal recorder. |
| INFORMATION | Existing **18** composites and routeChunks.pointsJson exemption remain unchanged; all 18 Enabled is operator-reported. No new indexes, secrets, IAM write grant, Firebase service or paid infrastructure is required. |
| INFORMATION | 6B defaults existing profiles/vehicles to unpublished, including legacy Public preferences. Collections are created only by explicit owner actions; no automatic production migration/backfill. |

### 1. Publish reviewed main without starting Pages prematurely

1. Read BATCH_6B_RESULT.md. Record the reviewed main SHA, currently deployed secure
   frontend/Rules/Worker versions and current namespace IDs for rollback.
2. Ask the prototype testers to stop live sharing and finish or safely save their
   personal rides. Close old live tabs and wait **two minutes** before the Worker
   upgrade, covering the previous backend's abandoned-socket/lease window. This is
   a quiet rollout, not a data purge; retain Clubs, Groups, rides and reservations.
3. GitHub repository → **Actions → Deploy to GitHub Pages → … → Disable workflow**.
   The existing published site stays online. This pauses main's automatic Pages
   trigger without editing the workflow or creating another branch.
   [GitHub's browser procedure](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).
4. In the VS Code terminal, after choosing to publish:

   ```powershell
   git switch main
   git status --short
   git log --oneline origin/main..main
   git push origin main
   ```

   Expect a clean tree and the reviewed local commits. No force push. This makes
   backend source available to manual Actions; it does not deploy either backend.

### 2. Firestore — manual workflow from that main revision

1. **Actions → Validate or deploy MotoDash Firestore → Run workflow**.
2. Branch **main**; operation **deploy**; confirmation **motodash-87bf8**; scope
   **rules-and-indexes**. A separate **operation=validate** run is optional: deploy already
   requires the validation job, including **tests/run_batch6b_rules.py**.
3. Existing GitHub Secret **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON** must belong to
   **motodash-firebase-deployer@motodash-87bf8.iam.gserviceaccount.com**, with the
   unchanged **firebase-deployer-role.json** configuration-only permissions.
   Never reuse Cloudflare's read-only reader key.
4. Confirm both jobs succeed for the intended SHA. Sources are **firestore.rules**,
   **firestore.indexes.json**, **firebase.deploy.json**, database **(default)** in
   **motodash-87bf8**. No Auth, Hosting, RTDB, Storage or Cloudflare deployment occurs.
5. Firebase Console → select **MotoDash / motodash-87bf8** → **Build → Firestore
   Database → Rules**. Verify publication time and full source, including
   `publicProfileAvailable`, `showcaseAvailable`, `affiliationAvailable`, private
   owner mappings and default deny. Preserve all earlier private/retired-ID rules.
6. **Indexes → Composite:** retain all **18 Enabled**, comparing the table below.
   **Single field:** retain routeChunks.pointsJson exemption and automatic indexes
   for notifications.createdAt/readAt, displayProfiles.displayName and existing refs.
7. **Authentication → Settings → Authorized domains:** retain
   **eggheadstudio.github.io** and **localhost**, without `/MotoDashboard/` in the
   domain entry. Email/password stays enabled. No new Firebase settings are needed.
8. Keep **database.rules.json** read/write false; do not deploy or enable RTDB.

### 3. Cloudflare — append the coordinator migration

1. **Actions → Deploy MotoDash Cloudflare Worker → Run workflow → main**.
   **No additional inputs.** Use the same reviewed revision. Its npm test/dry-run
   gate includes actual workerd coordinator tests before deployment.
2. Existing GitHub Secrets: **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**.
   The official Wrangler Action uses **cloudflare/wrangler.jsonc**, Worker
   **motodash-live**, preserving **LIVE_ROOMS → LiveRoom / v1** and appending
   **LIVE_IDENTITIES → LiveIdentity / v2**. Do not delete/recreate v1 or either namespace.
3. Cloudflare Dashboard → **Workers & Pages → motodash-live → Settings → Bindings**:
   verify both Durable Object bindings and the new SQLite namespace. Record deployed
   version/namespace evidence. The migration is created by Wrangler, not a frontend
   toggle or a manually invented replacement namespace.
4. Verify unchanged variables **FIREBASE_PROJECT_ID=motodash-87bf8** and
   **ALLOWED_ORIGINS=https://eggheadstudio.github.io**, and existing encrypted
   **FIRESTORE_SERVICE_ACCOUNT**. Keep its read-only IAM; no new secret or Firestore
   write access is required. No origin wildcard, scheduled trigger or paid service.
5. Endpoint stays **https://motodash-live.old-sound-55f2.workers.dev**; HTTPS tickets
   and WSS sockets remain. Direct navigation returning origin_denied is expected
   and does not prove authenticated live behavior. Monitor actual request/storage/read
   quotas: coordinator renewals add about 3 requests/minute per active UID.

### 4. Publish Pages last

1. **Actions → Deploy to GitHub Pages → Enable workflow**.
2. **Run workflow → main**, no additional inputs. Confirm success and the reviewed SHA.
3. Open **https://eggheadstudio.github.io/MotoDashboard/**. Reload/close old tabs;
   verify **1.4.0-batch6b** via the existing version diagnostics. Do not clear local
   rides/IndexedDB to force an update. There is no new service worker to deploy.
4. Confirm anonymous landing, intentional guest entry, private navigation after
   login, EN/FI, public `#/rider/{opaque-id}` refresh and unchanged Group invitation/QR
   return. All frontend assets remain relative beneath `/MotoDashboard/`.
5. Run the acceptance procedure below and record outcomes. Deployment success is
   separate from effective Rules, cross-device authorization and physical GPS.

### 5. Two-account/two-phone acceptance — NOT RUN

Use disposable accounts **A/B**, Android Chromium and iPhone Safari, over HTTPS,
stationary/on foot and foreground. Choose a deliberate testing window; these steps
create test data. Record versions, language, device/browser, safe error codes and
expected/actual outcomes; never save passwords, tokens or precise locations in logs.

1. Signed out: EN/FI landing, proposed prices, Sign in/Create account, reduced motion,
   natural scrolling/portrait/landscape. No GPS prompt. Try dashboard then explicitly
   Start Ride; permission denial/retry and explicit guest refresh Resume work.
2. A adds two vehicles with private notes. Public preferences alone publish nothing.
   A configures a bio/accent/banner, opts into Public profile and explicitly publishes
   selected cards with separate public text. B opens the copied profile URL signed
   out and after refresh. Name/category/cards appear; email, UID, private notes,
   unselected Garage, history, precise location and technical roles do not.
3. A makes the profile Private: new B server reads of root/cards deny. Restore Public,
   then make a vehicle Private or delete it: the card/featured reference disappears;
   raw retained-card reads deny. A can manage its own Garage/history; B's own signed-in
   SDK reads/writes to A's private records and projection/mapping writes must deny.
   The privileged Console editor is not a client-permission test.
4. A explicitly publishes current identity/rank from a public Club. Private Club
   identity cannot publish. Privacy/rank/membership changes deny the stale card;
   A updates/removes it. Visible ranks never grant technical rights.
5. A records and shares in active Group **X**; B is actually admitted and opts in.
   Verify two readable markers, Group-selected vehicle, stats, stale status and one
   GPS watcher. Browse all five screens: bell and Return to Ride remain reachable;
   return preserves record/vehicle/stats/socket. Home does not stop sharing.
6. Second personal Start offers Return/Cancel and preserves the old ride. Open the
   same account in another tab: competing personal resume/Start cannot start GPS.
   Close/release the owner tab, then explicitly Resume the durable record.
7. For the actual same-UID cross-device test, keep A sharing in X on phone 1; sign
   phone 2 out of B and into **A**. A is admitted to another active Group **Y** on that
   phone. Starting Y must return the active-ride conflict, leave X on phone 1 running
   and send no Y coordinates. Return on phone 2 is sharing-off until explicit consent.
   Explicit same-X reconnect may replace its earlier publisher, never another Group.
8. Stop/leave/end/logout: markers/private live state clear. Ending a Group does not
   finish an independent personal record. Logout stops GPS and returns to landing.
   Refresh never auto-restores live consent; remembered Group authority is rechecked.
9. Remove/ban B or end X while B is silent: expired authority receives no later
   positions within the documented lease bound. Test network loss/reconnect and
   lock-screen suspension: abandoned claims expire; new active sharing never overlaps
   an expired old receiver. Capture safe diagnostics on Wi-Fi and mobile data if needed.

Use the earlier full role/retirement/QR procedure below for existing functionality.
A third account is still needed for the complete Admin/Host permission matrix.
Mark unavailable physical/authorization paths NOT RUN rather than inferred PASS.

### 6. Safe rollback

- Keep the current secure Rules/Worker while rolling back compatible frontend files
  to a reviewed secure commit. Restore only frontend paths in a new main commit;
  do not force push or accidentally revert migrations/backend security files.
- Once v2 exists, retain both class exports, bindings and migration history even
  when disabling new UI. Never roll back to a Worker that lacks global coordination
  and describe it as exclusive. Drain sharing before any reviewed backend rollback.
- Rules rollback must be a reviewed **schema-compatible secure revision**. A pre-6B
  Rules history can deny three-field displayProfiles and break invitations/search;
  do not publish it blindly. Use the manual Firebase workflow's **rules-only** scope
  with the same project confirmation for a compatible secure fix. Leave indexes intact.
- For a real public-data incident, a deliberately reviewed stricter deny-public policy
  is safer than widening access. Inspect Console source/publication and effective client
  denials. Back up evidence, preserve immutable reservations and do not purge data.

Full source/model, counts, operational limitations and commits: BATCH_6B_RESULT.md.
No live acceptance item above is marked complete by local automation.
This is the current runbook. Older preparation, security reproductions and full
migration/probe records are preserved in [the historical checklist](docs/history/pre-batch6/DEPLOYMENT_CHECKLIST.md).
The audit performed no push, deployment, branch deletion or production-data operation.

## Current state and remaining gates

| Classification | State / required follow-up |
| --- | --- |
| INFORMATION | Batch 5 UI published at https://eggheadstudio.github.io/MotoDashboard/, per operator. |
| INFORMATION | Firebase Authentication/Firestore configured; Firestore Rules deployment succeeded and all 18 composites are Enabled, per operator. The previous one-index/missing-17 blocker is resolved by that report. |
| INFORMATION | motodash-live Worker and SQLite Durable Objects deployed; production endpoint configured. |
| INFORMATION | Main contains the current Pages, manual Firebase and manual Worker workflows. No deployment branch is needed. |
| INFORMATION — Batch 6A | The operator reports its Rules/Worker/frontend deployed and working. Batch 6B publication requirements are the current runbook above. |
| BLOCKER — wider public beta | Full account deletion is not implemented. Auth-only deletion and client recursive deletion are unacceptable substitutes. |
| BLOCKER — acceptance | Real-user/two-account/two-phone behavior and effective live security remain untested. Do not mark the release fully validated from publication or emulator results. |
| WARNING | Exact published commit/Rules version, retained single-field exemptions, IAM/key policy and legacy-data inventory should be recorded by the operator. This audit did not access private consoles. |
| WARNING | Club retirement denies access but retains private children/ID reservations. Never erase the reservation or reuse a retired ID. |
| WARNING | Token revocation, Spark/read quotas, whole-service abuse, mobile suspension and provider commercial terms remain operational limitations. |

## Architecture and exact sources

| Service | Source / responsibility |
| --- | --- |
| Pages frontend | `.github/workflows/deploy.yml`; index.html, public config, manifest/icon/logo, css/ and js/ only |
| Firebase Auth | `firebase-config.js`, `js/firebase/firebase.js`, `js/firebase/auth.js`; one named MotoDash app |
| Firestore default database | `firestore.rules`, `firestore.indexes.json`, `firebase.deploy.json`; persistent data/admission, no live GPS collection |
| Firebase deployment identity | `firebase-deployer-role.json`; dedicated motodash-firebase-deployer account, configuration permissions only |
| RTDB | `database.rules.json`: root read/write false; no runtime transport or initialization |
| Cloudflare live transport | `cloudflare/wrangler.jsonc`, `cloudflare/src/`; motodash-live, LIVE_ROOMS/LiveRoom/v1 retained plus local LIVE_IDENTITIES/LiveIdentity/v2 |
| Public live endpoint | `live-config.js`: https://motodash-live.old-sound-55f2.workers.dev |

Firebase project **motodash-87bf8**, database **(default)**. Public web config fields:
apiKey, authDomain, projectId, appId, messagingSenderId, storageBucket and the legacy
databaseURL. Values are present in source; databaseURL does not activate RTDB and
storageBucket does not establish a provisioned upload service.

## Record Firebase Console settings without changing data

1. Project settings -> General: verify the intended Web app matches firebase-config.js;
   authDomain is motodash-87bf8.firebaseapp.com and projectId is motodash-87bf8.
2. Authentication -> Sign-in method: Email/Password. Google sign-in remains future work;
   do not enable/change providers as part of this audit.
3. Authentication -> Settings -> Authorized domains: **eggheadstudio.github.io**,
   **localhost**, and the Firebase Auth default domain. Use hostnames only, no scheme
   or /MotoDashboard/ path. Record actual policy/password settings when testing recovery.
4. Firestore -> Rules: save effective published source/time and compare the complete
   text with firestore.rules at the deployed commit. A green deployment is publication
   evidence, not a two-account authorization test.
5. Firestore -> Indexes: retain the operator's all-18-Enabled evidence and compare each
   exact definition below. Verify the pointsJson exemption and automatic query indexes.
6. RTDB, if provisioned: verify deny-all without enabling/reading its data. Its source
   is database.rules.json and it is outside the Firebase workflow's deployment scope.
7. Cloudflare Dashboard: record Worker version, LIVE_ROOMS binding/migration and exact
   variables. Verify reader IAM is read-only and FIRESTORE_SERVICE_ACCOUNT is an encrypted
   secret by name/type only. Do not expose its JSON to the browser or this repository.

## Exact composite indexes and exemptions

All **19 source definitions** use Collection scope. The previous 18 are reported
Enabled; Batch 7's 19th is locally prepared and requires publication/Console verification.
Keep every previous definition and the exemption; no old index deletion is required.

| # | Collection | Ordered fields |
| --- | --- | --- |
| 1 | `sessions` | uploadState ASC, startedAt DESC |
| 2 | `lobbyEvents` | visibility ASC, state ASC, startsAt ASC |
| 3 | `lobbyEvents` | visibility ASC, state ASC, clubId ASC, startsAt ASC |
| 4 | `lobbyEvents` | visibility ASC, state ASC, meetingArea ASC, startsAt ASC |
| 5 | `lobbyEvents` | visibility ASC, state ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 6 | `lobbyEvents` | visibility ASC, state ASC, category ASC, startsAt ASC |
| 7 | `lobbyEvents` | visibility ASC, state ASC, category ASC, clubId ASC, startsAt ASC |
| 8 | `lobbyEvents` | visibility ASC, state ASC, category ASC, meetingArea ASC, startsAt ASC |
| 9 | `lobbyEvents` | visibility ASC, state ASC, category ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 10 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, startsAt ASC |
| 11 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, clubId ASC, startsAt ASC |
| 12 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, meetingArea ASC, startsAt ASC |
| 13 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 14 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, startsAt ASC |
| 15 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, clubId ASC, startsAt ASC |
| 16 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, meetingArea ASC, startsAt ASC |
| 17 | `lobbyEvents` | visibility ASC, state ASC, activityType ASC, category ASC, meetingArea ASC, clubId ASC, startsAt ASC |
| 18 | `clubDirectory` | category ASC, name ASC |
| 19 | `profileDirectory` | visibility ASC, searchName ASC |

Single-field exemption: **routeChunks.pointsJson**, `indexes: []`. Retain automatic
collection indexes for displayProfiles.displayName, clubDirectory.name/category,
owned clubRefs/groupRefs.joinedAt, participant joinedAt, invite createdAt and request
requestedAt. The emulator does not enforce production composite-index availability.

## Read-only legacy Club inventory and migration boundary

Deployment success does not prove that the database was empty. An earlier fresh-project
report preceded actual Group use, so do not assume a globally empty database.

1. Inspect clubs, clubPages, clubDirectory and users/*/clubRefs using trusted Console
   read-only access. Compare public-safe field allowlists against DATA_MODEL.md/Rules.
   Inspect known deleted/retired IDs, retained members/invites/ranks/wall/joinRequests
   and any subtrees whose parent is missing. A root collection count cannot certify
   that no orphaned subcollection exists.
2. Compare known historical deleted IDs/operator records with permanent canonical
   reservations. An unavailable/failed listing is unknown, not an empty inventory.
3. Record date, operator, project/database, inspected paths/known IDs, completeness and
   decision. Only a complete empty legacy inventory permits migration **not applicable**.
   Current new-schema records need acceptance/schema review but not invented migration.
4. If unsafe legacy projections or unreserved old IDs exist, plan a separately approved
   trusted repair. Preserve original evidence, field privacy and permanent reservations.
   Never client-purge recursively, attach old children to a new Club, delete data to
   make tests pass, or weaken Rules. No migration/physical erasure was run by this audit.

The full historical B6 inventory and trusted-repair rationale is retained in archive
sections **10.1/10.2**. Use it as evidence/design guidance, not instructions to redeploy
an obsolete Rules/frontend version. Group projections/children require their own
safe-schema inventory when planning complete account erasure.

## Future deployments ? browser/Actions only

The current deployment is complete per operator; the following applies to future
approved changes. Main remains the only required release branch.

- **Pages:** an approved `git push origin main` starts Deploy to GitHub Pages; Source
  is GitHub Actions. Its artifact allowlist excludes rules/tests/Worker/credentials.
- **Firebase:** use [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md). One repository
  secret, FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON, from the dedicated configuration
  deployer, using exactly firebase-deployer-role.json. Actions -> Validate or deploy
  MotoDash Firestore -> main -> deploy -> confirmation motodash-87bf8 ->
  rules-and-indexes. Every run validates before deployment. Validate-only is optional.
- **Worker:** use [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md). Manual deploy-cloudflare.yml,
  locked cloudflare dependencies and existing Wrangler config. GitHub Secrets are
  CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. The independent read-only Firestore
  credential stays only in Cloudflare's FIRESTORE_SERVICE_ACCOUNT secret.

No action deploys automatically from this audit. Firebase/Worker workflows do not
run on push. Keep all three identities/credential purposes separate; preserve current
origin validation, DO migrations, private Rules and locked RTDB.

## Two-account live security and product acceptance ? pending

Choose disposable accounts A/B with distinct display names and independent browser
profiles. There are no bundled credentials. The operator runs these tests only when
choosing to create test data; this audit did not. Record deployed versions, device/
browser, time, operation, expected/actual result and safe Firebase error code. Keep
UIDs/document IDs privately; never save passwords, tokens, invite secrets or locations.

1. Test EN/FI registration/confirmation, login/logout/refresh/name editing and guest
   recording. Each account completes profile sync so its minimal displayProfiles
   projection exists. Missing projections are distinct from missing composite indexes.
2. Each account creates/edits/selects/deletes its own Garage vehicle. Record/finish a
   ride, verify private manifest/chunks/ready state, reload history, rename, export
   JSON/GPX and retry an offline completed upload without duplicate chunks.
3. Verify B cannot read/update/delete A's profile, vehicles, session manifest, chunks,
   tombstones or private account refs. Use actual signed-in client SDK probes; the
   Console Data editor uses privileged IAM and does not prove client access. Confirm
   equivalent legitimate B operations succeed and denial is permission-denied, not
   a network/missing-index/missing-document artifact.
4. A creates public/open, approval and private disposable Clubs. Before joining, B
   may read only eligible safe page/directory data; canonical Club, A's membership,
   private Wall/ranks/approvals/invites must deny. Private pages deny without invitation.
   Inspect projection allowlists for absence of UID ledgers/tokens/private fields.
5. B joins as Member, requests independent approval or consumes the addressed invite.
   Member cannot self-promote to Owner/Admin/Host, change branding/Wall or edit Owner.
   Visible Captain rank grants no rights. A can legitimately manage roles/ranks;
   authorized Admin can manage permitted members/branding/Wall but not Owner/self role
   or protected Club policy. A third account is needed for the full Admin/Host matrix;
   record unavailable paths as NOT RUN rather than claiming two accounts cover them.
6. Test leave/reload revocation. A archives/retires an owner-only Club with retained
   Wall/rank and old B invitation: old page/invite/children deny, ID recreation and
   reactivation deny, and a fresh new Club receives a fresh UUID. Do not delete the
   reservation or recursively remove children. Complete physical account erasure is
   still future trusted work.
7. A creates public, approval, unlisted and private Groups, with optional organizing
   Club/vehicle. Verify correct visibility, participant count/capacity, organizer roles,
   removed/banned rejoin denial and terminal-state closure. B receives/selects an
   addressed invite; wrong account, expired/revoked/rotated token, unknown recipient,
   duplicate send and logged-out return all produce correct outcomes. QR resolves the
   exact Pages hash route. Display-name search is case-sensitive and names are not unique.
8. Discover: test Ride/Drive/Meet/Event, category/date/approximate-area/Club combinations,
   pagination and empty/error states against actual production data. Private/unlisted/
   terminal sessions stay absent; safe rows do not contain live coordinates. Reported
   prior invitation/Lobby symptoms remain pending reproduction/acceptance, despite
   the resolved missing-index deployment issue.
9. Signed-out/outsider access, arbitrary unknown collections, systemAdmins writes,
   forged technical permissions and Firestore live-location paths must deny. Use
   production Rules Playground where suitable and emulator transactions for atomic
   cases. Retain locked RTDB; do not enable it to test live transport.

Detailed direct-client probes and complete role/retirement cases are retained in the
[historical checklist](docs/history/pre-batch6/DEPLOYMENT_CHECKLIST.md), sections 7/8
and 11.1. The authorization expectations remain current; do not follow its old rollout
order or obsolete index counts. A probe unexpectedly allowed can modify disposable
records, which is why the operator must explicitly choose that testing window.

## Two-phone live and dashboard acceptance ? pending

Use Android Chromium and iPhone Safari over HTTPS, safely on foot/stationary, both
foreground. The detailed 11-case checklist is in CLOUDFLARE_SETUP.md section 12.

1. A starts a Group. B is denied live entry before actual admission. Both opt in
   separately; grant GPS. Public discovery/hosting alone does not authorize positions.
2. Verify readable peer markers/name/vehicle/rank/status, no visible UID/email, HTTPS
   ticket + WSS socket, roughly 5s moving and 30s stationary cadence and no route replay.
3. Record a personal ride concurrently; verify heading/north-up/themes/weather/export
   and one shared GPS watcher. Change status only when stopped; separation is fresh
   straight-line distance, not road distance/order/emergency response.
4. Stop live sharing, leave, logout and complete/cancel: sharing stops, markers clear,
   no future updates sent. Removal of a silent B must revoke receiving within the
   30s lease; no private frames go to expired authorization, including late alarms.
5. Test network interruption/reconnect, no new consent after login, ticket replacement,
   stale at 45s/expiry at 120s, background/lock-screen gaps and visible foreground recovery.
6. Test keyboards/text scaling/focus/safe areas/portrait/landscape, QR camera and sharing
   on both languages/devices. Installation metadata is not offline/background support.

## Rollback and incident boundaries

Keep a known secure frontend commit, effective Rules source/date and Worker version
as private operator records. Do not commit credentials or rely on a rollback to erase
application data. An approved main commit restoring compatible frontend files starts
Pages; do not force-push or revive pre-security-fix code.

Rules rollback uses only secure, schema-compatible reviewed source: optional Console
history publication, or main commit -> workflow validation -> explicit scope rules-only.
Preserve all 18 indexes/exemptions and retired-ID invariants. A combined deployment
can partially publish Rules before an index failure; inspect both panels before retry.

Worker rollback preserves namespace/migrations and security compatibility; see
CLOUDFLARE_SETUP.md section 14. Disabling routing alone may not close existing sockets;
verify expired authority no longer receives positions. Retain RTDB deny-all throughout.

## Test records and Batch 6

Audit-local results, removed/retained files and technical debt are in
[REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md). User acceptance remains pending. Complete
account deletion, media/backend/IAM/cost review, provider commercial licensing and
other future launch requirements remain in [IDEA.md](IDEA.md). No Batch 6 feature was
implemented by the historical cleanup audit. Batch 6A's local implementation and
new acceptance boundary are retained below. Batch 6B is implemented locally; use
the current publication and acceptance runbook at the top of this document.

## Historical Batch 6A publication and acceptance — superseded by 6B above

**Nothing was deployed by the agent.** This section is for the operator after
approving the local commits. No software installation is needed on this computer.

### 1. Review and publish the same main revision

1. Read BATCH_6A_RESULT.md, especially the expiry/retention and deferred fan-out limits.
2. Review the local commits and clean working tree. When approving publication,
   run `git push origin main`. This starts the existing Pages workflow automatically.
   It does not start Firebase or Cloudflare deployment. No new branch is required.
3. Open repository **Actions → Deploy to GitHub Pages** and wait for the main run to
   succeed. Record its commit SHA. The frontend artifact remains its existing allowlist.
4. Continue with both manual backend workflows from that same published main revision.
   During mixed versions, Open writes/notifications may fail closed until Rules are
   published; the older Worker lacks the new expiry enforcement until its own update.
   Finish this short prototype publication window before inviting testers.

### 2. Firebase Rules — manual Actions or Console

Existing GitHub Secret: **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON** from the dedicated
**motodash-firebase-deployer@motodash-87bf8.iam.gserviceaccount.com**, with the unchanged
firebase-deployer-role.json permissions. Do not reuse Cloudflare's reader credential.

1. GitHub **Actions → Validate or deploy MotoDash Firestore → Run workflow**.
2. Choose branch **main**, operation **deploy**, confirmation **motodash-87bf8**,
   scope **rules-and-indexes**. The 18 index definitions are unchanged; reapplying
   this exact inventory is supported. If choosing a reviewed Rules-only publication,
   scope **rules-only** leaves the already Enabled composites untouched.
3. Start the run yourself. Check the validation job, including the new
   **run_batch6a_rules.py**, then the deployment job. No production credentials are
   exposed to the demo test job. Rules are sourced from **firestore.rules** and config
   **firebase.deploy.json**, only database **(default)** in **motodash-87bf8**.
4. Firebase Console → choose **MotoDash / motodash-87bf8** → **Build → Firestore Database
   → Rules**. Verify successful publication date/source, including activityCategory,
   groupDeadline/groupUsable and users/{uid}/notifications source proofs.
5. Alternative Console-only Rules publication: open **firestore.rules** in the GitHub
   main revision, copy the **entire file**, replace the Console Rules editor contents,
   confirm its compile check, then choose **Publish**. Preserve all default-deny,
   retired-ID, private-ride/vehicle and role boundaries. Do not paste fragments or
   relax a denied request. This publishes Rules only, not indexes.
6. Firestore **Indexes → Composite**: verify all **18 Enabled**, as already reported.
   No 19th composite is required for this batch. Compare the exact table above.
7. **Indexes → Single field**: retain routeChunks.pointsJson exemption. Do not exempt
   notifications.createdAt/readAt; the latest-30 and unread-null queries require their
   automatic collection single-field indexes (createdAt DESC, readAt ASC).
8. **Authentication → Settings → Authorized domains**: retain **eggheadstudio.github.io**
   and **localhost**, no /MotoDashboard/ path in the domain entry. Email/password stays
   enabled. No Auth/Hosting/Storage/RTDB setting or data migration is required by 6A.
9. Keep RTDB read/write false; do not deploy or enable it for this batch.

Rules success or 18 Enabled indexes is not a successful live-account test. Record
version evidence separately. Historical Group/invitation data remains; this batch
uses existing fields and applies the deadline to legacy Groups without rewriting them.
Old notifications are not backfilled. Privileged Console reads do not test client Rules.

### 3. Cloudflare — existing manual workflow

Reuse existing GitHub Secrets **CLOUDFLARE_API_TOKEN**, **CLOUDFLARE_ACCOUNT_ID**.

1. **Actions → Deploy MotoDash Cloudflare Worker → Run workflow → main**. Start it
   manually; review its successful dry-run/tests and final deployment.
2. It uses unchanged **cloudflare/wrangler.jsonc**, Worker **motodash-live**, binding
   **LIVE_ROOMS → LiveRoom**, existing SQLite **v1** migration. Do not recreate the DO
   namespace or add a migration for this source-only update.
3. Cloudflare Dashboard → Workers & Pages → **motodash-live** → **Settings**. Verify
   **FIREBASE_PROJECT_ID=motodash-87bf8**, **ALLOWED_ORIGINS=https://eggheadstudio.github.io**,
   existing encrypted **FIRESTORE_SERVICE_ACCOUNT**, and LIVE_ROOMS binding.
4. Keep the Firestore reader's existing read-only IAM role. No Firestore write grant,
   notification writer key, scheduled trigger or paid service is required.
5. Record deployed Worker version. Endpoint remains
   **https://motodash-live.old-sound-55f2.workers.dev**; frontend HTTPS tickets/WSS unchanged.
6. Refresh any already-open frontend tabs. Reconnect-test existing live rooms too;
   prior sockets/attachments are bounded on authority recheck. Direct navigation with
   no allowed Origin still returns origin_denied and is not an authenticated live test.

### 4. Production MD-NETWORK diagnostic procedure

The reported failure remains **unreproduced**, including whether switching networks
resolved DNS/proxy/SDK transport or coincided with another request finally completing.

1. Confirm the deployed main revision and app version **1.3.0-batch6a**. Reload an old
   open tab; if a removed legacy SW was controlling it, close/reopen and reload again.
   Preserve IndexedDB/local ride data. Do not clear all site storage just to test caches.
2. Record time, app language, operation (Home load, Group open/invite/start/join,
   dashboard sharing, approval, Discover, history), browser/OS and displayed safe code.
   **MD-NETWORK/GROUP-INVITE**, **MD-TIMEOUT/GROUP-LOAD**, **MD-PERMISSION/...** and
   **MD-PRECONDITION/...** distinguish failing scope. Cloudflare's connected indicator
   is independent of Firestore connectivity. Screenshot only safe UI, not account/location data.
3. If existing desktop DevTools are available, use this safe in-memory report on the
   MotoDashboard page; it contains only at/code, never request payloads or credentials:

   ```javascript
   console.table((await import('./js/firebase/access.js')).getDataDiagnostics())
   ```

   Group-watch codes also appear briefly in the GPS/network status area. Auth/CDN
   initialization failures retain the separate Account retry UI; they may not enter
   this Firestore request history. A Promise.all deadline can still say DATA when
   no individual operation error identifies a narrower scope; record the visible action too.
4. Network panel: reproduce **one action at a time**, and distinguish domains/endpoint
   class only: **www.gstatic.com** (SDK imports), **identitytoolkit.googleapis.com** /
   **securetoken.googleapis.com** (Auth), **firestore.googleapis.com** (Firestore),
   **motodash-live...workers.dev** (live), tiles/weather (providers). Note HTTP outcome,
   DNS/TLS failure, blocking or stalled Firestore Listen/channel without sharing query
   strings, request body/headers, document paths, tokens, HAR or coordinates.
5. Compare the same accounts/action: both Wi-Fi; A Wi-Fi/B cellular; A cellular/B Wi-Fi;
   both cellular. Keep session/foreground state comparable. Record VPN, content blocker,
   private browsing and DNS/proxy differences if known. Two users on one Wi-Fi alone
   does not prove the cause. Do not weaken origin checks or Rules during comparison.
6. On **OFFLINE**, reconnect and Refresh. On **TIMEOUT**, a write can still commit;
   refresh the actual invitation/approval/session before sending it again. A read gets
   at most one transient retry; no high-frequency polling or blind write replay.
7. On **PERMISSION**, verify actual account/membership/organizer and latest published
   Rules; do not classify this as Wi-Fi. On **PRECONDITION**, inspect the actual Firebase
   error locally for an index link/precondition and compare the deployed inventory;
   generic failed-precondition does not establish a missing index by itself.
8. If Firestore channel buffering persists on a controlled network, retain safe timing
   evidence and review SDK transport before a separately tested configuration change.
   Auto-detect long polling is already default; forced polling is not a demonstrated fix.
   [Firebase transport documentation](https://firebase.google.com/docs/reference/js/firestore.firestoresettings).

### 5. Exact two-phone / two-account Batch 6A acceptance

Run safely stationary/on foot, foreground HTTPS, with accounts A/B and separate
browser profiles: **iPhone Safari** and **Android Chromium**. Record actual versions
and results. These production operations are performed by the operator only.

1. Verify EN/FI registration/login and own Garage on both. Create a real car/bicycle/
   motorcycle; Garage must not offer Open. Verify local recording/history/export and
   private cloud history still work; B cannot read A's private vehicle/ride/profile.
2. A creates an **Open / Any vehicle** Club/Group. Discover's Open filter finds that
   public/approval activity. B joins using a different permitted Garage category.
   Private Groups remain absent from public discovery; approval/invite/bans still enforce.
3. A invites registered B through the actual recipient selector. B's bell increments;
   A cannot read B's notification collection. Open B's notification, verify timestamp,
   mark-read/badge decrement and correct Group navigation. A must not gain arbitrary
   notification creation privileges from hosting another unrelated Group.
4. Test B's Group approval and Club membership approval independently. Each creates
   B's matching notification only after A's authorized approval. Rejected requests
   produce no false approval. Check FI text and read state across reload.
5. Sign B out, open **#/notifications**, choose Sign in / register, sign back in and
   close Account: return to the notification sheet with no stacked modals. B's rows
   must disappear immediately on logout; signing A in must not show B's rows.
6. A activates a Group within the allowed start window; B must actually be admitted.
   Both separately consent and grant GPS. Verify peer name/vehicle/status labels are
   normal width, not vertical columns, at narrow portrait and landscape. Rotate phones,
   test text scaling, all HUD panels/controls, safe areas and no map-obscuring status toast.
7. Toggle GPS/network collapse: compact live indicator and accessible details remain.
   Exercise weather/themes/heading/map center and personal recording concurrently.
8. A taps Back from the live-only dashboard. Choose **Home · keep Group running**:
   A's sharing stops, Group remains active, B can still share. A returns and must
   consent again. Then choose **End Group for everyone**: both clear markers and
   cannot reconnect/restart. B has no global-end privilege. Verify explicit Cancel too.
9. In another active Group, A completes/cancels from management while B shares.
   B's state/markers update via Firestore/Worker, promptly within the authority lease.
   If B records a personal ride simultaneously, that recording/watch continues;
   finish and verify its independent saved history afterward.
10. For expiry, create a disposable Group with scheduled start around the current
    minute and end **3–5 minutes later** (end >= start). Both consent; close A's tab
    without completing. Keep B foreground and let the deadline pass. B must stop;
    refreshing/reconnecting/new admission/status changes must deny even if Console
    still shows stored state active. Inspect history as retained, not physically purged.
    Also verify an abandoned no-end Group is bounded by start +24h; do not wait 24h
    and then falsely mark that case tested from the short explicit-end case alone.
11. Try starting a Group more than 2h early, extending active times, restarting terminal
    identity and old invitation after end/expiry: each must deny; original record and
    personal ride history remain intact. Revoked/stale invitation notifications are
    informational references, never an admission grant.
12. Reproduce network interruption and Wi-Fi/cellular comparison using procedure 4.
    Record exact safe failing scope, graceful recovery, no repeated toasts and no
    hidden duplicate GPS watchers. Leave, logout, removal and end must stop sharing.

Club announcement and Group update/cancel **notification fan-out is not implemented**;
do not mark it tested or complete. Active Group watchers/live clients still receive
terminal state. Secure trusted delivery, notification retention/backfill and physical
account erasure remain explicit future requirements. No acceptance case above was
marked completed by the agent.

### 6. Compatible rollback

Record a reviewed frontend SHA, current Rules source/hash and Worker version before
publication. Preserve new deadline/notification privacy and all earlier security fixes.
Rules-only rollback through the existing typed-confirmation workflow must pass all
emulator suites; do not revert to older rules that remove these safeguards. A frontend
rollback may omit new notifications/Open UI, while retained records remain protected.
Worker rollback must preserve expiry enforcement, origin/token validation and LIVE_ROOMS
namespace/migrations; an old unbounded Worker is not an acceptable completed 6A rollback.
If no compatible prior Worker exists, prepare/test a corrective deployment instead.
Verify existing sockets cease unauthorized access. No data purge or RTDB activation
is part of rollback.

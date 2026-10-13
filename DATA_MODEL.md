> **Current Batch 6B (2026-10-13):** the operator reports 6A deployed/working.
> The additive model below is implemented and emulator-tested locally; 6B Rules
> and the Worker UID coordinator are not deployed. Earlier dated results are history.

## Batch 6B public identity and showcase contract

| Path | Data and access |
| --- | --- |
| `users/{uid}` | Existing six-field private profile unchanged; own name edits synchronize projections |
| `users/{uid}/preferences/publicProfile` | publicId, state active/retired, visibility private/public, bio <=300, nullable real category, accent gold/ocean/forest/rose, banner road/horizon/grid, nullable featuredVehicle, up to 4 vehicle aliases, up to 2 affiliation aliases, updatedAt; owner only |
| `profileOwners/{publicId}` | ownerUid, createdAt; owner-only get, no list; immutable permanent UUID reservation coupled to own preferences |
| `publicProfiles/{publicId}` | id, displayName, bio, category, accent, banner, featuredVehicle, vehicleIds, affiliationIds, updatedAt; exact minimal projection, known-ID get only; public only when linked current preferences are active/Public, otherwise owner preview only |
| `users/{uid}/showcaseRefs/{sourceVehicleId}` | profileId, publicId, createdAt; owner-only mapping, immutable while present |
| `profileOwners/{profileId}/vehicles/{publicVehicleId}` | sourceVehicleId, sourceCreatedAt, createdAt; owner-only immutable mapping, source incarnation proof |
| `publicProfiles/{profileId}/vehicles/{publicVehicleId}` | id, nickname/manufacturer/model <=64, nullable year, real category, separately entered publicDescription <=500, createdAt/updatedAt; exact safe card, no private description/UID/source ID |
| `profileOwners/{profileId}/affiliations/{alias}` | clubId, joinedAt, createdAt; private owner mapping and membership-incarnation proof |
| `publicProfiles/{profileId}/affiliations/{alias}` | id, currently public clubId, name, nullable visible rank, updatedAt; no UID, technical role, invitations or approval data |
| `displayProfiles/{uid}` | Existing signed-in name/updatedAt projection may additionally contain nullable publicProfileId, validated against own active/Public preferences and reservation; legacy two-field records remain valid |

Profiles use `#/rider/{opaqueUUID}` under `/MotoDashboard/`. IDs are generated
independently of names; they confer no permissions. Private is the default, including
existing accounts and vehicles whose old preference already said Public. Save of
private customization may create a private projection, not an anonymous publication.
Public collection/subcollection listing is denied. At most seven known public
documents load per opening (root + four vehicles + two affiliations), with bounded
concurrency. ACL-dependent Rules reads add to cost; measure them before public beta.

Every public opening uses `getDocFromServer`; offline/unverified access reports an
error rather than serving an old private preview from cache. Exact whole-document
allowlists deny malformed projections, including trusted backfills with extra fields.
See [Firebase server reads](https://firebase.google.com/docs/reference/js/firestore).
Previously downloaded public information cannot be retracted.

Vehicle read rights also require current profile privacy, current source Public
visibility/existence, matching source createdAt, explicit private mapping and current
alias slot. Deleting/recreating a source at the same path cannot revive an old card.
Garage editing synchronizes opted-in cards; private/Club changes or deletion remove
card/mappings/featured reference. Original Garage documents remain owner-only.
Vehicle notes are never copied into publicDescription. Four cards is a prototype
payload/read bound; future Free one-featured/Rider extras are not enforced now.

Affiliation reads independently check current Club public/live state, membership
incarnation, name and rank. A privacy, membership or rank change denies stale cards
until explicit owner update/removal. Opaque root aliases disclose no private Club
ID when a card is denied. The editor offers the latest 20 owned memberships and
up to two affiliation cards. Members-only visibility awaits a defined audience policy.

Retirement is irreversible for clients: preferences/reservation cannot be deleted,
IDs cannot transfer/reuse and retired preferences cannot reactivate. This is not
complete account erasure. Future trusted deletion must inventory all new paths,
remove/anonymize personal owner mappings, preserve minimal nonpersonal retired-ID
reservations and revoke live claims/tickets first. Auth-only deletion is insufficient.
No paid entitlement, permissions, system-admin or upload field is client writable.
No new composite index or single-field exemption is required; keep all existing 18.

> **Current post-Batch 5 architecture (2026-10-12):** GitHub Pages frontend, Firebase Auth identity, Firestore persistent authorization/data, Cloudflare Worker + one Durable Object per Group Session + WebSockets for live locations. RTDB stays locked. See LIVE_TRACKING.md; older Batch 3 results below are historical. The operator reports deployed Auth/Firestore/Rules/all 18 Enabled indexes and Cloudflare Worker/DOs. Real-account/phone acceptance remains pending.

# MotoDashboard data and authorization contract

Security revision: 2026-10-10. Supersedes Batch 2's public canonical Club reads
and client-side deletion/purge. No production migration has been performed.

All paths are relative to the **motodash-87bf8** default Firestore database.
`firebase-config.js` contains public web configuration, not Admin credentials.
Auth and Firestore share the single named MotoDash app. The unused RTDB adapter was removed.
RTDB remains default-deny, with no application reads/writes or live subscriptions.
No system administrator privileges can be written by clients.

| Path | Content / access |
| --- | --- |
| `users/{uid}` | Six-field profile from Batch 1; own get/create/update only |
| `users/{uid}/vehicles/{id}` | ID, ownerUid, 12-category ID, nickname, manufacturer, model, nullable modelYear, description, visibility, createdAt/updatedAt; owner only, even when visibility says club/public |
| `users/{uid}/preferences/garage` | defaultVehicleId (nullable), updatedAt; owner only; default must exist |
| `users/{uid}/sessions/{id}` | Completed private ride manifest, schemaVersion 1, owner/vehicle snapshot/category, millisecond times, distance/moving/average/max, mapTheme, pointCount/chunkCount, routeHash, revisionId/baseRevisionId, uploadState, clientUpdatedAt, server timestamps |
| `…/sessions/{id}/routeChunks/{sequence}` | Immutable schemaVersion 1, ownerUid, sessionId, sequence, pointCount, pointsJson, routeHash; <=128 points and <=48,000 characters; owner only |
| `users/{uid}/sessionTombstones/{id}` | Permanent immutable deletion fence (id, ownerUid, deletedAt); owner only; blocks stale upload resurrection |
| `clubs/{id}` | Private canonical document: schemaVersion 1, id, ownerUid, presentation fields, state active/archived/deleted, memberCount, lastMembershipUid, createdAt/updatedAt. Get by current members/Owner only; collection queries denied. Retired documents deny every client operation and permanently reserve the ID. |
| `clubPages/{id}` | Exact safe projection: id, name, description, category, visibility, membershipPolicy, primaryColor, accentColor, routeColor, mapTheme, links, state, memberCount, updatedAt. Public/unlisted get by signed-in accounts; private get only members/Owner or active valid invitees. No collection queries. No membership UID, ownerUid, ledger, invitation or approval data. |
| `clubDirectory/{id}` | Signed-in discovery projection: id/name/category/policy/primary/accent/updatedAt only; public active Clubs; same atomic changes as branding/privacy edits |
| `clubs/{id}/members/{uid}` | uid, technicalRole, nullable rankId, joinedAt/updatedAt; members can read; managed role updates only |
| `users/{uid}/clubRefs/{id}` | uid, clubId, joinedAt; private account index, atomically maintained with canonical membership |
| `clubs/{id}/joinRequests/{uid}` | uid, state pending/approved/rejected, requestedAt, nullable decidedAt/decidedBy; requester or managers |
| `clubs/{id}/invites/{uid}` | uid, invitedBy, expiresAt, createdAt; managers and addressed account; consumed atomically on joining |
| `clubs/{id}/ranks/{id}` | id, name, displayOrder, createdAt/updatedAt; member-readable, manager-writable; presentation only |
| `clubs/{id}/wall/info` | Plain text, updatedBy, createdAt/updatedAt; member-readable, manager-writable |

`createdAt`, `updatedAt`, join/decision/delete times use serverTimestamp. GPS times
are Unix milliseconds. Local/export schema versions are independent of cloud schema.
The complete exact field/type allowlists live in `firestore.rules`.

## Club policy

Owner is established only by an atomic transaction containing the new Club, safe
page, founder membership, private index and (public only) directory. The repository
generates a fresh `crypto.randomUUID()` independently of the Club name. ownerUid and
ID are immutable. Ownership
transfer is intentionally unavailable in this batch: a future trusted transfer
must atomically update ownerUid and both memberships, after confirming consent.
Owner cannot leave. Archive removes discovery and closes admission. Permanent
retirement requires archive and memberCount == 1. One transaction updates canonical
state to `deleted`, removes the safe page, directory and founder's account ref.
The canonical reservation, founder membership, Wall, ranks, invitations and approval
records are retained. Every child read/write requires a live parent, including an
addressed account's own membership/invite/request reads. Former Owner privileges
end immediately. Client parent deletion, reactivation and same-ID replacement are
always denied. No client recursive purge remains. No active members may be silently
erased. Membership counters are atomically coupled to one actual member
insertion/deletion and its account index, not freely editable.

All canonical mutations must synchronize the exact safe page in the same atomic
operation (or remove it on retirement), and maintain discovery when relevant.
The rules compare full maps, rejecting extra public fields and stale presentation.
Nonmember joining reads the safe page and its own missing membership, updates
canonical count without reading canonical data, and writes the synchronized page.
Transactions therefore observe concurrent count changes through the page as well.
Current members read canonical data for authorized administration. UI filtering is
not the confidentiality boundary; the whole canonical document is denied to outsiders.

Open admission is self-service; approval requires a manager decision. Invite/private
admission requires a nonexpired UID-addressed invite consumed on join. Managers
may admit ordinary Members. Private safe pages are readable only by members, Owner
or a nonexpired addressed invitee while active; invitees cannot read canonical
authorization data. Unlisted safe pages require their ID and are not in discovery.
Private profiles are never searched by email; account UID is used for invitations.

Owner can promote/demote other members to Admin/Host/Member. Admin can manage other
Host/Member accounts, requests, invitations, ranks and branding/wall; cannot grant
Admin/Owner, edit another Admin/Owner, change privacy/policy/name/category, or
change their own technical role. Host/Member have read and self-leave permissions.
Ranks confer **zero** technical privileges. Deleted rank IDs render unassigned.

## Existing data and operational retirement limits

The Spark-compatible prototype requires no Cloud Function or billing upgrade.
Retirement revokes application access; it does **not** promise physical erasure.
Stored children/reservations consume storage. Future trusted operator erasure must
retain `clubs/{id}` with a permanent deleted state (a minimal operator-written
reservation is sufficient); deleting that reservation would defeat ID protection.
Firebase administrators/IAM can bypass rules and must follow the same invariant.
Rules cannot retract documents that clients already received before this fix.

For legacy verification and future trusted erasure planning, inventory live Clubs and every orphaned Club subtree left
by older deletion, plus known deleted IDs from operator records. Retire/reserve all
old deleted/orphan IDs rather than attach them to a new Club. Backfill safe pages
for active/archived Clubs using only the exact field list; validate directory
privacy and membership counts. If repair is actually needed, use a separately approved trusted operator workflow
with deliberate maintenance/access controls; preserve the currently deployed secure
Rules and compatible frontend. Deployment success alone does not establish inventory completeness. No client migration/purge is authorized or implemented.
If production inventory is empty, record that verification instead of inventing data.
See [current inventory guidance](DEPLOYMENT_CHECKLIST.md) and the preserved
[historical B6 record](docs/history/pre-batch6/DEPLOYMENT_CHECKLIST.md) for the complete
orphan/retired-ID rationale. No migration was performed by this audit.

## Private ride lifecycle

Recording stays local. Only completed rides upload using stable IDs, a bounded
manifest, immutable chunks, and a final ready marker. Failed jobs remain in local
account storage. Retry skips identical chunks; revision/base revision detects
conflicting metadata writes. Deletion first writes a persistent fence, then purges
chunks and manifest. Routes are untrusted owner-supplied GPS data; rules bound the
payload, while clients validate coordinates, timestamps, counts and hashes. This
does not establish competition/Official Event trust. Firestore cannot parse JSON
route payloads. Route JSON is exempted from indexing to limit index overhead.

Auth scope changes must stop the GPS watch, preserve the previous owner's local
record without transferring it, and clear that account's visible data. Guests
retain separate local rides. Existing legacy data is not uploaded or claimed.
Local browser storage is not encryption; people with the same OS/browser access
can inspect it. Firestore uses memory cache rather than shared persistent cache.

Sources: [atomic rules](https://firebase.google.com/docs/firestore/security/rules-conditions),
[transaction constraints](https://firebase.google.com/docs/firestore/manage-data/transactions),
[field allowlists](https://firebase.google.com/docs/firestore/security/rules-fields),
[query authorization](https://firebase.google.com/docs/firestore/security/rules-query).

The operator reports Rules deployed and all 18 indexes Enabled. Local rules-engine
tests, publication and real-account/physical-device acceptance remain distinct evidence.


## Group Session and display-identity contract

`displayProfiles/{uid}`: displayName and updatedAt, with the validated optional
nullable publicProfileId added in Batch 6B, signed-in get and
bounded list (up to 30); repository prefix search uses 10. Owner writes only, name
matching private users/{uid} through getAfter. Own login maintains the projection;
missing projections display Member / Jäsen. Never read another private users doc
for identity. Names are discoverable by signed-in users; this is disclosed in Account.

`groupSessions/{uuid}`: schemaVersion 1, creatorUid, optional clubId, safe hostName/
clubName snapshots, title/description, activityType, Garage category, startsAt/endsAt
(epoch milliseconds), approximate meetingArea, private precise meetingLocation,
visibility, joiningPolicy, maxParticipants, state, participantCount, private
lastParticipantUid mutation ledger, createdAt/updatedAt server timestamps.
UUIDs are generated by crypto.randomUUID, immutable and permanently reserved; no
client hard deletion or terminal-state reopening. Prototype ceiling is 50 even if
no smaller maximum is specified. Personal hosting is authenticated; Club hosting
requires current Owner/Admin/Host. Creator Host must retain the Club role to manage;
Club Owner/Admin can manage that Club's sessions. Ranks never confer permission.

`groupPages/{uuid}` exact 17-field safe projection: id, title, description,
activityType, category, clubId, clubName, hostName, startsAt, endsAt, meetingArea,
visibility, joiningPolicy, maxParticipants, state, participantCount, updatedAt.
No creator/membership UID, precise meeting instructions, tokens or approvals.
Known-ID reads require sign-in; private pages require admitted participant,
authorized organizer or current account-addressed invitation. No broad page listing.
Canonical documents/rosters remain participant/organizer-only.

`lobbyEvents/{uuid}`: same safe allowlist, only public/approval and scheduled/active.
Canonical, safe page and discovery summary change atomically; private/unlisted/
completed/cancelled transitions remove discovery. Queries constrain visibility/state,
order startsAt, limit 20 and page with snapshots. Optional activityType/category/
meetingArea/clubId equality filters have all 16 composite combinations in
firestore.indexes.json. Local-date filtering uses a start-time range. Approximate
area is an exact organizer label, not a paid/geographic-distance search. Club name
search uses the public directory with limit 10. Retiring a Club immediately denies
its bound canonical/pages/invitations; harmless previously public Lobby summaries
can remain until trusted operator cleanup. No precise data or membership is exposed.

Private children under groupSessions/{uuid}:

| Path | Contract and authority |
| --- | --- |
| participants/{uid} | uid, vehicleId, only nickname/category vehicle snapshot, optional clubIdentity {name, rank}, status, joinedAt, updatedAt. Own admission/update; authorized roster reads. Snapshot verified against own Garage and organizing Club membership/rank. Status is informational, not presence. |
| joinRequests/{uid} | uid, state pending/approved/rejected, requestedAt, decidedAt, decidedBy. Requester submits/reads own; organizer decides. Approval permits requester to join/select own Garage, without organizer reading private Garage. |
| invites/{uid} | uid, opaque UUID token, invitedBy, createdAt, expiresAt. Organizer issues, maximum seven days; recipient/organizer reads, no outsider enumeration. Recipient accepts/declines; organizer revokes. Joining consumes invite atomically. Tokens are routing hints within UID-addressed authorization, not bearer permissions. |
| bans/{uid} | uid, removedBy, removedAt. Created only with authorized removal; immutable within session. Removed participants cannot rejoin, even using old approval/invitation. |
| users/{uid}/groupRefs/{uuid} | uid, sessionId, joinedAt; private navigation, coupled to membership/index/count mutations. |

Creation includes founder and own navigation in one transaction. Creator remains
retained organizer. Counter changes require actual membership toggles, prevent
duplicates/capacity overflow and preserve exact safe summaries. Removal couples a
ban and index deletion; self-leave does not ban. Unknown paths, system-admin grants,
Official activities and Firestore live-location paths remain denied.

Sharing route: #/session/{uuid}; addressed invitation route:
#/session/{uuid}/invite/{token}. Auth return keeps the fragment; invitation resolution
checks account, token, expiry and usable parent. Acceptance cleans the fragment.
QR is generated locally by the MIT vendored Nayuki module; no QR service sees URLs.
No NFC writing, subscription entitlement or Cloud Function exists. The deployed
Cloudflare Worker provides the isolated live service described below.

Historical Batch 3 RTDB proposals are superseded by the following Batch 4 contract.
RTDB database.rules.json remains exactly deny-all; no client copies Firestore ACLs.

## Identity and ephemeral live data

New/changed `users/{uid}.displayName` is trimmed and 3–30 Unicode code points.
Rules enforce normalized text and RE2 character bounds (string size in the
emulator counts UTF-16 units). Existing unchanged legacy 1–64-unit names can
still receive language updates; invalid legacy names prompt an owner correction.
Owner editing synchronizes the minimal displayProfiles projection (legacy two-field
or the optional validated public alias). No email
or UID is used as a visible fallback. Account deletion/export remain future
requirements; this batch does not implement complete cloud erasure.

No permanent Firestore location path, participant coordinate field, index or
RTDB ACL is introduced. The Worker reads current groupSessions parent,
participants/{uid}, bans/{uid}, displayProfiles/{uid}, and optional canonical Club.
Actual active-session membership is mandatory even for an organizer. Snapshot
vehicle/Club/rank is display-only; custom ranks never authorize live access.
An archived Club remains usable consistently with current Group rules; a deleted
or missing Club revokes access. Trusted read-only IAM bypasses client rules and
is not scoped to these collections by rules; secret compromise is a residual risk.

| Live data | Location / lifecycle |
| --- | --- |
| Verified UID + token expiry | Internal gateway/ticket/attachment only; never client marker text or public frame |
| Firebase JWT / OAuth token | Request or server-memory cache only; no logs/URL/DO durable storage |
| Connection ticket | Raw random value returned once and held briefly in browser memory; SHA-256 key in room SQLite, bound UID/origin/session/expiry, consumed once, TTL 30s |
| Session ID | Internal immutable DO room binding, kept in SQLite; Firestore keeps canonical lifecycle/retired identities |
| Current rider | Hibernatable attachment: internal UID, fresh opaque riderId, bounded identity/status, lease, token expiry, cadence/sequence, lastSeen, latest position; no route array |
| Latest position | latitude/longitude/accuracy/heading/speedKmh/sampledAt/receipt at; fresh <=45s, expires >=120s; attachment only, cleared on close/replacement |
| Public room frame | opaque riderId, safe displayName, selected nickname/category, optional Club name/rank, informational status and admitted-room latest position; no UID/email/invite or approval records |
| Authority snapshot | Consistent Firestore readTime, checkedAt, 30s lease; rechecked on redemption, transitions and periodic alarms; expires fail-closed |

Attachments survive runtime hibernation, so "ephemeral" does not mean every
sleep erases them. Only latest state is serialized; no permanent GPS storage or
historical transmission is created. Future trusted account deletion must revoke
membership, invalidate live access/tickets, handle active attachments/retained
room metadata and normal permanent records. No deletion/production migration is
performed here. See LIVE_TRACKING.md, cloudflare/PROTOCOL.md and CLOUDFLARE_SETUP.md.


## Batch 5 discovery/invitation and deployment status

`clubDirectory(category ASC, name ASC)` is the 18th composite index, in addition
to the owner-history definition and 16 Lobby combinations. All 18 are operator-
reported Enabled. `routeChunks.pointsJson` remains exempt from single-field indexing;
minimal display-name/name search and private reference ordering retain automatic indexes.
Group invite create/update requires the recipient's `displayProfiles/{uid}` document.
Repository validation rejects unknown targets and preserves an existing valid token
on duplicate send. Account-addressed authorization, expiration and parent lifecycle
remain the security boundary; QR/link possession does not authorize another account.

Batch 5 changes presentation and query/invitation validation; it adds no media,
Official activity/badge collections, payment entitlements or permanent live coordinates.
Unknown collections/default client operations remain denied. Future complete deletion
must inventory all private/public projections, navigation refs, route chunks/fences,
owned Club/Group lifecycle, invitations/Wall content, live tickets/attachments and later
media/rewards. It must retain minimal nonpersonal ID reservations and prevent stale
local jobs from recreating erased data. See the authoritative roadmap in IDEA.md.

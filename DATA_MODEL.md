# MotoDashboard data and authorization contract

Security revision: 2026-10-10. Supersedes Batch 2's public canonical Club reads
and client-side deletion/purge. No production migration has been performed.

All paths are relative to the **motodash-87bf8** default Firestore database.
`firebase-config.js` contains public web configuration, not Admin credentials.
Auth, Firestore and the prepared RTDB service share the single named MotoDash app.
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

Before approved rollout, inventory live Clubs and every orphaned Club subtree left
by older deletion, plus known deleted IDs from operator records. Retire/reserve all
old deleted/orphan IDs rather than attach them to a new Club. Backfill safe pages
for active/archived Clubs using only the exact field list; validate directory
privacy and membership counts. Use trusted operator access during a maintenance
window that denies Club client access, then publish the revised rules and compatible
frontend together. No client migration/purge is authorized or implemented.
If production inventory is empty, record that verification instead of inventing data.
See [deployment gate B6](DEPLOYMENT_CHECKLIST.md) for the ordered procedure.

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

No rules or indexes have been deployed. Rules-engine, live-project and physical
device verification are distinct from browser SDK fixtures.

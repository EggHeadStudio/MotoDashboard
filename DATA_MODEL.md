# Batch 2 data and authorization contract

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
| `clubs/{id}` | schemaVersion 1, id, ownerUid, name, description, category, visibility, membershipPolicy, colors, routeColor, mapTheme, five links, state, memberCount, lastMembershipUid, server timestamps |
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

Owner is established only by an atomic new Club + founder membership + private
index + (public only) directory transaction. ownerUid is immutable. Ownership
transfer is intentionally unavailable in this batch: a future trusted transfer
must atomically update ownerUid and both memberships, after confirming consent.
Owner cannot leave. Archive removes discovery and closes admission. Permanent
deletion requires archive and memberCount == 1; subcollections must be purged
before deleting the final founder/index/Club atomically. No active members may
be silently erased. Membership counters are atomically coupled to one actual
member insertion/deletion and its account index, not freely editable.

Open admission is self-service; approval requires a manager decision. Invite/private
admission requires a nonexpired UID-addressed invite consumed on join. Managers
may admit ordinary Members. Private Clubs are readable only by members, owner or
an addressed invitee; unlisted Clubs require their ID and are not in discovery.
Private profiles are never searched by email; account UID is used for invitations.

Owner can promote/demote other members to Admin/Host/Member. Admin can manage other
Host/Member accounts, requests, invitations, ranks and branding/wall; cannot grant
Admin/Owner, edit another Admin/Owner, change privacy/policy/name/category, or
change their own technical role. Host/Member have read and self-leave permissions.
Ranks confer **zero** technical privileges. Deleted rank IDs render unassigned.

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

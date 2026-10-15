# Batch 8.5 representation extension - local only

Operator reports Batch 8 deployed. Batch 8.5 is not deployed/phone-accepted.
The existing single GPS pipeline, consent, exclusive UID claim, HTTPS ticket/WSS
transport and 30s authority lease stay. RSVP, Club identity and Club contributions
never authorize positions or change recording ownership.

Optional participant ridingIdentity represents a currently verified Club chosen
independently of the organizing Club. Set on admission or scheduled vehicle save;
locked once active. Live authority rechecks representation membership and drops
revoked decoration without granting/removing unrelated actual Group admission.
Legacy active Groups retain their earlier identity; no client migration is run.

Safe room identity may include mediaIdentity {profileId,clubId,rankId}: public
profile alias and currently represented Club/rank, never UID, private media URL or
GPS history. Client builds avatar/initials plus small Club-logo badge using current
Worker media ACL; denied/private/unavailable images fall back. Rank text stays in
the readable identity tooltip/roster. No extra GPS watch, socket or media polling.
Personal recordings independently lock/persist their private historical identity.

The same Worker adds CLUB_ACTIVITY/ClubActivity SQLite v4 for persistent consented
Club summaries/trusted aggregates. This is separate from latest-only live rooms,
not a live coordinate history. Existing read-only Firestore source checks and
media Auth lookup permissions suffice; no new credential/write IAM. Retain all
v1/v2/v3/v4 bindings on corrective rollout/rollback.

Current operator order and physical two-phone checklist: DEPLOYMENT_CHECKLIST.md.
New data/privacy/retention inventory: DATA_MODEL.md. Local results: BATCH_8_5_RESULT.md.
The following dated live records retain their historical evidence.

---

> **Current Batch 6B (2026-10-13):** 6A deployment/working status is reported by
> the operator. The new UID coordinator and continuity changes below are local;
> publication and physical-phone acceptance are pending. Older results remain history.

## Batch 6B exclusive live ownership and continuity

Keep `LIVE_ROOMS -> LiveRoom` and SQLite **v1**. Append **v2** creating
`LIVE_IDENTITIES -> LiveIdentity`: one private SQLite coordinator per verified
Firebase UID, reached only through trusted Worker bindings. Public HTTP routes
cannot access reserve/activate/renew/release or assert a target UID.

The gateway derives UID from its verified ID token. A room first verifies actual
Firestore admission, then atomically reserves that UID for its Group. Another live
Group gets HTTP 409 `active_ride` and only that user's active session handle. One-use
ticket redemption rechecks admission and activates a connection-specific nonce.
Same-room reconnect may replace the previous publisher; another room never silently
replaces it. Old uncoordinated tickets/attachments fail closed in the new code.

The coordinator stores only roomId, nonce and until, never coordinates, route history,
JWT or service-account credentials. Room receive/publish eligibility is clamped to
the same expiry as the global claim, the 30-second authority lease, token expiry and
Group deadline. Renewal requires the current live nonce and cannot regain an expired
or newer claim. Source revocation/termination closes before releasing. Delayed old
releases cannot free a replacement nonce, even from a different Group.

Abandoned ticket reservations expire within 30 seconds. Connected claims additionally
cannot outlive **45 seconds without inbound activity**; authority alarms cannot renew
an abandoned open socket forever. Late alarms do not authorize frames after lease
expiry. Coordinator failure denies new admission/renewal; existing leases are bounded.
Normal heartbeats remain 25 seconds and GPS cadence remains 5/30 seconds. No new GPS
watcher, Firestore writer or RTDB transport is introduced.

Return to Ride separates owned personal recording/recovery, selected Group,
sharing/connection and dashboard visibility. Home/navigation keeps enabled sharing;
explicit Stop, leave, end and logout stop it. Reload revalidates a Group hint and never
restores live consent. Personal/Group selection and stats survive navigation; the
Group-only dashboard uses its admitted vehicle rather than a different Garage default.
Personal record snapshots remain their original selection. Explicit guest Resume
starts GPS; anonymous landing never does. Web Locks or an atomic IndexedDB lease
protect a personal recorder across same-origin/account tabs; no cross-device private
recording service is claimed. Without either safe primitive, recording fails closed.

The new class uses the existing SQLite infrastructure and requires no new secret,
write IAM grant or paid service. Quota usage increases: roughly one coordinator
renewal per active UID per authority recheck (about 3/minute), plus acquisition,
activation and release. Firestore authority/ACL reads remain additional costs.
Prototype scale only; monitor the account's actual quotas and fail-closed outages.
[Cloudflare SQLite storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/),
[Web Locks](https://www.w3.org/TR/web-locks/).

Stop testers/sharing and drain old sessions before the first v2 rollout. Preserve
both namespaces/migrations on rollback; never restore an uncoordinated old Worker
while claiming global exclusivity. See DEPLOYMENT_CHECKLIST.md. Auth-disabled/revoked
tokens can still last until expiry; complete erasure, abuse controls, capacity and
native background behavior remain separate requirements.

# MotoDash live architecture — Batch 4

GitHub Pages: static native modules. Firebase Auth: identity. Firestore: permanent
records and authorization. Cloudflare Worker: trusted token/Firestore gateway.
One SQLite-backed Durable Object per Group Session: hibernatable WebSockets and
latest ephemeral state. RTDB stays deny-all and is no longer a live transport.

Architecture decision, 2026-10-10: Batch 3 correctly blocked RTDB because rules
cannot inspect Firestore admission. Batch 4 approves Cloudflare to verify current
Firestore authority directly, without ACL mirroring or Cloud Functions. Historical
evidence remains below; the old design is not an implementation instruction.

Implemented and deployed, per operator (2026-10-12): M0 audit; M1 mandatory Unicode 3–30 names/profile editing;
M2 separate Worker tooling; M3 verified Firebase token + one-use 30-second ticket;
M4 trusted read-only Firestore authorization/revocation tests; M5 isolated bounded
rooms; M6 compact protocol/throttling; M7 existing GPS/Leaflet integration/consent;
M8 statuses and straight-line regroup; M9 unused RTDB cleanup; M10 regressions,
operator setup, rollback and cost report. Each milestone is separately committed.

Reuse groupSessions/participants/bans/clubs/displayProfiles, auth-state, Group UI
extension hook, dictionary, position-pipeline and Leaflet. No duplicate persistent
GPS collection. Tokens/tickets never go in URLs/logs; no raw tokens or permanent
coordinates in DO storage. Admission requires actual participant plus active parent
and live Club, never rank or creator alone. Check at connection and periodically;
polling revocation is bounded, not instantaneous. Outages fail closed.

Worker/Durable Objects and the configured Batch 5 frontend are deployed, per operator.
Authenticated two-phone/live acceptance is still pending; this audit did not access
private consoles or run production traffic. Endpoint:
**https://motodash-live.old-sound-55f2.workers.dev** (HTTPS ticket / WSS room). Browser suspension can stop GPS.
No background guarantee, navigation, speed rankings or emergency promise.
Current evidence, milestones and files: [BATCH_4_RESULT.md](BATCH_4_RESULT.md).
Operator setup, two-phone tests, budgets and rollback:
[CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md). Wire contract:
[cloudflare/PROTOCOL.md](cloudflare/PROTOCOL.md).

## Implemented authority and privacy contract

The Worker pins motodash-87bf8 and verifies RS256 signatures using Google's fixed
Firebase X509 endpoint, issuer/audience, subject and integer time claims. Browser
POST carries the ID token only in Authorization; the socket URL carries neither
token nor ticket. A random 256-bit, 30s, one-use ticket binds UID, room and exact
Origin; redemption rechecks authoritative Firestore admission. Pending sockets
receive no private messages. Room handles and rider IDs never become identity labels.

The Worker reader uses encrypted service-account secret and fixed REST batchGet
paths, read-only IAM and one consistent Firestore readTime. OAuth/key caches are
memory-only. Each admitted socket has a 30s authority lease from check start;
renewal starts with about 10s remaining via messages or 10s alarms. All revoked
receivers are removed before broadcasts. Expired leases cannot receive private
frames even when alarms are late. Parent completion/removal, bans and retired
Clubs deny further access. Outages fail closed. This is bounded polling, not an
instantaneous listener. Firebase account disable/token revocation is not queried;
already valid signed tokens can last until expiry, at most one hour.

The room uses acceptWebSocket/serialized attachments for hibernation. It stores
only the reserved session ID and short-lived **hashed** ticket records in SQLite.
Latest coordinates exist in socket attachments, not a permanent route/history
table. Attachments retain current state through hibernation and are cleared on
closure/replacement. Limits: 50 admitted riders, 70 total sockets, 100 tickets;
1,024-byte client frames, 8 messages/10s plus per-type cadence. No raw token logs.
Disconnected latest state is removed; locations stale at 45s, expire at 120s.
Batch 6B additionally clamps live ownership to 45s without inbound activity and
the shared UID claim, as described above; this replaces the former 70s idle cutoff.

Consent starts the existing accepted GPS pipeline only after admission. No second
watchPosition is added; personal recording keeps its watcher if sharing stops.
Moving updates at roughly 5s, stationary at 30s, unchanged coordinates omitted.
Heartbeat can confirm a newly sampled unchanged fix without repeating coordinates;
a plain connection heartbeat cannot freshen GPS. Reconnect creates a fresh token
and ticket and discards old samples, never replays the route. UI uses server-relative
age to avoid displaying old locations as fresh with a skewed phone clock. Publishing
still requires a reasonably accurate clock for fresh sample/JWT checks.

English/Finnish text, safe textContent Leaflet labels, vehicle and opted-in Club/rank
reuse existing modules. Live manual status is read from Firestore, not a client
role/status claim. Summary distinguishes fresh/stale/no fix/not connected and uses
only fresh own-to-other positions for approximate maximum straight-line separation.
No road-distance, route-order, speed rankings, navigation or emergency promise.
Realtime Database stays locked and has no production initializer/import.

Local tests cover transport, periodic silent revocation and ticket expiry, but
real hibernation eviction, IAM read scope/revocation, mobile lock screen and
authenticated production behavior have not been accepted. A successful operator
deployment is recorded separately from these tests. Spark read quota is a scaling blocker at the documented 1,000+
user workload. Global HTTP abuse prevention, complete account erasure and stronger
Auth revocation remain operational/future work; none is silently claimed complete.
Official references: [hibernation](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/),
[token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens),
[Firestore REST/IAM](https://firebase.google.com/docs/firestore/use-rest-api).

## Historical Batch 3 evidence (superseded design)

Batch 3 proposed RTDB latest positions with trusted Firestore ACL coordination,
and deliberately shipped no live publisher because that coordinator was absent.
The local locked RTDB suite passed 68 assertions; it did not prove live tracking.
BATCH_3_RESULT.md retains the full historical milestone/evidence record. The
product owner replaced the proposed transport in Batch 4; RTDB remains deny-all.
No RTDB database or production data was deleted. The unused frontend RTDB adapter
and its initializer-only browser assertion are replaced by a no-RTDB import guard.
The locked emulator security coverage remains.


## Post-Batch 5 maintenance and next dependencies

The live reader key in Cloudflare is distinct from the Firestore configuration
account used by the GitHub Firebase workflow. The reader uses datastore.entities.get;
the deployer manages Rules/indexes and has no document permissions. Neither belongs
in the frontend. Origins, protocol, authorization and GPS lifecycle are unchanged by
this audit. Private routes stay in owner-only Firestore chunks; the live room stores
latest attachment state and short-lived hashed tickets, never route history.

Before wider beta, record two-account/two-phone acceptance, effective revocation,
read quotas and background limitations. Future complete account deletion must close
live access/tickets before permanent cleanup, preserve nonpersonal ID reservations
and handle hibernatable state. See [Batch 6 priorities](IDEA.md) and
[repository audit](REPOSITORY_AUDIT.md). The operator now reports Batch 6A deployed;
Batch 6B's new coordinator rollout and physical acceptance remain pending.

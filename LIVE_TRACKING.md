# MotoDash live architecture — Batch 4

GitHub Pages: static native modules. Firebase Auth: identity. Firestore: permanent
records and authorization. Cloudflare Worker: trusted token/Firestore gateway.
One SQLite-backed Durable Object per Group Session: hibernatable WebSockets and
latest ephemeral state. RTDB stays deny-all and is no longer a live transport.

Architecture decision, 2026-10-10: Batch 3 correctly blocked RTDB because rules
cannot inspect Firestore admission. Batch 4 approves Cloudflare to verify current
Firestore authority directly, without ACL mirroring or Cloud Functions. Historical
evidence remains below; the old design is not an implementation instruction.

Implemented locally: M0 audit; M1 mandatory Unicode 3–30 names/profile editing;
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

No deployment/live acceptance is completed. Browser suspension can stop GPS.
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
real hibernation eviction, IAM propagation, mobile lock screen and deployment have
not been tested. Spark read quota is a scaling blocker at the documented 1,000+
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

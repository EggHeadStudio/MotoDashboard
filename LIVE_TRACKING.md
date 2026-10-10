# MotoDash live architecture — Batch 4

GitHub Pages: static native modules. Firebase Auth: identity. Firestore: permanent
records and authorization. Cloudflare Worker: trusted token/Firestore gateway.
One SQLite-backed Durable Object per Group Session: hibernatable WebSockets and
latest ephemeral state. RTDB stays deny-all and is no longer a live transport.

Architecture decision, 2026-10-10: Batch 3 correctly blocked RTDB because rules
cannot inspect Firestore admission. Batch 4 approves Cloudflare to verify current
Firestore authority directly, without ACL mirroring or Cloud Functions. Historical
evidence remains below; the old design is not an implementation instruction.

Implementation order: M0 audit; M1 mandatory Unicode 3–30 names/profile editing;
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

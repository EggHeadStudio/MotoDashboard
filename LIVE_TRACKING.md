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

Milestone 4 is **partial / blocked**. Milestone 5 and the location-dependent parts
of milestones 6 and 9 are **blocked**, with no production or demo location publisher.
Root `database.rules.json` remains exactly deny-all; no browser writes an ACL.

The proposed ephemeral contract is `liveSessions/{sessionId}/participants/{uid}`:
`uid`, `latitude` (-90..90), `longitude` (-180..180), `heading` (null or 0..<360),
`speed` (null or finite validated nonnegative km/h), server `timestamp`, and
`status` (`ok`, `fuel`, `mechanical`, `help`). Use an exact allowlist and bounded
payload (under 1 KiB). Never include email, Garage manufacturer/model, route history,
credentials, invitation tokens or precise meeting instructions. This contract is a
design, **not an enabled or validation-tested location API**: deny-all currently
rejects valid and malformed payloads alike.

RTDB rules cannot read Firestore membership. Having a browser copy membership into
RTDB would allow it to manufacture authority. Checking only Authentication proves
identity, not admission, session lifecycle, Club retirement or removal. Client-issued
ACLs and self-issued custom claims are prohibited.

A future approved trusted service must serialize membership/lifecycle changes and
coordinate both databases. Grant RTDB access only after verifying committed active
Firestore admission. Revoke RTDB before committing removal/closure/Club retirement;
retry failures durably and fail closed. Serialize grant/revoke operations per session
to prevent a racing grant from resurrecting a revoked participant. Short-lived,
server-issued leases and periodic verification can bound failures, but alone cannot
guarantee immediate cross-database revocation. This design needs a reviewed backend,
operator approval and a funding/deployment decision; there is none in this Spark
prototype. Firestore and RTDB do not share an atomic transaction. Do not unlock RTDB
until allowed-participant and revocation/race tests actually pass with that service.

Once authorized, reuse the current GPS watcher and validated pipeline; share only
after explicit opt-in. Start around five seconds while moving, reduce stationary
writes, suppress unchanged values and subscribe only to the selected session.
Cap prototype sessions at 50 participants. Clear publishers/listeners on leave,
logout, retirement, cancellation/completion and expired authorization. Use server
time, stale/offline indicators and onDisconnect as additional presence evidence.
Browser lock/background suspension can stop updates on iOS/Android; no dependable
background tracking is promised. Reconnect must recheck admission before publishing.
Keep live records ephemeral and personal completed-route history separate.

The existing Leaflet layers, GPS, heading-up, HUD, weather and personal route recorder
are preserved. No extra GPS watchers, permanent high-frequency writes, location-based
regroup claims, emergency dispatch, push notifications or navigation are introduced.

Local verification: `python tests/run_realtime_rules.py`, with the official database
emulator on 127.0.0.1:9000. It loads this repository's actual rules only into the fixed
`demo-motodash-default-rtdb` namespace. 68 checks cover root enumeration, session reads,
own/other writes, attempted ACL forgery, malformed payloads, deletes and all caller
types. Two administrative fixture checks are positive; all application operations
are deliberately denied. These results do **not** demonstrate functioning live
tracking. Production rules/data and physical phones were not accessed.

References: [Firebase RTDB emulator](https://firebase.google.com/docs/emulator-suite/connect_rtdb)
and [RTDB rules conditions](https://firebase.google.com/docs/database/security/rules-conditions).

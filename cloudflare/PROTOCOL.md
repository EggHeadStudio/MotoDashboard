# Live protocol v1

POST /v1/sessions/{uuid}/ticket uses Authorization: Bearer Firebase-ID-token,
empty body, exact allowed Origin, no URL query. Response: random 256-bit ticket,
expiry 30 seconds. GET .../connect upgrades without any token in the URL.
First WebSocket message: {v:1,type:"hello",ticket}. Consume once, recheck current
Firestore admission, then send hello (opaque riderId) and snapshot. Unauthenticated
sockets get no private payload and close within the pending timeout/alarm delay.

All messages have v:1. Client shapes are exact; UTF-8 <=1024 bytes, text only.
position: latitude, longitude, accuracy<=100m, heading=null or 0..<360,
speedKmh=0..220, sampledAt (fresh <=15s, future <=5s), increasing seq.
Server receipt time establishes freshness. Speed/jump checks are quality bounds,
not proof of genuine GPS. Moving cadence >=5s, stationary >=30s; unchanged
coordinates suppressed. No route history/backlog or profile fields per position.

heartbeat optionally carries a fresh sampledAt confirming the unchanged latest
fix, without repeating coordinates; at least 20s apart, browser uses 25s. Plain
heartbeats prove connection only. Sample-less heartbeats do not refresh location.
Server replies heartbeat and relays only riderId/receipt time for fresh fixes.
status/revalidate request an immediate authority check, at least 10s apart;
status comes from current Firestore membership, never a supplied foreign UID.

Server categories: hello, snapshot, position, participant_update, participant_left,
heartbeat, error (safe code), session_ended. Static identity is sent only at
connection/change/snapshot: safe display name, selected nickname/category, opted-in
organizing Club/rank, informational status. No emails, UIDs, invite tokens or
precise meeting instructions. A riderId is transient routing data, never a label.

One publisher per UID/room; new connection replaces old (4002, no automatic client
takeover loop). Max 50 authorized riders, 70 total pending/authorized sockets,
100 outstanding tickets; 8 client messages/10s and stricter per-type rates.
Closed/revoked sockets are pruned before broadcasts. No raw token or permanent
GPS history in DO storage; latest state exists in hibernatable socket attachments.

Authority lease 30s from check start; renew when <=10s remains, with 10s alarms.
Firestore reads share one parent readTime, deadline 8s across OAuth/read calls.
Access errors close sockets; sends exclude expired leases even if an alarm is late.
No zero-delay revocation promise: a committed removal can remain unseen during
the current lease. Client transition notifications accelerate checks. Firebase
Auth disable/token revocation is not looked up; signed ID tokens expire within 1h.
Frontend clears consent on account changes, access denial and replacement. Expiry
may reconnect with a fresh token only while the same account/consent remains active.

Locations become stale after 45s and expire after 120s. Disconnected markers clear
immediately. Snapshot includes only currently leased riders and unexpired positions.
No GPS fix or expired fix is represented as a current position. Straight-line
separation is informational, not road distance/route order or an emergency response.

Future incompatible formats use a new v/path; unknown versions/types fail closed.
See CLOUDFLARE_SETUP.md for operational checks, cost model and remaining live tests.

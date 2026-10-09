# Private ride export formats

JSON is UTF-8 `MotoDashboardRide`, schemaVersion **1** (independent of local v2
and Firestore v1). Top-level `session` has stable ID, nullable ownerUid/name,
visibility private, nullable vehicleId/display snapshot/category, startedAt and
endedAt in Unix milliseconds, distanceMeters, movingDurationMs,
averageMovingSpeedKmh, maxSpeedKmh and mapTheme. `routePoints` is an ordered array
of `{latitude, longitude, timestamp, accuracy, speedKmh, heading}` or segment
markers `{break:true,timestamp}`. Accuracy/heading can be null; metric units are
meters, milliseconds and km/h. No altitude, pause time or weather snapshots.

GPX is version **1.1**, namespace `http://www.topografix.com/GPX/1/1` with one
track, an escaped track name, and one `trkseg` per continuous route segment.
`trkpt` explicitly names latitude as `lat`, longitude as `lon`; times are UTC ISO
8601. Break markers do not become fake coordinates or lines over GPS gaps.
An empty ride produces a named track without fabricated points.

Files are named `motodash-{stable-id}.json` / `.gpx`. Share GPX uses Web Share
files only when `canShare` supports them; cancellation is respected. Unsupported
or failed file sharing falls back to downloading. There are no public cloud
links. Files contain the ride route and may include account UID; sharing the
file is an explicit user action. User-entered names are data, never HTML/XML.

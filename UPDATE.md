# MotoDashboard update plan

## Goal

Refactor the current GitHub Pages motorcycle dashboard into a modular, mobile-first web application using only HTML, CSS and JavaScript. Preserve the current working GPS, speed, clock, weather and map functionality while adding automatic session tracking, local ride history, route drawing, heading-up map rotation and swipeable map appearance presets.

The application must remain deployable as a static GitHub Pages site. No backend, database server, framework, package manager, build step or non-browser runtime may be introduced.

---

## Non-negotiable requirements

- [ ] Use only static HTML, CSS, JavaScript and existing external browser libraries already required by the app.
- [ ] Keep GitHub Pages deployment working from the existing repository path.
- [ ] Support modern mobile browsers on Android and iOS, not only Safari.
- [ ] Use progressive enhancement: unsupported optional browser APIs must not break core GPS, speed, map, clock or weather functionality.
- [ ] Optimize the primary interface for phone screens in portrait orientation, while keeping landscape usable.
- [ ] Do not add manual route planning, turn-by-turn navigation or destination search.
- [ ] Do not add pause controls or pause-time statistics.
- [ ] Do not store altitude, start weather or end weather in sessions.
- [ ] Do not add a separate weather page.
- [ ] Do not change the current map data provider or weather provider.
- [ ] Do not add a shared/cloud database, user accounts, analytics or location uploads.
- [ ] Store ride data only in the current device browser.

---

# Phase 1 — Audit and safety baseline

## 1.1 Inspect the existing project

- [ ] Identify all current HTML, CSS and JavaScript contained in the existing app.
- [ ] Document the current IDs, classes, global variables, event listeners and API integrations before moving code.
- [ ] Confirm the current GitHub Pages base path and all relative asset paths.
- [ ] Confirm the current Leaflet, OpenStreetMap and Open-Meteo integrations.
- [ ] Confirm the current GPS permission and `watchPosition` flow.
- [ ] Confirm the current speed calculation and smoothing logic.
- [ ] Confirm the current map marker, accuracy circle, weather and network status all work before refactoring.

## 1.2 Create a regression checklist

Before changing files, record a manual baseline for:

- [ ] Page loads without console errors.
- [ ] Start button gives immediate feedback.
- [ ] GPS permission can be requested.
- [ ] GPS coordinates update.
- [ ] Speed never shows `NaN`, `Infinity`, `null` or `undefined`.
- [ ] Map tiles load.
- [ ] Map centers on the current position.
- [ ] Clock updates.
- [ ] Weather loads or fails gracefully.
- [ ] Offline state is displayed correctly.

## Phase 1 completion gate

- [ ] Do not begin Phase 2 until the existing behavior is understood and the baseline is written into the agent's work log or commit notes.

---

# Phase 2 — Modular file structure

Refactor the single-file app into clearly separated static files. Keep paths relative so GitHub Pages project hosting continues to work.

## 2.1 Target structure

Create or adapt this structure where sensible:

```text
index.html
css/
  base.css
  layout.css
  dashboard.css
  map-themes.css
  components.css
js/
  app.js
  config.js
  dom.js
  gps.js
  speed.js
  map.js
  map-rotation.js
  weather.js
  session-store.js
  session-manager.js
  route-recorder.js
  gestures.js
  ui.js
  utils.js
manifest.webmanifest
icon.svg
README.md
UPDATE.md
.nojekyll
```

The agent may merge very small modules when that improves clarity, but must keep responsibilities separated.

## 2.2 HTML requirements

- [x] Keep `index.html` semantic and small.
- [x] Keep all major visual elements and dialogs in HTML, rather than generating the whole interface from JavaScript.
- [x] Load CSS files in a predictable order.
- [x] Load JavaScript using `type="module"` and relative imports if supported by the current GitHub Pages setup.
- [x] Do not use root-relative paths such as `/js/app.js`; use `./js/app.js`.
- [x] Ensure all DOM elements referenced by JavaScript exist exactly once.
Reason: `index.html` lataa nyt `./js/app.js` moduulina, ja `app.js` käyttää suhteellisia importteja (`./config.js`, `./utils.js`).

## 2.3 Module responsibilities

- [ ] `app.js`: application bootstrap and high-level orchestration only.
- [x] `config.js`: thresholds, intervals, theme names and constants.
- [x] `dom.js`: centralized DOM references with null validation.
- [ ] `gps.js`: geolocation permission, watcher lifecycle and raw position events.
- [x] `speed.js`: speed validation, fallback calculation and smoothing.
- [ ] `map.js`: Leaflet initialization, markers, route layers and base map state.
- [ ] `map-rotation.js`: heading calculation, rotation state and rotation fallback behavior.
- [x] `weather.js`: current Open-Meteo request and display mapping only.
- [x] `session-store.js`: IndexedDB access and schema upgrades.
- [ ] `session-manager.js`: new, resume, finish and history workflows.
- [x] `route-recorder.js`: accepted GPS points, duplicate suppression and polyline updates.
- [ ] `gestures.js`: swipe recognition without breaking map pan/zoom.
- [ ] `ui.js`: visible state changes, dialogs, summaries and messages.
- [x] `utils.js`: pure reusable helpers such as Haversine distance, time formatting and clamping.
Reason: DOM-, sää-, tallennus-, nopeus- ja reittitallennusvastuut on erotettu moduuleihin. Jäljellä ovat vielä gps/map/session-manager/ui/gestures -jaot.

## 2.4 Refactor verification

After moving code:

- [x] Run or perform a syntax check on every JavaScript file.
- [x] Confirm every import path resolves with correct letter case.
- [ ] Confirm GitHub Pages serves modules with no MIME or 404 errors.
- [ ] Confirm all Phase 1 regression checks still pass before adding new features.
Reason: Paikallisella staattisella palvelimella moduulit palautuivat 200-vastauksilla, mutta GitHub Pages -deployn jälkeinen varmistus on vielä tekemättä.

## Phase 2 completion gate

- [ ] Do not begin feature work until the modular refactor behaves the same as the previous working version.

---

# Phase 3 — Cross-browser mobile foundation

## 3.1 Responsive design

- [ ] Primary layout is optimized for phone portrait screens.
- [ ] Landscape remains usable without overlapping controls.
- [ ] Use `100dvh` with a safe fallback.
- [ ] Respect CSS safe-area insets where available.
- [ ] Use large touch targets of at least about 44 CSS pixels.
- [ ] Keep the active riding screen free of scrolling.
- [ ] Avoid hover-only interactions.
- [ ] Avoid browser-specific visual assumptions.

## 3.2 Progressive enhancement

- [ ] Core functions must work without Wake Lock.
- [ ] Core functions must work without Fullscreen API.
- [ ] Core functions must work without Device Orientation permission.
- [ ] Core functions must work when `coords.speed` is unavailable.
- [ ] Core functions must work if weather fails.
- [ ] Core functions must keep running if map tile requests fail.
- [ ] Show clear, concise Finnish messages for unsupported or denied features.

## 3.3 Touch and gesture safety

- [ ] Do not disable all browser touch handling globally.
- [ ] Keep Leaflet pan and pinch-zoom usable.
- [ ] Only recognize a map-theme swipe when horizontal movement clearly exceeds vertical movement and a minimum distance threshold.
- [ ] Ignore swipes beginning on buttons, dialogs or interactive controls.
- [ ] Prevent accidental repeated theme changes from one gesture.

---

# Phase 4 — Automatic session workflow

## 4.1 Start screen

When the app opens, show a mobile-friendly start screen with:

- [x] `Uusi sessio`
- [x] `Jatka edellistä`, only when an unfinished session exists
- [x] `Tallennetut ajot`
- [x] A compact summary of the latest completed session when available

## 4.2 New session

Starting a new session must automatically:

- [x] Create a unique session ID.
- [x] Store start time.
- [x] Reset distance, moving time, maximum speed and average speed.
- [x] Start GPS tracking.
- [x] Begin route recording after the first accepted moving GPS point.
- [x] Persist an initial session record locally.
- [x] Require no further routine interaction during the ride.

## 4.3 Resume previous session

Resuming must:

- [x] Restore the unfinished session.
- [x] Restore accumulated distance, moving time, average speed and maximum speed.
- [x] Restore the previously recorded route polyline.
- [x] Continue appending accepted GPS points.
- [x] Avoid creating a large false distance jump between the old last point and a new location after a long gap; treat the first new point as a fresh anchor when needed.

## 4.4 Finish session

- [x] Provide one clear `Lopeta sessio` control.
- [x] Ask for confirmation to avoid accidental termination.
- [x] Save final end time, total distance, moving time, average moving speed and maximum speed.
- [x] Mark the session as completed.
- [x] Show a concise summary.
- [x] Return to the start screen without deleting the session.

## 4.5 No pause model

- [x] Do not add pause or resume controls inside a running ride.
- [x] Do not calculate or display pause duration.
- [x] Moving time only increases when validated speed is above the configured moving threshold.
- [x] Stationary periods are simply excluded from moving-time and moving-average calculations.

---

# Phase 5 — Local device-only storage

## 5.1 IndexedDB

- [x] Store sessions in IndexedDB under the current website origin.
- [x] Do not send session records or route history to any server.
- [x] Use a versioned database schema with safe upgrade handling.
- [x] Store settings separately from session records.
- [x] Handle IndexedDB unavailable or denied conditions gracefully.

## 5.2 Session data model

Store only required fields, for example:

```text
id
status: active | completed
startedAt
endedAt
updatedAt
distanceMeters
movingDurationMs
maxSpeedKmh
averageMovingSpeedKmh
routePoints[]
lastAcceptedPoint
mapTheme
```

Each route point should contain only necessary data:

```text
latitude
longitude
timestamp
accuracy
speedKmh
heading
```

Do not store altitude or weather snapshots.

## 5.3 Automatic persistence

- [x] Save session summary changes on a throttled interval.
- [x] Save route points in sensible batches rather than performing a heavy database write on every GPS callback.
- [x] Flush pending data when the document becomes hidden, when possible.
- [x] Flush data when the session is completed.
- [x] Never block visible GPS or speed updates while writing to storage.

## 5.4 History

- [x] Show completed sessions sorted newest first.
- [x] Display date, moving time, distance, average moving speed and maximum speed.
- [x] Allow opening a session to view its route and summary.
- [x] Allow deleting one session with confirmation.
- [x] Allow deleting all sessions with a stronger confirmation.
- [x] Clearly state that data exists only on this browser/device and can disappear if browser site data is cleared.

---

# Phase 6 — Intelligent route recording

## 6.1 Do not store overlapping stationary points

A GPS point must not be appended to the route merely because `watchPosition` fired.

- [x] Do not append route points while validated speed is below the moving threshold.
- [x] Do not append a point when movement from the last accepted point is below a configurable minimum distance.
- [x] Do not append low-quality points above the configured accuracy threshold.
- [x] Reject impossible jumps and unrealistic speeds.
- [x] Use hysteresis or a short confirmation rule around the moving threshold to prevent rapid start/stop toggling caused by GPS noise.
- [x] Preserve a fresh anchor point when movement starts again so the route line remains continuous without stacks of duplicate points.

## 6.2 Recommended configurable defaults

The agent must centralize these in `config.js` and explain final chosen values:

- [ ] Moving threshold approximately 1.5–3 km/h.
- [ ] Stop threshold lower than moving threshold to create hysteresis.
- [ ] Minimum accepted point distance approximately 3–8 metres, adjusted for accuracy.
- [ ] Maximum acceptable GPS accuracy approximately 40–60 metres.
- [ ] Maximum realistic speed sanity limit.
- [ ] Maximum allowed gap or jump between sequential points.

Do not hardcode these values in multiple modules.

## 6.3 Route display

- [x] Draw the actual driven route as a Leaflet polyline.
- [x] Update the polyline efficiently without rebuilding all layers for every point.
- [x] Restore the polyline when resuming or opening a saved session.
- [x] Keep current-position marker visually distinct from the route.
- [x] Do not add route planning, waypoint editing or navigation instructions.

---

# Phase 7 — Heading-up automatic map rotation

## 7.1 Goal

When the user is moving reliably, rotate the map so the top of the screen points in the direction of travel, similar to navigation applications.

## 7.2 Heading sources

Use this priority order:

1. [x] Reliable `GeolocationCoordinates.heading` while moving.
2. [x] Bearing calculated from consecutive accepted route points.
3. [ ] Optional device orientation heading only when supported, permission has been explicitly granted and it improves reliability.
4. [x] Keep the last stable heading when no new reliable heading exists.

Do not request device orientation permission automatically on initial page load. Only request it after a user gesture if the implementation uses it.

## 7.3 Rotation behavior

- [x] Keep the current-position marker near the lower-middle portion of the map while following.
- [x] Smooth heading changes to prevent jitter.
- [x] Correctly handle transition across 359° and 0° using shortest-angle interpolation.
- [x] Do not rotate when stationary or when heading confidence is poor.
- [x] Return smoothly toward north-up after a configurable stationary period, or keep the last heading if that produces a better experience; document the chosen behavior.
- [x] Add a small compass or north indicator.
- [x] Provide one compact control to toggle between `menosuunta ylös` and `pohjoinen ylös`.
- [x] Persist the user's rotation preference locally.

## 7.4 Leaflet implementation warning

Leaflet raster tiles do not provide native map-bearing rotation. Implement rotation carefully without changing the map provider.

- [x] First inspect whether the existing project already uses a compatible Leaflet rotation approach or plugin.
- [ ] Prefer a small, well-maintained browser-side Leaflet rotation plugin only if it can be loaded statically and introduces no build step.
- [x] If no plugin is used, rotate the correct Leaflet map pane/container rather than only rotating the marker.
- [ ] Counter-rotate labels, controls or overlays that must remain readable where technically possible.
- [ ] Ensure panning, zooming, marker positioning and route polyline remain aligned after rotation.
- [x] If robust rotation cannot be achieved across a browser, automatically fall back to north-up instead of breaking the map.

## 7.5 Rotation verification

- [ ] Test headings near 0°, 90°, 180°, 270° and the 359°→0° transition.
- [ ] Test stationary jitter.
- [ ] Test low-speed walking and normal driving speeds.
- [ ] Test pinch zoom and pan while rotated.
- [ ] Test recentering after the user pans manually.
- [ ] Verify marker, accuracy circle and route remain spatially aligned.

---

# Phase 8 — Swipeable map appearance presets

## Important technical limitation

The current OpenStreetMap raster tile service delivers already-rendered pixels. CSS filters can modify the whole tile image, but cannot reliably identify roads, water and forests as separate semantic layers. Therefore:

- `Normaali` and `Mustavalko` can be implemented accurately with global CSS filters.
- `Cruising`, `Vesistö` and `Metsä` can only be visual approximations while keeping the same raster map provider.
- Do not claim exact preservation of only road, water or forest colours.
- Do not change to vector tiles or another map provider in this update.

## 8.1 Required presets

- [x] `Normaali`: unchanged current map.
- [x] `Mustavalko`: grayscale with strong contrast and clearly visible roads.
- [x] `Cruising`: high-contrast near-monochrome treatment with warm red/yellow emphasis as far as global raster filtering allows.
- [x] `Vesistö`: high-contrast near-monochrome treatment with blue/cyan emphasis as far as global raster filtering allows.
- [x] `Metsä`: high-contrast near-monochrome treatment with green emphasis as far as global raster filtering allows.
- [x] `Yö`: dark, reduced-glare preset suitable for low-light riding.

## 8.2 Theme implementation

- [x] Define presets centrally in JavaScript or CSS custom properties.
- [x] Apply filters only to the tile pane, not to markers, route lines, controls or dashboard text.
- [x] Keep contrast sufficient for road visibility.
- [x] Save the selected preset locally.
- [x] Display the preset name briefly after changing it.
- [x] Add a compact non-gesture fallback control for accessibility and discoverability.

## 8.3 Swipe behavior

- [x] A deliberate horizontal swipe over a non-control map area changes to the previous or next preset.
- [x] The swipe must not trigger during vertical page gestures, button presses, pinch zoom or normal short map panning.
- [x] Use a clear minimum horizontal distance and direction ratio.
- [x] Debounce one theme change per gesture.
- [ ] Ensure swiping remains usable on major mobile browsers.

---

# Phase 9 — Current dashboard and statistics

## 9.1 Keep existing live information

- [x] Current speed.
- [x] Current local time.
- [x] Current temperature.
- [x] Existing weather description.
- [x] Existing wind speed.
- [x] GPS accuracy/status.
- [x] Network status.

Do not add a separate weather page.

## 9.2 Add current-session statistics

Display compactly without cluttering the phone screen:

- [x] Distance.
- [x] Moving time.
- [x] Average moving speed.
- [x] Maximum speed.

Use a compact expandable panel, secondary dashboard card or swipeable information panel, while keeping the map and speed as primary content.

## 9.3 Automatic calculations

- [x] Distance is calculated only from accepted moving route points.
- [x] Moving time accumulates only while movement is confidently detected.
- [x] Average speed is based on distance divided by moving time.
- [x] Maximum speed uses validated and smoothed logic that rejects impossible spikes.
- [x] All values recover correctly after reopening and resuming an active session.

---

# Phase 10 — Usability and automation

- [x] After selecting `Uusi sessio` or `Jatka edellistä`, routine tracking is automatic.
- [x] No manual pause workflow.
- [x] No repetitive save button.
- [x] Auto-save happens quietly.
- [x] Do not show technical debug values in the production UI.
- [x] Keep one obvious session-end action.
- [x] Prevent accidental session replacement: starting a new session while an active session exists must require a clear choice to resume, finish or discard the old one.
- [x] Restore the last screen and essential state after a normal reload where safe.
- [x] Clearly communicate when browser permissions or platform limitations prevent an optional function.

---

# Phase 11 — Testing matrix

## 11.1 Browsers and devices

Test as far as available, and document what was actually tested:

- [ ] iPhone Safari.
- [ ] iPhone Home Screen web app mode, if available.
- [ ] Android Chrome.
- [ ] Android Firefox.
- [ ] Samsung Internet, if available.
- [ ] Desktop Chrome or Edge for basic regression only.
- [ ] Desktop Firefox for basic regression only.

Do not claim a browser was tested unless it actually was.

## 11.2 Functional scenarios

- [ ] Fresh install/no IndexedDB data.
- [ ] New session.
- [ ] Stationary for several minutes: no duplicate route-point buildup.
- [ ] Start moving after being stationary.
- [ ] Stop and move again.
- [ ] GPS accuracy temporarily degrades.
- [ ] GPS produces an unrealistic jump.
- [ ] Reload during an active session and resume.
- [ ] Complete a session and open it from history.
- [ ] Delete a session.
- [ ] Offline after initial load.
- [ ] Weather request failure.
- [ ] Leaflet tile failure.
- [ ] Map rotation unsupported or failed: north-up fallback works.
- [ ] Theme swipe while map is rotated.
- [ ] 359° to 0° heading transition.
- [ ] Portrait and landscape layout.

## 11.3 Performance

- [ ] Avoid unbounded DOM growth.
- [ ] Avoid recreating the entire polyline for every GPS point.
- [ ] Avoid writing to IndexedDB on every animation frame or every trivial GPS callback.
- [ ] Avoid excessive weather requests.
- [ ] Avoid long tasks that freeze the dashboard.
- [ ] Verify long sessions do not cause obvious UI slowdown.

---

# Phase 12 — Documentation and final checks

## 12.1 README update

- [x] Document the new file structure.
- [x] Explain GitHub Pages deployment.
- [x] Explain local-only IndexedDB storage and its limitations.
- [x] Explain new session, resume, history and delete behavior.
- [x] Explain heading-up rotation and browser fallback.
- [x] Explain map presets and the raster-filter limitation.
- [x] Explain that the app is not a navigation system.
- [x] Include the existing safety warning about using the vehicle's own instruments as primary.

## 12.2 UPDATE.md progress

- [ ] Tick each checkbox only after implementation and verification.
- [ ] If an item cannot be completed, leave it unchecked and add a short reason directly below it.
- [ ] Do not mark browser tests complete unless run on that browser/device.
- [ ] Add a final `Implementation notes` section describing architectural decisions and known limitations.

## 12.3 Final acceptance criteria

- [ ] GitHub Pages deployment works with static files only.
- [ ] No framework, package manager, backend or build step was added.
- [ ] Existing GPS, speed, clock, weather and map functions still work.
- [ ] Mobile portrait layout is the primary design.
- [ ] The application remains usable in landscape.
- [ ] Sessions are stored only in the current browser/device.
- [ ] An unfinished session can be resumed.
- [ ] Completed sessions appear in history.
- [ ] Stationary GPS points do not accumulate as overlapping route points.
- [ ] Distance, moving time, average speed and maximum speed are persisted.
- [ ] The actual driven route is drawn and restored.
- [ ] Heading-up mode works where supported and falls back safely to north-up.
- [ ] Map appearance presets can be changed by swipe and by a visible fallback control.
- [ ] No manual route planning was added.
- [ ] No pause workflow, altitude or weather snapshots were added.
- [ ] There are no uncaught JavaScript errors in the tested browsers.
- [ ] All relative paths work from the repository's GitHub Pages subdirectory.

---

# Implementation notes

- Final module structure: single-file static app (`index.html`) plus `manifest.webmanifest`; no bundler or backend.
- IndexedDB: database `moto-dashboard-db` (version 1), stores `sessions` and `settings`.
- Local fallback storage keys: `moto-dashboard-sessions-v1`, `moto-dashboard-settings-v1`.
- Movement thresholds in `index.html`: moving threshold `2.5 km/h`, stop threshold `1.7 km/h`, max accepted accuracy `55 m`, min point distance `4 m`, max point jump `500 m`, max point jump speed `220 km/h`.
- Route behavior: break markers are inserted after long resume gaps and stop->move transitions to avoid false route lines.
- Map rotation technique: CSS `rotate` applied to Leaflet `mapPane` with shortest-angle interpolation and smoothing.
- Rotation fallback: if pane rotation is unsupported, heading-up mode is disabled and UI stays in north-up mode.
- Theme implementation: CSS filters on `.leaflet-tile-pane` only; markers, route and HUD are not filtered.
- Tested browsers/devices in this session: desktop Chromium runtime (Playwright) on macOS. GPS permission in this environment is denied, so live outdoor GPS path and heading confidence scenarios were not fully executable here.
- Known limitations: device-orientation heading source is intentionally not used yet; cross-browser real-device matrix (iPhone/Android variants) is still pending.

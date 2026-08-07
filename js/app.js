import {
  APP_VERSION,
  THEME_NAMES,
  THEME_CLASSES,
  WMO_CODES,
  SESSION_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  DB_NAME,
  DB_VERSION,
  SESSIONS_STORE_NAME,
  SETTINGS_STORE_NAME,
  RESUME_ANCHOR_GAP_MS,
  RESUME_ANCHOR_DISTANCE_M,
  MOVING_SPEED_THRESHOLD_KMH,
  STOP_SPEED_THRESHOLD_KMH,
  MOVING_ACCURACY_MAX_M,
  MIN_ACCEPTED_POINT_DISTANCE_M,
  MAX_POINT_JUMP_DISTANCE_M,
  MAX_POINT_JUMP_SPEED_KMH,
  MIN_MOVING_CONFIRMATION_SAMPLES,
  MIN_STOP_CONFIRMATION_SAMPLES,
  STOP_GAP_BREAK_MS,
  STOP_GAP_BREAK_DISTANCE_M,
  MAX_VALID_SPEED_KMH,
  MAX_FALLBACK_SPEED_KMH,
  HEADING_MIN_SPEED_KMH,
  HEADING_MIN_DISTANCE_M,
  ROTATION_SMOOTHING,
  NORTH_UP_DELAY_MS
} from './config.js';
import { getDomRefs } from './dom.js';
import { createSessionStore } from './session-store.js';
import {
  normalizeAngle,
  shortestAngleDelta,
  getRotationDeltaFromDrag,
  bearingDegrees,
  formatDuration,
  formatDate,
  formatSpeedKmh,
  formatDistanceKm,
  haversine
} from './utils.js';
import { fetchAndRenderWeather } from './weather.js';
import { evaluateSpeedSample, smoothSpeed, createMovementTracker } from './speed.js';
import { createRouteRecorder } from './route-recorder.js';
import {
  computeRotationVisualScale,
  computeRotationAwarePanDelta,
  parseVisualRotationAngle,
  getReliableHeadingCandidate,
  computeUpdatedHeading
} from './map-rotation.js';
import {
  sanitizeSessionName,
  createSessionRecord,
  computeAverageMovingSpeed,
  buildSessionHistoryHtml,
  formatLatestSessionSummary,
  formatCompletedSessionSummary
} from './session-manager.js';
import { isGeolocationSupported, startGeoWatch, stopGeoWatch, getGeolocationErrorMessage } from './gps.js';
import { setCollapsedState, setTextContent } from './ui.js';
import { initLeafletMap, setFollowMapView, updateMapPositionLayers } from './map.js';
import { bindThemeSwipe } from './gestures.js';

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          registrations.forEach(function (registration) {
            registration.unregister();
          });
        });
      }

      var dom;
      try {
        dom = getDomRefs(document);
      } catch (error) {
        console.error(error && error.message ? error.message : 'Pakollisia DOM-elementtejä puuttuu. Sovellusta ei käynnistetä.');
        return;
      }

      var elSpeedBlock = dom.elSpeedBlock;
      var elSpeedValue = dom.elSpeedValue;
      var elTimeDisplay = dom.elTimeDisplay;
      var elWeatherRow = dom.elWeatherRow;
      var elTemperatureRow = dom.elTemperatureRow;
      var elWindRow = dom.elWindRow;
      var elTimePanel = dom.elTimePanel;
      var elWeatherPanel = dom.elWeatherPanel;
      var elTemperaturePanel = dom.elTemperaturePanel;
      var elWindPanel = dom.elWindPanel;
      var elGpsStatus = dom.elGpsStatus;
      var elGpsAccuracy = dom.elGpsAccuracy;
      var elNetworkRow = dom.elNetworkRow;
      var elSessionStatsPanel = dom.elSessionStatsPanel;
      var elStatDistance = dom.elStatDistance;
      var elStatDuration = dom.elStatDuration;
      var elStatAverage = dom.elStatAverage;
      var elStatMax = dom.elStatMax;
      var elSessionStatsToggleBtn = dom.elSessionStatsToggleBtn;
      var elGpsPanel = dom.elGpsPanel;
      var elNetworkPanel = dom.elNetworkPanel;
      var elStatusStack = dom.elStatusStack;
      var elStatusTab = dom.elStatusTab;
      var elTopPanel = dom.elTopPanel;
      var elTopTab = dom.elTopTab;
      var elStartOverlay = dom.elStartOverlay;
      var elStartBtn = dom.elStartBtn;
      var elResumeSessionBtn = dom.elResumeSessionBtn;
      var elHistoryBtn = dom.elHistoryBtn;
      var elSessionSummary = dom.elSessionSummary;
      var elHistoryList = dom.elHistoryList;
      var elHistoryActions = dom.elHistoryActions;
      var elClearHistoryBtn = dom.elClearHistoryBtn;
      var elCenterBtn = dom.elCenterBtn;
      var elThemeBtn = dom.elThemeBtn;
      var elFinishSessionBtn = dom.elFinishSessionBtn;
      var elBackToStartBtn = dom.elBackToStartBtn;
      var elRetryBtn = dom.elRetryBtn;
      var elGpsErrOverlay = dom.elGpsErrOverlay;
      var elGpsErrMsg = dom.elGpsErrMsg;
      var elRetryGpsBtn = dom.elRetryGpsBtn;
      var elStartStatus = dom.elStartStatus;
      var elStartDebug = dom.elStartDebug;
      var elStartVersion = dom.elStartVersion;
      var elMapFallbackMsg = dom.elMapFallbackMsg;
      var elStartGpsHint = dom.elStartGpsHint;
      var elMapStatus = dom.elMapStatus;
      var elSpeedDebug = dom.elSpeedDebug;
      var elMap = dom.elMap;
      var elHeadingBtn = dom.elHeadingBtn;
      var elCompassIndicator = dom.elCompassIndicator;
      var elCompassNeedle = dom.elCompassNeedle;
      var elCompassOverlayNeedle = document.getElementById('compass-overlay-needle');

      var map = null;
      var mapPane = null;
      var posMarker = null;
      var accCircle = null;
      var routeLayer = null;
      var watchId = null;
      var followUser = true;
      var wakeLock = null;
      var smoothedSpeed = 0;
      var prevCoords = null;
      var lastGoodCoords = null;
      var lastWeatherFetch = 0;
      var hasReceivedFirstPosition = false;
      var isStartingGps = false;
      var mapUnavailable = false;
      var currentTheme = 'normal';
      var sessionStorageKey = SESSION_STORAGE_KEY;
      var settingsStorageKey = SETTINGS_STORAGE_KEY;
      var dbName = DB_NAME;
      var dbVersion = DB_VERSION;
      var sessionsStoreName = SESSIONS_STORE_NAME;
      var settingsStoreName = SETTINGS_STORE_NAME;
      var sessionHistory = [];
      var activeSession = null;
      var sessionActive = false;
      var sessionHistoryViewActive = false;
      var sessionStatsCollapsed = false;
      var sessionSaveTimer = null;
      var headingUpEnabled = false;
      var mapRotationSupported = false;
      var currentHeadingDeg = 0;
      var renderedMapRotationDeg = 0;
      var lastReliableHeadingAt = 0;
      var lastPositionAt = 0;
      var hasAppliedInitialFollowZoom = false;
      var touchRotationActive = false;
      var touchRotationStartAngle = 0;
      var touchRotationStartMapAngle = 0;
      var rotationPanActive = false;
      var rotationPanLastPoint = null;
      var desktopRotationActive = false;
      var desktopRotationLastPoint = null;
      var wheelRotateOverlayTimer = null;
      var compassOverlayHideTimer = null;
      var unbindThemeSwipe = null;

      var movementConfirmed = false;
      var uiControlsHidden = false;

      var themeToastTimer = null;
      var mapStatusTimer = null;

      var themeNames = THEME_NAMES;
      var themeClasses = THEME_CLASSES;

      var movementTracker = createMovementTracker({
        movingSpeedThresholdKmh: MOVING_SPEED_THRESHOLD_KMH,
        stopSpeedThresholdKmh: STOP_SPEED_THRESHOLD_KMH,
        movingAccuracyMaxM: MOVING_ACCURACY_MAX_M,
        minMovingConfirmationSamples: MIN_MOVING_CONFIRMATION_SAMPLES,
        minStopConfirmationSamples: MIN_STOP_CONFIRMATION_SAMPLES
      });

      var routeRecorder = createRouteRecorder({
        haversine: haversine,
        resumeAnchorGapMs: RESUME_ANCHOR_GAP_MS,
        resumeAnchorDistanceM: RESUME_ANCHOR_DISTANCE_M,
        stopGapBreakMs: STOP_GAP_BREAK_MS,
        stopGapBreakDistanceM: STOP_GAP_BREAK_DISTANCE_M,
        minAcceptedPointDistanceM: MIN_ACCEPTED_POINT_DISTANCE_M,
        maxPointJumpDistanceM: MAX_POINT_JUMP_DISTANCE_M,
        maxPointJumpSpeedKmh: MAX_POINT_JUMP_SPEED_KMH,
        movingSpeedThresholdKmh: MOVING_SPEED_THRESHOLD_KMH
      });

      var dotIcon = typeof L !== 'undefined' ? L.divIcon({
        className: '',
        html: '<div class="position-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      }) : null;

      function setDebugStage(message) {
        elStartDebug.textContent = 'Debug: ' + message;
      }

      function setStartStatus(message) {
        setTextContent(elStartStatus, message);
      }

      function setMapUnavailableMessage(message) {
        setTextContent(elMapFallbackMsg, message || '');
      }

      function setStartGpsHint(message) {
        setTextContent(elStartGpsHint, message || '');
      }

      function setGpsStatus(message, className) {
        setTextContent(elGpsStatus, message);
        elGpsStatus.className = 'info-row ' + (className || 'status-moderate');
      }

      function resetStartButton(label) {
        elStartBtn.disabled = false;
        setTextContent(elStartBtn, label);
      }

      function setStatusCollapsed(collapsed) {
        setCollapsedState(document.body, elStatusTab, collapsed, 'status-collapsed');
      }

      function setTopCollapsed(collapsed) {
        setCollapsedState(document.body, elTopTab, collapsed, 'top-collapsed');
      }

      function collapseStatusDock() {
        setStatusCollapsed(true);
      }

      function expandStatusDock() {
        setStatusCollapsed(false);
      }

      function collapseTopDock() {
        setTopCollapsed(true);
      }

      function expandTopDock() {
        setTopCollapsed(false);
      }

      function setUiControlsHidden(hidden) {
        uiControlsHidden = !!hidden;
        document.body.classList.toggle('controls-hidden', uiControlsHidden);
      }

      function setSpeedDisplay(kmh) {
        if (!isFinite(kmh) || isNaN(kmh) || kmh < 0) {
          kmh = 0;
        }
        kmh = Math.round(kmh);
        if (kmh < 0.8) {
          kmh = 0;
        }
        elSpeedValue.textContent = String(kmh);
      }

      function updateClock() {
        var now = new Date();
        var h = String(now.getHours()).padStart(2, '0');
        var m = String(now.getMinutes()).padStart(2, '0');
        elTimeDisplay.textContent = h + '.' + m;
      }

      function updateNetwork() {
        if (navigator.onLine) {
          elNetworkRow.textContent = 'Verkko käytössä';
          elNetworkRow.className = 'info-row status-good';
        } else {
          elNetworkRow.textContent = 'Ei verkkoyhteyttä';
          elNetworkRow.className = 'info-row status-bad';
        }
      }

      function updateGpsEnvironmentHint() {
        if (!window.isSecureContext) {
          setStartGpsHint('Tassa selaimessa GPS voi olla estetty. Kayta localhostia tai HTTPS-osoitetta puhelimessa.');
          return;
        }

        if (!isGeolocationSupported(navigator)) {
          setStartGpsHint('Selain ei tue sijaintipalvelua.');
          return;
        }

        if (!navigator.permissions || !navigator.permissions.query) {
          setStartGpsHint('GPS-lupa kysytaan kun painat Uusi sessio.');
          return;
        }

        navigator.permissions.query({ name: 'geolocation' })
          .then(function (result) {
            var lines = [];

            if (result.state === 'denied') {
              lines.push('Sijaintilupa on estetty. Salli lupa selaimen asetuksista.');
            } else if (result.state === 'prompt') {
              lines.push('GPS-lupa kysytaan kun painat Uusi sessio.');
            } else {
              lines.push('GPS-lupa on sallittu. Voit aloittaa session.');
            }

            if (!('wakeLock' in navigator)) {
              lines.push('Näytön palovartija ei ole tuettu tässä selaimessa – näyttö voi sammua ajon aikana.');
            }

            if (!document.documentElement.requestFullscreen) {
              lines.push('Kokokuvatila ei ole tuettu tässä selaimessa.');
            }

            setStartGpsHint(lines.join(' '));

            if (typeof result.onchange !== 'undefined') {
              result.onchange = updateGpsEnvironmentHint;
            }
          })
          .catch(function () {
            setStartGpsHint('GPS-lupa kysytaan kun painat Uusi sessio.');
          });
      }

      var sessionStore = createSessionStore({
        sessionStorageKey: sessionStorageKey,
        settingsStorageKey: settingsStorageKey,
        dbName: dbName,
        dbVersion: dbVersion,
        sessionsStoreName: sessionsStoreName,
        settingsStoreName: settingsStoreName
      });

      function sortSessionHistory() {
        sessionHistory.sort(function (a, b) {
          var aTime = (a && (a.updatedAt || a.startedAt)) || 0;
          var bTime = (b && (b.updatedAt || b.startedAt)) || 0;
          return bTime - aTime;
        });
      }

      function loadSessionHistoryFromLocalStorage() {
        sessionHistory = sessionStore.loadSessionHistoryFromLocalStorage();
      }

      function saveSessionHistoryToLocalStorage() {
        sessionStore.saveSessionHistoryToLocalStorage(sessionHistory);
      }

      function loadSessionsFromIndexedDb() {
        return sessionStore.loadSessionsFromIndexedDb();
      }

      function saveSessionsToIndexedDb() {
        return sessionStore.saveSessionsToIndexedDb(sessionHistory);
      }

      function readSettingFromLocalStorage(key) {
        return sessionStore.readSettingFromLocalStorage(key);
      }

      function writeSettingToLocalStorage(key, value) {
        sessionStore.writeSettingToLocalStorage(key, value);
      }

      function loadSettingFromIndexedDb(key) {
        return sessionStore.loadSettingFromIndexedDb(key);
      }

      function saveSettingToIndexedDb(key, value) {
        return sessionStore.saveSettingToIndexedDb(key, value);
      }

      function applyTheme(themeName) {
        var normalizedTheme = themeName || currentTheme;
        document.body.classList.remove.apply(document.body.classList, themeClasses);
        document.body.classList.add('theme-' + normalizedTheme);
        currentTheme = normalizedTheme;
        if (elThemeBtn) {
          elThemeBtn.textContent = 'Teema: ' + themeNames[themeClasses.indexOf('theme-' + normalizedTheme)];
        }
        writeSettingToLocalStorage('mapTheme', normalizedTheme);
        saveSettingToIndexedDb('mapTheme', normalizedTheme);
      }

      function showThemeToast(themeName) {
        if (!elMapStatus) {
          return;
        }

        if (themeToastTimer) {
          window.clearTimeout(themeToastTimer);
          themeToastTimer = null;
        }

        elMapStatus.textContent = 'Teema: ' + themeName;
        elMapStatus.style.display = '';

        themeToastTimer = window.setTimeout(function () {
          if (elMapStatus.textContent.indexOf('Teema: ') === 0) {
            elMapStatus.style.display = 'none';
          }
          themeToastTimer = null;
        }, 1200);
      }

      function showMapStatusMessage(message, durationMs) {
        if (!elMapStatus) {
          return;
        }

        if (mapStatusTimer) {
          window.clearTimeout(mapStatusTimer);
          mapStatusTimer = null;
        }

        elMapStatus.textContent = message;
        elMapStatus.style.display = '';

        mapStatusTimer = window.setTimeout(function () {
          if (elMapStatus.textContent === message) {
            elMapStatus.style.display = 'none';
          }
          mapStatusTimer = null;
        }, durationMs || 1400);
      }

      function applyStoredTheme() {
        var localTheme = readSettingFromLocalStorage('mapTheme');
        if (localTheme && themeClasses.indexOf('theme-' + localTheme) >= 0) {
          currentTheme = localTheme;
        }
        applyTheme(currentTheme);

        loadSettingFromIndexedDb('mapTheme').then(function (idbTheme) {
          if (!idbTheme || themeClasses.indexOf('theme-' + idbTheme) < 0) {
            return;
          }
          if (idbTheme !== currentTheme) {
            applyTheme(idbTheme);
          }
        });
      }

      function cycleTheme(direction) {
        var currentIndex = themeClasses.indexOf('theme-' + currentTheme);
        if (currentIndex < 0) {
          currentIndex = 0;
        }
        var step = direction === -1 ? -1 : 1;
        currentIndex = (currentIndex + step + themeClasses.length) % themeClasses.length;
        var nextThemeClass = themeClasses[currentIndex];
        var nextTheme = nextThemeClass.replace('theme-', '');
        applyTheme(nextTheme);
        showThemeToast(themeNames[currentIndex]);
      }

      function applyMapRotationVisual(angleDeg) {
        if (!mapRotationSupported) {
          return;
        }

        renderedMapRotationDeg = normalizeAngle(angleDeg);
        if (elMap) {
          var visualScale = getRotationVisualScale(angleDeg);
          elMap.style.transform = 'rotate(' + angleDeg + 'deg) scale(' + visualScale + ')';
        }

        if (elCompassNeedle) {
          elCompassNeedle.style.transform = 'rotate(' + angleDeg + 'deg)';
        }
        if (elCompassOverlayNeedle) {
          elCompassOverlayNeedle.style.transform = 'rotate(' + angleDeg + 'deg)';
        }
      }

      function getRotationVisualScale(angleDeg) {
        return computeRotationVisualScale({
          headingUpEnabled: headingUpEnabled,
          mapRotationSupported: mapRotationSupported,
          angleDeg: angleDeg,
          width: elMap ? (elMap.clientWidth || window.innerWidth || 1) : (window.innerWidth || 1),
          height: elMap ? (elMap.clientHeight || window.innerHeight || 1) : (window.innerHeight || 1)
        });
      }

      function setMapDraggingForMode() {
        if (!map || !map.dragging) {
          return;
        }

        if (headingUpEnabled && mapRotationSupported) {
          map.dragging.disable();
        } else {
          map.dragging.enable();
        }
      }

      function getRotationAwarePanDelta(dx, dy) {
        var visualAngle = getVisualRotationAngleDeg();
        return computeRotationAwarePanDelta({
          dx: dx,
          dy: dy,
          angleDeg: visualAngle,
          scale: getRotationVisualScale(visualAngle)
        });
      }

      function getVisualRotationAngleDeg() {
        return parseVisualRotationAngle({
          transformValue: elCompassNeedle && typeof elCompassNeedle.style.transform === 'string'
            ? elCompassNeedle.style.transform
            : '',
          renderedMapRotationDeg: renderedMapRotationDeg,
          currentHeadingDeg: currentHeadingDeg,
          normalizeAngle: normalizeAngle
        });
      }

      function panRotationAwareBy(dx, dy) {
        if (!map || !headingUpEnabled || !mapRotationSupported) {
          return;
        }

        var adjustedDelta = getRotationAwarePanDelta(dx, dy);
        map.panBy([adjustedDelta[0], adjustedDelta[1]], { animate: false });
        followUser = false;
      }

      function clearCompassOverlayHideTimer() {
        if (!compassOverlayHideTimer) {
          return;
        }

        window.clearTimeout(compassOverlayHideTimer);
        compassOverlayHideTimer = null;
      }

      function hideCompassGestureOverlayImmediately() {
        clearCompassOverlayHideTimer();
        document.body.classList.remove('compass-gesture-active');
      }

      function scheduleCompassOverlayHide(delayMs) {
        clearCompassOverlayHideTimer();
        compassOverlayHideTimer = window.setTimeout(function () {
          document.body.classList.remove('compass-gesture-active');
          compassOverlayHideTimer = null;
        }, typeof delayMs === 'number' ? delayMs : 1500);
      }

      function setCompassGestureOverlayActive(active) {
        var shouldShowOverlay = !!active && headingUpEnabled && mapRotationSupported;
        if (shouldShowOverlay) {
          clearCompassOverlayHideTimer();
          document.body.classList.add('compass-gesture-active');
          return;
        }

        scheduleCompassOverlayHide(500);
      }

      function updateHeadingButtonLabel() {
        elHeadingBtn.textContent = headingUpEnabled ? 'Suunta: menosuunta' : 'Suunta: lukittu';
      }

      function persistHeadingMode() {
        var mode = headingUpEnabled ? 'menosuunta' : 'lukittu';
        writeSettingToLocalStorage('mapHeadingMode', mode);
        saveSettingToIndexedDb('mapHeadingMode', mode);
      }

      function applyHeadingModeSettings(mode, persist) {
        var requestedHeadingUp = mode === 'menosuunta';
        headingUpEnabled = requestedHeadingUp;
        if (requestedHeadingUp && !mapRotationSupported) {
          headingUpEnabled = false;
          showMapStatusMessage('Suuntaustila ei ole tuettu tässä selaimessa', 1800);
        }
        updateHeadingButtonLabel();
        document.body.classList.toggle('heading-menosuunta', headingUpEnabled && mapRotationSupported);
        hideCompassGestureOverlayImmediately();

        if (elCompassIndicator) {
          elCompassIndicator.style.display = headingUpEnabled && mapRotationSupported ? 'inline-flex' : 'none';
        }

        if (!headingUpEnabled) {
          currentHeadingDeg = 0;
          applyMapRotationVisual(0);
        }

        if (persist) {
          persistHeadingMode();
        }
      }

      function applyStoredHeadingMode() {
        var localMode = readSettingFromLocalStorage('mapHeadingMode');
        if (localMode === 'menosuunta' || localMode === 'lukittu') {
          applyHeadingModeSettings(localMode, false);
        } else if (localMode === 'heading-up' || localMode === 'north-up') {
          // Backward compatibility with previous stored values.
          applyHeadingModeSettings(localMode === 'heading-up' ? 'menosuunta' : 'lukittu', false);
        } else {
          applyHeadingModeSettings('lukittu', false);
        }

        loadSettingFromIndexedDb('mapHeadingMode').then(function (idbMode) {
          if (idbMode === 'heading-up') {
            idbMode = 'menosuunta';
          } else if (idbMode === 'north-up') {
            idbMode = 'lukittu';
          }

          if (idbMode !== 'menosuunta' && idbMode !== 'lukittu') {
            return;
          }
          if (idbMode === (headingUpEnabled ? 'menosuunta' : 'lukittu')) {
            return;
          }
          applyHeadingModeSettings(idbMode, false);
        });
      }

      function getReliableHeading(coords, lat, lon, validatedSpeedKmh) {
        return getReliableHeadingCandidate({
          coords: coords,
          lat: lat,
          lon: lon,
          validatedSpeedKmh: validatedSpeedKmh,
          activeSessionLastAcceptedPoint: activeSession && activeSession.lastAcceptedPoint ? activeSession.lastAcceptedPoint : null,
          prevCoords: prevCoords,
          headingMinSpeedKmh: HEADING_MIN_SPEED_KMH,
          movingAccuracyMaxM: MOVING_ACCURACY_MAX_M,
          headingMinDistanceM: HEADING_MIN_DISTANCE_M,
          haversine: haversine,
          bearingDegrees: bearingDegrees,
          normalizeAngle: normalizeAngle
        });
      }

      function updateMapRotation(headingCandidate, movingConfident, now) {
        var headingUpdate = computeUpdatedHeading({
          headingUpEnabled: headingUpEnabled,
          mapRotationSupported: mapRotationSupported,
          headingCandidate: headingCandidate,
          movingConfident: movingConfident,
          now: now,
          currentHeadingDeg: currentHeadingDeg,
          lastReliableHeadingAt: lastReliableHeadingAt,
          northUpDelayMs: NORTH_UP_DELAY_MS,
          rotationSmoothing: ROTATION_SMOOTHING,
          shortestAngleDelta: shortestAngleDelta,
          normalizeAngle: normalizeAngle
        });

        if (!headingUpdate.shouldApply) {
          return;
        }

        currentHeadingDeg = headingUpdate.currentHeadingDeg;
        lastReliableHeadingAt = headingUpdate.lastReliableHeadingAt;
        applyMapRotationVisual(-currentHeadingDeg);
      }

      function getTouchAngleDeg(touchA, touchB) {
        return normalizeAngle(Math.atan2(touchB.clientY - touchA.clientY, touchB.clientX - touchA.clientX) * (180 / Math.PI));
      }

      function setupManualTouchRotation() {
        if (!elMap) {
          return;
        }

        var startRotationAwarePan = function (point) {
          rotationPanActive = true;
          rotationPanLastPoint = point;
        };

        var stopRotationAwarePan = function () {
          rotationPanActive = false;
          rotationPanLastPoint = null;
        };

        var updateRotationAwarePan = function (point) {
          if (!rotationPanActive || !rotationPanLastPoint) {
            return;
          }

          var dx = point.x - rotationPanLastPoint.x;
          var dy = point.y - rotationPanLastPoint.y;
          if (dx === 0 && dy === 0) {
            return;
          }

          panRotationAwareBy(dx, dy);
          rotationPanLastPoint = point;
        };

        var resetTouchState = function () {
          touchRotationActive = false;
          setCompassGestureOverlayActive(false);
        };

        elMap.addEventListener('touchstart', function (event) {
          if (!headingUpEnabled || !mapRotationSupported) {
            return;
          }

          if (event.touches.length === 1) {
            startRotationAwarePan({ x: event.touches[0].clientX, y: event.touches[0].clientY });
            return;
          }

          if (event.touches.length < 2) {
            return;
          }

          stopRotationAwarePan();
          followUser = false;

          touchRotationStartAngle = getTouchAngleDeg(event.touches[0], event.touches[1]);
          touchRotationStartMapAngle = currentHeadingDeg;
          touchRotationActive = true;
          setCompassGestureOverlayActive(true);
        }, { passive: true });

        elMap.addEventListener('touchmove', function (event) {
          if (!headingUpEnabled || !mapRotationSupported) {
            return;
          }

          if (event.touches.length === 1 && rotationPanActive) {
            event.preventDefault();
            updateRotationAwarePan({ x: event.touches[0].clientX, y: event.touches[0].clientY });
            return;
          }

          if (event.touches.length < 2) {
            stopRotationAwarePan();
            resetTouchState();
            return;
          }

          stopRotationAwarePan();
          followUser = false;

          setCompassGestureOverlayActive(true);

          var currentTouchAngle = getTouchAngleDeg(event.touches[0], event.touches[1]);
          if (!touchRotationActive) {
            touchRotationStartAngle = currentTouchAngle;
            touchRotationStartMapAngle = currentHeadingDeg;
            touchRotationActive = true;
            return;
          }

          var delta = shortestAngleDelta(touchRotationStartAngle, currentTouchAngle);
          currentHeadingDeg = normalizeAngle(touchRotationStartMapAngle + delta);
          applyMapRotationVisual(currentHeadingDeg);
        }, { passive: true });

        elMap.addEventListener('touchend', function (event) {
          if (event.touches.length === 0) {
            stopRotationAwarePan();
          }
          resetTouchState();
        }, { passive: true });

        elMap.addEventListener('touchcancel', function () {
          stopRotationAwarePan();
          resetTouchState();
        }, { passive: true });

        elMap.addEventListener('mousedown', function (event) {
          if (!headingUpEnabled || !mapRotationSupported || event.button !== 0) {
            return;
          }

          event.preventDefault();
          stopRotationAwarePan();
          desktopRotationActive = false;
          desktopRotationLastPoint = null;

          if (event.shiftKey) {
            desktopRotationActive = true;
            desktopRotationLastPoint = { x: event.clientX, y: event.clientY };
            followUser = false;
            setCompassGestureOverlayActive(true);
            return;
          }

          startRotationAwarePan({ x: event.clientX, y: event.clientY });
        }, { passive: false });

        window.addEventListener('mousemove', function (event) {
          if (desktopRotationActive && desktopRotationLastPoint) {
            event.preventDefault();
            var dragDelta = getRotationDeltaFromDrag(event.clientX - desktopRotationLastPoint.x, event.clientY - desktopRotationLastPoint.y);
            if (dragDelta !== 0) {
              currentHeadingDeg = normalizeAngle(currentHeadingDeg + dragDelta);
              applyMapRotationVisual(currentHeadingDeg);
              setCompassGestureOverlayActive(true);
            }
            desktopRotationLastPoint = { x: event.clientX, y: event.clientY };
            return;
          }

          if (!rotationPanActive) {
            return;
          }

          event.preventDefault();
          updateRotationAwarePan({ x: event.clientX, y: event.clientY });
        }, { passive: false });

        window.addEventListener('mouseup', function () {
          desktopRotationActive = false;
          desktopRotationLastPoint = null;
          setCompassGestureOverlayActive(false);
          stopRotationAwarePan();
        }, { passive: true });

        // Desktop/trackpad support (Safari GestureEvent): two-finger rotate on touchpad.
        elMap.addEventListener('gesturestart', function (event) {
          if (!headingUpEnabled || !mapRotationSupported) {
            return;
          }

          event.preventDefault();
          followUser = false;
          touchRotationStartMapAngle = currentHeadingDeg;
          setCompassGestureOverlayActive(true);
        }, { passive: false });

        elMap.addEventListener('gesturechange', function (event) {
          if (!headingUpEnabled || !mapRotationSupported) {
            return;
          }

          event.preventDefault();
          followUser = false;
          currentHeadingDeg = normalizeAngle(touchRotationStartMapAngle + event.rotation);
          applyMapRotationVisual(currentHeadingDeg);
          setCompassGestureOverlayActive(true);
        }, { passive: false });

        elMap.addEventListener('gestureend', function (event) {
          if (!headingUpEnabled || !mapRotationSupported) {
            return;
          }

          event.preventDefault();
          setCompassGestureOverlayActive(false);
        }, { passive: false });

        // Desktop fallback: hold Shift and use mouse wheel / touchpad scroll to rotate map.
        elMap.addEventListener('wheel', function (event) {
          if (!headingUpEnabled || !mapRotationSupported || !event.shiftKey) {
            return;
          }

          event.preventDefault();
          followUser = false;

          var wheelDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
          var rotateStep = wheelDelta * 0.25;
          if (!isFinite(rotateStep) || rotateStep === 0) {
            return;
          }

          currentHeadingDeg = normalizeAngle(currentHeadingDeg + rotateStep);
          applyMapRotationVisual(currentHeadingDeg);
          setCompassGestureOverlayActive(true);

          if (wheelRotateOverlayTimer) {
            window.clearTimeout(wheelRotateOverlayTimer);
          }
          wheelRotateOverlayTimer = window.setTimeout(function () {
            setCompassGestureOverlayActive(false);
            wheelRotateOverlayTimer = null;
          }, 500);
        }, { passive: false });
      }

      function resetMovementState() {
        movementTracker.reset();
        movementConfirmed = false;
        lastReliableHeadingAt = 0;
      }

      function updateMovementState(validatedSpeedKmh, accuracy) {
        movementConfirmed = movementTracker.update(validatedSpeedKmh, accuracy, activeSession);
      }

      function setSessionSummary(message) {
        elSessionSummary.textContent = message;
      }

      function updateHistoryActionsVisibility() {
        elHistoryActions.style.display = sessionHistory.length ? 'flex' : 'none';
      }

      function setSessionStatsVisible(visible) {
        if (!visible) {
          elSessionStatsPanel.style.display = 'none';
          elSessionStatsToggleBtn.style.display = 'none';
          return;
        }

        elSessionStatsToggleBtn.style.display = 'inline-flex';
        elSessionStatsPanel.style.display = sessionStatsCollapsed ? 'none' : 'grid';
      }

      function setSessionStatsCollapsed(collapsed) {
        sessionStatsCollapsed = !!collapsed;
        elSessionStatsPanel.style.display = sessionStatsCollapsed ? 'none' : 'grid';
        elSessionStatsToggleBtn.textContent = sessionStatsCollapsed ? 'Sessio: näytä' : 'Sessio: piilota';
        elSessionStatsToggleBtn.setAttribute('aria-pressed', String(!sessionStatsCollapsed));
      }

      function toggleSessionStatsCollapsed() {
        setSessionStatsCollapsed(!sessionStatsCollapsed);
      }

      function updateSessionStatsPanel(session) {
        if (!session || !sessionActive) {
          setSessionStatsVisible(false);
          return;
        }

        setSessionStatsVisible(true);
        elStatDistance.textContent = formatDistanceKm(session.distanceMeters || 0) + ' km';
        elStatDuration.textContent = formatDuration(session.movingDurationMs || 0);
        elStatAverage.textContent = formatSpeedKmh(session.averageMovingSpeedKmh || 0) + ' km/h';
        elStatMax.textContent = formatSpeedKmh(session.maxSpeedKmh || 0) + ' km/h';
      }

      function getSessionLastLatLng(session) {
        return routeRecorder.getSessionLastLatLng(session);
      }

      function loadSessionHistory() {
        loadSessionHistoryFromLocalStorage();
        sortSessionHistory();

        var localCount = sessionHistory.length;

        loadSessionsFromIndexedDb().then(function (storedSessions) {
          if (!Array.isArray(storedSessions)) {
            return;
          }

          if (!storedSessions.length && localCount > 0) {
            saveSessionsToIndexedDb();
            return;
          }

          sessionHistory = storedSessions;
          sortSessionHistory();
          saveSessionHistoryToLocalStorage();
          renderHistory();
          updateStartSummary();
        });
      }

      function saveSessionHistory() {
        sortSessionHistory();
        saveSessionHistoryToLocalStorage();
        saveSessionsToIndexedDb();
      }

      function renderHistory() {
        if (!sessionHistory.length) {
          elHistoryList.innerHTML = '<div>Ei tallennettuja ajoja vielä.</div>';
          updateHistoryActionsVisibility();
          return;
        }

        elHistoryList.innerHTML = buildSessionHistoryHtml(sessionHistory, {
          formatDate: formatDate,
          formatDuration: formatDuration,
          formatSpeedKmh: formatSpeedKmh
        });

        updateHistoryActionsVisibility();
      }

      function openCompletedSessionView(session) {
        if (!session || session.status !== 'completed') {
          return;
        }

        sessionHistoryViewActive = true;
        sessionActive = false;
        setSessionStatsVisible(false);
        activeSession = JSON.parse(JSON.stringify(session));
        elFinishSessionBtn.style.display = 'none';
        elBackToStartBtn.style.display = 'inline-flex';
        elStartOverlay.style.display = 'none';
        elHistoryList.style.display = 'none';
        elHistoryActions.style.display = 'none';
        followUser = false;

        updateRouteLayer();

        var lastLatLng = getSessionLastLatLng(activeSession);
        if (map && lastLatLng) {
          map.setView(lastLatLng, map.getZoom() < 14 ? 14 : map.getZoom());
        }

        setStartStatus('Ajon katselu');
        setSessionSummary(formatCompletedSessionSummary(session, {
          formatDate: formatDate,
          formatDuration: formatDuration,
          formatSpeedKmh: formatSpeedKmh
        }));
      }

      function returnToStartView() {
        sessionHistoryViewActive = false;
        if (!sessionActive) {
          activeSession = null;
        }
        setSessionStatsVisible(false);
        if (routeLayer && map && map.hasLayer(routeLayer)) {
          map.removeLayer(routeLayer);
          routeLayer = null;
        }
        elBackToStartBtn.style.display = 'none';
        elStartOverlay.style.display = 'flex';
        renderHistory();
        updateStartSummary();
        setStartStatus('Valmis');
      }

      function updateStartSummary() {
        var hasActive = sessionHistory.some(function (item) { return item.status === 'active'; });
        elResumeSessionBtn.style.display = hasActive ? 'inline-flex' : 'none';

        if (!sessionHistory.length) {
          setSessionSummary('Ei tallennettuja ajoja vielä.');
          updateHistoryActionsVisibility();
          return;
        }

        var latestCompleted = sessionHistory.find(function (item) { return item.status === 'completed'; }) || sessionHistory[0];
        setSessionSummary(formatLatestSessionSummary(latestCompleted, {
          formatDate: formatDate,
          formatDistanceKm: formatDistanceKm,
          formatDuration: formatDuration
        }));
        updateHistoryActionsVisibility();
      }

      function createSession() {
        return createSessionRecord(currentTheme);
      }

      function updateRouteLayer() {
        routeLayer = routeRecorder.updateRouteLayer({
          map: map,
          leaflet: typeof L !== 'undefined' ? L : undefined,
          activeSession: activeSession,
          routeLayer: routeLayer
        });
      }

      function persistActiveSession(force) {
        if (!activeSession || !sessionActive) {
          return;
        }

        activeSession.updatedAt = Date.now();
        activeSession.averageMovingSpeedKmh = computeAverageMovingSpeed(
          activeSession.distanceMeters,
          activeSession.movingDurationMs
        );

        updateSessionStatsPanel(activeSession);

        var commit = function () {
          var existing = sessionHistory.find(function (item) { return item.id === activeSession.id; });
          if (existing) {
            Object.assign(existing, activeSession);
          } else {
            sessionHistory.unshift(activeSession);
          }
          saveSessionHistory();
          renderHistory();
          updateStartSummary();
        };

        if (force) {
          if (sessionSaveTimer) {
            window.clearTimeout(sessionSaveTimer);
            sessionSaveTimer = null;
          }
          commit();
          return;
        }

        if (!sessionSaveTimer) {
          sessionSaveTimer = window.setTimeout(function () {
            sessionSaveTimer = null;
            commit();
          }, 600);
        }
      }

      function addAcceptedPoint(lat, lon, accuracy, speedKmh, heading) {
        var result = routeRecorder.addAcceptedPoint({
          lat: lat,
          lon: lon,
          accuracy: accuracy,
          speedKmh: speedKmh,
          heading: heading,
          now: Date.now(),
          activeSession: activeSession,
          sessionActive: sessionActive,
          map: map,
          leaflet: typeof L !== 'undefined' ? L : undefined,
          routeLayer: routeLayer,
          persistActiveSession: persistActiveSession
        });

        routeLayer = result.routeLayer;
      }

      function startNewSession() {
        sessionHistoryViewActive = false;
        setSessionStatsCollapsed(false);
        activeSession = createSession();
        hasAppliedInitialFollowZoom = false;
        resetMovementState();
        sessionActive = true;
        updateSessionStatsPanel(activeSession);
        if (routeLayer && map && map.hasLayer(routeLayer)) {
          map.removeLayer(routeLayer);
          routeLayer = null;
        }
        elFinishSessionBtn.style.display = 'inline-flex';
        elBackToStartBtn.style.display = 'none';
        elHistoryList.style.display = 'none';
        setSessionSummary('Uusi sessio käynnissä. Reitti tallennetaan tähän laitteeseen.');
        persistActiveSession(true);
      }

      function resumePreviousSession() {
        var latest = sessionHistory.find(function (item) { return item.status === 'active'; });
        if (!latest) {
          setSessionSummary('Kesken olevaa sessiota ei löytynyt.');
          return;
        }

        activeSession = JSON.parse(JSON.stringify(latest));
        hasAppliedInitialFollowZoom = false;
        resetMovementState();
        sessionHistoryViewActive = false;
        setSessionStatsCollapsed(false);
        activeSession.resumeAnchorPending = true;
        sessionActive = true;
        updateSessionStatsPanel(activeSession);
        elFinishSessionBtn.style.display = 'inline-flex';
        elBackToStartBtn.style.display = 'none';
        elHistoryList.style.display = 'none';
        elStartOverlay.style.display = 'none';
        updateRouteLayer();
        setSessionSummary('Jatketaan aiempaa sessiota.');
        setStartStatus('Sessio palautettu');

        if (!window.isSecureContext || !isGeolocationSupported(navigator)) {
          showLocationError('Sijaintia ei voitu kaynnistaa jatketulle sessiolle.', 'GPS ei kaynnistynyt');
          return;
        }

        try {
          startGpsTracking();
        } catch (error) {
          showLocationError('GPS-seurannan kaynnistys epaonnistui jatketulle sessiolle.', 'GPS-kaynnistys epaonnistui', error);
          return;
        }

        requestWakeLockSafely();
      }

      function finishSession() {
        if (!sessionActive || !activeSession) {
          return;
        }

        if (!window.confirm('Lopetetaanko nykyinen sessio?')) {
          return;
        }

        var nameInput = window.prompt('Anna sessiolle nimi (valinnainen):', activeSession.name || '');
        if (nameInput !== null) {
          activeSession.name = sanitizeSessionName(nameInput);
        }

        activeSession.status = 'completed';
        activeSession.endedAt = Date.now();
        activeSession.updatedAt = Date.now();
        persistActiveSession(true);

        sessionActive = false;
        resetMovementState();
        sessionHistoryViewActive = false;
        setSessionStatsVisible(false);
        elFinishSessionBtn.style.display = 'none';
        elBackToStartBtn.style.display = 'none';
        elStartOverlay.style.display = 'flex';
        setStartStatus('Sessio valmis');
        setSessionSummary('Sessio tallennettu paikallisesti' + (activeSession.name ? ': ' + activeSession.name : '.') );
        updateStartSummary();
      }

      function toggleHistoryList() {
        var visible = elHistoryList.style.display === 'block';
        elHistoryList.style.display = visible ? 'none' : 'block';
        if (!visible) {
          renderHistory();
        }
      }

      function initMap() {
        if (map || mapUnavailable || typeof L === 'undefined') {
          if (typeof L === 'undefined') {
            mapUnavailable = true;
            setMapUnavailableMessage('Karttakirjastoa ei voitu ladata');
          }
          return;
        }

        try {
          var onUserMapInteraction = function (event) {
            if (event && event.originalEvent) {
              followUser = false;
            }
          };

          var mapInit = initLeafletMap({
            L: L,
            mapElementId: 'map',
            mapStatusEl: elMapStatus,
            onUserMapInteraction: onUserMapInteraction,
            initialLat: 61.9241,
            initialLon: 25.7482,
            initialZoom: 6
          });

          map = mapInit.map;
          mapPane = mapInit.mapPane;
          mapRotationSupported = !!(elMap && 'transform' in elMap.style);
          if (!mapRotationSupported) {
            headingUpEnabled = false;
          }
          applyHeadingModeSettings(headingUpEnabled ? 'menosuunta' : 'lukittu', false);
          setupManualTouchRotation();
        } catch (error) {
          mapUnavailable = true;
          map = null;
          mapPane = null;
          mapRotationSupported = false;
          console.warn('Karttaa ei voitu ladata', error);
          setMapUnavailableMessage('Karttaa ei voitu ladata');
        }
      }

      function setFollowView(lat, lon) {
        hasAppliedInitialFollowZoom = setFollowMapView({
          map: map,
          L: typeof L !== 'undefined' ? L : null,
          lat: lat,
          lon: lon,
          hasAppliedInitialFollowZoom: hasAppliedInitialFollowZoom,
          headingUpEnabled: headingUpEnabled,
          mapRotationSupported: mapRotationSupported
        });
      }

      function updateMapPosition(lat, lon, accuracy) {
        var positionUpdate = updateMapPositionLayers({
          map: map,
          L: typeof L !== 'undefined' ? L : null,
          dotIcon: dotIcon,
          posMarker: posMarker,
          accCircle: accCircle,
          lat: lat,
          lon: lon,
          accuracy: accuracy
        });

        posMarker = positionUpdate.posMarker;
        accCircle = positionUpdate.accCircle;

        if (followUser) {
          setFollowView(lat, lon);
        }

      }

      function requestWakeLockSafely() {
        if (!('wakeLock' in navigator)) {
          return;
        }

        try {
          navigator.wakeLock.request('screen')
            .then(function (sentinel) {
              wakeLock = sentinel;
            })
            .catch(function (error) {
              console.warn('Wake Lock epäonnistui.', error);
            });
        } catch (error) {
          console.warn('Wake Lock epäonnistui.', error);
        }
      }

      function requestFullscreenSafely() {
        var root = document.documentElement;
        if (!root || !root.requestFullscreen) {
          return;
        }

        try {
          var fullscreenResult = root.requestFullscreen();
          if (fullscreenResult && typeof fullscreenResult.catch === 'function') {
            fullscreenResult.catch(function (error) {
              console.warn('Kokoruututila epäonnistui.', error);
            });
          }
        } catch (error) {
          console.warn('Kokoruututila epäonnistui.', error);
        }
      }

      function clearExistingWatch() {
        if (watchId !== null) {
          stopGeoWatch(navigator.geolocation, watchId);
          watchId = null;
        }
      }

      function finishGpsStartupSuccess() {
        hasReceivedFirstPosition = true;
        isStartingGps = false;
        elGpsErrOverlay.style.display = 'none';
        elRetryBtn.style.display = 'none';
        elStartOverlay.style.display = 'none';
        elFinishSessionBtn.style.display = sessionActive ? 'inline-flex' : 'none';
        setDebugStage('Sijainti vastaanotettu');
        setStartStatus('Sijainti vastaanotettu');
        resetStartButton('Uusi sessio');
      }

      function enterRunningUiPendingGps() {
        elGpsErrOverlay.style.display = 'none';
        elRetryBtn.style.display = 'none';
        elStartOverlay.style.display = 'none';
        elFinishSessionBtn.style.display = sessionActive ? 'inline-flex' : 'none';
        resetStartButton('Uusi sessio');
      }

      function setWeatherWaitingForGps() {
        elWeatherRow.textContent = 'Sää odottaa GPS:ää';
        elTemperatureRow.textContent = '— °C';
        elWindRow.textContent = '—';
      }

      function showLocationError(message, debugMessage, error) {
        isStartingGps = false;
        setStartStatus(message);
        setDebugStage(debugMessage || message);
        setGpsStatus('GPS ei saatavilla', 'status-bad');
        elGpsAccuracy.textContent = 'Tarkkuus: ei saatavilla';
        setWeatherWaitingForGps();
        elGpsErrMsg.textContent = message;
        elGpsErrOverlay.style.display = 'flex';
        elStartOverlay.style.display = 'flex';
        elRetryBtn.style.display = '';
        resetStartButton('Yritä uudelleen');
        if (error) {
          console.error(error);
        }
      }

      function getGpsErrorMessage(err) {
        return getGeolocationErrorMessage(err);
      }

      function showLocationFallback(message, debugMessage, error) {
        setStartStatus(message);
        setDebugStage(debugMessage || message);
        setGpsStatus('Pyydetään sijaintia…', 'status-moderate');
        elGpsAccuracy.textContent = 'Tarkkuus: haetaan…';
        setWeatherWaitingForGps();
        if (error) {
          console.warn(error);
        }
      }

      function updateGpsQuality(accuracy) {
        if (accuracy <= 20) {
          setGpsStatus('GPS hyvä', 'status-good');
        } else if (accuracy <= 50) {
          setGpsStatus('GPS kohtalainen', 'status-moderate');
        } else {
          setGpsStatus('GPS heikko', 'status-bad');
        }
      }

      function handlePositionSuccess(pos) {
        var coords = pos.coords;
        var now = Date.now();
        var lat = coords.latitude;
        var lon = coords.longitude;
        var accuracy = coords.accuracy;
        var validatedSpeedKmh = null;
        var fallbackKmh = null;
        var rawGpsKmh = null;
        var dt = 0;
        lastPositionAt = now;

        elGpsAccuracy.textContent = 'Tarkkuus: ' + Math.round(accuracy) + ' m';
        updateGpsQuality(accuracy);

        var speedSample = evaluateSpeedSample({
          coords: coords,
          prevCoords: prevCoords,
          now: now,
          maxValidSpeedKmh: MAX_VALID_SPEED_KMH,
          maxFallbackSpeedKmh: MAX_FALLBACK_SPEED_KMH,
          haversine: haversine
        });

        validatedSpeedKmh = speedSample.validatedSpeedKmh;
        rawGpsKmh = speedSample.rawGpsKmh;
        fallbackKmh = speedSample.fallbackKmh;
        dt = speedSample.dtSeconds;

        smoothedSpeed = smoothSpeed(smoothedSpeed, validatedSpeedKmh);

        if (sessionActive && activeSession) {
          updateMovementState(validatedSpeedKmh, accuracy);
          if (movementConfirmed && validatedSpeedKmh !== null && validatedSpeedKmh >= STOP_SPEED_THRESHOLD_KMH && accuracy <= MOVING_ACCURACY_MAX_M) {
            activeSession.movingDurationMs += Math.max(1000, (now - (prevCoords ? prevCoords.t : now)));
            if (activeSession.maxSpeedKmh < smoothedSpeed) {
              activeSession.maxSpeedKmh = smoothedSpeed;
            }
            if (validatedSpeedKmh >= MOVING_SPEED_THRESHOLD_KMH) {
              addAcceptedPoint(lat, lon, accuracy, smoothedSpeed, coords.heading);
            }
          }
        }

        setSpeedDisplay(smoothedSpeed);

        if (elSpeedDebug) {
          var rawStr = rawGpsKmh !== null ? rawGpsKmh.toFixed(1) : 'ei saatavilla';
          var calcStr = fallbackKmh !== null ? fallbackKmh.toFixed(1) : '—';
          var dtStr = dt > 0 ? dt.toFixed(1) + ' s' : '—';
          elSpeedDebug.textContent = 'GPS: ' + rawStr + ' | laskettu: ' + calcStr + ' | näyttö: ' + Math.round(smoothedSpeed) + ' | Δt: ' + dtStr;
        }

        if (accuracy <= 50) {
          prevCoords = { lat: lat, lon: lon, t: now };
        } else if (!prevCoords) {
          prevCoords = { lat: lat, lon: lon, t: now };
        }
        lastGoodCoords = { lat: lat, lon: lon };

        updateMapPosition(lat, lon, accuracy);

        if (lastWeatherFetch === 0 || (now - lastWeatherFetch) >= 15 * 60 * 1000) {
          lastWeatherFetch = Date.now();
          fetchAndRenderWeather(lat, lon, {
            isOnline: navigator.onLine,
            weatherRowEl: elWeatherRow,
            temperatureRowEl: elTemperatureRow,
            windRowEl: elWindRow,
            wmoCodes: WMO_CODES,
            fetchImpl: fetch
          });
        }

        if (!hasReceivedFirstPosition) {
          finishGpsStartupSuccess();
        } else {
          setDebugStage('Sijainti vastaanotettu');
          setStartStatus('Sijainti vastaanotettu');
        }
      }

      function handlePositionError(err) {
        var message = getGpsErrorMessage(err);
        var debugMessage = err && typeof err.code !== 'undefined' ? 'GPS-virhe: ' + err.code : 'GPS-virhe';

        if (err && err.code === 1) {
          setDebugStage('Sijaintilupa evätty');
          showLocationError(message, 'Sijaintilupa evätty', err);
        } else {
          setDebugStage(debugMessage);
          showLocationFallback(message, debugMessage, err);
        }

        console.error('GPS-virhe', err);
      }

      function startGpsTracking(options) {
        var softRestart = !!(options && options.softRestart);
        clearExistingWatch();
        if (!softRestart) {
          resetMovementState();
          hasReceivedFirstPosition = false;
          isStartingGps = true;
          setGpsStatus('Pyydetään sijaintia…', 'status-moderate');
          elGpsAccuracy.textContent = 'Tarkkuus: haetaan…';
          setStartStatus('Pyydetään sijaintilupaa…');
          setDebugStage('Pyydetään sijaintilupaa');
        } else {
          isStartingGps = false;
          setDebugStage('GPS-seuranta palautetaan');
        }

        var options = {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        };

        watchId = startGeoWatch(navigator.geolocation, handlePositionSuccess, handlePositionError, options);
        setDebugStage('GPS-seuranta käynnistetty');

        if (!softRestart) {
          navigator.geolocation.getCurrentPosition(function (pos) {
            handlePositionSuccess(pos);
          }, function (err) {
            handlePositionError(err);
          }, options);
        }
      }

      function startButtonHandler() {
        // Guard: if an active session already exists, ask user to choose first
        if (sessionActive && activeSession) {
          if (!window.confirm('Ajossa on jo aktiivinen sessio. Aloitetaanko uusi ajo? Kesken oleva sessio jää tallennetuksi ja voidaan jatkaa myöhemmin.')) {
            resetStartButton('Uusi sessio');
            return;
          }
          // Save current session as paused/active so it can be resumed later
          persistActiveSession(true);
          sessionActive = false;
          activeSession = null;
          clearExistingWatch();
          setSessionStatsVisible(false);
          elFinishSessionBtn.style.display = 'none';
        }

        elStartBtn.disabled = true;
        elStartBtn.textContent = 'Käynnistetään…';
        setStartStatus('Pyydetään sijaintilupaa…');
        setDebugStage('Aloita painettu');
        elGpsErrOverlay.style.display = 'none';
        elRetryBtn.style.display = 'none';
        setGpsStatus('Pyydetään sijaintia…', 'status-moderate');

        startNewSession();
        updateGpsEnvironmentHint();

        enterRunningUiPendingGps();

        if (!window.isSecureContext) {
          showLocationError('Sijainti vaatii suojatun yhteyden (HTTPS tai localhost).', 'Ei suojattu yhteys');
          return;
        }

        if (!isGeolocationSupported(navigator)) {
          showLocationError('Tämä selain ei tue sijaintia.', 'GPS ei tuettu');
          return;
        }

        try {
          startGpsTracking();
        } catch (error) {
          showLocationError('GPS-seurannan käynnistäminen epäonnistui.', 'GPS-käynnistys epäonnistui', error);
          return;
        }

        requestWakeLockSafely();
        requestFullscreenSafely();
      }

      function retryGps() {
        elGpsErrOverlay.style.display = 'none';
        elRetryBtn.style.display = 'none';
        if (isGeolocationSupported(navigator)) {
          try {
            startGpsTracking();
            return;
          } catch (error) {
            showLocationError('GPS-seurannan uudelleenkäynnistys epäonnistui.', 'GPS-uudelleenkäynnistys epäonnistui', error);
            return;
          }
        }
        elStartOverlay.style.display = 'flex';
        startButtonHandler();
      }

      elStartVersion.textContent = 'Versio ' + APP_VERSION;
      loadSessionHistory();
      renderHistory();
      updateStartSummary();
      updateGpsEnvironmentHint();
      setStartStatus('Valmis');
      setDebugStage('Valmis');
      setSpeedDisplay(0);
      applyStoredTheme();
      applyStoredHeadingMode();
      updateClock();
      updateNetwork();
      window.addEventListener('online', updateNetwork);
      window.addEventListener('offline', updateNetwork);
      setInterval(updateClock, 500);

      if (typeof L === 'undefined') {
        mapUnavailable = true;
        setMapUnavailableMessage('Karttaa ei voitu ladata');
        console.warn('Leaflet ei latautunut. Kartta ei ole käytettävissä.');
      } else {
        initMap();
      }

      // Auto-resume: if there is exactly one active session, restore it automatically after reload
      (function autoRestoreActiveSession() {
        var actives = sessionHistory.filter(function (item) { return item.status === 'active'; });
        if (actives.length !== 1) {
          return;
        }

        var session = actives[0];
        var ageMs = Date.now() - (session.updatedAt || session.startedAt || 0);
        // Only auto-restore if the session was updated within the last 24 hours
        if (ageMs > 24 * 60 * 60 * 1000) {
          return;
        }

        activeSession = JSON.parse(JSON.stringify(session));
        hasAppliedInitialFollowZoom = false;
        sessionHistoryViewActive = false;
        activeSession.resumeAnchorPending = true;
        sessionActive = true;
        setSessionStatsCollapsed(false);
        updateSessionStatsPanel(activeSession);
        updateRouteLayer();
        elFinishSessionBtn.style.display = 'inline-flex';
        elBackToStartBtn.style.display = 'none';
        elStartOverlay.style.display = 'none';
        setStartStatus('Sessio palautettu automaattisesti');

        if (!window.isSecureContext || !isGeolocationSupported(navigator)) {
          return;
        }

        try {
          startGpsTracking();
        } catch (error) {
          console.warn('GPS-seurannan automaattinen käynnistys epäonnistui.', error);
        }

        requestWakeLockSafely();
      }());

      elCenterBtn.addEventListener('click', function () {
        followUser = true;
        if (map && lastGoodCoords) {
          setFollowView(lastGoodCoords.lat, lastGoodCoords.lon);
        }
      });

      elThemeBtn.addEventListener('click', function () {
        cycleTheme(1);
      });

      if (elMap) {
        unbindThemeSwipe = bindThemeSwipe({
          mapElement: elMap,
          minDistance: 56,
          minDirectionRatio: 1.35,
          canStart: function () {
            return !touchRotationActive && !rotationPanActive && !(headingUpEnabled && mapRotationSupported);
          },
          onSwipe: function (direction) {
            cycleTheme(direction > 0 ? 1 : -1);
          }
        });
      }

      elHeadingBtn.addEventListener('click', function () {
        var nextMode = headingUpEnabled ? 'lukittu' : 'menosuunta';
        applyHeadingModeSettings(nextMode, true);
      });

      elSpeedBlock.addEventListener('click', function () {
        setUiControlsHidden(!uiControlsHidden);
      });

      elSpeedBlock.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setUiControlsHidden(!uiControlsHidden);
        }
      });

      elRetryGpsBtn.addEventListener('click', retryGps);
      elRetryBtn.addEventListener('click', retryGps);
      elSessionStatsToggleBtn.addEventListener('click', toggleSessionStatsCollapsed);
      elStartBtn.addEventListener('click', startButtonHandler);
      elResumeSessionBtn.addEventListener('click', resumePreviousSession);
      elHistoryBtn.addEventListener('click', toggleHistoryList);
      elClearHistoryBtn.addEventListener('click', function () {
        if (!sessionHistory.length) {
          setSessionSummary('Ei poistettavia ajoja.');
          return;
        }

        if (!window.confirm('Poistetaanko kaikki tallennetut ajot tältä laitteelta?')) {
          return;
        }

        if (!window.confirm('Vahvistus: poistetaanko varmasti kaikki ajot? Tätä ei voi perua.')) {
          return;
        }

        sessionHistory = [];
        if (!sessionActive) {
          activeSession = null;
          setSessionStatsVisible(false);
          if (routeLayer && map && map.hasLayer(routeLayer)) {
            map.removeLayer(routeLayer);
            routeLayer = null;
          }
        }

        saveSessionHistory();
        renderHistory();
        updateStartSummary();
        setSessionSummary('Kaikki tallennetut ajot poistettu.');
      });
      elBackToStartBtn.addEventListener('click', returnToStartView);
      elFinishSessionBtn.addEventListener('click', finishSession);
      elStatusTab.addEventListener('click', expandStatusDock);
      elTopTab.addEventListener('click', expandTopDock);

      function panelKeyToggle(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          collapseStatusDock();
        }
      }

      function statsPanelKeyToggle(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleSessionStatsCollapsed();
        }
      }

      function topPanelKeyToggle(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          collapseTopDock();
        }
      }

      elGpsPanel.addEventListener('click', collapseStatusDock);
      elNetworkPanel.addEventListener('click', collapseStatusDock);
      elSessionStatsPanel.addEventListener('click', toggleSessionStatsCollapsed);
      elGpsPanel.addEventListener('keydown', panelKeyToggle);
      elNetworkPanel.addEventListener('keydown', panelKeyToggle);
      elSessionStatsPanel.addEventListener('keydown', statsPanelKeyToggle);
      elTimePanel.addEventListener('click', collapseTopDock);
      elWeatherPanel.addEventListener('click', collapseTopDock);
      elTemperaturePanel.addEventListener('click', collapseTopDock);
      elWindPanel.addEventListener('click', collapseTopDock);
      elTimePanel.addEventListener('keydown', topPanelKeyToggle);
      elWeatherPanel.addEventListener('keydown', topPanelKeyToggle);
      elTemperaturePanel.addEventListener('keydown', topPanelKeyToggle);
      elWindPanel.addEventListener('keydown', topPanelKeyToggle);

      elHistoryList.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) {
          return;
        }

        var action = button.getAttribute('data-action');
        var id = button.getAttribute('data-id');
        if (action === 'delete') {
          if (!window.confirm('Poistetaanko tallennettu ajo?')) {
            return;
          }

          sessionHistory = sessionHistory.filter(function (item) { return item.id !== id; });
          if (activeSession && activeSession.id === id && !sessionActive) {
            activeSession = null;
            setSessionStatsVisible(false);
            if (routeLayer && map && map.hasLayer(routeLayer)) {
              map.removeLayer(routeLayer);
              routeLayer = null;
            }
          }
          saveSessionHistory();
          renderHistory();
          updateStartSummary();
          setSessionSummary('Tallennettu ajo poistettu.');
          return;
        }

        if (action === 'open') {
          var completed = sessionHistory.find(function (item) { return item.id === id; });
          if (!completed || completed.status !== 'completed') {
            setSessionSummary('Valittua tallennettua sessiota ei löytynyt.');
            return;
          }

          openCompletedSessionView(completed);
          return;
        }

        if (action === 'rename') {
          var renameTarget = sessionHistory.find(function (item) { return item.id === id; });
          if (!renameTarget) {
            setSessionSummary('Valittua sessiota ei löytynyt.');
            return;
          }

          var renamed = window.prompt('Anna sessiolle uusi nimi (valinnainen):', renameTarget.name || '');
          if (renamed === null) {
            return;
          }

          renameTarget.name = sanitizeSessionName(renamed);
          renameTarget.updatedAt = Date.now();
          if (activeSession && activeSession.id === renameTarget.id) {
            activeSession.name = renameTarget.name;
            activeSession.updatedAt = renameTarget.updatedAt;
          }

          saveSessionHistory();
          renderHistory();
          updateStartSummary();
          setSessionSummary('Session nimi päivitetty.');
          return;
        }

        if (action !== 'resume') {
          return;
        }

        var selected = sessionHistory.find(function (item) { return item.id === id; });
        if (!selected || selected.status !== 'active') {
          setSessionSummary('Valittua keskeneräistä sessiota ei löytynyt.');
          return;
        }

        activeSession = JSON.parse(JSON.stringify(selected));
        resetMovementState();
        sessionHistoryViewActive = false;
        activeSession.resumeAnchorPending = true;
        sessionActive = true;
        updateSessionStatsPanel(activeSession);
        elFinishSessionBtn.style.display = 'inline-flex';
        elBackToStartBtn.style.display = 'none';
        elStartOverlay.style.display = 'none';
        elHistoryList.style.display = 'none';
        updateRouteLayer();
        setStartStatus('Sessio palautettu');
        setSessionSummary('Sessio palautettu: ' + formatDate(selected.startedAt));

        if (!window.isSecureContext || !isGeolocationSupported(navigator)) {
          showLocationError('Sijaintia ei voitu kaynnistaa jatketulle sessiolle.', 'GPS ei kaynnistynyt');
          return;
        }

        try {
          startGpsTracking();
        } catch (error) {
          showLocationError('GPS-seurannan kaynnistys epaonnistui jatketulle sessiolle.', 'GPS-kaynnistys epaonnistui', error);
          return;
        }

        requestWakeLockSafely();
      });

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
          persistActiveSession(true);
          return;
        }

        if (document.visibilityState === 'visible') {
          requestWakeLockSafely();

          if (!sessionActive || !isGeolocationSupported(navigator) || !window.isSecureContext) {
            return;
          }

          var stalePosition = !lastPositionAt || (Date.now() - lastPositionAt) > 20000;
          if (watchId === null || stalePosition) {
            try {
              startGpsTracking({ softRestart: true });
            } catch (error) {
              console.warn('GPS-seurannan palautus epaonnistui näkyvyyden muutoksen jälkeen.', error);
            }
          }
        }
      });

      window.addEventListener('pageshow', function () {
        if (!sessionActive || !window.isSecureContext || !isGeolocationSupported(navigator)) {
          return;
        }

        if (watchId === null) {
          try {
            startGpsTracking({ softRestart: true });
          } catch (error) {
            console.warn('GPS-seurannan palautus pageshow-tapahtumassa epaonnistui.', error);
          }
        }
      });
    });
  })();

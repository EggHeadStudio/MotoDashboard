import { createPositionPipeline } from './position-pipeline.js';
import { initAuthUI } from './auth-ui.js';
import { initClubUI } from './club-ui.js';
import { initGroupUI } from './group-ui.js';
import { initClubMembersUI } from './club-members-ui.js';
import { initClubBrandingUI } from './club-branding-ui.js';
import { initGarageUI, selectedVehicle, onVehicleChange } from './garage-ui.js';
import { vehicleSnapshot } from './data/schema.js';
import { getAccount, getAuthState, onAccountChange } from './auth-state.js';
import { createSessionSync, queueRide } from './session-sync.js';
import { listCloudSessions, loadCloudRoute, localFromCloud, cloudDeletionIds, getCloudSession } from './firebase/sessionRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { sessionFile, shareOrDownload } from './session-export.js';
import { button } from './ui/forms.js';
import { initI18n, t, resolveText, setLocalizedText, onLanguageChange, formatNumber, getLocale } from './i18n/i18n.js';
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
  MOVING_SPEED_THRESHOLD_KMH,
  MOVING_ACCURACY_MAX_M,
  MIN_ACCEPTED_POINT_DISTANCE_M,
  MAX_POINT_JUMP_DISTANCE_M,
  MAX_POINT_JUMP_SPEED_KMH,
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
import { smoothSpeed } from './speed.js';
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
import { initLeafletMap, setFollowMapView, updateMapPositionLayers, setMapThemeLayer } from './map.js';

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async function () {
      initI18n();
      initAuthUI();
      initGarageUI();
      initClubUI();
      initGroupUI();
      initClubMembersUI();
      initClubBrandingUI();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
          registrations.filter(registration => registration.scope === new URL('./', document.baseURI).href)
            .map(registration => registration.unregister())
        )).catch(error => console.warn('Service worker cleanup failed', error));
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
      var mapTileLayer = null;
      var posMarker = null;
      var accuracyCircle = null;
      var pendingSessionSnapshot = null;
      var recordingReady = false;
      var logoRingMarker = null;
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

      var movementConfirmed = false;
      var uiControlsHidden = false;

      var themeToastTimer = null;
      var mapStatusTimer = null;
      var viewportRefreshTimer = null;
      var viewportListenersBound = false;

      function themeLabel(index) { return t(THEME_NAMES[index]); }
      var themeClasses = THEME_CLASSES;

      var positionPipeline = createPositionPipeline();

      var routeRecorder = createRouteRecorder({
        haversine: haversine,
        minAcceptedPointDistanceM: MIN_ACCEPTED_POINT_DISTANCE_M,
        maxPointJumpDistanceM: MAX_POINT_JUMP_DISTANCE_M,
        maxPointJumpSpeedKmh: MAX_POINT_JUMP_SPEED_KMH,
        movingSpeedThresholdKmh: MOVING_SPEED_THRESHOLD_KMH
      });

      var dotIcon = typeof L !== 'undefined' ? L.divIcon({
        className: '',
        html: '<div class="position-dot"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      }) : null;

      var logoRingIcon = typeof L !== 'undefined' ? L.divIcon({
        className: '',
        html: '<div class="position-logo-ring"></div>',
        iconSize: [72, 72],
        iconAnchor: [36, 36]
      }) : null;

      function setDebugStage(message) {
        setLocalizedText(elStartDebug, () => t('ui.debugPrefix') + resolveText(message));
      }

      function setStartStatus(message) {
        setTextContent(elStartStatus, message);
      }

      function setMapUnavailableMessage(message) {
        setTextContent(elMapFallbackMsg, () => resolveText(message));
      }

      function setStartGpsHint(message) {
        setTextContent(elStartGpsHint, () => resolveText(message));
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
        setLocalizedText(elSpeedValue, () => String(kmh));
      }

      function updateClock() {
        var now = new Date();
        setLocalizedText(elTimeDisplay, () => now.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }));
      }

      function updateNetwork() {
        if (navigator.onLine) {
          setLocalizedText(elNetworkRow, () => t("ui.networkOnline"));
          elNetworkRow.className = 'info-row status-good';
        } else {
          setLocalizedText(elNetworkRow, () => t("ui.networkOffline"));
          elNetworkRow.className = 'info-row status-bad';
        }
      }

      function updateGpsEnvironmentHint() {
        if (!window.isSecureContext) {
          setStartGpsHint(() => t("ui.secureHint"));
          return;
        }

        if (!isGeolocationSupported(navigator)) {
          setStartGpsHint(() => t("ui.gpsUnsupported"));
          return;
        }

        if (!navigator.permissions || !navigator.permissions.query) {
          setStartGpsHint(() => t("ui.permissionPrompt"));
          return;
        }

        navigator.permissions.query({ name: 'geolocation' })
          .then(function (result) {
            var lines = [];

            if (result.state === 'denied') {
              lines.push(t("ui.permissionDeniedHint"));
            } else if (result.state === 'prompt') {
              lines.push(t("ui.permissionPrompt"));
            } else {
              lines.push(t("ui.permissionAllowed"));
            }

            if (!navigator.wakeLock || wakeLock && !wakeLock.released) {
              lines.push(t("ui.wakeUnsupported"));
            }

            if (!document.documentElement.requestFullscreen) {
              lines.push(t("ui.fullscreenUnsupported"));
            }

            setStartGpsHint(() => lines.join(' '));

            if (typeof result.onchange !== 'undefined') {
              result.onchange = updateGpsEnvironmentHint;
            }
          })
          .catch(function () {
            setStartGpsHint(() => t("ui.permissionPrompt"));
          });
      }

      var accountUid = getAccount()?.uid || null;
      var initialIdentityPending = !getAuthState().ready;
      var accountEpoch = 0;
      var cloudSync = null;
      var historyCursor = null, cloudHistoryMore = false, historyLoading = false;
      function accountStore(uid) { return createSessionStore({
        sessionStorageKey: sessionStorageKey,
        settingsStorageKey: settingsStorageKey,
        dbName: dbName,
        dbVersion: dbVersion,
        sessionsStoreName: sessionsStoreName,
        settingsStoreName: settingsStoreName,
        ownerUid: uid
      }); }
      var sessionStore = accountStore(accountUid);

      function sortSessionHistory() {
        sessionHistory.sort(function (a, b) {
          var aTime = (a && (a.updatedAt || a.startedAt)) || 0;
          var bTime = (b && (b.updatedAt || b.startedAt)) || 0;
          return bTime - aTime;
        });
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

      function getRouteColorForTheme(themeName) {
        return themeName === 'monochrome' ? '#ff3b30' : '#ffcc00';
      }

      function applyTheme(themeName) {
        var normalizedTheme = themeName || currentTheme;
        document.body.classList.remove.apply(document.body.classList, themeClasses);
        document.body.classList.add('theme-' + normalizedTheme);
        currentTheme = normalizedTheme;
        if (elThemeBtn) {
          setLocalizedText(elThemeBtn, () => t("ui.themePrefix") + themeLabel(themeClasses.indexOf('theme-' + normalizedTheme)));
        }

        if (map && typeof L !== 'undefined') {
          mapTileLayer = setMapThemeLayer({
            map: map,
            L: L,
            themeName: normalizedTheme,
            mapStatusEl: elMapStatus,
            tileLayer: mapTileLayer
          });
          updateRouteLayer();
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

        setLocalizedText(elMapStatus, () => t("ui.themePrefix") + resolveText(themeName));
        elMapStatus.style.display = '';

        themeToastTimer = window.setTimeout(function () {
          if (elMapStatus.textContent.indexOf(t("ui.themePrefix")) === 0) {
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

        setLocalizedText(elMapStatus, () => resolveText(message));
        elMapStatus.style.display = '';

        mapStatusTimer = window.setTimeout(function () {
          if (elMapStatus.textContent === resolveText(message)) {
            elMapStatus.style.display = 'none';
          }
          mapStatusTimer = null;
        }, durationMs || 1400);
      }

      function refreshMapViewportCoverage() {
        if (!map) {
          return;
        }

        map.invalidateSize({ pan: false, debounceMoveend: true });
        if (mapTileLayer && typeof mapTileLayer.redraw === 'function') {
          mapTileLayer.redraw();
        }
      }

      function scheduleMapViewportCoverageRefresh() {
        if (viewportRefreshTimer) {
          window.clearTimeout(viewportRefreshTimer);
        }

        viewportRefreshTimer = window.setTimeout(function () {
          viewportRefreshTimer = null;
          refreshMapViewportCoverage();
        }, 140);
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
        showThemeToast(() => themeLabel(currentIndex));
      }

      function applyMapRotationVisual(angleDeg) {
        if (!mapRotationSupported) {
          return;
        }

        renderedMapRotationDeg += shortestAngleDelta(normalizeAngle(renderedMapRotationDeg), angleDeg);
        if (elMap) {
          var visualScale = getRotationVisualScale(angleDeg);
          elMap.style.transform = 'rotate(' + renderedMapRotationDeg + 'deg) scale(' + visualScale + ')';
        }

        if (elCompassNeedle) {
          elCompassNeedle.style.transform = 'rotate(' + renderedMapRotationDeg + 'deg)';
        }
        if (elCompassOverlayNeedle) {
          elCompassOverlayNeedle.style.transform = 'rotate(' + renderedMapRotationDeg + 'deg)';
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
        setLocalizedText(elHeadingBtn, () => headingUpEnabled ? t("ui.headingUp") : t("ui.northUp"));
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
          showMapStatusMessage(() => t("ui.rotationUnsupported"), 1800);
        }
        updateHeadingButtonLabel();
        setMapDraggingForMode();
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

      function getReliableHeading(coords, lat, lon, validatedSpeedKmh, segmentBreak) {
        return getReliableHeadingCandidate({
          coords: coords,
          lat: lat,
          lon: lon,
          validatedSpeedKmh: validatedSpeedKmh,
          activeSessionLastAcceptedPoint: !segmentBreak && activeSession ? activeSession.lastAcceptedPoint : null,
          prevCoords: segmentBreak ? null : prevCoords,
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
        }, { passive: false });

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
        positionPipeline.reset();
        movementConfirmed = false;
        smoothedSpeed = 0;
        prevCoords = null;
        lastPositionAt = 0;
        lastReliableHeadingAt = 0;
      }

      function setSessionSummary(message) {
        setLocalizedText(elSessionSummary, () => resolveText(message));
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
        setLocalizedText(elSessionStatsToggleBtn, () => sessionStatsCollapsed ? t("ui.showStats") : t("ui.hideStats"));
        elSessionStatsToggleBtn.setAttribute('aria-pressed', String(!sessionStatsCollapsed));
      }

      function toggleSessionStatsCollapsed() {
        setSessionStatsCollapsed(!sessionStatsCollapsed);
      }

      function updateSessionStatsPanel(session) {
        if (!session || (!sessionActive && !sessionHistoryViewActive)) {
          setSessionStatsVisible(false);
          return;
        }

        setSessionStatsVisible(true);
        setLocalizedText(elStatDistance, () => formatDistanceKm(session.distanceMeters || 0) + ' km');
        setLocalizedText(elStatDuration, () => formatDuration(session.movingDurationMs || 0));
        setLocalizedText(elStatAverage, () => formatSpeedKmh(session.averageMovingSpeedKmh || 0) + ' km/h');
        setLocalizedText(elStatMax, () => formatSpeedKmh(session.maxSpeedKmh || 0) + ' km/h');
      }

      function getSessionLastLatLng(session) {
        return routeRecorder.getSessionLastLatLng(session);
      }

      async function loadSessionHistory() {
        const epoch = accountEpoch;
        const records = await sessionStore.loadSessions();
        if (epoch !== accountEpoch) return;
        sessionHistory = records.filter(record => record.syncAction !== 'delete');
        sortSessionHistory();
        recordingReady = true;
        elStartBtn.disabled = false;
      }

      function reportStorageError(error) {
        console.warn('Local storage failed', error);
        setTextContent(document.getElementById('storage-status'), () => t('ui.storageFailure'));
      }

      function renderHistory() {
        if (!sessionHistory.length) {
          elHistoryList.innerHTML = '<div>' + t('ui.noRides') + '</div>';
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
        clearExistingWatch();
        releaseWakeLockSafely();
        activeSession = structuredClone(session);
        updateSessionStatsPanel(activeSession);
        renderVehicle();
        applyHeadingModeSettings('lukittu', false);
        document.getElementById('history-detail').hidden = false;
        setTextContent(document.getElementById('history-detail-text'), () => formatCompletedSessionSummary(session, { formatDate, formatDuration, formatSpeedKmh }));
        document.getElementById('history-detail-actions').replaceChildren(
          button('rides.json',()=>exportRide(session.id,'json')),
          button('rides.gpx',()=>exportRide(session.id,'gpx')),
          button('rides.share',()=>exportRide(session.id,'gpx',true)));
        elFinishSessionBtn.style.display = 'none';
        elBackToStartBtn.style.display = 'inline-flex';
        elStartOverlay.style.display = 'none';
        elHistoryList.style.display = 'none';
        elHistoryActions.style.display = 'none';
        followUser = false;

        updateRouteLayer();

        var lastLatLng = getSessionLastLatLng(activeSession);
        if (map && lastLatLng) {
          const points = activeSession.routePoints.filter(p => !p.break).map(p => [p.latitude, p.longitude]);
          if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
          else map.setView(lastLatLng, 16);
        }

        setStartStatus(() => t("ui.viewRide"));
        setSessionSummary(() => formatCompletedSessionSummary(session, {
          formatDate: formatDate,
          formatDuration: formatDuration,
          formatSpeedKmh: formatSpeedKmh
        }));
      }

      function returnToStartView() {
        sessionHistoryViewActive = false;
        document.getElementById('history-detail').hidden = true;
        applyStoredHeadingMode();
        if (!sessionActive) {
          activeSession = null;
        }
        renderVehicle();
        setSessionStatsVisible(false);
        if (routeLayer && map && map.hasLayer(routeLayer)) {
          map.removeLayer(routeLayer);
          routeLayer = null;
        }
        elBackToStartBtn.style.display = 'none';
        elStartOverlay.style.display = 'flex';
        renderHistory();
        updateStartSummary();
        setStartStatus(() => t("ui.ready"));
      }

      function updateStartSummary() {
        var hasActive = sessionHistory.some(function (item) { return item.status === 'active'; });
        elResumeSessionBtn.style.display = hasActive ? 'inline-flex' : 'none';

        if (!sessionHistory.length) {
          setSessionSummary(() => t("ui.noRides"));
          updateHistoryActionsVisibility();
          return;
        }

        var latestCompleted = sessionHistory.find(function (item) { return item.status === 'completed'; }) || sessionHistory[0];
        setSessionSummary(() => formatLatestSessionSummary(latestCompleted, {
          formatDate: formatDate,
          formatDistanceKm: formatDistanceKm,
          formatDuration: formatDuration
        }));
        updateHistoryActionsVisibility();
      }

      function createSession() {
        const vehicle = selectedVehicle();
        return { ...createSessionRecord(currentTheme), vehicleId: vehicle?.id || null,
          vehicleSnapshot: vehicleSnapshot(vehicle), category: vehicle?.category || null, ownerUid: accountUid };
      }

      function renderVehicle() {
        const snapshot = (sessionActive || sessionHistoryViewActive) ? activeSession?.vehicleSnapshot : selectedVehicle();
        setLocalizedText(document.getElementById('dashboard-vehicle'), () => snapshot ? snapshot.nickname : t('garage.noVehicleShort'));
        setLocalizedText(document.getElementById('selected-vehicle'), () => t('garage.nextVehicle', { name: selectedVehicle()?.nickname || t('garage.noVehicleShort') }));
      }

      function updateRouteLayer() {
        routeLayer = routeRecorder.updateRouteLayer({
          map: map,
          leaflet: typeof L !== 'undefined' ? L : undefined,
          activeSession: activeSession,
          routeLayer: routeLayer,
          routeColor: getRouteColorForTheme(currentTheme)
        });
      }

      function cancelSessionSave() {
        if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
        sessionSaveTimer = null;
        pendingSessionSnapshot = null;
      }

      function commitSession(snapshot) {
        const store = sessionStore, epoch = accountEpoch;
        const index = sessionHistory.findIndex(item => item.id === snapshot.id);
        if (index >= 0) sessionHistory[index] = snapshot;
        else sessionHistory.unshift(snapshot);
        sortSessionHistory();
        renderHistory();
        updateStartSummary();
        return store.saveSession(snapshot).then(() => {
          if (epoch === accountEpoch) {
            setTextContent(document.getElementById('storage-status'), '');
            if (snapshot.syncAction) cloudSync?.retry();
          }
          return true;
        }).catch(error => { if (epoch === accountEpoch) reportStorageError(error); return false; });
      }
      async function removeRide(id) {
        const ride = sessionHistory.find(item => item.id === id);
        const store = sessionStore, sync = cloudSync;
        if (ride?.ownerUid && ride.status === 'completed') {
          await store.saveSession(queueRide({...ride,updatedAt:Date.now()},'delete'));
          sync?.retry();
        } else await store.deleteSession(id);
      }

      function persistActiveSession(force) {
        if (!activeSession || sessionHistoryViewActive || (!sessionActive && !force)) return Promise.resolve(false);
        activeSession.updatedAt = Date.now();
        activeSession.averageMovingSpeedKmh = computeAverageMovingSpeed(activeSession.distanceMeters, activeSession.movingDurationMs);
        updateSessionStatsPanel(activeSession);
        pendingSessionSnapshot = structuredClone(activeSession);
        if (force) {
          const snapshot = pendingSessionSnapshot;
          cancelSessionSave();
          return commitSession(snapshot);
        }
        if (!sessionSaveTimer) sessionSaveTimer = setTimeout(() => {
          const snapshot = pendingSessionSnapshot;
          cancelSessionSave();
          if (snapshot) commitSession(snapshot);
        }, 600);
        return Promise.resolve(true);
      }

      function addAcceptedPoint(lat, lon, accuracy, speedKmh, heading, timestamp, segmentBreak) {
        const result = routeRecorder.addAcceptedPoint({
          lat, lon, accuracy, speedKmh, heading, now: timestamp, segmentBreak,
          activeSession, sessionActive, map, leaflet: typeof L !== 'undefined' ? L : undefined,
          routeLayer, routeColor: getRouteColorForTheme(currentTheme), persistActiveSession
        });
        routeLayer = result.routeLayer;
        return result.pointAccepted;
      }

      function startNewSession() {
        sessionHistoryViewActive = false;
        setSessionStatsCollapsed(false);
        activeSession = createSession();
        hasAppliedInitialFollowZoom = false;
        resetMovementState();
        sessionActive = true;
        updateSessionStatsPanel(activeSession);
        renderVehicle();
        if (routeLayer && map && map.hasLayer(routeLayer)) {
          map.removeLayer(routeLayer);
          routeLayer = null;
        }
        elFinishSessionBtn.style.display = 'inline-flex';
        elBackToStartBtn.style.display = 'none';
        elHistoryList.style.display = 'none';
        setSessionSummary(() => t("ui.recordingLocal"));
        persistActiveSession(true);
      }

      function resumeSession(session) {
        if (!recordingReady || !session || session.status !== 'active') return;
        if (sessionActive) persistActiveSession(true);
        clearExistingWatch();
        activeSession = structuredClone(session);
        resetMovementState();
        hasAppliedInitialFollowZoom = false;
        followUser = true;
        sessionHistoryViewActive = false;
        document.getElementById('history-detail').hidden = true;
        setSessionStatsCollapsed(false);
        sessionActive = true;
        updateSessionStatsPanel(activeSession);
        renderVehicle();
        elFinishSessionBtn.style.display = 'inline-flex';
        elBackToStartBtn.style.display = 'none';
        elHistoryList.style.display = 'none';
        elStartOverlay.style.display = 'none';
        updateRouteLayer();
        setStartStatus(() => t('ui.restored'));
        if (!window.isSecureContext || !isGeolocationSupported(navigator)) {
          showLocationError(() => t('ui.resumeLocationError'));
          return;
        }
        try { startGpsTracking(); } catch (error) { showLocationError(() => t('ui.resumeTrackingError'), null, error); }
        requestWakeLockSafely();
      }

      function resumePreviousSession() {
        const latest = sessionHistory.find(item => item.status === 'active');
        if (latest) resumeSession(latest);
        else setSessionSummary(() => t('ui.noActive'));
      }

      async function finishSession() {
        if (!sessionActive || !activeSession) {
          return;
        }

        if (!window.confirm(t("ui.finishConfirm"))) {
          return;
        }

        var nameInput = window.prompt(t("ui.namePrompt"), activeSession.name || '');
        if (nameInput !== null) {
          activeSession.name = sanitizeSessionName(nameInput);
        }

        clearExistingWatch();
        resetMovementState();
        releaseWakeLockSafely();
        activeSession.status = 'completed';
        activeSession.endedAt = Date.now();
        activeSession.updatedAt = Date.now();
        sessionActive = false;
        if (accountUid) activeSession = queueRide(activeSession);
        const finished = activeSession, epoch = accountEpoch;
        const saved = await persistActiveSession(true);
        if (epoch !== accountEpoch) return;

        sessionActive = false;
        resetMovementState();
        sessionHistoryViewActive = false;
        setSessionStatsVisible(false);
        elFinishSessionBtn.style.display = 'none';
        elBackToStartBtn.style.display = 'none';
        elStartOverlay.style.display = 'flex';
        setStartStatus(() => t("ui.completed"));
        setSessionSummary(() => t(saved ? "ui.savedLocal" : "ui.storageFailure") + (finished.name ? ': ' + finished.name : '.') );
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
            setMapUnavailableMessage(() => t("ui.mapLibraryError"));
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
          mapTileLayer = mapInit.tileLayer;
          mapRotationSupported = !!(elMap && 'transform' in elMap.style);
          if (!mapRotationSupported) {
            headingUpEnabled = false;
          }

          if (!viewportListenersBound) {
            window.addEventListener('resize', scheduleMapViewportCoverageRefresh);
            window.addEventListener('orientationchange', scheduleMapViewportCoverageRefresh);
            document.addEventListener('visibilitychange', function () {
              if (document.visibilityState === 'visible') {
                scheduleMapViewportCoverageRefresh();
              }
            });
            viewportListenersBound = true;
          }

          scheduleMapViewportCoverageRefresh();
          applyTheme(currentTheme);
          applyHeadingModeSettings(headingUpEnabled ? 'menosuunta' : 'lukittu', false);
          setupManualTouchRotation();
        } catch (error) {
          mapUnavailable = true;
          map = null;
          mapPane = null;
          mapRotationSupported = false;
          console.warn(t("ui.mapError"), error);
          setMapUnavailableMessage(() => t("ui.mapError"));
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
          logoRingIcon: logoRingIcon,
          posMarker: posMarker,
          logoRingMarker: logoRingMarker,
          lat: lat,
          lon: lon,
          accuracy: accuracy,
          accuracyCircle: accuracyCircle
        });

        accuracyCircle = positionUpdate.accuracyCircle;
        posMarker = positionUpdate.posMarker;
        logoRingMarker = positionUpdate.logoRingMarker;

        if (followUser) {
          setFollowView(lat, lon);
        }

      }

      function releaseWakeLockSafely() {
        const sentinel = wakeLock;
        wakeLock = null;
        if (sentinel && !sentinel.released) sentinel.release().catch(error => console.warn('Wake Lock release failed', error));
      }

      function requestWakeLockSafely() {
        if (!navigator.wakeLock || wakeLock && !wakeLock.released) {
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
        setDebugStage(() => t("ui.positionReceived"));
        setStartStatus(() => t("ui.positionReceived"));
        resetStartButton(() => t("ui.newSession"));
      }

      function enterRunningUiPendingGps() {
        elGpsErrOverlay.style.display = 'none';
        elRetryBtn.style.display = 'none';
        elStartOverlay.style.display = 'none';
        elFinishSessionBtn.style.display = sessionActive ? 'inline-flex' : 'none';
        resetStartButton(() => t("ui.newSession"));
      }

      function setWeatherWaitingForGps() {
        setLocalizedText(elWeatherRow, () => t("ui.weatherWaiting"));
        setLocalizedText(elTemperatureRow, () => '— °C');
        setLocalizedText(elWindRow, () => '—');
      }

      function showLocationError(message, debugMessage, error) {
        isStartingGps = false;
        setStartStatus(() => resolveText(message));
        setDebugStage(() => resolveText(debugMessage || message));
        setGpsStatus(() => t("ui.gpsUnavailable"), 'status-bad');
        setLocalizedText(elGpsAccuracy, () => t("ui.accuracyUnavailable"));
        setWeatherWaitingForGps();
        setLocalizedText(elGpsErrMsg, () => resolveText(message));
        elGpsErrOverlay.style.display = 'flex';
        elStartOverlay.style.display = 'flex';
        elRetryBtn.style.display = '';
        resetStartButton(() => t("ui.retry"));
        if (error) {
          console.error(error);
        }
      }

      function getGpsErrorMessage(err) {
        return getGeolocationErrorMessage(err);
      }

      function showLocationFallback(message, debugMessage, error) {
        setStartStatus(() => resolveText(message));
        setDebugStage(() => resolveText(debugMessage || message));
        setGpsStatus(() => t("ui.locationRequest"), 'status-moderate');
        setLocalizedText(elGpsAccuracy, () => t("ui.accuracyPending"));
        setWeatherWaitingForGps();
        if (error) {
          console.warn(error);
        }
      }

      function updateGpsQuality(accuracy) {
        if (accuracy <= 20) {
          setGpsStatus(() => t("ui.gpsGood"), 'status-good');
        } else if (accuracy <= 50) {
          setGpsStatus(() => t("ui.gpsModerate"), 'status-moderate');
        } else {
          setGpsStatus(() => t("ui.gpsPoor"), 'status-bad');
        }
      }

      function handlePositionSuccess(pos) {
        if (watchId === null) return; // Ignore late callbacks after stop/end.
        const sample = positionPipeline.process(pos);
        if (!sample.accepted) {
          if (sample.reason === 'accuracy') updateGpsQuality(pos.coords?.accuracy || Infinity);
          return;
        }
        const coords = sample.coords;
        const lat = coords.latitude, lon = coords.longitude, accuracy = coords.accuracy;
        const now = sample.timestamp;
        prevCoords = sample.previousCoords;
        lastPositionAt = Date.now();
        setLocalizedText(elGpsAccuracy, () => t('ui.accuracyPrefix') + formatNumber(Math.round(accuracy), 0) + ' m');
        updateGpsQuality(accuracy);
        smoothedSpeed = smoothSpeed(smoothedSpeed, sample.validatedSpeedKmh);
        movementConfirmed = sample.moving;
        const heading = getReliableHeading(coords, lat, lon, sample.validatedSpeedKmh, sample.segmentBreak);
        updateMapRotation(heading, sample.moving && sample.validatedSpeedKmh >= HEADING_MIN_SPEED_KMH, now);
        if (sessionActive && activeSession?.status === 'active') {
          activeSession.movingDurationMs += sample.movingDeltaMs;
          if (sample.moving && sample.validatedSpeedKmh >= MOVING_SPEED_THRESHOLD_KMH) {
            addAcceptedPoint(lat, lon, accuracy, sample.validatedSpeedKmh, coords.heading, now, sample.segmentBreak);
          }
          persistActiveSession(false);
        }
        setSpeedDisplay(smoothedSpeed);
        lastGoodCoords = { lat, lon };
        prevCoords = { lat, lon, t: now };
        updateMapPosition(lat, lon, accuracy);
        if (lastWeatherFetch === 0 || Date.now() - lastWeatherFetch >= 15 * 60 * 1000) {
          lastWeatherFetch = Date.now();
          fetchAndRenderWeather(lat, lon, { isOnline: navigator.onLine, weatherRowEl: elWeatherRow,
            temperatureRowEl: elTemperatureRow, windRowEl: elWindRow, wmoCodes: WMO_CODES, fetchImpl: fetch })
            .then(success => { if (!success) lastWeatherFetch = Date.now() - 14 * 60 * 1000; });
        }
        if (!hasReceivedFirstPosition) finishGpsStartupSuccess();
        else { setDebugStage(() => t('ui.positionReceived')); setStartStatus(() => t('ui.positionReceived')); }
      }

      function handlePositionError(err) {
        if (watchId === null) return;
        positionPipeline.reset();
        var message = () => getGpsErrorMessage(err);
        var debugMessage = () => err && typeof err.code !== 'undefined' ? t("ui.gpsErrorPrefix") + err.code : t("ui.gpsError");

        if (err && err.code === 1) {
          setDebugStage(() => t("ui.permissionDenied"));
          showLocationError(message, () => t("ui.permissionDenied"), err);
        } else {
          setDebugStage(() => debugMessage);
          showLocationFallback(message, debugMessage, err);
        }

        console.error(t("ui.gpsError"), err);
      }

      function startGpsTracking(options) {
        var softRestart = !!(options && options.softRestart);
        clearExistingWatch();
        resetMovementState();
        if (!softRestart) {
          resetMovementState();
          hasReceivedFirstPosition = false;
          isStartingGps = true;
          setGpsStatus(() => t("ui.locationRequest"), 'status-moderate');
          setLocalizedText(elGpsAccuracy, () => t("ui.accuracyPending"));
          setStartStatus(() => t("ui.requestPermission"));
          setDebugStage(() => t("ui.requestPermissionDebug"));
        } else {
          isStartingGps = false;
          setDebugStage(() => t("ui.restoringGps"));
        }

        var options = {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        };

        watchId = startGeoWatch(navigator.geolocation, handlePositionSuccess, handlePositionError, options);
        setDebugStage(() => t("ui.trackingStarted"));


      }

      function startButtonHandler() {
        if (!recordingReady) return;
        // Guard: if an active session already exists, ask user to choose first
        if (sessionActive && activeSession) {
          if (!window.confirm(t("ui.newWhileActive"))) {
            resetStartButton(() => t("ui.newSession"));
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
        setLocalizedText(elStartBtn, () => t("ui.starting"));
        setStartStatus(() => t("ui.requestPermission"));
        setDebugStage(() => t("ui.startPressed"));
        elGpsErrOverlay.style.display = 'none';
        elRetryBtn.style.display = 'none';
        setGpsStatus(() => t("ui.locationRequest"), 'status-moderate');

        startNewSession();
        updateGpsEnvironmentHint();

        enterRunningUiPendingGps();

        if (!window.isSecureContext) {
          showLocationError(() => t("ui.secureError"), () => t("ui.notSecure"));
          return;
        }

        if (!isGeolocationSupported(navigator)) {
          showLocationError(() => t("ui.noLocation"), () => t("ui.noGps"));
          return;
        }

        try {
          startGpsTracking();
        } catch (error) {
          showLocationError(() => t("ui.trackingError"), () => t("ui.trackingStartDebug"), error);
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
            showLocationError(() => t("ui.retryTrackingError"), () => t("ui.retryTrackingDebug"), error);
            return;
          }
        }
        elStartOverlay.style.display = 'flex';
        startButtonHandler();
      }

      setLocalizedText(elStartVersion, () => t("ui.versionPrefix") + APP_VERSION);
      await loadSessionHistory();
      renderHistory();
      updateStartSummary();
      updateGpsEnvironmentHint();
      setStartStatus(() => t("ui.ready"));
      setDebugStage(() => t("ui.ready"));
      setSpeedDisplay(0);
      applyStoredTheme();
      updateClock();
      updateNetwork();
      window.addEventListener('online', function () { updateNetwork(); lastWeatherFetch = 0; });
      window.addEventListener('offline', updateNetwork);
      setInterval(updateClock, 500);

      if (typeof L === 'undefined') {
        mapUnavailable = true;
        setMapUnavailableMessage(() => t("ui.mapError"));
        console.warn('Leaflet ei latautunut. Kartta ei ole käytettävissä.');
      } else {
        initMap();
      }

      applyStoredHeadingMode();

      // Auto-resume: if there is exactly one active session, restore it automatically after reload
      function autoRestoreActiveSession() {
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

        resumeSession(session);
      }
      autoRestoreActiveSession();

      onLanguageChange(function () {
        renderHistory();
        updateGpsEnvironmentHint();
        renderVehicle();
      });
      onVehicleChange(renderVehicle);

      function prepareCloudSync() {
        const epoch = accountEpoch;
        cloudSync = accountUid ? createSessionSync({uid:accountUid,store:sessionStore,
          onChange(record,id) {
            if (epoch !== accountEpoch) return;
            const target = record?.id || id;
            sessionHistory = sessionHistory.filter(item => item.id !== target);
            if (record && record.syncAction !== 'delete') sessionHistory.push(record);
            sortSessionHistory(); renderHistory(); updateStartSummary();
          }, onStatus(key) { if (epoch === accountEpoch) setLocalizedText(document.getElementById('cloud-status'),()=>t(key)); }
        }) : null;
        setLocalizedText(document.getElementById('cloud-status'), () => t(accountUid ? 'rides.pending' : 'rides.guest'));
        cloudSync?.retry();
      }
      async function refreshCloudHistory(reset=true) {
        if (!accountUid || historyLoading) return false;
        const uid = accountUid, epoch = accountEpoch, store = sessionStore;
        historyLoading = true;
        setLocalizedText(document.getElementById('history-status'),()=>t('common.loading'));
        try {
          const page = await listCloudSessions(uid,reset?null:historyCursor);
          const deleted=await cloudDeletionIds(uid);
          if (epoch !== accountEpoch) return false;
          for(const local of await store.loadSessions()) {
            if(deleted.has(local.id) && !local.syncAction) await store.deleteSession(local.id);
          }
          for (const remote of page.records) {
            if (remote.ownerUid !== uid || deleted.has(remote.id)) continue;
            const local = (await store.loadSessions()).find(item=>item.id===remote.id);
            if (local?.syncAction) continue;
            const cached = localFromCloud(remote);
            if (local && local.routeLoaded !== false && (local.routeHash === remote.routeHash || local.remoteRevisionId === remote.revisionId)) {
              cached.routePoints = local.routePoints; cached.routeLoaded = true;
            }
            if (local) await store.updateSession(remote.id,latest=>latest.syncAction ? null : cached);
            else await store.saveSession(cached);
            if (epoch !== accountEpoch) return;
          }
          historyCursor=page.cursor; cloudHistoryMore=page.more;
          document.getElementById('history-more').hidden=!cloudHistoryMore;
          await loadSessionHistory();
          if (epoch !== accountEpoch) return;
          renderHistory(); updateStartSummary();
          setLocalizedText(document.getElementById('history-status'),()=>t('rides.historyLoaded'));
          return true;
        } catch(error) {if(epoch===accountEpoch) setLocalizedText(document.getElementById('history-status'),()=>t(dataErrorKey(error)));return false;}
        finally {if(epoch===accountEpoch) historyLoading=false;}
      }
      async function ensureRideRoute(ride) {
        if (ride.routeLoaded !== false) return ride;
        const uid=accountUid,epoch=accountEpoch,store=sessionStore;
        const full=await loadCloudRoute(uid,ride);
        if(epoch!==accountEpoch) return null;
        const cached=await store.updateSession(ride.id,latest=>latest.syncAction ? null : {...latest,routePoints:full.routePoints,routeLoaded:true});
        if(epoch!==accountEpoch || !cached) return null;
        const index=sessionHistory.findIndex(item=>item.id===ride.id);
        if(index>=0) sessionHistory[index]=cached;
        return cached;
      }
      async function exportRide(id,format,share=false) {
        const epoch=accountEpoch;
        try {
          let ride=sessionHistory.find(item=>item.id===id);
          if(!ride || ride.status!=='completed') return;
          ride=await ensureRideRoute(ride);
          if(!ride || epoch!==accountEpoch) return;
          const key=await shareOrDownload(sessionFile(ride,format),share);
          if(epoch===accountEpoch) setLocalizedText(document.getElementById('history-status'),()=>t(key));
        } catch(error) {if(epoch===accountEpoch) setLocalizedText(document.getElementById('history-status'),()=>t(dataErrorKey(error)));}
      }
      onAccountChange(async ({user,ready}) => {
        const uid = user?.uid || null;
        const restore = ready && initialIdentityPending;
        if (ready) initialIdentityPending = false;
        if (uid === accountUid) return;
        // Capture/flush to the previous store before changing identity; no reassignment.
        if (sessionActive) persistActiveSession(true);
        clearExistingWatch(); releaseWakeLockSafely(); resetMovementState(); cancelSessionSave();
        ++accountEpoch; accountUid = uid; recordingReady = false;
        historyCursor=null;cloudHistoryMore=false;historyLoading=false;
        document.getElementById('history-more').hidden=true;
        document.getElementById('history-status').textContent='';
        sessionActive = false; activeSession = null; sessionHistory = [];
        sessionStore = accountStore(uid); cloudSync = null;
        returnToStartView(); renderVehicle();
        elFinishSessionBtn.style.display = 'none';
        elGpsErrOverlay.style.display = 'none';
        lastGoodCoords = null; lastPositionAt = 0; hasReceivedFirstPosition = false;
        for (const layer of [posMarker,logoRingMarker,accuracyCircle]) if (layer && map?.hasLayer(layer)) map.removeLayer(layer);
        posMarker = null; logoRingMarker = null; accuracyCircle = null;
        if (map) map.setView([61.9241,25.7482],6);
        setLocalizedText(elGpsAccuracy, () => t('ui.accuracyInitial'));
        setSpeedDisplay(0); elStartBtn.disabled = true;
        const epoch = accountEpoch;
        try {
          await loadSessionHistory();
          if (epoch !== accountEpoch) return;
          renderHistory(); updateStartSummary(); prepareCloudSync();
          if (restore) autoRestoreActiveSession();
          refreshCloudHistory();
        } catch (error) { if (epoch === accountEpoch) reportStorageError(error); }
      });
      if (recordingReady) prepareCloudSync();
      if (accountUid) refreshCloudHistory();
      document.getElementById('cloud-retry').addEventListener('click',()=>cloudSync?.retry());
      window.addEventListener('online',()=>cloudSync?.retry());
      document.getElementById('history-refresh').addEventListener('click',()=>refreshCloudHistory());
      document.getElementById('history-more').addEventListener('click',()=>refreshCloudHistory(false));

      elCenterBtn.addEventListener('click', function () {
        followUser = true;
        if (map && lastGoodCoords) {
          setFollowView(lastGoodCoords.lat, lastGoodCoords.lon);
        }
      });

      elThemeBtn.addEventListener('click', function () {
        cycleTheme(1);
      });

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
      elClearHistoryBtn.addEventListener('click', async function () {
        if (sessionActive) { setSessionSummary(() => t('ui.finishBeforeDelete')); return; }
        if (!sessionHistory.length) {
          setSessionSummary(() => t("ui.nothingDelete"));
          return;
        }

        if (!window.confirm(t("ui.clearConfirm"))) {
          return;
        }

        if (!window.confirm(t("ui.clearFinalConfirm"))) {
          return;
        }

        cancelSessionSave();
        const epoch = accountEpoch;
        try {
          if (accountUid) {
            if (!await refreshCloudHistory()) return;
            while (cloudHistoryMore && epoch === accountEpoch) if (!await refreshCloudHistory(false)) return;
            if (epoch !== accountEpoch) return;
            for (const ride of [...sessionHistory]) {if(epoch!==accountEpoch) return;await removeRide(ride.id);}
          }
          else await sessionStore.clearSessions();
        } catch (error) { reportStorageError(error); return; }
        if (epoch !== accountEpoch) return;
        sessionHistory = [];
        if (!sessionActive) {
          activeSession = null;
          setSessionStatsVisible(false);
          if (routeLayer && map && map.hasLayer(routeLayer)) {
            map.removeLayer(routeLayer);
            routeLayer = null;
          }
        }

        renderHistory();
        updateStartSummary();
        setSessionSummary(() => t('ui.cleared'));
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

      elHistoryList.addEventListener('click', async function (event) {
        var button = event.target.closest('button[data-action]');
        if (!button) {
          return;
        }

        var action = button.getAttribute('data-action');
        var id = button.getAttribute('data-id');
        if (action==='use-cloud') {
          if(!window.confirm(t('rides.useCloudConfirm'))) return;
          const epoch=accountEpoch,uid=accountUid,store=sessionStore;
          const prior=sessionHistory.find(item=>item.id===id);
          if(!prior || prior.syncError!=='conflict') return;
          try {
            const remote=await getCloudSession(uid,id);
            const full=await loadCloudRoute(uid,localFromCloud(remote));
            if(epoch!==accountEpoch) return;
            await store.updateSession(id,latest=>latest.localRevision===prior.localRevision ? full : null);
            if(epoch!==accountEpoch) return;
            await loadSessionHistory();renderHistory();updateStartSummary();cloudSync?.retry();
          } catch(error) {if(epoch===accountEpoch) setLocalizedText(document.getElementById('history-status'),()=>t(dataErrorKey(error)));}
          return;
        }
        if (['json','gpx','share'].includes(action)) {await exportRide(id,action==='json'?'json':'gpx',action==='share');return;}
        if (action === 'delete') {
          if (sessionActive) { setSessionSummary(() => t('ui.finishBeforeDelete')); return; }
          if (!window.confirm(t("ui.deleteConfirm"))) {
            return;
          }

          cancelSessionSave();
          const epoch = accountEpoch;
          try { await removeRide(id); } catch (error) { reportStorageError(error); return; }
          if (epoch !== accountEpoch) return;
          sessionHistory = sessionHistory.filter(function (item) { return item.id !== id; });
          if (activeSession && activeSession.id === id && !sessionActive) {
            activeSession = null;
            setSessionStatsVisible(false);
            if (routeLayer && map && map.hasLayer(routeLayer)) {
              map.removeLayer(routeLayer);
              routeLayer = null;
            }
          }
          renderHistory();
          updateStartSummary();
          setSessionSummary(() => t('ui.deleted'));
          return;
        }

        if (action === 'open') {
          var completed = sessionHistory.find(function (item) { return item.id === id; });
          if (!completed || completed.status !== 'completed') {
            setSessionSummary(() => t("ui.missingCompleted"));
            return;
          }

          const epoch=accountEpoch;
          try {
            completed=await ensureRideRoute(completed);
            if(completed && epoch===accountEpoch) openCompletedSessionView(completed);
          } catch(error) {if(epoch===accountEpoch) setLocalizedText(document.getElementById('history-status'),()=>t(dataErrorKey(error)));}
          return;
        }

        if (action === 'rename') {
          var renameTarget = sessionHistory.find(function (item) { return item.id === id; });
          if (!renameTarget) {
            setSessionSummary(() => t("ui.missingSession"));
            return;
          }

          const epoch=accountEpoch;
          try {renameTarget=await ensureRideRoute(renameTarget);}
          catch(error) {setLocalizedText(document.getElementById('history-status'),()=>t(dataErrorKey(error)));return;}
          if(!renameTarget || epoch!==accountEpoch) return;

          var renamed = window.prompt(t("ui.renamePrompt"), renameTarget.name || '');
          if (renamed === null) {
            return;
          }

          renameTarget.name = sanitizeSessionName(renamed);
          renameTarget.updatedAt = Date.now();
          if (activeSession && activeSession.id === renameTarget.id) {
            activeSession.name = renameTarget.name;
            activeSession.updatedAt = renameTarget.updatedAt;
          }

          if (accountUid && renameTarget.status === 'completed') Object.assign(renameTarget,queueRide(renameTarget));
          await commitSession(renameTarget);
          renderHistory();
          updateStartSummary();
          setSessionSummary(() => t('ui.renamed'));
          return;
        }

        if (action !== 'resume') {
          return;
        }

        var selected = sessionHistory.find(function (item) { return item.id === id; });
        if (!selected || selected.status !== 'active') {
          setSessionSummary(() => t("ui.missingUnfinished"));
          return;
        }

        resumeSession(selected);
      });

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
          persistActiveSession(true);
          return;
        }

        if (document.visibilityState === 'visible') {
          if (sessionActive) requestWakeLockSafely();

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
      window.addEventListener('pagehide', () => persistActiveSession(true));
      document.body.dataset.ready = 'true';
    });
  })();

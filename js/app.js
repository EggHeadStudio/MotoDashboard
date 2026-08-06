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
import {
  normalizeAngle,
  shortestAngleDelta,
  bearingDegrees,
  formatDuration,
  formatDate,
  formatSpeedKmh,
  formatDistanceKm,
  haversine
} from './utils.js';

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

      var elSpeedBlock = document.getElementById('speed-block');
      var elSpeedValue = document.getElementById('speed-value');
      var elTimeDisplay = document.getElementById('time-display');
      var elWeatherRow = document.getElementById('weather-row');
      var elTemperatureRow = document.getElementById('temperature-row');
      var elWindRow = document.getElementById('wind-row');
      var elTimePanel = document.getElementById('time-panel');
      var elWeatherPanel = document.getElementById('weather-panel');
      var elTemperaturePanel = document.getElementById('temperature-panel');
      var elWindPanel = document.getElementById('wind-panel');
      var elGpsStatus = document.getElementById('gps-status-row');
      var elGpsAccuracy = document.getElementById('gps-accuracy-row');
      var elNetworkRow = document.getElementById('network-row');
      var elSessionStatsPanel = document.getElementById('session-stats-panel');
      var elStatDistance = document.getElementById('stat-distance');
      var elStatDuration = document.getElementById('stat-duration');
      var elStatAverage = document.getElementById('stat-average');
      var elStatMax = document.getElementById('stat-max');
      var elSessionStatsToggleBtn = document.getElementById('session-stats-toggle-btn');
      var elGpsPanel = document.getElementById('gps-panel');
      var elNetworkPanel = document.getElementById('network-panel');
      var elStatusStack = document.getElementById('status-stack');
      var elStatusTab = document.getElementById('status-tab');
      var elTopPanel = document.getElementById('top-panel');
      var elTopTab = document.getElementById('top-tab');
      var elStartOverlay = document.getElementById('start-overlay');
      var elStartBtn = document.getElementById('start-btn');
      var elResumeSessionBtn = document.getElementById('resume-session-btn');
      var elHistoryBtn = document.getElementById('history-btn');
      var elSessionSummary = document.getElementById('session-summary');
      var elHistoryList = document.getElementById('history-list');
      var elHistoryActions = document.getElementById('history-actions');
      var elClearHistoryBtn = document.getElementById('clear-history-btn');
      var elCenterBtn = document.getElementById('center-btn');
      var elThemeBtn = document.getElementById('theme-btn');
      var elFinishSessionBtn = document.getElementById('finish-session-btn');
      var elBackToStartBtn = document.getElementById('back-to-start-btn');
      var elRetryBtn = document.getElementById('retry-btn');
      var elGpsErrOverlay = document.getElementById('gps-error-overlay');
      var elGpsErrMsg = document.getElementById('gps-error-msg');
      var elRetryGpsBtn = document.getElementById('retry-gps-btn');
      var elStartStatus = document.getElementById('start-status');
      var elStartDebug = document.getElementById('start-debug');
      var elStartVersion = document.getElementById('start-version');
      var elMapFallbackMsg = document.getElementById('map-fallback-msg');
      var elStartGpsHint = document.getElementById('start-gps-hint');
      var elMapStatus = document.getElementById('map-status');
      var elSpeedDebug = document.getElementById('speed-debug');
      var elMap = document.getElementById('map');
      var elHeadingBtn = document.getElementById('heading-btn');
      var elCompassIndicator = document.getElementById('compass-indicator');
      var elCompassNeedle = document.getElementById('compass-needle');

      var requiredElements = [
        elSpeedBlock, elSpeedValue, elTimeDisplay, elWeatherRow, elTemperatureRow, elWindRow,
        elTimePanel, elWeatherPanel, elTemperaturePanel, elWindPanel, elGpsStatus,
        elSessionStatsPanel, elStatDistance, elStatDuration, elStatAverage, elStatMax, elSessionStatsToggleBtn,
        elGpsAccuracy, elNetworkRow, elGpsPanel, elNetworkPanel,
        elStatusStack, elStatusTab, elTopPanel, elTopTab, elStartOverlay, elStartBtn, elResumeSessionBtn,
        elHistoryBtn, elSessionSummary, elHistoryList, elHistoryActions, elClearHistoryBtn, elCenterBtn, elThemeBtn,
        elFinishSessionBtn, elBackToStartBtn, elRetryBtn, elGpsErrOverlay, elGpsErrMsg, elRetryGpsBtn,
        elStartStatus, elStartDebug, elStartVersion, elMapFallbackMsg, elStartGpsHint, elMap,
        elHeadingBtn, elCompassIndicator, elCompassNeedle
      ];

      if (requiredElements.some(function (element) { return !element; })) {
        console.error('Pakollisia DOM-elementtejä puuttuu. Sovellusta ei käynnistetä.');
        return;
      }

      if (document.querySelectorAll('#start-btn').length !== 1) {
        console.error('Aloita-painikkeen ID ei ole yksilöllinen.');
        return;
      }

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
      var lastReliableHeadingAt = 0;

      var movingSampleCount = 0;
      var stopSampleCount = 0;
      var movementConfirmed = false;
      var uiControlsHidden = false;

      var themeToastTimer = null;
      var mapStatusTimer = null;

      var themeNames = THEME_NAMES;
      var themeClasses = THEME_CLASSES;

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
        elStartStatus.textContent = message;
      }

      function setMapUnavailableMessage(message) {
        elMapFallbackMsg.textContent = message || '';
      }

      function setStartGpsHint(message) {
        elStartGpsHint.textContent = message || '';
      }

      function setGpsStatus(message, className) {
        elGpsStatus.textContent = message;
        elGpsStatus.className = 'info-row ' + (className || 'status-moderate');
      }

      function resetStartButton(label) {
        elStartBtn.disabled = false;
        elStartBtn.textContent = label;
      }

      function setStatusCollapsed(collapsed) {
        document.body.classList.toggle('status-collapsed', collapsed);
        elStatusTab.setAttribute('aria-expanded', String(!collapsed));
      }

      function setTopCollapsed(collapsed) {
        document.body.classList.toggle('top-collapsed', collapsed);
        elTopTab.setAttribute('aria-expanded', String(!collapsed));
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

        if (!('geolocation' in navigator)) {
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

      function supportsIndexedDb() {
        return typeof window.indexedDB !== 'undefined';
      }

      function createIdbPromise(request) {
        return new Promise(function (resolve, reject) {
          request.onsuccess = function () { resolve(request.result); };
          request.onerror = function () { reject(request.error || new Error('IndexedDB-pyyntö epäonnistui.')); };
        });
      }

      var openDbPromise = null;

      function openSessionDatabase() {
        if (!supportsIndexedDb()) {
          return Promise.resolve(null);
        }

        if (openDbPromise) {
          return openDbPromise;
        }

        openDbPromise = new Promise(function (resolve, reject) {
          var request;
          try {
            request = window.indexedDB.open(dbName, dbVersion);
          } catch (error) {
            reject(error);
            return;
          }

          request.onupgradeneeded = function () {
            var db = request.result;
            if (!db.objectStoreNames.contains(sessionsStoreName)) {
              db.createObjectStore(sessionsStoreName, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(settingsStoreName)) {
              db.createObjectStore(settingsStoreName, { keyPath: 'key' });
            }
          };

          request.onsuccess = function () {
            var db = request.result;
            db.onversionchange = function () {
              db.close();
            };
            resolve(db);
          };

          request.onblocked = function () {
            console.warn('IndexedDB on varattu toisessa välilehdessä.');
          };

          request.onerror = function () {
            reject(request.error || new Error('IndexedDB:n avaus epäonnistui.'));
          };
        }).catch(function (error) {
          openDbPromise = null;
          console.warn('IndexedDB ei ole käytettävissä, käytetään localStoragea.', error);
          return null;
        });

        return openDbPromise;
      }

      function sortSessionHistory() {
        sessionHistory.sort(function (a, b) {
          var aTime = (a && (a.updatedAt || a.startedAt)) || 0;
          var bTime = (b && (b.updatedAt || b.startedAt)) || 0;
          return bTime - aTime;
        });
      }

      function loadSessionHistoryFromLocalStorage() {
        try {
          var saved = localStorage.getItem(sessionStorageKey);
          if (!saved) {
            sessionHistory = [];
            return;
          }
          sessionHistory = JSON.parse(saved);
          if (!Array.isArray(sessionHistory)) {
            sessionHistory = [];
          }
        } catch (error) {
          sessionHistory = [];
          console.warn('Sessiohistorian lataus localStoragesta epäonnistui.', error);
        }
      }

      function saveSessionHistoryToLocalStorage() {
        try {
          localStorage.setItem(sessionStorageKey, JSON.stringify(sessionHistory));
        } catch (error) {
          console.warn('Sessiohistorian tallennus localStorageen epäonnistui.', error);
        }
      }

      function loadSessionsFromIndexedDb() {
        return openSessionDatabase().then(function (db) {
          if (!db) {
            return null;
          }

          return new Promise(function (resolve) {
            try {
              var tx = db.transaction(sessionsStoreName, 'readonly');
              var request = tx.objectStore(sessionsStoreName).getAll();
              request.onsuccess = function () {
                resolve(Array.isArray(request.result) ? request.result : []);
              };
              request.onerror = function () {
                console.warn('Sessiohistorian lataus IndexedDB:stä epäonnistui.', request.error);
                resolve(null);
              };
            } catch (error) {
              console.warn('Sessiohistorian lataus IndexedDB:stä epäonnistui.', error);
              resolve(null);
            }
          });
        });
      }

      function saveSessionsToIndexedDb() {
        return openSessionDatabase().then(function (db) {
          if (!db) {
            return;
          }

          return new Promise(function (resolve) {
            try {
              var tx = db.transaction(sessionsStoreName, 'readwrite');
              var store = tx.objectStore(sessionsStoreName);
              var keysRequest = store.getAllKeys();

              keysRequest.onsuccess = function () {
                var keepMap = Object.create(null);
                sessionHistory.forEach(function (item) {
                  if (!item || !item.id) {
                    return;
                  }
                  keepMap[item.id] = true;
                  store.put(item);
                });

                (keysRequest.result || []).forEach(function (id) {
                  if (!keepMap[id]) {
                    store.delete(id);
                  }
                });
              };

              keysRequest.onerror = function () {
                console.warn('Sessiohistorian avainhaku IndexedDB:stä epäonnistui.', keysRequest.error);
              };

              tx.oncomplete = function () { resolve(); };
              tx.onabort = function () {
                console.warn('Sessiohistorian tallennus IndexedDB:hen keskeytyi.', tx.error);
                resolve();
              };
              tx.onerror = function () {
                console.warn('Sessiohistorian tallennus IndexedDB:hen epäonnistui.', tx.error);
                resolve();
              };
            } catch (error) {
              console.warn('Sessiohistorian tallennus IndexedDB:hen epäonnistui.', error);
              resolve();
            }
          });
        });
      }

      function readSettingsFromLocalStorage() {
        try {
          var raw = localStorage.getItem(settingsStorageKey);
          if (!raw) {
            return {};
          }
          var parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
          return {};
        }
      }

      function readSettingFromLocalStorage(key) {
        return readSettingsFromLocalStorage()[key];
      }

      function writeSettingToLocalStorage(key, value) {
        try {
          var settings = readSettingsFromLocalStorage();
          settings[key] = value;
          localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
        } catch (error) {
          console.warn('Asetuksen tallennus localStorageen epäonnistui.', error);
        }
      }

      function loadSettingFromIndexedDb(key) {
        return openSessionDatabase().then(function (db) {
          if (!db) {
            return null;
          }
          return new Promise(function (resolve) {
            try {
              var tx = db.transaction(settingsStoreName, 'readonly');
              var request = tx.objectStore(settingsStoreName).get(key);
              request.onsuccess = function () {
                resolve(request.result ? request.result.value : null);
              };
              request.onerror = function () {
                console.warn('Asetuksen lataus IndexedDB:stä epäonnistui.', request.error);
                resolve(null);
              };
            } catch (error) {
              console.warn('Asetuksen lataus IndexedDB:stä epäonnistui.', error);
              resolve(null);
            }
          });
        });
      }

      function saveSettingToIndexedDb(key, value) {
        return openSessionDatabase().then(function (db) {
          if (!db) {
            return;
          }

          return new Promise(function (resolve) {
            try {
              var tx = db.transaction(settingsStoreName, 'readwrite');
              tx.objectStore(settingsStoreName).put({ key: key, value: value, updatedAt: Date.now() });
              tx.oncomplete = function () { resolve(); };
              tx.onabort = function () {
                console.warn('Asetuksen tallennus IndexedDB:hen keskeytyi.', tx.error);
                resolve();
              };
              tx.onerror = function () {
                console.warn('Asetuksen tallennus IndexedDB:hen epäonnistui.', tx.error);
                resolve();
              };
            } catch (error) {
              console.warn('Asetuksen tallennus IndexedDB:hen epäonnistui.', error);
              resolve();
            }
          });
        });
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
        if (!mapPane || !mapRotationSupported) {
          return;
        }

        mapPane.style.rotate = angleDeg + 'deg';
        if (elCompassNeedle) {
          elCompassNeedle.style.transform = 'rotate(' + angleDeg + 'deg)';
        }
      }

      function updateHeadingButtonLabel() {
        elHeadingBtn.textContent = headingUpEnabled ? 'Suunta: menosuunta' : 'Suunta: pohjoinen';
      }

      function persistHeadingMode() {
        var mode = headingUpEnabled ? 'heading-up' : 'north-up';
        writeSettingToLocalStorage('mapHeadingMode', mode);
        saveSettingToIndexedDb('mapHeadingMode', mode);
      }

      function applyHeadingModeSettings(mode, persist) {
        var requestedHeadingUp = mode === 'heading-up';
        headingUpEnabled = requestedHeadingUp;
        if (requestedHeadingUp && !mapRotationSupported) {
          headingUpEnabled = false;
          showMapStatusMessage('Suuntaustila ei ole tuettu tässä selaimessa', 1800);
        }
        updateHeadingButtonLabel();

        if (elCompassIndicator) {
          elCompassIndicator.style.display = headingUpEnabled ? 'inline-flex' : 'none';
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
        if (localMode === 'heading-up' || localMode === 'north-up') {
          applyHeadingModeSettings(localMode, false);
        } else {
          applyHeadingModeSettings('north-up', false);
        }

        loadSettingFromIndexedDb('mapHeadingMode').then(function (idbMode) {
          if (idbMode !== 'heading-up' && idbMode !== 'north-up') {
            return;
          }
          if (idbMode === (headingUpEnabled ? 'heading-up' : 'north-up')) {
            return;
          }
          applyHeadingModeSettings(idbMode, false);
        });
      }

      function getReliableHeading(coords, lat, lon, validatedSpeedKmh) {
        if (coords
          && typeof coords.heading === 'number'
          && isFinite(coords.heading)
          && validatedSpeedKmh !== null
          && validatedSpeedKmh >= HEADING_MIN_SPEED_KMH
          && coords.accuracy <= MOVING_ACCURACY_MAX_M) {
          return normalizeAngle(coords.heading);
        }

        if (activeSession && activeSession.lastAcceptedPoint) {
          var point = activeSession.lastAcceptedPoint;
          var d = haversine(point.latitude, point.longitude, lat, lon);
          if (d >= HEADING_MIN_DISTANCE_M) {
            return bearingDegrees(point.latitude, point.longitude, lat, lon);
          }
        }

        if (prevCoords) {
          var fallbackDistance = haversine(prevCoords.lat, prevCoords.lon, lat, lon);
          if (fallbackDistance >= HEADING_MIN_DISTANCE_M) {
            return bearingDegrees(prevCoords.lat, prevCoords.lon, lat, lon);
          }
        }

        return null;
      }

      function updateMapRotation(headingCandidate, movingConfident, now) {
        if (!headingUpEnabled || !mapRotationSupported) {
          return;
        }

        var targetHeading = currentHeadingDeg;
        if (headingCandidate !== null && movingConfident) {
          targetHeading = headingCandidate;
          lastReliableHeadingAt = now;
        } else if (lastReliableHeadingAt > 0 && (now - lastReliableHeadingAt) >= NORTH_UP_DELAY_MS) {
          targetHeading = 0;
        }

        var delta = shortestAngleDelta(currentHeadingDeg, targetHeading);
        if (Math.abs(delta) < 0.35) {
          currentHeadingDeg = normalizeAngle(targetHeading);
        } else {
          currentHeadingDeg = normalizeAngle(currentHeadingDeg + delta * ROTATION_SMOOTHING);
        }

        applyMapRotationVisual(-currentHeadingDeg);
      }

      function resetMovementState() {
        movingSampleCount = 0;
        stopSampleCount = 0;
        movementConfirmed = false;
        lastReliableHeadingAt = 0;
      }

      function updateMovementState(validatedSpeedKmh, accuracy) {
        var movingCandidate = validatedSpeedKmh !== null
          && validatedSpeedKmh >= MOVING_SPEED_THRESHOLD_KMH
          && accuracy <= MOVING_ACCURACY_MAX_M;
        var stopCandidate = validatedSpeedKmh === null
          || validatedSpeedKmh <= STOP_SPEED_THRESHOLD_KMH
          || accuracy > MOVING_ACCURACY_MAX_M;

        if (movingCandidate) {
          movingSampleCount += 1;
          stopSampleCount = 0;
          if (!movementConfirmed && movingSampleCount >= MIN_MOVING_CONFIRMATION_SAMPLES) {
            movementConfirmed = true;
            if (activeSession && activeSession.lastAcceptedPoint) {
              activeSession.stopAnchorPending = true;
            }
          }
          return;
        }

        movingSampleCount = 0;
        if (stopCandidate) {
          stopSampleCount += 1;
          if (movementConfirmed && stopSampleCount >= MIN_STOP_CONFIRMATION_SAMPLES) {
            movementConfirmed = false;
          }
        } else {
          stopSampleCount = 0;
        }
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
        if (!session || !Array.isArray(session.routePoints)) {
          return null;
        }

        for (var i = session.routePoints.length - 1; i >= 0; i -= 1) {
          var point = session.routePoints[i];
          if (point && typeof point.latitude === 'number' && typeof point.longitude === 'number') {
            return [point.latitude, point.longitude];
          }
        }

        return null;
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

        elHistoryList.innerHTML = sessionHistory.map(function (session) {
          var km = Math.round((session.distanceMeters || 0) / 100) / 10;
          var state = session.status === 'active' ? 'Kesken' : 'Valmis';
          var avg = formatSpeedKmh(session.averageMovingSpeedKmh);
          var max = formatSpeedKmh(session.maxSpeedKmh);
          var resumeBtn = session.status === 'active'
            ? '<button data-action="resume" data-id="' + session.id + '">Jatka</button>'
            : '';
          var openBtn = session.status === 'completed'
            ? '<button data-action="open" data-id="' + session.id + '">Avaa</button>'
            : '';
          return '<div class="session-item">'
            + '<div><strong>' + formatDate(session.startedAt) + '</strong><br><small>'
            + km + ' km · ' + formatDuration(session.movingDurationMs || 0) + ' · ka ' + avg + ' km/h · max ' + max + ' km/h · ' + state + '</small></div>'
            + '<div>' + openBtn + resumeBtn + '<button class="delete" data-action="delete" data-id="' + session.id + '">Poista</button></div>'
            + '</div>';
        }).join('');

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
        setSessionSummary('Katselu: ' + formatDate(session.startedAt)
          + ' · ' + (Math.round((session.distanceMeters || 0) / 100) / 10) + ' km'
          + ' · ' + formatDuration(session.movingDurationMs || 0)
          + ' · ka ' + formatSpeedKmh(session.averageMovingSpeedKmh) + ' km/h'
          + ' · max ' + formatSpeedKmh(session.maxSpeedKmh) + ' km/h');
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
        var km = formatDistanceKm(latestCompleted.distanceMeters || 0);
        setSessionSummary('Viimeisin ajo: ' + formatDate(latestCompleted.startedAt) + ' · ' + km + ' km · ' + formatDuration(latestCompleted.movingDurationMs || 0));
        updateHistoryActionsVisibility();
      }

      function createSession() {
        return {
          id: 'ride-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          status: 'active',
          startedAt: Date.now(),
          endedAt: null,
          updatedAt: Date.now(),
          distanceMeters: 0,
          movingDurationMs: 0,
          maxSpeedKmh: 0,
          averageMovingSpeedKmh: 0,
          routePoints: [],
          lastAcceptedPoint: null,
          stopAnchorPending: false,
          resumeAnchorPending: false,
          mapTheme: currentTheme
        };
      }

      function updateRouteLayer() {
        if (!map || typeof L === 'undefined') {
          return;
        }

        if (!activeSession || !activeSession.routePoints || activeSession.routePoints.length < 2) {
          if (routeLayer && map.hasLayer(routeLayer)) {
            map.removeLayer(routeLayer);
            routeLayer = null;
          }
          return;
        }

        var segments = [];
        var currentSegment = [];
        activeSession.routePoints.forEach(function (point) {
          if (point && point.break) {
            if (currentSegment.length > 1) {
              segments.push(currentSegment);
            }
            currentSegment = [];
            return;
          }

          if (point && typeof point.latitude === 'number' && typeof point.longitude === 'number') {
            currentSegment.push([point.latitude, point.longitude]);
          }
        });

        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }

        if (!segments.length) {
          if (routeLayer && map.hasLayer(routeLayer)) {
            map.removeLayer(routeLayer);
            routeLayer = null;
          }
          return;
        }

        var latLngs = segments.length === 1 ? segments[0] : segments;

        if (!routeLayer) {
          routeLayer = L.polyline(latLngs, {
            color: '#ffcc00',
            weight: 5,
            opacity: 0.9
          }).addTo(map);
          return;
        }

        routeLayer.setLatLngs(latLngs);
      }

      function persistActiveSession(force) {
        if (!activeSession || !sessionActive) {
          return;
        }

        activeSession.updatedAt = Date.now();
        activeSession.averageMovingSpeedKmh = activeSession.movingDurationMs > 0 && activeSession.distanceMeters > 0
          ? Math.round((activeSession.distanceMeters / 1000) / (activeSession.movingDurationMs / 3600000) * 10) / 10
          : 0;

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
        if (!activeSession || !sessionActive) {
          return;
        }

        var point = {
          latitude: lat,
          longitude: lon,
          timestamp: Date.now(),
          accuracy: accuracy,
          speedKmh: speedKmh || 0,
          heading: heading || 0
        };

        var lastPoint = activeSession.lastAcceptedPoint;
        if (!lastPoint) {
          activeSession.routePoints.push(point);
          activeSession.lastAcceptedPoint = point;
          activeSession.resumeAnchorPending = false;
          updateRouteLayer();
          persistActiveSession(false);
          return;
        }

        if (activeSession.resumeAnchorPending) {
          var gapMs = point.timestamp - (lastPoint.timestamp || point.timestamp);
          var gapDistance = haversine(lastPoint.latitude, lastPoint.longitude, lat, lon);

          if (gapMs >= RESUME_ANCHOR_GAP_MS || gapDistance >= RESUME_ANCHOR_DISTANCE_M) {
            activeSession.routePoints.push({ break: true, timestamp: point.timestamp });
            activeSession.routePoints.push(point);
            activeSession.lastAcceptedPoint = point;
            activeSession.resumeAnchorPending = false;
            updateRouteLayer();
            persistActiveSession(false);
            return;
          }

          activeSession.resumeAnchorPending = false;
        }

        if (activeSession.stopAnchorPending) {
          var stopGapMs = point.timestamp - (lastPoint.timestamp || point.timestamp);
          var stopGapDistance = haversine(lastPoint.latitude, lastPoint.longitude, lat, lon);
          if (stopGapMs >= STOP_GAP_BREAK_MS || stopGapDistance >= STOP_GAP_BREAK_DISTANCE_M) {
            activeSession.routePoints.push({ break: true, timestamp: point.timestamp });
          }
          activeSession.stopAnchorPending = false;
        }

        var distance = haversine(lastPoint.latitude, lastPoint.longitude, lat, lon);
        if (distance < MIN_ACCEPTED_POINT_DISTANCE_M || distance > MAX_POINT_JUMP_DISTANCE_M) {
          return;
        }

        var dtSeconds = (point.timestamp - (lastPoint.timestamp || point.timestamp)) / 1000;
        if (dtSeconds > 0) {
          var jumpSpeedKmh = (distance / dtSeconds) * 3.6;
          if (!isFinite(jumpSpeedKmh) || jumpSpeedKmh > MAX_POINT_JUMP_SPEED_KMH) {
            return;
          }
        }

        if (speedKmh < MOVING_SPEED_THRESHOLD_KMH) {
          return;
        }

        activeSession.distanceMeters += distance;
        activeSession.routePoints.push(point);
        activeSession.lastAcceptedPoint = point;
        activeSession.maxSpeedKmh = Math.max(activeSession.maxSpeedKmh, speedKmh || 0);

        updateRouteLayer();
        persistActiveSession(false);
      }

      function startNewSession() {
        sessionHistoryViewActive = false;
        setSessionStatsCollapsed(false);
        activeSession = createSession();
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

        if (!window.isSecureContext || !('geolocation' in navigator)) {
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
        setSessionSummary('Sessio tallennettu paikallisesti.');
        updateStartSummary();
      }

      function toggleHistoryList() {
        var visible = elHistoryList.style.display === 'block';
        elHistoryList.style.display = visible ? 'none' : 'block';
        if (!visible) {
          renderHistory();
        }
      }

      function wmoToFinnish(code) {
        return WMO_CODES[code] || 'Sää ei saatavilla';
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
          map = L.map('map', {
            zoomControl: false,
            attributionControl: true,
            dragging: true,
            touchZoom: true,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false
          }).setView([61.9241, 25.7482], 6);

          var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
            maxZoom: 19,
            crossOrigin: true
          }).addTo(map);

          tileLayer.on('load', function () {
            if (elMapStatus) { elMapStatus.style.display = 'none'; }
          });
          tileLayer.on('tileerror', function () {
            if (elMapStatus) {
              elMapStatus.textContent = 'Karttatiiliä ei voitu ladata';
              elMapStatus.style.display = '';
            }
          });

          map.on('dragstart', function () {
            followUser = false;
          });

          window.setTimeout(function () {
            map.invalidateSize();
          }, 250);

          mapPane = map.getPanes ? map.getPanes().mapPane : null;
          mapRotationSupported = !!(mapPane && 'rotate' in mapPane.style);
          if (!mapRotationSupported) {
            headingUpEnabled = false;
          }
          applyHeadingModeSettings(headingUpEnabled ? 'heading-up' : 'north-up', false);
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
        if (!map) {
          return;
        }

        var zoom = map.getZoom() < 14 ? 16 : map.getZoom();
        var latLng = typeof L !== 'undefined' ? L.latLng(lat, lon) : [lat, lon];

        if (!headingUpEnabled || !mapRotationSupported) {
          map.setView(latLng, zoom);
          return;
        }

        var distanceAheadM = 70;
        var headingRad = currentHeadingDeg * Math.PI / 180;
        var dLat = (distanceAheadM * Math.cos(headingRad)) / 111111;
        var cosLat = Math.cos(lat * Math.PI / 180);
        var dLon = cosLat !== 0 ? (distanceAheadM * Math.sin(headingRad)) / (111111 * cosLat) : 0;
        map.setView([lat + dLat, lon + dLon], zoom);
      }

      function updateMapPosition(lat, lon, accuracy) {
        if (!map || typeof L === 'undefined' || !dotIcon) {
          return;
        }

        var latlng = [lat, lon];
        if (!posMarker) {
          posMarker = L.marker(latlng, { icon: dotIcon, interactive: false }).addTo(map);
        } else {
          posMarker.setLatLng(latlng);
        }

        if (!accCircle) {
          accCircle = L.circle(latlng, {
            radius: accuracy,
            className: 'accuracy-circle',
            interactive: false
          }).addTo(map);
        } else {
          accCircle.setLatLng(latlng);
          accCircle.setRadius(accuracy);
        }

        if (followUser) {
          setFollowView(lat, lon);
        }

        map.invalidateSize();
      }

      function fetchWeather(lat, lon) {
        if (!navigator.onLine) {
          elWeatherRow.textContent = 'Sää ei saatavilla';
          elTemperatureRow.textContent = '— °C';
          elWindRow.textContent = '—';
          return;
        }

        lastWeatherFetch = Date.now();
        var url = 'https://api.open-meteo.com/v1/forecast'
          + '?latitude=' + lat.toFixed(4)
          + '&longitude=' + lon.toFixed(4)
          + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
          + '&temperature_unit=celsius'
          + '&wind_speed_unit=kmh'
          + '&timezone=auto';

        fetch(url)
          .then(function (response) { return response.json(); })
          .then(function (data) {
            if (data && data.current) {
              var cur = data.current;
              var temp = Math.round(cur.temperature_2m);
              var wind = Math.round(cur.wind_speed_10m);
              var desc = wmoToFinnish(cur.weather_code);
              elWeatherRow.textContent = desc;
              elTemperatureRow.textContent = temp + ' °C';
              elWindRow.textContent = wind + ' km/h';
            } else {
              elWeatherRow.textContent = 'Sää ei saatavilla';
              elTemperatureRow.textContent = '— °C';
              elWindRow.textContent = '—';
            }
          })
          .catch(function () {
            elWeatherRow.textContent = 'Sää ei saatavilla';
            elTemperatureRow.textContent = '— °C';
            elWindRow.textContent = '—';
          });
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
        if (watchId !== null && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(watchId);
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
        if (err && err.code === 1) {
          return 'Sijaintilupa evättiin. Salli selaimelle sijainti ja lataa sivu uudelleen.';
        }
        if (err && err.code === 2) {
          return 'Sijaintia ei saatu. Siirry ulos avoimelle paikalle ja yritä uudelleen.';
        }
        if (err && err.code === 3) {
          return 'Sijainnin haku aikakatkaistiin. Yritä uudelleen.';
        }
        return 'GPS-seurannan käynnistäminen epäonnistui.';
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
        var speedKmh = null;
        var validatedSpeedKmh = null;
        var fallbackKmh = null;
        var rawGpsKmh = null;
        var dt = 0;

        elGpsAccuracy.textContent = 'Tarkkuus: ' + Math.round(accuracy) + ' m';
        updateGpsQuality(accuracy);

        if (typeof coords.speed === 'number' && isFinite(coords.speed) && coords.speed >= 0) {
          rawGpsKmh = coords.speed * 3.6;
          if (rawGpsKmh <= MAX_VALID_SPEED_KMH) {
            speedKmh = rawGpsKmh;
          }
        }

        if (accuracy <= 50 && prevCoords) {
          dt = (now - prevCoords.t) / 1000;
          if (dt >= 1) {
            var dist = haversine(prevCoords.lat, prevCoords.lon, lat, lon);
            var calcKmh = (dist / dt) * 3.6;
            if (isFinite(calcKmh) && calcKmh <= MAX_FALLBACK_SPEED_KMH) {
              fallbackKmh = calcKmh;
              if (speedKmh === null) {
                speedKmh = fallbackKmh;
              }
            }
          }
        }

        if (speedKmh !== null && isFinite(speedKmh) && speedKmh <= MAX_VALID_SPEED_KMH) {
          validatedSpeedKmh = speedKmh;
        }

        if (validatedSpeedKmh !== null) {
          smoothedSpeed = 0.4 * validatedSpeedKmh + 0.6 * smoothedSpeed;
        } else {
          smoothedSpeed = smoothedSpeed * 0.85;
        }

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

        var movingForHeading = sessionActive && activeSession
          ? movementConfirmed
          : (validatedSpeedKmh !== null && validatedSpeedKmh >= MOVING_SPEED_THRESHOLD_KMH && accuracy <= MOVING_ACCURACY_MAX_M);
        var headingCandidate = getReliableHeading(coords, lat, lon, validatedSpeedKmh);
        updateMapRotation(headingCandidate, movingForHeading, now);

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
          fetchWeather(lat, lon);
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

      function startGpsTracking() {
        clearExistingWatch();
        resetMovementState();
        hasReceivedFirstPosition = false;
        isStartingGps = true;
        setGpsStatus('Pyydetään sijaintia…', 'status-moderate');
        elGpsAccuracy.textContent = 'Tarkkuus: haetaan…';
        setStartStatus('Pyydetään sijaintilupaa…');
        setDebugStage('Pyydetään sijaintilupaa');

        var options = {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        };

        watchId = navigator.geolocation.watchPosition(handlePositionSuccess, handlePositionError, options);
        setDebugStage('GPS-seuranta käynnistetty');

        navigator.geolocation.getCurrentPosition(function (pos) {
          handlePositionSuccess(pos);
        }, function (err) {
          handlePositionError(err);
        }, options);
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

        if (!('geolocation' in navigator)) {
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
        if ('geolocation' in navigator) {
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

        if (!window.isSecureContext || !('geolocation' in navigator)) {
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

      elHeadingBtn.addEventListener('click', function () {
        var nextMode = headingUpEnabled ? 'north-up' : 'heading-up';
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

        if (!window.isSecureContext || !('geolocation' in navigator)) {
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

        if (document.visibilityState === 'visible' && watchId !== null) {
          requestWakeLockSafely();
        }
      });
    });
  })();

export function getDomRefs(doc) {
  var documentRef = doc || document;

  var refs = {
    elSpeedBlock: documentRef.getElementById('speed-block'),
    elSpeedValue: documentRef.getElementById('speed-value'),
    elTimeDisplay: documentRef.getElementById('time-display'),
    elWeatherRow: documentRef.getElementById('weather-row'),
    elTemperatureRow: documentRef.getElementById('temperature-row'),
    elWindRow: documentRef.getElementById('wind-row'),
    elTimePanel: documentRef.getElementById('time-panel'),
    elWeatherPanel: documentRef.getElementById('weather-panel'),
    elTemperaturePanel: documentRef.getElementById('temperature-panel'),
    elWindPanel: documentRef.getElementById('wind-panel'),
    elGpsStatus: documentRef.getElementById('gps-status-row'),
    elGpsAccuracy: documentRef.getElementById('gps-accuracy-row'),
    elNetworkRow: documentRef.getElementById('network-row'),
    elSessionStatsPanel: documentRef.getElementById('session-stats-panel'),
    elStatDistance: documentRef.getElementById('stat-distance'),
    elStatDuration: documentRef.getElementById('stat-duration'),
    elStatAverage: documentRef.getElementById('stat-average'),
    elStatMax: documentRef.getElementById('stat-max'),
    elSessionStatsToggleBtn: documentRef.getElementById('session-stats-toggle-btn'),
    elGpsPanel: documentRef.getElementById('gps-panel'),
    elNetworkPanel: documentRef.getElementById('network-panel'),
    elStatusStack: documentRef.getElementById('status-stack'),
    elStatusTab: documentRef.getElementById('status-tab'),
    elTopPanel: documentRef.getElementById('top-panel'),
    elTopTab: documentRef.getElementById('top-tab'),
    elStartOverlay: documentRef.getElementById('start-overlay'),
    elStartBtn: documentRef.getElementById('start-btn'),
    elResumeSessionBtn: documentRef.getElementById('resume-session-btn'),
    elHistoryBtn: documentRef.getElementById('history-btn'),
    elSessionSummary: documentRef.getElementById('session-summary'),
    elHistoryList: documentRef.getElementById('history-list'),
    elHistoryActions: documentRef.getElementById('history-actions'),
    elClearHistoryBtn: documentRef.getElementById('clear-history-btn'),
    elCenterBtn: documentRef.getElementById('center-btn'),
    elThemeBtn: documentRef.getElementById('theme-btn'),
    elFinishSessionBtn: documentRef.getElementById('finish-session-btn'),
    elBackToStartBtn: documentRef.getElementById('back-to-start-btn'),
    elRetryBtn: documentRef.getElementById('retry-btn'),
    elGpsErrOverlay: documentRef.getElementById('gps-error-overlay'),
    elGpsErrMsg: documentRef.getElementById('gps-error-msg'),
    elRetryGpsBtn: documentRef.getElementById('retry-gps-btn'),
    elStartStatus: documentRef.getElementById('start-status'),
    elStartDebug: documentRef.getElementById('start-debug'),
    elStartVersion: documentRef.getElementById('start-version'),
    elMapFallbackMsg: documentRef.getElementById('map-fallback-msg'),
    elStartGpsHint: documentRef.getElementById('start-gps-hint'),
    elMapStatus: documentRef.getElementById('map-status'),
    elSpeedDebug: documentRef.getElementById('speed-debug'),
    elMap: documentRef.getElementById('map'),
    elHeadingBtn: documentRef.getElementById('heading-btn'),
    elCompassIndicator: documentRef.getElementById('compass-indicator'),
    elCompassNeedle: documentRef.getElementById('compass-needle')
  };

  var missing = Object.keys(refs).filter(function (key) {
    return !refs[key];
  });

  if (missing.length > 0) {
    throw new Error('Pakollisia DOM-elementteja puuttuu: ' + missing.join(', '));
  }

  if (documentRef.querySelectorAll('#start-btn').length !== 1) {
    throw new Error('Aloita-painikkeen ID ei ole yksiloellinen.');
  }

  return refs;
}

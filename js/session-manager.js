function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeSessionName(value) {
  if (value === null || value === undefined) {
    return null;
  }

  var cleaned = String(value).trim();
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 64);
}

export function createSessionRecord(currentTheme, nowValue, randomValue) {
  var now = typeof nowValue === 'number' && isFinite(nowValue) ? nowValue : Date.now();
  var random = typeof randomValue === 'number' && isFinite(randomValue)
    ? randomValue
    : Math.floor(Math.random() * 10000);

  return {
    id: 'ride-' + now + '-' + random,
    name: null,
    status: 'active',
    startedAt: now,
    endedAt: null,
    updatedAt: now,
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

export function computeAverageMovingSpeed(distanceMeters, movingDurationMs) {
  if (!(movingDurationMs > 0) || !(distanceMeters > 0)) {
    return 0;
  }

  return Math.round((distanceMeters / 1000) / (movingDurationMs / 3600000) * 10) / 10;
}

export function getSessionDisplayName(session, formatDate) {
  if (session && typeof session.name === 'string') {
    var trimmed = session.name.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return 'Ajo ' + formatDate(session.startedAt);
}

export function buildSessionHistoryHtml(sessionHistory, deps) {
  var formatDate = deps.formatDate;
  var formatDuration = deps.formatDuration;
  var formatSpeedKmh = deps.formatSpeedKmh;

  return sessionHistory.map(function (session) {
    var km = Math.round((session.distanceMeters || 0) / 100) / 10;
    var state = session.status === 'active' ? 'Kesken' : 'Valmis';
    var avg = formatSpeedKmh(session.averageMovingSpeedKmh);
    var max = formatSpeedKmh(session.maxSpeedKmh);
    var pointCount = Array.isArray(session.routePoints) ? session.routePoints.length : 0;
    var endedText = session.endedAt ? formatDate(session.endedAt) : '—';
    var sessionName = escapeHtml(getSessionDisplayName(session, formatDate));
    var resumeBtn = session.status === 'active'
      ? '<button data-action="resume" data-id="' + session.id + '">Jatka</button>'
      : '';
    var openBtn = session.status === 'completed'
      ? '<button data-action="open" data-id="' + session.id + '">Avaa</button>'
      : '';
    var renameBtn = '<button data-action="rename" data-id="' + session.id + '">Nimeä</button>';

    return '<div class="session-item">'
      + '<div><strong>' + sessionName + '</strong><br><small>'
      + 'Aloitus: ' + formatDate(session.startedAt) + ' · Lopetus: ' + endedText + '<br>'
      + km + ' km · ' + formatDuration(session.movingDurationMs || 0) + ' · ka ' + avg + ' km/h · max ' + max + ' km/h · pisteet ' + pointCount + ' · ' + state + '</small></div>'
      + '<div>' + openBtn + resumeBtn + renameBtn + '<button class="delete" data-action="delete" data-id="' + session.id + '">Poista</button></div>'
      + '</div>';
  }).join('');
}

export function formatLatestSessionSummary(session, deps) {
  var formatDate = deps.formatDate;
  var formatDistanceKm = deps.formatDistanceKm;
  var formatDuration = deps.formatDuration;

  var latestName = getSessionDisplayName(session, formatDate);
  var km = formatDistanceKm(session.distanceMeters || 0);

  return 'Viimeisin ajo: ' + latestName + ' · ' + km + ' km · ' + formatDuration(session.movingDurationMs || 0);
}

export function formatCompletedSessionSummary(session, deps) {
  var formatDate = deps.formatDate;
  var formatDuration = deps.formatDuration;
  var formatSpeedKmh = deps.formatSpeedKmh;

  var sessionName = getSessionDisplayName(session, formatDate);
  var pointCount = Array.isArray(session.routePoints) ? session.routePoints.length : 0;

  return 'Katselu: ' + sessionName + ' · ' + formatDate(session.startedAt)
    + ' · ' + (Math.round((session.distanceMeters || 0) / 100) / 10) + ' km'
    + ' · ' + formatDuration(session.movingDurationMs || 0)
    + ' · ka ' + formatSpeedKmh(session.averageMovingSpeedKmh) + ' km/h'
    + ' · max ' + formatSpeedKmh(session.maxSpeedKmh) + ' km/h'
    + ' · pisteet ' + pointCount;
}

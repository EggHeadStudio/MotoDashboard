import { t } from './i18n/i18n.js';
import { formatDistanceKm } from './utils.js';
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
    id: globalThis.crypto?.randomUUID?.() || 'ride-' + now + '-' + random,
    schemaVersion: 2,
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
  return session?.name?.trim() || t('ui.ridePrefix') + formatDate(session.startedAt);
}

export function buildSessionHistoryHtml(sessionHistory, deps) {
  return sessionHistory.map(session => {
    const id = escapeHtml(session.id);
    const button = (action, key) => '<button data-action="' + action + '" data-id="' + id + '">' + t(key) + '</button>';
    const state = t(session.status === 'active' ? 'ui.active' : 'ui.completeState');
    return '<div class="session-item"><div><strong>' + escapeHtml(getSessionDisplayName(session, deps.formatDate)) + '</strong><br><small>'
      + t('ui.startPrefix') + deps.formatDate(session.startedAt) + ' / ' + t('ui.endPrefix') + (session.endedAt ? deps.formatDate(session.endedAt) : '-') + '<br>'
      + formatDistanceKm(session.distanceMeters || 0) + ' km / ' + deps.formatDuration(session.movingDurationMs || 0)
      + ' / ' + t('ui.avgLabel') + ' ' + deps.formatSpeedKmh(session.averageMovingSpeedKmh) + ' km/h / ' + t('ui.maxLabel') + ' ' + deps.formatSpeedKmh(session.maxSpeedKmh) + ' km/h / '
      + t('ui.points') + ' ' + (session.routePoints?.length || 0) + ' / ' + state + '</small></div><div>'
      + (session.status === 'active' ? button('resume', 'ui.resumeShort') : button('open', 'ui.open'))
      + button('rename', 'ui.rename') + button('delete', 'ui.delete') + '</div></div>';
  }).join('');
}

export function formatLatestSessionSummary(session, deps) {
  return t('ui.latestPrefix') + getSessionDisplayName(session, deps.formatDate) + ' / ' + deps.formatDistanceKm(session.distanceMeters || 0) + ' km / ' + deps.formatDuration(session.movingDurationMs || 0);
}

export function formatCompletedSessionSummary(session, deps) {
  return t('ui.viewPrefix') + getSessionDisplayName(session, deps.formatDate) + ' / ' + deps.formatDate(session.startedAt)
    + ' / ' + formatDistanceKm(session.distanceMeters || 0) + ' km / ' + deps.formatDuration(session.movingDurationMs || 0)
    + ' / ' + t('ui.avgLabel') + ' ' + deps.formatSpeedKmh(session.averageMovingSpeedKmh) + ' km/h / '
    + t('ui.maxLabel') + ' ' + deps.formatSpeedKmh(session.maxSpeedKmh) + ' km/h';
}

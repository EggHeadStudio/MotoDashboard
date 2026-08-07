import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSessionName,
  createSessionRecord,
  computeAverageMovingSpeed,
  buildSessionHistoryHtml,
  formatLatestSessionSummary,
  formatCompletedSessionSummary
} from '../js/session-manager.js';
import { formatDuration, formatSpeedKmh } from '../js/utils.js';

test('sanitizeSessionName trims, limits and supports empty as null', () => {
  assert.equal(sanitizeSessionName('  ilta-ajo  '), 'ilta-ajo');
  assert.equal(sanitizeSessionName('   '), null);
  assert.equal(sanitizeSessionName('x'.repeat(70)).length, 64);
});

test('createSessionRecord creates deterministic id with provided inputs', () => {
  var session = createSessionRecord('night', 1234567890, 42);
  assert.equal(session.id, 'ride-1234567890-42');
  assert.equal(session.mapTheme, 'night');
  assert.equal(session.status, 'active');
});

test('computeAverageMovingSpeed returns zero for invalid runtime', () => {
  assert.equal(computeAverageMovingSpeed(1000, 0), 0);
  assert.equal(computeAverageMovingSpeed(0, 1000), 0);
});

test('buildSessionHistoryHtml includes rename action and details', () => {
  var html = buildSessionHistoryHtml([
    {
      id: 'ride-1',
      name: 'Testiajo',
      status: 'completed',
      startedAt: 1,
      endedAt: 2,
      distanceMeters: 2500,
      movingDurationMs: 65000,
      averageMovingSpeedKmh: 40.2,
      maxSpeedKmh: 75.1,
      routePoints: [{}, {}]
    }
  ], {
    formatDate: function (value) { return 'd' + value; },
    formatDuration: formatDuration,
    formatSpeedKmh: formatSpeedKmh
  });

  assert.ok(html.includes('Nimeä'));
  assert.ok(html.includes('pisteet 2'));
  assert.ok(html.includes('Testiajo'));
});

test('summary formatters include name and key metrics', () => {
  var session = {
    name: 'Aamuajo',
    startedAt: 100,
    distanceMeters: 12000,
    movingDurationMs: 3600000,
    averageMovingSpeedKmh: 12,
    maxSpeedKmh: 48,
    routePoints: [{}, {}, {}]
  };

  var latest = formatLatestSessionSummary(session, {
    formatDate: function () { return 'date'; },
    formatDistanceKm: function () { return '12.0'; },
    formatDuration: function () { return '01:00:00'; }
  });
  assert.ok(latest.includes('Aamuajo'));

  var completed = formatCompletedSessionSummary(session, {
    formatDate: function () { return 'date'; },
    formatDuration: function () { return '01:00:00'; },
    formatSpeedKmh: function (value) { return String(value); }
  });
  assert.ok(completed.includes('Aamuajo'));
  assert.ok(completed.includes('pisteet 3'));
});

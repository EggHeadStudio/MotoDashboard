import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRotationVisualScale,
  computeRotationAwarePanDelta,
  parseVisualRotationAngle,
  getReliableHeadingCandidate,
  computeUpdatedHeading
} from '../js/map-rotation.js';
import { normalizeAngle, shortestAngleDelta, haversine, bearingDegrees } from '../js/utils.js';

test('computeRotationVisualScale returns 1 when rotation is disabled', () => {
  var scale = computeRotationVisualScale({
    headingUpEnabled: false,
    mapRotationSupported: true,
    angleDeg: 45,
    width: 1400,
    height: 900
  });
  assert.equal(scale, 1);
});

test('computeRotationVisualScale overfills viewport for rotated map', () => {
  var scale = computeRotationVisualScale({
    headingUpEnabled: true,
    mapRotationSupported: true,
    angleDeg: 45,
    width: 1400,
    height: 900
  });
  assert.ok(scale > 1.2);
});

test('computeRotationAwarePanDelta uses rotation matrix and scale', () => {
  var delta = computeRotationAwarePanDelta({
    dx: 10,
    dy: 0,
    angleDeg: 0,
    scale: 1
  });
  assert.equal(delta[0], -10);
  assert.ok(Math.abs(delta[1]) < 1e-9);
});

test('computeRotationAwarePanDelta undoes a rotated visual frame', () => {
  var delta = computeRotationAwarePanDelta({
    dx: 10,
    dy: 0,
    angleDeg: 45,
    scale: 1
  });

  assert.ok(Math.abs(delta[0] + 10 / Math.sqrt(2)) < 1e-9);
  assert.ok(Math.abs(delta[1] + 10 / Math.sqrt(2)) < 1e-9);
});

test('parseVisualRotationAngle prefers compass transform', () => {
  var angle = parseVisualRotationAngle({
    transformValue: 'rotate(-30deg)',
    renderedMapRotationDeg: 0,
    currentHeadingDeg: 0,
    normalizeAngle: normalizeAngle
  });
  assert.equal(angle, 330);
});

test('getReliableHeadingCandidate uses gps heading when reliable', () => {
  var heading = getReliableHeadingCandidate({
    coords: { heading: 140, accuracy: 10 },
    lat: 60,
    lon: 25,
    validatedSpeedKmh: 30,
    activeSessionLastAcceptedPoint: null,
    prevCoords: null,
    headingMinSpeedKmh: 4,
    movingAccuracyMaxM: 55,
    headingMinDistanceM: 6,
    haversine: haversine,
    bearingDegrees: bearingDegrees,
    normalizeAngle: normalizeAngle
  });
  assert.equal(heading, 140);
});

test('computeUpdatedHeading smoothly converges toward target', () => {
  var result = computeUpdatedHeading({
    headingUpEnabled: true,
    mapRotationSupported: true,
    headingCandidate: 90,
    movingConfident: true,
    now: 1000,
    currentHeadingDeg: 0,
    lastReliableHeadingAt: 0,
    northUpDelayMs: 12000,
    rotationSmoothing: 0.26,
    shortestAngleDelta: shortestAngleDelta,
    normalizeAngle: normalizeAngle
  });

  assert.equal(result.shouldApply, true);
  assert.ok(result.currentHeadingDeg > 20 && result.currentHeadingDeg < 30);
  assert.equal(result.lastReliableHeadingAt, 1000);
});

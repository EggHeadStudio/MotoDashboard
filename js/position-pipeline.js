import { evaluateSpeedSample, createMovementTracker } from './speed.js';
import { haversine } from './utils.js';
import {
  MOVING_SPEED_THRESHOLD_KMH, STOP_SPEED_THRESHOLD_KMH, MOVING_ACCURACY_MAX_M,
  MIN_MOVING_CONFIRMATION_SAMPLES, MIN_STOP_CONFIRMATION_SAMPLES,
  MAX_VALID_SPEED_KMH, MAX_FALLBACK_SPEED_KMH, MAX_POINT_JUMP_DISTANCE_M
} from './config.js';

export const MAX_SAMPLE_GAP_MS = 15000;

// One pipeline per GPS watch lifecycle. No Firebase, DOM or wall-clock accumulation.
export function createPositionPipeline() {
  const tracker = createMovementTracker({
    movingSpeedThresholdKmh: MOVING_SPEED_THRESHOLD_KMH,
    stopSpeedThresholdKmh: STOP_SPEED_THRESHOLD_KMH,
    movingAccuracyMaxM: MOVING_ACCURACY_MAX_M,
    minMovingConfirmationSamples: MIN_MOVING_CONFIRMATION_SAMPLES,
    minStopConfirmationSamples: MIN_STOP_CONFIRMATION_SAMPLES
  });
  let previous = null;
  let lastSeenTimestamp = 0;
  let needsAnchor = true;

  function reset() {
    previous = null;
    tracker.reset();
    needsAnchor = true;
    // Retain dedup watermark across soft restarts; an old cached fix cannot replay.
  }

  function process(position, now = Date.now()) {
    const c = position?.coords;
    const timestamp = position?.timestamp;
    if (!c || !Number.isFinite(timestamp) || timestamp <= lastSeenTimestamp
        || timestamp > now + 5000 || now - timestamp > 30000) {
      return { accepted: false, reason: 'timestamp' };
    }
    lastSeenTimestamp = timestamp;
    if (!Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90
        || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180
        || !Number.isFinite(c.accuracy) || c.accuracy < 0 || c.accuracy > MOVING_ACCURACY_MAX_M) {
      reset();
      return { accepted: false, reason: 'accuracy' };
    }
    if (Number.isFinite(c.speed) && (c.speed < 0 || c.speed * 3.6 > MAX_VALID_SPEED_KMH)) {
      tracker.reset(); needsAnchor = true;
      return { accepted: false, reason: 'speed' };
    }
    const old = previous;
    const elapsed = old ? timestamp - old.t : 0;
    const gap = elapsed > MAX_SAMPLE_GAP_MS;
    const distance = old ? haversine(old.lat, old.lon, c.latitude, c.longitude) : 0;
    if (old && !gap && (distance > MAX_POINT_JUMP_DISTANCE_M
        || distance / (elapsed / 1000) * 3.6 > MAX_VALID_SPEED_KMH)) {
      tracker.reset(); needsAnchor = true;
      return { accepted: false, reason: 'jump' };
    }
    if (gap) { tracker.reset(); needsAnchor = true; }
    const speed = evaluateSpeedSample({
      coords: c, prevCoords: gap ? null : old, now: timestamp,
      maxValidSpeedKmh: MAX_VALID_SPEED_KMH, maxFallbackSpeedKmh: MAX_FALLBACK_SPEED_KMH,
      haversine
    });
    // Identical positions with a noisy nonzero speed cannot create movement or a peak.
    const motionSpeed = old && !gap && distance < 0.5 ? 0 : speed.validatedSpeedKmh;
    const confirmed = tracker.update(motionSpeed, c.accuracy);
    const moving = confirmed && motionSpeed !== null && motionSpeed >= STOP_SPEED_THRESHOLD_KMH;
    if (!moving) needsAnchor = true;
    const segmentBreak = moving && needsAnchor;
    const movingDeltaMs = moving && old?.moving && !gap && !segmentBreak ? elapsed : 0;
    if (moving) needsAnchor = false;
    previous = { lat: c.latitude, lon: c.longitude, t: timestamp, moving, accuracy: c.accuracy };
    return {
      accepted: true, coords: c, timestamp, moving, segmentBreak, movingDeltaMs,
      validatedSpeedKmh: motionSpeed, rawGpsKmh: speed.rawGpsKmh,
      fallbackKmh: speed.fallbackKmh, dtSeconds: gap ? 0 : elapsed / 1000,
      previousCoords: !gap ? old : null
    };
  }
  return { reset, process };
}

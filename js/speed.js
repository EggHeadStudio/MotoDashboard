export function evaluateSpeedSample(input) {
  var coords = input.coords;
  var prevCoords = input.prevCoords;
  var now = input.now;
  var maxValidSpeedKmh = input.maxValidSpeedKmh;
  var maxFallbackSpeedKmh = input.maxFallbackSpeedKmh;

  var speedKmh = null;
  var validatedSpeedKmh = null;
  var fallbackKmh = null;
  var rawGpsKmh = null;
  var dtSeconds = 0;

  if (typeof coords.speed === 'number' && isFinite(coords.speed) && coords.speed >= 0) {
    rawGpsKmh = coords.speed * 3.6;
    if (rawGpsKmh <= maxValidSpeedKmh) {
      speedKmh = rawGpsKmh;
    }
  }

  if (coords.accuracy <= 50 && prevCoords) {
    dtSeconds = (now - prevCoords.t) / 1000;
    if (dtSeconds >= 1) {
      var dist = input.haversine(prevCoords.lat, prevCoords.lon, coords.latitude, coords.longitude);
      var calcKmh = (dist / dtSeconds) * 3.6;
      if (isFinite(calcKmh) && calcKmh <= maxFallbackSpeedKmh) {
        fallbackKmh = calcKmh;
        if (speedKmh === null) {
          speedKmh = fallbackKmh;
        }
      }
    }
  }

  if (speedKmh !== null && isFinite(speedKmh) && speedKmh <= maxValidSpeedKmh) {
    validatedSpeedKmh = speedKmh;
  }

  return {
    validatedSpeedKmh: validatedSpeedKmh,
    rawGpsKmh: rawGpsKmh,
    fallbackKmh: fallbackKmh,
    dtSeconds: dtSeconds
  };
}

export function smoothSpeed(previousSmoothedSpeed, validatedSpeedKmh) {
  if (validatedSpeedKmh !== null) {
    return 0.4 * validatedSpeedKmh + 0.6 * previousSmoothedSpeed;
  }
  return previousSmoothedSpeed * 0.85;
}

export function createMovementTracker(config) {
  var movingSpeedThresholdKmh = config.movingSpeedThresholdKmh;
  var stopSpeedThresholdKmh = config.stopSpeedThresholdKmh;
  var movingAccuracyMaxM = config.movingAccuracyMaxM;
  var minMovingConfirmationSamples = config.minMovingConfirmationSamples;
  var minStopConfirmationSamples = config.minStopConfirmationSamples;

  var movingSampleCount = 0;
  var stopSampleCount = 0;
  var movementConfirmed = false;

  function reset() {
    movingSampleCount = 0;
    stopSampleCount = 0;
    movementConfirmed = false;
  }

  function update(validatedSpeedKmh, accuracy, activeSession) {
    var movingCandidate = validatedSpeedKmh !== null
      && validatedSpeedKmh >= movingSpeedThresholdKmh
      && accuracy <= movingAccuracyMaxM;
    var stopCandidate = validatedSpeedKmh === null
      || validatedSpeedKmh <= stopSpeedThresholdKmh
      || accuracy > movingAccuracyMaxM;

    if (movingCandidate) {
      movingSampleCount += 1;
      stopSampleCount = 0;
      if (!movementConfirmed && movingSampleCount >= minMovingConfirmationSamples) {
        movementConfirmed = true;
        if (activeSession && activeSession.lastAcceptedPoint) {
          activeSession.stopAnchorPending = true;
        }
      }
      return movementConfirmed;
    }

    movingSampleCount = 0;
    if (stopCandidate) {
      stopSampleCount += 1;
      if (movementConfirmed && stopSampleCount >= minStopConfirmationSamples) {
        movementConfirmed = false;
      }
    } else {
      stopSampleCount = 0;
    }

    return movementConfirmed;
  }

  function isMovingConfirmed() {
    return movementConfirmed;
  }

  return {
    reset: reset,
    update: update,
    isMovingConfirmed: isMovingConfirmed
  };
}

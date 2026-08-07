export function computeRotationVisualScale(input) {
  var headingUpEnabled = !!input.headingUpEnabled;
  var mapRotationSupported = !!input.mapRotationSupported;
  var angleDeg = Number(input.angleDeg);
  var width = Number(input.width);
  var height = Number(input.height);

  if (!headingUpEnabled || !mapRotationSupported) {
    return 1;
  }

  if (!isFinite(angleDeg) || !isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
    return 1.48;
  }

  var ratioWH = width / height;
  var ratioHW = height / width;
  var radians = Math.abs(angleDeg) * Math.PI / 180;
  var cosA = Math.abs(Math.cos(radians));
  var sinA = Math.abs(Math.sin(radians));

  return Math.max(cosA + ratioWH * sinA, cosA + ratioHW * sinA, 1);
}

export function computeRotationAwarePanDelta(input) {
  var dx = Number(input.dx);
  var dy = Number(input.dy);
  var angleDeg = Number(input.angleDeg);
  var scale = Number(input.scale);

  if (!isFinite(dx) || !isFinite(dy) || !isFinite(angleDeg)) {
    return [0, 0];
  }

  var safeScale = isFinite(scale) && scale > 0 ? scale : 1;
  var angleRad = angleDeg * Math.PI / 180;
  var cosA = Math.cos(angleRad);
  var sinA = Math.sin(angleRad);

  return [
    (-cosA * dx - sinA * dy) / safeScale,
    (-sinA * dx + cosA * dy) / safeScale
  ];
}

export function parseVisualRotationAngle(input) {
  var transformValue = input.transformValue;
  var renderedMapRotationDeg = Number(input.renderedMapRotationDeg);
  var currentHeadingDeg = Number(input.currentHeadingDeg);
  var normalizeAngle = input.normalizeAngle;

  if (typeof transformValue === 'string') {
    var match = transformValue.match(/rotate\((-?[0-9.]+)deg\)/);
    if (match && match[1]) {
      var parsed = parseFloat(match[1]);
      if (isFinite(parsed)) {
        return normalizeAngle(parsed);
      }
    }
  }

  if (isFinite(renderedMapRotationDeg)) {
    return normalizeAngle(renderedMapRotationDeg);
  }

  return normalizeAngle(currentHeadingDeg);
}

export function getReliableHeadingCandidate(input) {
  var coords = input.coords;
  var lat = Number(input.lat);
  var lon = Number(input.lon);
  var validatedSpeedKmh = input.validatedSpeedKmh;
  var activeSessionLastAcceptedPoint = input.activeSessionLastAcceptedPoint;
  var prevCoords = input.prevCoords;
  var headingMinSpeedKmh = Number(input.headingMinSpeedKmh);
  var movingAccuracyMaxM = Number(input.movingAccuracyMaxM);
  var headingMinDistanceM = Number(input.headingMinDistanceM);
  var haversine = input.haversine;
  var bearingDegrees = input.bearingDegrees;
  var normalizeAngle = input.normalizeAngle;

  if (coords
    && typeof coords.heading === 'number'
    && isFinite(coords.heading)
    && validatedSpeedKmh !== null
    && validatedSpeedKmh >= headingMinSpeedKmh
    && coords.accuracy <= movingAccuracyMaxM) {
    return normalizeAngle(coords.heading);
  }

  if (activeSessionLastAcceptedPoint) {
    var sessionPoint = activeSessionLastAcceptedPoint;
    var dSession = haversine(sessionPoint.latitude, sessionPoint.longitude, lat, lon);
    if (dSession >= headingMinDistanceM) {
      return bearingDegrees(sessionPoint.latitude, sessionPoint.longitude, lat, lon);
    }
  }

  if (prevCoords) {
    var dPrev = haversine(prevCoords.lat, prevCoords.lon, lat, lon);
    if (dPrev >= headingMinDistanceM) {
      return bearingDegrees(prevCoords.lat, prevCoords.lon, lat, lon);
    }
  }

  return null;
}

export function computeUpdatedHeading(input) {
  var headingUpEnabled = !!input.headingUpEnabled;
  var mapRotationSupported = !!input.mapRotationSupported;
  var headingCandidate = input.headingCandidate;
  var movingConfident = !!input.movingConfident;
  var now = Number(input.now);
  var currentHeadingDeg = Number(input.currentHeadingDeg);
  var lastReliableHeadingAt = Number(input.lastReliableHeadingAt);
  var northUpDelayMs = Number(input.northUpDelayMs);
  var rotationSmoothing = Number(input.rotationSmoothing);
  var shortestAngleDelta = input.shortestAngleDelta;
  var normalizeAngle = input.normalizeAngle;

  if (!headingUpEnabled || !mapRotationSupported) {
    return {
      shouldApply: false,
      currentHeadingDeg: currentHeadingDeg,
      lastReliableHeadingAt: lastReliableHeadingAt
    };
  }

  var targetHeading = currentHeadingDeg;
  var nextLastReliableHeadingAt = lastReliableHeadingAt;

  if (headingCandidate !== null && movingConfident) {
    targetHeading = headingCandidate;
    nextLastReliableHeadingAt = now;
  } else if (nextLastReliableHeadingAt > 0 && (now - nextLastReliableHeadingAt) >= northUpDelayMs) {
    targetHeading = 0;
  }

  var delta = shortestAngleDelta(currentHeadingDeg, targetHeading);
  var nextHeading;
  if (Math.abs(delta) < 0.35) {
    nextHeading = normalizeAngle(targetHeading);
  } else {
    nextHeading = normalizeAngle(currentHeadingDeg + delta * rotationSmoothing);
  }

  return {
    shouldApply: true,
    currentHeadingDeg: nextHeading,
    lastReliableHeadingAt: nextLastReliableHeadingAt
  };
}

export function createRouteRecorder(config) {
  var haversine = config.haversine;
  var resumeAnchorGapMs = config.resumeAnchorGapMs;
  var resumeAnchorDistanceM = config.resumeAnchorDistanceM;
  var stopGapBreakMs = config.stopGapBreakMs;
  var stopGapBreakDistanceM = config.stopGapBreakDistanceM;
  var minAcceptedPointDistanceM = config.minAcceptedPointDistanceM;
  var maxPointJumpDistanceM = config.maxPointJumpDistanceM;
  var maxPointJumpSpeedKmh = config.maxPointJumpSpeedKmh;
  var movingSpeedThresholdKmh = config.movingSpeedThresholdKmh;

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

  function updateRouteLayer(input) {
    var map = input.map;
    var leaflet = input.leaflet;
    var activeSession = input.activeSession;
    var routeLayer = input.routeLayer;
    var routeColor = input.routeColor || '#ffcc00';

    if (!map || typeof leaflet === 'undefined') {
      return routeLayer;
    }

    if (!activeSession || !activeSession.routePoints || activeSession.routePoints.length < 2) {
      if (routeLayer && map.hasLayer(routeLayer)) {
        map.removeLayer(routeLayer);
      }
      return null;
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
      }
      return null;
    }

    var latLngs = segments.length === 1 ? segments[0] : segments;

    if (!routeLayer) {
      return leaflet.polyline(latLngs, {
        color: routeColor,
        weight: 5,
        opacity: 0.9
      }).addTo(map);
    }

    routeLayer.setStyle({ color: routeColor });
    routeLayer.setLatLngs(latLngs);
    return routeLayer;
  }

  function addAcceptedPoint(input) {
    var lat = input.lat;
    var lon = input.lon;
    var accuracy = input.accuracy;
    var speedKmh = input.speedKmh;
    var heading = input.heading;
    var now = input.now;
    var activeSession = input.activeSession;
    var sessionActive = input.sessionActive;
    var map = input.map;
    var leaflet = input.leaflet;
    var routeLayer = input.routeLayer;
    var routeColor = input.routeColor || '#ffcc00';
    var persistActiveSession = input.persistActiveSession;

    if (!activeSession || !sessionActive) {
      return { routeLayer: routeLayer, pointAccepted: false };
    }

    var point = {
      latitude: lat,
      longitude: lon,
      timestamp: now,
      accuracy: accuracy,
      speedKmh: speedKmh || 0,
      heading: heading || 0
    };

    var lastPoint = activeSession.lastAcceptedPoint;
    if (!lastPoint) {
      activeSession.routePoints.push(point);
      activeSession.lastAcceptedPoint = point;
      activeSession.resumeAnchorPending = false;
      routeLayer = updateRouteLayer({ map: map, leaflet: leaflet, activeSession: activeSession, routeLayer: routeLayer, routeColor: routeColor });
      persistActiveSession(false);
      return { routeLayer: routeLayer, pointAccepted: true };
    }

    if (activeSession.resumeAnchorPending) {
      var gapMs = point.timestamp - (lastPoint.timestamp || point.timestamp);
      var gapDistance = haversine(lastPoint.latitude, lastPoint.longitude, lat, lon);

      if (gapMs >= resumeAnchorGapMs || gapDistance >= resumeAnchorDistanceM) {
        activeSession.routePoints.push({ break: true, timestamp: point.timestamp });
        activeSession.routePoints.push(point);
        activeSession.lastAcceptedPoint = point;
        activeSession.resumeAnchorPending = false;
        routeLayer = updateRouteLayer({ map: map, leaflet: leaflet, activeSession: activeSession, routeLayer: routeLayer, routeColor: routeColor });
        persistActiveSession(false);
        return { routeLayer: routeLayer, pointAccepted: true };
      }

      activeSession.resumeAnchorPending = false;
    }

    if (activeSession.stopAnchorPending) {
      var stopGapMs = point.timestamp - (lastPoint.timestamp || point.timestamp);
      var stopGapDistance = haversine(lastPoint.latitude, lastPoint.longitude, lat, lon);
      if (stopGapMs >= stopGapBreakMs || stopGapDistance >= stopGapBreakDistanceM) {
        activeSession.routePoints.push({ break: true, timestamp: point.timestamp });
      }
      activeSession.stopAnchorPending = false;
    }

    var distance = haversine(lastPoint.latitude, lastPoint.longitude, lat, lon);
    if (distance < minAcceptedPointDistanceM || distance > maxPointJumpDistanceM) {
      return { routeLayer: routeLayer, pointAccepted: false };
    }

    var dtSeconds = (point.timestamp - (lastPoint.timestamp || point.timestamp)) / 1000;
    if (dtSeconds > 0) {
      var jumpSpeedKmh = (distance / dtSeconds) * 3.6;
      if (!isFinite(jumpSpeedKmh) || jumpSpeedKmh > maxPointJumpSpeedKmh) {
        return { routeLayer: routeLayer, pointAccepted: false };
      }
    }

    if (speedKmh < movingSpeedThresholdKmh) {
      return { routeLayer: routeLayer, pointAccepted: false };
    }

    activeSession.distanceMeters += distance;
    activeSession.routePoints.push(point);
    activeSession.lastAcceptedPoint = point;
    activeSession.maxSpeedKmh = Math.max(activeSession.maxSpeedKmh, speedKmh || 0);

    routeLayer = updateRouteLayer({ map: map, leaflet: leaflet, activeSession: activeSession, routeLayer: routeLayer, routeColor: routeColor });
    persistActiveSession(false);

    return { routeLayer: routeLayer, pointAccepted: true };
  }

  return {
    getSessionLastLatLng: getSessionLastLatLng,
    updateRouteLayer: updateRouteLayer,
    addAcceptedPoint: addAcceptedPoint
  };
}

export function createRouteRecorder(config) {
  var haversine = config.haversine;
  var minAcceptedPointDistanceM = config.minAcceptedPointDistanceM;
  var maxPointJumpDistanceM = config.maxPointJumpDistanceM;
  var maxPointJumpSpeedKmh = config.maxPointJumpSpeedKmh;
  var movingSpeedThresholdKmh = config.movingSpeedThresholdKmh;

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
    const { lat, lon, accuracy, speedKmh, heading, now, activeSession, sessionActive } = input;
    let routeLayer = input.routeLayer;
    if (!activeSession || !sessionActive || activeSession.status !== 'active'
        || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(now)
        || !Number.isFinite(speedKmh) || speedKmh < movingSpeedThresholdKmh) {
      return { routeLayer, pointAccepted: false };
    }
    const point = { latitude: lat, longitude: lon, timestamp: now, accuracy,
      speedKmh, heading: Number.isFinite(heading) ? heading : null };
    const last = activeSession.lastAcceptedPoint;
    if (last && now <= last.timestamp) return { routeLayer, pointAccepted: false };
    if (last && !input.segmentBreak) {
      const distance = haversine(last.latitude, last.longitude, lat, lon);
      const elapsed = (now - last.timestamp) / 1000;
      if (distance < minAcceptedPointDistanceM || distance > maxPointJumpDistanceM
          || distance / elapsed * 3.6 > maxPointJumpSpeedKmh) {
        return { routeLayer, pointAccepted: false };
      }
      activeSession.distanceMeters += distance;
    } else if (last) {
      // A stop/outage/resume anchor never contributes gap distance.
      activeSession.routePoints.push({ break: true, timestamp: now });
    }
    activeSession.routePoints.push(point);
    activeSession.lastAcceptedPoint = point;
    activeSession.maxSpeedKmh = Math.max(activeSession.maxSpeedKmh, speedKmh);
    routeLayer = updateRouteLayer({ map: input.map, leaflet: input.leaflet,
      activeSession, routeLayer, routeColor: input.routeColor });
    input.persistActiveSession(false);
    return { routeLayer, pointAccepted: true };
  }

  return {
    updateRouteLayer: updateRouteLayer,
    addAcceptedPoint: addAcceptedPoint
  };
}

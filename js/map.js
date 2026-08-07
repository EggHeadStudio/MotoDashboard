export function initLeafletMap(input) {
  var L = input.L;
  var mapElementId = input.mapElementId || 'map';
  var mapStatusEl = input.mapStatusEl || null;
  var onUserMapInteraction = input.onUserMapInteraction;
  var initialLat = Number(input.initialLat);
  var initialLon = Number(input.initialLon);
  var initialZoom = Number(input.initialZoom);

  var map = L.map(mapElementId, {
    zoomControl: false,
    attributionControl: true,
    dragging: true,
    touchZoom: true,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false
  }).setView([
    isFinite(initialLat) ? initialLat : 61.9241,
    isFinite(initialLon) ? initialLon : 25.7482
  ], isFinite(initialZoom) ? initialZoom : 6);

  var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 19,
    crossOrigin: true
  }).addTo(map);

  tileLayer.on('load', function () {
    if (mapStatusEl) {
      mapStatusEl.style.display = 'none';
    }
  });

  tileLayer.on('tileerror', function () {
    if (mapStatusEl) {
      mapStatusEl.textContent = 'Karttatiiliä ei voitu ladata';
      mapStatusEl.style.display = '';
    }
  });

  if (typeof onUserMapInteraction === 'function') {
    map.on('dragstart', onUserMapInteraction);
    map.on('zoomstart', onUserMapInteraction);
    map.on('movestart', onUserMapInteraction);
  }

  window.setTimeout(function () {
    map.invalidateSize();
  }, 250);

  return {
    map: map,
    tileLayer: tileLayer,
    mapPane: map.getPanes ? map.getPanes().mapPane : null
  };
}

export function setFollowMapView(input) {
  var map = input.map;
  var L = input.L;
  var lat = Number(input.lat);
  var lon = Number(input.lon);
  var hasAppliedInitialFollowZoom = !!input.hasAppliedInitialFollowZoom;

  if (!map) {
    return hasAppliedInitialFollowZoom;
  }

  var latLng = L ? L.latLng(lat, lon) : [lat, lon];

  if (!hasAppliedInitialFollowZoom && map.getZoom() < 14) {
    map.setView(latLng, 16, { animate: true });
    return true;
  }

  var center = map.getCenter ? map.getCenter() : null;
  var centerDistanceM = center && L && typeof map.distance === 'function'
    ? map.distance(center, latLng)
    : Infinity;

  if (centerDistanceM < 4) {
    return true;
  }

  map.panTo(latLng, {
    animate: true,
    duration: 0.35,
    easeLinearity: 0.35,
    noMoveStart: true
  });

  return true;
}

export function updateMapPositionLayers(input) {
  var map = input.map;
  var L = input.L;
  var dotIcon = input.dotIcon;
  var posMarker = input.posMarker || null;
  var accCircle = input.accCircle || null;
  var lat = Number(input.lat);
  var lon = Number(input.lon);
  var accuracy = Number(input.accuracy);

  if (!map || !L || !dotIcon) {
    return {
      posMarker: posMarker,
      accCircle: accCircle
    };
  }

  var latLng = [lat, lon];
  if (!posMarker) {
    posMarker = L.marker(latLng, { icon: dotIcon, interactive: false }).addTo(map);
  } else {
    posMarker.setLatLng(latLng);
  }

  if (!accCircle) {
    accCircle = L.circle(latLng, {
      radius: accuracy,
      className: 'accuracy-circle',
      interactive: false
    }).addTo(map);
  } else {
    accCircle.setLatLng(latLng);
    accCircle.setRadius(accuracy);
  }

  return {
    posMarker: posMarker,
    accCircle: accCircle
  };
}

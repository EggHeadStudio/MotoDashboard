import { THEME_MAP_STYLES } from './config.js';

function getThemeTileConfig(themeName) {
  var normalizedTheme = themeName || 'normal';
  var config = THEME_MAP_STYLES[normalizedTheme] || THEME_MAP_STYLES.normal;
  return {
    url: config.url,
    attribution: config.attribution,
    subdomains: 'abc'
  };
}

export function initLeafletMap(input) {
  var L = input.L;
  var mapElementId = input.mapElementId || 'map';
  var mapStatusEl = input.mapStatusEl || null;
  var onUserMapInteraction = input.onUserMapInteraction;
  var initialLat = Number(input.initialLat);
  var initialLon = Number(input.initialLon);
  var initialZoom = Number(input.initialZoom);
  var themeName = input.themeName || 'normal';

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

  var tileConfig = getThemeTileConfig(themeName);
  var tileLayer = L.tileLayer(tileConfig.url, {
    attribution: tileConfig.attribution,
    maxZoom: 19,
    subdomains: tileConfig.subdomains,
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

export function setMapThemeLayer(input) {
  var map = input.map;
  var L = input.L;
  var themeName = input.themeName || 'normal';
  var mapStatusEl = input.mapStatusEl || null;
  var tileLayer = input.tileLayer || null;

  if (!map || !L) {
    return tileLayer;
  }

  var tileConfig = getThemeTileConfig(themeName);
  var currentUrl = tileLayer && tileLayer._url ? tileLayer._url : '';
  var currentAttribution = tileLayer && tileLayer.options ? tileLayer.options.attribution : '';

  if (tileLayer && currentUrl === tileConfig.url && currentAttribution === tileConfig.attribution) {
    return tileLayer;
  }

  if (tileLayer) {
    map.removeLayer(tileLayer);
  }

  var nextLayer = L.tileLayer(tileConfig.url, {
    attribution: tileConfig.attribution,
    maxZoom: 19,
    subdomains: tileConfig.subdomains,
    crossOrigin: true
  }).addTo(map);

  nextLayer.on('load', function () {
    if (mapStatusEl) {
      mapStatusEl.style.display = 'none';
    }
  });

  nextLayer.on('tileerror', function () {
    if (mapStatusEl) {
      mapStatusEl.textContent = 'Karttatiiliä ei voitu ladata';
      mapStatusEl.style.display = '';
    }
  });

  return nextLayer;
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
  var logoRingIcon = input.logoRingIcon;
  var posMarker = input.posMarker || null;
  var logoRingMarker = input.logoRingMarker || null;
  var lat = Number(input.lat);
  var lon = Number(input.lon);

  if (!map || !L || !dotIcon) {
    return {
      posMarker: posMarker,
      logoRingMarker: logoRingMarker
    };
  }

  var latLng = [lat, lon];
  if (logoRingIcon) {
    if (!logoRingMarker) {
      logoRingMarker = L.marker(latLng, { icon: logoRingIcon, interactive: false, zIndexOffset: -300 }).addTo(map);
    } else {
      logoRingMarker.setLatLng(latLng);
    }
  }

  if (!posMarker) {
    posMarker = L.marker(latLng, { icon: dotIcon, interactive: false }).addTo(map);
  } else {
    posMarker.setLatLng(latLng);
  }

  return {
    posMarker: posMarker,
    logoRingMarker: logoRingMarker
  };
}

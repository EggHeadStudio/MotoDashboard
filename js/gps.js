export function isGeolocationSupported(navigatorRef) {
  return !!(navigatorRef && navigatorRef.geolocation);
}

export function getGeolocationErrorMessage(error) {
  if (!error) {
    return 'GPS-seurannan käynnistäminen epäonnistui.';
  }

  if (error.code === 1) {
    return 'Sijaintilupa evättiin. Salli selaimelle sijainti ja lataa sivu uudelleen.';
  }
  if (error.code === 2) {
    return 'Sijaintia ei saatu. Siirry ulos avoimelle paikalle ja yritä uudelleen.';
  }
  if (error.code === 3) {
    return 'Sijainnin haku aikakatkaistiin. Yritä uudelleen.';
  }

  return error.message || 'GPS-seurannan käynnistäminen epäonnistui.';
}

export function startGeoWatch(geoApi, successCallback, errorCallback, options) {
  if (!geoApi || typeof geoApi.watchPosition !== 'function') {
    return null;
  }

  return geoApi.watchPosition(successCallback, errorCallback, options);
}

export function stopGeoWatch(geoApi, watchId) {
  if (geoApi && typeof geoApi.clearWatch === 'function' && watchId !== null && typeof watchId !== 'undefined') {
    geoApi.clearWatch(watchId);
  }
}

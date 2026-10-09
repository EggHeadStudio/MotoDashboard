import { t, setLocalizedText, formatNumber } from './i18n/i18n.js';
export function isGeolocationSupported(navigatorRef) {
  return !!(navigatorRef && navigatorRef.geolocation);
}

export function getGeolocationErrorMessage(error) {
  if (!error) {
    return t("ui.trackingError");
  }

  if (error.code === 1) {
    return t("ui.permissionError");
  }
  if (error.code === 2) {
    return t("ui.positionError");
  }
  if (error.code === 3) {
    return t("ui.positionTimeout");
  }

  return error.message || t("ui.trackingError");
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

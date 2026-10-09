import { t, setLocalizedText, formatNumber } from './i18n/i18n.js';
export function wmoToFinnish(code, wmoCodes) {
  return t(wmoCodes[code] || 'ui.weatherUnavailable');
}

export function fetchAndRenderWeather(lat, lon, options) {
  var isOnline = options.isOnline;
  var weatherRowEl = options.weatherRowEl;
  var temperatureRowEl = options.temperatureRowEl;
  var windRowEl = options.windRowEl;
  var wmoCodes = options.wmoCodes;
  var fetchImpl = options.fetchImpl || fetch;

  if (!isOnline) {
    setLocalizedText(weatherRowEl, () => t("ui.weatherUnavailable"));
    setLocalizedText(temperatureRowEl, () => '— °C');
    setLocalizedText(windRowEl, () => '—');
    return Promise.resolve(false);
  }

  var url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat.toFixed(4)
    + '&longitude=' + lon.toFixed(4)
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
    + '&temperature_unit=celsius'
    + '&wind_speed_unit=kmh'
    + '&timezone=auto';

  return fetchImpl(url, { signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined })
    .then(function (response) { if (!response.ok) throw new Error('weather-http'); return response.json(); })
    .then(function (data) {
      if (data && data.current && Number.isFinite(data.current.temperature_2m) && Number.isFinite(data.current.wind_speed_10m)) {
        var cur = data.current;
        var temp = Math.round(cur.temperature_2m);
        var wind = Math.round(cur.wind_speed_10m);
        var desc = function () { return wmoToFinnish(cur.weather_code, wmoCodes); };
        setLocalizedText(weatherRowEl, () => desc());
        setLocalizedText(temperatureRowEl, () => formatNumber(temp, 0) + ' °C');
        setLocalizedText(windRowEl, () => formatNumber(wind, 0) + ' km/h');
        return true;
      }

      setLocalizedText(weatherRowEl, () => t("ui.weatherUnavailable"));
      setLocalizedText(temperatureRowEl, () => '— °C');
      setLocalizedText(windRowEl, () => '—');
      return false;
    })
    .catch(function () {
      setLocalizedText(weatherRowEl, () => t("ui.weatherUnavailable"));
      setLocalizedText(temperatureRowEl, () => '— °C');
      setLocalizedText(windRowEl, () => '—');
      return false;
    });
}

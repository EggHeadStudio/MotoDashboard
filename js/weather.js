export function wmoToFinnish(code, wmoCodes) {
  return wmoCodes[code] || 'Sää ei saatavilla';
}

export function fetchAndRenderWeather(lat, lon, options) {
  var isOnline = options.isOnline;
  var weatherRowEl = options.weatherRowEl;
  var temperatureRowEl = options.temperatureRowEl;
  var windRowEl = options.windRowEl;
  var wmoCodes = options.wmoCodes;
  var fetchImpl = options.fetchImpl || fetch;

  if (!isOnline) {
    weatherRowEl.textContent = 'Sää ei saatavilla';
    temperatureRowEl.textContent = '— °C';
    windRowEl.textContent = '—';
    return Promise.resolve(false);
  }

  var url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat.toFixed(4)
    + '&longitude=' + lon.toFixed(4)
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m'
    + '&temperature_unit=celsius'
    + '&wind_speed_unit=kmh'
    + '&timezone=auto';

  return fetchImpl(url)
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data && data.current) {
        var cur = data.current;
        var temp = Math.round(cur.temperature_2m);
        var wind = Math.round(cur.wind_speed_10m);
        var desc = wmoToFinnish(cur.weather_code, wmoCodes);
        weatherRowEl.textContent = desc;
        temperatureRowEl.textContent = temp + ' °C';
        windRowEl.textContent = wind + ' km/h';
        return true;
      }

      weatherRowEl.textContent = 'Sää ei saatavilla';
      temperatureRowEl.textContent = '— °C';
      windRowEl.textContent = '—';
      return false;
    })
    .catch(function () {
      weatherRowEl.textContent = 'Sää ei saatavilla';
      temperatureRowEl.textContent = '— °C';
      windRowEl.textContent = '—';
      return false;
    });
}

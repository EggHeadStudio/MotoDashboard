export function normalizeAngle(deg) {
  var value = deg % 360;
  if (value < 0) {
    value += 360;
  }
  return value;
}

export function shortestAngleDelta(fromDeg, toDeg) {
  var delta = normalizeAngle(toDeg) - normalizeAngle(fromDeg);
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return delta;
}

export function bearingDegrees(lat1, lon1, lat2, lon2) {
  var phi1 = lat1 * Math.PI / 180;
  var phi2 = lat2 * Math.PI / 180;
  var dLambda = (lon2 - lon1) * Math.PI / 180;
  var y = Math.sin(dLambda) * Math.cos(phi2);
  var x = Math.cos(phi1) * Math.sin(phi2)
    - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  var brng = Math.atan2(y, x) * 180 / Math.PI;
  return normalizeAngle(brng);
}

export function formatDuration(ms) {
  var totalSeconds = Math.max(0, Math.floor(ms / 1000));
  var hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  var minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  var seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours + ':' + minutes + ':' + seconds;
}

export function formatDate(value) {
  var date = new Date(value);
  if (isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('fi-FI', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatSpeedKmh(kmh) {
  var value = Number(kmh);
  if (!isFinite(value) || value < 0) {
    value = 0;
  }
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function formatDistanceKm(distanceMeters) {
  var meters = Number(distanceMeters);
  if (!isFinite(meters) || meters < 0) {
    meters = 0;
  }
  return (Math.round((meters / 1000) * 10) / 10).toFixed(1);
}

export function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371000;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

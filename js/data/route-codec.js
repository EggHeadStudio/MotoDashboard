import { dataError } from '../firebase/access.js';

export async function sha256(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2,'0')).join('');
}
export function normalizeRoute(points) {
  if (!Array.isArray(points)) throw dataError('invalid-input');
  let previous = 0;
  return points.map(point => {
    if (!Number.isFinite(point?.timestamp) || point.timestamp <= 0 || point.timestamp > 8640000000000000 || point.timestamp < previous) throw dataError('invalid-input');
    previous = point.timestamp;
    if (point.break === true) return {break:true,timestamp:point.timestamp};
    if (!Number.isFinite(point.latitude) || Math.abs(point.latitude)>90 || !Number.isFinite(point.longitude) || Math.abs(point.longitude)>180)
      throw dataError('invalid-input');
    return {latitude:point.latitude,longitude:point.longitude,timestamp:point.timestamp,
      accuracy:Number.isFinite(point.accuracy) && point.accuracy>=0 ? point.accuracy : null,
      speedKmh:Number.isFinite(point.speedKmh) && point.speedKmh>=0 ? point.speedKmh : 0,
      heading:Number.isFinite(point.heading) ? ((point.heading%360)+360)%360 : null};
  });
}
export async function encodeRoute(points) {
  const route = normalizeRoute(points);
  const routeHash = await sha256(JSON.stringify(route));
  const chunks = [];
  for (let start = 0; start < route.length; start += 128) {
    const group = route.slice(start,start+128);
    const pointsJson = JSON.stringify(group);
    if (pointsJson.length>48000 || chunks.length>=10000) throw dataError('invalid-input');
    chunks.push({sequence:chunks.length,pointCount:group.length,pointsJson,routeHash});
  }
  return {route,routeHash,chunks};
}
export async function decodeRoute(chunks, manifest) {
  if (chunks.length !== manifest.chunkCount) throw dataError('unavailable');
  const sorted = [...chunks].sort((a,b)=>a.sequence-b.sequence);
  const points = [];
  sorted.forEach((chunk,index) => {
    if (chunk.schemaVersion!==1 || chunk.sequence!==index || chunk.ownerUid!==manifest.ownerUid
      || chunk.sessionId!==manifest.id || chunk.routeHash!==manifest.routeHash || typeof chunk.pointsJson!=='string'
      || chunk.pointsJson.length>48000) throw dataError('invalid-input');
    let group;
    try { group=JSON.parse(chunk.pointsJson); } catch { throw dataError('invalid-input'); }
    if (!Array.isArray(group) || group.length!==chunk.pointCount || group.length<1 || group.length>128) throw dataError('invalid-input');
    points.push(...group);
  });
  const route = normalizeRoute(points);
  if (route.length!==manifest.pointCount || await sha256(JSON.stringify(route))!==manifest.routeHash) throw dataError('invalid-input');
  return route;
}

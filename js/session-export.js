import { normalizeRoute } from './data/route-codec.js';

const xml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
export function exportJSON(session) {
  const routePoints=normalizeRoute(session.routePoints);
  return JSON.stringify({format:'MotoDashboardRide',schemaVersion:1,
    session:{id:session.id,ownerUid:session.ownerUid || null,name:session.name || null,visibility:'private',
      vehicleId:session.vehicleId || null,vehicleSnapshot:session.vehicleSnapshot || null,category:session.category || null,
      startedAt:session.startedAt,endedAt:session.endedAt,distanceMeters:session.distanceMeters,
      movingDurationMs:session.movingDurationMs,averageMovingSpeedKmh:session.averageMovingSpeedKmh,
      maxSpeedKmh:session.maxSpeedKmh,mapTheme:session.mapTheme},routePoints},null,2);
}
export function exportGPX(session) {
  const points=normalizeRoute(session.routePoints);
  const segments=[];let segment=[];
  for(const point of points) {
    if(point.break) {if(segment.length) segments.push(segment);segment=[];continue;}
    segment.push(`<trkpt lat="${point.latitude}" lon="${point.longitude}"><time>${new Date(point.timestamp).toISOString()}</time></trkpt>`);
  }
  if(segment.length) segments.push(segment);
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<gpx version="1.1" creator="MotoDashboard" xmlns="http://www.topografix.com/GPX/1/1">'
    + '<trk><name>'+xml(session.name || session.id)+'</name>'
    + segments.map(group=>'<trkseg>'+group.join('')+'</trkseg>').join('')+'</trk></gpx>';
}
export function sessionFile(session,format) {
  const gpx=format==='gpx';
  return new File([gpx?exportGPX(session):exportJSON(session)],`motodash-${session.id}.${gpx?'gpx':'json'}`,
    {type:gpx?'application/gpx+xml':'application/json'});
}
export function downloadFile(file) {
  const url=URL.createObjectURL(file),anchor=document.createElement('a');
  anchor.href=url;anchor.download=file.name;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function shareOrDownload(file,share=false) {
  if(share && navigator.share && navigator.canShare?.({files:[file]})) {
    try {await navigator.share({files:[file],title:file.name});return 'rides.shared';}
    catch(error) {if(error.name==='AbortError') return 'rides.shareCancelled';}
  }
  downloadFile(file);return 'rides.downloaded';
}

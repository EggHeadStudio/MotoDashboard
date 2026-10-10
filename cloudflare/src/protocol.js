export const VERSION=1,MAX_MESSAGE_BYTES=1024,MAX_RIDERS=50,LEASE_MS=30000,STALE_MS=45000,EXPIRE_MS=120000;
export function parseMessage(raw) {
  if(typeof raw!=='string' || new TextEncoder().encode(raw).byteLength>MAX_MESSAGE_BYTES) throw Error('bad_message');
  const m=JSON.parse(raw);if(!m || m.v!==VERSION || typeof m.type!=='string') throw Error('bad_message');
  const shapes={hello:['v','type','ticket'],position:['v','type','latitude','longitude','accuracy','heading','speedKmh','sampledAt','seq'],
    heartbeat:['v','type','sampledAt'],status:['v','type'],revalidate:['v','type']};
  const allowed=shapes[m.type];if(!allowed || Object.keys(m).some(key=>!allowed.includes(key))) throw Error('bad_message');
  if(m.type==='hello' && !/^[0-9a-f]{64}$/.test(m.ticket || '')) throw Error('invalid_ticket');
  return m;
}
export function validPosition(m,now=Date.now()) {
  return m.type==='position' && Number.isFinite(m.latitude) && Math.abs(m.latitude)<=90
    && Number.isFinite(m.longitude) && Math.abs(m.longitude)<=180
    && Number.isFinite(m.accuracy) && m.accuracy>=0 && m.accuracy<=100
    && (m.heading===null || Number.isFinite(m.heading) && m.heading>=0 && m.heading<360)
    && Number.isFinite(m.speedKmh) && m.speedKmh>=0 && m.speedKmh<=220
    && Number.isSafeInteger(m.sampledAt) && m.sampledAt<=now+5000 && now-m.sampledAt<=15000
    && Number.isSafeInteger(m.seq) && m.seq>0;
}
export function distance(a,b) {
  const r=Math.PI/180,lat=(b.latitude-a.latitude)*r,lon=(b.longitude-a.longitude)*r;
  const x=Math.sin(lat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(lon/2)**2;
  return 6371000*2*Math.asin(Math.min(1,Math.sqrt(x)));
}
export function positionDecision(state,m,now) {
  if(!validPosition(m,now) || m.seq<=state.seq) throw Error('bad_position');
  const old=state.position;
  if(old && m.sampledAt<=old.sampledAt) throw Error('bad_position');
  if(old && now-old.at<EXPIRE_MS && distance(old,m)>(m.sampledAt-old.sampledAt)/1000*250/3.6+old.accuracy+m.accuracy) throw Error('bad_position');
  if(old && now-state.lastPositionAt<(m.speedKmh>=3?5000:30000)) throw Error('rate_limited');
  if(old && old.latitude===m.latitude && old.longitude===m.longitude) return null;
  return {latitude:m.latitude,longitude:m.longitude,accuracy:m.accuracy,heading:m.heading,
    speedKmh:m.speedKmh,sampledAt:m.sampledAt,at:now};
}

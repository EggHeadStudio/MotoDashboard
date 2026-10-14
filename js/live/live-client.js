import {getFirebase} from '../firebase/firebase.js';
import {boundedRequest} from '../firebase/access.js';
import {getAccount,onAccountChange} from '../auth-state.js';
import {liveConfig} from '../../live-config.js';

export function liveEndpoint(value) {
  if(!value)return null;const url=new URL(value);
  if((url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))
    || url.username || url.password || url.search || url.hash || url.pathname!=='/')throw Error('invalid_endpoint');
  return url.origin;
}
export function createLiveClient({endpoint=liveConfig.endpoint,fetchImpl=fetch,makeSocket=url=>new WebSocket(url),
  identity=async()=>{const {auth}=await getFirebase();const user=auth.currentUser;if(!user || user.uid!==getAccount()?.uid)throw Error('account_changed');return {uid:user.uid,token:await user.getIdToken(true)};},
  account=()=>getAccount()?.uid,now=()=>Date.now(),onConflict=id=>dispatchEvent(new CustomEvent('motodash-live-conflict',{detail:{activeSessionId:id}}))}={}) {
  let state={consent:false,sessionId:null,uid:null,connection:'off',selfId:null,participants:new Map()},
    ws=null,epoch=0,retryTimer=null,heartbeatTimer=null,handshakeTimer=null,attempt=0,lastSample=null,lastSent=null,seq=0,lastControl=0,lastServerAt=0;
  const listeners=new Set();
  const emit=()=>{for(const listener of listeners)listener(state);};
  function conflict(id) {
    if(typeof id!=='string'||!(/^[0-9a-f-]{36}$/).test(id)){stop('unavailable');return;}
    onConflict(id);
  }
  function cleanup() {clearTimeout(retryTimer);clearInterval(heartbeatTimer);clearTimeout(handshakeTimer);retryTimer=null;heartbeatTimer=null;handshakeTimer=null;lastSample=null;lastSent=null;}
  function stop(reason='off') {epoch++;cleanup();const socket=ws;ws=null;try {socket?.close();}catch{} state={...state,consent:false,sessionId:null,uid:null,selfId:null,connection:reason,participants:new Map()};emit();}
  function same(token) {return token===epoch && state.consent && account()===state.uid;}
  function send(message) {if(state.connection==='connected' && ws?.readyState===1)ws.send(JSON.stringify({v:1,...message}));}
  function retry(token) {
    if(!same(token))return;cleanup();state={...state,connection:'reconnecting',participants:new Map(),selfId:null};emit();
    if(++attempt>6){stop('unavailable');return;}
    retryTimer=setTimeout(()=>void connect(token),Math.min(30000,2000*2**(attempt-1))+Math.random()*1000);
  }
  async function connect(token) {
    if(!same(token))return;
    let base;try{base=liveEndpoint(endpoint);}catch{stop('notConfigured');return;}
    if(!base){stop('notConfigured');return;}
    state={...state,connection:'connecting'};emit();
    try {
      const auth=await boundedRequest(identity(),12000,'live-identity');if(!same(token) || auth.uid!==state.uid)return;
      const path='/v1/sessions/'+state.sessionId;
      const response=await fetchImpl(base+path+'/ticket',{method:'POST',headers:{Authorization:'Bearer '+auth.token},
        credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
      if(!same(token))return;
      if(response.status===403){stop('accessDenied');return;}
      if(response.status===409){const result=await response.json();if(!same(token))return;stop('conflict');conflict(result.activeSessionId);return;}
      if(!response.ok)throw Error('unavailable');
      const result=await response.json();if(!/^[0-9a-f]{64}$/.test(result.ticket || '') || result.protocol!==1)throw Error('bad_ticket');
      if(!same(token))return;
      const socket=makeSocket(base.replace(/^http/,'ws')+path+'/connect');ws=socket;
      handshakeTimer=setTimeout(()=>{if(same(token) && state.connection!=='connected')socket.close();},10000);
      socket.addEventListener('open',()=>{if(same(token))socket.send(JSON.stringify({v:1,type:'hello',ticket:result.ticket}));else socket.close();});
      socket.addEventListener('message',event=>{
        if(!same(token) || socket!==ws)return;
        try {
          if(typeof event.data!=='string' || event.data.length>65536)throw Error('bad_message');
          const m=JSON.parse(event.data);if(m.v!==1)throw Error('bad_version');
          lastServerAt=now();
          const localTime=at=>now()-Math.max(0,(m.serverTime ?? now())-at);
          const localPosition=p=>p && Number.isFinite(p.at)?{...p,at:localTime(p.at)}:null;
          const localParticipant=p=>({...p,position:localPosition(p.position)});
          if(m.type==='hello') {
            clearTimeout(handshakeTimer);attempt=0;seq=0;lastSample=null;lastSent=null;
            state={...state,connection:'connected',selfId:m.riderId};
            heartbeatTimer=setInterval(()=>{if(now()-lastServerAt>65000){socket.close();return;}send({type:'heartbeat',...(lastSample && now()-lastSample.timestamp<=15000?{sampledAt:lastSample.timestamp}:{})});},25000);
          } else if(m.type==='snapshot') {
            if(!Array.isArray(m.participants) || m.participants.length>50)throw Error('bad_snapshot');
            state={...state,participantCount:m.participantCount,participants:new Map(m.participants.map(p=>[p.riderId,localParticipant(p)]))};
          } else if(m.type==='participant_update') state.participants.set(m.participant.riderId,localParticipant(m.participant));
          else if(m.type==='room_update')state={...state,participantCount:m.participantCount};
          else if(m.type==='position') {const p=state.participants.get(m.riderId);if(p)p.position=localPosition(m.position);}
          else if(m.type==='participant_left')state.participants.delete(m.riderId);
          else if(m.type==='heartbeat' && m.riderId) {const p=state.participants.get(m.riderId);if(p?.position)p.position.at=localTime(m.at);}
          else if(m.type==='session_ended'){stop('ended');return;}
          else if(m.type==='error' && m.code==='active_ride'){stop('conflict');conflict(m.activeSessionId);return;}
          else if(m.type==='error' && m.code!=='unavailable'){stop('accessDenied');return;}
          emit();
        } catch {stop('unavailable');}
      });
      socket.addEventListener('close',event=>{
        if(!same(token) || socket!==ws)return;ws=null;
        if(event.code===4002){stop('replaced');return;}
        if(event.code===4003 && !['unavailable','disconnected','token_expired'].includes(event.reason)){stop('accessDenied');return;}
        retry(token);
      });
      socket.addEventListener('error',()=>{if(socket===ws)socket.close();});
    } catch {retry(token);}
  }
  function sample(value) {
    if(!state.consent || account()!==state.uid || state.connection!=='connected' || !value?.accepted)return;
    if(now()-value.timestamp>15000 || value.timestamp>now()+5000)return;
    lastSample=value;const c=value.coords,speed=value.validatedSpeedKmh ?? 0;
    if(!Number.isFinite(speed) || speed<0 || speed>220)return;
    if(lastSent && (now()-lastSent.at<(speed>=3?5000:30000)
      || lastSent.latitude===c.latitude && lastSent.longitude===c.longitude))return;
    send({type:'position',latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,
      heading:Number.isFinite(c.heading)?c.heading:null,speedKmh:speed,sampledAt:value.timestamp,seq:++seq});
    lastSent={latitude:c.latitude,longitude:c.longitude,at:now()};
  }
  return {getState:()=>state,onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn);},stop,sample,
    start(uid,id){
      if(account()!==uid || !/^[0-9a-f-]{36}$/.test(id)){stop('accessDenied');return false;}
      if(state.consent && state.uid===uid){if(state.sessionId===id)return true;conflict(state.sessionId);return false;}
      stop();state={...state,consent:true,uid,sessionId:id,connection:'connecting'};emit();void connect(epoch);return true;},
    revalidate(){if(now()-lastControl>=10000){lastControl=now();send({type:'revalidate'});}}};
}
export const liveClient=createLiveClient();
let owner=null;
onAccountChange(({user})=>{const next=user?.uid || null;if(next!==owner){owner=next;liveClient.stop();}});
export const publishLiveSample=sample=>liveClient.sample(sample);

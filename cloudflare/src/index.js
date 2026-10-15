export {LiveRoom} from './LiveRoom.js';
export {LiveIdentity} from './LiveIdentity.js';
export {MediaState} from './MediaState.js';
export {ClubActivity} from './ClubActivity.js';
import {decodeJwt} from 'jose';
import {verifyFirebaseToken,PROJECT} from './auth.js';
export function allowedOrigin(request, env) {
  const origin=request.headers.get('Origin');
  return !!origin && (env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).includes(origin);
}
export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==='/health' && request.method==='GET')
      return Response.json({service:'motodash-live',protocol:1}, {headers:{'Cache-Control':'no-store'}});
    if(!allowedOrigin(request,env)) return Response.json({error:'origin_denied'},{status:403});
    const origin=request.headers.get('Origin');
    const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store',
      'Access-Control-Allow-Methods':'POST, PUT, DELETE, GET, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, If-Match, X-Media-Published'};
    const reply=(error,status)=>Response.json({error},{status,headers});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
    const activity=/^\/v1\/clubs\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/activity(?:\/[0-9a-f-]{36})?$/.exec(url.pathname);
    if(activity){
      if(env.FIREBASE_PROJECT_ID!==PROJECT||!env.CLUB_ACTIVITY||!env.FIRESTORE_SERVICE_ACCOUNT||!env.MEDIA_SERVICE_ACCOUNT)return reply('not_configured',503);
      if(url.protocol!=='https:')return reply('bad_request',400);
      let identity=null;const authorization=request.headers.get('Authorization');
      if(authorization)try{if(!authorization.startsWith('Bearer '))throw Error();const token=authorization.slice(7);
        identity={...await verifyFirebaseToken(token,PROJECT),authTime:decodeJwt(token).auth_time*1000};
      }catch{return reply('invalid_token',401);}
      if(request.method!=='GET'&&!identity)return reply('invalid_token',401);
      const caller='ip:'+(request.headers.get('CF-Connecting-IP') || 'unknown');
      const hashed=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(caller)))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const internal=new Headers(request.headers);internal.set('X-MotoDash-Identity',JSON.stringify(identity));internal.set('X-MotoDash-Caller',hashed);internal.delete('Authorization');
      try{const result=await env.CLUB_ACTIVITY.get(env.CLUB_ACTIVITY.idFromName(activity[1])).fetch(new Request(request,{headers:internal}));
        return new Response(result.body,{status:result.status,headers:{...headers,'Content-Type':'application/json'}});
      }catch{return reply('unavailable',503);}
    }
    if(url.pathname.startsWith('/v1/media/')) {
      if(env.FIREBASE_PROJECT_ID!==PROJECT || !env.MEDIA_BUCKET || !env.MEDIA_STATE || !env.MEDIA_SERVICE_ACCOUNT)return reply('not_configured',503);
      if(url.search || url.hash || url.protocol!=='https:')return reply('bad_request',400);
      let identity=null;
      const authorization=request.headers.get('Authorization');
      if(authorization)try{
        if(!authorization.startsWith('Bearer '))throw Error('invalid_token');
        const token=authorization.slice(7);identity={...await verifyFirebaseToken(token,PROJECT),authTime:decodeJwt(token).auth_time*1000};
      }catch{return reply('invalid_token',401);}
      if(request.method!=='GET'&&!identity)return reply('invalid_token',401);
      const caller=identity?'uid:'+identity.uid:'ip:'+(request.headers.get('CF-Connecting-IP') || 'unknown');
      const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(caller)))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const internal=new Headers(request.headers);internal.set('X-MotoDash-Identity',JSON.stringify(identity));internal.set('X-MotoDash-Caller',hash);internal.delete('Authorization');
      try {
        const result=await env.MEDIA_STATE.get(env.MEDIA_STATE.idFromName('prototype-v1')).fetch(new Request(request,{headers:internal}));
        const mediaHeaders=new Headers(result.headers);
        for(const [key,value] of Object.entries(headers))if(key!=='Cache-Control'||!mediaHeaders.has(key))mediaHeaders.set(key,value);
        return new Response(result.body,{status:result.status,headers:mediaHeaders});
      }catch{return reply('unavailable',503);}
    }
    if(env.FIREBASE_PROJECT_ID!==PROJECT || !env.FIRESTORE_SERVICE_ACCOUNT || !env.LIVE_ROOMS || !env.LIVE_IDENTITIES) return reply('not_configured',503);
    if(url.search || url.hash || (url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname))) return reply('bad_request',400);
    const match=/^\/v1\/sessions\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(ticket|connect)$/.exec(url.pathname);
    if(!match) return reply('not_found',404);
    const [ ,sessionId,action]=match,room=env.LIVE_ROOMS.get(env.LIVE_ROOMS.idFromName(sessionId));
    try {
      if(action==='ticket' && request.method==='POST') {
        // No request body: all identity derives from this verified Firebase token.
        if(Number(request.headers.get('Content-Length') || 0)>0) return reply('bad_request',400);
        // Workers can represent an empty POST as an empty stream. Inspect one bounded
        // chunk rather than treating every stream as a payload or allocating its whole body.
        if(request.body){const reader=request.body.getReader(),chunk=await reader.read();await reader.cancel();if(!chunk.done)return reply('bad_request',400);}
        const authorization=request.headers.get('Authorization') || '';
        if(!authorization.startsWith('Bearer ')) return reply('invalid_token',401);
        let identity;try {identity=await verifyFirebaseToken(authorization.slice(7),env.FIREBASE_PROJECT_ID);}
        catch {return reply('invalid_token',401);}
        const response=await room.fetch(new Request('https://room.internal/ticket',{method:'POST',
          headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity,origin,sessionId})}));
        return new Response(response.body,{status:response.status,headers:{...headers,'Content-Type':'application/json'}});
      }
      if(action==='connect' && request.method==='GET' && request.headers.get('Upgrade')?.toLowerCase()==='websocket')
        return room.fetch(new Request('https://room.internal/connect',{headers:{Upgrade:'websocket',Origin:origin,'X-Session-Id':sessionId}}));
      return reply('bad_request',400);
    } catch {return reply('unavailable',503);}
  }
};

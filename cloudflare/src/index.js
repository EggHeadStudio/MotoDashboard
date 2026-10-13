export {LiveRoom} from './LiveRoom.js';
export {LiveIdentity} from './LiveIdentity.js';
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
      'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'};
    const reply=(error,status)=>Response.json({error},{status,headers});
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
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

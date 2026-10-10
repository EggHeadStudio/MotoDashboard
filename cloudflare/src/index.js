export {LiveRoom} from './LiveRoom.js';
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
    return Response.json({error:'not_available'},{status:503});
  }
};

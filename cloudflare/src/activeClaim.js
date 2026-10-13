import {LEASE_MS} from './protocol.js';
const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
// Called only by trusted rooms. No caller UID or authorization claim is accepted.
export function claimDecision(current,action,input,now=Date.now()) {
  if(!input || Object.keys(input).some(key=>!['roomId','nonce','until'].includes(key)) || !uuid(input.roomId) || !uuid(input.nonce)
    || !['reserve','activate','renew','release'].includes(action))return {status:400,error:'bad_request'};
  const alive=current && current.until>now;
  if(action==='release')return {status:200,claim:alive && (current.roomId!==input.roomId || current.nonce!==input.nonce)?current:null};
  if(!Number.isSafeInteger(input.until) || input.until<=now)return {status:403,error:'access_denied'};
  if(alive && current.roomId!==input.roomId)return {status:409,error:'active_ride',activeSessionId:current.roomId};
  if(action==='renew' && (!alive || current.nonce!==input.nonce))return {status:403,error:'access_denied'};
  if(action==='reserve' && alive)return {status:200,claim:current};
  return {status:200,claim:{roomId:input.roomId,nonce:input.nonce,until:Math.min(now+LEASE_MS,input.until)}};
}

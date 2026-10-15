import {getFirebase} from '../firebase/firebase.js';
import {getAccount,onAccountChange} from '../auth-state.js';
import {boundedRequest} from '../firebase/access.js';
import {liveConfig} from '../../live-config.js';
const requests=new Set();
onAccountChange(()=>{for(const controller of requests)controller.abort();requests.clear();});
export async function activityRequest(clubId,{method='GET',body,revision,entryId,cursor}={}){
  if(!/^[0-9a-f-]{36}$/.test(clubId)||entryId&&!/^[0-9a-f-]{36}$/.test(entryId)||cursor&&!/^[0-9a-f-]{36}$/.test(cursor))throw Error('bad_request');
  const url=new URL(liveConfig.endpoint);if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('not_configured');
  url.pathname=`/v1/clubs/${clubId}/activity`+(entryId?'/'+entryId:'');if(cursor)url.searchParams.set('cursor',cursor);
  const owner=getAccount()?.uid,controller=new AbortController();requests.add(controller);const timer=setTimeout(()=>controller.abort(),20000);
  try{
    let auth={};if(owner){const {auth:service}=await boundedRequest(getFirebase(),12000,'club-activity');
      if(service.currentUser?.uid!==owner)throw Error('invalid_token');
      const token=await boundedRequest(service.currentUser.getIdToken(),12000,'club-activity');auth={Authorization:'Bearer '+token};}
    if(owner!==getAccount()?.uid||controller.signal.aborted)throw Error('invalid_token');
    const result=await fetch(url,{method,headers:{...auth,'Content-Type':'application/json',...(revision===undefined?{}:{'If-Match':String(revision)})},
      body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    const value=await result.json();if(!result.ok)throw Error(value.error || 'unavailable');
    if(owner!==getAccount()?.uid||controller.signal.aborted)throw Error('invalid_token');return value;
  }finally{clearTimeout(timer);requests.delete(controller);}
}
export const activityError=error=>error?.message==='conflict'?'media.conflict':error?.message==='quota'?'activity.limit':'activity.unavailable';

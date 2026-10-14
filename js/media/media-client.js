import {getFirebase} from '../firebase/firebase.js';
import {getAccount,onAccountChange} from '../auth-state.js';
import {liveConfig} from '../../live-config.js';
const controllers=new Set(),urls=new Set();let epoch=0;
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
export function resourcePath({kind,id,child=null}) {
  if(!['profile','vehicle','showcase','club','group','rank'].includes(kind)||!safeId(id)||(['rank','showcase'].includes(kind)&&!safeId(child)))throw Error('bad_request');
  return `resources/${kind}/${id}`+(['rank','showcase'].includes(kind)?'/'+child:'');
}
async function headers() {
  const account=getAccount();if(!account)return {};
  const {auth}=await getFirebase();if(auth.currentUser?.uid!==account.uid)throw Error('invalid_token');
  return {Authorization:'Bearer '+await auth.currentUser.getIdToken()};
}
function endpoint(path) {
  const url=new URL(liveConfig.endpoint);if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('not_configured');
  return url.origin+'/v1/media/'+path;
}
export function mediaError(error) {
  return ['invalid_token','access_denied','too_large','invalid_image','quota','rate_limited','conflict','not_configured','not_found'].includes(error?.message)?'media.'+error.message:'media.unavailable';
}
export async function mediaRequest(path,{method='GET',body,revision,extraHeaders={},signal,blob=false}={}) {
  const token=epoch,controller=new AbortController();controllers.add(controller);
  const timeout=setTimeout(()=>controller.abort(),20000),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  try {
    const auth=await headers();if(signal?.aborted||token!==epoch)throw Error('invalid_token');
    const r=await fetch(endpoint(path),{method,body,headers:{...auth,...extraHeaders,...(revision===undefined?{}:{'If-Match':String(revision)})},
      cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
    if(!r.ok){let code;try{code=(await r.json()).error;}catch{}throw Error(code || 'unavailable');}
    const value=blob?await r.blob():await r.json();if(token!==epoch||signal?.aborted)throw Error('invalid_token');return value;
  } finally {clearTimeout(timeout);controllers.delete(controller);signal?.removeEventListener('abort',abort);}
}
export const getMedia=(target,signal)=>mediaRequest(resourcePath(target),{signal});
export const saveMediaTheme=(target,revision,theme,order)=>mediaRequest(resourcePath(target),{method:'PUT',revision,body:JSON.stringify({theme,order}),extraHeaders:{'Content-Type':'application/json'}});
export const removeMedia=(target,slot,revision)=>mediaRequest(resourcePath(target)+'/slots/'+slot,{method:'DELETE',revision});
export async function uploadMedia(target,slot,blob,revision,published,onProgress=()=>{},signal) {
  // XHR exposes actual upload progress without storing credentials in URLs/logs.
  const token=epoch,auth=await headers();if(token!==epoch||signal?.aborted)throw Error('invalid_token');
  return new Promise((resolve,reject)=>{
    const controller=new AbortController();controllers.add(controller);const xhr=new XMLHttpRequest(),abort=()=>xhr.abort();
    controller.signal.addEventListener('abort',abort,{once:true});signal?.addEventListener('abort',abort,{once:true});
    const finish=()=>{controllers.delete(controller);signal?.removeEventListener('abort',abort);};
    xhr.open('POST',endpoint(resourcePath(target)+'/slots/'+slot));xhr.timeout=30000;xhr.withCredentials=false;
    for(const [key,value] of Object.entries({...auth,'Content-Type':blob.type,'If-Match':String(revision),'X-Media-Published':String(published)}))xhr.setRequestHeader(key,value);
    xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(60+Math.round(event.loaded/event.total*35));};
    xhr.onerror=xhr.ontimeout=xhr.onabort=()=>{finish();reject(Error('unavailable'));};
    xhr.onload=()=>{finish();let result;try{result=JSON.parse(xhr.responseText);}catch{reject(Error('unavailable'));return;}
      if(token!==epoch||signal?.aborted){reject(Error('invalid_token'));return;}if(xhr.status<200||xhr.status>=300){reject(Error(result.error || 'unavailable'));return;}onProgress(100);resolve(result);};
    xhr.send(blob);
  });
}
export async function mediaObjectURL(id,signal) {
  if(!safeId(id))throw Error('bad_request');const blob=await mediaRequest('images/'+id,{blob:true,signal});
  if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>1500000)throw Error('invalid_image');
  const url=URL.createObjectURL(blob);urls.add(url);return url;
}
export function releaseMediaURL(url){if(urls.delete(url))URL.revokeObjectURL(url);}
let owner;
onAccountChange(({user})=>{const next=user?.uid || null;if(next===owner)return;owner=next;epoch++;
  for(const c of controllers)c.abort();controllers.clear();for(const url of urls)URL.revokeObjectURL(url);urls.clear();
  document.querySelectorAll('img[data-motodash-media]').forEach(img=>img.remove());
});

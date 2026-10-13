import {getAccount,onAccountChange} from './auth-state.js';
import {liveClient} from './live/live-client.js';
import {loadGroup} from './firebase/groupRepository.js';
import {watchGroup} from './firebase/groupWatch.js';

let owner=null,personal=null,recoverable=null,group=null,groupVehicle=null,visible=false,version=0,release=null,pending=null;
const listeners=new Set(),key=uid=>'moto-dashboard-active-group:'+uid;
const emit=()=>{for(const fn of listeners)fn(getRideContext());};
export function getRideContext() {
  const live=liveClient.getState(),own=live.uid===(getAccount()?.uid || null);
  return {owner,recordingId:personal,recoverableId:recoverable,groupId:own&&live.consent?live.sessionId:group,
    groupVehicle:owner===(getAccount()?.uid || null)?groupVehicle:null,
    sharing:own&&live.consent,connection:own?live.connection:'off',dashboardVisible:visible};
}
export function onRideContext(fn){listeners.add(fn);fn(getRideContext());return ()=>listeners.delete(fn);}
export function setRecordingContext(uid,id,recovery=null){if(uid!==(getAccount()?.uid || null))return;personal=id;recoverable=recovery;emit();}
export function setDashboardVisible(value){visible=Boolean(value);emit();}
export function forgetActiveGroup(id=group){if(id!==group)return;try{if(owner)localStorage.removeItem(key(owner));}catch{} group=null;groupVehicle=null;version++;release?.();release=null;emit();}
function remember(id) {
  if(!owner || !id || group===id)return;release?.();release=null;group=id;groupVehicle=null;version++;
  try{localStorage.setItem(key(owner),JSON.stringify({id,at:Date.now()}));}catch{}emit();
}
export async function verifyRememberedGroup() {
  if(!group || !owner)return false;
  if(liveClient.getState().consent && liveClient.getState().sessionId===group)return true;
  if(pending)return pending;
  const uid=owner,id=group,token=version;
  const task=(async()=>{
    try {
      const model=await loadGroup(uid,id);
      if(owner!==uid || group!==id || version!==token)return false;
      if(!model.participant || model.banned || model.group.state!=='active'){forgetActiveGroup(id);return false;}
      groupVehicle=model.participant.vehicle || null;emit();return true;
    }catch{if(owner===uid && group===id && version===token)forgetActiveGroup(id);return false;}
  })();pending=task;
  try{return await task;}finally{if(pending===task)pending=null;}
}
function observeRemembered() {
  // Live sharing has its existing shared watcher; only inactive remembered context needs this consumer.
  release?.();release=null;
  if(!owner || !group || liveClient.getState().consent)return;
  const id=group,uid=owner;
  release=watchGroup(uid,id,value=>{
    if(owner!==uid || group!==id)return;
    if(!value || value.state!=='active')forgetActiveGroup(id);
    else void verifyRememberedGroup();
  });
}
export async function restoreConflictGroup(id) {
  if(!owner || !/^[0-9a-f-]{36}$/.test(id))return false;
  remember(id);const ok=await verifyRememberedGroup();if(ok)observeRemembered();return ok;
}
onAccountChange(({user})=>{
  const next=user?.uid || null;if(next===owner)return;
  const previous=owner;release?.();release=null;version++;personal=null;recoverable=null;group=null;groupVehicle=null;pending=null;owner=next;
  // Explicit logout/account switch removes the previous live-return hint, not local rides.
  try{if(previous)localStorage.removeItem(key(previous));
    const prior=next?JSON.parse(localStorage.getItem(key(next)) || 'null'):null;
    if(prior && /^[0-9a-f-]{36}$/.test(prior.id) && Date.now()-prior.at<86400000 && Date.now()-prior.at>=0)group=prior.id;
  }catch{}emit();if(group)void verifyRememberedGroup().then(ok=>{if(ok)observeRemembered();});
});
liveClient.onChange(state=>{
  if(state.uid===owner && state.consent){remember(state.sessionId);const self=state.participants.get(state.selfId);if(self)groupVehicle=self.vehicle || null;}
  else if(['ended','accessDenied'].includes(state.connection))forgetActiveGroup();
  observeRemembered();emit();
});

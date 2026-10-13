import {ownDatabase,requestDiagnostic} from './access.js';
import {getAccount,onAccountChange} from '../auth-state.js';
import {effectiveGroup,groupDeadline} from '../data/group-lifecycle.js';

// One shared document listener per account/group, with independent UI consumers.
const watches=new Map();
function close(entry) {
  if(entry.closed)return;
  entry.closed=true;entry.off?.();clearTimeout(entry.timer);
  if(watches.get(entry.key)===entry)watches.delete(entry.key);
}
onAccountChange(({user})=>{for(const entry of watches.values())if(entry.uid!==user?.uid)close(entry);});
addEventListener('online',()=>{for(const entry of watches.values())if(entry.failed)entry.attach();});
export function watchGroup(uid,id,listener) {
  const key=uid+'/'+id;
  let entry=watches.get(key);
  if(!entry) {
    entry={key,uid,id,listeners:new Set(),closed:false,off:null,timer:null,value:null,failed:false,pending:false};watches.set(key,entry);
    const emit=()=>{if(entry.closed||getAccount()?.uid!==uid)return;for(const fn of entry.listeners)fn(entry.value);};
    const expire=()=>{
      if(entry.closed||!entry.value)return;
      entry.value=effectiveGroup(entry.value);emit();
      if(['scheduled','active'].includes(entry.value.state))entry.timer=setTimeout(expire,Math.min(2147483647,Math.max(1,groupDeadline(entry.value)-Date.now())));
    };
    entry.attach=()=>{
      if(entry.closed||entry.pending)return;
      entry.pending=true;entry.failed=false;entry.off?.();entry.off=null;
      void ownDatabase(uid,'group-watch').then(s=>{
      if(entry.closed)return;
      entry.off=s.sdk.onSnapshot(s.sdk.doc(s.db,'groupPages',id),snapshot=>{
        if(entry.closed||getAccount()?.uid!==uid)return;
        clearTimeout(entry.timer);
        entry.value=snapshot.exists()?effectiveGroup(snapshot.data()):null;emit();
        if(entry.value && ['scheduled','active'].includes(entry.value.state)) {
          entry.timer=setTimeout(expire,Math.min(2147483647,Math.max(1,groupDeadline(entry.value)-Date.now())));
        }
      },error=>{
        if(entry.closed)return;
        entry.failed=true;
        dispatchEvent(new CustomEvent('motodash-data-diagnostic',{detail:requestDiagnostic(error,'group-watch')}));
        // Authorization loss clears private live data; a transient outage is handled by its server lease.
        if(error.code==='permission-denied'){entry.value=null;emit();}
      });
      }).catch(error=>{
        if(!entry.closed){entry.failed=true;dispatchEvent(new CustomEvent('motodash-data-diagnostic',{detail:requestDiagnostic(error,'group-watch')}));}
      }).finally(()=>{entry.pending=false;});
    };
    entry.attach();
  }
  else if(entry.failed)entry.attach();
  entry.listeners.add(listener);
  if(entry.value)queueMicrotask(()=>{if(entry.listeners.has(listener))listener(entry.value);});
  return ()=>{entry.listeners.delete(listener);if(!entry.listeners.size)close(entry);};
}

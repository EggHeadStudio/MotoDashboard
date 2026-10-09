import { getAccount } from './auth-state.js';
import { uploadSession, deleteCloudSession } from './firebase/sessionRepository.js';

export function queueRide(session,action='upsert') {
  return {...session,syncAction:action,localRevision:crypto.randomUUID(),syncError:null,routeLoaded:true};
}
export function createSessionSync({uid,store,onChange,onStatus}) {
  let running=null,again=false;
  const current=()=>getAccount()?.uid===uid;
  async function process() {
    if(!uid || !current() || navigator.onLine===false) return;
    onStatus('rides.syncing');
    const records=await store.loadSessions();
    let pending=false;
    for(const job of records.filter(record=>record.syncAction && record.ownerUid===uid)) {
      if(!current()) return;
      try {
        if(job.syncAction==='delete') {
          await deleteCloudSession(uid,job.id);
          if(!current()) return;
          await store.deleteSession(job.id); onChange(null,job.id);
        } else {
          const revision=await uploadSession(uid,job);
          if(!current()) return;
          const record=await store.updateSession(job.id,latest=>{
            const next={...latest,remoteRevisionId:revision};
            if(latest.localRevision===job.localRevision) {next.syncAction=null;next.syncError=null;}
            else again=true;
            return next;
          });
          if(current() && record) onChange(record);
        }
      } catch(error) {
        pending=true;
        if(!current()) return;
        const record=await store.updateSession(job.id,latest=>latest.localRevision===job.localRevision
          ? {...latest,syncError:error.code || 'unavailable'} : null);
        if(current() && record) onChange(record);
      }
    }
    if(current()) onStatus(pending?'rides.pending':'rides.synced');
  }
  function retry() {
    if(running) {again=true;return running;}
    running=process().catch(()=>{if(current()) onStatus('rides.pending');}).finally(()=>{
      running=null;
      if(again) {again=false;retry();}
    });return running;
  }
  return {retry};
}

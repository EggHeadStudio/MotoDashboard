// Origin/account-scoped recorder ownership; server live exclusivity is separate.
export function createRecordingLock({locks=globalThis.navigator?.locks,indexedDB=globalThis.indexedDB,now=()=>Date.now(),onLost=()=>{}}={}) {
  let claim=null,releaseHold=null,timer=null,generation=0,dbPromise=null;
  const nonce=()=>globalThis.crypto?.randomUUID?.() || [Date.now(),Math.random(),Math.random()].join('-');
  const tab=nonce(),TTL=30000;
  const open=()=>dbPromise ||= new Promise((resolve,reject)=>{
    if(!indexedDB){reject(Error('recording-storage-unavailable'));return;}
    const request=indexedDB.open('motodash-recording-ownership',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('leases',{keyPath:'scope'});
    request.onsuccess=()=>resolve(request.result);request.onerror=request.onblocked=()=>reject(Error('recording-storage-unavailable'));
  });
  async function lease(scope,action,nonce) {
    const db=await open();return new Promise((resolve,reject)=>{
      const tx=db.transaction('leases','readwrite'),store=tx.objectStore('leases'),read=store.get(scope);let result=false;
      read.onsuccess=()=>{
        const prior=read.result,time=now(),mine=prior?.tab===tab && prior.nonce===nonce;
        if(action==='release'){if(mine)store.delete(scope);result=true;return;}
        if(action==='renew' && (!mine || prior.until<=time))return;
        if(prior && prior.tab!==tab && prior.until>time)return;
        store.put({scope,tab,nonce,until:time+TTL});result=time+TTL;
      };
      tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(Error('recording-storage-unavailable'));
    });
  }
  function lose(){if(!claim)return;clearInterval(timer);timer=null;claim=null;onLost();}
  async function release() {
    generation++;clearInterval(timer);timer=null;const old=claim;claim=null;
    releaseHold?.();releaseHold=null;
    if(old && !old.web)await lease(old.scope,'release',old.nonce).catch(()=>{});
  }
  async function acquire(uid) {
    const scope='motodash-personal-ride:'+(uid?'account:'+uid:'guest');if(claim?.scope===scope && held())return true;
    await release();const token=generation,claimNonce=nonce();
    if(locks?.request)return new Promise((resolve,reject)=>{
      locks.request(scope,{mode:'exclusive',ifAvailable:true},async lock=>{
        if(!lock || token!==generation){resolve(false);return;}
        claim={scope,web:true};resolve(true);await new Promise(done=>releaseHold=done);
      }).catch(reject);
    });
    const until=await lease(scope,'acquire',claimNonce);
    if(token!==generation){if(until)await lease(scope,'release',claimNonce);return false;}
    if(!until)return false;claim={scope,web:false,until,nonce:claimNonce};
    timer=setInterval(async()=>{
      if(!claim || token!==generation)return;
      try{const renewed=await lease(scope,'renew',claimNonce);if(token!==generation)return;if(!renewed)lose();else claim.until=renewed;}
      catch{if(token===generation)lose();}
    },10000);return true;
  }
  function held(){if(!claim)return false;if(!claim.web && claim.until<=now()){lose();return false;}return true;}
  return {acquire,release,held};
}

// Origin/account-scoped recorder ownership; server live exclusivity is separate.
export function createRecordingLock({locks=globalThis.navigator?.locks,indexedDB=globalThis.indexedDB,now=()=>Date.now(),onLost=()=>{}}={}) {
  let claim=null,releaseHold=null,timer=null,generation=0,dbPromise=null;
  const nonce=()=>globalThis.crypto?.randomUUID?.() || [Date.now(),Math.random(),Math.random()].join('-');
  const tab=nonce(),TTL=30000;
  const open=()=>{
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      let settled=false;
      const done=(db,error)=>{if(settled){db?.close();return;}settled=true;clearTimeout(timeout);if(error)reject(error);else resolve(db);};
      const failure=()=>done(null,Error('recording-storage-unavailable'));
      const timeout=setTimeout(failure,4000);if(!indexedDB){failure();return;}
      let request;try{request=indexedDB.open('motodash-recording-ownership',1);}catch{failure();return;}
      request.onupgradeneeded=()=>request.result.createObjectStore('leases',{keyPath:'scope'});
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();dbPromise=null;lose();};done(db);};
      request.onerror=request.onblocked=failure;
    }).catch(error=>{dbPromise=null;throw error;});return dbPromise;
  };
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

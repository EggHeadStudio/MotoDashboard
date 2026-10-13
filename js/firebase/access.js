import { getFirebase } from './firebase.js';
import { getFirestoreService } from './firestore.js';
import { t } from '../i18n/i18n.js';

const operations = new Set(['data','group-load','group-list','hosting-clubs','group-management','group-edit','group-state','group-approve','group-remove','group-invite','group-admission','group-vehicle','group-status','group-records','group-record-delete','invitation-check','group-create','lobby-list','club-discovery','club-search','club-load','club-list','club-create','club-management','garage-load','garage-change','ride-history','ride-sync','profile','identity-search','identity-load','notifications','group-watch']);
const safeOperation = value => operations.has(value) ? value : 'data';
const diagnostics=[];
export const getDataDiagnostics = () => diagnostics.map(row=>({...row}));
export function requestDiagnostic(error, operation='data') {
  const code=String(error?.code || '').replace(/^(?:firestore|auth)\//,'');
  const kind=code==='permission-denied'?'PERMISSION':code==='failed-precondition'?'PRECONDITION':code==='deadline-exceeded'?'TIMEOUT':code==='offline'?'OFFLINE':['unavailable','network-request-failed'].includes(code)?'NETWORK':'REQUEST';
  return `MD-${kind}/${safeOperation(error?.operation || operation).toUpperCase()}`;
}
export function dataErrorMessage(error) {return `${t(dataErrorKey(error))} [${requestDiagnostic(error)}]`;}
function contextual(error,operation) {
  // Preserve only a safe operation enum; never attach paths, UIDs, payloads or tokens.
  if(error && typeof error==='object') error.operation=safeOperation(operation);
  diagnostics.push({code:requestDiagnostic(error),at:Date.now()});
  if(diagnostics.length>20)diagnostics.shift();
  return error;
}
export async function settleReads(rows,read,concurrency=4) {
  const results=new Array(rows.length);let next=0;
  await Promise.all(Array.from({length:Math.min(concurrency,rows.length)},async()=>{
    while(next<rows.length) {
      const index=next++;
      try {results[index]={status:'fulfilled',value:await read(rows[index])};}
      catch(reason){results[index]={status:'rejected',reason};}
    }
  }));return results;
}

export async function ownDatabase(uid, operation='data') {
  const { auth, app } = await getFirebase();
  if (!auth.currentUser || (uid && auth.currentUser.uid !== uid)) throw dataError('auth-required');
  const ownerUid = auth.currentUser.uid;
  const { db, sdk } = await getFirestoreService();
  if (auth.currentUser?.uid !== ownerUid || db.app.options.projectId !== app.options.projectId) throw dataError('account-changed');
  const assertCurrent = () => {
    if (auth.currentUser?.uid !== ownerUid) throw dataError('account-changed');
  };
  const scopedSDK={...sdk};
  for(const name of ['getDoc','getDocs','runTransaction','setDoc','updateDoc','deleteDoc']) {
    if(!sdk[name]) continue;
    scopedSDK[name]=(...args)=>{
      const promise=(async()=>{
        assertCurrent();
        if(globalThis.navigator?.onLine===false) throw dataError('offline');
        try {return await sdk[name](...args);}
        catch(error) {
          // One retry of a failed READ only. Never replay a timed-out or uncertain write.
          if(['getDoc','getDocs'].includes(name) && error?.code==='unavailable' && globalThis.navigator?.onLine!==false) {
            await new Promise(resolve=>setTimeout(resolve,300));assertCurrent();
            return sdk[name](...args);
          }
          throw error;
        }
      })().then(result=>{assertCurrent();return result;}).catch(error=>{throw contextual(error,operation);});
      promise.operation=safeOperation(operation);return promise;
    };
  }
  return {db,sdk:scopedSDK,uid:ownerUid,assertCurrent};
}
export function dataError(code) { return Object.assign(new Error(code), { code }); }
export function dataErrorKey(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '');
  if (code === 'failed-precondition') return 'data.indexRequired';
  if (code === 'offline') return 'data.offline';
  if (code === 'deadline-exceeded') return 'data.timeout';
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code)) return 'data.network';
  if (code === 'invalid-recipient') return 'data.recipient';
  if (code === 'duplicate-invite') return 'data.duplicateInvite';
  if(code==='invalid-invite') return 'groups.inviteInvalid';
  if(code==='expired-invite') return 'groups.inviteExpired';
  if (['auth-required', 'account-changed', 'unauthenticated'].includes(code)) return 'data.signIn';
  if (code === 'permission-denied') return 'data.denied';
  if (code === 'invalid-input') return 'data.invalid';
  if(code==='showcase-limit')return 'showcase.limit';
  if(code==='affiliation-limit')return 'publicProfile.affiliationLimit';
  if (code === 'conflict') return 'data.conflict';
  if (code === 'deleted') return 'data.deleted';
  return 'data.unexpected';
}
export function boundedRequest(promise, milliseconds = 12000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(contextual(dataError('deadline-exceeded'),promise.operation)), milliseconds);
  })]).finally(() => clearTimeout(timer));
}

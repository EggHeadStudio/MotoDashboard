import {ownDatabase,boundedRequest,requestDiagnostic,dataError} from './access.js';
import {validId} from '../data/schema.js';
import {getAccount} from '../auth-state.js';

export function notificationWrite(tx,s,recipient,type,sourceId,key) {
  tx.set(s.sdk.doc(s.db,'users',recipient,'notifications',key),{
    type,sourceId,actorUid:s.uid,createdAt:s.sdk.serverTimestamp(),readAt:null
  });
}
export function watchNotifications(uid,onRows,onCount,onError) {
  let closed=false;const offs=[];
  const current=()=>!closed&&getAccount()?.uid===uid;
  void ownDatabase(uid,'notifications').then(s=>{
    if(!current())return;
    const collection=s.sdk.collection(s.db,'users',uid,'notifications');
    const failure=error=>{if(current())onError(requestDiagnostic(error,'notifications'));};
    offs.push(s.sdk.onSnapshot(s.sdk.query(collection,s.sdk.orderBy('createdAt','desc'),s.sdk.limit(30)),snapshot=>{
      if(current())onRows(snapshot.docs.map(row=>({id:row.id,...row.data()})));
    },failure));
    // Separate bounded unread query includes older unread items outside the latest page.
    offs.push(s.sdk.onSnapshot(s.sdk.query(collection,s.sdk.where('readAt','==',null),s.sdk.limit(50)),snapshot=>{
      if(current())onCount(snapshot.size,snapshot.size===50);
    },failure));
  }).catch(error=>{if(current())onError(requestDiagnostic(error,'notifications'));});
  return ()=>{closed=true;offs.forEach(off=>off());};
}
export async function markNotificationRead(uid,id) {
  if(!validId(id))throw dataError('invalid-input');
  const s=await ownDatabase(uid,'notifications');
  await boundedRequest(s.sdk.updateDoc(s.sdk.doc(s.db,'users',uid,'notifications',id),{readAt:s.sdk.serverTimestamp()}));
}

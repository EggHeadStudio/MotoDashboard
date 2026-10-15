import {ownDatabase,boundedRequest} from './access.js';
export async function ensureActivityEpoch(uid){
  const s=await ownDatabase(uid,'club-activity'),{sdk,db}=s,ref=sdk.doc(db,'activityEpochs',uid);
  await boundedRequest(sdk.runTransaction(db,async tx=>{const old=await tx.get(ref);s.assertCurrent();
    if(!old.exists())tx.set(ref,{uid,version:1,groupId:null,updatedAt:sdk.serverTimestamp()});
  }));s.assertCurrent();
}
// Blind atomic increment: organizers need no access to another user's private epoch.
export function invalidateGroupActivity(tx,s,uid,groupId){
  tx.set(s.sdk.doc(s.db,'activityEpochs',uid),{uid,version:s.sdk.increment(1),groupId,updatedAt:s.sdk.serverTimestamp()},{merge:true});
}

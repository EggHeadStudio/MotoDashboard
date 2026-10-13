import {ownDatabase,dataError,boundedRequest,settleReads} from './access.js';
import {getFirestoreService} from './firestore.js';
import {publicId,profileDefaults,profileInput,profileProjection} from '../data/public-profile.js';

export async function loadOwnPublicProfile(uid) {
  const s=await ownDatabase(uid,'profile'),record=await boundedRequest(s.sdk.getDoc(s.sdk.doc(s.db,'users',uid,'preferences','publicProfile')));
  return record.exists()?record.data():profileDefaults();
}
export async function savePublicProfile(uid,input) {
  const values=profileInput(input),s=await ownDatabase(uid,'profile'),{sdk,db}=s;
  const ref=sdk.doc(db,'users',uid,'preferences','publicProfile'),userRef=sdk.doc(db,'users',uid);
  return boundedRequest(sdk.runTransaction(db,async tx=>{
    const [prior,user]=await Promise.all([tx.get(ref),tx.get(userRef)]);s.assertCurrent();
    if(!user.exists())throw dataError('invalid-input');
    const settings=prior.exists()?prior.data():profileDefaults();
    if(settings.state==='retired')throw dataError('deleted');
    const id=settings.publicId || crypto.randomUUID();
    const next={...settings,...values,publicId:id,updatedAt:sdk.serverTimestamp()};
    if(!settings.publicId)tx.set(sdk.doc(db,'profileOwners',id),{ownerUid:uid,createdAt:sdk.serverTimestamp()});
    tx.set(ref,next);
    tx.set(sdk.doc(db,'publicProfiles',id),profileProjection(id,next,user.data().displayName,sdk.serverTimestamp()));
    tx.set(sdk.doc(db,'displayProfiles',uid),{displayName:user.data().displayName,publicProfileId:next.visibility==='public'?id:null,updatedAt:sdk.serverTimestamp()});
    return next;
  }));
}
export async function loadPublicProfile(id) {
  if(!publicId(id))return null;
  const {sdk,db}=await getFirestoreService();
  try {
    const record=await boundedRequest(sdk.getDoc(sdk.doc(db,'publicProfiles',id)));
    if(!record.exists())return null;
    const data=record.data();return {profile:data,vehicles:[],affiliations:[]};
  }catch(error) {
    if(error?.code==='permission-denied')return null;
    throw error;
  }
}

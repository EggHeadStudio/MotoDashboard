import {ownDatabase,dataError,boundedRequest,settleReads} from './access.js';
import {getFirestoreService} from './firestore.js';
import {publicId,profileDefaults,profileInput,profileProjection,MAX_SHOWCASE,showcaseProjection} from '../data/public-profile.js';
import {validId,text} from '../data/schema.js';

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
    const data=record.data();
    const children=await settleReads((data.vehicleIds || []).slice(0,MAX_SHOWCASE),async child=>{
      try {const doc=await boundedRequest(sdk.getDoc(sdk.doc(db,'publicProfiles',id,'vehicles',child)));return doc.exists()?doc.data():null;}
      catch(error){if(error?.code==='permission-denied')return null;throw error;}
    },2);
    return {profile:data,vehicles:children.filter(row=>row.status==='fulfilled' && row.value).map(row=>row.value),affiliations:[],partial:children.some(row=>row.status==='rejected')};
  }catch(error) {
    if(error?.code==='permission-denied')return null;
    throw error;
  }
}

export async function prepareShowcaseChange(tx,s,vehicleId) {
  const {sdk,db,uid}=s,ref=sdk.doc(db,'users',uid,'showcaseRefs',vehicleId),mapping=await tx.get(ref);
  if(!mapping.exists())return ()=>{};
  const {profileId,publicId:id}=mapping.data(),prefRef=sdk.doc(db,'users',uid,'preferences','publicProfile');
  const cardRef=sdk.doc(db,'publicProfiles',profileId,'vehicles',id),ownerRef=sdk.doc(db,'profileOwners',profileId,'vehicles',id);
  const [prefs,user,card]=await Promise.all([tx.get(prefRef),tx.get(sdk.doc(db,'users',uid)),tx.get(cardRef)]);
  return vehicle=>{
    const settings=prefs.exists()?prefs.data():null;
    if(vehicle?.visibility==='public' && settings?.state==='active' && card.exists()) {
      tx.set(cardRef,showcaseProjection(id,vehicle,card.data().publicDescription,card.data().createdAt,sdk.serverTimestamp()));return;
    }
    tx.delete(ref);tx.delete(cardRef);tx.delete(ownerRef);
    if(settings?.state==='active') {
      const ids=settings.vehicleIds.filter(value=>value!==id);
      const next={...settings,vehicleIds:ids,featuredVehicle:settings.featuredVehicle===id?(ids[0] || null):settings.featuredVehicle,updatedAt:sdk.serverTimestamp()};
      tx.set(prefRef,next);tx.set(sdk.doc(db,'publicProfiles',profileId),profileProjection(profileId,next,user.data().displayName,sdk.serverTimestamp()));
    }
  };
}
export async function publishShowcaseVehicle(uid,vehicleId,description='') {
  if(!validId(vehicleId))throw dataError('invalid-input');description=text(description,500);
  const prefs=await loadOwnPublicProfile(uid);
  if(!prefs.publicId)await savePublicProfile(uid,prefs); // separate profile opt-in remains private
  const s=await ownDatabase(uid,'profile'),{sdk,db}=s;
  return boundedRequest(sdk.runTransaction(db,async tx=>{
    const prefRef=sdk.doc(db,'users',uid,'preferences','publicProfile'),vehicleRef=sdk.doc(db,'users',uid,'vehicles',vehicleId),ref=sdk.doc(db,'users',uid,'showcaseRefs',vehicleId);
    const [prefs,source,user,mapping]=await Promise.all([tx.get(prefRef),tx.get(vehicleRef),tx.get(sdk.doc(db,'users',uid)),tx.get(ref)]);s.assertCurrent();
    if(!source.exists() || !prefs.exists() || prefs.data().state!=='active')throw dataError('invalid-input');
    const settings=prefs.data(),profileId=settings.publicId,id=mapping.exists()?mapping.data().publicId:crypto.randomUUID();
    const cardRef=sdk.doc(db,'publicProfiles',profileId,'vehicles',id),old=await tx.get(cardRef);
    if(!settings.vehicleIds.includes(id) && settings.vehicleIds.length>=MAX_SHOWCASE)throw dataError('showcase-limit');
    const vehicle={...source.data(),visibility:'public',updatedAt:sdk.serverTimestamp()};
    const ids=[...new Set([...settings.vehicleIds,id])];
    const next={...settings,vehicleIds:ids,featuredVehicle:settings.featuredVehicle || id,updatedAt:sdk.serverTimestamp()};
    tx.set(vehicleRef,vehicle);
    if(!mapping.exists()){
      tx.set(ref,{profileId,publicId:id,createdAt:sdk.serverTimestamp()});
      tx.set(sdk.doc(db,'profileOwners',profileId,'vehicles',id),{sourceVehicleId:vehicleId,sourceCreatedAt:source.data().createdAt,createdAt:sdk.serverTimestamp()});
    }
    tx.set(cardRef,showcaseProjection(id,vehicle,description,old.exists()?old.data().createdAt:sdk.serverTimestamp(),sdk.serverTimestamp()));
    tx.set(prefRef,next);tx.set(sdk.doc(db,'publicProfiles',profileId),profileProjection(profileId,next,user.data().displayName,sdk.serverTimestamp()));
    return id;
  }));
}
export async function unpublishShowcaseVehicle(uid,vehicleId) {
  const s=await ownDatabase(uid,'profile');
  return boundedRequest(s.sdk.runTransaction(s.db,async tx=>{const apply=await prepareShowcaseChange(tx,s,vehicleId);s.assertCurrent();apply(null);}));
}
export async function loadVehicleShowcase(uid,vehicleId) {
  const s=await ownDatabase(uid,'profile');
  const ref=await boundedRequest(s.sdk.getDoc(s.sdk.doc(s.db,'users',uid,'showcaseRefs',vehicleId)));
  if(!ref.exists())return null;
  const m=ref.data(),card=await boundedRequest(s.sdk.getDoc(s.sdk.doc(s.db,'publicProfiles',m.profileId,'vehicles',m.publicId)));
  return card.exists()?card.data():null;
}

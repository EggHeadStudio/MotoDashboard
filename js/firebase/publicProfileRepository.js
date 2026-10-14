import {ownDatabase,dataError,boundedRequest,settleReads} from './access.js';
import {getFirestoreService} from './firestore.js';
import {publicId,profileDefaults,profileInput,profileProjection,MAX_SHOWCASE,showcaseProjection} from '../data/public-profile.js';
import {validId,text} from '../data/schema.js';
import {displayNameInput} from '../data/identity.js';
import {syncProfileDirectory} from './profileDirectory.js';
import {ownerVisitorPolicy,visitorAvailable,visitorVehicle,visitorAffiliation,sameTimestamp} from './profileVisitor.js';

export async function loadOwnPublicProfile(uid,{server=false}={}) {
  const s=await ownDatabase(uid,'profile'),record=await boundedRequest(s.sdk[server?'getDocFromServer':'getDoc'](s.sdk.doc(s.db,'users',uid,'preferences','publicProfile')));
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
    const name=input.displayName===undefined?user.data().displayName:displayNameInput(input.displayName);
    const featured=input.featuredVehicle===undefined?settings.featuredVehicle:input.featuredVehicle || null;
    if(featured!==null && !settings.vehicleIds.includes(featured))throw dataError('invalid-input');
    const next={...settings,...values,publicId:id,featuredVehicle:featured,updatedAt:sdk.serverTimestamp()};
    if(!settings.publicId)tx.set(sdk.doc(db,'profileOwners',id),{ownerUid:uid,createdAt:sdk.serverTimestamp()});
    tx.set(ref,next);
    syncProfileDirectory(tx,sdk,db,next,name);
    if(name!==user.data().displayName)tx.update(userRef,{displayName:name,updatedAt:sdk.serverTimestamp()});
    tx.set(sdk.doc(db,'publicProfiles',id),profileProjection(id,next,name,sdk.serverTimestamp()));
    tx.set(sdk.doc(db,'displayProfiles',uid),{displayName:name,publicProfileId:next.visibility==='public'?id:null,updatedAt:sdk.serverTimestamp()});
    return next;
  }));
}
export async function loadPublicProfile(id) {
  if(!publicId(id))return null;
  const {sdk,db}=await boundedRequest(getFirestoreService(),12000,'profile');
  try {
    const visitor=await ownerVisitorPolicy({sdk,db},id);
    if(visitor && !visitorAvailable(visitor))return null;
    // Visibility is checked on the server on every public opening, never inferred from a cached copy.
    const record=await boundedRequest(sdk.getDocFromServer(sdk.doc(db,'publicProfiles',id)));
    if(!record.exists())return null;
    const data=record.data();
    const children=await settleReads((data.vehicleIds || []).slice(0,MAX_SHOWCASE),async child=>{
      try {const doc=await boundedRequest(sdk.getDocFromServer(sdk.doc(db,'publicProfiles',id,'vehicles',child)));
        if(!doc.exists() || visitor && !await visitorVehicle(visitor,child))return null;return doc.data();}
      catch(error){if(error?.code==='permission-denied')return null;throw error;}
    },2);
    const affiliations=await settleReads((data.affiliationIds || []).slice(0,2),async child=>{
      try {const doc=await boundedRequest(sdk.getDocFromServer(sdk.doc(db,'publicProfiles',id,'affiliations',child)));
        if(!doc.exists() || visitor && !await visitorAffiliation(visitor,child,doc.data()))return null;return doc.data();}
      catch(error){if(error?.code==='permission-denied')return null;throw error;}
    },2);
    if(visitor){const latest=await loadOwnPublicProfile(visitor.uid,{server:true});
      if(latest.publicId!==id || !visitorAvailable({prefs:latest}))return null;
      for(const row of children)if(row.value && !latest.vehicleIds.includes(row.value.id))row.value=null;
      for(const row of affiliations)if(row.value && !latest.affiliationIds.includes(row.value.id))row.value=null;
    }
    return {profile:data,vehicles:children.filter(row=>row.status==='fulfilled' && row.value).map(row=>row.value),
      affiliations:affiliations.filter(row=>row.status==='fulfilled' && row.value).map(row=>row.value),partial:[...children,...affiliations].some(row=>row.status==='rejected')};
  }catch(error) {
    if(error?.code==='permission-denied')return null;
    if(error && typeof error==='object')error.operation='profile';
    throw error;
  }
}

// Bounded by published slots, rather than one status query per private Garage vehicle.
export async function loadShowcaseOverview(uid,vehicles) {
  const prefs=await loadOwnPublicProfile(uid,{server:true}),s=await ownDatabase(uid,'profile');
  const rows=await settleReads(prefs.vehicleIds,async id=>{
    const [mapping,card]=await Promise.all([
      boundedRequest(s.sdk.getDocFromServer(s.sdk.doc(s.db,'profileOwners',prefs.publicId,'vehicles',id))),
      boundedRequest(s.sdk.getDocFromServer(s.sdk.doc(s.db,'publicProfiles',prefs.publicId,'vehicles',id)))
    ]);
    if(!mapping.exists())return null;
    const source=vehicles.find(vehicle=>vehicle.id===mapping.data().sourceVehicleId);
    return {sourceId:mapping.data().sourceVehicleId,id,featured:prefs.featuredVehicle===id,
      available:card.exists() && source?.visibility==='public' && sameTimestamp(source.createdAt,mapping.data().sourceCreatedAt)};
  },2);
  s.assertCurrent();
  return {prefs,entries:rows.filter(row=>row.status==='fulfilled' && row.value).map(row=>row.value),partial:rows.some(row=>row.status==='rejected')};
}

export async function featureShowcaseVehicle(uid,vehicleId) {
  const s=await ownDatabase(uid,'profile'),{sdk,db}=s;
  return boundedRequest(sdk.runTransaction(db,async tx=>{
    const prefRef=sdk.doc(db,'users',uid,'preferences','publicProfile');
    const [pref,user,ref,vehicle]=await Promise.all([tx.get(prefRef),tx.get(sdk.doc(db,'users',uid)),
      tx.get(sdk.doc(db,'users',uid,'showcaseRefs',vehicleId)),tx.get(sdk.doc(db,'users',uid,'vehicles',vehicleId))]);
    if(!pref.exists() || pref.data().state!=='active' || !ref.exists() || !vehicle.exists() || vehicle.data().visibility!=='public')throw dataError('invalid-input');
    const settings=pref.data(),id=ref.data().publicId;
    const [mapping,card]=await Promise.all([tx.get(sdk.doc(db,'profileOwners',settings.publicId,'vehicles',id)),tx.get(sdk.doc(db,'publicProfiles',settings.publicId,'vehicles',id))]);
    if(!settings.vehicleIds.includes(id)||ref.data().profileId!==settings.publicId||!mapping.exists()||!card.exists()
      || !sameTimestamp(mapping.data().sourceCreatedAt,vehicle.data().createdAt))throw dataError('invalid-input');
    s.assertCurrent();const next={...settings,featuredVehicle:id,updatedAt:sdk.serverTimestamp()};
    tx.set(prefRef,next);tx.set(sdk.doc(db,'publicProfiles',settings.publicId),profileProjection(settings.publicId,next,user.data().displayName,sdk.serverTimestamp()));
    syncProfileDirectory(tx,sdk,db,next,user.data().displayName);
  }));
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
      tx.set(prefRef,next);syncProfileDirectory(tx,sdk,db,next,user.data().displayName);tx.set(sdk.doc(db,'publicProfiles',profileId),profileProjection(profileId,next,user.data().displayName,sdk.serverTimestamp()));
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
    tx.set(prefRef,next);syncProfileDirectory(tx,sdk,db,next,user.data().displayName);tx.set(sdk.doc(db,'publicProfiles',profileId),profileProjection(profileId,next,user.data().displayName,sdk.serverTimestamp()));
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
export async function loadOwnProfileCards(uid,settings) {
  const s=await ownDatabase(uid,'profile');
  const user=await boundedRequest(s.sdk.getDoc(s.sdk.doc(s.db,'users',uid)));const displayName=user.exists()?user.data().displayName:'';
  const load=async(kind,ids)=>(await settleReads(ids,async id=>{
    const doc=await boundedRequest(s.sdk.getDoc(s.sdk.doc(s.db,'publicProfiles',settings.publicId,kind,id)));return doc.exists()?doc.data():null;
  },2)).filter(row=>row.status==='fulfilled' && row.value).map(row=>row.value);
  if(!settings.publicId)return {vehicles:[],affiliations:[],displayName};
  const [vehicles,affiliations]=await Promise.all([load('vehicles',settings.vehicleIds),load('affiliations',settings.affiliationIds)]);return {vehicles,affiliations,displayName};
}
export async function publishProfileAffiliation(uid,clubId) {
  if(!validId(clubId))throw dataError('invalid-input');
  const prefs=await loadOwnPublicProfile(uid);if(!prefs.publicId)await savePublicProfile(uid,prefs);
  const s=await ownDatabase(uid,'profile'),{sdk,db}=s;
  return boundedRequest(sdk.runTransaction(db,async tx=>{
    const prefRef=sdk.doc(db,'users',uid,'preferences','publicProfile');
    const [pref,club,member,user]=await Promise.all([tx.get(prefRef),tx.get(sdk.doc(db,'clubs',clubId)),tx.get(sdk.doc(db,'clubs',clubId,'members',uid)),tx.get(sdk.doc(db,'users',uid))]);
    if(!member.exists()||!club.exists()||club.data().visibility!=='public'||!['active','archived'].includes(club.data().state)||pref.data().state!=='active')throw dataError('permission-denied');
    const settings=pref.data(),profile=settings.publicId;
    const mappings=await Promise.all(settings.affiliationIds.map(id=>tx.get(sdk.doc(db,'profileOwners',profile,'affiliations',id))));
    const old=mappings.find(doc=>doc.exists() && doc.data().clubId===clubId);
    const id=old?settings.affiliationIds[mappings.indexOf(old)]:crypto.randomUUID();
    if(!old && settings.affiliationIds.length>=2)throw dataError('affiliation-limit');
    const rank=member.data().rankId?await tx.get(sdk.doc(db,'clubs',clubId,'ranks',member.data().rankId)):null;
    if(!old)tx.set(sdk.doc(db,'profileOwners',profile,'affiliations',id),{clubId,joinedAt:member.data().joinedAt,createdAt:sdk.serverTimestamp()});
    tx.set(sdk.doc(db,'publicProfiles',profile,'affiliations',id),{id,clubId,name:club.data().name,rank:rank?.exists()?rank.data().name:null,updatedAt:sdk.serverTimestamp()});
    const next={...settings,affiliationIds:[...new Set([...settings.affiliationIds,id])],updatedAt:sdk.serverTimestamp()};
    tx.set(prefRef,next);syncProfileDirectory(tx,sdk,db,next,user.data().displayName);tx.set(sdk.doc(db,'publicProfiles',profile),profileProjection(profile,next,user.data().displayName,sdk.serverTimestamp()));return id;
  }));
}
export async function removeProfileAffiliation(uid,id) {
  if(!publicId(id))throw dataError('invalid-input');const s=await ownDatabase(uid,'profile'),{sdk,db}=s;
  return boundedRequest(sdk.runTransaction(db,async tx=>{
    const ref=sdk.doc(db,'users',uid,'preferences','publicProfile'),[pref,user]=await Promise.all([tx.get(ref),tx.get(sdk.doc(db,'users',uid))]);
    if(!pref.exists()||pref.data().state!=='active')throw dataError('invalid-input');
    const settings=pref.data(),profile=settings.publicId,next={...settings,affiliationIds:settings.affiliationIds.filter(value=>value!==id),updatedAt:sdk.serverTimestamp()};
    tx.delete(sdk.doc(db,'publicProfiles',profile,'affiliations',id));tx.delete(sdk.doc(db,'profileOwners',profile,'affiliations',id));
    tx.set(ref,next);syncProfileDirectory(tx,sdk,db,next,user.data().displayName);tx.set(sdk.doc(db,'publicProfiles',profile),profileProjection(profile,next,user.data().displayName,sdk.serverTimestamp()));
  }));
}

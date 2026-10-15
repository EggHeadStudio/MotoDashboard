import { ownDatabase, boundedRequest, dataError } from './access.js';
import { validId, vehicleSnapshot, THEMES } from '../data/schema.js';
import { encodeRoute, decodeRoute, sha256 } from '../data/route-codec.js';

const path = (sdk,db,uid,id,...rest) => sdk.doc(db,'users',uid,'sessions',id,...rest);
export async function uploadSession(uid, session) {
  if (session.ownerUid!==uid || session.status!=='completed' || !validId(session.id)
    || !session.localRevision || !THEMES.includes(session.mapTheme)) throw dataError('invalid-input');
  const service = await ownDatabase(uid, 'ride-sync'); const {db,sdk}=service;
  const encoded = await encodeRoute(session.routePoints);
  const revisionId = await sha256(JSON.stringify([session.localRevision,encoded.routeHash,session.name]));
  const ref = path(sdk,db,uid,session.id);
  const tomb = sdk.doc(db,'users',uid,'sessionTombstones',session.id);
  const immutable = {id:session.id,schemaVersion:1,ownerUid:uid,vehicleId:session.vehicleId || null,
    vehicleSnapshot:vehicleSnapshot(session.vehicleSnapshot),category:session.category || null,
    status:'completed',visibility:'private',startedAt:session.startedAt,endedAt:session.endedAt,
    distanceMeters:session.distanceMeters,movingDurationMs:session.movingDurationMs,
    averageMovingSpeedKmh:session.averageMovingSpeedKmh,maxSpeedKmh:session.maxSpeedKmh,mapTheme:session.mapTheme,
    pointCount:encoded.route.length,chunkCount:encoded.chunks.length,routeHash:encoded.routeHash};
  if(session.ridingIdentity)immutable.ridingIdentity=session.ridingIdentity;
  const mutable = {name:session.name,revisionId,baseRevisionId:session.remoteRevisionId || null,
    clientUpdatedAt:session.updatedAt,updatedAt:sdk.serverTimestamp()};
  const ready = await boundedRequest(sdk.runTransaction(db,async tx=>{
    service.assertCurrent();
    const [deleted,old]=await Promise.all([tx.get(tomb),tx.get(ref)]);
    if(deleted.exists()) throw dataError('deleted');
    if(old.exists()) {
      const prior=old.data();
      if(prior.routeHash!==encoded.routeHash || (prior.revisionId!==revisionId && prior.revisionId!==mutable.baseRevisionId)) throw dataError('conflict');
      if(prior.revisionId!==revisionId) tx.update(ref,mutable);
      return prior.uploadState==='ready';
    }
    tx.set(ref,{...immutable,...mutable,createdAt:sdk.serverTimestamp(),uploadState:'uploading'}); return false;
  }));
  if(ready) { service.assertCurrent(); return revisionId; }
  // Completed route only. Bounded batches and immutable IDs make retries idempotent.
  for(let offset=0;offset<encoded.chunks.length;offset+=32) {
    service.assertCurrent();
    const group=encoded.chunks.slice(offset,offset+32);
    const refs=group.map(chunk=>path(sdk,db,uid,session.id,'routeChunks',String(chunk.sequence).padStart(4,'0')));
    const existing=await boundedRequest(Promise.all(refs.map(ref=>sdk.getDoc(ref))));
    const batch=sdk.writeBatch(db); let changes=0;
    group.forEach((chunk,index)=>{
      if(existing[index].exists()) {
        const old=existing[index].data();
        if(old.pointsJson!==chunk.pointsJson || old.routeHash!==chunk.routeHash) throw dataError('conflict');
      } else { batch.set(refs[index],{schemaVersion:1,ownerUid:uid,sessionId:session.id,...chunk}); changes++; }
    });
    service.assertCurrent(); if(changes) await boundedRequest(batch.commit());
  }
  service.assertCurrent();
  await boundedRequest(sdk.runTransaction(db,async tx=>{
    const [deleted,old]=await Promise.all([tx.get(tomb),tx.get(ref)]); service.assertCurrent();
    if(deleted.exists()) throw dataError('deleted');
    if(!old.exists() || old.data().revisionId!==revisionId) throw dataError('conflict');
    tx.update(ref,{uploadState:'ready',updatedAt:sdk.serverTimestamp()});
  }));
  service.assertCurrent(); return revisionId;
}
export async function deleteCloudSession(uid,id) {
  if(!validId(id)) throw dataError('invalid-input');
  const service=await ownDatabase(uid, 'ride-history'); const {db,sdk}=service;
  const tomb=sdk.doc(db,'users',uid,'sessionTombstones',id);
  await boundedRequest(sdk.runTransaction(db,async tx=>{
    const [old,epoch]=await Promise.all([tx.get(tomb),tx.get(sdk.doc(db,'activityEpochs',uid))]);service.assertCurrent();
    if(!old.exists()){
      tx.set(tomb,{id,ownerUid:uid,deletedAt:sdk.serverTimestamp()});
      if(epoch.exists())tx.set(sdk.doc(db,'activityEpochs',uid),{uid,version:epoch.data().version+1,groupId:null,updatedAt:sdk.serverTimestamp()});
    }
  }));
  while(true) {
    service.assertCurrent();
    const group=await boundedRequest(sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'sessions',id,'routeChunks'),sdk.limit(32))));
    if(group.empty) break;
    const batch=sdk.writeBatch(db); group.docs.forEach(doc=>batch.delete(doc.ref));
    service.assertCurrent();await boundedRequest(batch.commit());
  }
  service.assertCurrent(); await boundedRequest(sdk.deleteDoc(path(sdk,db,uid,id))); service.assertCurrent();
}
export async function listCloudSessions(uid,cursor=null) {
  const service=await ownDatabase(uid, 'ride-history');const {db,sdk}=service;
  const clauses=[sdk.where('uploadState','==','ready'),sdk.orderBy('startedAt','desc')];
  if(cursor) clauses.push(sdk.startAfter(cursor)); clauses.push(sdk.limit(20));
  const result=await boundedRequest(sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'sessions'),...clauses)));
  service.assertCurrent();return {records:result.docs.map(doc=>doc.data()),cursor:result.docs.at(-1) || null,more:result.size===20};
}
export async function getCloudSession(uid,id) {
  if(!validId(id)) throw dataError('invalid-input');
  const s=await ownDatabase(uid, 'ride-history'),result=await boundedRequest(s.sdk.getDoc(path(s.sdk,s.db,uid,id)));
  s.assertCurrent();if(!result.exists()) throw dataError('deleted');
  if(result.data().uploadState!=='ready') throw dataError('conflict');return result.data();
}
export function localFromCloud(record) {
  if(record.schemaVersion!==1 || record.status!=='completed' || record.visibility!=='private'
    || !validId(record.id) || !Number.isFinite(record.startedAt) || !Number.isFinite(record.endedAt)
    || record.endedAt<record.startedAt || !Number.isFinite(record.clientUpdatedAt)
    || !['distanceMeters','movingDurationMs','averageMovingSpeedKmh','maxSpeedKmh'].every(k=>Number.isFinite(record[k]) && record[k]>=0)
    || !Number.isInteger(record.pointCount) || record.pointCount<0 || !Number.isInteger(record.chunkCount)
    || record.chunkCount<0 || record.chunkCount>10000 || !/^[a-f0-9]{64}$/.test(record.routeHash)
    || !/^[a-f0-9]{64}$/.test(record.revisionId) || !THEMES.includes(record.mapTheme)) throw dataError('invalid-input');
  return {...record,schemaVersion:2,updatedAt:record.clientUpdatedAt,remoteRevisionId:record.revisionId,
    routePoints:[],lastAcceptedPoint:null,routeLoaded:false,syncAction:null};
}
export async function cloudDeletionIds(uid) {
  const service=await ownDatabase(uid, 'ride-sync');const {db,sdk}=service;
  const ids=new Set();let cursor=null;
  do {
    const filters=[sdk.orderBy('deletedAt')];if(cursor) filters.push(sdk.startAfter(cursor));filters.push(sdk.limit(100));
    const result=await boundedRequest(sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'sessionTombstones'),...filters)));
    service.assertCurrent();result.docs.forEach(doc=>ids.add(doc.id));cursor=result.size===100?result.docs.at(-1):null;
  } while(cursor);
  return ids;
}
export async function loadCloudRoute(uid,session) {
  if(session.ownerUid!==uid || !validId(session.id)) throw dataError('auth-required');
  const service=await ownDatabase(uid, 'ride-sync');const {db,sdk}=service;
  const chunks=[];let cursor=null;
  do {
    const filters=[sdk.orderBy('sequence')];if(cursor) filters.push(sdk.startAfter(cursor));filters.push(sdk.limit(32));
    const result=await boundedRequest(sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'sessions',session.id,'routeChunks'),...filters)));
    service.assertCurrent();chunks.push(...result.docs.map(doc=>doc.data()));cursor=result.size===32?result.docs.at(-1):null;
    if(chunks.length>10000) throw dataError('invalid-input');
  } while(cursor);
  const routePoints=await decodeRoute(chunks,session); service.assertCurrent();
  return {...session,routePoints,routeLoaded:true};
}

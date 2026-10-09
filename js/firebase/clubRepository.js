import { ownDatabase, boundedRequest, dataError } from './access.js';
import { clubInput, validId, text, ROLES } from '../data/schema.js';
import { roleFor, isManager, canManageMember, canAssignRank } from '../data/permissions.js';

const stamp=sdk=>sdk.serverTimestamp();
const clubRef=(s,id,...parts)=>s.sdk.doc(s.db,'clubs',id,...parts);
const indexRef=(s,uid,id)=>s.sdk.doc(s.db,'users',uid,'clubRefs',id);
const dirRef=(s,id)=>s.sdk.doc(s.db,'clubDirectory',id);
function idCheck(id) {if(!validId(id)) throw dataError('invalid-input');}
function projection(club,sdk) {return {id:club.id,name:club.name,category:club.category,membershipPolicy:club.membershipPolicy,
  primaryColor:club.primaryColor,accentColor:club.accentColor,updatedAt:stamp(sdk)};}
function setDirectory(tx,s,club,previous) {
  if(club.visibility==='public' && club.state==='active') tx.set(dirRef(s,club.id),projection(club,s.sdk));
  else if(previous?.visibility==='public' && previous.state==='active') tx.delete(dirRef(s,club.id));
}
async function clubTransaction(uid,id,action) {
  idCheck(id);const s=await ownDatabase(uid);
  const result=await boundedRequest(s.sdk.runTransaction(s.db,async tx=>{
    const [club,actor]=await Promise.all([tx.get(clubRef(s,id)),tx.get(clubRef(s,id,'members',s.uid))]);
    s.assertCurrent();if(!club.exists()) throw dataError('deleted');
    const data=club.data(),role=roleFor(data,actor.exists()?actor.data():null,s.uid);
    return action(tx,s,data,role);
  }));s.assertCurrent();return result;
}
export async function createClub(uid,input) {
  const fields=clubInput(input),s=await ownDatabase(uid),id=crypto.randomUUID();
  const club={schemaVersion:1,id,ownerUid:s.uid,...fields,state:'active',memberCount:1,lastMembershipUid:s.uid,
    createdAt:stamp(s.sdk),updatedAt:stamp(s.sdk)};
  const batch=s.sdk.writeBatch(s.db);
  batch.set(clubRef(s,id),club);
  batch.set(clubRef(s,id,'members',s.uid),{uid:s.uid,technicalRole:'owner',rankId:null,joinedAt:stamp(s.sdk),updatedAt:stamp(s.sdk)});
  batch.set(indexRef(s,s.uid,id),{uid:s.uid,clubId:id,joinedAt:stamp(s.sdk)});
  if(club.visibility==='public') batch.set(dirRef(s,id),projection(club,s.sdk));
  s.assertCurrent();await boundedRequest(batch.commit());s.assertCurrent();return id;
}
export async function editClub(uid,id,input) {
  const fields=clubInput(input);
  await clubTransaction(uid,id,(tx,s,club,role)=>{
    if(role!=='owner') throw dataError('permission-denied');
    const updated={...club,...fields,updatedAt:stamp(s.sdk)};
    tx.set(clubRef(s,id),updated);setDirectory(tx,s,updated,club);
  });
}
export async function loadClub(uid,id) {
  idCheck(id);const s=await ownDatabase(uid);
  const club=await boundedRequest(s.sdk.getDoc(clubRef(s,id)));s.assertCurrent();
  if(!club.exists()) throw dataError('deleted');
  const [membership,invite,request]=await boundedRequest(Promise.all([
    s.sdk.getDoc(clubRef(s,id,'members',uid)),s.sdk.getDoc(clubRef(s,id,'invites',uid)),s.sdk.getDoc(clubRef(s,id,'joinRequests',uid))]));
  s.assertCurrent();const data=club.data(),own=membership.exists()?membership.data():null;
  return {club:data,membership:own,role:roleFor(data,own,uid),invite:invite.exists()?invite.data():null,
    request:request.exists()?request.data():null};
}
export async function listClubs(uid,ownCursor=null,directoryCursor=null) {
  const s=await ownDatabase(uid);
  const ownFilters=[s.sdk.orderBy('joinedAt','desc')];if(ownCursor) ownFilters.push(s.sdk.startAfter(ownCursor));ownFilters.push(s.sdk.limit(20));
  const dirFilters=[s.sdk.orderBy('name')];if(directoryCursor) dirFilters.push(s.sdk.startAfter(directoryCursor));dirFilters.push(s.sdk.limit(20));
  const [own,directory]=await boundedRequest(Promise.all([
    s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'users',uid,'clubRefs'),...ownFilters)),
    s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'clubDirectory'),...dirFilters))]));
  s.assertCurrent();
  const resolved=await Promise.allSettled(own.docs.map(doc=>loadClub(uid,doc.id)));
  s.assertCurrent();return {own:resolved.filter(r=>r.status==='fulfilled').map(r=>r.value.club),
    partial:resolved.some(r=>r.status==='rejected'),directory:directory.docs.map(doc=>doc.data()),
    ownCursor:own.docs.at(-1) || ownCursor,directoryCursor:directory.docs.at(-1) || directoryCursor,more:own.size===20 || directory.size===20};
}
export async function joinClub(uid,id) {
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    if(role) return;
    const invitation=await tx.get(clubRef(s,id,'invites',uid));
    const expires=invitation.exists() ? invitation.data().expiresAt : null;
    const invited=expires && (expires.toMillis?.() ?? expires.seconds*1000)>Date.now();
    if(club.state!=='active' || (club.membershipPolicy!=='open' && !invited)) throw dataError('permission-denied');
    tx.set(clubRef(s,id,'members',uid),{uid,technicalRole:'member',rankId:null,joinedAt:stamp(s.sdk),updatedAt:stamp(s.sdk)});
    tx.set(indexRef(s,uid,id),{uid,clubId:id,joinedAt:stamp(s.sdk)});
    tx.update(clubRef(s,id),{memberCount:club.memberCount+1,lastMembershipUid:uid,updatedAt:stamp(s.sdk)});
    if(invited) tx.delete(clubRef(s,id,'invites',uid));
  });
}
export async function requestMembership(uid,id) {
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    if(role || club.state!=='active' || club.membershipPolicy!=='approval') throw dataError('permission-denied');
    const ref=clubRef(s,id,'joinRequests',uid),old=await tx.get(ref);
    if(old.exists()) throw dataError('conflict');
    tx.set(ref,{uid,state:'pending',requestedAt:stamp(s.sdk),decidedAt:null,decidedBy:null});
  });
}
export async function cancelRequest(uid,id) {
  await clubTransaction(uid,id,async(tx,s)=>{
    const ref=clubRef(s,id,'joinRequests',uid),old=await tx.get(ref);
    if(old.exists() && old.data().state==='approved') throw dataError('permission-denied');
    tx.delete(ref);
  });
}
export async function decideRequest(uid,id,targetUid,approve) {
  idCheck(targetUid);
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    if(!isManager(role) || club.state!=='active') throw dataError('permission-denied');
    const requestRef=clubRef(s,id,'joinRequests',targetUid),memberRef=clubRef(s,id,'members',targetUid);
    const [request,member]=await Promise.all([tx.get(requestRef),tx.get(memberRef)]);
    if(!request.exists() || request.data().state!=='pending' || (approve && member.exists())) throw dataError('conflict');
    if(approve) {
      tx.set(memberRef,{uid:targetUid,technicalRole:'member',rankId:null,joinedAt:stamp(s.sdk),updatedAt:stamp(s.sdk)});
      tx.set(indexRef(s,targetUid,id),{uid:targetUid,clubId:id,joinedAt:stamp(s.sdk)});
      tx.update(clubRef(s,id),{memberCount:club.memberCount+1,lastMembershipUid:targetUid,updatedAt:stamp(s.sdk)});
    }
    tx.update(requestRef,{state:approve?'approved':'rejected',decidedAt:stamp(s.sdk),decidedBy:uid});
  });
}
export async function inviteMember(uid,id,targetUid) {
  idCheck(targetUid);
  await clubTransaction(uid,id,(tx,s,club,role)=>{
    if(!isManager(role) || club.state!=='active' || targetUid===uid) throw dataError('permission-denied');
    tx.set(clubRef(s,id,'invites',targetUid),{uid:targetUid,invitedBy:uid,
      expiresAt:s.sdk.Timestamp.fromMillis(Date.now()+7*86400000),createdAt:stamp(s.sdk)});
  });
}
export async function removeMember(uid,id,targetUid=uid) {
  idCheck(targetUid);
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    const ref=clubRef(s,id,'members',targetUid),target=await tx.get(ref);
    if(!target.exists() || targetUid===club.ownerUid || (uid!==targetUid && !canManageMember(role,uid,target.data()))) throw dataError('permission-denied');
    tx.delete(ref);tx.delete(indexRef(s,targetUid,id));
    tx.update(clubRef(s,id),{memberCount:club.memberCount-1,lastMembershipUid:targetUid,updatedAt:stamp(s.sdk)});
  });
}
export async function listClubRecords(uid,id,collectionName,cursor=null) {
  idCheck(id);
  if(!['members','joinRequests','invites','ranks'].includes(collectionName)) throw dataError('invalid-input');
  const s=await ownDatabase(uid),filters=[];
  if(collectionName==='joinRequests') filters.push(s.sdk.where('state','==','pending'));
  // Default document-ID order works without composite indexes; cursor is a document snapshot.
  if(cursor) filters.push(s.sdk.startAfter(cursor));filters.push(s.sdk.limit(50));
  const result=await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'clubs',id,collectionName),...filters)));
  s.assertCurrent();return {records:result.docs.map(doc=>doc.data()),cursor:result.docs.at(-1)||null,more:result.size===50};
}
export async function archiveClub(uid,id) {
  await clubTransaction(uid,id,(tx,s,club,role)=>{
    if(role!=='owner') throw dataError('permission-denied');
    const updated={...club,state:'archived',updatedAt:stamp(s.sdk)};
    tx.set(clubRef(s,id),updated);setDirectory(tx,s,updated,club);
  });
}
export async function setMember(uid,id,targetUid,technicalRole,rankId) {
  idCheck(targetUid);if(!ROLES.includes(technicalRole) || (rankId!==null && !validId(rankId))) throw dataError('invalid-input');
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    const ref=clubRef(s,id,'members',targetUid),member=await tx.get(ref);
    if(!member.exists()) throw dataError('deleted');
    const prior=member.data(),roleChanged=technicalRole!==prior.technicalRole;
    if((roleChanged && !canManageMember(role,uid,prior,technicalRole)) || (!roleChanged && !canAssignRank(role,uid,prior))) throw dataError('permission-denied');
    if(rankId) {const rank=await tx.get(clubRef(s,id,'ranks',rankId));if(!rank.exists()) throw dataError('invalid-input');}
    tx.update(ref,{technicalRole,rankId,updatedAt:stamp(s.sdk)});
  });
}
export async function saveRank(uid,id,rankId,input) {
  const name=text(input.name,64,true),displayOrder=Number(input.displayOrder);
  if(!Number.isInteger(displayOrder) || displayOrder<0 || displayOrder>999) throw dataError('invalid-input');
  const target=rankId || crypto.randomUUID();idCheck(target);
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    if(!isManager(role)) throw dataError('permission-denied');
    const ref=clubRef(s,id,'ranks',target),prior=await tx.get(ref);
    if(rankId && !prior.exists()) throw dataError('deleted');
    tx.set(ref,{id:target,name,displayOrder,createdAt:prior.exists()?prior.data().createdAt:stamp(s.sdk),updatedAt:stamp(s.sdk)});
  });return target;
}
export async function getRank(uid,id,rankId) {
  idCheck(id);idCheck(rankId);const s=await ownDatabase(uid);
  const rank=await boundedRequest(s.sdk.getDoc(clubRef(s,id,'ranks',rankId)));s.assertCurrent();
  return rank.exists()?rank.data():null;
}
export async function updateBranding(uid,id,input) {
  await clubTransaction(uid,id,(tx,s,club,role)=>{
    if(!isManager(role)) throw dataError('permission-denied');
    const validated=clubInput({...club,...input});
    const fields={description:validated.description,primaryColor:validated.primaryColor,accentColor:validated.accentColor,
      routeColor:validated.routeColor,mapTheme:validated.mapTheme,links:validated.links,updatedAt:stamp(s.sdk)};
    tx.update(clubRef(s,id),fields);setDirectory(tx,s,{...club,...fields},club);
  });
}
export async function loadWall(uid,id) {
  idCheck(id);const s=await ownDatabase(uid);
  const wall=await boundedRequest(s.sdk.getDoc(clubRef(s,id,'wall','info')));s.assertCurrent();
  return wall.exists()?wall.data():null;
}
export async function saveWall(uid,id,input) {
  const content=text(input,4000);
  await clubTransaction(uid,id,async(tx,s,club,role)=>{
    if(!isManager(role)) throw dataError('permission-denied');
    const ref=clubRef(s,id,'wall','info'),old=await tx.get(ref);
    tx.set(ref,{text:content,updatedBy:uid,createdAt:old.exists()?old.data().createdAt:stamp(s.sdk),updatedAt:stamp(s.sdk)});
  });
}
export async function deleteRank(uid,id,rankId) {
  idCheck(rankId);await clubTransaction(uid,id,(tx,s,club,role)=>{
    if(!isManager(role)) throw dataError('permission-denied');tx.delete(clubRef(s,id,'ranks',rankId));
  });
}
export async function deleteClub(uid,id) {
  const view=await loadClub(uid,id);
  if(view.role!=='owner' || view.club.state!=='archived' || view.club.memberCount!==1) throw dataError('permission-denied');
  const s=await ownDatabase(uid);
  // Archive blocks new membership. Bounded cleanup can safely resume after failure.
  for(const name of ['joinRequests','invites','ranks']) while(true) {
    s.assertCurrent();const docs=await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'clubs',id,name),s.sdk.limit(32))));
    if(docs.empty) break;
    const batch=s.sdk.writeBatch(s.db);docs.docs.forEach(doc=>batch.delete(doc.ref));
    s.assertCurrent();await boundedRequest(batch.commit());
  }
  s.assertCurrent();const wall=await boundedRequest(s.sdk.getDoc(clubRef(s,id,'wall','info')));
  if(wall.exists()) {s.assertCurrent();await boundedRequest(s.sdk.deleteDoc(clubRef(s,id,'wall','info')));}
  await clubTransaction(uid,id,(tx,s,club,role)=>{
    if(role!=='owner' || club.state!=='archived' || club.memberCount!==1) throw dataError('conflict');
    tx.delete(clubRef(s,id,'members',uid));tx.delete(indexRef(s,uid,id));tx.delete(dirRef(s,id));tx.delete(clubRef(s,id));
  });
}

import { ownDatabase, boundedRequest, dataError } from './access.js';
import { validId } from '../data/schema.js';
import { groupInput, groupPage, lobbyEligible } from '../data/group-session.js';

const checkId = id => { if (!validId(id)) throw dataError('invalid-input'); };
const ref = (s, id, ...parts) => s.sdk.doc(s.db, 'groupSessions', id, ...parts);
const pageRef = (s, id) => s.sdk.doc(s.db, 'groupPages', id);
const lobbyRef = (s, id) => s.sdk.doc(s.db, 'lobbyEvents', id);
const indexRef = (s, uid, id) => s.sdk.doc(s.db, 'users', uid, 'groupRefs', id);
const stamp = s => s.sdk.serverTimestamp();
export async function createGroup(uid, input) {
  const data = groupInput(input), s = await ownDatabase(uid), id = crypto.randomUUID();
  await boundedRequest(s.sdk.runTransaction(s.db, async tx => {
    s.assertCurrent();
    const identity = await tx.get(s.sdk.doc(s.db, 'displayProfiles', uid));
    if (!identity.exists()) throw dataError('permission-denied');
    let clubName = '';
    if (data.clubId) {
      const club = await tx.get(s.sdk.doc(s.db, 'clubs', data.clubId));
      const member = await tx.get(s.sdk.doc(s.db, 'clubs', data.clubId, 'members', uid));
      if (!club.exists() || club.data().state !== 'active' || !member.exists()
        || !['owner', 'admin', 'host'].includes(member.data().technicalRole)) throw dataError('permission-denied');
      clubName = club.data().name;
    }
    const group = {...data, id, schemaVersion: 1, creatorUid: uid, hostName: identity.data().displayName,
      clubName, state: 'scheduled', participantCount: 1, lastParticipantUid: uid, createdAt: stamp(s), updatedAt: stamp(s)};
    tx.set(ref(s, id), group); tx.set(pageRef(s, id), groupPage(group));
    if(lobbyEligible(group)) tx.set(lobbyRef(s,id),groupPage(group));
    tx.set(ref(s, id, 'participants', uid), {uid, vehicleId: null, vehicle: null, clubIdentity:null, status: 'ok', joinedAt: stamp(s), updatedAt: stamp(s)});
    tx.set(indexRef(s, uid, id), {uid, sessionId: id, joinedAt: stamp(s)});
  }));
  s.assertCurrent(); return id;
}
export async function loadGroup(uid, id) {
  checkId(id); const s = await ownDatabase(uid);
  const page = await boundedRequest(s.sdk.getDoc(pageRef(s, id))); s.assertCurrent();
  if (!page.exists()) throw dataError('deleted');
  const participant = await boundedRequest(s.sdk.getDoc(ref(s, id, 'participants', uid))); s.assertCurrent();
  let group = page.data(), manager = false;
  if (participant.exists()) {
    const canonical = await boundedRequest(s.sdk.getDoc(ref(s, id))); s.assertCurrent(); group = canonical.data();
    manager = group.creatorUid === uid;
  }
  if (group.clubId) {
    // Own membership only; an outsider must not enumerate another Club's members.
    try {
      const membership = await boundedRequest(s.sdk.getDoc(s.sdk.doc(s.db, 'clubs', group.clubId, 'members', uid)));
      s.assertCurrent();
      manager ||= membership.exists() && ['owner', 'admin'].includes(membership.data().technicalRole);
    } catch (error) { if (error.code !== 'permission-denied') throw error; }
    if (manager && !participant.exists()) { const canonical = await s.sdk.getDoc(ref(s, id)); s.assertCurrent(); group = canonical.data(); }
  }
  const [request, invitation, banned] = await boundedRequest(Promise.all(['joinRequests', 'invites', 'bans'].map(path=>s.sdk.getDoc(ref(s,id,path,uid)))));
  s.assertCurrent();
  return {group, participant: participant.exists() ? participant.data() : null, manager,
    request: request.exists() ? request.data() : null, invite: invitation.exists() ? invitation.data() : null, banned: banned.exists()};
}
export async function listMyGroups(uid, cursor = null) {
  const s = await ownDatabase(uid), filters = [s.sdk.orderBy('joinedAt', 'desc'), s.sdk.limit(20)];
  if (cursor) filters.push(s.sdk.startAfter(cursor));
  const records = await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db, 'users', uid, 'groupRefs'), ...filters)));
  const loaded = await Promise.allSettled(records.docs.map(row => loadGroup(uid, row.data().sessionId))); s.assertCurrent();
  return {groups: loaded.filter(row => row.status === 'fulfilled').map(row => row.value.group),
    partial: loaded.some(row => row.status === 'rejected'), cursor: records.docs.at(-1), more: records.size === 20};
}
async function groupTransaction(uid, id, fn) {
  checkId(id); const s = await ownDatabase(uid);
  const result = await boundedRequest(s.sdk.runTransaction(s.db, async tx => {
    s.assertCurrent(); const snapshot = await tx.get(ref(s, id));
    if (!snapshot.exists()) throw dataError('deleted');
    const group = snapshot.data();
    let manager = group.creatorUid === uid;
    if (group.clubId) {
      const club = await tx.get(s.sdk.doc(s.db, 'clubs', group.clubId));
      const member = await tx.get(s.sdk.doc(s.db, 'clubs', group.clubId, 'members', uid));
      const role = member.exists() ? member.data().technicalRole : null;
      manager = club.exists() && ['active', 'archived'].includes(club.data().state)
        && (['owner', 'admin'].includes(role) || (group.creatorUid === uid && role === 'host'));
    }
    if (!manager) throw dataError('permission-denied');
    return fn(tx, s, group);
  }));
  s.assertCurrent(); return result;
}
function saveGroup(tx, s, group, changes) {
  const next = {...group, ...changes, updatedAt: stamp(s)};
  tx.update(ref(s, group.id), {...changes, updatedAt: next.updatedAt});
  tx.set(pageRef(s, group.id), groupPage(next));
  if(lobbyEligible(next)) tx.set(lobbyRef(s,group.id),groupPage(next));
  else if(lobbyEligible(group)) tx.delete(lobbyRef(s,group.id));
}
export async function editGroup(uid, id, input) {
  await groupTransaction(uid, id, (tx, s, group) => {
    if (!['scheduled', 'active'].includes(group.state)) throw dataError('permission-denied');
    const data = groupInput({...input, clubId: group.clubId}); delete data.clubId;
    if (data.maxParticipants !== null && data.maxParticipants < group.participantCount) throw dataError('invalid-input');
    saveGroup(tx, s, group, data);
  });
}
export async function setGroupState(uid, id, state) {
  await groupTransaction(uid, id, (tx, s, group) => {
    const allowed = {scheduled: ['active', 'cancelled'], active: ['completed', 'cancelled']};
    if (!allowed[group.state]?.includes(state)) throw dataError('permission-denied');
    saveGroup(tx, s, group, {state});
  });
}
const expiresMillis = timestamp => timestamp?.toMillis?.() ?? (timestamp?.seconds * 1000);
async function admissionTransaction(uid,id,fn) {
  checkId(id); const s=await ownDatabase(uid);
  const result=await boundedRequest(s.sdk.runTransaction(s.db,async tx=>{
    s.assertCurrent();
    const page=await tx.get(pageRef(s,id));
    if(!page.exists()) throw dataError('deleted');
    const participant=await tx.get(ref(s,id,'participants',uid));
    const invite=await tx.get(ref(s,id,'invites',uid));
    const request=await tx.get(ref(s,id,'joinRequests',uid));
    const ban=await tx.get(ref(s,id,'bans',uid));
    return fn(tx,s,page.data(),participant.exists()?participant.data():null,
      invite.exists()?invite.data():null,request.exists()?request.data():null,ban.exists());
  }));s.assertCurrent();return result;
}
async function ownClubIdentity(tx,s,group,share) {
  if(!share || !group.clubId) return null;
  const member=await tx.get(s.sdk.doc(s.db,'clubs',group.clubId,'members',s.uid));
  if(!member.exists()) return null;
  const rankId=member.data().rankId;
  const rank=rankId?await tx.get(s.sdk.doc(s.db,'clubs',group.clubId,'ranks',rankId)):null;
  return {name:group.clubName,rank:rank?.exists()?rank.data().name:null};
}
export async function joinGroup(uid,id,vehicleId=null,token=null,shareClub=false) {
  if(vehicleId) checkId(vehicleId);
  await admissionTransaction(uid,id,async(tx,s,group,participant,invite,request,banned)=>{
    if(participant) return;
    const invited=invite && expiresMillis(invite.expiresAt)>Date.now() && (!token || token===invite.token);
    if((token && !invited) || banned || !['scheduled','active'].includes(group.state)
      || group.participantCount>=50 || (group.maxParticipants && group.participantCount>=group.maxParticipants)
      || !(group.joiningPolicy==='open' || invited || (group.joiningPolicy==='approval' && request?.state==='approved')))
      throw dataError('permission-denied');
    const vehicle=vehicleId ? await tx.get(s.sdk.doc(s.db,'users',uid,'vehicles',vehicleId)) : null;
    if(vehicleId && !vehicle?.exists()) throw dataError('invalid-input');
    const clubIdentity=await ownClubIdentity(tx,s,group,shareClub);
    tx.set(ref(s,id,'participants',uid),{uid,vehicleId,vehicle:vehicle?.exists()?{nickname:vehicle.data().nickname,category:vehicle.data().category}:null,
      clubIdentity,status:'ok',joinedAt:stamp(s),updatedAt:stamp(s)});
    tx.set(indexRef(s,uid,id),{uid,sessionId:id,joinedAt:stamp(s)});
    saveGroup(tx,s,group,{participantCount:group.participantCount+1,lastParticipantUid:uid});
    if(invited) tx.delete(ref(s,id,'invites',uid));
    if(request) tx.delete(ref(s,id,'joinRequests',uid));
  });
}
export async function leaveGroup(uid,id) {
  // Participants can read canonical identity; creator remains the retained founder.
  const loaded=await loadGroup(uid,id);
  if(loaded.group.creatorUid===uid) throw dataError('permission-denied');
  await admissionTransaction(uid,id,(tx,s,group,participant)=>{
    if(!participant) return;
    tx.delete(ref(s,id,'participants',uid));tx.delete(indexRef(s,uid,id));
    saveGroup(tx,s,group,{participantCount:group.participantCount-1,lastParticipantUid:uid});
  });
}
export async function requestGroup(uid,id) {
  await admissionTransaction(uid,id,(tx,s,group,participant,invite,request,banned)=>{
    if(banned || participant || request || group.joiningPolicy!=='approval' || !['scheduled','active'].includes(group.state)) throw dataError('permission-denied');
    tx.set(ref(s,id,'joinRequests',uid),{uid,state:'pending',requestedAt:stamp(s),decidedAt:null,decidedBy:null});
  });
}
export async function decideGroupRequest(uid,id,target,approve) {
  checkId(target);await groupTransaction(uid,id,async(tx,s,group)=>{
    const request=await tx.get(ref(s,id,'joinRequests',target));
    if(!request.exists() || request.data().state!=='pending' || !['scheduled','active'].includes(group.state)) throw dataError('permission-denied');
    tx.update(ref(s,id,'joinRequests',target),{state:approve?'approved':'rejected',decidedBy:uid,decidedAt:stamp(s)});
  });
}
export async function removeGroupParticipant(uid,id,target) {
  checkId(target);await groupTransaction(uid,id,async(tx,s,group)=>{
    const participant=await tx.get(ref(s,id,'participants',target));
    if(!participant.exists() || group.creatorUid===target || uid===target) throw dataError('permission-denied');
    tx.delete(ref(s,id,'participants',target));tx.delete(indexRef(s,target,id));
    tx.set(ref(s,id,'bans',target),{uid:target,removedBy:uid,removedAt:stamp(s)});
    saveGroup(tx,s,group,{participantCount:group.participantCount-1,lastParticipantUid:target});
  });
}
export async function selectGroupVehicle(uid,id,vehicleId,shareClub=false) {
  checkId(id);if(vehicleId) checkId(vehicleId);const s=await ownDatabase(uid);
  await boundedRequest(s.sdk.runTransaction(s.db,async tx=>{
    const group=await tx.get(ref(s,id));
    const vehicle=vehicleId?await tx.get(s.sdk.doc(s.db,'users',uid,'vehicles',vehicleId)):null;
    s.assertCurrent();if(vehicleId && !vehicle?.exists()) throw dataError('invalid-input');
    const clubIdentity=await ownClubIdentity(tx,s,group.data(),shareClub);
    tx.update(ref(s,id,'participants',uid),{vehicleId,vehicle:vehicle?.exists()?{nickname:vehicle.data().nickname,category:vehicle.data().category}:null,clubIdentity,updatedAt:stamp(s)});
  }));s.assertCurrent();
}
export async function setRiderStatus(uid,id,status) {
  checkId(id);if(!['ok','fuel','mechanical','help'].includes(status)) throw dataError('invalid-input');
  const s=await ownDatabase(uid);await boundedRequest(s.sdk.runTransaction(s.db,async tx=>{
    const group=await tx.get(ref(s,id));
    s.assertCurrent();if(!group.exists() || !['scheduled','active'].includes(group.data().state)) throw dataError('permission-denied');
    tx.update(ref(s,id,'participants',uid),{status,updatedAt:stamp(s)});
  }));s.assertCurrent();
}
export async function listGroupRecords(uid,id,path,cursor=null) {
  checkId(id);if(!['participants','joinRequests','invites'].includes(path)) throw dataError('invalid-input');
  const s=await ownDatabase(uid), filters=[s.sdk.orderBy(path==='participants'?'joinedAt':path==='invites'?'createdAt':'requestedAt'),s.sdk.limit(20)];
  if(cursor) filters.push(s.sdk.startAfter(cursor));
  const page=await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'groupSessions',id,path),...filters)));s.assertCurrent();
  return {records:page.docs.map(row=>row.data()),cursor:page.docs.at(-1),more:page.size===20};
}
export async function inviteGroup(uid,id,target) {
  checkId(target);const token=crypto.randomUUID();
  await groupTransaction(uid,id,(tx,s,group)=>{
    if(!['scheduled','active'].includes(group.state) || uid===target) throw dataError('permission-denied');
    tx.set(ref(s,id,'invites',target),{uid:target,token,invitedBy:uid,createdAt:stamp(s),expiresAt:s.sdk.Timestamp.fromMillis(Date.now()+7*86400000)});
  });return token;
}
export async function clearGroupRecord(uid,id,path,target=uid) {
  checkId(id);checkId(target);if(!['invites','joinRequests'].includes(path)) throw dataError('invalid-input');
  const s=await ownDatabase(uid);await boundedRequest(s.sdk.deleteDoc(ref(s,id,path,target)));s.assertCurrent();
}
export async function resolveGroupInvitation(uid,id,token) {
  checkId(id);if(typeof token!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(token)) throw dataError('invalid-invite');
  const s=await ownDatabase(uid);let snapshot;
  try {
    const member=await boundedRequest(s.sdk.getDoc(ref(s,id,'participants',uid)));s.assertCurrent();
    if(member.exists()) return {accepted:true};
  } catch(error) {if(error.code==='permission-denied') throw dataError('invalid-invite');throw error;}
  try {snapshot=await boundedRequest(s.sdk.getDoc(ref(s,id,'invites',uid)));}
  catch(error) {if(error.code==='permission-denied') throw dataError('invalid-invite');throw error;}
  s.assertCurrent();if(!snapshot.exists() || snapshot.data().token!==token) throw dataError('invalid-invite');
  if(expiresMillis(snapshot.data().expiresAt)<=Date.now()) throw dataError('expired-invite');
  try {
    const page=await boundedRequest(s.sdk.getDoc(pageRef(s,id)));s.assertCurrent();
    if(!page.exists() || !['scheduled','active'].includes(page.data().state)) throw dataError('invalid-invite');
  } catch(error) {if(error.code==='permission-denied') throw dataError('invalid-invite');throw error;}
  return snapshot.data();
}

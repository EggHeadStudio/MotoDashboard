import { ownDatabase, boundedRequest, dataError } from './access.js';
import { validId } from '../data/schema.js';
import { groupInput, groupPage } from '../data/group-session.js';

const checkId = id => { if (!validId(id)) throw dataError('invalid-input'); };
const ref = (s, id, ...parts) => s.sdk.doc(s.db, 'groupSessions', id, ...parts);
const pageRef = (s, id) => s.sdk.doc(s.db, 'groupPages', id);
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
    tx.set(ref(s, id, 'participants', uid), {uid, vehicleId: null, vehicle: null, status: 'ok', joinedAt: stamp(s), updatedAt: stamp(s)});
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
  return {group, participant: participant.exists() ? participant.data() : null, manager};
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

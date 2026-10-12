import { getFirebase } from './firebase.js';
import { getFirestoreService } from './firestore.js';

export async function ownDatabase(uid) {
  const { auth, app } = await getFirebase();
  if (!auth.currentUser || (uid && auth.currentUser.uid !== uid)) throw dataError('auth-required');
  const ownerUid = auth.currentUser.uid;
  const { db, sdk } = await getFirestoreService();
  if (auth.currentUser?.uid !== ownerUid || db.app.options.projectId !== app.options.projectId) throw dataError('account-changed');
  return { db, sdk, uid: ownerUid, assertCurrent() {
    if (auth.currentUser?.uid !== ownerUid) throw dataError('account-changed');
  } };
}
export function dataError(code) { return Object.assign(new Error(code), { code }); }
export function dataErrorKey(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '');
  if (code === 'failed-precondition') return 'data.indexRequired';
  if (['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(code)) return 'data.network';
  if (code === 'invalid-recipient') return 'data.recipient';
  if (code === 'duplicate-invite') return 'data.duplicateInvite';
  if(code==='invalid-invite') return 'groups.inviteInvalid';
  if(code==='expired-invite') return 'groups.inviteExpired';
  if (['auth-required', 'account-changed', 'unauthenticated'].includes(code)) return 'data.signIn';
  if (code === 'permission-denied') return 'data.denied';
  if (code === 'invalid-input') return 'data.invalid';
  if (code === 'conflict') return 'data.conflict';
  if (code === 'deleted') return 'data.deleted';
  return 'data.unexpected';
}
export function boundedRequest(promise, milliseconds = 12000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(dataError('unavailable')), milliseconds);
  })]).finally(() => clearTimeout(timer));
}

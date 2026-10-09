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
  if (['auth-required', 'account-changed'].includes(error?.code)) return 'data.signIn';
  if (error?.code === 'permission-denied') return 'data.denied';
  if (error?.code === 'invalid-input') return 'data.invalid';
  if (error?.code === 'conflict') return 'data.conflict';
  if (error?.code === 'deleted') return 'data.deleted';
  return 'data.unavailable';
}
export function boundedRequest(promise, milliseconds = 12000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(dataError('unavailable')), milliseconds);
  })]).finally(() => clearTimeout(timer));
}

import { ownDatabase, boundedRequest, dataError } from './access.js';
import { validId, text } from '../data/schema.js';
import { onAccountChange } from '../auth-state.js';

// Minimal display identity only; never fetch another user's private /users document.
const cache = new Map();
let owner = null;
onAccountChange(({user}) => { owner = user?.uid || null; cache.clear(); });
export async function loadDisplayProfiles(uid, targets) {
  const s = await ownDatabase(uid,'identity-load'), expectedOwner = owner;
  const ids = [...new Set(targets)].filter(validId).slice(0, 50);
  const result = new Map();
  await boundedRequest(Promise.all(ids.map(async target => {
    const saved = cache.get(target);
    let data = saved?.expires > Date.now() ? saved.data : undefined;
    if (data === undefined) {
      const record = await s.sdk.getDoc(s.sdk.doc(s.db, 'displayProfiles', target));
      s.assertCurrent();
      data = record.exists() ? { displayName: record.data().displayName } : null;
      if (owner === expectedOwner) cache.set(target, {data, expires: Date.now() + 60000});
    }
    result.set(target, data);
  })));
  s.assertCurrent();
  if (owner !== expectedOwner) throw dataError('account-changed');
  return result;
}
export async function searchDisplayProfiles(uid, prefix) {
  const name = text(prefix, 64, true), s = await ownDatabase(uid,'identity-search');
  const page = await boundedRequest(s.sdk.getDocs(s.sdk.query(
    s.sdk.collection(s.db, 'displayProfiles'), s.sdk.where('displayName', '>=', name),
    s.sdk.where('displayName', '<=', name + '\uf8ff'), s.sdk.orderBy('displayName'), s.sdk.limit(10))));
  s.assertCurrent();
  return page.docs.map(record => ({uid: record.id, displayName: record.data().displayName}));
}

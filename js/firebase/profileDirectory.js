import {ownDatabase, boundedRequest, dataError} from './access.js';

export const PEOPLE_PAGE_SIZE = 10;
// Firestore Rules lower() folds ASCII only. Explicit EN/FI folding preserves every other script.
export const normalizedSearchName=value=>value.replace(/[A-ZÄÖÅ]/g,letter=>letter.toLowerCase());
export function normalizedPeoplePrefix(value) {
  if(typeof value!=='string')throw dataError('invalid-input');
  const prefix=normalizedSearchName(value.trim());
  if(prefix.length<2 || prefix.length>64)throw dataError('people-prefix');
  return prefix;
}
// Shares the owner's transaction with privacy/name changes. No UID in projection.
export function syncProfileDirectory(tx,sdk,db,settings,displayName) {
  if(!settings?.publicId)return;
  const ref=sdk.doc(db,'profileDirectory',settings.publicId);
  if(settings.state==='active' && settings.visibility==='public') {
    tx.set(ref,{id:settings.publicId,displayName,searchName:normalizedSearchName(displayName),
      category:settings.category,accent:settings.accent,visibility:'public',updatedAt:sdk.serverTimestamp()});
  }else tx.delete(ref);
}
export async function searchPublicPeople(uid,value,cursor=null) {
  const prefix=normalizedPeoplePrefix(value),s=await ownDatabase(uid,'people-search');
  const clauses=[s.sdk.where('visibility','==','public'),s.sdk.where('searchName','>=',prefix),
    s.sdk.where('searchName','<=',prefix+'\uf8ff'),s.sdk.orderBy('searchName'),s.sdk.limit(PEOPLE_PAGE_SIZE)];
  if(cursor)clauses.push(s.sdk.startAfter(cursor));
  const page=await boundedRequest(s.sdk.getDocsFromServer(s.sdk.query(s.sdk.collection(s.db,'profileDirectory'),...clauses)));
  s.assertCurrent();
  return {people:page.docs.map(row=>({id:row.id,displayName:row.data().displayName,
    category:row.data().category,accent:row.data().accent})),cursor:page.docs.at(-1),more:page.size===PEOPLE_PAGE_SIZE};
}

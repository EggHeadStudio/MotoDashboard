import {getAccount} from '../auth-state.js';
import {boundedRequest,dataError} from './access.js';

export const sameTimestamp=(a,b)=>a?.isEqual?!!b && a.isEqual(b):JSON.stringify(a)===JSON.stringify(b);
const read=async(s,...path)=>{
  const record=await boundedRequest(s.sdk.getDocFromServer(s.sdk.doc(s.db,...path)));
  if(s.uid && getAccount()?.uid!==s.uid)throw dataError('account-changed');
  return record.exists()?record.data():null;
};
// Owner preview is policy verification, not an anonymous SDK identity or permission bypass.
export async function ownerVisitorPolicy(s,id) {
  const uid=getAccount()?.uid;if(!uid)return null;
  const prefs=await read({...s,uid},'users',uid,'preferences','publicProfile');
  return prefs?.publicId===id?{...s,uid,prefs}:null;
}
export const visitorAvailable=policy=>policy.prefs.state==='active' && policy.prefs.visibility==='public';
export async function visitorVehicle(policy,id) {
  if(!policy.prefs.vehicleIds.includes(id))return false;
  const mapping=await read(policy,'profileOwners',policy.prefs.publicId,'vehicles',id);if(!mapping)return false;
  const [source,explicit]=await Promise.all([
    read(policy,'users',policy.uid,'vehicles',mapping.sourceVehicleId),
    read(policy,'users',policy.uid,'showcaseRefs',mapping.sourceVehicleId)
  ]);
  return source?.visibility==='public' && sameTimestamp(source.createdAt,mapping.sourceCreatedAt)
    && explicit?.profileId===policy.prefs.publicId && explicit.publicId===id;
}
export async function visitorAffiliation(policy,id,card) {
  if(!policy.prefs.affiliationIds.includes(id))return false;
  const mapping=await read(policy,'profileOwners',policy.prefs.publicId,'affiliations',id);if(!mapping || mapping.clubId!==card.clubId)return false;
  const [club,member]=await Promise.all([read(policy,'clubs',mapping.clubId),read(policy,'clubs',mapping.clubId,'members',policy.uid)]);
  if(!club || club.visibility!=='public' || !['active','archived'].includes(club.state)
    || club.name!==card.name || !member || !sameTimestamp(member.joinedAt,mapping.joinedAt))return false;
  const rank=member.rankId?await read(policy,'clubs',mapping.clubId,'ranks',member.rankId):null;
  return (rank?.name || null)===(card.rank || null);
}

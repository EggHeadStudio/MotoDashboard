import {getAccount,onAccountChange} from './auth-state.js';
import {loadClub,getRank} from './firebase/clubRepository.js';
import {dataError} from './firebase/access.js';
import {getRideContext} from './ride-context.js';

const personal=()=>({kind:'personal',clubId:null,clubName:null,rankId:null,rankName:null});
let next=personal(),profileId=null,version=0;
export const getRidingIdentity=()=>structuredClone(next);
export const getRiderProfileId=()=>profileId;
export async function verifyRidingIdentity(id=next.clubId){
  if(!id)return personal();const uid=getAccount()?.uid;if(!uid)throw dataError('permission-denied');
  const model=await loadClub(uid,id);if(!model.membership||!['active','archived'].includes(model.club.state))throw dataError('permission-denied');
  const rank=model.membership.rankId?await getRank(uid,id,model.membership.rankId):null;
  if(getAccount()?.uid!==uid)throw dataError('auth-required');
  return {kind:'club',clubId:id,clubName:model.club.name,rankId:rank?.id || null,rankName:rank?.name || null};
}
export async function chooseRidingIdentity(id){
  const context=getRideContext();if(context.recordingId||context.sharing)throw dataError('conflict');
  const token=++version,verified=await verifyRidingIdentity(id);
  if(token!==version)throw dataError('conflict');next=verified;dispatchEvent(new Event('motodash-riding-identity'));return getRidingIdentity();
}
addEventListener('motodash-own-profile',event=>{profileId=event.detail?.publicId || null;});
let owner;
onAccountChange(({user})=>{if(owner===(user?.uid || null))return;owner=user?.uid || null;version++;next=personal();profileId=null;});

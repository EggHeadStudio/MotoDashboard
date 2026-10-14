export const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const id=value=>typeof value==='string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const live=club=>club && ['active','archived'].includes(club.state);
const denied=()=>{throw Error('access_denied');};
// The reader shares a Firestore readTime across this complete policy evaluation.
export async function mediaResource(get,target,uid,write=false) {
  const {kind,id:rid,child=null}=target;
  if(!uuid(rid) || (child!==null && !id(child)))throw Error('bad_request');
  let ownerUid,source,incarnation,key,canWrite=false,canRead=false,publicRead=false,privateRead=false,defaultTheme={};
  if(kind==='profile' || kind==='showcase') {
    ownerUid=(await get('profileOwners/'+rid))?.ownerUid;if(!ownerUid)return denied();
    const p=await get(`users/${ownerUid}/preferences/publicProfile`);
    if(!p || p.publicId!==rid || p.state!=='active')return denied();
    const published=p.visibility==='public';
    if(kind==='profile') {
      source=await get('publicProfiles/'+rid);if(!source)return denied();
      incarnation=rid;key=`profile:${rid}`;canWrite=uid===ownerUid;publicRead=published;canRead=canWrite||publicRead;
      if(['gold','ocean','forest','rose'].includes(p.accent))defaultTheme.accent=p.accent;
      if(['road','horizon','grid'].includes(p.banner))defaultTheme.header=p.banner;
    } else {
      if(!uuid(child))throw Error('bad_request');
      const mapping=await get(`profileOwners/${rid}/vehicles/${child}`);
      if(!mapping || !p.vehicleIds?.includes(child))return denied();
      source=await get(`users/${ownerUid}/vehicles/${mapping.sourceVehicleId}`);
      const card=await get(`publicProfiles/${rid}/vehicles/${child}`),ref=await get(`users/${ownerUid}/showcaseRefs/${mapping.sourceVehicleId}`);
      if(!source || !card || mapping.sourceCreatedAt!==source.createdAt || ref?.publicId!==child || ref?.profileId!==rid)return denied();
      publicRead=published&&source.visibility==='public';canRead=publicRead; // Visitor policy applies to owner too.
      key=`vehicle:${ownerUid}:${source.id}`;incarnation=source.createdAt;
    }
  } else if(kind==='vehicle') {
    if(!uid)return denied();ownerUid=uid;source=await get(`users/${uid}/vehicles/${rid}`);
    if(!source || source.ownerUid!==uid)return denied();key=`vehicle:${uid}:${rid}`;incarnation=source.createdAt;canRead=canWrite=true;
  } else if(kind==='club' || kind==='rank') {
    const club=await get('clubs/'+rid);if(!live(club))return denied();ownerUid=club.ownerUid;
    const member=uid?await get(`clubs/${rid}/members/${uid}`):null;
    canWrite=!!uid&&(uid===ownerUid||member?.technicalRole==='admin');
    publicRead=!!uid&&club.visibility==='public';privateRead=!!uid&&(!!member||uid===ownerUid);canRead=publicRead||privateRead;
    source=kind==='rank'?await get(`clubs/${rid}/ranks/${child}`):club;
    if(!source || (kind==='rank'&&!id(child)))return denied();
    incarnation=source.createdAt;key=`${kind}:${rid}`+(kind==='rank'?':'+child:'');
  } else if(kind==='group') {
    source=await get('groupSessions/'+rid);if(!source || !['scheduled','active','completed','cancelled'].includes(source.state))return denied();
    ownerUid=source.creatorUid;const member=uid?await get(`groupSessions/${rid}/participants/${uid}`):null;
    const banned=uid?await get(`groupSessions/${rid}/bans/${uid}`):null;
    let club=null,role=null;
    if(source.clubId){club=await get('clubs/'+source.clubId);if(!live(club))return denied();role=uid?(await get(`clubs/${source.clubId}/members/${uid}`))?.technicalRole:null;}
    const manager=!!uid&&(source.clubId?(club.ownerUid===uid||role==='admin'||(uid===ownerUid&&['owner','host'].includes(role))):uid===ownerUid);
    canWrite=manager&&['scheduled','active'].includes(source.state)&&Date.now()<Math.min(source.endsAt??Infinity,source.startsAt+86400000);
    publicRead=!!uid&&['public','approval'].includes(source.visibility);privateRead=manager||!!uid&&!banned&&!!member;canRead=manager||!banned&&(publicRead||privateRead);
    incarnation=source.createdAt;key=`group:${rid}`;
  } else throw Error('bad_request');
  if(!incarnation || !(write?canWrite:canRead))return denied();
  return {key,target,ownerUid,incarnation,canWrite,publicRead,privateRead,defaultTheme};
}
export async function authorizeStored(get,record,uid,write=false) {
  // Garage photo public access must prove the *current* opaque showcase mapping.
  let target=record.target;
  if(target.kind==='vehicle' && uid!==record.ownerUid) {
    const ref=await get(`users/${record.ownerUid}/showcaseRefs/${target.id}`);
    if(!ref)return denied();target={kind:'showcase',id:ref.profileId,child:ref.publicId};
  }
  const resource=await mediaResource(get,target,uid,write);
  if(resource.key!==record.key || resource.incarnation!==record.incarnation)return denied();
  if(!write && !resource.canWrite && !resource.privateRead && !record.published)return denied();
  return resource;
}
// Retention checks source lifetime, not an uploader's subsequently changed role.
export async function mediaSourceExists(get,record) {
  const {kind,id:rid,child}=record.target;let source;
  if(kind==='profile') {const prefs=await get(`users/${record.ownerUid}/preferences/publicProfile`);return prefs?.publicId===rid&&prefs.state==='active'&&!!await get('publicProfiles/'+rid);}
  if(kind==='vehicle')source=await get(`users/${record.ownerUid}/vehicles/${rid}`);
  if(kind==='club'||kind==='rank') {const club=await get('clubs/'+rid);if(!live(club))return false;source=kind==='rank'?await get(`clubs/${rid}/ranks/${child}`):club;}
  if(kind==='group'){source=await get('groupSessions/'+rid);if(source?.clubId&&!live(await get('clubs/'+source.clubId)))return false;}
  return !!source&&source.createdAt===record.incarnation;
}

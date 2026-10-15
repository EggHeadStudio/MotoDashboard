import {readDocuments} from './firestoreAuthz.js';
export const audiences=['private','roles','members','public'];
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
export function activityReader(env){let time=null;const cache=new Map(),signal=AbortSignal.timeout(8000);
  return async path=>{if(cache.has(path))return cache.get(path);const result=await readDocuments(env,[path],signal,time);time ||= result.readTime;
    const value=result.docs.get(path);cache.set(path,value);return value;};
}
export async function clubAudience(read,clubId,uid){
  const club=await read('clubs/'+clubId);if(!club||!['active','archived'].includes(club.state))throw Error('access_denied');
  const membership=uid?await read(`clubs/${clubId}/members/${uid}`):null;
  const role=uid===club.ownerUid?'owner':membership?.technicalRole || null;
  if(!membership&&club.visibility!=='public')throw Error('access_denied');
  return {club,membership,role,uid};
}
export function canReadActivity(entry,viewer){
  if(entry.uid===viewer.uid)return true;
  if(entry.audience==='public')return viewer.club.visibility==='public'||!!viewer.membership;
  if(!viewer.membership)return false;
  return entry.audience==='members'||entry.audience==='roles'&&['owner','admin'].includes(viewer.role);
}
export async function verifyActivitySource(read,clubId,uid,type,sourceId){
  if(!id(sourceId)||!['ride','group'].includes(type)||!id(uid))throw Error('bad_request');
  const club=await read('clubs/'+clubId),member=await read(`clubs/${clubId}/members/${uid}`);
  if(!club||!['active','archived'].includes(club.state)||!member)throw Error('access_denied');
  const name=(await read('displayProfiles/'+uid))?.displayName;
  if(typeof name!=='string'||!name.trim())throw Error('access_denied');
  const rank=member.rankId?await read(`clubs/${clubId}/ranks/${member.rankId}`):null;
  const identity={displayName:name.slice(0,64),clubName:String(club.name).slice(0,80),rankName:rank?.name?String(rank.name).slice(0,64):null};
  let source,summary;
  if(type==='ride'){
    const tomb=await read(`users/${uid}/sessionTombstones/${sourceId}`);source=await read(`users/${uid}/sessions/${sourceId}`);
    if(tomb||!source||source.ownerUid!==uid||source.status!=='completed'||source.uploadState!=='ready'||source.visibility!=='private')throw Error('access_denied');
    if(!Number.isFinite(source.distanceMeters)||source.distanceMeters<0||source.distanceMeters>10000000
      ||!Number.isFinite(source.movingDurationMs)||source.movingDurationMs<0||source.movingDurationMs>31*86400000)throw Error('bad_request');
    summary={type:'ride',title:typeof source.name==='string'?source.name.slice(0,64):null,startedAt:source.startedAt,
      distanceMeters:source.distanceMeters,durationMs:source.movingDurationMs,category:source.category || null};
  }else{
    source=await read('groupSessions/'+sourceId);const participant=await read(`groupSessions/${sourceId}/participants/${uid}`),ban=await read(`groupSessions/${sourceId}/bans/${uid}`);
    if(!source||source.clubId!==clubId||source.state!=='completed'||!participant||participant.uid!==uid||ban)throw Error('access_denied');
    summary={type:['ride','drive'].includes(source.activityType)?'group':source.activityType,title:String(source.title).slice(0,80),startedAt:source.startsAt,distanceMeters:0,durationMs:0,category:source.category};
    if(!['group','meet','event'].includes(summary.type))throw Error('bad_request');
  }
  if(!source.createdAt||!member.joinedAt||!Number.isFinite(summary.startedAt)||summary.startedAt<=0)throw Error('access_denied');
  return {summary:{...summary,...identity},incarnation:source.createdAt,membership:member.joinedAt};
}
export function activityIsCurrent(entry,source){return entry.incarnation===source.incarnation&&entry.membership===source.membership;}
export function publicActivity(entry,viewer){
  return {id:entry.id,...entry.summary,audience:entry.audience,own:entry.uid===viewer.uid};
}
export function adjustActivityStats(stats,entry,delta){
  const key=entry.audience,byUser=stats[key] ||= {},value=byUser[entry.uid] ||= {rides:0,distanceMeters:0,durationMs:0,group:0,meet:0,event:0,entries:0};
  value.entries+=delta;if(entry.summary.type==='ride'){value.rides+=delta;value.distanceMeters+=entry.summary.distanceMeters*delta;value.durationMs+=entry.summary.durationMs*delta;}
  else value[entry.summary.type]+=delta;
  if(value.entries===0)delete byUser[entry.uid];
}
export function visibleActivityStats(stats,viewer){
  const totals={rides:0,distanceMeters:0,durationMs:0,group:0,meet:0,event:0},riders=new Set();
  for(const audience of audiences)for(const [uid,values] of Object.entries(stats[audience] || {})){
    if(!canReadActivity({uid,audience},viewer))continue;
    riders.add(uid);for(const key of Object.keys(totals))totals[key]+=values[key];
  }
  return {...totals,riders:riders.size};
}

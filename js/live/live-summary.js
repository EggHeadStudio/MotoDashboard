import {haversine} from '../utils.js';
export function summarizeLive(state,now=Date.now()) {
  let active=0,stale=0,noFix=0,maxDistance=null;
  const statuses={ok:0,fuel:0,mechanical:0,help:0},members=[...state.participants.values()];
  const current=p=>p?.position && Number.isFinite(p.position.at) && now-p.position.at<=45000;
  const own=state.participants.get(state.selfId);
  for(const member of members) {
    if(member.status in statuses)statuses[member.status]++;
    const age=member.position?now-member.position.at:Infinity;
    if(age<=45000)active++;else if(age<120000)stale++;else noFix++;
    if(member!==own && current(own) && current(member)) {
      const d=haversine(own.position.latitude,own.position.longitude,member.position.latitude,member.position.longitude);
      maxDistance=Math.max(maxDistance || 0,d);
    }
  }
  return {active,stale,noFix,disconnected:Math.max(0,(state.participantCount ?? members.length)-members.length),statuses,maxDistance};
}

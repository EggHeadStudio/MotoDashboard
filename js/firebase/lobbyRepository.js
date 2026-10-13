import { ownDatabase, boundedRequest, dataError } from './access.js';
import { ACTIVITY_CATEGORIES, text, validId } from '../data/schema.js';
import { ACTIVITIES } from '../data/group-session.js';
import { effectiveGroup } from '../data/group-lifecycle.js';

export async function listLobby(uid, input={}, cursor=null) {
  const s=await ownDatabase(uid, 'lobby-list'), filters=[s.sdk.where('visibility','in',['public','approval']),
    s.sdk.where('state','in',['scheduled','active'])];
  for(const [key,values] of [['activityType',ACTIVITIES],['category',ACTIVITY_CATEGORIES]]) {
    if(input[key]) {if(!values.includes(input[key])) throw dataError('invalid-input');filters.push(s.sdk.where(key,'==',input[key]));}
  }
  if(!input.activityType && input.activityTypes) {
    if(!Array.isArray(input.activityTypes)||input.activityTypes.length!==2||!input.activityTypes.every(value=>['ride','drive'].includes(value))||new Set(input.activityTypes).size!==2) throw dataError('invalid-input');
    filters.push(s.sdk.where('activityType','in',input.activityTypes));
  }
  if(input.meetingArea) filters.push(s.sdk.where('meetingArea','==',text(input.meetingArea,80,true)));
  if(input.clubId) {if(!validId(input.clubId)) throw dataError('invalid-input');filters.push(s.sdk.where('clubId','==',input.clubId));}
  const start=input.date ? new Date(input.date+'T00:00:00').getTime() : new Date().setHours(0,0,0,0);
  if(!Number.isFinite(start)) throw dataError('invalid-input');
  filters.push(s.sdk.where('startsAt','>=',start));
  if(input.date) {const next=new Date(start);next.setDate(next.getDate()+1);filters.push(s.sdk.where('startsAt','<',next.getTime()));}
  filters.push(s.sdk.orderBy('startsAt'),s.sdk.limit(20));if(cursor) filters.push(s.sdk.startAfter(cursor));
  const page=await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'lobbyEvents'),...filters)));s.assertCurrent();
  return {events:page.docs.map(row=>effectiveGroup(row.data())).filter(group=>['scheduled','active'].includes(group.state)),cursor:page.docs.at(-1),more:page.size===20};
}
export async function findLobbyClubs(uid,prefix) {
  const name=text(prefix,80,true),s=await ownDatabase(uid, 'club-search');
  const page=await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'clubDirectory'),s.sdk.where('name','>=',name),
    s.sdk.where('name','<=',name+'\uf8ff'),s.sdk.orderBy('name'),s.sdk.limit(10))));s.assertCurrent();
  return page.docs.map(row=>({id:row.id,name:row.data().name}));
}
export async function listPublicClubs(uid,input={},cursor=null) {
  const s=await ownDatabase(uid, 'club-discovery'),filters=[];
  if(input.category) {
    if(!ACTIVITY_CATEGORIES.includes(input.category)) throw dataError('invalid-input');
    filters.push(s.sdk.where('category','==',input.category));
  }
  filters.push(s.sdk.orderBy('name'),s.sdk.limit(20));if(cursor) filters.push(s.sdk.startAfter(cursor));
  const page=await boundedRequest(s.sdk.getDocs(s.sdk.query(s.sdk.collection(s.db,'clubDirectory'),...filters)));
  const results=await boundedRequest(Promise.allSettled(page.docs.map(async row=>{
    const [safe,membership]=await Promise.all([s.sdk.getDoc(s.sdk.doc(s.db,'clubPages',row.id)),s.sdk.getDoc(s.sdk.doc(s.db,'clubs',row.id,'members',s.uid))]);
    return safe.exists()?{...safe.data(),membershipRole:membership.exists()?membership.data().technicalRole:null}:null;
  })));s.assertCurrent();
  return {clubs:results.filter(row=>row.status==='fulfilled'&&row.value).map(row=>row.value).filter(club=>club.state==='active'&&club.visibility==='public'),
    partial:results.some(row=>row.status==='rejected'),cursor:page.docs.at(-1),more:page.size===20};
}

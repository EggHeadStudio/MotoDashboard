import {ownDatabase,boundedRequest,dataError,settleReads} from './access.js';
import {validId} from '../data/schema.js';
import {effectiveGroup} from '../data/group-lifecycle.js';
const choices=['going','interested','not-going'];
export async function saveAttendance(uid,id,choice){
  if(!validId(id)||!choices.includes(choice))throw dataError('invalid-input');
  const s=await ownDatabase(uid,'attendance'),{sdk,db}=s;
  await boundedRequest(sdk.runTransaction(db,async tx=>{
    const row=sdk.doc(db,'groupSessions',id,'attendance',uid),summary=sdk.doc(db,'groupSessions',id,'attendanceSummary','current');
    const [old,totals,page]=await Promise.all([tx.get(row),tx.get(summary),tx.get(sdk.doc(db,'groupPages',id))]);s.assertCurrent();
    if(!page.exists()||!['scheduled','active'].includes(effectiveGroup(page.data()).state))throw dataError('permission-denied');
    if(old.exists()&&old.data().choice===choice)return;
    const count={going:0,interested:0,'not-going':0,total:0,...(totals.exists()?totals.data():{})};
    if(old.exists())count[old.data().choice]--;else count.total++;
    count[choice]++;if(count.total>200||count.going>(page.data().maxParticipants || 50))throw dataError('conflict');
    tx.set(row,{uid,sessionId:id,choice,createdAt:old.exists()?old.data().createdAt:sdk.serverTimestamp(),updatedAt:sdk.serverTimestamp()});
    tx.set(summary,{going:count.going,interested:count.interested,'not-going':count['not-going'],total:count.total,updatedAt:sdk.serverTimestamp()});
    tx.set(sdk.doc(db,'users',uid,'attendanceRefs',id),{uid,sessionId:id,choice,updatedAt:sdk.serverTimestamp()});
  }));s.assertCurrent();dispatchEvent(new Event('motodash-attendance-updated'));
}
export async function loadAttendance(uid,id,{organizer=false}={}){
  if(!validId(id))throw dataError('invalid-input');const s=await ownDatabase(uid,'attendance'),{sdk,db}=s;
  const [row,summary]=await boundedRequest(Promise.all([sdk.getDoc(sdk.doc(db,'groupSessions',id,'attendance',uid)),sdk.getDoc(sdk.doc(db,'groupSessions',id,'attendanceSummary','current'))]));
  let rows=[];
  if(organizer){const page=await boundedRequest(sdk.getDocs(sdk.query(sdk.collection(db,'groupSessions',id,'attendance'),sdk.orderBy('updatedAt','desc'),sdk.limit(50))));rows=page.docs.map(doc=>doc.data());}
  s.assertCurrent();return {choice:row.exists()?row.data().choice:null,summary:summary.exists()?summary.data():{going:0,interested:0},rows};
}
export async function upcomingAttendance(uid){
  const s=await ownDatabase(uid,'attendance'),{sdk,db}=s;
  const rows=await boundedRequest(sdk.getDocs(sdk.query(sdk.collection(db,'users',uid,'attendanceRefs'),sdk.orderBy('updatedAt','desc'),sdk.limit(20))));
  const results=await settleReads(rows.docs.filter(doc=>['going','interested'].includes(doc.data().choice)),async doc=>{
    const page=await sdk.getDoc(sdk.doc(db,'groupPages',doc.id));return page.exists()?{...effectiveGroup(page.data()),rsvp:doc.data().choice}:null;
  });s.assertCurrent();
  return results.filter(row=>row.status==='fulfilled'&&row.value&&['scheduled','active'].includes(row.value.state)&&row.value.startsAt>=Date.now()).map(row=>row.value);
}

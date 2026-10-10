import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAuthority,authorizeMany} from '../src/firestoreAuthz.js';
const id='12345678-1234-4123-8123-123456789012';
const session={id,schemaVersion:1,state:'active',participantCount:2,clubId:null},member={uid:'alice',status:'ok'};
test('accepted participant may access active room',()=>assert.equal(evaluateAuthority(session,member,null,null,'alice',id),member));
for(const state of ['scheduled','completed','cancelled','deleted']) test('deny '+state,()=>assert.equal(evaluateAuthority({...session,state},member,null,null,'alice',id),null));
test('outsider, removed, impersonation, retired Club, oversized session deny',()=>{
  for(const [s,p,b,c] of [[session,null,null,null],[session,member,{uid:'alice'},null],[session,{uid:'bob'},null,null],
    [{...session,clubId:'club'},member,null,{id:'club',state:'deleted'}],[{...session,participantCount:51},member,null,null]])
    assert.equal(evaluateAuthority(s,p,b,c,'alice',id),null);
  assert.equal(evaluateAuthority({...session,clubId:'club'},member,null,{id:'club',state:'archived'},'alice',id),member);
});
test('trusted reader supplies bounded safe identity; no frontend permissions',async()=>{
  const reader=async(env,paths)=>({readTime:'2026-10-10T00:00:00Z',docs:new Map(paths.map(p=>[p,p===`groupSessions/${id}`?session:p.endsWith('/participants/alice')?member:p==='displayProfiles/alice'?{displayName:'Alice',email:'private'}:null]))});
  const result=await authorizeMany({},id,['alice','bob'],reader);
  assert.equal(result.authorized.size,1);assert.equal(result.authorized.get('alice').displayName,'Alice');
  assert(!('email' in result.authorized.get('alice')));
});
test('Firestore outage fails closed and invalid path cannot be injected',async()=>{
  await assert.rejects(()=>authorizeMany({},id,['alice'],async()=>{throw Error('outage');}));
  await assert.rejects(()=>authorizeMany({},'../users',['alice']));
  await assert.rejects(()=>authorizeMany({},id,['alice/other']));
});

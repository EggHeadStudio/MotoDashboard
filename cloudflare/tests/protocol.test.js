import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMessage,validPosition,positionDecision,publicParticipant,EXPIRE_MS,distance} from '../src/protocol.js';
const now=Date.now(),m={v:1,type:'position',latitude:60,longitude:25,accuracy:10,heading:null,speedKmh:36,sampledAt:now,seq:1};
test('bounded exact versioned protocol prevents UID/session impersonation',()=>{
  assert.equal(parseMessage(JSON.stringify(m)).type,'position');
  for(const raw of [JSON.stringify({...m,uid:'bob'}),JSON.stringify({...m,sessionId:'other'}),JSON.stringify({...m,v:2}),'x'.repeat(1025),new ArrayBuffer(2),'null','{'])
    assert.throws(()=>parseMessage(raw));
});
for(const [key,value] of [['latitude',91],['longitude',181],['speedKmh',221],['speedKmh',-1],['accuracy',101],['sampledAt',now-16000],['heading',360],['seq',0]])
  test('reject malformed '+key+' '+value,()=>assert.equal(validPosition({...m,[key]:value},now),false));
test('cadence, sequence, physical jump and expiry reanchor',()=>{
  const old=positionDecision({seq:0,position:null},m,now),s={seq:1,position:old,lastPositionAt:now};
  assert.throws(()=>positionDecision(s,{...m,seq:2,sampledAt:now+1000},now+1000),/rate_limited/);
  assert.throws(()=>positionDecision(s,{...m,seq:1},now+5000),/bad_position/);
  assert.throws(()=>positionDecision(s,{...m,latitude:61,seq:2,sampledAt:now+5000},now+5000),/bad_position/);
  assert(positionDecision(s,{...m,latitude:60.0001,seq:2,sampledAt:now+5000},now+5000));
  assert(positionDecision(s,{...m,latitude:61,seq:2,sampledAt:now+EXPIRE_MS},now+EXPIRE_MS));
  assert(distance(old,{...old,latitude:60.01})>1000);
});
test('unchanged coordinates are suppressed; stationary cadence remains bounded',()=>{
  const stationary={...m,speedKmh:0},old=positionDecision({seq:0,position:null},stationary,now);
  assert.throws(()=>positionDecision({seq:1,position:old,lastPositionAt:now},{...stationary,seq:2,sampledAt:now+10000},now+10000),/rate_limited/);
  assert.equal(positionDecision({seq:1,position:old,lastPositionAt:now},{...stationary,seq:2,sampledAt:now+30000},now+30000),null);
});
test('reconnect snapshot cannot include expired positions or private UID',()=>{
  const state={uid:'private',riderId:'opaque',identity:{displayName:'Alice',status:'ok'},position:{at:now-EXPIRE_MS,latitude:60,longitude:25}};
  assert.equal(publicParticipant(state,now).position,null);assert(!('uid' in publicParticipant(state,now)));
  assert(publicParticipant({...state,position:{...state.position,at:now-EXPIRE_MS+1}},now).position);
});

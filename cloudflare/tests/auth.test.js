import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {verifyFirebaseToken,PROJECT} from '../src/auth.js';
import {randomTicket,ticketHash,consumeTicket} from '../src/tickets.js';
const {publicKey,privateKey}=await generateKeyPair('RS256');
const keys=new Map([['test-key',publicKey]]),now=Date.now(),sec=Math.floor(now/1000);
async function token(changes={},header={}) {
  return new SignJWT({aud:PROJECT,iss:'https://securetoken.google.com/'+PROJECT,sub:'alice',iat:sec-5,exp:sec+3590,auth_time:sec-10,...changes})
    .setProtectedHeader({alg:'RS256',kid:'test-key',...header}).sign(privateKey);
}
test('valid cryptographically signed Firebase project token derives UID',async()=>{
  assert.equal((await verifyFirebaseToken(await token(),PROJECT,keys,now)).uid,'alice');
});
for(const [label,changes] of Object.entries({expired:{exp:sec-1},audience:{aud:'other'},issuer:{iss:'https://securetoken.google.com/other'},future:{iat:sec+10},subject:{sub:''},authTime:{auth_time:sec+10},uidPath:{sub:'alice/bob'},missingExpiry:{exp:undefined},type:{auth_time:'123'}}))
  test('reject '+label,async()=>assert.rejects(()=>token(changes).then(t=>verifyFirebaseToken(t,PROJECT,keys,now))));
test('reject signature tampering, missing token, unknown key and wrong configured project',async()=>{
  const value=await token();await assert.rejects(()=>verifyFirebaseToken(value.slice(0,-10)+'AAAAAAAAAA',PROJECT,keys,now));
  await assert.rejects(()=>verifyFirebaseToken('',PROJECT,keys,now));
  await assert.rejects(()=>verifyFirebaseToken(value,'other',keys,now));
  await assert.rejects(()=>token({}, {kid:'unknown'}).then(t=>verifyFirebaseToken(t,PROJECT,keys,now)));
});
const store=()=>{const data=new Map();return {data,get:async k=>data.get(k),delete:async k=>data.delete(k),transaction:async fn=>fn({get:async k=>data.get(k),delete:async k=>data.delete(k)})};};
test('ticket random entropy, one-use, origin/session/expiry bindings',async()=>{
  const values=Array.from({length:100},randomTicket);assert.equal(new Set(values).size,100);
  for(const fail of [null,'origin','session','expiry']) {
    const s=store(),t=randomTicket(),key='ticket:'+await ticketHash(t);
    s.data.set(key,{uid:'alice',origin:'https://example.test',sessionId:'room',until:now+30000,expiresAt:now+3600000});
    if(fail==='expiry') s.data.get(key).until=now;
    const consume=()=>consumeTicket(s,t,fail==='origin'?'wrong':'https://example.test',fail==='session'?'wrong':'room',now);
    if(fail) await assert.rejects(consume);else assert.equal((await consume()).uid,'alice');
    await assert.rejects(consume);
  }
});

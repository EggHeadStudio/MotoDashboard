import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {importPKCS8,SignJWT} from 'jose';
let mf,key,cert,fixtureDir;const docs=new Map(),sockets=[];
const origin='https://example.test',project='motodash-87bf8';
const roomA='12345678-1234-4123-8123-123456789012',roomB='87654321-1234-4123-8123-123456789012';
function seed(id=roomA) {
  docs.set('groupSessions/'+id,{id,schemaVersion:1,state:'active',participantCount:2,clubId:null});
  for(const uid of ['alice','bob']) {docs.set(`groupSessions/${id}/participants/${uid}`,{uid,status:'ok',vehicle:null,clubIdentity:null});docs.set('displayProfiles/'+uid,{displayName:uid==='alice'?'Alice Rider':'Bob Rider'});}
}
function encode(value) {
  if(value===null)return {nullValue:null};if(typeof value==='string')return {stringValue:value};
  if(typeof value==='number')return {integerValue:String(value)};
  return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
}
before(async()=>{
  fixtureDir=await mkdtemp(join(tmpdir(),'motodash-worker-test-'));
  const openssl=process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-keyout',join(fixtureDir,'key.pem'),'-out',join(fixtureDir,'cert.pem'),'-days','1','-nodes','-subj','/CN=local-test'],{stdio:'ignore'});
  const pem=await readFile(join(fixtureDir,'key.pem'),'utf8');cert=await readFile(join(fixtureDir,'cert.pem'),'utf8');key=await importPKCS8(pem,'RS256');seed();seed(roomB);
  mf=new Miniflare({modules:true,scriptPath:new URL('../dist/index.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),
    compatibilityDate:'2026-08-06',durableObjects:{LIVE_ROOMS:{className:'LiveRoom',useSQLite:true}},
    bindings:{FIREBASE_PROJECT_ID:project,ALLOWED_ORIGINS:origin,FIRESTORE_SERVICE_ACCOUNT:JSON.stringify({project_id:project,
      client_email:'test-reader@'+project+'.iam.gserviceaccount.com',private_key:pem})},
    outboundService:async request=>{
      const url=new URL(request.url);
      if(url.hostname==='www.googleapis.com' && url.pathname.includes('/metadata/x509/'))return Response.json({'fixture-key':cert},{headers:{'Cache-Control':'max-age=3600'}});
      if(url.hostname==='oauth2.googleapis.com')return Response.json({access_token:'local-oauth',expires_in:3600});
      if(url.hostname!=='firestore.googleapis.com')throw Error('Unexpected network destination');
      const body=await request.json();return Response.json(body.documents.map(name=>{
        const path=name.split('/documents/')[1],data=docs.get(path);
        return {...(data?{found:{name,fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]))}}:{missing:name}),readTime:new Date().toISOString()};
      }));
    }});
  await mf.ready;
});
after(async()=>{
  for(const socket of sockets)try{socket.close();}catch{}
  await mf?.dispose();
  // Only this freshly created test directory; no application or operator keys.
  if(fixtureDir && fixtureDir.startsWith(join(tmpdir(),'motodash-worker-test-')))await rm(fixtureDir,{recursive:true,force:true});
});
async function token(uid='alice',changes={}) {
  const now=Math.floor(Date.now()/1000);
  return new SignJWT({sub:uid,iss:'https://securetoken.google.com/'+project,aud:project,iat:now-1,auth_time:now-1,exp:now+3500,...changes})
    .setProtectedHeader({alg:'RS256',kid:'fixture-key'}).sign(key);
}
async function ticket(uid='alice',id=roomA,options={}) {
  const response=await mf.dispatchFetch(`https://worker.test/v1/sessions/${id}/ticket`,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+await token(uid),...options}});
  return {status:response.status,body:await response.json()};
}
async function connect(id=roomA,options={}) {
  const response=await mf.dispatchFetch(`https://worker.test/v1/sessions/${id}/connect`,{headers:{Origin:origin,Upgrade:'websocket',...options}});
  if(response.status!==101)return {status:response.status};
  const ws=response.webSocket,messages=[];ws.addEventListener('message',event=>messages.push(JSON.parse(event.data)));
  ws.accept();sockets.push(ws);return {ws,messages,status:101};
}
async function wait(connection,type,filter=()=>true,timeout=5000) {
  const end=Date.now()+timeout;while(Date.now()<end) {
    const found=connection.messages.find(message=>message.type===type && filter(message));if(found)return found;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw Error('No '+type+'; messages='+JSON.stringify(connection.messages));
}
async function enter(uid='alice',id=roomA) {
  const t=await ticket(uid,id);assert.equal(t.status,200,JSON.stringify(t.body));
  const c=await connect(id);c.ws.send(JSON.stringify({v:1,type:'hello',ticket:t.body.ticket}));
  c.riderId=(await wait(c,'hello')).riderId;await wait(c,'snapshot');return c;
}
test('runtime health, CORS, unknown routes and invalid Firebase tokens',async()=>{
  assert.equal((await mf.dispatchFetch('https://worker.test/health')).status,200);
  assert.equal((await ticket('alice',roomA,{Origin:'https://evil.test'})).status,403);
  assert.equal((await mf.dispatchFetch('https://worker.test/unknown',{headers:{Origin:origin}})).status,404);
  for(const changes of [{aud:'wrong'},{exp:1},{iss:'https://securetoken.google.com/wrong'}])
    assert.equal((await mf.dispatchFetch(`https://worker.test/v1/sessions/${roomA}/ticket`,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+await token('alice',changes)}})).status,401);
  assert.equal((await ticket('outsider')).status,403);
});
let alice,bob;
test('pending socket gets no private messages; two verified riders receive snapshot',async()=>{
  const pending=await connect();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(pending.messages.length,0);pending.ws.close();
  alice=await enter();bob=await enter('bob');const snapshot=await wait(bob,'snapshot');
  assert.equal(snapshot.participants.length,2);assert(snapshot.participants.some(p=>p.displayName==='Alice Rider'));
  assert(snapshot.participants.every(p=>!('uid' in p) && p.position===null));
});
test('room isolation and latest position distribution',async()=>{
  const other=await enter('alice',roomB);
  alice.ws.send(JSON.stringify({v:1,type:'position',latitude:60,longitude:25,accuracy:10,heading:90,speedKmh:36,sampledAt:Date.now(),seq:1}));
  assert.equal((await wait(bob,'position')).position.latitude,60);
  await new Promise(resolve=>setTimeout(resolve,30));assert(!other.messages.some(m=>m.type==='position'));other.ws.close();
});
test('single-use replay fails and query tokens are rejected',async()=>{
  const t=await ticket('bob',roomB);assert.equal(t.status,200);
  const first=await connect(roomB);first.ws.send(JSON.stringify({v:1,type:'hello',ticket:t.body.ticket}));await wait(first,'hello');
  const replay=await connect(roomB);replay.ws.send(JSON.stringify({v:1,type:'hello',ticket:t.body.ticket}));assert.equal((await wait(replay,'error')).code,'invalid_ticket');
  const query=await mf.dispatchFetch(`https://worker.test/v1/sessions/${roomB}/connect?token=forbidden`,{headers:{Origin:origin,Upgrade:'websocket'}});assert.equal(query.status,400);first.ws.close();
});
test('removed participant cannot obtain a ticket; connected access revoked on recheck',async()=>{
  docs.set(`groupSessions/${roomA}/bans/bob`,{uid:'bob'});
  bob.ws.send(JSON.stringify({v:1,type:'revalidate'}));await wait(alice,'participant_left',m=>m.riderId===bob.riderId);
  assert.equal((await ticket('bob',roomB,{Origin:'bad'})).status,403);
  docs.delete(`groupSessions/${roomA}/bans/bob`);docs.delete(`groupSessions/${roomA}/participants/bob`);
  // Bypass ticket cooldown by testing a separate session whose member was removed.
  docs.delete(`groupSessions/${roomB}/participants/bob`);assert.equal((await ticket('outsider',roomA)).status,403);
});
test('oversized WebSocket data rejected without publication',async()=>{
  alice.ws.send('x'.repeat(1025));assert.equal((await wait(alice,'error')).code,'bad_message');
});
test('completed sessions deny new tickets',async()=>{
  docs.set('groupSessions/'+roomB,{...docs.get('groupSessions/'+roomB),state:'completed'});
  assert.equal((await ticket('outsider',roomB)).status,403);
});
test('duplicate connection replaces the previous publisher and reconnect gets snapshot',async()=>{
  const id=crypto.randomUUID();seed(id);const first=await enter('alice',id),bob=await enter('bob',id);
  first.ws.send(JSON.stringify({v:1,type:'position',latitude:60,longitude:25,accuracy:5,heading:null,speedKmh:0,sampledAt:Date.now(),seq:1}));
  await wait(bob,'position');const second=await enter('alice',id);
  await wait(bob,'participant_left',m=>m.riderId===first.riderId);
  const snapshot=await wait(second,'snapshot');assert.equal(snapshot.participants.filter(p=>p.displayName==='Alice Rider').length,1);
  first.ws.close();second.ws.close();bob.ws.close();
});
test('malformed coordinates, impersonation, binary and burst rate limiting close sender',async()=>{
  for(const payload of [{v:1,type:'position',latitude:999,longitude:25,accuracy:5,heading:null,speedKmh:0,sampledAt:Date.now(),seq:1},
    {v:1,type:'heartbeat',uid:'bob'},new Uint8Array([1,2])]) {
    const id=crypto.randomUUID();seed(id);const c=await enter('alice',id);c.ws.send(payload instanceof Uint8Array?payload:JSON.stringify(payload));
    const error=await wait(c,'error');assert(['bad_message','bad_position'].includes(error.code));c.ws.close();
  }
  const id=crypto.randomUUID();seed(id);const c=await enter('alice',id);
  for(let n=0;n<9;n++) c.ws.send(JSON.stringify({v:1,type:'heartbeat'}));
  assert.equal((await wait(c,'error')).code,'rate_limited');c.ws.close();
});
test('session completion closes connected receivers before further coordinates',async()=>{
  const id=crypto.randomUUID();seed(id);const a=await enter('alice',id),b=await enter('bob',id);
  docs.set('groupSessions/'+id,{...docs.get('groupSessions/'+id),state:'completed'});
  a.ws.send(JSON.stringify({v:1,type:'revalidate'}));await wait(a,'session_ended');await wait(b,'session_ended');
  assert.equal((await ticket('alice',id)).status,403);a.ws.close();b.ws.close();
});
test('ticket is bound to origin/session and removed participants cannot reconnect',async()=>{
  const id=crypto.randomUUID();seed(id);const t=await ticket('alice',id);assert.equal(t.status,200);
  const other=crypto.randomUUID();seed(other);await ticket('outsider',other);
  const wrong=await connect(other);wrong.ws.send(JSON.stringify({v:1,type:'hello',ticket:t.body.ticket}));assert.equal((await wait(wrong,'error')).code,'invalid_ticket');
  docs.delete(`groupSessions/${id}/participants/alice`);
  const removed=await connect(id);removed.ws.send(JSON.stringify({v:1,type:'hello',ticket:t.body.ticket}));assert.equal((await wait(removed,'error')).code,'access_denied');
  assert.equal((await ticket('alice',id)).status,403);
});

test('periodic alarm revokes silent receivers and expires unredeemed tickets',async()=>{
  const id=crypto.randomUUID();seed(id);const a=await enter('alice',id),b=await enter('bob',id);
  const unusedId=crypto.randomUUID();seed(unusedId);const unused=await ticket('alice',unusedId);
  assert.equal(unused.status,200);
  const removedAt=Date.now();docs.delete(`groupSessions/${id}/participants/bob`);
  // No revalidate/status/position from either rider: only the real DO alarm can detect this.
  await wait(a,'participant_left',m=>m.riderId===b.riderId,45000);
  assert(Date.now()-removedAt<45000,'alarm revocation must be bounded locally');
  const markerCount=b.messages.filter(m=>m.type==='position').length;
  while(Date.now()<unused.body.expiresAt+200)await new Promise(resolve=>setTimeout(resolve,100));
  a.ws.send(JSON.stringify({v:1,type:'position',latitude:60,longitude:25,accuracy:5,heading:null,speedKmh:0,sampledAt:Date.now(),seq:1}));
  await wait(a,'position');await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(b.messages.filter(m=>m.type==='position').length,markerCount,'revoked receiver gets no later coordinates');
  const expired=await connect(unusedId);expired.ws.send(JSON.stringify({v:1,type:'hello',ticket:unused.body.ticket}));
  assert.equal((await wait(expired,'error')).code,'invalid_ticket');
  a.ws.close();b.ws.close();expired.ws.close();
});

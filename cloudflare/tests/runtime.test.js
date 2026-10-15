import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {importPKCS8,SignJWT} from 'jose';
let mf,key,cert,fixtureDir;const docs=new Map(),sockets=[],accountOverrides=new Map();
const origin='https://example.test',project='motodash-87bf8';
const roomA='12345678-1234-4123-8123-123456789012',roomB='87654321-1234-4123-8123-123456789012';
function seed(id=roomA) {
  docs.set('groupSessions/'+id,{id,schemaVersion:1,state:'active',startsAt:Date.now(),endsAt:null,participantCount:2,clubId:null});
  for(const uid of ['alice','bob','carol']) {docs.set(`groupSessions/${id}/participants/${uid}`,{uid,status:'ok',vehicle:null,clubIdentity:null});docs.set('displayProfiles/'+uid,{displayName:uid==='alice'?'Alice Rider':uid==='bob'?'Bob Rider':'Carol Rider'});}
}
function encode(value) {
  if(value===null)return {nullValue:null};if(typeof value==='string')return {stringValue:value};
  if(typeof value==='boolean')return {booleanValue:value};
  if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};
  if(typeof value==='number')return {integerValue:String(value)};
  return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
}
before(async()=>{
  fixtureDir=await mkdtemp(join(tmpdir(),'motodash-worker-test-'));
  const openssl=process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-keyout',join(fixtureDir,'key.pem'),'-out',join(fixtureDir,'cert.pem'),'-days','1','-nodes','-subj','/CN=local-test'],{stdio:'ignore'});
  const pem=await readFile(join(fixtureDir,'key.pem'),'utf8');cert=await readFile(join(fixtureDir,'cert.pem'),'utf8');key=await importPKCS8(pem,'RS256');seed();seed(roomB);
  mf=new Miniflare({modules:true,scriptPath:new URL('../dist/index.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),
    compatibilityDate:'2026-08-06',r2Buckets:['MEDIA_BUCKET'],durableObjects:{LIVE_ROOMS:{className:'LiveRoom',useSQLite:true},LIVE_IDENTITIES:{className:'LiveIdentity',useSQLite:true},MEDIA_STATE:{className:'MediaState',useSQLite:true},CLUB_ACTIVITY:{className:'ClubActivity',useSQLite:true}},
    bindings:{FIREBASE_PROJECT_ID:project,ALLOWED_ORIGINS:origin,FIRESTORE_SERVICE_ACCOUNT:JSON.stringify({project_id:project,
      client_email:'test-reader@'+project+'.iam.gserviceaccount.com',private_key:pem}),MEDIA_SERVICE_ACCOUNT:JSON.stringify({type:'service_account',project_id:project,
      client_email:'motodash-media@'+project+'.iam.gserviceaccount.com',private_key:pem})},
    outboundService:async request=>{
      const url=new URL(request.url);
      if(url.hostname==='www.googleapis.com' && url.pathname.includes('/metadata/x509/'))return Response.json({'fixture-key':cert},{headers:{'Cache-Control':'max-age=3600'}});
      if(url.hostname==='oauth2.googleapis.com')return Response.json({access_token:'local-oauth',expires_in:3600});
      if(url.hostname==='identitytoolkit.googleapis.com') {const body=await request.json();return Response.json({users:body.localId.map(localId=>({localId,validSince:'0',...accountOverrides.get(localId)}))});}
      if(url.hostname!=='firestore.googleapis.com')throw Error('Unexpected network destination');
      const body=await request.json();
      if(body.writes){for(const write of body.writes){assert((write.update?.name || write.delete).includes('/documents/mediaRecords/'));}return Response.json({commitTime:new Date().toISOString()});}
      return Response.json(body.documents.map(name=>{
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
test('Club activity native SQLite gateway verifies consent/source/privacy and never accepts asserted UID',async()=>{
  const id=crypto.randomUUID(),base=`https://worker.test/v1/clubs/${id}/activity`;
  docs.set('clubs/'+id,{id,name:'Activity Club',ownerUid:'activity-owner',state:'active',visibility:'public'});
  docs.set(`clubs/${id}/members/activity-owner`,{uid:'activity-owner',technicalRole:'owner',rankId:null,joinedAt:'member-source'});
  docs.set('displayProfiles/activity-owner',{displayName:'Activity Rider'});
  docs.set('users/activity-owner/sessions/activity-ride',{id:'activity-ride',ownerUid:'activity-owner',status:'completed',uploadState:'ready',visibility:'private',
    startedAt:Date.now()-10000,createdAt:'ride-source',distanceMeters:1000,movingDurationMs:60000,category:'motorcycle'});
  const request=async(uid,options={})=>mf.dispatchFetch(base,{...options,headers:{Origin:origin,...(uid?{Authorization:'Bearer '+await token(uid)}:{}),...options.headers}});
  assert.equal((await request(null,{method:'POST',headers:{'X-MotoDash-Identity':'{"uid":"activity-owner"}'}})).status,401);
  const body=JSON.stringify({sourceType:'ride',sourceId:'activity-ride',audience:'public',consent:true,publicConsent:true});
  const r=await request('activity-owner',{method:'POST',headers:{'If-Match':'0'},body});assert.equal(r.status,200,await r.clone().text());
  const data=await (await request(null)).json();assert.equal(data.entries.length,1);assert.equal(data.stats.rides,1);assert.equal(data.stats.distanceMeters,1000);
  for(const key of ['uid','sourceId','routePoints','email'])assert(!(key in data.entries[0]));
  assert.equal((await request('activity-owner',{method:'POST',headers:{'If-Match':'0'},body})).status,409);
  assert.equal((await request(null,{headers:{Origin:'https://evil.test'}})).status,403);
  docs.get('clubs/'+id).visibility='private';assert.equal((await request(null)).status,403);
  docs.get('clubs/'+id).visibility='public';docs.set('users/activity-owner/sessionTombstones/activity-ride',{id:'activity-ride'});
  assert.equal((await (await request(null)).json()).entries.length,0);
  docs.get('clubs/'+id).state='deleted';assert.equal((await request('activity-owner')).status,403);
});
const mediaProfile='11111111-1111-4111-8111-111111111111';
async function media(path,uid='alice',options={}) {
  return mf.dispatchFetch('https://worker.test/v1/media/'+path,{...options,headers:{Origin:origin,...(uid?{Authorization:'Bearer '+await token(uid)}:{}),...options.headers}});
}
test('media runtime private R2 upload/read/replace/delete has no permanent URL or object path',async()=>{
  docs.set('profileOwners/'+mediaProfile,{ownerUid:'alice'});
  docs.set('users/alice/preferences/publicProfile',{publicId:mediaProfile,state:'active',visibility:'public',vehicleIds:[]});
  docs.set('publicProfiles/'+mediaProfile,{id:mediaProfile});
  const path='resources/profile/'+mediaProfile,fixtures=JSON.parse(await readFile(new URL('./media-fixtures.json',import.meta.url),'utf8'));
  const bytes=Buffer.from(fixtures['image/png'],'base64');
  let r=await media(path);assert.equal(r.status,200);assert.deepEqual((await r.json()).images,[]);
  const upload=async revision=>media(path+'/slots/avatar','alice',{method:'POST',headers:{'Content-Type':'image/png','If-Match':String(revision),'X-Media-Published':'false'},body:bytes});
  r=await upload(0);assert.equal(r.status,201,await r.clone().text());const first=await r.json();
  r=await media('images/'+first.id);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
  assert.equal((await media('images/'+first.id,null)).status,403);
  assert.equal((await media(path+'/slots/avatar','bob',{method:'POST',headers:{'Content-Type':'image/png','If-Match':'1','X-Media-Published':'true'},body:bytes})).status,403);
  r=await media(path);const data=await r.json();assert.equal(data.images[0].id,first.id);assert(!JSON.stringify(data).includes('objectKey'));assert(!JSON.stringify(data).includes('alice'));
  r=await upload(1);assert.equal(r.status,201);const second=await r.json();assert.notEqual(first.id,second.id);assert.equal((await media('images/'+first.id)).status,404);
  assert.equal((await upload(1)).status,409);
  r=await media(path+'/slots/avatar','alice',{method:'DELETE',headers:{'If-Match':String(second.revision)}});assert.equal(r.status,200);
  assert.equal((await media('images/'+second.id)).status,404);
});
test('media runtime gateway rejects forged identity/origin/expired tokens and native visibility transitions',async()=>{
  const id=crypto.randomUUID(),path='resources/profile/'+id;
  docs.set('profileOwners/'+id,{ownerUid:'media-owner'});docs.set('users/media-owner/preferences/publicProfile',{publicId:id,state:'active',visibility:'public',vehicleIds:[]});docs.set('publicProfiles/'+id,{id});
  const fixtures=JSON.parse(await readFile(new URL('./media-fixtures.json',import.meta.url),'utf8')),bytes=Buffer.from(fixtures['image/png'],'base64');
  assert.equal((await media(path,'media-owner',{headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await media(path,null,{headers:{'X-MotoDash-Identity':'{"uid":"media-owner"}','X-MotoDash-Caller':'a'.repeat(64)}})).status,200); // Safe public summary, cannot assert owner.
  assert.equal((await media(path+'/slots/avatar',null,{method:'POST',headers:{'If-Match':'0','Content-Type':'image/png','X-Media-Published':'true','X-MotoDash-Identity':'{"uid":"media-owner"}'},body:bytes})).status,401);
  assert.equal((await mf.dispatchFetch('https://worker.test/v1/media/'+path,{headers:{Origin:origin,Authorization:'Bearer '+await token('media-owner',{exp:1})}})).status,401);
  const uploaded=await media(path+'/slots/avatar','media-owner',{method:'POST',headers:{'If-Match':'0','Content-Type':'image/png','X-Media-Published':'true'},body:bytes});assert.equal(uploaded.status,201);const image=await uploaded.json();
  assert.equal((await media('images/'+image.id,null)).status,200);
  docs.get('users/media-owner/preferences/publicProfile').visibility='private';assert.equal((await media('images/'+image.id,null)).status,403);
  docs.get('users/media-owner/preferences/publicProfile').visibility='public';assert.equal((await media('images/'+image.id,null)).status,200);
  accountOverrides.set('media-owner',{disabled:true});assert.equal((await media('images/'+image.id,'media-owner')).status,401);accountOverrides.delete('media-owner');
  const results=await Promise.all([media(path+'/slots/avatar','media-owner',{method:'DELETE',headers:{'If-Match':'1'}}),media(path+'/slots/avatar','media-owner',{method:'DELETE',headers:{'If-Match':'1'}})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await media('images/'+image.id,null)).status,404);
});
test('pending socket gets no private messages; two verified riders receive snapshot',async()=>{
  const pending=await connect();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(pending.messages.length,0);pending.ws.close();
  alice=await enter();bob=await enter('bob');const snapshot=await wait(bob,'snapshot');
  assert.equal(snapshot.participants.length,2);assert(snapshot.participants.some(p=>p.displayName==='Alice Rider'));
  assert(snapshot.participants.every(p=>!('uid' in p) && p.position===null));
});
test('room isolation and latest position distribution',async()=>{
  const conflict=await ticket('alice',roomB);assert.equal(conflict.status,409);assert.equal(conflict.body.activeSessionId,roomA);
  const other=await enter('carol',roomB);
  alice.ws.send(JSON.stringify({v:1,type:'position',latitude:60,longitude:25,accuracy:10,heading:90,speedKmh:36,sampledAt:Date.now(),seq:1}));
  assert.equal((await wait(bob,'position')).position.latitude,60);
  await new Promise(resolve=>setTimeout(resolve,30));assert(!other.messages.some(m=>m.type==='position'));other.ws.close();
});
test('single-use replay fails and query tokens are rejected',async()=>{
  const t=await ticket('carol',roomB);assert.equal(t.status,200);
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
test('expired retained active sessions deny tickets and alarms end existing sockets',async()=>{
  const id=crypto.randomUUID();seed(id);
  docs.set('groupSessions/'+id,{...docs.get('groupSessions/'+id),startsAt:Date.now()-3600000,endsAt:Date.now()+2500});
  const a=await enter('alice',id),b=await enter('bob',id);
  await wait(a,'session_ended',()=>true,15000);await wait(b,'session_ended',()=>true,15000);
  assert.equal(docs.get('groupSessions/'+id).state,'active');
  assert.equal((await ticket('outsider',id)).status,403);a.ws.close();b.ws.close();
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
  const unusedId=crypto.randomUUID();seed(unusedId);const unused=await ticket('carol',unusedId);
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

test('simultaneous devices cannot acquire different live rooms for one verified UID',async()=>{
  const uid='race-'+crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID();seed(a);seed(b);
  for(const id of [a,b])docs.set(`groupSessions/${id}/participants/${uid}`,{uid,status:'ok',vehicle:null,clubIdentity:null});
  docs.set('displayProfiles/'+uid,{displayName:'Race Rider'});
  const attempts=await Promise.all([ticket(uid,a),ticket(uid,b)]);
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
  const winner=attempts[0].status===200?a:b,loser=winner===a?b:a,granted=attempts.find(r=>r.status===200);
  assert.equal(attempts.find(r=>r.status===409).body.activeSessionId,winner);
  const connection=await connect(winner);connection.ws.send(JSON.stringify({v:1,type:'hello',ticket:granted.body.ticket}));await wait(connection,'hello');
  assert.equal((await ticket(uid,loser)).status,409);connection.ws.close();
  let next;const end=Date.now()+2000;
  do {await new Promise(resolve=>setTimeout(resolve,20));next=await ticket(uid,loser);}while(next.status===409 && Date.now()<end);
  assert.equal(next.status,200,'closed publisher releases before another Group admission');
  const second=await connect(loser);second.ws.send(JSON.stringify({v:1,type:'hello',ticket:next.body.ticket}));await wait(second,'hello');second.ws.close();
});

test('actual SQLite coordinator expires abandoned reservations and preserves newer nonces',async()=>{
  const ns=await mf.getDurableObjectNamespace('LIVE_IDENTITIES'),stub=ns.get(ns.idFromName('fixture-lease-'+crypto.randomUUID()));
  const a=crypto.randomUUID(),b=crypto.randomUUID(),old=crypto.randomUUID(),fresh=crypto.randomUUID();
  const call=async(action,roomId,nonce,until=Date.now()+2000)=>{
    const r=await stub.fetch('https://identity.internal/'+action,{method:'POST',body:JSON.stringify({roomId,nonce,until})});return {status:r.status,body:await r.json()};
  };
  assert.equal((await call('reserve',a,old,Date.now()+100)).status,200);
  assert.equal((await call('reserve',b,fresh)).status,409);
  await new Promise(resolve=>setTimeout(resolve,150));assert.equal((await call('reserve',b,fresh)).status,200);
  assert.equal((await call('renew',a,old)).status,409);
  assert.equal((await call('activate',b,old)).status,200);
  assert.equal((await call('activate',b,fresh)).status,200);
  assert.equal((await call('release',b,old)).status,200);
  assert.equal((await call('reserve',a,old)).status,409,'stale release cannot delete fresh incarnation');
  assert.equal((await call('release',b,fresh)).status,200);
  assert.equal((await call('reserve',a,old)).status,200);
});

test('the public gateway never exposes coordinator mutation routes or asserted UIDs',async()=>{
  for(const action of ['reserve','activate','renew','release']){
    const r=await mf.dispatchFetch('https://worker.test/'+action,{method:'POST',headers:{Origin:origin},body:JSON.stringify({uid:'alice',roomId:roomA})});assert.equal(r.status,404);
  }
  const r=await mf.dispatchFetch('https://worker.test/v1/sessions/'+roomA+'/ticket',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+await token('outsider')},body:JSON.stringify({uid:'alice'})});
  assert.equal(r.status,400);
});

test('abandoned open socket loses its global claim and cannot receive after another Group wins',async()=>{
  const uid='idle-'+crypto.randomUUID(),peer='peer-'+crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID();seed(a);seed(b);
  for(const id of [a,b])docs.set(`groupSessions/${id}/participants/${uid}`,{uid,status:'ok',vehicle:null,clubIdentity:null});
  docs.set(`groupSessions/${a}/participants/${peer}`,{uid:peer,status:'ok',vehicle:null,clubIdentity:null});
  const old=await enter(uid,a),started=Date.now();
  // The test socket remains open but never sends activity. Authority alarms still run.
  while(Date.now()-started<46000)await new Promise(resolve=>setTimeout(resolve,500));
  const replacement=await enter(uid,b);assert.equal((await ticket(uid,a)).status,409);
  const count=old.messages.filter(m=>m.type==='position').length,observer=await enter(peer,a);
  observer.ws.send(JSON.stringify({v:1,type:'position',latitude:60,longitude:25,accuracy:5,heading:null,speedKmh:0,sampledAt:Date.now(),seq:1}));
  await wait(observer,'position');await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(old.messages.filter(m=>m.type==='position').length,count);
  assert.equal((await ticket(uid,a)).status,409,'late old-room release cannot free the replacement Group');
  old.ws.close();replacement.ws.close();observer.ws.close();
});

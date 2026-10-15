import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import {ClubActivity} from '../src/ClubActivity.js';
const clubId='88888888-8888-4888-8888-888888888888';let env,docs,accounts,storage,backend,savedFetch,unavailable=false;
const encode=v=>v===null?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}};
before(async()=>{
  const {privateKey}=await generateKeyPair('RS256',{extractable:true}),pem=await exportPKCS8(privateKey);
  env={FIREBASE_PROJECT_ID:'motodash-87bf8',FIRESTORE_SERVICE_ACCOUNT:JSON.stringify({project_id:'motodash-87bf8',client_email:'reader@motodash-87bf8.iam.gserviceaccount.com',private_key:pem}),
    MEDIA_SERVICE_ACCOUNT:JSON.stringify({type:'service_account',project_id:'motodash-87bf8',client_email:'motodash-media@motodash-87bf8.iam.gserviceaccount.com',private_key:pem})};
  savedFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>{
    const host=new URL(url).hostname;if(host==='oauth2.googleapis.com')return Response.json({access_token:'local',expires_in:3600});
    const input=JSON.parse(options.body);if(host==='identitytoolkit.googleapis.com')return Response.json({users:input.localId.map(localId=>({localId,validSince:'0',...accounts.get(localId)}))});
    assert.equal(host,'firestore.googleapis.com');assert(!input.writes,'Club activity must never write Firestore through IAM');
    if(unavailable)return Response.json({error:'unavailable'},{status:503});
    return Response.json(input.documents.map(name=>{const data=docs.get(name.split('/documents/')[1]);return {...(data?{found:{name,fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]))}}:{missing:name}),readTime:'2026-10-15T00:00:00Z'};}));
  };
});
after(()=>{globalThis.fetch=savedFetch;});
beforeEach(()=>{
  docs=new Map();accounts=new Map();unavailable=false;const map=new Map();
  storage={get:async key=>structuredClone(map.get(key)),put:async(key,value)=>map.set(key,structuredClone(value)),setAlarm:async value=>{storage.alarm=value;}};
  backend=new ClubActivity({storage},env);docs.set('clubs/'+clubId,{id:clubId,name:'Club',ownerUid:'owner',state:'active',visibility:'public'});
  for(const [uid,role] of [['owner','owner'],['alice','member'],['bob','member'],['admin','admin']]){
    docs.set(`clubs/${clubId}/members/${uid}`,{uid,technicalRole:role,rankId:null,joinedAt:'membership-1'});docs.set('displayProfiles/'+uid,{displayName:'Rider '+uid});
  }
  ride('alice','ride-1');
});
function ride(uid,id){docs.set(`users/${uid}/sessions/${id}`,{id,ownerUid:uid,status:'completed',uploadState:'ready',visibility:'private',createdAt:'source-1',startedAt:1000000,distanceMeters:10000,movingDurationMs:3600000,category:'motorcycle',name:'Coastal ride'});}
async function call({uid='alice',method='GET',revision,path='',body}={}){
  return backend.fetch(new Request(`https://fixture.test/v1/clubs/${clubId}/activity${path}`,{method,
    headers:{'X-MotoDash-Identity':JSON.stringify(uid?{uid,expiresAt:Date.now()+3600000,authTime:Date.now()-10000}:null),'X-MotoDash-Caller':'local-ip',
      ...(revision===undefined?{}:{'If-Match':String(revision)})},body:body===undefined?undefined:JSON.stringify(body)}));
}
const contribution=(audience='members')=>({sourceType:'ride',sourceId:'ride-1',audience,consent:true,publicConsent:audience==='public'});
async function list(uid='alice'){const r=await call({uid});assert.equal(r.status,200,await r.clone().text());return r.json();}
test('trusted summary contains no UID, route, source path, private notes or raw media URL',async()=>{
  assert.equal((await call({method:'POST',revision:0,body:contribution()})).status,200);
  const data=await list('bob');assert.equal(data.entries.length,1);assert.equal(data.entries[0].displayName,'Rider alice');
  for(const key of ['uid','sourceId','sourceType','routePoints','vehicleSnapshot','objectKey','email'])assert(!(key in data.entries[0]));
  assert.equal(data.stats.rides,1);assert.equal(data.stats.distanceMeters,10000);assert.equal(data.stats.riders,1);
});
test('explicit consent and canonical membership required; forged fields and foreign rides denied',async()=>{
  for(const body of [{...contribution(),consent:false},{...contribution(),distanceMeters:999},{...contribution('public'),publicConsent:false}])
    assert.equal((await call({method:'POST',revision:0,body})).status,400);
  assert.equal((await call({uid:'outsider',method:'POST',revision:0,body:contribution()})).status,403);
  assert.equal((await call({uid:'bob',method:'POST',revision:0,body:contribution()})).status,403);
});
test('private, technical roles, members and explicit public audiences stay separate',async()=>{
  let revision=0;
  for(const audience of ['private','roles','members','public']){
    assert.equal((await call({method:'POST',revision:revision++,body:contribution(audience)})).status,200);
    assert.equal((await list('owner')).entries.length,audience==='private'?0:1);
    assert.equal((await list('bob')).entries.length,['members','public'].includes(audience)?1:0);
    assert.equal((await list(null)).entries.length,audience==='public'?1:0);
  }
});
test('custom rank cannot grant technical log access or override stricter rider privacy',async()=>{
  docs.get(`clubs/${clubId}/members/bob`).rankId='owner';
  await call({method:'POST',revision:0,body:contribution('roles')});assert.equal((await list('bob')).entries.length,0);
  assert.equal((await call({uid:'admin',method:'PUT',revision:1,body:{defaultAudience:'public'}})).status,403);
  await call({uid:'owner',method:'PUT',revision:1,body:{defaultAudience:'public'}});assert.equal((await list('bob')).entries.length,0);
});
test('duplicate contribution replaces one entry; concurrent stale revision cannot double count',async()=>{
  const results=await Promise.all([call({method:'POST',revision:0,body:contribution()}),call({method:'POST',revision:0,body:contribution()})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  await call({method:'POST',revision:1,body:contribution()});assert.equal((await list()).stats.rides,1);
});
test('ride tombstone revokes fresh entry reads and trusted cleanup corrects aggregates',async()=>{
  await call({method:'POST',revision:0,body:contribution('public')});docs.set('users/alice/sessionTombstones/ride-1',{id:'ride-1'});
  assert.equal((await list(null)).entries.length,0);await backend.alarm();const data=await list();assert.equal(data.stats.rides,0);assert.equal(data.stats.riders,0);
});
test('membership revocation and rejoining cannot inherit old entries; retired Club denies everyone',async()=>{
  await call({method:'POST',revision:0,body:contribution('public')});docs.get(`clubs/${clubId}/members/alice`).joinedAt='membership-2';
  assert.equal((await list('bob')).entries.length,0);await backend.alarm();assert.equal((await list()).stats.rides,0);
  docs.get('clubs/'+clubId).state='deleted';assert.equal((await call()).status,403);assert.equal((await call({uid:null})).status,403);
});
test('only the rider withdraws a contribution and corrections never go negative',async()=>{
  await call({method:'POST',revision:0,body:contribution()});const entry=(await list()).entries[0];
  assert.equal((await call({uid:'owner',method:'DELETE',revision:1,path:'/'+entry.id})).status,403);
  assert.equal((await call({method:'DELETE',revision:1,path:'/'+entry.id})).status,200);assert.equal((await list()).stats.rides,0);
  assert.equal((await call({method:'DELETE',revision:2,path:'/'+entry.id})).status,200);
});
test('source/authority outage fails closed and never purges valid history',async()=>{
  await call({method:'POST',revision:0,body:contribution()});unavailable=true;
  assert.equal((await call()).status,503);await backend.alarm();unavailable=false;assert.equal((await list()).entries.length,1);
});
test('completed Group participation is separate from personal ride mileage; cancelled/absent participant deny',async()=>{
  docs.set('groupSessions/group-1',{id:'group-1',clubId,state:'completed',activityType:'meet',title:'Meet',startsAt:2000000,createdAt:'group-source',category:'open'});
  docs.set('groupSessions/group-1/participants/alice',{uid:'alice'});
  const body={sourceType:'group',sourceId:'group-1',audience:'members',consent:true};
  assert.equal((await call({method:'POST',revision:0,body})).status,200);
  await call({method:'POST',revision:1,body:contribution()});const data=await list();assert.equal(data.stats.rides,1);assert.equal(data.stats.meet,1);assert.equal(data.stats.riders,1);assert.equal(data.stats.distanceMeters,10000);
  docs.get('groupSessions/group-1').state='cancelled';assert.equal((await call({method:'POST',revision:2,body})).status,403);
});
test('disabled/expired Auth denies and owner defaults never publish anyone else',async()=>{
  accounts.set('alice',{disabled:true});assert.equal((await call()).status,401);accounts.clear();
  await call({method:'POST',revision:0,body:contribution('private')});
  await call({uid:'owner',method:'PUT',revision:1,body:{defaultAudience:'public'}});assert.equal((await list(null)).entries.length,0);
});
test('trusted audience totals count unique riders once and never include another private contribution',async()=>{
  await call({method:'POST',revision:0,body:contribution('public')});ride('alice','ride-2');ride('bob','ride-1');
  await call({method:'POST',revision:1,body:{...contribution('members'),sourceId:'ride-2'}});
  await call({uid:'bob',method:'POST',revision:2,body:contribution('private')});
  let data=await list('owner');assert.equal(data.stats.rides,2);assert.equal(data.stats.riders,1);assert.equal(data.stats.distanceMeters,20000);
  data=await list(null);assert.equal(data.stats.rides,1);assert.equal(data.stats.riders,1);
  data=await list('bob');assert.equal(data.stats.rides,3);assert.equal(data.stats.riders,2);
});
test('source incarnation change and cancelled Group correction remove stale totals without route duplication',async()=>{
  await call({method:'POST',revision:0,body:contribution('public')});docs.get('users/alice/sessions/ride-1').createdAt='new-source';
  assert.equal((await list(null)).entries.length,0);await backend.alarm();assert.equal((await list()).stats.distanceMeters,0);
});

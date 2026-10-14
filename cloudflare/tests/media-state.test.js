// Deterministic authority/outage/quota fixtures. The native R2/SQLite gateway
// integration is separately exercised in runtime.test.js; no cloud request occurs.
import {test,before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MediaState} from '../src/MediaState.js';
const pid='11111111-1111-4111-8111-111111111111',vid='22222222-2222-4222-8222-222222222222';
const fixtures=JSON.parse(await readFile(new URL('./media-fixtures.json',import.meta.url),'utf8'));
const png=Buffer.from(fixtures['image/png'],'base64'),jpeg=Buffer.from(fixtures['image/jpeg'],'base64');
let env,storage,objects,docs,accounts,backend,savedFetch,failWrites,failReads,commits;
const encode=v=>v===null?{nullValue:null}:typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}};
class Storage {
  constructor(){this.map=new Map();this.alarm=null;}
  async get(key){return structuredClone(this.map.get(key));}
  async put(key,value){this.map.set(key,structuredClone(value));}
  async delete(key){return this.map.delete(key);}
  async list({prefix='',limit=10000}={}){return new Map([...this.map].filter(([key])=>key.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit).map(([k,v])=>[k,structuredClone(v)]));}
  async transaction(fn){const copy=new Storage();copy.map=structuredClone(this.map);const result=await fn(copy);this.map=copy.map;return result;}
  async getAlarm(){return this.alarm;}async setAlarm(value){this.alarm=value;}async deleteAlarm(){this.alarm=null;}
}
before(async()=>{
  const {privateKey}=await generateKeyPair('RS256',{extractable:true}),pem=await exportPKCS8(privateKey);
  env={FIREBASE_PROJECT_ID:'motodash-87bf8',FIRESTORE_SERVICE_ACCOUNT:'{}',MEDIA_SERVICE_ACCOUNT:JSON.stringify({type:'service_account',project_id:'motodash-87bf8',client_email:'motodash-media@motodash-87bf8.iam.gserviceaccount.com',private_key:pem})};
  savedFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    const host=new URL(url).hostname;
    if(host==='oauth2.googleapis.com')return Response.json({access_token:'fixture-oauth',expires_in:3600});
    const input=JSON.parse(options.body);
    if(host==='identitytoolkit.googleapis.com')return Response.json({users:input.localId.map(localId=>({localId,validSince:'0',...accounts.get(localId)}))});
    assert.equal(host,'firestore.googleapis.com','test must not escape to production');
    if(input.writes){commits++;if(failWrites && commits>=failWrites)return Response.json({error:'fixture'},{status:503});
      for(const write of input.writes){const path=(write.update?.name || write.delete).split('/documents/')[1];assert(path.startsWith('mediaRecords/'));
        if(write.delete)docs.delete(path);else docs.set(path,write.update.fields);}return Response.json({commitTime:new Date().toISOString()});}
    if(failReads)return Response.json({error:'fixture'},{status:503});
    return Response.json(input.documents.map(name=>{const data=docs.get(name.split('/documents/')[1]);return {...(data?{found:{name,fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]))}}:{missing:name}),readTime:'2026-10-14T00:00:00Z'};}));
  };
});
after(()=>{globalThis.fetch=savedFetch;});
beforeEach(()=>{
  storage=new Storage();objects=new Map();docs=new Map();accounts=new Map();failWrites=failReads=commits=0;
  env.MEDIA_BUCKET={async put(key,bytes){objects.set(key,Buffer.from(bytes));},async get(key){return objects.has(key)?{body:objects.get(key)}:null;},async delete(key){objects.delete(key);}};
  backend=new MediaState({storage},env);
  docs.set('profileOwners/'+pid,{ownerUid:'alice'});docs.set('users/alice/preferences/publicProfile',{publicId:pid,state:'active',visibility:'public',vehicleIds:[vid]});docs.set('publicProfiles/'+pid,{id:pid});
});
async function call(path,{uid='alice',method='GET',revision,body,published=false,mime='image/png',identity={}}={}) {
  const headers={'X-MotoDash-Identity':JSON.stringify(uid?{uid,expiresAt:Date.now()+3600000,authTime:Date.now()-10000,...identity}:null),
    'X-MotoDash-Caller':createHash('sha256').update(uid || 'anonymous').digest('hex'),'Content-Type':mime,'X-Media-Published':String(published)};
  if(revision!==undefined)headers['If-Match']=String(revision);
  return backend.fetch(new Request('https://media.test/v1/media/'+path,{method,headers,body}));
}
const path='resources/profile/'+pid;
async function upload({target=path,slot='avatar',revision=0,...options}={}) {return call(target+'/slots/'+slot,{method:'POST',body:png,revision,...options});}
async function info(target=path,uid='alice'){const r=await call(target,{uid});assert.equal(r.status,200);return r.json();}
test('media publication toggles without rewriting pixels and current profile privacy revokes',async()=>{
  const r=await upload();assert.equal(r.status,201);const {id}=await r.json();
  assert.equal((await call('images/'+id,{uid:null})).status,403);
  assert.equal((await call(path+'/slots/avatar',{method:'PUT',revision:1,body:JSON.stringify({published:true})})).status,200);
  assert.equal((await call('images/'+id,{uid:null})).status,200);assert.equal(objects.size,1);
  docs.get('users/alice/preferences/publicProfile').visibility='private';assert.equal((await call('images/'+id,{uid:null})).status,403);
  docs.get('users/alice/preferences/publicProfile').visibility='public';assert.equal((await call('images/'+id,{uid:null})).status,200);
  assert.equal((await call(path+'/slots/avatar',{method:'PUT',revision:2,body:JSON.stringify({published:false})})).status,200);
  assert.equal((await call('images/'+id,{uid:'bob'})).status,403);
});
test('cross-account upload/delete/theme and forged private image reads denied',async()=>{
  const {id}=await (await upload()).json();
  for(const method of ['POST','DELETE','PUT'])assert.equal((await call(path+'/slots/avatar',{uid:'bob',method,revision:1,body:method==='DELETE'?undefined:png})).status,403);
  assert.equal((await call('images/'+id,{uid:'bob'})).status,403);assert.equal((await call('images/'+crypto.randomUUID(),{uid:'alice'})).status,404);
});
test('expired, disabled and revoked Auth credentials denied even for public images',async()=>{
  const {id}=await (await upload({published:true})).json();
  assert.equal((await call('images/'+id,{identity:{expiresAt:1}})).status,401);
  accounts.set('alice',{disabled:true});assert.equal((await call('images/'+id)).status,401);
  accounts.set('alice',{validSince:String(Math.floor(Date.now()/1000))});assert.equal((await call('images/'+id)).status,401);
});
test('spoofed MIME, SVG, oversized declared/streaming and dimensions denied',async()=>{
  assert.equal((await upload({mime:'image/jpeg'})).status,415);
  assert.equal((await upload({body:new TextEncoder().encode('<svg>'+('x'.repeat(30))+'</svg>'),mime:'image/svg+xml'})).status,415);
  assert.equal((await upload({body:new Uint8Array(1500001)})).status,413);
  assert.equal(objects.size,0);
});
test('concurrent replace/delete uses one revision and never exposes old objects',async()=>{
  const {id}=await (await upload()).json();
  const results=await Promise.all([upload({revision:1}),call(path+'/slots/avatar',{method:'DELETE',revision:1})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  assert.equal((await call('images/'+id)).status,404);assert.equal(objects.size,1);
});
test('per-user file quota enforced server-side including pending objects',async()=>{
  for(let i=0;i<30;i++)await storage.put('image:quota'+i,{ownerUid:'alice',bytes:20,state:'pending'});
  const r=await upload();assert.equal(r.status,409);assert.equal((await r.json()).error,'quota');assert.equal(objects.size,0);
});
test('per-user bytes and global file quotas enforced before R2 writes',async()=>{
  await storage.put('image:quota',{ownerUid:'alice',bytes:30000000,state:'deleting'});assert.equal((await upload()).status,409);
  storage.map.clear();for(let i=0;i<2000;i++)await storage.put('image:q'+i,{ownerUid:'other',bytes:1});assert.equal((await upload()).status,409);
});
test('uploads limited to ten per hour despite repeated replacements',async()=>{
  for(let revision=0;revision<10;revision++)assert.equal((await upload({revision})).status,201);
  const r=await upload({revision:10});assert.equal(r.status,429);assert.equal((await r.json()).error,'rate_limited');
});
test('read rate bounded server-side for signed-in and anonymous callers',async()=>{
  for(const uid of ['bob',null]){for(let i=0;i<120;i++)assert.equal((await call(path,{uid})).status,200);assert.equal((await call(path,{uid})).status,429);}
});
test('orphaned upload on Firestore failure is journaled and alarm deletes bytes/references',async()=>{
  failWrites=1;assert.equal((await upload()).status,503);assert.equal(objects.size,1);assert.equal((await storage.list({prefix:'image:'})).size,1);
  failWrites=0;await backend.alarm();assert.equal(objects.size,0);assert.equal((await storage.list({prefix:'image:'})).size,0);
});
test('failure after image mirror does not orphan a resource mirror',async()=>{
  failWrites=2;assert.equal((await upload()).status,503);assert.equal(objects.size,1);
  failWrites=0;await backend.alarm();assert.equal(objects.size,0);assert.equal((await storage.list({prefix:'mirror:'})).size,0);
  assert(![...docs.keys()].some(key=>key.startsWith('mediaRecords/')));
});
test('authority outage never becomes deletion proof; retired source cleans safely',async()=>{
  const {id}=await (await upload({published:true})).json();failReads=true;await backend.alarm();assert.equal(objects.size,1);
  failReads=false;docs.get('users/alice/preferences/publicProfile').state='retired';assert.equal((await call('images/'+id,{uid:null})).status,403);
  await backend.alarm();assert.equal(objects.size,0);
});
test('deleted/recreated vehicle cannot inherit old private or public photos',async()=>{
  docs.set('users/alice/vehicles/'+vid,{id:vid,ownerUid:'alice',visibility:'public',createdAt:'original'});
  const target='resources/vehicle/'+vid,{id}=await (await upload({target,slot:'photo0'})).json();
  docs.get('users/alice/vehicles/'+vid).createdAt='new-incarnation';assert.equal((await call('images/'+id)).status,403);assert.equal((await info(target)).images.length,0);
  assert.equal(objects.size,0);
});
test('revoked Club Admin cannot replace media; current members retain private branding',async()=>{
  docs.set('clubs/'+pid,{id:pid,ownerUid:'alice',state:'active',visibility:'private',createdAt:'original'});docs.set(`clubs/${pid}/members/bob`,{uid:'bob',technicalRole:'admin'});
  const target='resources/club/'+pid,{id}=await (await upload({target,slot:'logo',uid:'bob'})).json();
  docs.get(`clubs/${pid}/members/bob`).technicalRole='member';assert.equal((await upload({target,slot:'logo',uid:'bob',revision:1})).status,403);
  assert.equal((await call('images/'+id,{uid:'bob'})).status,200);assert.equal((await call('images/'+id,{uid:'outsider'})).status,403);
  docs.get('clubs/'+pid).state='deleted';assert.equal((await call('images/'+id)).status,403);await backend.alarm();assert.equal(objects.size,0);
});
test('private Group banner retained after creator role removal; authorized Admin can manage',async()=>{
  docs.set('clubs/'+vid,{id:vid,ownerUid:'other',state:'active',visibility:'private',createdAt:'club'});
  docs.set(`clubs/${vid}/members/alice`,{uid:'alice',technicalRole:'host'});docs.set(`clubs/${vid}/members/bob`,{uid:'bob',technicalRole:'admin'});
  docs.set('groupSessions/'+pid,{id:pid,creatorUid:'alice',clubId:vid,createdAt:'original',state:'scheduled',visibility:'private',startsAt:Date.now(),endsAt:null});
  const target='resources/group/'+pid,{id}=await (await upload({target,slot:'banner'})).json();docs.delete(`clubs/${vid}/members/alice`);
  await backend.alarm();assert.equal(objects.size,1);assert.equal((await call('images/'+id,{uid:'bob'})).status,200);assert.equal((await upload({target,slot:'banner',revision:1})).status,403);
});
test('rank raster constraints do not grant technical roles',async()=>{
  docs.set('clubs/'+pid,{id:pid,ownerUid:'alice',state:'active',visibility:'public',createdAt:'original'});docs.set(`clubs/${pid}/ranks/${vid}`,{id:vid,name:'Captain',createdAt:'rank'});
  const target=`resources/rank/${pid}/${vid}`;assert.equal((await upload({target,slot:'icon',mime:'image/jpeg',body:jpeg})).status,415);
  assert.equal((await upload({target,slot:'icon'})).status,201);assert.equal((await upload({target,slot:'icon',uid:'bob',revision:1})).status,403);
});
test('image cache and Firestore mirrors expose no server object key or secret',async()=>{
  const {id}=await (await upload({published:true})).json();const r=await call('images/'+id,{uid:null});
  assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
  for(const [key,value] of docs)if(key.startsWith('mediaRecords/'))assert(!JSON.stringify(value).includes('objectKey'));
  const summary=await info();assert.deepEqual(Object.keys(summary).sort(),['canWrite','images','revision','theme']);assert(!JSON.stringify(summary).includes('ownerUid'));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8,decodeJwt} from 'jose';
import {readDocuments,authorizeMany} from '../src/firestoreAuthz.js';
const id='12345678-1234-4123-8123-123456789012';
test('OAuth uses server-only identity; Firestore REST consistency and outages',async()=>{
  const {privateKey}=await generateKeyPair('RS256',{extractable:true});
  const env={FIREBASE_PROJECT_ID:'motodash-87bf8',FIRESTORE_SERVICE_ACCOUNT:JSON.stringify({project_id:'motodash-87bf8',
    client_email:'test-reader@motodash-87bf8.iam.gserviceaccount.com',private_key:await exportPKCS8(privateKey)})};
  const original=globalThis.fetch;let calls=[], fail=false;
  globalThis.fetch=async(url,opts)=>{
    calls.push({url:String(url),opts});
    if(String(url).includes('oauth2')) {
      const jwt=decodeJwt(opts.body.get('assertion'));assert.equal(jwt.scope,'https://www.googleapis.com/auth/datastore');
      assert.equal(jwt.iss,'test-reader@motodash-87bf8.iam.gserviceaccount.com');
      return Response.json({access_token:'local-test-token',expires_in:3600});
    }
    if(fail)return new Response('',{status:503});
    const body=JSON.parse(opts.body);assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,'Bearer local-test-token');
    return Response.json(body.documents.map(name=>({missing:name,readTime:'2026-10-10T00:00:00Z'})));
  };
  try {
    const missing=await readDocuments(env,['groupSessions/'+id],AbortSignal.timeout(1000));
    assert.equal(missing.docs.get('groupSessions/'+id),null);
    await readDocuments(env,['clubs/club'],AbortSignal.timeout(1000),missing.readTime);
    assert.equal(JSON.parse(calls.at(-1).opts.body).readTime,missing.readTime);
    fail=true;await assert.rejects(()=>readDocuments(env,['clubs/club'],AbortSignal.timeout(1000)));
    await assert.rejects(()=>readDocuments({...env,FIREBASE_PROJECT_ID:'wrong'},['clubs/club'],AbortSignal.timeout(1000)));
  } finally {globalThis.fetch=original;}
});
test('authorization uses the parent snapshot time for all child/Club reads',async()=>{
  const calls=[];
  const reader=async(env,paths,signal,readTime)=>{
    calls.push({paths,readTime});return {readTime:'2026-10-10T00:00:00Z',docs:new Map(paths.map(p=>[p,
      p===`groupSessions/${id}`?{id,schemaVersion:1,state:'active',startsAt:Date.now(),endsAt:null,participantCount:1,clubId:'club'}:
      p===`groupSessions/${id}/participants/alice`?{uid:'alice',status:'fuel'}:
      p==='clubs/club'?{id:'club',state:'active'}:null]))};
  };
  const result=await authorizeMany({},id,['alice'],reader);
  assert.equal(result.authorized.get('alice').status,'fuel');assert.equal(calls.length,2);
  assert.equal(calls[1].readTime,'2026-10-10T00:00:00Z');
  assert(calls[1].paths.includes('clubs/club'));
});

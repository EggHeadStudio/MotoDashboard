import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaResource,authorizeStored} from '../src/mediaPolicy.js';
import {validateTheme,THEME_DEFAULTS} from '../src/mediaTheme.js';
const pid='12345678-1234-4123-8123-123456789012',vid='87654321-1234-4123-8123-123456789012';
function fixture() {
  const docs=new Map([
    ['profileOwners/'+pid,{ownerUid:'alice'}],['publicProfiles/'+pid,{id:pid}],
    ['users/alice/preferences/publicProfile',{publicId:pid,state:'active',visibility:'public',vehicleIds:[vid]}],
    ['users/alice/vehicles/'+vid,{id:vid,ownerUid:'alice',createdAt:'original',visibility:'public'}],
    [`profileOwners/${pid}/vehicles/${vid}`,{sourceVehicleId:vid,sourceCreatedAt:'original'}],
    [`publicProfiles/${pid}/vehicles/${vid}`,{id:vid}],['users/alice/showcaseRefs/'+vid,{profileId:pid,publicId:vid}],
    ['clubs/'+pid,{id:pid,ownerUid:'alice',createdAt:'original',visibility:'public',state:'active'}],
    ['clubs/'+pid+'/members/alice',{uid:'alice',technicalRole:'owner'}],
    ['clubs/'+pid+'/members/bob',{uid:'bob',technicalRole:'admin'}],
    ['clubs/'+pid+'/ranks/'+vid,{id:vid,createdAt:'original'}],
    ['groupSessions/'+pid,{id:pid,creatorUid:'alice',createdAt:'original',startsAt:Date.now(),endsAt:null,state:'scheduled',visibility:'private',clubId:null}]
  ]);return {docs,get:async path=>docs.get(path) || null};
}
test('media owner can manage private profile; other accounts cannot',async()=>{
  const {docs,get}=fixture();docs.get('users/alice/preferences/publicProfile').visibility='private';
  assert((await mediaResource(get,{kind:'profile',id:pid},'alice',true)).canWrite);
  await assert.rejects(mediaResource(get,{kind:'profile',id:pid},'bob',true),/access_denied/);
  await assert.rejects(mediaResource(get,{kind:'profile',id:pid},null),/access_denied/);
});
test('profile public visibility never publishes every image',async()=>{
  const {get}=fixture(),resource=await mediaResource(get,{kind:'profile',id:pid},'alice',true);
  const record={...resource,published:false};await assert.rejects(authorizeStored(get,record,null),/access_denied/);
  record.published=true;assert((await authorizeStored(get,record,null)).publicRead);
});
test('Garage confidentiality, showcase mapping, hide/delete/incarnation denial',async()=>{
  const {docs,get}=fixture(),resource=await mediaResource(get,{kind:'vehicle',id:vid},'alice',true),record={...resource,published:true};
  await assert.rejects(mediaResource(get,{kind:'vehicle',id:vid},'bob'),/access_denied/);
  assert((await authorizeStored(get,record,null)).publicRead);
  const source=docs.get('users/alice/vehicles/'+vid);source.visibility='private';await assert.rejects(authorizeStored(get,record,null),/access_denied/);
  source.visibility='public';source.createdAt='recreated';await assert.rejects(authorizeStored(get,record,'alice'),/access_denied/);
  docs.delete('users/alice/vehicles/'+vid);await assert.rejects(authorizeStored(get,record,null),/access_denied/);
});
test('Club roles and rank names cannot grant branding permissions; revocation denies',async()=>{
  const {docs,get}=fixture();assert((await mediaResource(get,{kind:'club',id:pid},'bob',true)).canWrite);
  docs.get('clubs/'+pid+'/members/bob').technicalRole='member';docs.get('clubs/'+pid+'/members/bob').rankId='Captain';
  await assert.rejects(mediaResource(get,{kind:'club',id:pid},'bob',true),/access_denied/);
  docs.get('clubs/'+pid).state='deleted';await assert.rejects(mediaResource(get,{kind:'rank',id:pid,child:vid},'alice'),/access_denied/);
});
test('private and unlisted Group images require admitted audience; ban denies',async()=>{
  const {docs,get}=fixture();await assert.rejects(mediaResource(get,{kind:'group',id:pid},'bob'),/access_denied/);
  docs.set(`groupSessions/${pid}/participants/bob`,{uid:'bob'});assert((await mediaResource(get,{kind:'group',id:pid},'bob')).privateRead);
  docs.set(`groupSessions/${pid}/bans/bob`,{uid:'bob'});await assert.rejects(mediaResource(get,{kind:'group',id:pid},'bob'),/access_denied/);
  docs.get('groupSessions/'+pid).visibility='unlisted';await assert.rejects(mediaResource(get,{kind:'group',id:pid},null),/access_denied/);
});
test('themes accept only complete controlled presets without HTML/CSS',()=>{
  assert.deepEqual(validateTheme(THEME_DEFAULTS),THEME_DEFAULTS);
  for(const invalid of [{...THEME_DEFAULTS,css:'x'},{...THEME_DEFAULTS,accent:'#000000'},{...THEME_DEFAULTS,icon:'<svg>'},null,[]])assert.throws(()=>validateTheme(invalid),/bad_request/);
});

import {importPKCS8,SignJWT} from 'jose';
import {PROJECT} from './auth.js';
const base=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const name=base.slice('https://firestore.googleapis.com/v1/'.length);
let cache=null,pending=null;
export function decodeFields(fields={}) {
  return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,decode(value)]));
}
function decode(v) {
  if('mapValue' in v)return decodeFields(v.mapValue.fields);
  if('arrayValue' in v)return (v.arrayValue.values || []).map(decode);
  if('timestampValue' in v)return v.timestampValue;
  if('integerValue' in v)return Number(v.integerValue);
  for(const key of ['stringValue','doubleValue','booleanValue','nullValue'])if(key in v)return v[key];
  return undefined;
}
function encode(v) {
  if(v===null)return {nullValue:null};if(typeof v==='string')return {stringValue:v};
  if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return {integerValue:String(v)};
  if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};
  return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}};
}
export async function mediaToken(env) {
  const secret=env.MEDIA_SERVICE_ACCOUNT;
  if(env.FIREBASE_PROJECT_ID!==PROJECT || !secret)throw Error('not_configured');
  if(cache?.secret===secret && cache.until>Date.now()+60000)return cache.token;
  if(!pending)pending=(async()=>{
    const sa=JSON.parse(secret);
    if(sa.project_id!==PROJECT || !sa.client_email?.endsWith('.iam.gserviceaccount.com') || !sa.private_key
      || secret===env.FIRESTORE_SERVICE_ACCOUNT)throw Error('not_configured');
    const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/cloud-platform'})
      .setProtectedHeader({alg:'RS256'}).setIssuer(sa.client_email).setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt().setExpirationTime('1h').sign(await importPKCS8(sa.private_key,'RS256'));
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(6000),
      body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
    if(!r.ok)throw Error('unavailable');const data=await r.json();
    if(typeof data.access_token!=='string' || !Number.isFinite(data.expires_in))throw Error('unavailable');
    cache={secret,token:data.access_token,until:Date.now()+Math.min(data.expires_in,3600)*1000};return cache.token;
  })().finally(()=>{pending=null;});return pending;
}
export function createMediaReader(env) {
  let readTime=null;const docs=new Map();
  return async path=>{
    if(docs.has(path))return docs.get(path);
    const r=await fetch(base+':batchGet',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(6000),
      headers:{Authorization:'Bearer '+await mediaToken(env),'Content-Type':'application/json'},
      body:JSON.stringify({documents:[name+'/'+path],...(readTime?{readTime}:{})})});
    if(!r.ok)throw Error('unavailable');const rows=await r.json();
    if(!Array.isArray(rows)||rows.length!==1||!rows[0].readTime || (rows[0].found?.name || rows[0].missing)!==name+'/'+path)throw Error('unavailable');
    readTime ||= rows[0].readTime;const value=rows[0].found?decodeFields(rows[0].found.fields):null;docs.set(path,value);return value;
  };
}
export async function writeMediaMetadata(env,id,value) {
  if(!/^[0-9a-f-]{36}$/.test(id))throw Error('bad_request');
  const r=await fetch(base+':commit',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(6000),
    headers:{Authorization:'Bearer '+await mediaToken(env),'Content-Type':'application/json'},
    body:JSON.stringify({writes:[value?{update:{name:name+'/mediaRecords/'+id,fields:encode(value).mapValue.fields}}:{delete:name+'/mediaRecords/'+id}]})});
  if(!r.ok)throw Error('unavailable');
}
export async function verifyMediaAccount(env,identity) {
  if(!identity)return;
  if(identity.expiresAt<=Date.now())throw Error('invalid_token');
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,{
    method:'POST',redirect:'manual',signal:AbortSignal.timeout(6000),headers:{Authorization:'Bearer '+await mediaToken(env),'Content-Type':'application/json'},
    body:JSON.stringify({localId:[identity.uid]})});
  if(!r.ok)throw Error('unavailable');const data=await r.json(),user=data.users?.find(user=>user.localId===identity.uid);
  if(!user || user.disabled || Number(user.validSince || 0)*1000>identity.authTime)throw Error('invalid_token');
}

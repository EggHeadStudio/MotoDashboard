import {importPKCS8,SignJWT} from 'jose';
import {PROJECT} from './auth.js';
let oauth=null, pending=null;
const ROOT='https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents';
async function accessToken(env,signal) {
  if(env.FIREBASE_PROJECT_ID!==PROJECT || !env.FIRESTORE_SERVICE_ACCOUNT) throw Error('not_configured');
  if(oauth?.secret===env.FIRESTORE_SERVICE_ACCOUNT && oauth.until>Date.now()+60000) return oauth.token;
  if(!pending) pending=(async()=>{
    const sa=JSON.parse(env.FIRESTORE_SERVICE_ACCOUNT);
    if(sa.project_id!==PROJECT || !sa.client_email?.endsWith('.iam.gserviceaccount.com') || !sa.private_key) throw Error('not_configured');
    const key=await importPKCS8(sa.private_key,'RS256');
    const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/datastore'})
      .setProtectedHeader({alg:'RS256',typ:'JWT'}).setIssuer(sa.client_email)
      .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal,redirect:'manual',
      body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
    if(!response.ok) throw Error('authority_unavailable');const body=await response.json();
    if(typeof body.access_token!=='string' || !Number.isFinite(body.expires_in)) throw Error('authority_unavailable');
    oauth={secret:env.FIRESTORE_SERVICE_ACCOUNT,token:body.access_token,until:Date.now()+body.expires_in*1000};return oauth.token;
  })().finally(()=>{pending=null;});
  return pending;
}
function decode(value) {
  if('stringValue' in value) return value.stringValue;
  if('integerValue' in value) return Number(value.integerValue);
  if('doubleValue' in value) return value.doubleValue;
  if('nullValue' in value) return null;
  if('booleanValue' in value) return value.booleanValue;
  if('mapValue' in value) return fields(value.mapValue.fields);
  return undefined;
}
const fields=value=>Object.fromEntries(Object.entries(value || {}).map(([k,v])=>[k,decode(v)]));
export async function readDocuments(env,paths,signal,readTime=null) {
  const token=await accessToken(env,signal);
  const response=await fetch(ROOT+':batchGet',{method:'POST',signal,redirect:'manual',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({documents:paths.map(path=>ROOT.replace('https://firestore.googleapis.com/v1/','')+'/'+path),...(readTime?{readTime}:{})})});
  if(!response.ok) throw Error('authority_unavailable');
  const rows=await response.json();if(!Array.isArray(rows) || rows.length!==paths.length) throw Error('authority_unavailable');
  const docs=new Map();let time=null;
  for(const row of rows) {
    const full=row.found?.name || row.missing, prefix=ROOT.replace('https://firestore.googleapis.com/v1/','')+'/';
    if(!full?.startsWith(prefix) || !row.readTime) throw Error('authority_unavailable');
    const path=full.slice(prefix.length); if(!paths.includes(path) || docs.has(path)) throw Error('authority_unavailable');
    docs.set(path,row.found?fields(row.found.fields):null);time=time || row.readTime;
  }
  return {docs,readTime:time};
}
export function evaluateAuthority(session,participant,ban,club,uid,id) {
  if(!session || session.id!==id || session.state!=='active' || session.schemaVersion!==1
    || !Number.isInteger(session.participantCount) || session.participantCount<1 || session.participantCount>50
    || !participant || participant.uid!==uid || ban
    || (session.clubId && (!club || club.id!==session.clubId || !['active','archived'].includes(club.state)))) return null;
  return participant;
}
export async function authorizeMany(env,id,uids,reader=readDocuments) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
    || !uids.length || uids.length>50 || uids.some(uid=>typeof uid!=='string' || !uid || uid.length>128 || /[\/\x00-\x1f]/.test(uid))) throw Error('access_denied');
  const started=Date.now(),signal=AbortSignal.timeout(8000), base='groupSessions/'+id;
  const parent=await reader(env,[base],signal);const session=parent.docs.get(base);
  if(session?.clubId && !/^[A-Za-z0-9_-]{1,100}$/.test(session.clubId)) throw Error('access_denied');
  const paths=uids.flatMap(uid=>[base+'/participants/'+uid,base+'/bans/'+uid,'displayProfiles/'+uid]);
  if(session?.clubId) paths.push('clubs/'+session.clubId);
  const result=await reader(env,paths,signal,parent.readTime);
  const club=session?.clubId?result.docs.get('clubs/'+session.clubId):null;
  const authorized=new Map();
  for(const uid of uids) {
    const participant=evaluateAuthority(session,result.docs.get(base+'/participants/'+uid),result.docs.get(base+'/bans/'+uid),club,uid,id);
    if(participant) {
      const name=result.docs.get('displayProfiles/'+uid)?.displayName;
      authorized.set(uid,{status:['ok','fuel','mechanical','help'].includes(participant.status)?participant.status:'ok',
        displayName:typeof name==='string'?name.slice(0,64):null,
        vehicle:participant.vehicle?{nickname:String(participant.vehicle.nickname).slice(0,64),category:String(participant.vehicle.category).slice(0,30)}:null,
        clubIdentity:participant.clubIdentity?{name:String(participant.clubIdentity.name).slice(0,80),rank:participant.clubIdentity.rank?String(participant.clubIdentity.rank).slice(0,64):null}:null});
    }
  }
  if(signal.aborted) throw Error('authority_unavailable');
  return {authorized,ended:!session || session.state!=='active' || Boolean(session.clubId && (!club || club.state==='deleted')),checkedAt:started};
}

import {decodeProtectedHeader, importX509, jwtVerify} from 'jose';
export const PROJECT='motodash-87bf8';
const CERTS='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cached=null, loading=null;
async function publicKeys() {
  if(cached?.until>Date.now()) return cached.keys;
  if(!loading) loading=(async()=>{
    const response=await fetch(CERTS,{signal:AbortSignal.timeout(5000),redirect:'error'});
    if(!response.ok) throw Error('keys_unavailable');
    const body=await response.json();const keys=new Map();
    for(const [id,cert] of Object.entries(body)) keys.set(id,await importX509(cert,'RS256'));
    if(!keys.size) throw Error('keys_unavailable');
    const seconds=Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control') || '')?.[1] || 300);
    cached={keys,until:Date.now()+Math.min(seconds,21600)*1000};return keys;
  })().finally(()=>{loading=null;});
  return loading;
}
export async function verifyFirebaseToken(token, project, keys=null, now=Date.now()) {
  if(project!==PROJECT || typeof token!=='string' || token.length>10000 || token.split('.').length!==3) throw Error('invalid_token');
  const header=decodeProtectedHeader(token);
  if(header.alg!=='RS256' || typeof header.kid!=='string' || header.kid.length>200) throw Error('invalid_token');
  const key=(keys ?? await publicKeys()).get(header.kid);if(!key) throw Error('invalid_token');
  const {payload:p}=await jwtVerify(token,key,{algorithms:['RS256'],audience:PROJECT,
    issuer:'https://securetoken.google.com/'+PROJECT,currentDate:new Date(now),requiredClaims:['sub','exp','iat','auth_time']});
  const seconds=now/1000;
  if(typeof p.sub!=='string' || !p.sub || p.sub.length>128 || /[\/\x00-\x1f]/.test(p.sub)
    || ![p.exp,p.iat,p.auth_time].every(Number.isSafeInteger)
    || p.iat>seconds || p.auth_time>seconds || p.exp<=seconds || p.exp<=p.iat
    || p.auth_time>p.iat || p.exp-p.iat>3600) throw Error('invalid_token');
  return {uid:p.sub,expiresAt:p.exp*1000};
}

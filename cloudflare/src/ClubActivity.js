import {verifyMediaAccount} from './mediaFirestore.js';
import {activityReader,clubAudience,canReadActivity,verifyActivitySource,activityIsCurrent,publicActivity,adjustActivityStats,visibleActivityStats,audiences} from './clubActivityPolicy.js';

// One serialized bounded ledger per immutable Club, no browser counter or Firestore writer.
export class ClubActivity{
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.queue=Promise.resolve();this.waiting=0;}
  fetch(request){
    if(this.waiting>=20)return Response.json({error:'rate_limited'},{status:429});this.waiting++;
    const result=this.queue.then(()=>this.handle(request));this.queue=result.catch(()=>{});
    return result.finally(()=>this.waiting--);
  }
  async handle(request){
    const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    try{
      const url=new URL(request.url),match=/^\/v1\/clubs\/([0-9a-f-]{36})\/activity(?:\/([0-9a-f-]{36}))?$/.exec(url.pathname);
      if(!match)throw Error('bad_request');const [,clubId,entryId]=match;
      const identity=JSON.parse(request.headers.get('X-MotoDash-Identity') || 'null');await verifyMediaAccount(this.env,identity);
      const read=activityReader(this.env),viewer=await clubAudience(read,clubId,identity?.uid);
      const data=await this.ctx.storage.get('ledger') || {clubId,revision:0,entries:{},stats:{},defaultAudience:'private',checkedAt:Date.now(),cursor:0};
      if(data.clubId!==clubId)throw Error('access_denied');
      // Bounded caller rates stay private inside this Club's DO and expire by minute.
      const caller=identity?.uid || request.headers.get('X-MotoDash-Caller'),minute=Math.floor(Date.now()/60000);
      const rate=await this.ctx.storage.get('rate') || {minute,callers:{}};if(rate.minute!==minute){rate.minute=minute;rate.callers={};}
      if(!caller || (rate.callers[caller] || 0)>=30 || Object.keys(rate.callers).length>=200 && !rate.callers[caller])throw Error('rate_limited');
      rate.callers[caller]=(rate.callers[caller] || 0)+1;await this.ctx.storage.put('rate',rate);
      if(request.method==='GET'&&!entryId){
        const cursor=url.searchParams.get('cursor');if([...url.searchParams.keys()].some(k=>k!=='cursor')||cursor&&!/^[0-9a-f-]{36}$/.test(cursor))throw Error('bad_request');
        const rows=Object.values(data.entries).sort((a,b)=>b.summary.startedAt-a.summary.startedAt||a.id.localeCompare(b.id));
        const start=cursor?rows.findIndex(row=>row.id===cursor)+1:0;if(cursor&&start===0)throw Error('conflict');
        const page=rows.slice(start,start+10),entries=[];
        // Check current source/member incarnation even when a stale ledger entry remains.
        for(const entry of page){if(!canReadActivity(entry,viewer))continue;
          try{const source=await verifyActivitySource(read,clubId,entry.uid,entry.sourceType,entry.sourceId);if(activityIsCurrent(entry,source))entries.push(publicActivity(entry,viewer));}
          catch(error){if(!['access_denied','bad_request'].includes(error.message))throw error;}
        }
        return reply({revision:data.revision,entries,next:start+page.length<rows.length?page.at(-1)?.id:null,
          stats:visibleActivityStats(data.stats,viewer),checkedAt:data.checkedAt,defaultAudience:data.defaultAudience,canManage:viewer.role==='owner'});
      }
      if(!identity)throw Error('invalid_token');
      if(url.search)throw Error('bad_request');
      if(request.headers.get('If-Match')!==String(data.revision))throw Error('conflict');
      let changed=false;
      if(request.method==='POST'&&!entryId){
        if(viewer.club.state!=='active'||!viewer.membership)throw Error('access_denied');
        const body=await boundedJSON(request);
        if(Object.keys(body).some(k=>!['sourceType','sourceId','audience','consent','publicConsent'].includes(k))||body.consent!==true||!audiences.includes(body.audience)
          ||body.audience==='public'&&(body.publicConsent!==true||viewer.club.visibility!=='public'))throw Error('bad_request');
        const verified=await verifyActivitySource(read,clubId,identity.uid,body.sourceType,body.sourceId);
        const key=identity.uid+'/'+body.sourceType+'/'+body.sourceId,old=data.entries[key],count=Object.keys(data.entries).length;
        if(!old&&(count>=100||Object.values(data.entries).filter(row=>row.uid===identity.uid).length>=30))throw Error('quota');
        if(old)adjustActivityStats(data.stats,old,-1);
        const entry={id:old?.id || crypto.randomUUID(),uid:identity.uid,sourceType:body.sourceType,sourceId:body.sourceId,
          audience:body.audience,...verified,createdAt:old?.createdAt || Date.now()};
        data.entries[key]=entry;adjustActivityStats(data.stats,entry,1);changed=true;
      }else if(request.method==='DELETE'&&entryId){
        const found=Object.entries(data.entries).find(([,row])=>row.id===entryId);if(!found)return reply({revision:data.revision});
        const [key,entry]=found;if(entry.uid!==identity.uid)throw Error('access_denied');
        adjustActivityStats(data.stats,entry,-1);delete data.entries[key];changed=true;
      }else if(request.method==='PUT'&&!entryId){
        if(viewer.role!=='owner')throw Error('access_denied');const body=await boundedJSON(request);
        if(Object.keys(body).length!==1||!audiences.includes(body.defaultAudience)||body.defaultAudience==='public'&&viewer.club.visibility!=='public')throw Error('bad_request');
        data.defaultAudience=body.defaultAudience;changed=true;
      }else throw Error('bad_request');
      if(changed){data.revision++;if(new TextEncoder().encode(JSON.stringify(data)).byteLength>100000)throw Error('quota');
        await this.ctx.storage.put('ledger',data);await this.ctx.storage.setAlarm(Date.now()+3600000);}
      return reply({revision:data.revision});
    }catch(error){const code=['access_denied','invalid_token','bad_request','conflict','quota','rate_limited'].includes(error.message)?error.message:'unavailable';
      return reply({error:code},{access_denied:403,invalid_token:401,bad_request:400,conflict:409,quota:429,rate_limited:429}[code] || 503);}
  }
  async alarm(){
    const task=this.queue.then(async()=>{
      const data=await this.ctx.storage.get('ledger');if(!data||!Object.keys(data.entries).length)return;
      const read=activityReader(this.env),keys=Object.keys(data.entries),page=keys.slice(data.cursor,data.cursor+10);let changed=false;
      for(const key of page){const entry=data.entries[key];try{
        const source=await verifyActivitySource(read,data.clubId,entry.uid,entry.sourceType,entry.sourceId);
        if(!activityIsCurrent(entry,source))throw Error('access_denied');
      }catch(error){if(['access_denied','bad_request'].includes(error.message)){adjustActivityStats(data.stats,entry,-1);delete data.entries[key];changed=true;}
        else{await this.ctx.storage.setAlarm(Date.now()+3600000);return;}}
      }
      const removed=keys.length-Object.keys(data.entries).length;
      data.cursor=data.cursor+page.length-removed>=Object.keys(data.entries).length?0:data.cursor+page.length-removed;
      if(data.cursor===0)data.checkedAt=Date.now();if(changed)data.revision++;
      await this.ctx.storage.put('ledger',data);if(Object.keys(data.entries).length)await this.ctx.storage.setAlarm(Date.now()+3600000);
    });this.queue=task.catch(()=>{});return task;
  }
}
async function boundedJSON(request){
  if(Number(request.headers.get('Content-Length') || 0)>2048||!request.body)throw Error('bad_request');
  const reader=request.body.getReader(),chunks=[];let size=0,timer;
  try{await Promise.race([(async()=>{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048)throw Error('bad_request');chunks.push(value);}})(),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('bad_request')),5000);})]);
  }finally{clearTimeout(timer);await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let value;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('bad_request');}
  if(!value||Array.isArray(value)||typeof value!=='object')throw Error('bad_request');return value;
}

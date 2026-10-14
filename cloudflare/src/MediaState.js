import {mediaResource,authorizeStored,mediaSourceExists,uuid} from './mediaPolicy.js';
import {createMediaReader,writeMediaMetadata,verifyMediaAccount} from './mediaFirestore.js';
import {boundedBody,inspectImage} from './mediaImage.js';
import {THEME_DEFAULTS,validateTheme} from './mediaTheme.js';
const MAX_OWNER_FILES=30,MAX_OWNER_BYTES=30000000,MAX_FILES=2000,MAX_BYTES=1000000000;
const slots={profile:['avatar','banner'],vehicle:['photo0','photo1','photo2','photo3','photo4','photo5'],club:['logo','banner'],group:['banner'],rank:['icon']};
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const status={access_denied:403,invalid_token:401,bad_request:400,invalid_image:415,too_large:413,quota:409,conflict:409,rate_limited:429,not_found:404,not_configured:503};
export class MediaState {
  constructor(state,env){this.state=state;this.env=env;this.queue=Promise.resolve();this.waiting=0;}
  serialize(fn) {
    if(this.waiting>=20)return Promise.resolve(response({error:'rate_limited'},429));this.waiting++;
    const next=this.queue.then(fn);this.queue=next.catch(()=>{});return next.finally(()=>this.waiting--);
  }
  async fetch(request){return this.serialize(async()=>{
    try{return await this.handle(request);}catch(error){return response({error:status[error.message]?error.message:'unavailable'},status[error.message] || 503);}
  });}
  async limit(key,max,window) {
    const store=this.state.storage,now=Date.now(),period=Math.floor(now/window),name='rate:'+key;
    const old=await store.get(name),count=old?.period===period?old.count:0;
    if(count>=max)throw Error('rate_limited');
    if(!old){const keys=await store.list({prefix:'rate:',limit:1025});if(keys.size>=1024){
      for(const [k,v] of keys)if(v.expiresAt<now)await store.delete(k);
      if((await store.list({prefix:'rate:',limit:1025})).size>=1024)throw Error('rate_limited');}}
    await store.put(name,{period,count:count+1,expiresAt:(period+1)*window});
  }
  async schedule(){if(await this.state.storage.getAlarm()===null)await this.state.storage.setAlarm(Date.now()+3600000);}
  async handle(request) {
    const identity=JSON.parse(request.headers.get('X-MotoDash-Identity') || 'null'),uid=identity?.uid || null;
    const caller=request.headers.get('X-MotoDash-Caller');if(!caller || !/^[0-9a-f]{64}$/.test(caller))throw Error('bad_request');
    await this.limit('global',2500,86400000);await this.limit(caller+':read',120,60000);await this.schedule();
    if(request.method!=='GET'){if(!uid)throw Error('invalid_token');await this.limit(caller+':write',30,3600000);}
    await verifyMediaAccount(this.env,identity);
    const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean).slice(2),get=createMediaReader(this.env);
    if(parts[0]==='images' && parts.length===2 && uuid(parts[1]) && request.method==='GET') {
      const record=await this.state.storage.get('image:'+parts[1]);if(!record || record.state!=='active')throw Error('not_found');
      const ledger=await this.state.storage.get('resource:'+record.key);
      if(!ledger || ledger.incarnation!==record.incarnation || !Object.values(ledger.slots).includes(record.id))throw Error('not_found');
      await authorizeStored(get,record,uid);
      const object=await this.env.MEDIA_BUCKET.get(record.objectKey);if(!object)throw Error('not_found');
      return new Response(object.body,{headers:{'Content-Type':record.mime,'Content-Length':String(record.bytes),
        'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':'inline'}});
    }
    if(parts[0]!=='resources' || parts.length<3)throw Error('bad_request');
    const kind=parts[1],rid=parts[2],child=['rank','showcase'].includes(kind)?parts[3]:null;
    const length=child===null?3:4,target={kind,id:rid,child},tail=parts.slice(length);
    const resource=await mediaResource(get,target,uid,request.method!=='GET');
    let ledger=await this.state.storage.get('resource:'+resource.key);
    if(ledger && ledger.incarnation!==resource.incarnation) {
      // Recreated source cannot inherit retained references or themes.
      for(const id of Object.values(ledger.slots))await this.retire(id);
      await this.state.storage.put('mirror:'+ledger.metadataId,{metadataId:ledger.metadataId,value:null});await this.schedule();
      try{await this.flushMirror(ledger.metadataId);}catch{}
      await this.state.storage.delete('resource:'+resource.key);ledger=null;
    }
    if(!ledger&&request.method!=='GET') {
      const resources=await this.state.storage.list({prefix:'resource:',limit:2001});
      if(resources.size>=2000 || [...resources.values()].filter(v=>v.ownerUid===resource.ownerUid).length>=100)throw Error('quota');
    }
    ledger ||= {metadataId:crypto.randomUUID(),key:resource.key,target:resource.target,ownerUid:resource.ownerUid,
      incarnation:resource.incarnation,revision:0,slots:{},theme:{...THEME_DEFAULTS,...resource.defaultTheme}};
    if(request.method==='GET' && !tail.length) {
      const images=[];
      for(const [slot,id] of Object.entries(ledger.slots).sort(([a],[b])=>a.localeCompare(b))) {
        const record=await this.state.storage.get('image:'+id);
        if(record?.state==='active' && record.incarnation===resource.incarnation && (resource.canWrite || resource.privateRead || record.published))
          images.push({id,slot,width:record.width,height:record.height,published:record.published});
      }
      return response({revision:ledger.revision,images,theme:ledger.theme,canWrite:resource.canWrite});
    }
    if(!uid || Number(request.headers.get('If-Match'))!==ledger.revision || !request.headers.has('If-Match'))throw Error('conflict');
    if(request.method==='PUT' && tail.length===0) {
      const body=JSON.parse(new TextDecoder().decode(await boundedBody(request,2048)));
      if(Object.keys(body).length!==2||!body.theme||!Array.isArray(body.order))throw Error('bad_request');
      const nextTheme=validateTheme(body.theme),ids=Object.values(ledger.slots);
      if(body.order.length!==ids.length || new Set(body.order).size!==ids.length || body.order.some(id=>!ids.includes(id)))throw Error('bad_request');
      const ordered=kind==='vehicle'?Object.fromEntries(body.order.map((id,i)=>['photo'+i,id])):ledger.slots;
      ledger={...ledger,theme:nextTheme,slots:ordered,revision:ledger.revision+1};
      await this.persistLedger(ledger);return response({revision:ledger.revision});
    }
    if(tail.length!==2||tail[0]!=='slots'||!slots[kind]?.includes(tail[1]))throw Error('bad_request');
    const slot=tail[1],oldId=ledger.slots[slot];
    if(request.method==='PUT') {
      const body=JSON.parse(new TextDecoder().decode(await boundedBody(request,128)));
      if(Object.keys(body).length!==1||typeof body.published!=='boolean'||!oldId)throw Error('bad_request');
      const record=await this.state.storage.get('image:'+oldId);if(record?.state!=='active')throw Error('not_found');
      const next={...record,published:body.published};ledger={...ledger,revision:ledger.revision+1};
      await this.state.storage.transaction(async tx=>{await tx.put('image:'+oldId,next);await tx.put('resource:'+ledger.key,ledger);
        await tx.put('mirror:'+oldId,{metadataId:oldId,value:next});await tx.put('mirror:'+ledger.metadataId,{metadataId:ledger.metadataId,value:ledger});});
      await this.schedule();await this.flushMirror(oldId);await this.flushMirror(ledger.metadataId);return response({revision:ledger.revision});
    }
    if(request.method==='DELETE') {
      ledger={...ledger,slots:{...ledger.slots},revision:ledger.revision+1};delete ledger.slots[slot];
      await this.persistLedger(ledger);if(oldId)await this.retire(oldId);return response({revision:ledger.revision});
    }
    if(request.method!=='POST')throw Error('bad_request');await this.limit(caller+':upload',10,3600000);
    const published=request.headers.get('X-Media-Published');if(!['true','false'].includes(published))throw Error('bad_request');
    const bytes=await boundedBody(request),image=inspectImage(bytes,request.headers.get('Content-Type'));
    if(kind==='rank' && (image.mime==='image/jpeg'||image.width>256||image.height>256))throw Error('invalid_image');
    const all=await this.state.storage.list({prefix:'image:',limit:MAX_FILES+1});
    let ownerFiles=0,ownerBytes=0,totalBytes=0;for(const record of all.values()){totalBytes+=record.bytes;if(record.ownerUid===resource.ownerUid){ownerFiles++;ownerBytes+=record.bytes;}}
    const previous=oldId?await this.state.storage.get('image:'+oldId):null,replacing=previous?.state==='active';
    if(all.size>=MAX_FILES || totalBytes+bytes.length>MAX_BYTES || ownerFiles>=MAX_OWNER_FILES+(replacing?1:0)
      || ownerBytes-(replacing?previous.bytes:0)+bytes.length>MAX_OWNER_BYTES)throw Error('quota');
    // Upload stream/body validation cannot preserve a revoked role or expired token.
    await verifyMediaAccount(this.env,identity);const current=await mediaResource(createMediaReader(this.env),target,uid,true);
    if(current.incarnation!==resource.incarnation)throw Error('access_denied');
    const mediaId=crypto.randomUUID(),record={id:mediaId,...image,key:resource.key,target,ownerUid:resource.ownerUid,
      incarnation:resource.incarnation,objectKey:'images/'+crypto.randomUUID(),published:published==='true',state:'pending',createdAt:Date.now()};
    await this.state.storage.put('image:'+mediaId,record);await this.schedule();
    await this.env.MEDIA_BUCKET.put(record.objectKey,bytes,{httpMetadata:{contentType:image.mime},customMetadata:{mediaId}});
    const finalResource=await mediaResource(createMediaReader(this.env),target,uid,true);
    if(finalResource.incarnation!==resource.incarnation)throw Error('access_denied');
    await writeMediaMetadata(this.env,mediaId,this.metadata(record));
    const next={...ledger,slots:{...ledger.slots,[slot]:mediaId},revision:ledger.revision+1};
    const oldLedger=await this.state.storage.get('resource:'+resource.key);
    await this.state.storage.put('mirror:'+next.metadataId,{metadataId:next.metadataId,value:oldLedger || null});
    await writeMediaMetadata(this.env,next.metadataId,this.metadata(next));
    await this.state.storage.transaction(async tx=>{await tx.put('image:'+mediaId,{...record,state:'active'});await tx.put('resource:'+resource.key,next);await tx.delete('mirror:'+next.metadataId);});
    if(oldId)await this.retire(oldId);return response({id:mediaId,revision:next.revision},201);
  }
  metadata(record) {
    const {objectKey,state,...safe}=record;return {...safe,updatedAt:Date.now()}; // Private Firestore mirror, never public URL/key.
  }
  async persistLedger(ledger) {
    // DO is authoritative; mirror failures are journaled and retried by alarm.
    await this.state.storage.transaction(async tx=>{await tx.put('mirror:'+ledger.metadataId,{metadataId:ledger.metadataId,value:ledger});await tx.put('resource:'+ledger.key,ledger);});await this.schedule();
    await this.flushMirror(ledger.metadataId);
  }
  async flushMirror(id) {
    const journal=await this.state.storage.get('mirror:'+id);if(!journal)return;
    await writeMediaMetadata(this.env,id,journal.value?this.metadata(journal.value):null);await this.state.storage.delete('mirror:'+id);
  }
  async retire(id) {
    const record=await this.state.storage.get('image:'+id);if(!record)return;
    await this.state.storage.put('image:'+id,{...record,state:'deleting'});await this.schedule();
    await this.state.storage.delete('mirror:'+id);
    try{await this.env.MEDIA_BUCKET.delete(record.objectKey);await writeMediaMetadata(this.env,id,null);await this.state.storage.delete('image:'+id);}catch{/* retained deny-first tombstone, alarm retries */}
  }
  async alarm(){return this.serialize(async()=>{
    const store=this.state.storage,now=Date.now();await store.setAlarm(now+3600000);
    // Bounded prototype registry; at most 25 source checks per hourly run.
    const images=await store.list({prefix:'image:',limit:MAX_FILES+1}),cursor=await store.get('cleanupCursor') || '',ordered=[...images.keys()].sort();
    const start=Math.max(0,ordered.findIndex(key=>key>cursor)),keys=ordered.slice(start,start+25);
    for(const key of keys) {
      const record=images.get(key);
      try {
        const ledger=await store.get('resource:'+record.key),referenced=Object.values(ledger?.slots || {}).includes(record.id);
        if(record.state!=='active' || !referenced){await this.retire(record.id);continue;}
        if(!await mediaSourceExists(createMediaReader(this.env),record))await this.retire(record.id);
      }catch{/* Authority outage is not proof of deletion; retain for retry. */}
    }
    await store.put('cleanupCursor',keys.length?keys.at(-1):'');
    for(const [key] of await store.list({prefix:'mirror:',limit:10}))try{await this.flushMirror(key.slice(7));}catch{}
    for(const [key,rate] of await store.list({prefix:'rate:',limit:1025}))if(rate.expiresAt<now)await store.delete(key);
    // Retain source ledger/incarnation as fence. Mirror cleanup of empty/deleted source
    // ledgers is performed below so Firestore does not retain private resource IDs.
    const resources=await store.list({prefix:'resource:',limit:MAX_FILES+1}),resourceCursor=await store.get('resourceCursor') || '';
    const resourceKeys=[...resources.keys()].sort(),resourceStart=Math.max(0,resourceKeys.findIndex(key=>key>resourceCursor)),selected=resourceKeys.slice(resourceStart,resourceStart+25);
    for(const key of selected) {
      const ledger=resources.get(key);
      try{if(!await mediaSourceExists(createMediaReader(this.env),ledger)){
        for(const id of Object.values(ledger.slots))await this.retire(id);
        try{await writeMediaMetadata(this.env,ledger.metadataId,null);await store.delete('mirror:'+ledger.metadataId);await store.delete(key);}catch{}
      }}catch{/* Retain when the authority service is unavailable. */}
    }
    await store.put('resourceCursor',selected.length?selected.at(-1):'');
    if(!images.size&&!resources.size&&!((await store.list({prefix:'mirror:',limit:1})).size))await store.deleteAlarm();
  });}
}

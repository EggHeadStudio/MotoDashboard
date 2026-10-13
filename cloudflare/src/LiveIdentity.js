import {DurableObject} from 'cloudflare:workers';
import {claimDecision} from './activeClaim.js';

// One SQLite object per verified Firebase UID. Reachable only through Worker bindings.
export class LiveIdentity extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.ctx=ctx;}
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async()=>{
      if(request.method!=='POST')return Response.json({error:'bad_request'},{status:400});
      let input;try{input=await request.json();}catch{return Response.json({error:'bad_request'},{status:400});}
      const action=new URL(request.url).pathname.slice(1),now=Date.now();
      const current=await this.ctx.storage.get('claim'),result=claimDecision(current,action,input,now);
      if(result.status!==200)return Response.json({error:result.error,...(result.activeSessionId?{activeSessionId:result.activeSessionId}:{})},{status:result.status});
      if(result.claim){await this.ctx.storage.put('claim',result.claim);await this.ctx.storage.setAlarm(result.claim.until);}
      else {await this.ctx.storage.delete('claim');await this.ctx.storage.deleteAlarm();}
      return Response.json({until:result.claim?.until || null});
    });
  }
  async alarm(){return this.ctx.blockConcurrencyWhile(async()=>{
    const current=await this.ctx.storage.get('claim');
    if(current?.until>Date.now())await this.ctx.storage.setAlarm(current.until);
    else {await this.ctx.storage.delete('claim');await this.ctx.storage.deleteAlarm();}
  });}
}

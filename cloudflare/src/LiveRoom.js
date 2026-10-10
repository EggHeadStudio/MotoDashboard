import {DurableObject} from 'cloudflare:workers';
import {authorizeMany} from './firestoreAuthz.js';
import {randomTicket,ticketHash,consumeTicket,TICKET_TTL} from './tickets.js';
import {parseMessage,positionDecision,MAX_RIDERS,LEASE_MS,EXPIRE_MS} from './protocol.js';

export class LiveRoom extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);this.ctx=ctx;this.env=env;this.sessionId=null;
    ctx.blockConcurrencyWhile(async()=>{this.sessionId=await ctx.storage.get('sessionId') || null;});
  }
  sockets() {return this.ctx.getWebSockets();}
  state(ws) {return ws.deserializeAttachment();}
  save(ws,state) {ws.serializeAttachment(state);}
  send(ws,message) {try {ws.send(JSON.stringify({v:1,...message}));}catch {this.close(ws,'disconnected');}}
  close(ws,reason) {
    const s=this.state(ws);if(!s || s.closed) return;
    this.save(ws,{...s,closed:true,position:null,uid:null});
    try {ws.close(reason==='replaced'?4002:4003,reason);}catch {}
  }
  eligible(ws,now=Date.now()) {
    const s=this.state(ws);return s && !s.closed && s.uid && s.leaseUntil>now && s.expiresAt>now;
  }
  broadcast(message) {for(const ws of this.sockets())if(this.eligible(ws))this.send(ws,message);}
  publicState(s,now=Date.now()) {
    return {riderId:s.riderId,...s.identity,position:s.position && now-s.position.at<EXPIRE_MS?s.position:null};
  }
  async schedule() {
    if(this.sockets().some(ws=>!this.state(ws)?.closed) || (await this.ctx.storage.list({prefix:'ticket:',limit:1})).size)
      await this.ctx.storage.setAlarm(Date.now()+10000);
    else await this.ctx.storage.deleteAlarm();
  }
  async refresh(force=false) {
    const now=Date.now(),sockets=this.sockets().filter(ws=>this.state(ws)?.uid && !this.state(ws).closed);
    if(!sockets.length) return;
    if(!force && sockets.every(ws=>this.state(ws).leaseUntil>now+10000 && this.state(ws).expiresAt>now)) return;
    let result;
    try {result=await authorizeMany(this.env,this.sessionId,[...new Set(sockets.map(ws=>this.state(ws).uid))]);}
    catch {for(const ws of sockets)this.close(ws,'unavailable');return;}
    const departed=[],changedStates=[];
    for(const ws of sockets) {
      const s=this.state(ws),identity=result.authorized.get(s.uid);
      if(!identity || s.expiresAt<=Date.now() || result.checkedAt+LEASE_MS<=Date.now()) {
        if(result.ended)this.send(ws,{type:'session_ended'});
        this.close(ws,result.ended?'session_ended':'access_denied');
        departed.push(s.riderId);continue;
      }
      const changed=JSON.stringify(identity)!==JSON.stringify(s.identity);
      this.save(ws,{...s,identity,leaseUntil:result.checkedAt+LEASE_MS});
      if(changed)changedStates.push(this.publicState(this.state(ws)));
    }
    // Prune every revoked receiver before any private broadcast from this check.
    for(const riderId of departed)this.broadcast({type:'participant_left',riderId});
    for(const participant of changedStates)this.broadcast({type:'participant_update',participant});
  }
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async()=>{
      const path=new URL(request.url).pathname,now=Date.now();
      if(path==='/ticket') {
        const {uid,expiresAt,origin,sessionId}=await request.json();
        if(this.sessionId && this.sessionId!==sessionId) return Response.json({error:'access_denied'},{status:403});
        if(!this.sessionId) {this.sessionId=sessionId;await this.ctx.storage.put('sessionId',sessionId);}
        const tickets=await this.ctx.storage.list({prefix:'ticket:',limit:101});
        for(const [key,ticket] of tickets) if(ticket.until<=now) {await this.ctx.storage.delete(key);tickets.delete(key);}
        if(tickets.size>=100 || [...tickets.values()].some(t=>t.uid===uid && t.until>now+20000)) return Response.json({error:'rate_limited'},{status:429});
        let result;try {result=await authorizeMany(this.env,sessionId,[uid]);}catch {return Response.json({error:'unavailable'},{status:503});}
        if(!result.authorized.has(uid) || expiresAt<=Date.now()) return Response.json({error:'access_denied'},{status:403});
        const ticket=randomTicket(),until=Date.now()+TICKET_TTL;
        await this.ctx.storage.put('ticket:'+await ticketHash(ticket),{uid,origin,sessionId,until,expiresAt});await this.schedule();
        return Response.json({ticket,expiresAt:until,protocol:1});
      }
      if(path!=='/connect' || request.headers.get('X-Session-Id')!==this.sessionId || this.sockets().filter(ws=>!this.state(ws)?.closed).length>=70)
        return Response.json({error:'access_denied'},{status:403});
      const pair=new WebSocketPair(),[client,server]=Object.values(pair);
      this.ctx.acceptWebSocket(server);
      this.save(server,{origin:request.headers.get('Origin'),pendingUntil:now+10000,closed:false,uid:null});
      await this.schedule();return new Response(null,{status:101,webSocket:client});
    });
  }
  async webSocketMessage(ws,raw) {
    return this.ctx.blockConcurrencyWhile(async()=>{
      const now=Date.now();let s=this.state(ws);if(!s || s.closed)return;
      try {
        const m=parseMessage(raw);
        if(!s.uid) {
          if(m.type!=='hello' || now>=s.pendingUntil) throw Error('invalid_ticket');
          const ticket=await consumeTicket(this.ctx.storage,m.ticket,s.origin,this.sessionId,now);
          const result=await authorizeMany(this.env,this.sessionId,[ticket.uid]);
          const identity=result.authorized.get(ticket.uid);if(!identity || ticket.expiresAt<=Date.now())throw Error('access_denied');
          for(const other of this.sockets())if(other!==ws && this.state(other)?.uid===ticket.uid) {
            const previous=this.state(other);this.close(other,'replaced');this.broadcast({type:'participant_left',riderId:previous.riderId});
          }
          if(this.sockets().filter(other=>this.eligible(other)).length>=MAX_RIDERS)throw Error('room_full');
          s={uid:ticket.uid,riderId:crypto.randomUUID(),origin:s.origin,identity,expiresAt:ticket.expiresAt,
            leaseUntil:result.checkedAt+LEASE_MS,lastSeen:now,lastPositionAt:0,seq:0,position:null,bucket:now,messages:0,lastControl:0,closed:false};
          this.save(ws,s);await this.refresh();
          if(!this.eligible(ws))return;
          this.send(ws,{type:'hello',riderId:s.riderId});
          this.send(ws,{type:'snapshot',participants:this.sockets().filter(other=>this.eligible(other)).map(other=>this.publicState(this.state(other)))});
          this.broadcast({type:'participant_update',participant:this.publicState(s)});return;
        }
        if(now-s.bucket>=10000){s.bucket=now;s.messages=0;}
        s.messages++;if(s.messages>8)throw Error('rate_limited');this.save(ws,s);
        if((m.type==='status' || m.type==='revalidate') && now-s.lastControl<10000)throw Error('rate_limited');
        await this.refresh(m.type==='status' || m.type==='revalidate');if(!this.eligible(ws))return;
        s=this.state(ws);s.lastSeen=now;
        if(m.type==='position') {
          const position=positionDecision(s,m,now);s.position=position;s.seq=m.seq;s.lastPositionAt=now;
          this.save(ws,s);this.broadcast({type:'position',riderId:s.riderId,position});
        } else if(m.type==='heartbeat') {
          if(m.sampledAt!==undefined && (!Number.isSafeInteger(m.sampledAt) || m.sampledAt>now+5000 || now-m.sampledAt>15000))throw Error('bad_position');
          if(m.sampledAt && s.position && m.sampledAt>s.position.sampledAt) {
            s.position={...s.position,sampledAt:m.sampledAt,at:now};this.save(ws,s);
            this.broadcast({type:'heartbeat',riderId:s.riderId,at:now});
          }else this.save(ws,s);
          this.send(ws,{type:'heartbeat',at:now});
        } else if(m.type==='status' || m.type==='revalidate') {
          s.lastControl=now;this.save(ws,s);
        } else throw Error('bad_message');
      } catch(error) {
        const code=['bad_message','invalid_ticket','access_denied','room_full','rate_limited','bad_position'].includes(error.message)?error.message:'unavailable';
        this.send(ws,{type:'error',code});this.close(ws,code);
      }
    });
  }
  async alarm() {
    return this.ctx.blockConcurrencyWhile(async()=>{
      const now=Date.now();
      for(const ws of this.sockets()) {
        const s=this.state(ws);if(s.closed)continue;
        if(!s.uid && s.pendingUntil<=now || s.uid && (now-s.lastSeen>70000 || s.expiresAt<=now)) {
          this.close(ws,'disconnected');if(s.uid)this.broadcast({type:'participant_left',riderId:s.riderId});
        } else if(s.position && now-s.position.at>=EXPIRE_MS) {
          this.save(ws,{...s,position:null});this.broadcast({type:'position',riderId:s.riderId,position:null});
        }
      }
      await this.refresh();
      for(const [key,ticket] of await this.ctx.storage.list({prefix:'ticket:',limit:101}))if(ticket.until<=now)await this.ctx.storage.delete(key);
      await this.schedule();
    });
  }
  async webSocketClose(ws) {
    const s=this.state(ws);this.close(ws,'disconnected');
    if(s?.uid)this.broadcast({type:'participant_left',riderId:s.riderId});await this.schedule();
  }
  async webSocketError(ws) {await this.webSocketClose(ws);}
}

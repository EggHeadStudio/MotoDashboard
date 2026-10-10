import {createLiveClient,liveEndpoint} from '../js/live/live-client.js';
import {summarizeLive} from '../js/live/live-summary.js';
const assert=(value,message)=>{if(!value)throw Error(message);};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
class Socket extends EventTarget {
  constructor(url){super();this.url=url;this.readyState=0;this.sent=[];}
  open(){this.readyState=1;this.dispatchEvent(new Event('open'));}
  send(value){this.sent.push(JSON.parse(value));}
  message(value){const event=new Event('message');event.data=JSON.stringify({v:1,...value});this.dispatchEvent(event);}
  close(code=1000,reason=''){this.readyState=3;const event=new Event('close');Object.assign(event,{code,reason});this.dispatchEvent(event);}
}
export async function runLiveClientTests() {
  let uid='alice',clock=Date.now(),sockets=[],requests=[];
  const client=createLiveClient({endpoint:'https://live.example.test',account:()=>uid,now:()=>clock,
    identity:async()=>({uid,token:'fixture-token'}),makeSocket:url=>{const s=new Socket(url);sockets.push(s);return s;},
    fetchImpl:async(url,opts)=>{requests.push({url,opts});return Response.json({ticket:'a'.repeat(64),protocol:1});}});
  client.start(uid,'12345678-1234-4123-8123-123456789012');
  for(let n=0;n<100 && !sockets.length;n++)await new Promise(r=>setTimeout(r,10));
  const s=sockets[0];assert(s,'ticket response opens a socket');s.open();
  assert(!s.url.includes('?') && requests[0].opts.headers.Authorization==='Bearer fixture-token','tokens only in HTTPS header/first frame');
  assert(s.sent[0].type==='hello' && s.sent[0].ticket.length===64,'ticket handshake');
  s.message({type:'hello',riderId:'self'});s.message({type:'snapshot',participants:[{riderId:'self',status:'ok',position:null}]});
  const sample=()=>({accepted:true,timestamp:clock,validatedSpeedKmh:36,coords:{latitude:60,longitude:25,accuracy:5,heading:null}});
  client.sample(sample());client.sample(sample());assert(s.sent.filter(m=>m.type==='position').length===1,'no duplicate coordinates');
  clock+=1000;client.sample({...sample(),coords:{...sample().coords,latitude:60.00001}});assert(s.sent.filter(m=>m.type==='position').length===1,'moving throttle');
  clock+=4000;client.sample({...sample(),coords:{...sample().coords,latitude:60.0005}});assert(s.sent.filter(m=>m.type==='position').length===2,'moving cadence');
  uid='bob';client.sample({...sample(),coords:{...sample().coords,latitude:60.001}});assert(s.sent.filter(m=>m.type==='position').length===2,'account cannot reuse consent');
  client.stop();assert(!client.getState().consent && client.getState().participants.size===0 && s.readyState===3,'stop removes private state');
  let release;const racing=createLiveClient({endpoint:'https://live.example.test',account:()=>uid,identity:()=>new Promise(r=>release=r),makeSocket:()=>{throw Error('stale socket opened');}});
  racing.start(uid,'12345678-1234-4123-8123-123456789012');racing.stop();release({uid,token:'fixture'});await tick();assert(!racing.getState().consent,'late identity ignored');
  assert(liveEndpoint('')===null,'disabled default');for(const value of ['http://evil.test','https://x.test/?token=x','https://user:secret@x.test']) {
    let denied=false;try{liveEndpoint(value);}catch{denied=true;}assert(denied,'bad endpoint denied');
  }
  const members=new Map([['self',{status:'ok',position:{latitude:60,longitude:25,at:clock}}],
    ['fresh',{status:'fuel',position:{latitude:60.01,longitude:25,at:clock}}],
    ['stale',{status:'mechanical',position:{latitude:61,longitude:25,at:clock-50000}}],
    ['expired',{status:'help',position:{latitude:62,longitude:25,at:clock-120000}}]]);
  const summary=summarizeLive({selfId:'self',participants:members,participantCount:5},clock);
  assert(summary.active===2 && summary.stale===1 && summary.noFix===1 && summary.disconnected===1,'honest freshness/presence counts');
  assert(summary.maxDistance>1000 && summary.maxDistance<1200,'regroup uses fresh straight-line separation only');
  assert(summary.statuses.help===1,'live informational statuses');
  return 'live-client token placement, throttling, duplicate suppression, scope/late-response cleanup and endpoint guards';
}

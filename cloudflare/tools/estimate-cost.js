// Reproducible estimates, not production traffic or billing measurements.
// Rates checked against official Cloudflare pricing on 2026-10-10.
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const now=1791655200123,id='12345678-1234-4123-8123-123456789012';
const position={latitude:60.123456789,longitude:25.123456789,accuracy:12.345,
  heading:123.456,speedKmh:123.456,sampledAt:now,at:now};
const identity={displayName:'Rider Example',status:'ok',vehicle:{nickname:'Touring bike',category:'motorcycle'},clubIdentity:{name:'Example Club',rank:'Captain'}};
const rider={riderId:id,...identity,position};
const sizes={clientPosition:bytes({v:1,type:'position',...position,at:undefined,seq:10000}),
  serverPosition:bytes({v:1,serverTime:now,type:'position',riderId:id,position}),
  heartbeat:bytes({v:1,serverTime:now,type:'heartbeat',riderId:id,at:now}),
  ownHeartbeat:bytes({v:1,serverTime:now,type:'heartbeat',at:now}),
  roomUpdate:bytes({v:1,serverTime:now,type:'room_update',participantCount:10,checkedAt:now}),
  snapshot10:bytes({v:1,serverTime:now,type:'snapshot',participantCount:10,participants:Array(10).fill(rider)}),
  attachment:bytes({uid:'u'.repeat(128),riderId:id,origin:'https://eggheadstudio.github.io',identity:{...identity,
    displayName:'雪'.repeat(64),vehicle:{nickname:'雪'.repeat(64),category:'motorcycle'},clubIdentity:{name:'雪'.repeat(80),rank:'雪'.repeat(64)}},
    expiresAt:now+3600000,leaseUntil:now+30000,lastSeen:now,lastPositionAt:now,lastHeartbeatAt:now,seq:10000,position,
    bucket:now,messages:8,lastControl:now,closed:false}),
  ticket:bytes({uid:'u'.repeat(128),origin:'https://eggheadstudio.github.io',sessionId:id,until:now+30000,expiresAt:now+3600000})};
console.log(JSON.stringify({measuredUtf8Bytes:sizes},null,2));
for(const users of [100,1000,10000]) {
  const userHours=users*10,roomHours=userHours/10,connections=users*5;
  const clientMessages=userHours*(720+144)+connections*5; // hello plus four status/control messages per connection
  const workerRequests=connections*3; // ticket, upgrade and one CORS preflight
  const doUnits=clientMessages/20+roomHours*360+connections*2;
  const doDuration=roomHours*3600*.128; // conservative: no useful hibernation time
  const outbound=userHours*(720*sizes.serverPosition*10+144*(sizes.heartbeat*10+sizes.ownHeartbeat))
    +roomHours*180*10*sizes.roomUpdate+connections*(sizes.snapshot10+1024);
  const requestsCost=Math.ceil(Math.max(0,doUnits-1000000)/1000000)*.15;
  const durationCost=Math.ceil(Math.max(0,doDuration-400000)/1000000)*12.50;
  console.log(JSON.stringify({users,userHours,roomHours,messagesPerTwoHourSession:1733,clientMessages,workerRequests,
    durableObjectRequestUnits:doUnits,durableObjectFullDurationGBs:doDuration,
    outboundDecimalGB:Math.round(outbound*1.2/1e9*100)/100, // estimated 20% transport/control allowance
    firestoreAuthorityReads:roomHours*180*31+connections*8,
    cloudflarePaidLowerUSD:5+requestsCost,cloudflarePaidConservativeUSD:5+requestsCost+durationCost}));
}
console.log(JSON.stringify({estimatedSerializedRoomStateBytes:sizes.attachment*50+sizes.ticket*100,
  notes:'Excludes JS/crypto/runtime heap, SQLite overhead, Firebase charges, tax, attack traffic and other account usage. Duration/CPU not benchmarked in production.'}));

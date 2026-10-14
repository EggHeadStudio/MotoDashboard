import {createFollowCamera,followZoom,rotationCanvasSize} from '../js/follow-camera.js';

export function runCameraTests() {
  let count=0;const check=(ok,message)=>{if(!ok)throw Error(message);count++;};
  check(followZoom(15,0).zoom===15,'Stopped default is balanced');
  check(followZoom(15,36).zoom===14.5,'Urban follow is wider');
  check(followZoom(15,100).zoom===13.5,'Highway follow is wider');
  check(followZoom(15,140).zoom===13,'Fast follow has a bounded overview');
  check(followZoom(13,140).zoom===12,'Zoom lower bound');
  check(followZoom(15,24,1).band===1,'Boundary speed does not oscillate zoom');
  check(followZoom(15,17,1).band===0,'A genuine speed decrease exits the band');
  for(const [w,h] of [[320,568],[390,844],[844,390],[1280,720]])check(rotationCanvasSize(w,h)>=Math.hypot(w,h),'Canvas covers rotation without changing scale');
  let time=0,id=0,queue=new Map(),center={lat:60,lng:25},zoom=6,calls=[],rotations=[];
  const map={getCenter:()=>({...center}),getZoom:()=>zoom,stop(){},distance:(a,b)=>Math.hypot((a.lat-b[0])*111000,(a.lng-b[1])*55500),
    setView(p,z,options){center={lat:p[0],lng:p[1]};zoom=z;calls.push(options);},setZoom(z,options){zoom=z;calls.push(options);},
    panTo(p,options){center={lat:p[0],lng:p[1]};calls.push(options);}};
  const camera=createFollowCamera({map,onRotation:value=>rotations.push(value),frame:fn=>{queue.set(++id,fn);return id;},cancel:i=>queue.delete(i),clock:()=>time,reduced:()=>false});
  const step=ms=>{time+=ms;const frames=[...queue.values()];queue.clear();frames.forEach(fn=>fn(time));};
  const sample={lat:60,lon:25,accuracy:5,speedKmh:0,timestamp:1000};
  camera.update(sample);check(zoom===15,'Initial follow never hard-codes zoom 16');
  camera.update({...sample,lat:60.001,timestamp:2000});camera.update({...sample,lat:60.002,timestamp:3000});
  check(queue.size===1,'Bursts retain one visual animation owner');step(100);
  check(center.lat>60 && center.lat<60.002,'Visual camera interpolates only between accepted centers');
  check(sample.lat===60 && sample.timestamp===1000,'Camera never mutates sample data');
  step(650);check(Math.abs(center.lat-60.002)<1e-8,'Camera completes at actual accepted point');
  camera.update({...sample,lat:60.1,accuracy:80,timestamp:4000});check(center.lat===60.002 && queue.size===0,'Poor accuracy cannot move or zoom camera');
  camera.rotateTo(359,{immediate:true});camera.rotateTo(1);step(16);
  check(rotations.at(-1)>359,'359/1 heading takes the short path');
  camera.manual();const before=JSON.stringify(center),oldZoom=zoom;
  camera.update({...sample,lat:60.003,speedKmh:120,timestamp:10000});step(1000);
  check(JSON.stringify(center)===before && zoom===oldZoom && queue.size===0,'Manual control stops automatic follow/zoom/rotation');
  camera.recenter();check(center.lat===60.003 && camera.state().following,'Explicit recenter returns to last accepted fix');
  camera.setVisible(false);camera.rotateTo(90);camera.update({...sample,lat:60.004,timestamp:11000});
  check(queue.size===0,'Hidden UI does not run animation frames');
  camera.reset();camera.setDefaultZoom(14);camera.setVisible(true);camera.update({...sample,timestamp:12000});check(zoom===14,'New ride respects configured default');
  camera.update({...sample,speedKmh:100,timestamp:13000});check(zoom===14,'Rapid speed changes do not zoom immediately');
  camera.update({...sample,speedKmh:100,timestamp:18000});check(zoom===13.5,'Zoom changes by a bounded half-step after interval');
  check(calls.every(options=>options.animate===false),'No overlapping Leaflet animations');
  camera.destroy();check(queue.size===0,'Teardown cancels pending camera work');
  return `camera: ${count} deterministic assertions passed`;
}

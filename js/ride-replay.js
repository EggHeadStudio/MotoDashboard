import {haversine} from './utils.js';
import {MAX_SAMPLE_GAP_MS} from './position-pipeline.js';
import {MAX_POINT_JUMP_DISTANCE_M,MAX_VALID_SPEED_KMH} from './config.js';

export function prepareRideReplay(input) {
  const points=Array.isArray(input)?input:[],indices=new Uint32Array(points.length),times=new Float64Array(points.length),segments=new Uint32Array(points.length);
  let size=0,segment=0,badTime=false,last=null,minLat=Infinity,maxLat=-Infinity,minLon=Infinity,maxLon=-Infinity;
  for(let i=0;i<points.length;i++) {
    const p=points[i];
    if(p?.break){segment++;last=null;continue;}
    if(!Number.isFinite(p?.latitude)||Math.abs(p.latitude)>90||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180){segment++;last=null;continue;}
    const time=p.timestamp,validTime=Number.isFinite(time)&&time>0&&time<=8640000000000000;
    if(!validTime || size && time<times[size-1])badTime=true;
    if(last && time===last.timestamp && p.latitude===last.latitude && p.longitude===last.longitude)continue;
    const dt=last?time-last.timestamp:0,distance=last?haversine(last.latitude,last.longitude,p.latitude,p.longitude):0;
    if(last && (dt<=0||dt>MAX_SAMPLE_GAP_MS||distance>MAX_POINT_JUMP_DISTANCE_M||distance/(dt/1000)*3.6>MAX_VALID_SPEED_KMH))segment++;
    indices[size]=i;times[size]=validTime?time:NaN;segments[size]=segment;size++;last=p;
    minLat=Math.min(minLat,p.latitude);maxLat=Math.max(maxLat,p.latitude);minLon=Math.min(minLon,p.longitude);maxLon=Math.max(maxLon,p.longitude);
  }
  const start=size?times[0]:0,end=size?times[size-1]:0,duration=end-start;
  const available=!badTime && size>=2 && Number.isFinite(duration)&&duration>0;
  // Typed indices reference original data; map paths have a fixed display budget.
  const stride=Math.max(1,Math.ceil(size/2500)),overview=[];let group=null;
  for(let i=0;i<size;i++) {
    if(i%stride!==0 && i!==size-1)continue;
    if(!group || group.segment!==segments[i]){group={segment:segments[i],positions:[],offsets:[]};overview.push(group);}
    const p=points[indices[i]];group.positions.push([p.latitude,p.longitude]);group.offsets.push(i);
  }
  function positionAt(offset) {
    if(!available)return {position:null,gap:false,index:-1};
    const absolute=start+Math.max(0,Math.min(duration,Number.isFinite(offset)?offset:0));
    let low=0,high=size;while(low<high){const mid=(low+high)>>>1;if(times[mid]<=absolute)low=mid+1;else high=mid;}
    const index=Math.max(0,low-1),p=points[indices[index]],next=index+1<size?points[indices[index+1]]:null;
    if(!next || absolute===times[index])return {position:[p.latitude,p.longitude],gap:false,index,segment:segments[index]};
    if(segments[index]!==segments[index+1])return {position:null,gap:true,index,segment:segments[index]};
    const fraction=(absolute-times[index])/(times[index+1]-times[index]);let lon=next.longitude-p.longitude;
    if(lon>180)lon-=360;if(lon<-180)lon+=360;
    return {position:[p.latitude+(next.latitude-p.latitude)*fraction,((p.longitude+lon*fraction+540)%360)-180],gap:false,index,segment:segments[index]};
  }
  function progressAt(offset) {
    const current=positionAt(offset),paths=[];
    for(const group of overview){
      if(group.offsets[0]>current.index)break;
      if(group.offsets.at(-1)<=current.index){paths.push(group.positions);continue;}
      const partial=group.positions.filter((_,i)=>group.offsets[i]<=current.index);
      if(current.position && current.segment===group.segment)partial.push(current.position);
      if(partial.length>1)paths.push(partial);
    }
    return paths;
  }
  return {available,reason:badTime?'timing':size<2||!(duration>0)?'short':null,start,end,duration:available?duration:0,
    size,gaps:segment>0,simplified:stride>1,overview,bounds:size?[[minLat,minLon],[maxLat,maxLon]]:null,positionAt,progressAt};
}

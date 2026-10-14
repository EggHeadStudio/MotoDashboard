import {prepareRideReplay} from '../js/ride-replay.js';

export function runReplayTests() {
  let count=0;const check=(value,label)=>{if(!value)throw Error(label);count++;};
  const p=(time,lat=60,lon=25)=>({timestamp:time,latitude:lat,longitude:lon});
  const source=[p(1000),p(2000,60.0001),p(3000,60.0002)],before=JSON.stringify(source),m=prepareRideReplay(source);
  check(m.available && m.duration===2000,'Timestamp-based recorded span');
  check(Math.abs(m.positionAt(500).position[0]-60.00005)<1e-8,'Interpolate inside an observed segment');
  check(m.positionAt(-100).position[0]===60,'Negative seeks clamp to first actual fix');
  check(m.positionAt(999999).position[0]===60.0002,'End seeks clamp to last actual fix');
  check(JSON.stringify(source)===before,'Replay never alters saved points');
  for(const value of [[],[p(1000)],[p(1000),p(1000)]])check(!prepareRideReplay(value).available,'Empty/single/zero-duration overview only');
  for(const value of [[p(1000),{latitude:60.001,longitude:25}],[p(2000),p(1000)],[p(NaN),p(3000)]])check(prepareRideReplay(value).reason==='timing','Missing/invalid/out-of-order times fail safely');
  const explicit=prepareRideReplay([p(1000),p(2000,60.0001),{break:true,timestamp:8000},p(8000,60.0002),p(9000,60.0003)]);
  check(explicit.positionAt(3000).position===null && explicit.positionAt(3000).gap,'Explicit gap hides position');
  check(explicit.overview.length===2,'Explicit gap has separate map paths');
  check(explicit.positionAt(7000).position[0]===60.0002,'New anchor shown at actual timestamp');
  const sparse=prepareRideReplay([p(1000),p(20000,60.0001)]);check(sparse.gaps && sparse.positionAt(1000).position===null,'Sparse intervals are not invented');
  const bad=prepareRideReplay([p(1000),p(2000,200),p(3000,60.0001)]);check(bad.size===2 && bad.positionAt(1000).gap,'Invalid coordinate creates a barrier');
  const jump=prepareRideReplay([p(1000),p(2000,60.1)]);check(jump.positionAt(500).gap,'Impossible jump is not animated');
  const duplicate=prepareRideReplay([p(1000),p(1000),p(2000,60.0001)]);check(duplicate.size===2 && duplicate.available,'Identical duplicate points collapse');
  const sameTime=prepareRideReplay([p(1000),p(1000,60.0001),p(2000,60.0002)]);check(sameTime.available && sameTime.positionAt(0).position[0]===60.0001,'Ambiguous same-time positions do not create an interval');
  const stationary=prepareRideReplay([p(1000),p(2000)]);check(stationary.positionAt(500).position[0]===60,'Stationary observations remain stationary');
  const dateLine=prepareRideReplay([p(1000,0,179.999),p(6000,0,-179.999)]);check(Math.abs(dateLine.positionAt(2500).position[1])>179.99,'Dateline interpolation uses short longitude path');
  const long=Array.from({length:50000},(_,i)=>p(1000+i*1000,60+i*.000001));const large=prepareRideReplay(long);
  check(large.available && large.size===50000 && large.simplified,'Long timed routes retain complete replay index');
  check(large.overview.reduce((n,g)=>n+g.positions.length,0)<=2501,'Map geometry remains bounded');
  check(Math.abs(large.positionAt(12345500).position[0]-(60+.0123455))<1e-8,'Binary seek works in long recordings');
  check(large.progressAt(25000000).reduce((n,g)=>n+g.length,0)<=2502,'Progress rendering remains bounded');
  return `replay: ${count} deterministic assertions passed`;
}

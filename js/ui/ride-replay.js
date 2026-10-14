import {element,labelText,button} from './forms.js';
import {vehicleIcon} from './icons.js';
import {formatDuration} from '../utils.js';
import {setLocalizedText,t} from '../i18n/i18n.js';

export function mountRideReplay({model,session,map,onOverview}) {
  const root=element('section','ride-replay');root.id='ride-replay';root.setAttribute('aria-label',t('replay.title'));document.body.append(root);
  root.setAttribute('data-i18n-aria-label','replay.title');
  let marker=null,route=null,progress=null,frame=null,playing=false,disposed=false,offset=0,speed=1,lastFrame=0,lastDraw=-Infinity,kind='';
  if(map && typeof L!=='undefined') {
    route=L.polyline(model.overview.map(group=>group.positions),{color:'#aab1bd',weight:4,opacity:0.55,interactive:false}).addTo(map);
    progress=L.polyline([],{color:'#e9bf73',weight:5,opacity:0.95,interactive:false}).addTo(map);
    const art=element('div','replay-vehicle');art.append(vehicleIcon(session.vehicleSnapshot?.category || session.category || 'other'));
    marker=L.marker([0,0],{icon:L.divIcon({className:'replay-marker',html:art,iconSize:[32,32],iconAnchor:[16,16]}),interactive:false});
  }
  const status=element('p','replay-status');status.setAttribute('role','status');root.append(status);
  if(!model.available || !map || !marker) {
    if(marker && model.size===1)marker.setLatLng(model.bounds[0]).addTo(map);
    root.append(labelText(element('p'),!map?'replay.noMap':model.reason==='timing'?'replay.noTiming':'replay.tooShort'),button('replay.overview',onOverview));
    return {pause(){},dispose(){disposed=true;route?.remove();progress?.remove();marker?.remove();root.remove();}};
  }
  const actions=element('div','replay-actions'),play=button('replay.play',()=>playing?pause():start(),'replay-play');
  const restart=button('replay.restart',()=>{pause();offset=0;draw(true);},'replay-restart');
  const rateLabel=element('label');rateLabel.append(labelText(element('span'),'replay.speed'));const rate=element('select');rate.id='replay-speed';
  for(const value of [1,2,4,8]){const option=element('option','',value+'×');option.value=String(value);rate.append(option);}rateLabel.append(rate);
  rate.addEventListener('change',()=>{speed=[1,2,4,8].includes(Number(rate.value))?Number(rate.value):1;});
  actions.append(play,restart,rateLabel,button('replay.overview',()=>{follow.checked=false;onOverview();},'replay-overview'));
  const timelineLabel=element('label','replay-timeline');timelineLabel.append(labelText(element('span'),'replay.timeline'));
  const timeline=element('input');timeline.type='range';timeline.id='replay-timeline';timeline.min='0';timeline.max=String(model.duration);timeline.step='1';timeline.value='0';timelineLabel.append(timeline);
  const elapsed=element('output');elapsed.id='replay-time';timelineLabel.append(elapsed);
  const followLabel=element('label','replay-follow'),follow=element('input');follow.type='checkbox';follow.id='replay-follow';followLabel.append(follow,labelText(element('span'),'replay.follow'));
  root.append(actions,timelineLabel,followLabel);
  if(model.gaps)root.append(labelText(element('p','muted'),'replay.gaps'));
  if(model.simplified)root.append(labelText(element('p','muted'),'replay.simplified'));
  function draw(force=false) {
    if(disposed)return;
    const at=performance.now(),sample=model.positionAt(offset);
    if(sample.position){marker.setLatLng(sample.position);if(!map.hasLayer(marker))marker.addTo(map);if(follow.checked)map.panTo(sample.position,{animate:false,noMoveStart:true});}
    else marker.remove();
    if(force || at-lastDraw>=100) {
      progress.setLatLngs(model.progressAt(offset));timeline.value=String(Math.round(offset));
      setLocalizedText(elapsed,()=>formatDuration(offset)+' / '+formatDuration(model.duration));
      timeline.setAttribute('aria-valuetext',elapsed.textContent);lastDraw=at;
    }
    const next=sample.gap?'gap':offset>=model.duration?'done':playing?'playing':'paused';
    if(next!==kind){kind=next;labelText(status,'replay.'+next);}
  }
  function tick(now) {
    frame=null;if(disposed || !playing)return;
    if(lastFrame){const delta=now-lastFrame;if(delta>1000){pause();return;}offset=Math.min(model.duration,offset+Math.max(0,delta)*speed);}
    lastFrame=now;draw();
    if(offset>=model.duration){playing=false;labelText(play,'replay.play');draw(true);}else frame=requestAnimationFrame(tick);
  }
  function pause(){playing=false;lastFrame=0;if(frame!==null)cancelAnimationFrame(frame);frame=null;labelText(play,'replay.play');draw(true);}
  function start(){if(disposed)return;if(offset>=model.duration)offset=0;playing=true;lastFrame=0;labelText(play,'replay.pause');if(frame===null)frame=requestAnimationFrame(tick);draw(true);}
  timeline.addEventListener('input',()=>{offset=Math.max(0,Math.min(model.duration,Number(timeline.value)||0));lastFrame=0;draw(true);});
  const manual=()=>{follow.checked=false;};map.getContainer().addEventListener('pointerdown',manual,{passive:true});map.getContainer().addEventListener('touchstart',manual,{passive:true});
  const hidden=()=>{if(document.visibilityState==='hidden')pause();};document.addEventListener('visibilitychange',hidden);addEventListener('pagehide',pause);
  draw(true);
  return {pause,dispose(){pause();disposed=true;document.removeEventListener('visibilitychange',hidden);removeEventListener('pagehide',pause);
    map.getContainer().removeEventListener('pointerdown',manual);map.getContainer().removeEventListener('touchstart',manual);
    route.remove();progress.remove();marker.remove();root.remove();}};
}

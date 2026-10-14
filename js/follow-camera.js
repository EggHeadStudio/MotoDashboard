import {normalizeAngle,shortestAngleDelta} from './utils.js';

export const DEFAULT_FOLLOW_ZOOM=15;
export function followZoom(base,speed,previousBand=0) {
  base=Number.isFinite(base)?Math.max(13,Math.min(17,base)):DEFAULT_FOLLOW_ZOOM;
  const enter=[25,70,110],exit=[18,55,90];let band=previousBand;
  while(band<3 && speed>=enter[band])band++;
  while(band>0 && speed<exit[band-1])band--;
  return {band,zoom:Math.max(12,base-[0,0.5,1.5,2][band])};
}
export function rotationCanvasSize(width,height) {
  return Math.ceil(Math.hypot(width,height))+32;
}

// One visual RAF owner. Native Leaflet animations and GPS/recording data are never used as clocks.
export function createFollowCamera({map,onRotation,frame=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id),
  clock=()=>performance.now(),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}) {
  let frameId=null,tween=null,visible=true,following=true,initialized=false,lastFix=null;
  let angle=0,targetAngle=0,lastFrame=0,base=DEFAULT_FOLLOW_ZOOM,band=0,lastZoomAt=0;
  const schedule=()=>{if(frameId===null && visible)frameId=frame(tick);};
  const stop=()=>{if(frameId!==null)cancel(frameId);frameId=null;lastFrame=0;};
  function tick(now) {
    frameId=null;if(!visible)return;
    const dt=Math.min(100,lastFrame?now-lastFrame:16);lastFrame=now;
    if(tween && following) {
      const fraction=reduced()?1:Math.min(1,(now-tween.at)/650),ease=1-Math.pow(1-fraction,3);
      // Visual center interpolation only, between real accepted fixes; no extrapolated recording.
      map.panTo([tween.lat+(tween.to.lat-tween.lat)*ease,tween.lon+(tween.to.lon-tween.lon)*ease],{animate:false,noMoveStart:true});
      if(fraction===1)tween=null;
    }
    const delta=shortestAngleDelta(normalizeAngle(angle),normalizeAngle(targetAngle));
    if(Math.abs(delta)>0.1){angle+=delta*(reduced()?1:1-Math.exp(-dt/240));onRotation(angle);}
    else if(angle!==targetAngle){angle=targetAngle;onRotation(angle);}
    if(tween || Math.abs(shortestAngleDelta(normalizeAngle(angle),normalizeAngle(targetAngle)))>0.1)schedule();
    else {if(angle!==targetAngle){angle=targetAngle;onRotation(angle);}lastFrame=0;}
  }
  function update(fix,{initial=false}={}) {
    if(!Number.isFinite(fix?.lat)||Math.abs(fix.lat)>90||!Number.isFinite(fix.lon)||Math.abs(fix.lon)>180
      || !Number.isFinite(fix.accuracy)||fix.accuracy>35 || fix.accuracy<0)return false;
    lastFix={...fix};if(!following || !visible)return false;
    const plan=followZoom(base,Math.max(0,fix.speedKmh || 0),band);band=plan.band;
    const zoom=map.getZoom();
    if(!initialized || initial) {
      map.stop();map.setView([fix.lat,fix.lon],plan.zoom,{animate:false});initialized=true;lastZoomAt=fix.timestamp;tween=null;return true;
    }
    // Fractional half-step zoom, at most every four seconds; no competing native zoom animation.
    if(Math.abs(plan.zoom-zoom)>=0.5 && fix.timestamp-lastZoomAt>=4000) {
      map.stop();map.setZoom(zoom+Math.sign(plan.zoom-zoom)*0.5,{animate:false});lastZoomAt=fix.timestamp;
    }
    const center=map.getCenter(),distance=map.distance(center,[fix.lat,fix.lon]);
    if(distance<Math.max(3,fix.accuracy*0.2))return true;
    if(distance>2500){map.stop();map.setView([fix.lat,fix.lon],map.getZoom(),{animate:false});tween=null;return true;}
    let lon=fix.lon;while(lon-center.lng>180)lon-=360;while(lon-center.lng<-180)lon+=360;
    tween={lat:center.lat,lon:center.lng,to:{lat:fix.lat,lon},at:clock()};schedule();return true;
  }
  return {update,
    rotateTo(value,{immediate=false}={}) {
      if(!Number.isFinite(value))return;
      targetAngle=value;
      if(immediate || !visible || reduced()){angle=value;onRotation(angle);return;}
      schedule();
    },
    manual(){following=false;tween=null;map.stop();targetAngle=angle;stop();},
    recenter(){following=true;initialized=false;if(lastFix)update(lastFix,{initial:true});},
    reset(){tween=null;following=true;initialized=false;band=0;lastFix=null;lastZoomAt=0;},
    setDefaultZoom(value){base=Number.isFinite(value)?Math.max(13,Math.min(17,value)):DEFAULT_FOLLOW_ZOOM;},
    setVisible(value){visible=!!value;if(!visible){tween=null;stop();}else if(Math.abs(shortestAngleDelta(angle,targetAngle))>0.1)schedule();},
    destroy(){stop();tween=null;lastFix=null;},
    state:()=>({following,initialized,defaultZoom:base,band,pendingFrame:frameId!==null,angle:normalizeAngle(angle)})
  };
}

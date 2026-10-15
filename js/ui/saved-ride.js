import {element,labelText,button,runAction} from './forms.js';
import {getSessionDisplayName} from '../session-manager.js';
import {formatDate,formatDuration,formatDistanceKm,formatSpeedKmh} from '../utils.js';
import {getLanguage,setLanguage,onLanguageChange,setLocalizedText,t} from '../i18n/i18n.js';
import {prepareRideReplay} from '../ride-replay.js';
import {mountRideReplay} from './ride-replay.js';
import {contributionButton} from './club-activity.js';

export function createSavedRideViewer({root,map,onBack,onExport}) {
  const text=root.querySelector('#history-detail-text'),actions=root.querySelector('#history-detail-actions');
  let active=false,bounds=null,languageSelect=null,resizeTimer=null,player=null;
  const status=element('p','feature-status');status.id='saved-ride-status';status.setAttribute('role','status');root.append(status);
  function fit() {
    if(!active || !map || !bounds)return;
    const rect=root.getBoundingClientRect(),landscape=innerWidth>innerHeight,replay=document.getElementById('ride-replay');
    const bottom=(replay?.getBoundingClientRect().height || 24)+12;
    map.invalidateSize({animate:false,pan:false});map.stop();map.fitBounds(bounds,{animate:false,maxZoom:16,paddingTopLeft:landscape?[rect.width+24,24]:[24,rect.height+12],paddingBottomRight:[24,Math.min(innerHeight*0.4,bottom)]});
  }
  addEventListener('resize',()=>{if(active){clearTimeout(resizeTimer);resizeTimer=setTimeout(fit,180);}});
  onLanguageChange(()=>{if(active){languageSelect.value=getLanguage();fit();}});
  return {open(session) {
    player?.dispose();player=null;
    active=true;root.hidden=false;document.body.classList.add('saved-ride-view');
    root.setAttribute('role','region');root.setAttribute('aria-labelledby','saved-ride-title');root.removeAttribute('aria-live');
    text.replaceChildren();actions.replaceChildren();status.textContent='';
    const header=element('header','saved-ride-header'),title=element('h1');title.id='saved-ride-title';title.tabIndex=-1;
    const name={name:session.name,startedAt:session.startedAt};setLocalizedText(title,()=>getSessionDisplayName(name,formatDate));
    header.append(button('viewer.back',onBack,'saved-back'),title);
    const label=element('label','saved-language');label.append(labelText(element('span'),'ui.language'));languageSelect=element('select');languageSelect.id='saved-language';
    for(const [value,caption] of [['en','English'],['fi','Suomi']]){const option=element('option','',caption);option.value=value;languageSelect.append(option);}
    languageSelect.value=getLanguage();languageSelect.addEventListener('change',()=>setLanguage(languageSelect.value));label.append(languageSelect);header.append(label);text.append(header);
    const details=element('details','saved-details');details.id='saved-details';details.open=true;
    details.append(labelText(element('summary'),'viewer.details'));const content=element('div');details.append(content);text.append(details);
    details.addEventListener('toggle',()=>{if(active)requestAnimationFrame(fit);});
    const date=element('p','muted');const started=session.startedAt;setLocalizedText(date,()=>formatDate(started));content.append(date);
    const stats=element('dl','saved-ride-stats');
    const row=(key,value)=>{const cell=element('div'),out=element('dd');setLocalizedText(out,()=>typeof value==='function'?value():value);cell.append(labelText(element('dt'),key),out);stats.append(cell);};
    const elapsed=Number.isFinite(session.startedAt)&&Number.isFinite(session.endedAt)?session.endedAt-session.startedAt:null;
    if(Number.isFinite(elapsed)&&elapsed>=0)row('viewer.duration',formatDuration(elapsed));
    if(Number.isFinite(session.movingDurationMs)&&session.movingDurationMs>=0)row('ui.duration',formatDuration(session.movingDurationMs));
    for(const [key,property,formatter,unit] of [['ui.distance','distanceMeters',formatDistanceKm,' km'],['viewer.average','averageMovingSpeedKmh',formatSpeedKmh,' km/h'],['viewer.maximum','maxSpeedKmh',formatSpeedKmh,' km/h']]) {
      const value=session[property];if(!Number.isFinite(value)||value<0)continue;
      const cell=element('div'),out=element('dd');setLocalizedText(out,()=>formatter(value)+unit);cell.append(labelText(element('dt'),key),out);stats.append(cell);
    }
    const vehicle=session.vehicleSnapshot?.nickname;
    if(vehicle)row('viewer.vehicle',vehicle);else row('viewer.vehicle',()=>t('viewer.notRecorded'));
    if(session.ridingIdentity)row('ride.identity',()=>session.ridingIdentity.kind==='club'
      ?[session.ridingIdentity.clubName,session.ridingIdentity.rankName].filter(Boolean).join(' · '):t('ride.personal'));
    content.append(stats,actions);
    for(const [key,format,share] of [['rides.json','json',false],['rides.gpx','gpx',false],['rides.share','gpx',true]]) {
      actions.append(button(key,()=>void runAction(actions,status,()=>onExport(format,share))));
    }
    contributionButton(actions,{sourceId:session.id,session});
    const model=prepareRideReplay(session.routePoints);bounds=model.bounds;
    player=mountRideReplay({model,session,map,onOverview:fit});
    if(!bounds)content.append(labelText(element('p','muted'),'viewer.noRoute'));
    fit();title.focus({preventScroll:true});
  },close() {
    player?.dispose();player=null;active=false;bounds=null;clearTimeout(resizeTimer);root.hidden=true;document.body.classList.remove('saved-ride-view');
    root.append(actions);text.replaceChildren();actions.replaceChildren();status.textContent='';languageSelect=null;
  },fit,status};
}

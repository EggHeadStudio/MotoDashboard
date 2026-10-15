import {getAccount,onAccountChange} from '../auth-state.js';
import {garageVehicles,selectedVehicle,chooseRideVehicle,onVehicleChange} from '../garage-ui.js';
import {element,labelText,field,button} from './forms.js';
import {decorateMedia} from '../media/media-render.js';
import {vehicleIcon} from './icons.js';
import {getRideContext,onRideContext} from '../ride-context.js';
import {followSessionURL,sessionURL} from '../data/group-session.js';
import {onLanguageChange,t} from '../i18n/i18n.js';

export function initRideLaunch(){
  const launch=document.querySelector('.ride-launch'),root=element('div','ride-launch-options');root.id='ride-launch-options';launch.prepend(root);
  let groups=[],disposePhoto=null;
  function render(){
    disposePhoto?.();disposePhoto=null;root.replaceChildren();
    const context=getRideContext(),locked=!!context.recordingId;
    const form=element('div');form.id='ride-launch';
    const vehicles=field(form,'vehicle','ride.vehicle',{choices:[]});
    const none=labelText(element('option'),'garage.noVehicle');none.value='';vehicles.append(none);
    for(const vehicle of garageVehicles()){
      const option=element('option','',vehicle.nickname);option.value=vehicle.id;vehicles.append(option);
    }
    const selected=selectedVehicle();vehicles.value=selected?.id || '';vehicles.disabled=locked;
    vehicles.addEventListener('change',()=>chooseRideVehicle(vehicles.value || null));
    const art=element('div','launch-vehicle-photo');art.setAttribute('aria-hidden','true');art.append(vehicleIcon(selected?.category || 'motorcycle'));
    form.prepend(art);if(selected)disposePhoto=decorateMedia(art,{kind:'vehicle',id:selected.id},{cover:art});
    if(selected)form.append(labelText(element('span','category-chip'),'category.'+selected.category));
    const group=field(form,'group','ride.group',{choices:[]});const personal=labelText(element('option'),'ride.noGroup');personal.value='';group.append(personal);
    for(const item of groups.filter(g=>['scheduled','active'].includes(g.state))){const option=element('option','',item.title);option.value=item.id;group.append(option);}
    group.value=context.groupId || '';group.disabled=locked || context.sharing;
    const open=button('ui.open',()=>{if(group.value)followSessionURL(sessionURL(group.value));});open.disabled=!group.value;
    group.addEventListener('change',()=>{open.disabled=!group.value;});form.append(open);root.append(form);
    if(locked)root.append(labelText(element('p','muted'),'ride.identityLocked'));
  }
  addEventListener('motodash-home-data',event=>{groups=event.detail.groups;render();});
  onVehicleChange(render);let last;
  onRideContext(context=>{const key=[context.recordingId,context.groupId,context.sharing].join(':');if(key!==last){last=key;render();}});
  onAccountChange(()=>{groups=[];render();});onLanguageChange(render);render();
}

import {getAccount,onAccountChange} from '../auth-state.js';
import {garageVehicles,selectedVehicle,chooseRideVehicle,onVehicleChange} from '../garage-ui.js';
import {element,labelText,field,button} from './forms.js';
import {decorateMedia} from '../media/media-render.js';
import {vehicleIcon} from './icons.js';
import {getRideContext,onRideContext} from '../ride-context.js';
import {followSessionURL,sessionURL} from '../data/group-session.js';
import {onLanguageChange,t} from '../i18n/i18n.js';
import {getRidingIdentity,chooseRidingIdentity} from '../riding-identity.js';
import {dataErrorMessage} from '../firebase/access.js';

export function initRideLaunch(){
  const launch=document.querySelector('.ride-launch'),root=element('div','ride-launch-options');root.id='ride-launch-options';launch.prepend(root);
  let groups=[],clubs=[],disposePhoto=null,plannedGroupId=null,accountOwner;
  const start=document.getElementById('start-btn');
  start.addEventListener('click',event=>{
    const id=document.getElementById('ride-launch-group')?.value;
    if(id&&id!==getRideContext().groupId&&!getRideContext().recordingId){event.preventDefault();event.stopImmediatePropagation();followSessionURL(sessionURL(id));}
  },{capture:true});
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
    const identity=field(form,'identity','ride.identity',{choices:[]}),self=labelText(element('option'),'ride.personal');self.value='';identity.append(self);
    for(const club of clubs){const option=element('option','',club.name);option.value=club.id;identity.append(option);}
    identity.value=getRidingIdentity().clubId || '';identity.disabled=locked || context.sharing;
    const status=element('p','feature-status');status.setAttribute('role','status');
    identity.addEventListener('change',async()=>{identity.disabled=true;try{await chooseRidingIdentity(identity.value || null);render();}
      catch{labelText(status,'ride.identityUnavailable');identity.value=getRidingIdentity().clubId || '';}
      finally{identity.disabled=!!getRideContext().recordingId||getRideContext().sharing;}});
    const contribution=field(form,'contribution','ride.contribute',{type:'checkbox'});contribution.disabled=locked||!getRidingIdentity().clubId;
    contribution.addEventListener('change',()=>{root.dataset.contribute=String(contribution.checked);});contribution.checked=root.dataset.contribute==='true'&&!contribution.disabled;
    form.append(labelText(element('p','muted'),'ride.contributionHint'),status);
    const group=field(form,'group','ride.group',{choices:[]});const personal=labelText(element('option'),'ride.noGroup');personal.value='';group.append(personal);
    for(const item of groups.filter(g=>['scheduled','active'].includes(g.state))){const option=element('option','',item.title);option.value=item.id;group.append(option);}
    if(context.groupId&&!groups.some(item=>item.id===context.groupId)){const option=labelText(element('option'),'ride.currentGroup');option.value=context.groupId;group.append(option);}
    const intended=plannedGroupId ?? context.groupId ?? '';
    group.value=groups.some(item=>item.id===intended)||intended===context.groupId?intended:'';group.disabled=locked || context.sharing;
    const open=button('ui.open',()=>{if(group.value)followSessionURL(sessionURL(group.value));});open.disabled=!group.value;
    const launchLabel=()=>{if(!locked)labelText(start,group.value&&group.value!==context.groupId?'ride.openGroup':'home.start');};
    group.addEventListener('change',()=>{plannedGroupId=group.value;open.disabled=!group.value;launchLabel();});launchLabel();form.append(open);root.append(form);
    if(locked)root.append(labelText(element('p','muted'),'ride.identityLocked'));
  }
  addEventListener('motodash-home-data',event=>{groups=event.detail.groups;clubs=event.detail.clubs;render();});
  onVehicleChange(render);let last;
  onRideContext(context=>{const key=[context.recordingId,context.groupId,context.sharing].join(':');if(key!==last){last=key;render();}});
  onAccountChange(({user})=>{const uid=user?.uid || null;if(uid===accountOwner)return;accountOwner=uid;groups=[];clubs=[];plannedGroupId=null;root.dataset.contribute='false';render();});onLanguageChange(render);render();
}

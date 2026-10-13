import {getAccount,onAccountChange} from './auth-state.js';
import {loadPublicProfile,loadOwnPublicProfile,savePublicProfile} from './firebase/publicProfileRepository.js';
import {profileURL,publicId} from './data/public-profile.js';
import {element,labelText,button,dialog,openView,runAction,field} from './ui/forms.js';
import {navigate} from './ui/navigation.js';
import {dataErrorMessage} from './firebase/access.js';
import {t,onLanguageChange,setLocalizedText} from './i18n/i18n.js';
import {vehicleIcon} from './ui/icons.js';

let epoch=0,loaded=null;
export function publicProfileLink(identity,className='text-button') {
  if(!publicId(identity?.publicProfileId))return null;
  const link=element('a',className,identity.displayName || t('identity.member'));link.href=profileURL(identity.publicProfileId);return link;
}
export function initPublicProfiles() {
  const screen=element('section','app-screen public-profile');screen.id='screen-rider';screen.hidden=true;
  document.getElementById('screen-host').append(screen);
  async function resolve() {
    const match=/^#\/rider\/([^/]+)$/.exec(location.hash);if(!match)return;
    const token=++epoch;loaded=null;screen.replaceChildren(labelText(element('p'),'common.loading'));
    document.getElementById('start-overlay').style.display='flex';navigate('rider',{write:false});
    try {const result=await loadPublicProfile(match[1]);if(token!==epoch || location.hash!==match[0])return;loaded=result;render();}
    catch(error){if(token===epoch){screen.replaceChildren(labelText(element('h1'),'publicProfile.title'));setLocalizedText(screen.appendChild(element('p')),()=>dataErrorMessage(error));}}
  }
  function render() {
    screen.replaceChildren();
    if(!loaded){screen.append(labelText(element('h1'),'publicProfile.unavailable'),labelText(element('p','muted'),'publicProfile.unavailableHint'));}
    else {
      const p=loaded.profile;screen.dataset.accent=p.accent;screen.dataset.banner=p.banner;
      const hero=element('div','public-profile-hero'),avatar=element('div','large-avatar',p.displayName.trim().slice(0,2).toLocaleUpperCase());avatar.setAttribute('aria-hidden','true');
      hero.append(avatar,element('h1','',p.displayName));if(p.bio)hero.append(element('p','public-bio',p.bio));
      if(p.category)hero.append(labelText(element('p','category-chip'),'category.'+p.category));screen.append(hero);
      const garage=element('section');garage.append(labelText(element('h2'),'showcase.title'));
      const grid=element('div','card-grid');
      const vehicles=[...loaded.vehicles].sort((a,b)=>(b.id===p.featuredVehicle)-(a.id===p.featuredVehicle));
      for(const vehicle of vehicles){
        const card=element('article','feature-card vehicle-card'),art=element('div','vehicle-art');art.append(vehicleIcon(vehicle.category));
        const info=element('div','vehicle-info');info.append(element('h3','',vehicle.nickname));
        if(vehicle.id===p.featuredVehicle)info.append(labelText(element('p','badge'),'showcase.featured'));
        info.append(labelText(element('p','muted'),'category.'+vehicle.category),element('p','',[vehicle.manufacturer,vehicle.model,vehicle.modelYear].filter(Boolean).join(' ')));
        if(vehicle.publicDescription)info.append(element('p','public-bio',vehicle.publicDescription));card.append(art,info);grid.append(card);
      }
      if(!vehicles.length)grid.append(labelText(element('p','muted'),'showcase.empty'));garage.append(grid);screen.append(garage);
      if(loaded.partial)screen.append(labelText(element('p','muted'),'showcase.partial'));
    }
    screen.append(button('publicProfile.back',()=>navigate(getAccount()?'home':'landing')));
  }
  const own=document.getElementById('screen-profile');
  const entry=button('publicProfile.settings',()=>void edit(),'public-profile-edit');own.querySelector('.profile-actions').append(entry);
  async function edit() {
    const uid=getAccount()?.uid;if(!uid)return;
    const view=dialog('public-profile-editor','publicProfile.settings');openView(view.node);labelText(view.status,'common.loading');
    view.node.addEventListener('close',()=>view.node.remove(),{once:true});
    try {
      const settings=await loadOwnPublicProfile(uid);if(getAccount()?.uid!==uid||!view.node.open)return;
      view.status.textContent='';
      const form=element('form');form.id='public-profile-form';
      const visibility=field(form,'visibility','publicProfile.visibility',{choices:['private','public'],prefix:'visibility',value:settings.visibility});
      form.append(labelText(element('p','muted'),'publicProfile.privacy'));
      const save=button('common.save');save.type='submit';form.append(save);
      if(settings.publicId && settings.visibility==='public'){const link=labelText(element('a'),'publicProfile.view');link.href=profileURL(settings.publicId);link.addEventListener('click',()=>view.node.close());form.append(link);}
      form.addEventListener('submit',event=>{event.preventDefault();void runAction(form,view.status,async()=>{
        await savePublicProfile(uid,{...settings,visibility:visibility.value});if(getAccount()?.uid===uid){labelText(view.status,'ui.saved');view.node.close();}
      });});view.body.append(form);
    }catch(error){if(getAccount()?.uid===uid)setLocalizedText(view.status,()=>dataErrorMessage(error));}
  }
  addEventListener('hashchange',()=>void resolve());
  let owner;
  onAccountChange(({user})=>{const next=user?.uid || null;if(next===owner)return;owner=next;epoch++;loaded=null;screen.replaceChildren();document.getElementById('public-profile-editor')?.close();if(location.hash.startsWith('#/rider/'))void resolve();});
  onLanguageChange(()=>{if(location.hash.startsWith('#/rider/'))render();});
}

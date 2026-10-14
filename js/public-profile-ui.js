import {getAccount,onAccountChange,publishDisplayIdentity} from './auth-state.js';
import {loadPublicProfile,loadOwnPublicProfile,savePublicProfile,loadOwnProfileCards,publishProfileAffiliation,removeProfileAffiliation} from './firebase/publicProfileRepository.js';
import {profileURL,publicId,ACCENTS,BANNERS} from './data/public-profile.js';
import {CATEGORIES} from './data/schema.js';
import {listMyClubs} from './firebase/clubRepository.js';
import {validDisplayName} from './data/identity.js';
import {element,labelText,button,dialog,openView,runAction,field} from './ui/forms.js';
import {navigate} from './ui/navigation.js';
import {dataErrorMessage,boundedRequest} from './firebase/access.js';
import {t,onLanguageChange,setLocalizedText} from './i18n/i18n.js';
import {vehicleIcon} from './ui/icons.js';
import {decorateMedia} from './media/media-render.js';
import {mountMediaEditor} from './media/media-editor.js';

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
    try {const result=await boundedRequest(loadPublicProfile(match[1]),25000,'profile');if(token!==epoch || location.hash!==match[0])return;loaded=result;render();}
    catch(error){if(token===epoch && location.hash===match[0]){screen.replaceChildren(labelText(element('h1'),'publicProfile.title'));setLocalizedText(screen.appendChild(element('p')),()=>dataErrorMessage(error));screen.append(button('common.refresh',()=>void resolve()));}}
  }
  function render() {
    screen.replaceChildren();
    if(!loaded){screen.append(labelText(element('h1'),'publicProfile.unavailable'),labelText(element('p','muted'),'publicProfile.unavailableHint'));}
    else {
      const p=loaded.profile;screen.dataset.accent=p.accent;screen.dataset.banner=p.banner;
      const hero=element('div','public-profile-hero'),avatar=element('div','large-avatar',p.displayName.trim().slice(0,2).toLocaleUpperCase());avatar.setAttribute('aria-hidden','true');
      hero.append(avatar,element('h1','',p.displayName));if(p.bio)hero.append(element('p','public-bio',p.bio));
      if(p.category)hero.append(labelText(element('p','category-chip'),'category.'+p.category));screen.append(hero);
      decorateMedia(hero,{kind:'profile',id:p.id},{avatar,banner:hero});
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
      if(loaded.affiliations.length){
        const clubs=element('section','public-affiliations');clubs.append(labelText(element('h2'),'publicProfile.affiliations'));
        for(const club of loaded.affiliations){const card=element('article','surface');card.append(element('strong','',club.name));if(club.rank)card.append(element('p','rank-label',club.rank));clubs.append(card);}screen.append(clubs);
      }
    }
    screen.append(button('publicProfile.back',()=>navigate(getAccount()?'home':'landing')));
  }
  const own=document.getElementById('screen-profile');
  let disposeOwnMedia=null,ownMediaEpoch=0;
  async function ownMedia(){
    const uid=getAccount()?.uid,token=++ownMediaEpoch;disposeOwnMedia?.();disposeOwnMedia=null;if(!uid)return;
    try{const prefs=await loadOwnPublicProfile(uid);if(token!==ownMediaEpoch||getAccount()?.uid!==uid||!prefs.publicId)return;
      const hero=own.querySelector('.profile-hero');disposeOwnMedia=decorateMedia(hero,{kind:'profile',id:prefs.publicId},{avatar:document.getElementById('profile-avatar'),banner:hero});
    }catch{/* Account data errors remain in the existing Profile flow, optional art falls back. */}
  }
  addEventListener('motodash-profile-updated',()=>void ownMedia());addEventListener('motodash-media-updated',()=>void ownMedia());
  const entry=button('publicProfile.settings',()=>void edit(),'public-profile-edit');own.querySelector('.profile-actions').append(entry);
  async function edit() {
    const uid=getAccount()?.uid;if(!uid)return;
    const view=dialog('public-profile-editor','publicProfile.settings');openView(view.node);labelText(view.status,'common.loading');
    view.node.addEventListener('close',()=>view.node.remove(),{once:true});
    try {
      const settings=await loadOwnPublicProfile(uid);if(getAccount()?.uid!==uid||!view.node.open)return;
      const cards=await loadOwnProfileCards(uid,settings);if(getAccount()?.uid!==uid||!view.node.open)return;
      view.status.textContent='';
      const form=element('form');form.id='public-profile-form';
      const name=field(form,'displayName','auth.displayName',{value:cards.displayName,required:true,max:60});
      const bio=field(form,'bio','publicProfile.bio',{value:settings.bio,multiline:true,max:300});
      const category=field(form,'category','publicProfile.category',{choices:[],value:''});
      const unspecified=labelText(element('option'),'publicProfile.unspecified');unspecified.value='';category.append(unspecified);
      for(const id of CATEGORIES){const choice=labelText(element('option'),'category.'+id);choice.value=id;category.append(choice);}category.value=settings.category || '';
      const accent=field(form,'accent','publicProfile.accent',{choices:ACCENTS,prefix:'accent',value:settings.accent});
      const banner=field(form,'banner','publicProfile.banner',{choices:BANNERS,prefix:'banner',value:settings.banner});
      const featured=field(form,'featuredVehicle','showcase.featured',{choices:[]});
      const none=labelText(element('option'),'publicProfile.none');none.value='';featured.append(none);
      for(const vehicle of cards.vehicles){const choice=element('option','',vehicle.nickname);choice.value=vehicle.id;featured.append(choice);}featured.value=settings.featuredVehicle || '';
      const visibility=field(form,'visibility','publicProfile.visibility',{choices:['private','public'],prefix:'visibility',value:settings.visibility});
      form.append(labelText(element('p','muted'),'publicProfile.privacy'));
      const save=button('common.save');save.type='submit';form.append(save);
      if(settings.publicId){for(const key of ['publicProfile.view','showcase.visitor']){const link=labelText(element('a'),key);link.href=profileURL(settings.publicId);link.addEventListener('click',()=>view.node.close());form.append(link);}}
      form.addEventListener('submit',event=>{event.preventDefault();if(!validDisplayName(name.value)){labelText(view.status,'auth.nameLength');name.focus();return;}void runAction(form,view.status,async()=>{
        await savePublicProfile(uid,{...settings,displayName:name.value,bio:bio.value,category:category.value,accent:accent.value,banner:banner.value,featuredVehicle:featured.value,visibility:visibility.value});
        if(getAccount()?.uid===uid){publishDisplayIdentity(uid,name.value.trim());dispatchEvent(new Event('motodash-profile-updated'));labelText(view.status,'ui.saved');view.node.close();}
      });});view.body.append(form);
      if(settings.publicId)mountMediaEditor(view.body,{kind:'profile',id:settings.publicId},['avatar','banner']);
      else view.body.append(labelText(element('p','muted'),'media.saveProfileFirst'));
      const affiliations=element('section');affiliations.append(labelText(element('h3'),'publicProfile.affiliations'),labelText(element('p','muted'),'publicProfile.affiliationHint'));view.body.append(affiliations);
      const refreshEditor=()=>{if(getAccount()?.uid===uid){view.node.close();void edit();}};
      for(const card of cards.affiliations){const row=element('div','surface');row.append(element('p','',card.name+(card.rank?' · '+card.rank:'')),button('common.delete',()=>void runAction(view.body,view.status,async()=>{await removeProfileAffiliation(uid,card.id);refreshEditor();})));affiliations.append(row);}
      // Revoke unavailable retained cards too; never require a private Club read to remove opt-in.
      for(const id of settings.affiliationIds.filter(id=>!cards.affiliations.some(card=>card.id===id)))affiliations.append(button('publicProfile.removeUnavailable',()=>void runAction(view.body,view.status,async()=>{await removeProfileAffiliation(uid,id);refreshEditor();})));
      try {
        const page=await listMyClubs(uid);if(getAccount()?.uid!==uid||!view.node.open)return;
        const eligible=page.clubs.filter(club=>club.visibility==='public' && ['active','archived'].includes(club.state));
        const chooser=element('form');chooser.id='profile-affiliation-form';const select=field(chooser,'club','publicProfile.club',{choices:[]});
        for(const club of eligible){const option=element('option','',club.name);option.value=club.id;select.append(option);}
        const publish=button('publicProfile.publishAffiliation');publish.type='submit';publish.disabled=!eligible.length;chooser.append(publish);
        chooser.addEventListener('submit',event=>{event.preventDefault();void runAction(view.body,view.status,async()=>{await publishProfileAffiliation(uid,select.value);refreshEditor();});});affiliations.append(chooser);
      }catch(error){if(getAccount()?.uid===uid && view.node.open)setLocalizedText(affiliations.appendChild(element('p','muted')),()=>dataErrorMessage(error));}
    }catch(error){if(getAccount()?.uid===uid)setLocalizedText(view.status,()=>dataErrorMessage(error));}
  }
  addEventListener('hashchange',()=>void resolve());
  let owner;
  onAccountChange(({user})=>{const next=user?.uid || null;if(next===owner)return;owner=next;epoch++;loaded=null;screen.replaceChildren();document.getElementById('public-profile-editor')?.close();void ownMedia();if(location.hash.startsWith('#/rider/'))void resolve();});
  onLanguageChange(()=>{if(location.hash.startsWith('#/rider/'))render();});
}

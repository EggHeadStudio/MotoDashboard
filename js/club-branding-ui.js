import { registerClubSection } from './club-ui.js';
import { updateBranding, loadWall, saveWall } from './firebase/clubRepository.js';
import { canBrand } from './data/permissions.js';
import { LINK_KEYS, THEMES, safeURL } from './data/schema.js';
import { readableText, clubSessionTheme } from './data/branding.js';
import { element, field, button, labelText, disclosure } from './ui/forms.js';
import { vehicleIcon } from './ui/icons.js';
import {mountMediaEditor} from './media/media-editor.js';
import {decorateMedia} from './media/media-render.js';

export function initClubBrandingUI() {
  registerClubSection(async ({model,uid,body,action,stillCurrent})=>{
    const {club,role}=model;
    const banner=element('section','club-banner');banner.id='club-branding';
    const prepared=clubSessionTheme(club);
    banner.style.backgroundColor=prepared.primaryColor;banner.style.color=readableText(prepared.primaryColor);
    const badge=element('span','category-icon');badge.append(vehicleIcon(club.category));badge.setAttribute('aria-hidden','true');
    badge.style.backgroundColor=prepared.accentColor;badge.style.color=readableText(prepared.accentColor);
    banner.append(badge,element('h3','',club.name),labelText(element('p'),'category.'+club.category),element('p','club-description',club.description));
    body.querySelector('#club-identity')?.replaceWith(banner);
    decorateMedia(banner,{kind:'club',id:club.id},{logo:badge,banner});
    if(canBrand(role))mountMediaEditor(body,{kind:'club',id:club.id},['logo','banner']);
    const links=element('div','feature-actions');links.id='club-links';
    for(const key of LINK_KEYS) {
      let href;
      try{href=safeURL(club.links?.[key]);}catch{continue;}
      if(!href) continue;
      const anchor=labelText(element('a'),'link.'+key);
      anchor.href=href;anchor.target='_blank';anchor.rel='noopener noreferrer';links.append(anchor);
    }
    banner.after(links);
    const branding=element('section','feature-card');
    branding.append(labelText(element('h3'),'branding.title'),labelText(element('p','muted'),'branding.placeholder'),
      labelText(element('p','muted'),'branding.futureTheme'));
    if(canBrand(role)) {
      const form=element('form');form.id='branding-form';
      field(form,'description','garage.description',{multiline:true,max:2000,value:club.description});
      field(form,'primaryColor','clubs.primary',{type:'color',value:club.primaryColor});
      field(form,'accentColor','clubs.accent',{type:'color',value:club.accentColor});
      field(form,'routeColor','branding.route',{max:7,value:club.routeColor || ''});
      field(form,'mapTheme','branding.mapTheme',{choices:THEMES,prefix:'themes',value:club.mapTheme});
      for(const key of LINK_KEYS) field(form,key,'link.'+key,{type:'url',max:500,value:club.links?.[key] || ''});
      form.append(labelText(element('p','muted'),'branding.httpsOnly'));
      const save=button('common.save');save.type='submit';form.append(save);
      form.addEventListener('submit',event=>{
        event.preventDefault();const input=Object.fromEntries(new FormData(form));
        input.links=Object.fromEntries(LINK_KEYS.map(key=>[key,input[key] || null]));
        action(owner=>updateBranding(owner,club.id,input));
      });branding.append(form);
    }
    body.append(disclosure('branding.title',branding));
    if(!role) return;
    const wall=await loadWall(uid,club.id);if(!stillCurrent()) return;
    const section=element('section','feature-card');section.id='club-wall';
    section.append(labelText(element('h3'),'branding.wall'),wall?.text ? element('p','club-description',wall.text) : labelText(element('p'),'branding.emptyWall'));
    if(canBrand(role)) {
      const form=element('form');form.id='wall-form';
      field(form,'text','branding.announcement',{multiline:true,max:4000,value:wall?.text || ''});
      const save=button('common.save');save.type='submit';form.append(save);
      form.addEventListener('submit',event=>{event.preventDefault();const content=new FormData(form).get('text');action(owner=>saveWall(owner,club.id,content));});
      section.append(disclosure('common.edit',form));
    }links.after(section);
  });
}

import {saveMediaTheme,mediaError} from './media-client.js';
import {element,labelText,field,button,disclosure} from '../ui/forms.js';
import {applyMediaTheme,decorateMedia} from './media-render.js';
import {icon} from '../ui/icons.js';
import {decoratePalette} from '../ui/palette.js';
const options={accent:['gold','ocean','forest','rose'],secondary:['slate','navy','charcoal'],header:['road','horizon','grid'],card:['outlined','solid','minimal'],layout:['grid','list'],icon:['shield','star','flag','wheel'],badge:['plain','pill','crest']};
export const themeDefaults={accent:'gold',secondary:'slate',header:'road',card:'outlined',layout:'grid',icon:'shield',badge:'plain'};
export function mountThemeEditor(root,target,resource,refresh,keys=['accent','secondary','header','card']) {
  const form=element('form','media-theme-form');form.id='media-theme-'+target.kind;const preview=element('div','media-theme-preview');
  if(document.getElementById(form.id))form.id+='-'+target.id+(target.child?'-'+target.child:'');
  preview.append(labelText(element('h3'),'media.appearance'),labelText(element('p'),'media.contrastHint'));root.append(disclosure('media.appearance',preview,form));
  const graphic=keys.includes('icon')?element('span','rank-graphic'):null;
  if(graphic){preview.prepend(graphic);decorateMedia(graphic,target,{icon:graphic},{rank:true,resource});}
  for(const key of keys){const select=field(form,key,'media.theme.'+key,{choices:options[key],prefix:'media.preset',value:resource.theme[key]});if(['accent','secondary'].includes(key))decoratePalette(select);}
  const selected=()=>({...resource.theme,...Object.fromEntries(new FormData(form))});
  const draw=()=>{const theme=selected();applyMediaTheme(preview,theme);if(graphic){applyMediaTheme(graphic,theme);graphic.querySelector('svg')?.remove();graphic.prepend(icon(theme.icon));}};form.addEventListener('change',draw);draw();
  const status=element('p');status.setAttribute('role','status');form.append(status);
  const save=button('common.save');save.type='submit';const restore=theme=>{for(const key of keys){form.elements[key].value=theme[key];form.elements[key].dispatchEvent(new Event('change',{bubbles:true}));}draw();};
  const reset=button('media.reset',()=>restore(themeDefaults));form.append(save,reset,button('common.cancel',()=>restore(resource.theme)));
  form.addEventListener('submit',async event=>{event.preventDefault();const theme=selected(),controls=[...form.querySelectorAll('button,select')];controls.forEach(n=>n.disabled=true);
    try{await saveMediaTheme(target,resource.revision,theme,resource.images.map(n=>n.id));await refresh();dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target}}));}
    catch(error){labelText(status,mediaError(error));}finally{controls.forEach(n=>n.disabled=false);}
  });
}

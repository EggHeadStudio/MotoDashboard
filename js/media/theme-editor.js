import {saveMediaTheme,mediaError} from './media-client.js';
import {element,labelText,field,button,disclosure} from '../ui/forms.js';
import {applyMediaTheme} from './media-render.js';
const options={accent:['gold','ocean','forest','rose'],secondary:['slate','navy','charcoal'],header:['road','horizon','grid'],card:['outlined','solid','minimal'],layout:['grid','list'],icon:['shield','star','flag','wheel'],badge:['plain','pill','crest']};
export const themeDefaults={accent:'gold',secondary:'slate',header:'road',card:'outlined',layout:'grid',icon:'shield',badge:'plain'};
export function mountThemeEditor(root,target,resource,refresh,keys=['accent','secondary','header','card']) {
  const form=element('form','media-theme-form');form.id='media-theme-'+target.kind;const preview=element('div','media-theme-preview');
  preview.append(labelText(element('h3'),'media.appearance'),labelText(element('p'),'media.contrastHint'));root.append(disclosure('media.appearance',preview,form));
  for(const key of keys)field(form,key,'media.theme.'+key,{choices:options[key],prefix:'media.preset',value:resource.theme[key]});
  const selected=()=>({...resource.theme,...Object.fromEntries(new FormData(form))});
  const draw=()=>applyMediaTheme(preview,selected());form.addEventListener('change',draw);draw();
  const status=element('p');status.setAttribute('role','status');form.append(status);
  const save=button('common.save');save.type='submit';const reset=button('media.reset',()=>{for(const key of keys)form.elements[key].value=themeDefaults[key];draw();});form.append(save,reset);
  form.addEventListener('submit',async event=>{event.preventDefault();const theme=selected(),controls=[...form.querySelectorAll('button,select')];controls.forEach(n=>n.disabled=true);
    try{await saveMediaTheme(target,resource.revision,theme,resource.images.map(n=>n.id));await refresh();}
    catch(error){labelText(status,mediaError(error));}finally{controls.forEach(n=>n.disabled=false);}
  });
}

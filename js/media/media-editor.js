import {getMedia,uploadMedia,removeMedia,saveMediaTheme,releaseMediaURL,mediaObjectURL,mediaError} from './media-client.js';
import {prepareImage,MEDIA_ASPECTS} from './prepare-image.js';
import {element,labelText,button,field,disclosure} from '../ui/forms.js';
import {getAccount,onAccountChange} from '../auth-state.js';
import {t} from '../i18n/i18n.js';
import {mountThemeEditor} from './theme-editor.js';
export function mountMediaEditor(root,target,slots,{themeFields=['accent','secondary','header','card','layout']}={}) {
  const section=element('section','media-editor'),content=element('div'),details=disclosure('media.title',section);details.dataset.mediaKind=target.kind;root.append(details);
  const status=element('p','feature-status');status.setAttribute('role','status');const progress=element('progress');progress.max=100;progress.value=0;progress.hidden=true;progress.setAttribute('aria-label',t('media.progress'));
  section.append(labelText(element('p','muted'),'media.privacy'),status,progress,content);
  let resource=null,busy=false,prepared=null,file=null,previewURL=null,version=0,disposed=false,loaded=false,timer,disconnected;
  const owner=getAccount()?.uid,controller=new AbortController(),urls=[];
  function cleanup(){if(disposed)return;disposed=true;version++;clearTimeout(timer);controller.abort();if(previewURL)URL.revokeObjectURL(previewURL);for(const url of urls)releaseMediaURL(url);unlisten();disconnected?.disconnect();}
  const unlisten=onAccountChange(({user})=>{if(user?.uid!==owner)queueMicrotask(cleanup);});
  const view=root.closest('dialog');view?.addEventListener('close',cleanup,{once:true});
  disconnected=new MutationObserver(()=>{if(!details.isConnected)cleanup();});disconnected.observe(document.body,{childList:true,subtree:true});
  async function action(fn) {
    if(busy||disposed)return;busy=true;section.setAttribute('aria-busy','true');const controls=[...content.querySelectorAll('button,input,select')];controls.forEach(n=>n.disabled=true);labelText(status,'common.loading');
    try{await fn();if(!disposed)labelText(status,'media.saved');}catch(error){if(!disposed)labelText(status,mediaError(error));}
    finally{busy=false;section.setAttribute('aria-busy','false');controls.forEach(n=>n.disabled=false);progress.hidden=true;}
  }
  async function refresh() {
    const next=await getMedia(target,controller.signal);if(disposed||getAccount()?.uid!==owner)return;
    resource=next;loaded=true;render();
  }
  details.addEventListener('toggle',()=>{if(details.open&&!loaded)void action(refresh);});
  function render() {
    content.replaceChildren();for(const url of urls)releaseMediaURL(url);urls.length=0;
    if(!resource?.canWrite){content.append(labelText(element('p'),'media.access_denied'));return;}
    const list=element('div','media-gallery');content.append(list);
    for(const image of resource.images) {
      const card=element('article','media-gallery-item');card.dataset.mediaId=image.id;
      const picture=element('img');picture.alt=t('media.'+(image.slot.startsWith('photo')?'photo':image.slot));picture.dataset.motodashMedia='';card.append(picture,labelText(element('p'),'media.'+(image.slot.startsWith('photo')?'photo':image.slot)));
      mediaObjectURL(image.id,controller.signal).then(url=>{if(disposed||!picture.isConnected){releaseMediaURL(url);return;}urls.push(url);picture.src=url;}).catch(()=>{if(picture.isConnected)picture.remove();});
      card.append(button('common.delete',()=>{if(confirm(t('media.deleteConfirm')))void action(async()=>{await removeMedia(target,image.slot,resource.revision);await refresh();});}));
      if(target.kind==='vehicle') {
        card.append(button('media.cover',()=>void action(async()=>{const order=[image.id,...resource.images.map(n=>n.id).filter(id=>id!==image.id)];await saveMediaTheme(target,resource.revision,resource.theme,order);await refresh();})));
        const index=resource.images.indexOf(image);
        for(const [key,delta] of [['media.up',-1],['media.down',1]]){const control=button(key,()=>void action(async()=>{const order=resource.images.map(n=>n.id);[order[index],order[index+delta]]=[order[index+delta],order[index]];await saveMediaTheme(target,resource.revision,resource.theme,order);await refresh();}));control.disabled=index+delta<0||index+delta>=resource.images.length;card.append(control);}
      }list.append(card);
    }
    const form=element('form');form.id='media-'+target.kind+'-form';content.append(form);
    const slot=field(form,'slot','media.slot',{choices:slots,prefix:'media',value:slots.find(id=>!resource.images.some(n=>n.slot===id)) || slots[0]});
    const fileLabel=labelText(element('label','field'),'media.select'),input=element('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.id=form.id+'-file';fileLabel.htmlFor=input.id;form.append(fileLabel,input);
    const camera=button('media.camera',()=>{input.setAttribute('capture','environment');input.click();input.removeAttribute('capture');});form.append(camera);
    const preview=element('img','media-preview');preview.alt=t('media.preview');preview.hidden=true;form.append(preview);
    const crop=element('div','media-crop');form.append(crop);
    const zoom=field(crop,'zoom','media.zoom',{type:'range',min:1,maxValue:3,value:1});zoom.step='.05';
    const x=field(crop,'x','media.horizontal',{type:'range',min:0,maxValue:100,value:50}),y=field(crop,'y','media.vertical',{type:'range',min:0,maxValue:100,value:50});
    // field IDs derive from parent IDs; each crop gets a unique form prefix.
    for(const [name,node] of [['zoom',zoom],['x',x],['y',y]]){node.id=form.id+'-'+name;node.parentElement.htmlFor=node.id;}
    const publishLabel=element('label','media-publish'),published=element('input');published.type='checkbox';published.name='published';publishLabel.append(published,labelText(element('span'),'media.publish'));form.append(publishLabel);
    const upload=button('media.upload');upload.type='submit';upload.disabled=true;form.append(upload);
    async function prepare() {
      if(!file||disposed)return;const token=++version;upload.disabled=true;progress.hidden=false;
      try{const blob=await prepareImage(file,{aspect:MEDIA_ASPECTS[slot.value.startsWith('photo')?'photo':slot.value],format:slot.value==='icon'?'image/png':'image/jpeg',maxDimension:slot.value==='icon'?256:1600,zoom:Number(zoom.value),x:Number(x.value),y:Number(y.value),onProgress:value=>{if(token===version)progress.value=value;}});
        if(token!==version||disposed)return;prepared=blob;if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(blob);preview.src=previewURL;preview.hidden=false;upload.disabled=false;status.textContent='';}
      catch(error){if(token===version&&!disposed){prepared=null;preview.hidden=true;labelText(status,mediaError(error));}}finally{if(token===version)progress.hidden=true;}
    }
    input.addEventListener('change',()=>{file=input.files?.[0] || null;void prepare();});
    for(const node of [zoom,x,y,slot])node.addEventListener('input',()=>{upload.disabled=true;clearTimeout(timer);timer=setTimeout(()=>void prepare(),180);});
    form.addEventListener('submit',event=>{event.preventDefault();if(!prepared)return;void action(async()=>{
      progress.hidden=false;await uploadMedia(target,slot.value,prepared,resource.revision,published.checked,value=>{progress.value=value;},controller.signal);
      file=null;prepared=null;if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}await refresh();
      dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target}}));
    });});
    if(themeFields.length)mountThemeEditor(content,target,resource,refresh,themeFields);
  }
  content.append(button('common.refresh',()=>void action(refresh)));
  return {details,refresh:()=>action(refresh),dispose:cleanup};
}

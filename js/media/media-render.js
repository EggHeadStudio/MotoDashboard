import {getMedia,mediaObjectURL,releaseMediaURL,mediaError} from './media-client.js';
import {element,labelText,disclosure} from '../ui/forms.js';
import {getAccount} from '../auth-state.js';
import {icon} from '../ui/icons.js';
const active=new Set();let observer;
function ensureCleanup(){if(observer)return;observer=new MutationObserver(()=>{
  for(const entry of active)if(!entry.node.isConnected){entry.dispose();active.delete(entry);}
});observer.observe(document.body,{childList:true,subtree:true});}
export function decorateMedia(node,target,placements={banner:node},options={}) {
  ensureCleanup();const controller=new AbortController(),urls=[],images=[];let started=false,disposed=false;
  if(options.rank)node.append(icon('shield'));
  const entry={node,dispose(){disposed=true;controller.abort();visibility?.disconnect();for(const url of urls)releaseMediaURL(url);for(const image of images)image.remove();}};
  active.add(entry);
  async function load(){if(started||disposed)return;started=true;const owner=getAccount()?.uid;
    try {
      const resource=await getMedia(target,controller.signal);if(disposed||owner!==getAccount()?.uid)return;
      if(options.theme!==false)applyMediaTheme(options.themeRoot || node,resource.theme);
      if(options.rank){node.querySelector('svg')?.remove();node.prepend(icon(['shield','star','flag','wheel'].includes(resource.theme.icon)?resource.theme.icon:'shield'));}
      for(const [slot,container] of Object.entries(placements)) {
        const media=slot==='cover'?resource.images.find(item=>item.slot.startsWith('photo')):resource.images.find(item=>item.slot===slot);
        if(!media)continue;const url=await mediaObjectURL(media.id,controller.signal);if(disposed||owner!==getAccount()?.uid){releaseMediaURL(url);return;}urls.push(url);
        const img=element('img','media-image media-'+slot);img.dataset.motodashMedia='';img.alt='';img.src=url;img.decoding='async';container.classList.add('has-media');container.append(img);images.push(img);
      }
    }catch(error){if(disposed)return;if(options.showError){const status=labelText(element('p','muted media-load-status'),mediaError(error));node.append(status);}}
  }
  let visibility;
  if(typeof IntersectionObserver==='function'){visibility=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){visibility.disconnect();void load();}});visibility.observe(node);}else void load();
  return entry.dispose;
}
export function applyMediaTheme(node,theme) {
  if(!theme)return;
  const choices={accent:['gold','ocean','forest','rose'],secondary:['slate','navy','charcoal'],header:['road','horizon','grid'],card:['outlined','solid','minimal'],layout:['grid','list'],icon:['shield','star','flag','wheel'],badge:['plain','pill','crest']};
  for(const [key,allowed] of Object.entries(choices))if(allowed.includes(theme[key]))node.dataset['media'+key[0].toUpperCase()+key.slice(1)]=theme[key];
}
export function mountMediaGallery(root,target) {
  const grid=element('div','media-gallery'),status=element('p','muted'),details=disclosure('media.gallery',status,grid);root.append(details);
  ensureCleanup();const controller=new AbortController(),urls=[];let loaded=false;
  const entry={node:details,dispose(){controller.abort();for(const url of urls)releaseMediaURL(url);}};active.add(entry);
  details.addEventListener('toggle',async()=>{
    if(!details.open||loaded)return;loaded=true;labelText(status,'common.loading');const owner=getAccount()?.uid;
    try{const resource=await getMedia(target,controller.signal);if(owner!==getAccount()?.uid)return;
      const photos=resource.images.filter(img=>img.slot.startsWith('photo'));
      for(const photo of photos){const url=await mediaObjectURL(photo.id,controller.signal);if(controller.signal.aborted||owner!==getAccount()?.uid){releaseMediaURL(url);return;}urls.push(url);
        const img=element('img','media-gallery-photo');img.src=url;img.alt='';img.dataset.motodashMedia='';grid.append(img);}
      status.textContent='';if(!photos.length)labelText(status,'media.empty');
    }catch(error){if(!controller.signal.aborted){loaded=false;labelText(status,mediaError(error));}}
  });
}

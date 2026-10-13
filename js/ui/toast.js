import { labelText, element } from './forms.js';
let active=null,timer=null,lastKey=null,lastAt=0;
export function toast(key) {
  if(key===lastKey && Date.now()-lastAt<8000) return;
  lastKey=key;lastAt=Date.now();
  clearTimeout(timer);active?.remove();
  active=labelText(element('div','toast'),key);active.setAttribute('role','status');
  (document.querySelector('dialog:modal') || document.body).append(active);
  timer=setTimeout(()=>{active?.remove();active=null;},3500);
}

import { labelText, element } from './forms.js';
let active=null,timer=null;
export function toast(key) {
  clearTimeout(timer);active?.remove();
  active=labelText(element('div','toast'),key);active.setAttribute('role','status');
  (document.querySelector('dialog:modal') || document.body).append(active);
  timer=setTimeout(()=>{active?.remove();active=null;},3500);
}

import {button,element,labelText} from './forms.js';
import {t} from '../i18n/i18n.js';
import {getAccount} from '../auth-state.js';
import {sectionNavigation} from './section-nav.js';

// Presentation only. Repositories, Rules and Worker still authorize every write.
export function editOnly(node) {node.dataset.editOnly='';return node;}
const value=node=>node.type==='checkbox'||node.type==='radio'?node.checked:node.value;
const fields=root=>[...root.querySelectorAll('input,select,textarea')];
const baselines=new WeakMap();
const guardedRoots=new WeakSet();
export function acceptEdits(root) {for(const node of fields(root))baselines.set(node,value(node));}
export function hasEdits(root) {return fields(root).some(node=>baselines.has(node)&&baselines.get(node)!==value(node));}
export function mayLeaveEditor(root) {
  const owner=root.dataset.editorOwner ?? root.querySelector('[data-editor-owner]')?.dataset.editorOwner;
  return owner!==(getAccount()?.uid || '')||!hasEdits(root)||confirm(t('edit.discard'));
}
export function guardEditor(root) {
  root.dataset.guardedEditor='';root.dataset.editorOwner=getAccount()?.uid || '';acceptEdits(root);
  if(!guardedRoots.has(root)){
    guardedRoots.add(root);root.addEventListener('focusin',event=>{if(event.target.matches('input,select,textarea')&&!baselines.has(event.target))baselines.set(event.target,value(event.target));});
  }
  return ()=>mayLeaveEditor(root);
}
addEventListener('beforeunload',event=>{
  if([...document.querySelectorAll('[data-guarded-editor]')].some(root=>hasEdits(root))){event.preventDefault();event.returnValue='';}
});
export function mountEditMode(root,{allowed=false,id='content-edit'}={}) {
  root.dataset.editMode='view';
  if(!allowed)return;
  const bar=element('div','edit-toolbar'),edit=button('common.edit',()=>{
    root.dataset.editMode='edit';guardEditor(root);edit.hidden=true;edit.setAttribute('aria-expanded','true');done.hidden=cancel.hidden=false;
    if(!editorNav){editorNav=editOnly(sectionNavigation(root,[
      {node:root.querySelector('[data-media-kind]'),key:'ux.photos'},
      {node:root.querySelector('#branding-form')?.closest('details'),key:'edit.appearance'},
      {node:root.querySelector('#club-members'),key:'members.title'},
      {node:root.querySelector('#club-admission,#group-invitations'),key:'edit.management'}],{label:'ux.editSections'}));hint.after(editorNav);}
    (editorNav.querySelector('button')||cancel).focus();
  },id);
  let editorNav=null;
  edit.setAttribute('aria-expanded','false');bar.setAttribute('role','group');bar.setAttribute('aria-label',t('common.edit'));bar.setAttribute('data-i18n-aria-label','common.edit');
  edit.setAttribute('aria-controls',root.id || root.closest('[id]')?.id || 'screen-host');
  const leave=discard=>{
    if(!mayLeaveEditor(root))return;
    for(const node of fields(root))if(baselines.has(node)){
      if(node.type==='file'){node.value='';node.dispatchEvent(new Event('change',{bubbles:true}));continue;}
      if(node.type==='checkbox'||node.type==='radio')node.checked=baselines.get(node);else node.value=baselines.get(node);
      node.dispatchEvent(new Event('change',{bubbles:true}));
    }
    acceptEdits(root);root.dataset.editMode='view';edit.hidden=false;edit.setAttribute('aria-expanded','false');done.hidden=cancel.hidden=true;edit.focus();
  };
  const done=button('edit.done',()=>leave(false)),cancel=button('common.cancel',()=>leave(true));done.hidden=cancel.hidden=true;
  bar.append(edit,done,cancel);root.prepend(bar);
  const hint=editOnly(labelText(element('p','muted edit-hint'),'edit.scopedSave'));bar.after(hint);
  return {enter:()=>edit.click(),accept:()=>acceptEdits(root)};
}

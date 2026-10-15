import {button,element,labelText} from './forms.js';
import {t} from '../i18n/i18n.js';
import {getAccount} from '../auth-state.js';

// Presentation only. Repositories, Rules and Worker still authorize every write.
export function editOnly(node) {node.dataset.editOnly='';return node;}
const value=node=>node.type==='checkbox'||node.type==='radio'?node.checked:node.value;
const fields=root=>[...root.querySelectorAll('input,select,textarea')];
const baselines=new WeakMap();
export function acceptEdits(root) {for(const node of fields(root))baselines.set(node,value(node));}
export function hasEdits(root) {return fields(root).some(node=>baselines.has(node)&&baselines.get(node)!==value(node));}
export function mayLeaveEditor(root) {return root.dataset.editorOwner!==(getAccount()?.uid || '')||!hasEdits(root)||confirm(t('edit.discard'));}
export function guardEditor(root) {
  root.dataset.guardedEditor='';root.dataset.editorOwner=getAccount()?.uid || '';acceptEdits(root);
  root.addEventListener('focusin',event=>{if(event.target.matches('input,select,textarea')&&!baselines.has(event.target))baselines.set(event.target,value(event.target));});
  return ()=>mayLeaveEditor(root);
}
addEventListener('beforeunload',event=>{
  if([...document.querySelectorAll('[data-guarded-editor]')].some(root=>hasEdits(root))){event.preventDefault();event.returnValue='';}
});
export function mountEditMode(root,{allowed=false,id='content-edit'}={}) {
  root.dataset.editMode='view';
  if(!allowed)return;
  const bar=element('div','edit-toolbar'),edit=button('common.edit',()=>{
    root.dataset.editMode='edit';guardEditor(root);edit.hidden=true;done.hidden=cancel.hidden=false;
    root.querySelector('[data-edit-only] input,[data-edit-only] select,[data-edit-only] summary')?.focus();
  },id);
  edit.setAttribute('aria-controls',root.id || root.closest('[id]')?.id || 'screen-host');
  const leave=discard=>{
    if(!mayLeaveEditor(root))return;
    if(discard)for(const node of fields(root))if(baselines.has(node)){
      if(node.type==='file'){node.value='';continue;}
      if(node.type==='checkbox'||node.type==='radio')node.checked=baselines.get(node);else node.value=baselines.get(node);
    }
    acceptEdits(root);root.dataset.editMode='view';edit.hidden=false;done.hidden=cancel.hidden=true;edit.focus();
  };
  const done=button('edit.done',()=>leave(false)),cancel=button('common.cancel',()=>leave(true));done.hidden=cancel.hidden=true;
  bar.append(edit,done,cancel);root.prepend(bar);
  const hint=editOnly(labelText(element('p','muted edit-hint'),'edit.scopedSave'));bar.after(hint);
  return {enter:()=>edit.click(),accept:()=>acceptEdits(root)};
}

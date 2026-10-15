import {mountEditMode,editOnly,guardEditor,mayLeaveEditor} from './ui/edit-mode.js';
import { getAccount, onAccountChange } from './auth-state.js';
import { t, onLanguageChange } from './i18n/i18n.js';
import { CATEGORIES } from './data/schema.js';
import { loadGarage, saveVehicle, deleteVehicle, defaultVehicle } from './firebase/garageRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { openView, dialog, element, button, field, labelText, runAction } from './ui/forms.js';
import { vehicleIcon } from './ui/icons.js';
import {loadVehicleShowcase,publishShowcaseVehicle,unpublishShowcaseVehicle,loadShowcaseOverview,featureShowcaseVehicle} from './firebase/publicProfileRepository.js';
import {profileURL} from './data/public-profile.js';
import {mountMediaEditor} from './media/media-editor.js';
import {decorateMedia} from './media/media-render.js';

const listeners = new Set();
let state = { uid: null, vehicles: [], defaultVehicleId: null, selectedId: null, ready: false };
let version = 0;
export function selectedVehicle() { return state.uid === getAccount()?.uid ? state.vehicles.find(v => v.id === state.selectedId) || null : null; }
export function onVehicleChange(fn) { listeners.add(fn); fn(selectedVehicle()); return () => listeners.delete(fn); }
export function garageVehicles(){return state.uid===getAccount()?.uid?[...state.vehicles]:[];}
export function chooseRideVehicle(id){if(id!==null&&!garageVehicles().some(v=>v.id===id))return false;state.selectedId=id;publish();return true;}
function publish() { for (const fn of listeners) fn(selectedVehicle()); }
export function initGarageUI() {
  const view = dialog('garage-dialog', 'garage.title');
  const choose = document.getElementById('garage-btn');
  let editing = false;
  let showcaseState=null,showcaseError=null;
  async function showcase(vehicle) {
    const uid=getAccount()?.uid;if(!uid)return;
    const editor=dialog('showcase-editor','showcase.options');openView(editor.node);
    editor.node.addEventListener('close',()=>{editor.node.remove();if(current(uid)){render();openView(view.node);}},{once:true});
    labelText(editor.status,'common.loading');
    try {
      const card=await loadVehicleShowcase(uid,vehicle.id);if(!current(uid)||!editor.node.open)return;
      editor.status.textContent='';editor.body.append(element('h3','',vehicle.nickname),labelText(element('p','muted'),'showcase.hint'));
      const form=element('form');form.id='showcase-form';
      const description=field(form,'description','showcase.description',{multiline:true,max:500,value:card?.publicDescription || ''});
      const consent=field(form,'consent','showcase.consent',{type:'checkbox',required:true});
      const save=button('showcase.publish');save.type='submit';form.append(save);
      form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity()||!consent.checked)return;
        void runAction(form,editor.status,async()=>{await publishShowcaseVehicle(uid,vehicle.id,description.value);if(current(uid)){await refresh();editor.node.close();}});
      });editor.body.append(form);
      if(card)editor.body.append(button('showcase.remove',()=>void runAction(editor.body,editor.status,async()=>{await unpublishShowcaseVehicle(uid,vehicle.id);if(current(uid))editor.node.close();}),'showcase-remove'));
    }catch(error){if(current(uid))labelText(editor.status,dataErrorKey(error));}
  }
  const current = uid => getAccount()?.uid === uid && state.uid === uid;
  async function refresh() {
    const uid = getAccount()?.uid;
    const token = ++version;
    if (!uid) { render(); return; }
    const result = await loadGarage(uid);
    if (token !== version || !current(uid)) return;
    showcaseState=null;showcaseError=null;
    try {showcaseState=await loadShowcaseOverview(uid,result.vehicles);}
    catch(error){showcaseError=error;}
    if (token !== version || !current(uid)) return;
    const previous = state.selectedId;
    state = { uid, ...result, selectedId: result.vehicles.some(v => v.id === previous) ? previous : result.defaultVehicleId, ready: true };
    publish(); labelText(view.status, 'common.loaded'); render();
  }
  function action(fn) {
    const uid = state.uid;
    return runAction(view.body, view.status, async () => { await fn(uid); if (current(uid)) await refresh(); }, dataErrorKey);
  }
  function edit(vehicle) {
    if(!mayLeaveEditor(view.body))return;editing = true; view.body.replaceChildren();delete view.body.dataset.editMode;
    const form = element('form'); form.id = 'vehicle-form';
    field(form, 'category', 'garage.category', { choices: CATEGORIES, prefix: 'category', value: vehicle?.category || 'motorcycle' });
    field(form, 'nickname', 'garage.nickname', { max: 64, required: true, value: vehicle?.nickname });
    field(form, 'manufacturer', 'garage.manufacturer', { max: 64, value: vehicle?.manufacturer });
    field(form, 'model', 'garage.model', { max: 64, value: vehicle?.model });
    field(form, 'modelYear', 'garage.year', { type: 'number', min: 1885, maxValue: new Date().getFullYear()+1, value: vehicle?.modelYear });
    field(form, 'description', 'garage.description', { max: 1000, multiline: true, value: vehicle?.description });
    field(form, 'visibility', 'garage.visibility', { choices: ['private','club','public'], prefix: 'visibility', value: vehicle?.visibility || 'private' });
    form.append(labelText(element('p', 'muted'), 'garage.visibilityHint'));
    const save = button('common.save'); save.type = 'submit';
    form.append(save, button('common.cancel', render));
    form.addEventListener('submit', event => {
      event.preventDefault(); const input = Object.fromEntries(new FormData(form));
      action(uid => saveVehicle(uid, vehicle?.id, input));
    }); view.body.append(form);guardEditor(view.body);
  }
  function render() {
    editing = false; view.body.replaceChildren();
    if (!getAccount()) { view.body.append(labelText(element('p'), 'data.signIn')); return; }
    view.body.append(button('garage.add', () => edit(null), 'garage-add'), button('common.refresh', () => action(() => Promise.resolve())));
    view.body.prepend(labelText(element('p','muted'),'garage.showcase'));
    if(showcaseError)labelText(view.status,dataErrorKey(showcaseError));
    if(showcaseState?.partial)view.body.append(labelText(element('p','muted'),'showcase.stateUnknown'));
    if(showcaseState?.prefs.publicId){
      const actions=element('div','feature-actions');
      for(const key of ['publicProfile.view','showcase.visitor']){const link=labelText(element('a','text-button'),key);link.href=profileURL(showcaseState.prefs.publicId);
        link.addEventListener('click',()=>view.node.close());actions.append(link);}
      view.body.append(actions,labelText(element('p','muted'),showcaseState.prefs.visibility==='public'?'showcase.profilePublic':'showcase.profilePrivate'));
    }
    if (!state.vehicles.length) view.body.append(labelText(element('p'), 'garage.empty'));
    for (const vehicle of state.vehicles) {
      const card = element('article', 'feature-card vehicle-card' + (state.selectedId===vehicle.id?' is-selected':''));
      const art = element('div','vehicle-art');art.append(vehicleIcon(vehicle.category));
      const info = element('div','vehicle-info');
      info.append(element('h3', '', vehicle.nickname), labelText(element('p','muted'), `category.${vehicle.category}`),
        element('p','', [vehicle.manufacturer,vehicle.model,vehicle.modelYear].filter(Boolean).join(' ')), element('p','',vehicle.description));
      if (vehicle.id === state.defaultVehicleId) info.append(labelText(element('p','badge'), 'garage.default'));
      if (vehicle.id === state.selectedId) info.append(labelText(element('p','badge'), 'garage.selected'));
      const entry=showcaseState?.entries.find(row=>row.sourceId===vehicle.id);
      const visible=entry?.available && showcaseState.prefs.state==='active' && showcaseState.prefs.visibility==='public';
      const statusKey=!showcaseState || showcaseState.partial && !entry?'showcase.stateUnknown':!entry?'showcase.notPublished':!entry.available?'showcase.unavailable':visible?'showcase.publicNow':'showcase.selectedPrivate';
      info.append(labelText(element('p','showcase-state'),statusKey));
      if(entry?.featured)info.append(labelText(element('p','badge'),'showcase.featured'));
      const controls = element('div','feature-actions');
      controls.append(button('garage.choose', () => { state.selectedId = vehicle.id; publish(); render(); view.node.close(); }),
        editOnly(button('garage.makeDefault', () => action(uid => defaultVehicle(uid,vehicle.id)))),
        editOnly(button('common.edit', () => edit(vehicle))),
        editOnly(button('showcase.options',()=>void showcase(vehicle))),
        editOnly(button('common.delete', () => { if (confirm(t('garage.deleteConfirm'))) action(uid => deleteVehicle(uid,vehicle.id)); })));
      controls.append(editOnly(button(entry?'showcase.hide':'showcase.show',()=>entry?action(uid=>unpublishShowcaseVehicle(uid,vehicle.id)):void showcase(vehicle))));
      if(entry?.available && !entry.featured)controls.append(editOnly(button('showcase.makeFeatured',()=>action(uid=>featureShowcaseVehicle(uid,vehicle.id)))));
      info.append(controls);card.append(art,info); view.body.append(card);
      decorateMedia(card,{kind:'vehicle',id:vehicle.id},{cover:art});
      mountMediaEditor(info,{kind:'vehicle',id:vehicle.id},['photo0','photo1','photo2','photo3','photo4','photo5']);
    }
    mountEditMode(view.body,{allowed:true,id:'garage-edit'});
    view.body.append(button('garage.noVehicle', () => { state.selectedId = null; publish(); render(); view.node.close(); }));
  }
  choose.addEventListener('click', () => {
    render(); openView(view.node);
    if (getAccount()) action(() => Promise.resolve());
  });
  onAccountChange(({user}) => {
    if(state.uid && state.uid!==user?.uid)document.getElementById('showcase-editor')?.close();
    if ((user?.uid || null) === state.uid) return;
    ++version;showcaseState=null;showcaseError=null; state = {uid:user?.uid || null,vehicles:[],defaultVehicleId:null,selectedId:null,ready:false};
    publish(); labelText(view.status, user ? 'common.loading' : 'data.signIn'); render();
    if (user) refresh().catch(error => { if (current(user.uid)) labelText(view.status,dataErrorKey(error)); });
  });
  onLanguageChange(() => { if (!editing) render(); });
}

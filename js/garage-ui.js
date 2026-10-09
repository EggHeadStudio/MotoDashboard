import { getAccount, onAccountChange } from './auth-state.js';
import { t, onLanguageChange } from './i18n/i18n.js';
import { CATEGORIES } from './data/schema.js';
import { loadGarage, saveVehicle, deleteVehicle, defaultVehicle } from './firebase/garageRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { dialog, element, button, field, labelText, runAction } from './ui/forms.js';

const listeners = new Set();
let state = { uid: null, vehicles: [], defaultVehicleId: null, selectedId: null, ready: false };
let version = 0;
export function selectedVehicle() { return state.uid === getAccount()?.uid ? state.vehicles.find(v => v.id === state.selectedId) || null : null; }
export function onVehicleChange(fn) { listeners.add(fn); fn(selectedVehicle()); return () => listeners.delete(fn); }
function publish() { for (const fn of listeners) fn(selectedVehicle()); }
export function initGarageUI() {
  const view = dialog('garage-dialog', 'garage.title');
  const choose = document.getElementById('garage-btn');
  let editing = false;
  const current = uid => getAccount()?.uid === uid && state.uid === uid;
  async function refresh() {
    const uid = getAccount()?.uid;
    const token = ++version;
    if (!uid) { render(); return; }
    const result = await loadGarage(uid);
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
    editing = true; view.body.replaceChildren();
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
    }); view.body.append(form);
  }
  function render() {
    editing = false; view.body.replaceChildren();
    if (!getAccount()) { view.body.append(labelText(element('p'), 'data.signIn')); return; }
    view.body.append(button('garage.add', () => edit(null), 'garage-add'), button('common.refresh', () => action(() => Promise.resolve())));
    if (!state.vehicles.length) view.body.append(labelText(element('p'), 'garage.empty'));
    for (const vehicle of state.vehicles) {
      const card = element('article', 'feature-card');
      const icon = element('span', 'category-icon', CATEGORIES.indexOf(vehicle.category)+1);
      icon.setAttribute('aria-hidden','true');
      card.append(icon, element('h3', '', vehicle.nickname), labelText(element('p','muted'), `category.${vehicle.category}`),
        element('p','', [vehicle.manufacturer,vehicle.model,vehicle.modelYear].filter(Boolean).join(' ')), element('p','',vehicle.description));
      if (vehicle.id === state.defaultVehicleId) card.append(labelText(element('p'), 'garage.default'));
      if (vehicle.id === state.selectedId) card.append(labelText(element('p'), 'garage.selected'));
      const controls = element('div','feature-actions');
      controls.append(button('garage.choose', () => { state.selectedId = vehicle.id; publish(); render(); view.node.close(); }),
        button('garage.makeDefault', () => action(uid => defaultVehicle(uid,vehicle.id))),
        button('common.edit', () => edit(vehicle)),
        button('common.delete', () => { if (confirm(t('garage.deleteConfirm'))) action(uid => deleteVehicle(uid,vehicle.id)); }));
      card.append(controls); view.body.append(card);
    }
    view.body.append(button('garage.noVehicle', () => { state.selectedId = null; publish(); render(); view.node.close(); }));
  }
  choose.addEventListener('click', () => {
    render(); view.node.showModal();
    if (getAccount()) action(() => Promise.resolve());
  });
  onAccountChange(({user}) => {
    if ((user?.uid || null) === state.uid) return;
    ++version; state = {uid:user?.uid || null,vehicles:[],defaultVehicleId:null,selectedId:null,ready:false};
    publish(); labelText(view.status, user ? 'common.loading' : 'data.signIn'); render();
    if (user) refresh().catch(error => { if (current(user.uid)) labelText(view.status,dataErrorKey(error)); });
  });
  onLanguageChange(() => { if (!editing) render(); });
}

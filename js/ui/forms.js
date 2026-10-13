import { t, setLocalizedText } from '../i18n/i18n.js';
import { openView, mountPanel } from './navigation.js';
import { dataErrorMessage } from '../firebase/access.js';

export function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content != null) node.textContent = content;
  return node;
}
export function labelText(node, key, params) { setLocalizedText(node, () => t(key, params)); return node; }
export function button(key, action, id) {
  const node = labelText(element('button'), key);
  node.type = 'button'; if (id) node.id = id;
  if (action) node.addEventListener('click', action);
  return node;
}
export function field(form, name, key, options = {}) {
  const wrap = element('label', 'field');
  wrap.append(labelText(element('span'), key));
  const input = element(options.choices ? 'select' : options.multiline ? 'textarea' : 'input');
  input.name = name;
  input.id = `${form.id}-${name}`;
  if (options.choices) for (const choice of options.choices) {
    const item = element('option'); item.value = choice;
    labelText(item, `${options.prefix}.${choice}`); input.append(item);
  }
  else {
    if (!options.multiline) input.type = options.type || 'text';
    if (options.max) input.maxLength = options.max;
    if (options.min != null) input.min = options.min;
    if (options.maxValue != null) input.max = options.maxValue;
  }
  input.required = Boolean(options.required);
  if (options.value != null) input.value = options.value;
  wrap.append(input); form.append(wrap); return input;
}
export function dialog(id, titleKey) {
  const node = element('dialog', 'feature-dialog'); node.id = id;
  const header = element('div', 'feature-header');
  const heading = labelText(element('h2'), titleKey); heading.id = id + '-title';
  node.setAttribute('aria-labelledby', heading.id);
  header.append(heading, button('auth.close', () => node.close()));
  const body = element('div', 'feature-body');
  const status = element('p', 'feature-status'); status.setAttribute('role', 'status');
  node.append(header, status, body); document.body.append(node);
  mountPanel(node);
  return { node, body, status };
}
export async function runAction(root, status, action, errorKey) {
  const controls = [...root.querySelectorAll('button,input,select,textarea')];
  const disabled = controls.map(node => node.disabled);
  controls.forEach(node => { node.disabled = true; });
  labelText(status, 'common.loading');
  root.setAttribute('aria-busy', 'true');
  try { await action(); } catch (error) { setLocalizedText(status,()=>dataErrorMessage(error)); }
  finally { root.setAttribute('aria-busy', 'false'); controls.forEach((node, i) => { node.disabled = disabled[i]; }); }
}
export { openView };
export function disclosure(key, ...children) {
  const node = element('details', 'disclosure'); node.append(labelText(element('summary'),key), ...children); return node;
}

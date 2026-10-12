import { icon } from './icons.js';
import { t, setLocalizedText } from '../i18n/i18n.js';
import { getAccount } from '../auth-state.js';

const destinations = ['home','discover','rides','clubs','profile'];
const panels = {'lobby-dialog':'discover', 'clubs-dialog':'clubs', 'groups-dialog':'rides'};
let selected = 'home', navigating = false;
const silentClosures = new WeakSet();
const dashboardReturns = new WeakMap();
export const currentScreen = () => selected;
export function navigate(screen, {write = true, panel = null, focus = true} = {}) {
  if (!destinations.includes(screen)) screen = 'home';
  selected = screen; navigating = true;
  const shell = document.getElementById('start-overlay'); shell.dataset.screen = screen;
  for (const [id] of Object.entries(panels)) {
    const node = document.getElementById(id); if (node?.open && id !== panel) {silentClosures.add(node);node.close();}
  }
  for (const node of document.querySelectorAll('.app-screen')) node.hidden = node.id !== 'screen-' + screen || !!panel;
  for (const node of document.querySelectorAll('#bottom-nav button')) {
    const active = node.dataset.destination === screen; node.setAttribute('aria-current', active ? 'page' : 'false');
  }
  navigating = false;
  if (write) history.pushState({screen}, '', '#/' + screen);
  if (!panel && screen === 'rides') document.getElementById('history-list').style.display = 'block';
  if (!panel && screen === 'discover') document.getElementById('lobby-btn').click();
  if (!panel && screen === 'clubs') document.getElementById('clubs-btn').click();
  if (focus) document.getElementById('screen-host').focus({preventScroll:true});
  document.getElementById('start-overlay').scrollTop = 0;
  dispatchEvent(new CustomEvent('motodash-navigate', {detail: {screen}}));
}
export function openView(node) {
  const screen = panels[node.id];
  if (screen) {
    const shell=document.getElementById('start-overlay');
    if(shell.style.display==='none') {dashboardReturns.set(node,getAccount()?.uid || null);shell.style.display='flex';}
    navigate(screen, {write:false, panel:node.id, focus:false});
    if (!node.open) node.show();
    node.querySelector('h2')?.setAttribute('tabindex','-1'); node.querySelector('h2')?.focus();
    return;
  }
  // Native dialogs remain modal, but never stack over another modal.
  const previousFocus=document.activeElement;
  for (const previous of document.querySelectorAll('dialog[open]:modal')) if (previous !== node) previous.close();
  if (!node.open) {
    node.showModal();
    node.addEventListener('close',()=>{
      if(document.querySelector('dialog:modal'))return;
      const target=previousFocus?.isConnected && previousFocus.getClientRects().length ? previousFocus : document.getElementById('screen-host');
      target?.focus({preventScroll:true});
    },{once:true});
  }
}
export function mountPanel(node) {
  if (!panels[node.id]) return;
  node.classList.add('page-panel'); node.setAttribute('role','region');
  document.getElementById('screen-host').append(node);
  node.addEventListener('close', () => {
    if(silentClosures.delete(node)) return;
    if (navigating) return;
    const screen = panels[node.id] === 'rides' ? 'rides' : 'home';
    navigate(screen);
    if(dashboardReturns.has(node)) {
      const owner=dashboardReturns.get(node);dashboardReturns.delete(node);
      if(owner===(getAccount()?.uid || null)) document.getElementById('start-overlay').style.display='none';
    }
  });
}
export function initNavigation() {
  const nav = document.getElementById('bottom-nav');
  for (const screen of destinations) {
    const node = document.createElement('button'); node.type='button'; node.dataset.destination=screen;
    node.setAttribute('aria-current',screen==='home'?'page':'false');
    const label=document.createElement('span');setLocalizedText(label,()=>t('nav.'+screen));
    node.append(icon(screen), label);
    node.addEventListener('click', () => navigate(screen)); nav.append(node);
  }
  document.getElementById('home-profile').append(icon('profile'));
  const actions=document.createElement('div');actions.className='header-actions';
  const language=document.getElementById('language-control');
  document.querySelector('.shell-header').append(actions);actions.append(language,document.getElementById('home-profile'));
  document.getElementById('home-profile').addEventListener('click', () => navigate('profile'));
  document.getElementById('home-join').addEventListener('click', () => navigate('discover'));
  document.getElementById('profile-clubs').addEventListener('click', () => navigate('clubs'));
  document.getElementById('history-btn').addEventListener('click', () => navigate('rides'));
  function route() {
    const screen = /^#\/(home|discover|rides|clubs|profile)$/.exec(location.hash)?.[1];
    if (screen) navigate(screen,{write:false});
  }
  addEventListener('popstate', route); addEventListener('hashchange', route);
  queueMicrotask(() => {if (!/^#\/(?:club|session)\//.test(location.hash)) route();});
  // Primary navigation is unavailable while driving; the existing HUD owns the map.
  new MutationObserver(() => {
    const driving = document.getElementById('start-overlay').style.display === 'none';
    document.body.classList.toggle('dashboard-active', driving);
    if(driving) document.body.append(language);else actions.prepend(language);
    document.getElementById('hud').inert = !driving;
  }).observe(document.getElementById('start-overlay'), {attributes:true, attributeFilter:['style']});
  document.getElementById('hud').inert = true;
  new ResizeObserver(()=>{
    const height=nav.getBoundingClientRect().height;
    if(height>0) document.documentElement.style.setProperty('--md-nav-height',height+'px');
  }).observe(nav);
}

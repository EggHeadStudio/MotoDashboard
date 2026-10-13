import {getRideContext,onRideContext} from '../ride-context.js';
import {element,labelText,button,dialog,openView} from './forms.js';
import {icon} from './icons.js';
import {t,onLanguageChange} from '../i18n/i18n.js';
import {followSessionURL,sessionURL} from '../data/group-session.js';

export function requestRideReturn(){dispatchEvent(new Event('motodash-return-to-ride'));}
export function showActiveRideConflict() {
  if(document.getElementById('active-ride-conflict'))return;
  const view=dialog('active-ride-conflict','rideContext.already');
  view.body.append(labelText(element('p'),'rideContext.conflictHint'),button('rideContext.return',()=>{view.node.close();requestRideReturn();}),button('common.cancel',()=>view.node.close()));
  view.node.addEventListener('close',()=>view.node.remove(),{once:true});openView(view.node);
}
export function initRideReturn() {
  const node=element('button','ride-return');node.id='return-to-ride';node.type='button';node.append(icon('rides'));
  const text=labelText(element('span'),'rideContext.return');node.append(text);node.addEventListener('click',requestRideReturn);
  document.querySelector('.header-actions').prepend(node);
  const groupStatus=button('rideContext.sharingOff',()=>{const id=getRideContext().groupId;if(id)followSessionURL(sessionURL(id));},'ride-context-status');
  document.getElementById('status-stack').append(groupStatus);
  const shell=document.getElementById('start-overlay');
  function render(){const state=getRideContext(),active=state.recordingId || state.recoverableId || state.groupId;
    node.hidden=!active || state.dashboardVisible || shell.dataset.screen==='landing';
    node.dataset.sharing=String(state.sharing);node.title=t('rideContext.return');node.setAttribute('aria-label',t('rideContext.return'));
    groupStatus.hidden=!state.groupId || state.sharing;
  }
  new MutationObserver(()=>{render();}).observe(shell,{attributes:true,attributeFilter:['data-screen','style']});
  onRideContext(render);onLanguageChange(render);render();
}

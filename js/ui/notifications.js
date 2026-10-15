import {getAccount,onAccountChange} from '../auth-state.js';
import {watchNotifications,markNotificationRead} from '../firebase/notificationRepository.js';
import {t,onLanguageChange,getLocale} from '../i18n/i18n.js';
import {dialog,element,labelText,button,openView,runAction} from './forms.js';
import {icon} from './icons.js';
import {sessionURL,followSessionURL} from '../data/group-session.js';
import {dataErrorKey} from '../firebase/access.js';
import {currentScreen} from './navigation.js';

export function initNotifications() {
  const view=dialog('notifications-dialog','notifications.title');
  const bell=element('button');bell.type='button';bell.id='notifications-bell';
  bell.addEventListener('click',()=>{location.hash='/notifications';openPanel();});
  bell.replaceChildren(icon('bell'));bell.className='notification-bell';
  const badge=element('span','notification-count');badge.hidden=true;bell.append(badge);
  document.querySelector('.header-actions').prepend(bell);
  let uid=null,epoch=0,rows=[],release=null,count=0,capped=false,waiting=false,failed=false;
  function render() {
    dispatchEvent(new CustomEvent('motodash-notification-feed',{detail:{uid,rows:[...rows]}}));
    bell.setAttribute('aria-label',t('notifications.unread',{count:capped?'50+':count}));
    bell.title=t('notifications.title');badge.textContent=capped?'50+':String(count);badge.hidden=count===0;
    view.body.replaceChildren();
    if(!uid) {
      view.body.append(labelText(element('p'),'data.signIn'),button('groups.signIn',()=>{
        waiting=true;view.node.close();document.getElementById('account-btn').click();
      }));return;
    }
    if(!rows.length){view.body.append(labelText(element('p','notification-empty'),'notifications.empty'));return;}
    for(const row of rows) {
      const card=element('article','notification-item');card.classList.toggle('is-unread',row.readAt===null);
      const open=button('notifications.'+row.type,()=>void runAction(view.body,view.status,async()=>{
        const owner=uid,token=epoch;
        if(row.readAt===null)await markNotificationRead(owner,row.id);
        if(uid!==owner||epoch!==token)return;
        view.node.close();
        if(row.type==='club-approved')location.hash='/club/'+row.sourceId;
        else followSessionURL(sessionURL(row.sourceId));
      },dataErrorKey));
      const time=element('time');
      const milliseconds=row.createdAt?.toMillis?.() ?? row.createdAt?.seconds*1000;
      if(Number.isFinite(milliseconds)){time.dateTime=new Date(milliseconds).toISOString();time.textContent=new Date(milliseconds).toLocaleString(getLocale());}
      card.append(open,time);
      if(row.readAt===null)card.append(button('notifications.markRead',()=>void runAction(view.body,view.status,()=>markNotificationRead(uid,row.id),dataErrorKey)));
      view.body.append(card);
    }
    view.body.append(labelText(element('p','muted'),'notifications.recent'));
  }
  function openPanel() {
    if(document.getElementById('account-dialog').open){waiting=true;return;}
    if(failed && uid)startListeners();
    render();openView(view.node);
  }
  function startListeners() {
    release?.();release=null;failed=false;view.status.textContent='';
    const token=epoch;
    if(uid)release=watchNotifications(uid,values=>{if(token===epoch){rows=values;render();}},
      (value,limit)=>{if(token===epoch){count=value;capped=limit;render();}},
      code=>{if(token===epoch){failed=true;view.status.textContent=t('notifications.connection')+' ['+code+']';bell.title=view.status.textContent;}});
  }
  onAccountChange(({user})=>{
    bell.hidden=!user;
    const next=user?.uid||null;if(next===uid)return;
    release?.();release=null;uid=next;epoch++;rows=[];count=0;capped=false;view.status.textContent='';render();
    startListeners();
    if(location.hash==='#/notifications')openPanel();
  });
  addEventListener('hashchange',()=>{if(location.hash==='#/notifications')openPanel();});
  addEventListener('online',()=>{if(failed && uid)startListeners();});
  view.node.addEventListener('close',()=>{if(!waiting && location.hash==='#/notifications')history.replaceState(null,'','#/'+currentScreen());});
  document.getElementById('account-dialog').addEventListener('close',()=>{if(waiting){waiting=false;if(location.hash==='#/notifications')openPanel();}});
  onLanguageChange(render);render();
  if(location.hash==='#/notifications')queueMicrotask(openPanel);
}

import { getAccount, getDisplayIdentity, onAccountChange, onDisplayIdentity } from '../auth-state.js';
import { onVehicleChange } from '../garage-ui.js';
import { listMyGroups } from '../firebase/groupRepository.js';
import { listMyClubs } from '../firebase/clubRepository.js';
import { dataErrorKey, dataErrorMessage } from '../firebase/access.js';
import { logout } from '../firebase/auth.js';
import { t, getLanguage, setLanguage, onLanguageChange, formatNumber, setLocalizedText } from '../i18n/i18n.js';
import { element, labelText } from './forms.js';
import { groupCard, clubCard, skeletons, emptyState } from './cards.js';
import { vehicleIcon, icon } from './icons.js';
import { navigate } from './navigation.js';
import { sessionURL, followSessionURL } from '../data/group-session.js';
import {upcomingAttendance} from '../firebase/attendanceRepository.js';
import {markNotificationRead} from '../firebase/notificationRepository.js';
import {button,runAction} from './forms.js';

let summary = {owner:null,count:0,distance:0};
const listeners = new Set();
export function publishRideSummary(owner, rides) {
  const completed = rides.filter(ride => ride.status === 'completed');
  summary = {owner, count:completed.length, distance:completed.reduce((total,ride)=>total+(Number(ride.distanceMeters)||0),0)/1000};
  listeners.forEach(listener=>listener());
}
export function initShell() {
  let uid=null,epoch=0,groups=[],clubs=[],loaded=false,loading=false;
  const upcoming=document.getElementById('home-upcoming'),community=document.getElementById('home-clubs'),status=document.getElementById('home-data-status');
  const feed=element('section','home-section');feed.id='home-invitations';upcoming.closest('section').before(feed);
  function identity() {
    const person=getDisplayIdentity(), user=getAccount();
    const name=user && person?.uid===user.uid ? person.displayName : user?.displayName || t('identity.member');
    labelText(document.getElementById('home-title'),user?'home.greeting':'home.guest',{name});
    document.getElementById('profile-display-name').textContent=user?name:t('home.guest');
    const avatar=document.getElementById('profile-avatar');avatar.replaceChildren(user?element('span','',name.trim().slice(0,2).toLocaleUpperCase()):icon('profile'));
    document.getElementById('profile-logout').hidden=!user;
    document.getElementById('profile-language').value=getLanguage();
  }
  function stats() {
    const data=summary.owner===(getAccount()?.uid || null)?summary:{count:0,distance:0};
    const root=document.getElementById('profile-stats');root.replaceChildren(labelText(element('strong'),'profile.count',{count:data.count}),labelText(element('strong'),'profile.distance',{distance:formatNumber(data.distance)}));
  }
  function render() {
    identity();stats();
    upcoming.replaceChildren();community.replaceChildren();
    if(!uid) {upcoming.append(emptyState('home.signIn','home.intro'));community.append(labelText(element('p','muted'),'data.signIn'));return;}
    const next=groups.filter(group=>['active','scheduled'].includes(group.state) && group.startsAt>=Date.now()).sort((a,b)=>a.startsAt-b.startsAt).slice(0,5);
    for(const group of next){const card=groupCard(group,()=>followSessionURL(sessionURL(group.id)));if(group.rsvp)card.querySelector('.badges').append(labelText(element('span','badge'),'rsvp.'+group.rsvp));upcoming.append(card);}
    if(!next.length) upcoming.append(labelText(element('p','muted'),'home.noUpcoming'));
    for(const club of clubs.slice(0,3)) community.append(clubCard(club,()=>{location.hash='/club/'+club.id;},{member:true}));
    if(!clubs.length) community.append(labelText(element('p','muted'),'clubs.noMemberships'));
    dispatchEvent(new CustomEvent('motodash-home-data',{detail:{groups,clubs}}));
  }
  async function refresh() {
    if(!uid||loading) return;loading=true;const owner=uid,token=epoch;
    const first=skeletons(upcoming),second=skeletons(community);labelText(status,'common.loading');
    const results=await Promise.allSettled([listMyGroups(owner),listMyClubs(owner),upcomingAttendance(owner)]);
    if(uid!==owner||epoch!==token||getAccount()?.uid!==owner) return;
    loading=false;first.remove();second.remove();
    const [ridePage,clubPage,plans]=results;
    groups=ridePage.status==='fulfilled'?ridePage.value.groups:[];clubs=clubPage.status==='fulfilled'?clubPage.value.clubs:[];
    if(plans.status==='fulfilled')groups=[...new Map([...groups,...plans.value].map(group=>[group.id,group])).values()];
    loaded=results.every(result=>result.status==='fulfilled');render();
    const failure=results.find(result=>result.status==='rejected');
    if(failure) setLocalizedText(status,()=>dataErrorMessage(failure.reason));
    else if(results.some(result=>result.value.partial)) labelText(status,'home.partial');
    else status.textContent='';
  }
  onAccountChange(({user})=>{
    if(uid===(user?.uid||null)) {identity();return;}
    uid=user?.uid||null;epoch++;loading=false;loaded=false;groups=[];clubs=[];status.textContent='';render();
    if(uid) void refresh();
  });
  onDisplayIdentity(identity);listeners.add(stats);
  onVehicleChange(vehicle=>document.getElementById('home-vehicle-icon').replaceChildren(vehicleIcon(vehicle?.category || 'motorcycle')));
  document.getElementById('home-refresh').addEventListener('click',()=>void refresh());
  addEventListener('motodash-attendance-updated',()=>{loaded=false;if(uid)void refresh();});
  addEventListener('motodash-notification-feed',event=>{
    feed.replaceChildren();if(!uid || event.detail.uid!==uid)return;
    const rows=event.detail.rows.filter(row=>row.readAt===null).slice(0,5);if(!rows.length)return;
    feed.append(labelText(element('h2'),'home.invitations'));const message=element('p','feature-status');message.setAttribute('role','status');feed.append(message);
    for(const row of rows)feed.append(button('notifications.'+row.type,()=>void runAction(feed,message,async()=>{
      const owner=uid;await markNotificationRead(owner,row.id);if(uid!==owner)return;
      if(row.type==='club-approved')location.hash='/club/'+row.sourceId;else followSessionURL(sessionURL(row.sourceId));
    })));
  });
  addEventListener('online',()=>{if(!loaded && uid) void refresh();});
  addEventListener('motodash-navigate',event=>{if(event.detail.screen==='home'&&!loaded) void refresh();});
  document.getElementById('profile-language').addEventListener('change',event=>setLanguage(event.target.value));
  document.getElementById('profile-logout').addEventListener('click',async()=>{
    const root=document.getElementById('profile-status'),node=document.getElementById('profile-logout');node.disabled=true;
    try {await logout();navigate('home');} catch(error){labelText(root,dataErrorKey(error));} finally {node.disabled=false;}
  });
  onLanguageChange(render);render();
}

import { getAccount, onAccountChange } from './auth-state.js';
import { t, getLanguage } from './i18n/i18n.js';
import { ACTIVITY_CATEGORIES } from './data/schema.js';
import { ACTIVITIES, GROUP_VISIBILITIES, JOIN_POLICIES, setRouteInvite } from './data/group-session.js';
import * as repository from './firebase/groupRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { openView, dialog, element, field, button, labelText, runAction } from './ui/forms.js';
// UI mutation hint accelerates server revalidation; it never supplies permissions.
import {liveClient} from './live/live-client.js';
import { groupCard, emptyState } from './ui/cards.js';
import {watchGroup} from './firebase/groupWatch.js';
import {getRideContext} from './ride-context.js';
import {showActiveRideConflict} from './ui/ride-return.js';
import {mountMediaEditor} from './media/media-editor.js';

const sections = new Set();
export const registerGroupSection = render => sections.add(render);
export const formatGroupTime = value => new Date(value).toLocaleString(getLanguage() === 'fi' ? 'fi-FI' : 'en-GB');
const localTime = value => {
  const date = new Date(value); return new Date(value - date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
export function initGroupUI() {
  const view = dialog('groups-dialog', 'groups.title');
  let uid = null, version = 0, selectedId = null, model = null, busy = false, pendingLink=false, waitingForAuth=false;
  let release=null;
  const unwatch=()=>{release?.();release=null;};
  const current = (owner, token) => uid === owner && getAccount()?.uid === owner && version === token;
  function action(fn, next = () => selectedId ? open(selectedId) : browse()) {
    if (busy) return Promise.resolve(); busy = true;
    const owner = uid, token = version;
    return runAction(view.body, view.status, async () => {
      await fn(owner);
      liveClient.revalidate();
      if (current(owner, token)) await next();
    }, dataErrorKey).finally(() => {busy = false;if(pendingLink){pendingLink=false;void linked();}});
  }
  function signedOut() {
    view.body.replaceChildren(labelText(element('p'), 'data.signIn'),button('groups.signIn',()=>{
      document.getElementById('account-btn').click();
    }));
  }
  async function browse(cursor = null) {
    unwatch();
    selectedId = null; model = null; const owner = uid, token = ++version;
    if (!uid) {signedOut();return;}
    const page = await repository.listMyGroups(owner, cursor); if (!current(owner, token)) return;
    if (!cursor) view.body.replaceChildren(button('groups.create', () => action(() => edit(null), () => {}), 'group-create'),
      button('common.refresh', () => action(() => Promise.resolve(), () => browse())));
    if (!page.groups.length && !cursor) view.body.append(emptyState('groups.empty','discover.emptyHint'));
    for (const group of page.groups) {
      const card = groupCard(group,()=>action(()=>Promise.resolve(),()=>open(group.id)));card.dataset.groupId=group.id;
      view.body.append(card);
    }
    if (page.more) {const more=button('clubs.more',()=>action(()=>Promise.resolve(),()=>{more.remove();return browse(page.cursor);}));view.body.append(more);}
    labelText(view.status, page.partial ? 'data.unavailable' : 'common.loaded');
  }
  async function edit(group) {
    unwatch();
    const owner=uid, token=++version;let clubPage=null;
    if (!group) {
      clubPage=await repository.listHostingClubs(owner);
    }
    if(!current(owner,token)) return;
    const form=element('form');form.id='group-form';
    field(form,'title','groups.name',{required:true,max:80,value:group?.title});
    field(form,'description','garage.description',{multiline:true,max:2000,value:group?.description});
    form.append(labelText(element('p','muted'),'groups.publicHint'));
    field(form,'activityType','groups.activity',{choices:ACTIVITIES,prefix:'activity',value:group?.activityType || 'ride'});
    field(form,'category','garage.category',{choices:ACTIVITY_CATEGORIES,prefix:'category',value:group?.category || 'motorcycle'});
    field(form,'startsAt','groups.startTime',{type:'datetime-local',required:true,value:localTime(group?.startsAt || Date.now()+3600000)});
    field(form,'endsAt','groups.endTime',{type:'datetime-local',value:group?.endsAt ? localTime(group.endsAt) : ''});
    form.append(labelText(element('p','muted'),'groups.expirationPolicy'));
    if(group?.state==='active') {form.elements.startsAt.readOnly=true;form.elements.endsAt.readOnly=true;}
    field(form,'meetingArea','groups.area',{required:true,max:80,value:group?.meetingArea});
    field(form,'meetingLocation','groups.meeting',{max:500,value:group?.meetingLocation});
    field(form,'visibility','groups.visibility',{choices:GROUP_VISIBILITIES,prefix:'visibility',value:group?.visibility || 'public'});
    field(form,'joiningPolicy','groups.policy',{choices:JOIN_POLICIES,prefix:'policy',value:group?.joiningPolicy || 'open'});
    field(form,'maxParticipants','groups.capacity',{type:'number',min:2,maxValue:50,value:group?.maxParticipants});
    if (!group) {
      const clubs=field(form,'clubId','groups.organizer',{choices:[]});
      const personal=labelText(element('option'),'groups.personal');personal.value='';clubs.append(personal);
      const seen=new Set();
      function appendClubs(values) {for(const club of values)if(!seen.has(club.id)){seen.add(club.id);const option=element('option','',club.name);option.value=club.id;clubs.append(option);}}
      appendClubs(clubPage.clubs);
      if(clubPage.more) {
        const more=button('groups.moreClubs',()=>action(async()=>{
          const next=await repository.listHostingClubs(owner,clubPage.cursor);if(!current(owner,token))return;
          clubPage=next;appendClubs(next.clubs);if(!next.more)more.remove();
        },()=>{}));form.append(more);
      }
    }
    const save=button('common.save');save.type='submit';form.append(save);
    form.addEventListener('submit',event=>{
      event.preventDefault(); const data=Object.fromEntries(new FormData(form));
      data.startsAt=new Date(data.startsAt).getTime();data.endsAt=data.endsAt ? new Date(data.endsAt).getTime() : null;
      action(async owner=>{
        if(group) await repository.editGroup(owner,group.id,data);
        else {const id=await repository.createGroup(owner,data);if(getAccount()?.uid===owner) selectedId=id;}
      });
    });
    view.body.replaceChildren(button('common.cancel',()=>action(()=>Promise.resolve())),form);
    labelText(view.status,'common.loaded');
  }
  async function open(id) {
    unwatch();
    selectedId=id;const owner=uid,token=++version;
    model=null;view.body.replaceChildren();
    const loaded=await repository.loadGroup(owner,id);if(!current(owner,token)) return;
    model=loaded;const {group,manager,participant}=model;
    view.body.replaceChildren(button('groups.back',()=>action(()=>Promise.resolve(),()=>browse())),
      button('common.refresh',()=>action(()=>Promise.resolve())),groupCard(group,null,{featured:true,detail:true}));
    if(group.endsAt) view.body.append(element('p','',formatGroupTime(group.endsAt)));
    if((participant || manager) && group.meetingLocation) view.body.append(element('p','group-meeting',group.meetingLocation));
    if(manager && ['scheduled','active'].includes(group.state))mountMediaEditor(view.body,{kind:'group',id:group.id},['banner'],{themeFields:['accent','secondary','header','card']});
    if(manager && ['scheduled','active'].includes(group.state)) {
      view.body.append(button('common.edit',()=>action(()=>edit(group),()=>{}),'group-edit'));
      const state=group.state==='scheduled'?'active':'completed';
      view.body.append(button('groups.'+state,()=>{
        const active=getRideContext().groupId;if(state==='active' && active && active!==id){showActiveRideConflict();return;}
        action(owner=>repository.setGroupState(owner,id,state));
      },'group-'+state),
        button('groups.cancelSession',()=>{if(confirm(t('groups.cancelConfirm'))) action(owner=>repository.setGroupState(owner,id,'cancelled'));},'group-cancel'));
    }
    for(const render of sections) {if(!current(owner,token)) return;await render({uid:owner,model,body:view.body,status:view.status,action,stillCurrent:()=>current(owner,token)});}
    if(current(owner,token)) labelText(view.status,'common.loaded');
    if(current(owner,token)) release=watchGroup(owner,id,latest=>{
      if(!current(owner,token))return;
      if(!latest || latest.state!==model.group.state) {
        liveClient.revalidate();
        if(!latest){view.body.replaceChildren();labelText(view.status,'data.denied');unwatch();}
        else void action(()=>Promise.resolve(),()=>open(id));
      }
    });
  }
  document.getElementById('groups-btn').addEventListener('click',()=>{
    openView(view.node);action(()=>Promise.resolve(),()=>browse());
  });
  onAccountChange(({user})=>{
    if((user?.uid || null)===uid) return;
    unwatch();uid=user?.uid || null;version++;selectedId=null;model=null;setRouteInvite(null);view.body.replaceChildren();view.status.textContent='';
    if(!uid) signedOut(); else if(location.hash.startsWith('#/session/')) void linked();
    else if(view.node.open) action(()=>Promise.resolve(),()=>browse());
  });
  view.node.addEventListener('close',unwatch);
  async function linked() {
    const match=/^#\/session\/([A-Za-z0-9_-]{1,100})(?:\/invite\/([A-Za-z0-9_-]{1,100}))?$/.exec(location.hash);
    if(!match) {
      setRouteInvite(null);
      if(location.hash.startsWith('#/session/')) {if(!view.node.open)openView(view.node);view.body.replaceChildren();labelText(view.status,'groups.inviteInvalid');}
      return;
    }
    if(uid && document.getElementById('account-dialog').open) {waitingForAuth=true;return;}
    openView(view.node);
    if(busy) {pendingLink=true;return;}
    view.body.replaceChildren();model=null;selectedId=null;
    setRouteInvite(match[2]?{id:match[1],token:match[2]}:null);
    if(uid) await action(async owner=>{if(match[2]) await repository.resolveGroupInvitation(owner,match[1],match[2]);},()=>open(match[1]));
    else {signedOut();labelText(view.status,'groups.inviteSignIn');}
  }
  document.getElementById('account-dialog').addEventListener('close',()=>{
    if(waitingForAuth){waitingForAuth=false;void linked();}
  });
  addEventListener('hashchange',()=>void linked());addEventListener('motodash-group-link',()=>void linked());void linked();
}

import { getAccount, onAccountChange } from './auth-state.js';
import { t, getLanguage } from './i18n/i18n.js';
import { CATEGORIES } from './data/schema.js';
import { ACTIVITIES, GROUP_VISIBILITIES, JOIN_POLICIES, sessionURL } from './data/group-session.js';
import * as repository from './firebase/groupRepository.js';
import { listClubs, loadClub } from './firebase/clubRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { dialog, element, field, button, labelText, runAction } from './ui/forms.js';

const sections = new Set();
export const registerGroupSection = render => sections.add(render);
export const formatGroupTime = value => new Date(value).toLocaleString(getLanguage() === 'fi' ? 'fi-FI' : 'en-GB');
const localTime = value => {
  const date = new Date(value); return new Date(value - date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
export function initGroupUI() {
  const view = dialog('groups-dialog', 'groups.title');
  let uid = null, version = 0, selectedId = null, model = null, busy = false;
  const current = (owner, token) => uid === owner && getAccount()?.uid === owner && version === token;
  function action(fn, next = () => selectedId ? open(selectedId) : browse()) {
    if (busy) return Promise.resolve(); busy = true;
    const owner = uid, token = version;
    return runAction(view.body, view.status, async () => {
      await fn(owner);
      if (current(owner, token)) await next();
    }, dataErrorKey).finally(() => {busy = false;});
  }
  function signedOut() { view.body.replaceChildren(labelText(element('p'), 'data.signIn')); }
  async function browse(cursor = null) {
    selectedId = null; model = null; const owner = uid, token = ++version;
    if (!uid) {signedOut();return;}
    const page = await repository.listMyGroups(owner, cursor); if (!current(owner, token)) return;
    if (!cursor) view.body.replaceChildren(button('groups.create', () => action(() => edit(null), () => {}), 'group-create'),
      button('common.refresh', () => action(() => Promise.resolve(), () => browse())), labelText(element('p', 'muted'), 'groups.prototype'));
    if (!page.groups.length && !cursor) view.body.append(labelText(element('p'), 'groups.empty'));
    for (const group of page.groups) {
      const card = element('article', 'feature-card'); card.dataset.groupId = group.id;
      card.append(element('h3', '', group.title), labelText(element('p'), 'groupState.'+group.state),
        element('p', '', formatGroupTime(group.startsAt)), button('ui.open', () => action(() => Promise.resolve(), () => open(group.id))));
      view.body.append(card);
    }
    if (page.more) {const more=button('clubs.more',()=>action(()=>Promise.resolve(),()=>{more.remove();return browse(page.cursor);}));view.body.append(more);}
    labelText(view.status, page.partial ? 'data.unavailable' : 'common.loaded');
  }
  async function edit(group) {
    const owner=uid, token=++version; const options=[];
    if (!group) {
      const clubs=await listClubs(owner);
      const roles=await Promise.all(clubs.own.map(club=>loadClub(owner,club.id)));
      for (const entry of roles) if (entry.club.state==='active' && ['owner','admin','host'].includes(entry.role)) options.push(entry.club);
    }
    if(!current(owner,token)) return;
    const form=element('form');form.id='group-form';
    field(form,'title','groups.name',{required:true,max:80,value:group?.title});
    field(form,'description','garage.description',{multiline:true,max:2000,value:group?.description});
    form.append(labelText(element('p','muted'),'groups.publicHint'));
    field(form,'activityType','groups.activity',{choices:ACTIVITIES,prefix:'activity',value:group?.activityType || 'ride'});
    field(form,'category','garage.category',{choices:CATEGORIES,prefix:'category',value:group?.category || 'motorcycle'});
    field(form,'startsAt','groups.startTime',{type:'datetime-local',required:true,value:localTime(group?.startsAt || Date.now()+3600000)});
    field(form,'endsAt','groups.endTime',{type:'datetime-local',value:group?.endsAt ? localTime(group.endsAt) : ''});
    field(form,'meetingArea','groups.area',{required:true,max:80,value:group?.meetingArea});
    field(form,'meetingLocation','groups.meeting',{max:500,value:group?.meetingLocation});
    field(form,'visibility','clubs.visibility',{choices:GROUP_VISIBILITIES,prefix:'visibility',value:group?.visibility || 'public'});
    field(form,'joiningPolicy','clubs.policy',{choices:JOIN_POLICIES,prefix:'policy',value:group?.joiningPolicy || 'open'});
    field(form,'maxParticipants','groups.capacity',{type:'number',min:2,maxValue:50,value:group?.maxParticipants});
    if (!group) {
      const clubs=field(form,'clubId','groups.organizer',{choices:[]});
      const personal=labelText(element('option'),'groups.personal');personal.value='';clubs.append(personal);
      for(const club of options) {const option=element('option','',club.name);option.value=club.id;clubs.append(option);}
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
    selectedId=id;const owner=uid,token=++version;
    const loaded=await repository.loadGroup(owner,id);if(!current(owner,token)) return;
    model=loaded;const {group,manager,participant}=model;
    view.body.replaceChildren(button('groups.back',()=>action(()=>Promise.resolve(),()=>browse())),
      button('common.refresh',()=>action(()=>Promise.resolve())),element('h3','',group.title),
      labelText(element('p'),'activity.'+group.activityType),labelText(element('p'),'category.'+group.category),
      element('p','',group.description),element('p','',formatGroupTime(group.startsAt)),
      element('p','',group.meetingArea),labelText(element('p'),'groupState.'+group.state),
      labelText(element('p'),'groups.count',{count:group.participantCount}),
      labelText(element('p'),'policy.'+group.joiningPolicy),element('p','',group.clubName || group.hostName));
    if(group.endsAt) view.body.append(element('p','',formatGroupTime(group.endsAt)));
    if((participant || manager) && group.meetingLocation) view.body.append(element('p','group-meeting',group.meetingLocation));
    if(manager && ['scheduled','active'].includes(group.state)) {
      view.body.append(button('common.edit',()=>action(()=>edit(group),()=>{}),'group-edit'));
      const state=group.state==='scheduled'?'active':'completed';
      view.body.append(button('groups.'+state,()=>action(owner=>repository.setGroupState(owner,id,state)),'group-'+state),
        button('groups.cancelSession',()=>{if(confirm(t('groups.cancelConfirm'))) action(owner=>repository.setGroupState(owner,id,'cancelled'));},'group-cancel'));
    }
    for(const render of sections) {if(!current(owner,token)) return;await render({uid:owner,model,body:view.body,status:view.status,action,stillCurrent:()=>current(owner,token)});}
    if(current(owner,token)) labelText(view.status,'common.loaded');
  }
  document.getElementById('groups-btn').addEventListener('click',()=>{
    view.node.showModal();action(()=>Promise.resolve(),()=>browse());
  });
  onAccountChange(({user})=>{
    if((user?.uid || null)===uid) return;
    uid=user?.uid || null;version++;selectedId=null;model=null;view.body.replaceChildren();view.status.textContent='';
    if(!uid) signedOut(); else if(view.node.open) action(()=>Promise.resolve(),()=>browse());
  });
  async function linked() {
    const match=/^#\/session\/([A-Za-z0-9_-]{1,100})$/.exec(location.hash);if(!match) return;
    if(!view.node.open) view.node.showModal();
    if(uid) await action(()=>Promise.resolve(),()=>open(match[1]));else signedOut();
  }
  addEventListener('hashchange',()=>void linked());onAccountChange(({user})=>{if(user) void linked();});void linked();
}

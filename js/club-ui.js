import {mountEditMode,editOnly,guardEditor,mayLeaveEditor} from './ui/edit-mode.js';
import { getAccount, onAccountChange } from './auth-state.js';
import { t, onLanguageChange } from './i18n/i18n.js';
import { ACTIVITY_CATEGORIES } from './data/schema.js';
import { isManager } from './data/permissions.js';
import * as repository from './firebase/clubRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { openView, dialog, element, field, button, labelText, runAction, disclosure } from './ui/forms.js';
import { clubCard } from './ui/cards.js';
import { listLobby } from './firebase/lobbyRepository.js';
import { groupCard } from './ui/cards.js';
import { sessionURL, followSessionURL } from './data/group-session.js';
import { loadDisplayProfiles, searchDisplayProfiles } from './firebase/displayProfiles.js';
import {colorField} from './ui/palette.js';

const sections = new Set();
export function registerClubSection(render) { sections.add(render); }
export function initClubUI() {
  const view=dialog('clubs-dialog','clubs.title');
  let uid=null,version=0,selectedId=null,model=null,editing=false;
  let own=new Map(),directory=new Map(),ownCursor=null,directoryCursor=null,more=false;
  const current=(owner,token)=>uid===owner && getAccount()?.uid===owner && version===token;
  function action(fn,next=()=>selectedId?openClub(selectedId):browse()) {
    const owner=uid,token=version;
    return runAction(view.body,view.status,async()=>{
      await fn(owner);
      if(current(owner,token)) {labelText(view.status,'common.loaded');await next();}
    },dataErrorKey);
  }
  async function browse(loadMore=false) {
    if(!uid) {signedOut();return;}
    selectedId=null;editing=false;const owner=uid,token=++version;
    labelText(view.status,'common.loading');
    const page=await repository.listClubs(owner,loadMore?ownCursor:null,loadMore?directoryCursor:null);
    if(!current(owner,token)) return;
    if(!loadMore) {own=new Map();directory=new Map();}
    page.own.forEach(club=>own.set(club.id,club));page.directory.forEach(club=>directory.set(club.id,club));
    ownCursor=page.ownCursor;directoryCursor=page.directoryCursor;more=page.more;
    renderBrowse();labelText(view.status,page.partial?'data.unavailable':'common.loaded');
  }
  function signedOut() {view.body.replaceChildren(labelText(element('p'),'data.signIn'));}
  function renderBrowse() {
    editing=false;view.body.replaceChildren();
    if(!uid) {signedOut();return;}
    view.body.append(button('clubs.create',()=>edit(null),'club-create'),
      button('common.refresh',()=>action(()=>Promise.resolve(),()=>browse())));
    const lookup=element('form');lookup.id='club-lookup';
    field(lookup,'url','identity.clubLink',{required:true,max:1000,type:'url'});const open=button('ui.open');open.type='submit';lookup.append(open);
    lookup.addEventListener('submit',event=>{
      event.preventDefault();const value=new FormData(lookup).get('url');
      action(()=>{
        const url=new URL(value),base=new URL('./',document.baseURI);
        if(url.origin!==base.origin || url.pathname!==base.pathname || !/^#\/club\/[A-Za-z0-9_-]{1,100}$/.test(url.hash))
          throw Object.assign(new Error('invalid-input'),{code:'invalid-input'});
        selectedId=url.hash.split('/')[2];
      },()=>openClub(selectedId));
    });
    view.body.prepend(labelText(element('p','muted'),'clubs.intro'));
    view.body.append(disclosure('identity.clubLink',lookup),labelText(element('h3'),'clubs.mine'));
    if(!own.size) view.body.append(labelText(element('p'),'clubs.noMemberships'));
    const card=(club)=>{
      const node=clubCard(club,()=>action(()=>Promise.resolve(),()=>openClub(club.id)),{member:own.has(club.id)});node.dataset.clubId=club.id;return node;
    };
    own.forEach(club=>view.body.append(card(club)));
    view.body.append(labelText(element('h3'),'clubs.discover'));
    if(!directory.size) view.body.append(labelText(element('p'),'clubs.emptyDiscovery'));
    directory.forEach(club=>{if(!own.has(club.id)) view.body.append(card(club));});
    if(more) view.body.append(button('clubs.more',()=>action(()=>Promise.resolve(),()=>browse(true))));
  }
  function edit(club) {
    if(!mayLeaveEditor(view.body))return;editing=true;view.body.replaceChildren();delete view.body.dataset.editMode;
    const form=element('form');form.id='club-form';
    field(form,'name','clubs.name',{max:80,required:true,value:club?.name});
    field(form,'description','garage.description',{multiline:true,max:2000,value:club?.description});
    field(form,'category','garage.category',{choices:ACTIVITY_CATEGORIES,prefix:'category',value:club?.category || 'motorcycle'});
    field(form,'visibility','clubs.visibility',{choices:['public','unlisted','private'],prefix:'visibility',value:club?.visibility || 'public'});
    field(form,'membershipPolicy','clubs.policy',{choices:['open','approval','invite','private'],prefix:'policy',value:club?.membershipPolicy || 'open'});
    form.append(labelText(element('p','muted'),'clubs.policyHint'));
    colorField(form,'primaryColor','clubs.primary',{value:club?.primaryColor || '#263648'});
    colorField(form,'accentColor','clubs.accent',{value:club?.accentColor || '#ffd166'});
    const save=button('common.save');save.type='submit';form.append(save,button('common.cancel',()=>{if(mayLeaveEditor(view.body))return club?renderClub():renderBrowse();}));
    form.addEventListener('submit',event=>{
      event.preventDefault();const input={...club,...Object.fromEntries(new FormData(form)),routeColor:club?.routeColor || null,
        mapTheme:club?.mapTheme || 'normal',links:club?.links || {}};
      action(async owner=>{selectedId=club?club.id:await repository.createClub(owner,input);if(club) await repository.editClub(owner,club.id,input);},()=>openClub(selectedId));
    });view.body.append(form);guardEditor(view.body);
  }
  async function openClub(id) {
    const owner=uid,token=++version;selectedId=id;editing=false;
    labelText(view.status,'common.loading');view.body.replaceChildren();
    const loaded=await repository.loadClub(owner,id);
    if(!current(owner,token)) return;
    model=loaded;await renderClub();
  }
  async function renderClub() {
    if(!model || !uid) return;
    editing=false;const owner=uid,token=++version;const {club,role,membership,request,invite}=model;
    const identity=element('section');identity.id='club-identity';
    identity.append(element('h3','',club.name),labelText(element('p'),'category.'+club.category),element('p','club-description',club.description));
    view.body.replaceChildren(button('clubs.back',()=>action(()=>Promise.resolve(),()=>browse())),
      button('common.refresh',()=>action(()=>Promise.resolve())),identity,
      labelText(element('p'),'policy.'+club.membershipPolicy),
      labelText(element('p'),'clubs.memberCount',{count:club.memberCount}),
      button('identity.shareClub',async()=>{
        const url=new URL('./',document.baseURI);url.hash='/club/'+club.id;
        try {
          if(navigator.share) await navigator.share({title:club.name,url:url.href});
          else await navigator.clipboard.writeText(url.href);
          labelText(view.status,'identity.copied');
        } catch(error) {if(error.name!=='AbortError') labelText(view.status,'identity.copyFailed');}
      }));
    if(club.ownerUid) {
      const names=await loadDisplayProfiles(owner,[club.ownerUid]);if(!current(owner,token)) return;
      const ownerName=element('span','owner-name',names.get(club.ownerUid)?.displayName);
      if(!ownerName.textContent) labelText(ownerName,'identity.member');
      const ownerRow=element('p');ownerRow.append(labelText(element('span'),'role.owner'),': ',ownerName);view.body.append(ownerRow);
    }
    if(role) view.body.append(labelText(element('p'),'role.'+role));
    if(club.state==='archived') view.body.append(labelText(element('p'),'clubs.archived'));
    if(!membership && club.state==='active') {
      if(club.membershipPolicy==='open' || invite) view.body.append(button('clubs.join',()=>action(owner=>repository.joinClub(owner,club.id)),'club-join'));
      else if(club.membershipPolicy==='approval' && !request) view.body.append(button('clubs.request',()=>action(owner=>repository.requestMembership(owner,club.id)),'club-request'));
      else if(['invite','private'].includes(club.membershipPolicy)) view.body.append(labelText(element('p'),'clubs.inviteRequired'));
      if(request) {
        view.body.append(labelText(element('p'),'request.'+request.state));
        if(request.state!=='approved') view.body.append(button('clubs.cancelRequest',()=>action(owner=>repository.cancelRequest(owner,club.id))));
      }
    }
    if(membership && role!=='owner') view.body.append(button('clubs.leave',()=>{
      if(confirm(t('clubs.leaveConfirm'))) action(owner=>repository.removeMember(owner,club.id),()=>browse());
    },'club-leave'));
    if(role==='owner') {
      view.body.append(editOnly(button('edit.general',()=>edit(club),'club-general-edit')),editOnly(labelText(element('p','muted'),'clubs.ownerPolicy')));
      if(club.state==='active') view.body.append(editOnly(button('clubs.archive',()=>{if(confirm(t('clubs.archiveConfirm'))) action(owner=>repository.archiveClub(owner,club.id));})));
      else if(club.memberCount===1) view.body.append(editOnly(labelText(element('p','muted'),'clubs.retirementHint')),editOnly(button('clubs.delete',()=>{
        if(confirm(t('clubs.deleteConfirm',{name:club.name}))) action(owner=>repository.deleteClub(owner,club.id),()=>browse());
      })));
      else view.body.append(editOnly(labelText(element('p'),'clubs.deleteBlocked')));
    }
    if(isManager(role) && club.state==='active') {
      const admin=editOnly(element('section','feature-card'));admin.id='club-admission';
      admin.append(labelText(element('h3'),'clubs.admission'));
      const inviteForm=element('form');inviteForm.id='club-invite';
      const search=element('form');search.id='club-invite-search';
      field(search,'name','identity.searchName',{required:true,max:64});
      const find=button('identity.search');find.type='submit';search.append(find);
      const recipient=field(inviteForm,'recipient','identity.recipient',{required:true,choices:[]});
      search.addEventListener('submit',event=>{
        event.preventDefault();const name=new FormData(search).get('name');
        action(async owner=>{
          const people=await searchDisplayProfiles(owner,name);if(!current(owner,token)) return;
          recipient.replaceChildren();
          for(const person of people.filter(person=>person.uid!==owner)) {
            const option=element('option','',person.displayName);option.value=person.uid;recipient.append(option);
          }
        },()=>labelText(view.status,recipient.children.length?'common.loaded':'identity.notFound')).then(()=>{
          if(current(owner,token)) inviteButton.disabled=!recipient.children.length;
        });
      });
      const inviteButton=button('identity.invite');inviteButton.type='submit';inviteButton.disabled=true;inviteForm.append(inviteButton);
      inviteForm.addEventListener('submit',event=>{
        event.preventDefault();const target=new FormData(inviteForm).get('recipient');
        action(owner=>repository.inviteMember(owner,club.id,target));
      });
      admin.append(disclosure('identity.invite',labelText(element('p','muted'),'discover.searchHint'),search,inviteForm,labelText(element('p','muted'),'identity.inviteHint')));view.body.append(admin);
      let cursor=null;
      async function requests() {
        const page=await repository.listClubRecords(owner,club.id,'joinRequests',cursor);
        const names=await loadDisplayProfiles(owner,page.records.map(row=>row.uid));
        if(!current(owner,token)) return;
        page.records.forEach(row=>{
          const card=element('div','feature-card');card.dataset.requestUid=row.uid;
          const name=element('p','',names.get(row.uid)?.displayName);if(!name.textContent) labelText(name,'identity.member');
          card.append(name,button('clubs.approve',()=>action(owner=>repository.decideRequest(owner,club.id,row.uid,true))),
            button('clubs.reject',()=>action(owner=>repository.decideRequest(owner,club.id,row.uid,false))));admin.append(card);
        });cursor=page.cursor;
        if(page.more) {const next=button('clubs.more',()=>{next.remove();requests().catch(error=>labelText(view.status,dataErrorKey(error)));});admin.append(next);}
      }
      await requests();
    }
    const activities=element('section','home-section');activities.id='club-upcoming';
    activities.append(labelText(element('h3'),'clubs.upcoming'));
    view.body.append(activities);
    try {
      const upcoming=await listLobby(owner,{clubId:club.id});if(!current(owner,token))return;
      for(const event of upcoming.events.slice(0,3)) activities.append(groupCard(event,()=>followSessionURL(sessionURL(event.id))));
      if(!upcoming.events.length) activities.append(labelText(element('p','muted'),'lobby.empty'));
    } catch(error) {if(current(owner,token)) activities.append(labelText(element('p','feature-status'),dataErrorKey(error)));}
    for(const render of sections) {
      if(!current(owner,token)) return;
      await render({uid:owner,model,body:view.body,status:view.status,action,stillCurrent:()=>current(owner,token)});
    }
    if(current(owner,token)){mountEditMode(view.body,{allowed:isManager(role),id:'club-edit'});labelText(view.status,'common.loaded');}
  }
  document.getElementById('clubs-btn').addEventListener('click',()=>{
    openView(view.node);if(uid) action(()=>Promise.resolve(),()=>browse());else signedOut();
  });
  onAccountChange(({user})=>{
    if((user?.uid || null)===uid) return;
    uid=user?.uid || null;++version;selectedId=null;model=null;editing=false;own.clear();directory.clear();
    view.body.replaceChildren();view.status.textContent='';signedOut();
    if(uid && view.node.open) browse().catch(error=>labelText(view.status,dataErrorKey(error)));
  });
  onLanguageChange(()=>{if(!editing && !selectedId) renderBrowse();});
  async function openLinkedClub() {
    const match=/^#\/club\/([A-Za-z0-9_-]{1,100})$/.exec(location.hash);
    if(!match) return;
    openView(view.node);
    if(uid) await action(()=>Promise.resolve(),()=>openClub(match[1]));
    else signedOut();
  }
  addEventListener('hashchange',()=>void openLinkedClub());
  onAccountChange(({user})=>{if(user) void openLinkedClub();});
  void openLinkedClub();
}

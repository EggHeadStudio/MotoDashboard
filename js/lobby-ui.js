import { getAccount, onAccountChange } from './auth-state.js';
import { CATEGORIES } from './data/schema.js';
import { ACTIVITIES, sessionURL, followSessionURL } from './data/group-session.js';
import { formatGroupTime } from './group-ui.js';
import { listLobby, findLobbyClubs } from './firebase/lobbyRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { dialog, element, field, labelText, button, runAction } from './ui/forms.js';

export function initLobbyUI() {
  const view=dialog('lobby-dialog','lobby.title');let uid=null,version=0,busy=false,input={},cursor=null;
  const current=(owner,token)=>uid===owner && getAccount()?.uid===owner && token===version;
  function action(fn) {
    if(busy) return;busy=true;
    return runAction(view.body,view.status,fn,dataErrorKey).finally(()=>{busy=false;});
  }
  function render() {
    view.body.replaceChildren();if(!uid) {view.body.append(labelText(element('p'),'data.signIn'));return;}
    const form=element('form');form.id='lobby-filter';
    for(const [name,key,choices,prefix] of [['activityType','groups.activity',ACTIVITIES,'activity'],['category','garage.category',CATEGORIES,'category']]) {
      const select=field(form,name,key,{choices:[],value:input[name]});
      const all=labelText(element('option'),'lobby.all');all.value='';select.append(all);
      for(const choice of choices) {const option=labelText(element('option'),prefix+'.'+choice);option.value=choice;select.append(option);}
      select.value=input[name] || '';
    }
    field(form,'date','lobby.date',{type:'date',value:input.date});field(form,'meetingArea','groups.area',{max:80,value:input.meetingArea});
    const club=field(form,'clubId','clubs.title',{choices:[]});const all=labelText(element('option'),'lobby.all');all.value='';club.append(all);
    const search=element('form');search.id='lobby-club-search';field(search,'name','clubs.name',{max:80,required:true});
    const find=button('lobby.findClub');find.type='submit';search.append(find);
    search.addEventListener('submit',event=>{
      event.preventDefault();const name=new FormData(search).get('name'),owner=uid,token=version;
      action(async()=>{
        const matches=await findLobbyClubs(owner,name);if(!current(owner,token)) return;
        club.replaceChildren(all);
        for(const match of matches) {const option=element('option','',match.name);option.value=match.id;club.append(option);}
        labelText(view.status,matches.length?'common.loaded':'identity.notFound');
      });
    });
    const filter=button('lobby.filter');filter.type='submit';form.append(filter);
    const results=element('section');results.id='lobby-results';
    view.body.append(form,search,labelText(element('p','muted'),'lobby.areaHint'),results);
    form.addEventListener('submit',event=>{event.preventDefault();input=Object.fromEntries(new FormData(form));cursor=null;action(()=>load(false));});
  }
  async function load(more=false) {
    const owner=uid,token=++version;if(!owner) return;
    const page=await listLobby(owner,input,more?cursor:null);if(!current(owner,token)) return;
    const results=document.getElementById('lobby-results');if(!results) return;
    if(!more) results.replaceChildren();cursor=page.cursor;
    if(!page.events.length && !more) results.append(labelText(element('p'),'lobby.empty'));
    for(const event of page.events) {
      const card=element('article','feature-card');card.dataset.lobbyId=event.id;
      card.append(element('h3','',event.title),labelText(element('p'),'activity.'+event.activityType),
        labelText(element('p'),'category.'+event.category),element('p','',event.meetingArea),
        element('p','',formatGroupTime(event.startsAt)),element('p','',event.clubName || event.hostName),
        labelText(element('p'),'groups.count',{count:event.participantCount}),labelText(element('p'),'policy.'+event.joiningPolicy),
        labelText(element('p'),event.maxParticipants && event.participantCount>=event.maxParticipants?'lobby.full':'lobby.available'),
        button('ui.open',()=>{view.node.close();followSessionURL(sessionURL(event.id));}));results.append(card);
    }
    if(page.more) {const next=button('clubs.more',()=>action(()=>{next.remove();return load(true);}));results.append(next);}
    labelText(view.status,'common.loaded');
  }
  document.getElementById('lobby-btn').addEventListener('click',()=>{
    view.node.showModal();input={};cursor=null;version++;render();if(uid) action(()=>load());
  });
  onAccountChange(({user})=>{
    if((user?.uid || null)===uid) return;uid=user?.uid || null;version++;input={};cursor=null;view.status.textContent='';render();
    if(uid && view.node.open) action(()=>load());
  });
}

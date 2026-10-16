import { getAccount, onAccountChange } from './auth-state.js';
import { ACTIVITY_CATEGORIES } from './data/schema.js';
import { ACTIVITIES, sessionURL, followSessionURL } from './data/group-session.js';
import { listLobby, findLobbyClubs, listPublicClubs } from './firebase/lobbyRepository.js';
import { dataErrorKey } from './firebase/access.js';
import { openView, dialog, element, field, labelText, button, runAction, disclosure } from './ui/forms.js';
import { groupCard, clubCard, skeletons, emptyState } from './ui/cards.js';
import { vehicleIcon } from './ui/icons.js';
import {createPeopleDiscovery} from './ui/people.js';
import {t} from './i18n/i18n.js';

const chips=['open','motorcycle','car','off-road','bicycle','snowmobile','caravan','other'];
export function initLobbyUI() {
  const view=dialog('lobby-dialog','nav.discover');let uid=null,version=0,busy=false,pending=false,input={},cursor=null,tab='featured';
  const people=createPeopleDiscovery(view,()=>tab==='people' && view.node.open);
  const current=(owner,token)=>uid===owner && getAccount()?.uid===owner && token===version;
  function action(fn) {
    if(busy) {pending=true;return;}busy=true;
    return runAction(view.body,view.status,fn,dataErrorKey).finally(()=>{
      busy=false;if(pending){pending=false;render();if(uid) action(()=>load());}
    });
  }
  function render() {
    view.body.replaceChildren(labelText(element('p','muted discovery-intro'),'ux.searchHint'));
    if(!uid) {view.body.append(emptyState('home.signIn','discover.intro'),button('auth.open',()=>document.getElementById('account-btn').click()));return;}
    const categories=element('div','chip-row');
    const all=button('lobby.all',()=>chooseCategory(''));all.setAttribute('aria-pressed',String(!input.category));categories.append(all);
    for(const category of chips) {
      const node=element('button');node.type='button';node.append(vehicleIcon(category),labelText(element('span'),'discover.'+category));node.classList.add('category-chip');
      node.setAttribute('aria-pressed',String(input.category===category));node.addEventListener('click',()=>chooseCategory(category));categories.append(node);
    }
    const tabs=element('nav','discovery-tabs');tabs.setAttribute('aria-label',t('nav.discover'));tabs.setAttribute('data-i18n-aria-label','nav.discover');
    for(const name of ['featured','rides','meets','events','clubs','people']) {
      const node=button(name==='featured'?'ux.explore':'discover.'+name,()=>{tab=name;input.activityType=name==='meets'?'meet':name==='events'?'event':'';cursor=null;render();action(()=>load());});
      node.dataset.discoveryTab=name;
      node.setAttribute('aria-pressed',String(tab===name));tabs.append(node);
    }
    view.body.append(tabs);
    if(tab==='people'){people.mount(view.body);return;}
    view.body.append(categories);if(tab!=='clubs') renderFilters();
    const results=element('section','card-grid');results.id='lobby-results';view.body.append(results);
  }
  function chooseCategory(category) {input.category=category;cursor=null;render();action(()=>load());}
  function renderFilters() {
    const form=element('form');form.id='lobby-filter';
    for(const [name,key,choices,prefix] of [['activityType','groups.activity',ACTIVITIES,'activity'],['category','garage.category',ACTIVITY_CATEGORIES,'category']]) {
      const select=field(form,name,key,{choices:[]});
      const all=labelText(element('option'),'lobby.all');all.value='';select.append(all);
      for(const choice of choices) {const option=labelText(element('option'),prefix+'.'+choice);option.value=choice;select.append(option);}
      select.value=input[name] || '';
    }
    field(form,'date','lobby.date',{type:'date',value:input.date});field(form,'meetingArea','groups.area',{max:80,value:input.meetingArea});
    const club=field(form,'clubId','clubs.title',{choices:[]});const all=labelText(element('option'),'lobby.all');all.value='';club.append(all);
    if(input.clubId) {const selected=element('option','',input.clubName || '');selected.value=input.clubId;club.append(selected);club.value=input.clubId;}
    const search=element('form');search.id='lobby-club-search';field(search,'name','clubs.name',{max:80,required:true});
    const find=button('lobby.findClub');find.type='submit';search.append(find);
    search.addEventListener('submit',event=>{
      event.preventDefault();const name=new FormData(search).get('name'),owner=uid,token=version;
      action(async()=>{
        const matches=await findLobbyClubs(owner,name);if(!current(owner,token)) return;club.replaceChildren(all);
        for(const match of matches) {const option=element('option','',match.name);option.value=match.id;club.append(option);}
        labelText(view.status,matches.length?'common.loaded':'identity.notFound');
      });
    });
    const filter=button('lobby.filter');filter.type='submit';form.append(filter);
    view.body.append(disclosure('discover.filters',form,search,labelText(element('p','muted'),'lobby.areaHint')));
    form.addEventListener('submit',event=>{
      event.preventDefault();input=Object.fromEntries(new FormData(form));input.clubName=club.selectedOptions[0]?.textContent || '';cursor=null;
      action(()=>load(false));
    });
  }
  async function load(more=false) {
    if(tab==='people'){view.status.textContent='';return;}
    const owner=uid,token=++version;if(!owner) return;
    const results=document.getElementById('lobby-results');if(!results)return;if(!more) skeletons(results);
    try {
      const queryInput={...input};if(tab==='rides'&&!queryInput.activityType) queryInput.activityTypes=['ride','drive'];
      const page=tab==='clubs'?await listPublicClubs(owner,queryInput,more?cursor:null):await listLobby(owner,queryInput,more?cursor:null);
      if(!current(owner,token)) return;if(!more) results.replaceChildren();cursor=page.cursor;
      const rows=page.clubs || page.events;
      if(!rows.length&&!more) results.append(emptyState(tab==='clubs'?'discover.clubEmpty':'discover.emptyTitle'));
      rows.forEach((row,index)=>{
        const open=()=>tab==='clubs' ? (location.hash='/club/'+row.id) : followSessionURL(sessionURL(row.id));
        const card=tab==='clubs'?clubCard(row,open):groupCard(row,open,{featured:!more&&index===0});
        card.dataset[tab==='clubs'?'clubId':'lobbyId']=row.id;results.append(card);
      });
      if(page.more) {const next=button('clubs.more',()=>action(()=>{next.remove();return load(true);}));results.append(next);}
      labelText(view.status,page.partial?'home.partial':'common.loaded');
    } catch(error) {if(current(owner,token)&&!more) results.replaceChildren(button('common.refresh',()=>action(()=>load(false)),'lobby-retry'));throw error;}
  }
  document.getElementById('lobby-btn').addEventListener('click',()=>{
    openView(view.node);input={};cursor=null;tab='featured';version++;render();if(uid) action(()=>load());
  });
  onAccountChange(({user})=>{
    if((user?.uid || null)===uid) return;uid=user?.uid || null;version++;input={};cursor=null;view.status.textContent='';render();
    if(uid && view.node.open) action(()=>load());
  });
}

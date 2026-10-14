import {getAccount} from '../auth-state.js';
import {searchPublicPeople,normalizedPeoplePrefix} from '../firebase/profileDirectory.js';
import {profileURL} from '../data/public-profile.js';
import {dataErrorMessage} from '../firebase/access.js';
import {element,labelText,button,field} from './forms.js';
import {setLocalizedText} from '../i18n/i18n.js';

export function createPeopleDiscovery(view,isVisible) {
  let epoch=0,owner=null,term='',cursor=null,pages=0,rows=[],busy=false,lastSearch=0;
  let root,results,form,status;
  const current=(token,uid)=>token===epoch && getAccount()?.uid===uid && isVisible() && root?.isConnected;
  function cards(more) {
    results.replaceChildren();
    for(const person of rows) {
      const card=element('article','feature-card person-card');card.dataset.profileId=person.id;
      const avatar=element('span','member-avatar',person.displayName.trim().slice(0,2).toLocaleUpperCase());avatar.setAttribute('aria-hidden','true');
      const info=element('div','vehicle-info');info.append(element('h3','',person.displayName));
      if(person.category)info.append(labelText(element('p','muted'),'category.'+person.category));
      const link=labelText(element('a','text-button'),'publicProfile.view');link.href=profileURL(person.id);info.append(link);
      card.append(avatar,info);results.append(card);
    }
    if(!rows.length)results.append(labelText(element('p','muted'),'people.empty'));
    if(more && pages<5)results.append(button('clubs.more',()=>void load(true),'people-more'));
    else if(more)results.append(labelText(element('p','muted'),'people.refine'));
  }
  async function load(more=false) {
    if(busy)return;
    const uid=getAccount()?.uid;if(!uid)return;
    let nextTerm;
    try {nextTerm=normalizedPeoplePrefix(form.elements.name.value);}
    catch {labelText(status,'people.prefixHint');return;}
    if(more && nextTerm!==term)more=false;
    term=nextTerm;
    if(!more && Date.now()-lastSearch<500)return;
    lastSearch=Date.now();busy=true;
    const token=++epoch;root.setAttribute('aria-busy','true');
    form.querySelector('button').disabled=true;labelText(status,'common.loading');
    if(!more){cursor=null;pages=0;rows=[];results.replaceChildren();}
    document.getElementById('people-more')?.setAttribute('disabled','');
    try {
      const page=await searchPublicPeople(uid,term,more?cursor:null);
      if(!current(token,uid))return;
      cursor=page.cursor;pages++;
      const seen=new Set(rows.map(row=>row.id));rows.push(...page.people.filter(row=>!seen.has(row.id)));
      cards(page.more);labelText(status,'common.loaded');
    }catch(error) {
      if(!current(token,uid))return;
      setLocalizedText(status,()=>dataErrorMessage(error));
      const retry=button('common.refresh',()=>{retry.remove();void load(more);},'people-retry');results.append(retry);
    }finally {
      if(current(token,uid)){busy=false;root.setAttribute('aria-busy','false');form.querySelector('button').disabled=false;
        document.getElementById('people-more')?.removeAttribute('disabled');}
    }
  }
  return {mount(container) {
    epoch++;busy=false;cursor=null;pages=0;rows=[];
    const uid=getAccount()?.uid;if(owner!==uid){owner=uid;term='';lastSearch=0;}
    root=element('section','people-discovery');root.id='people-discovery';
    form=element('form');form.id='people-search';
    const input=field(form,'name','people.search',{required:true,max:64,value:term});input.minLength=2;input.autocomplete='off';input.type='search';
    const submit=button('people.find');submit.type='submit';form.append(submit);
    status=element('p','feature-status');status.setAttribute('role','status');
    results=element('section','card-grid');results.id='people-results';
    root.append(labelText(element('p','muted'),'people.hint'),form,status,results);container.append(root);
    form.addEventListener('submit',event=>{event.preventDefault();void load();});
  }};
}

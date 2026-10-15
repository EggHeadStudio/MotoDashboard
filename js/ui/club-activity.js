import {registerClubSection} from '../club-ui.js';
import {registerGroupSection} from '../group-ui.js';
import {listMyClubs} from '../firebase/clubRepository.js';
import {getAccount} from '../auth-state.js';
import {activityRequest,activityError} from '../community/activity-client.js';
import {element,labelText,button,field,dialog,openView,disclosure} from './forms.js';
import {guardEditor,acceptEdits,editOnly} from './edit-mode.js';
import {formatDate,formatDuration,formatDistanceKm} from '../utils.js';
import {t} from '../i18n/i18n.js';
import {renderActivityStats} from './activity-stats.js';
import {ensureActivityEpoch} from '../firebase/activityEpoch.js';

export function contributionButton(root,{sourceType='ride',sourceId,clubId=null,session=null}){
  if(!getAccount()||session&&session.ownerUid!==getAccount()?.uid)return;
  root.append(button(sourceType==='group'?'activity.groupContribution':'activity.contribute',()=>void contributionEditor({sourceType,sourceId,clubId,session})));
}
async function contributionEditor({sourceType,sourceId,clubId,session}){
  const owner=getAccount()?.uid;if(!owner)return;
  const view=dialog('activity-contribution','activity.contribute');openView(view.node);view.node.addEventListener('close',()=>view.node.remove(),{once:true});
  if(session&&(session.syncAction||!session.remoteRevisionId)){labelText(view.status,'activity.pending');return;}
  labelText(view.status,'common.loading');
  try{
    const page=await listMyClubs(owner);if(owner!==getAccount()?.uid||!view.node.open)return;
    const clubs=page.clubs.filter(club=>club.state==='active'&&(!clubId||club.id===clubId));
    const form=element('form');form.id='activity-contribution-form';
    const club=field(form,'club','publicProfile.club',{choices:[],required:true});
    for(const item of clubs){const option=element('option','',item.name);option.value=item.id;club.append(option);}
    const selected=clubId || session?.ridingIdentity?.clubId;if(clubs.some(row=>row.id===selected))club.value=selected;
    const audience=field(form,'audience','activity.visibility',{choices:['private','roles','members','public'],prefix:'activity',value:'private'});
    const consent=field(form,'consent','activity.consent',{type:'checkbox',required:true});
    const publicConsent=field(form,'publicConsent','activity.publicConsent',{type:'checkbox'});
    publicConsent.parentElement.hidden=true;
    audience.addEventListener('change',()=>{publicConsent.parentElement.hidden=audience.value!=='public';publicConsent.required=audience.value==='public';publicConsent.checked=false;});
    form.append(labelText(element('p','muted'),'activity.summaryOnly'));const save=button('common.save');save.type='submit';save.disabled=!clubs.length;form.append(save,button('common.cancel',()=>view.node.close()));
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!form.reportValidity()||!consent.checked)return;save.disabled=true;labelText(view.status,'common.loading');
      try{await ensureActivityEpoch(owner);const current=await activityRequest(club.value);await activityRequest(club.value,{method:'POST',revision:current.revision,
        body:{sourceType,sourceId,audience:audience.value,consent:true,publicConsent:publicConsent.checked}});
        if(owner===getAccount()?.uid){acceptEdits(view.body);view.node.close();dispatchEvent(new Event('motodash-activity-updated'));}
      }catch(error){if(owner===getAccount()?.uid&&view.node.open)labelText(view.status,activityError(error));}finally{save.disabled=false;}
    });view.body.append(form);guardEditor(view.body);view.status.textContent='';
    let generation=0;
    async function defaults(){
      const token=++generation;consent.checked=publicConsent.checked=false;audience.disabled=true;save.disabled=true;
      try{const data=await activityRequest(club.value);if(token!==generation||owner!==getAccount()?.uid||!view.node.open)return;
        audience.value=data.defaultAudience;publicConsent.parentElement.hidden=audience.value!=='public';publicConsent.required=audience.value==='public';acceptEdits(form);
      }catch(error){if(token===generation&&view.node.open)labelText(view.status,activityError(error));}
      finally{if(token===generation){audience.disabled=false;save.disabled=!clubs.length;}}
    }
    club.addEventListener('change',()=>void defaults());if(clubs.length)void defaults();
    if(!clubs.length)labelText(view.status,'clubs.noMemberships');
  }catch(error){if(owner===getAccount()?.uid&&view.node.open)labelText(view.status,activityError(error));}
}
export function initClubActivity(){
  registerClubSection(async({model,body,stillCurrent})=>{
    const root=element('section','feature-card');root.id='club-activity';const list=element('div'),status=element('p','feature-status');status.setAttribute('role','status');
    const statistics=element('div');statistics.id='club-activity-stats';
    const details=disclosure('activity.title',status,statistics,list);root.append(details);body.append(root);
    let loaded=false,busy=false;
    async function load(cursor=null){
      if(busy)return;busy=true;labelText(status,'common.loading');
      try{const data=await activityRequest(model.club.id,{cursor});if(!stillCurrent()||!root.isConnected)return;
        if(!cursor)list.replaceChildren();
        renderActivityStats(statistics,data);list.querySelector('[data-activity-pagination]')?.remove();
        if(!cursor&&data.canManage&&model.role==='owner'){
          const form=editOnly(element('form','activity-policy'));form.id='activity-policy';
          const policy=field(form,'defaultAudience','activity.default',{choices:['private','roles','members','public'],prefix:'activity',value:data.defaultAudience});
          if(model.club.visibility!=='public')policy.querySelector('option[value=public]').disabled=true;
          const save=button('common.save');save.type='submit';form.append(save,button('common.cancel',()=>{policy.value=data.defaultAudience;acceptEdits(form);}));
          form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;
            try{await activityRequest(model.club.id,{method:'PUT',revision:data.revision,body:{defaultAudience:policy.value}});acceptEdits(form);await load();}
            catch(error){if(stillCurrent())labelText(status,activityError(error));}finally{save.disabled=false;}
          });list.append(form);
        }
        for(const entry of data.entries){
          const card=element('article','activity-card');card.append(element('h4','',entry.title || entry.displayName),element('p','',entry.displayName),
            labelText(element('span','badge'),entry.type==='ride'?'activity.ride':entry.type==='group'?'activity.ride':'activity.'+entry.type),
            element('p','',formatDate(entry.startedAt)),element('p','',[entry.clubName,entry.rankName].filter(Boolean).join(' · ')),labelText(element('p','muted'),'activity.'+entry.audience));
          if(entry.type==='ride')card.append(element('p','',formatDistanceKm(entry.distanceMeters)+' km · '+formatDuration(entry.durationMs)));
          if(entry.category)card.append(labelText(element('span','category-chip'),'category.'+entry.category));
          if(entry.own)card.append(button('activity.remove',async()=>{if(!confirm(t('media.deleteConfirm')))return;
            try{await activityRequest(model.club.id,{method:'DELETE',entryId:entry.id,revision:data.revision});await load();}
            catch(error){if(stillCurrent())labelText(status,activityError(error));}}));list.append(card);
        }
        if(!data.entries.length&&!cursor)list.append(labelText(element('p','muted'),'activity.empty'));
        const pagination=element('div','feature-actions');pagination.dataset.activityPagination='';
        if(data.next){const more=button('clubs.more',()=>{more.remove();void load(data.next);});pagination.append(more);}
        const refresh=button('activity.refresh',()=>void load());pagination.append(refresh);list.append(pagination);status.textContent='';loaded=true;
      }catch(error){if(stillCurrent()&&root.isConnected)labelText(status,activityError(error));}finally{busy=false;}
    }
    details.addEventListener('toggle',()=>{if(details.open&&!loaded)void load();});
  });
  registerGroupSection(async({model,body})=>{
    if(model.group.state==='completed'&&model.participant&&model.group.clubId)contributionButton(body,{sourceType:'group',sourceId:model.group.id,clubId:model.group.clubId});
  });
}

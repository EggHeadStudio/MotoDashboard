import { registerGroupSection } from './group-ui.js';
import * as repository from './firebase/groupRepository.js';
import { loadGarage } from './firebase/garageRepository.js';
import { loadDisplayProfiles, searchDisplayProfiles } from './firebase/displayProfiles.js';
import { selectedVehicle } from './garage-ui.js';
import { element, labelText, field, button } from './ui/forms.js';
import { t } from './i18n/i18n.js';
import { dataErrorKey } from './firebase/access.js';

export function initGroupParticipantsUI() {
  registerGroupSection(async ({uid,model,body,status,action,stillCurrent})=>{
    const {group,participant,manager,request,invite,banned}=model,id=group.id;
    const active=['scheduled','active'].includes(group.state);
    if(!banned && active) {
      const garage=await loadGarage(uid);if(!stillCurrent()) return;
      const form=element('form');form.id='group-vehicle';
      const input=field(form,'vehicleId','groups.vehicle',{choices:[]});
      const none=labelText(element('option'),'groups.noVehicle');none.value='';input.append(none);
      for(const vehicle of garage.vehicles) {
        const option=element('option','',vehicle.nickname+' · '+t('category.'+vehicle.category));option.value=vehicle.id;input.append(option);
      }
      input.value=participant?.vehicleId || selectedVehicle()?.id || '';
      const admitted=group.joiningPolicy==='open' || (request?.state==='approved') || (invite && (invite.expiresAt.toMillis?.() ?? invite.expiresAt.seconds*1000)>Date.now());
      if(participant || admitted) {
        const join=button(participant?'common.save':'groups.join');join.type='submit';join.id='group-join';form.append(join);
        form.addEventListener('submit',event=>{
          event.preventDefault();const vehicleId=input.value || null;
          action(owner=>participant?repository.selectGroupVehicle(owner,id,vehicleId):repository.joinGroup(owner,id,vehicleId));
        });body.append(form,labelText(element('p','muted'),'groups.vehicleConsent'));
      }
      if(!participant && group.joiningPolicy==='approval' && !request) body.append(button('groups.request',()=>action(owner=>repository.requestGroup(owner,id)),'group-request'));
      if(!participant && request) body.append(labelText(element('p'),'request.'+request.state),
        button('clubs.cancelRequest',()=>action(owner=>repository.clearGroupRecord(owner,id,'joinRequests'))));
      if(!participant && invite) body.append(button('groups.rejectInvite',()=>action(owner=>repository.clearGroupRecord(owner,id,'invites')),'group-reject-invite'));
      if(!participant && group.joiningPolicy==='invite' && !invite) body.append(labelText(element('p'),'clubs.inviteRequired'));
    }
    if(banned) body.append(labelText(element('p'),'groups.removed'));
    if(participant && group.creatorUid!==uid) body.append(button('groups.leave',()=>{
      if(confirm(t('groups.leaveConfirm'))) action(owner=>repository.leaveGroup(owner,id),()=>{location.hash='';document.getElementById('groups-dialog').close();});
    },'group-leave'));
    else if(participant) body.append(labelText(element('p','muted'),'groups.founder'));
    if(participant || manager) {
      const roster=element('section');roster.id='group-participants';roster.append(labelText(element('h3'),'groups.participants'));body.append(roster);
      async function members(cursor=null) {
        const page=await repository.listGroupRecords(uid,id,'participants',cursor);
        const names=await loadDisplayProfiles(uid,page.records.map(row=>row.uid));if(!stillCurrent()) return;
        for(const member of page.records) {
          const card=element('article','feature-card');card.dataset.participantUid=member.uid;
          const name=element('strong','participant-name',names.get(member.uid)?.displayName);if(!name.textContent) labelText(name,'identity.member');
          const avatar=element('span','profile-avatar','●');avatar.setAttribute('aria-hidden','true');
          const row=element('div','member-identity');row.append(avatar,name);card.append(row);
          if(member.vehicle) card.append(element('p','',member.vehicle.nickname),labelText(element('p'),'category.'+member.vehicle.category));
          card.append(labelText(element('p'),'riderStatus.'+member.status));
          if(manager && member.uid!==group.creatorUid && member.uid!==uid) card.append(button('members.remove',()=>{
            if(confirm(t('members.removeConfirm'))) action(owner=>repository.removeGroupParticipant(owner,id,member.uid));
          }));roster.append(card);
        }
        if(page.more) {const more=button('clubs.more',()=>{more.remove();members(page.cursor).catch(error=>labelText(status,dataErrorKey(error)));});roster.append(more);}
      }
      await members();
    }
    if(manager && active) {
      const admission=element('section','feature-card');admission.id='group-admission';body.append(admission);
      admission.append(labelText(element('h3'),'clubs.admission'));
      const search=element('form');search.id='group-invite-search';field(search,'name','identity.searchName',{required:true,max:64});
      const find=button('identity.search');find.type='submit';search.append(find);
      const form=element('form');form.id='group-invite';const recipient=field(form,'recipient','identity.recipient',{required:true,choices:[]});
      const send=button('identity.invite');send.type='submit';form.append(send);
      search.addEventListener('submit',event=>{
        event.preventDefault();const value=new FormData(search).get('name');
        action(async owner=>{
          const people=await searchDisplayProfiles(owner,value);if(!stillCurrent()) return;recipient.replaceChildren();
          for(const person of people.filter(person=>person.uid!==owner)) {const option=element('option','',person.displayName);option.value=person.uid;recipient.append(option);}
        },()=>labelText(status,recipient.children.length?'common.loaded':'identity.notFound'));
      });
      form.addEventListener('submit',event=>{event.preventDefault();const target=recipient.value;action(owner=>repository.inviteGroup(owner,id,target));});
      admission.append(search,form);
      async function requests(cursor=null) {
        const page=await repository.listGroupRecords(uid,id,'joinRequests',cursor);
        const names=await loadDisplayProfiles(uid,page.records.map(row=>row.uid));if(!stillCurrent()) return;
        for(const request of page.records.filter(row=>row.state==='pending')) {
          const row=element('div','feature-card');row.dataset.groupRequestUid=request.uid;
          const name=element('p','',names.get(request.uid)?.displayName);if(!name.textContent) labelText(name,'identity.member');
          row.append(name,button('clubs.approve',()=>action(owner=>repository.decideGroupRequest(owner,id,request.uid,true))),
            button('clubs.reject',()=>action(owner=>repository.decideGroupRequest(owner,id,request.uid,false))));admission.append(row);
        }
        if(page.more) {const more=button('clubs.more',()=>{more.remove();requests(page.cursor).catch(error=>labelText(status,dataErrorKey(error)));});admission.append(more);}
      }
      await requests();
    }
  });
}

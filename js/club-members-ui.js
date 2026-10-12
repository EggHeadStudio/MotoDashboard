import { registerClubSection } from './club-ui.js';
import { listClubRecords, setMember, saveRank, deleteRank, removeMember, getRank } from './firebase/clubRepository.js';
import { isManager, canManageMember, canAssignRank } from './data/permissions.js';
import { t } from './i18n/i18n.js';
import { element, button, field, labelText, disclosure } from './ui/forms.js';
import { dataErrorKey } from './firebase/access.js';
import { loadDisplayProfiles } from './firebase/displayProfiles.js';

export function initClubMembersUI() {
  registerClubSection(async ({uid,model,body,status,action,stillCurrent})=>{
    const {club,role}=model;if(!role) return;
    const section=element('section','feature-card');section.id='club-members';
    section.append(labelText(element('h3'),'members.title'),disclosure('ui.details',labelText(element('p','muted'),'members.rankHint')));
    body.append(section);
    let ranks=[],rankCursor=null,memberCursor=null;
    const rankList=element('div'),memberList=element('div');
    section.append(labelText(element('h4'),'members.ranks'),rankList,labelText(element('h4'),'members.people'),memberList);
    function rankForm(rank) {
      const form=element('form');form.id='rank-form';
      field(form,'name','members.rankName',{max:64,required:true,value:rank?.name});
      field(form,'displayOrder','members.order',{type:'number',min:0,maxValue:999,value:rank?.displayOrder ?? 0});
      const save=button('common.save');save.type='submit';form.append(save);
      form.addEventListener('submit',event=>{event.preventDefault();const input=Object.fromEntries(new FormData(form));action(owner=>saveRank(owner,club.id,rank?.id,input));});
      rankList.replaceChildren(form);
    }
    async function loadRanks() {
      const page=await listClubRecords(uid,club.id,'ranks',rankCursor);if(!stillCurrent()) return;
      ranks=[...new Map([...ranks,...page.records].map(rank=>[rank.id,rank])).values()];
      ranks.sort((a,b)=>a.displayOrder-b.displayOrder || a.name.localeCompare(b.name));
      rankCursor=page.cursor;
      rankList.replaceChildren();
      if(isManager(role)) rankList.append(button('members.addRank',()=>rankForm(null),'rank-add'));
      if(!ranks.length) rankList.append(labelText(element('p'),'members.noRanks'));
      for(const rank of ranks) {
        const row=element('div','feature-actions');row.dataset.rankId=rank.id;
        row.append(element('span','',rank.name));
        if(isManager(role)) row.append(button('common.edit',()=>rankForm(rank)),button('common.delete',()=>{
          if(confirm(t('members.deleteRankConfirm'))) action(owner=>deleteRank(owner,club.id,rank.id));
        }));rankList.append(row);
      }
      if(page.more) rankList.append(button('clubs.more',()=>{
        loadRanks().then(()=>{if(stillCurrent()){memberCursor=null;memberList.replaceChildren();return loadMembers();}})
          .catch(error=>labelText(status,dataErrorKey(error)));
      }));
    }
    async function loadMembers() {
      const page=await listClubRecords(uid,club.id,'members',memberCursor);if(!stillCurrent()) return;
      const missing=[...new Set(page.records.map(member=>member.rankId).filter(id=>id && !ranks.some(rank=>rank.id===id)))];
      const assigned=await Promise.all(missing.map(rankId=>getRank(uid,club.id,rankId)));
      const identities=await loadDisplayProfiles(uid,page.records.map(member=>member.uid));
      if(!stillCurrent()) return;ranks.push(...assigned.filter(Boolean));
      memberCursor=page.cursor;
      for(const member of page.records) {
        const card=element('article','feature-card');card.dataset.memberUid=member.uid;
        const rank=ranks.find(rank=>rank.id===member.rankId);
        const identity=element('div','member-identity');
        const avatar=element('span','profile-avatar','●');avatar.setAttribute('aria-hidden','true');
        const name=element('strong','member-name',identities.get(member.uid)?.displayName);
        if(!name.textContent) labelText(name,'identity.member');
        identity.append(avatar,name);card.append(identity);
        card.append(labelText(element('p','member-role role-badge'),'role.'+member.technicalRole),
          rank ? element('p','member-rank',rank.name) : labelText(element('p','member-rank'),'members.unassigned'));
        if(canAssignRank(role,uid,member)) {
          const form=element('form');form.id='member-'+member.uid;
          let roleInput=null;
          if(canManageMember(role,uid,member) && member.uid!==uid) roleInput=field(form,'technicalRole','members.role',{
            choices:role==='owner'?['admin','host','member']:['host','member'],prefix:'role',value:member.technicalRole});
          const rankInput=field(form,'rankId','members.rank',{choices:[],prefix:'',value:''});
          rankInput.append(labelText(element('option'),'members.unassigned'));rankInput.firstChild.value='';
          for(const rank of ranks) {const option=element('option','',rank.name);option.value=rank.id;rankInput.append(option);}
          rankInput.value=rank ? rank.id : '';
          const save=button('common.save');save.type='submit';form.append(save);
          form.addEventListener('submit',event=>{
            event.preventDefault();const nextRole=roleInput?.value || member.technicalRole,nextRank=rankInput.value || null;
            action(owner=>setMember(owner,club.id,member.uid,nextRole,nextRank));
          });card.append(disclosure('ui.manage',form));
        }
        if(member.uid!==uid && canManageMember(role,uid,member)) card.append(button('members.remove',()=>{
          if(confirm(t('members.removeConfirm'))) action(owner=>removeMember(owner,club.id,member.uid));
        }));memberList.append(card);
      }
      if(page.more) {const next=button('clubs.more',()=>{next.remove();loadMembers().catch(error=>labelText(status,dataErrorKey(error)));});memberList.append(next);}
    }
    await loadRanks();if(stillCurrent()) await loadMembers();
  });
}

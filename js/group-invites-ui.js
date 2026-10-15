import { registerGroupSection } from './group-ui.js';
import { listGroupRecords, clearGroupRecord } from './firebase/groupRepository.js';
import { loadDisplayProfiles } from './firebase/displayProfiles.js';
import { sessionURL, followSessionURL } from './data/group-session.js';
import { dataErrorKey } from './firebase/access.js';
import { getAccount, onAccountChange } from './auth-state.js';
import { invitationQR } from './ui/qr.js';
import { openView, dialog, element, labelText, button } from './ui/forms.js';
import {editOnly} from './ui/edit-mode.js';

export function initGroupInvitesUI() {
  const share=dialog('group-share-dialog','groups.invitation');
  onAccountChange(()=>{share.body.replaceChildren();share.status.textContent='';if(share.node.open)share.node.close();});
  function show(url,title,expires=null) {
    share.body.replaceChildren(element('h3','',title),invitationQR(url),labelText(element('p','muted'),'groups.qrHint'));
    share.status.textContent='';
    const link=labelText(element('a'),'groups.openInvitation');link.href=url;
    link.addEventListener('click',event=>{event.preventDefault();share.node.close();followSessionURL(url);});
    share.body.append(link,button('groups.shareLink',async()=>{
      const owner=getAccount()?.uid;
      try {if(navigator.share) await navigator.share({title,url});else await navigator.clipboard.writeText(url);
        if(getAccount()?.uid===owner) labelText(share.status,'identity.copied');}
      catch(error) {if(error.name!=='AbortError' && getAccount()?.uid===owner) labelText(share.status,'identity.copyFailed');}
    }));
    if(expires) labelText(share.body.appendChild(element('p')),'groups.expires',{time:new Date(expires).toLocaleString()});
    openView(share.node);
  }
  registerGroupSection(async({uid,model,body,status,action,stillCurrent})=>{
    const {group,manager}=model,id=group.id;
    if(!['scheduled','active'].includes(group.state))return;
    if(group.visibility!=='private') body.append(button('groups.shareSession',()=>show(sessionURL(id),group.title),'group-share'));
    if(!manager)return;
    const section=editOnly(element('section'));section.id='group-invitations';section.append(labelText(element('h3'),'groups.invitations'));body.append(section);
    async function invites(cursor=null) {
      const page=await listGroupRecords(uid,id,'invites',cursor),names=await loadDisplayProfiles(uid,page.records.map(row=>row.uid));
      if(!stillCurrent())return;
      for(const invitation of page.records) {
        const card=element('article','feature-card');card.dataset.inviteeUid=invitation.uid;
        const name=element('p','',names.get(invitation.uid)?.displayName);if(!name.textContent)labelText(name,'identity.member');
        const expires=invitation.expiresAt.toMillis?.() ?? invitation.expiresAt.seconds*1000;card.append(name);
        if(expires>Date.now()) card.append(button('groups.showQR',()=>show(sessionURL(id,invitation.token),group.title,expires)));
        else card.append(labelText(element('p'),'groups.inviteExpired'));
        card.append(button('groups.revoke',()=>action(owner=>clearGroupRecord(owner,id,'invites',invitation.uid))));section.append(card);
      }
      if(page.more) {const more=button('clubs.more',()=>{more.remove();invites(page.cursor).catch(error=>labelText(status,dataErrorKey(error)));});section.append(more);}
    }
    await invites();
  });
}

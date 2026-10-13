import {getAccount,onAccountChange} from '../auth-state.js';
import {liveClient} from '../live/live-client.js';
import {loadGroup,setGroupState} from '../firebase/groupRepository.js';
import {dialog,labelText,element,button,openView,runAction} from './forms.js';
import {dataErrorKey,requestDiagnostic} from '../firebase/access.js';

let pending=null;
export async function confirmDashboardReturn() {
  if(pending)return false;
  const state=liveClient.getState(),uid=getAccount()?.uid,id=state.sessionId;
  if(!state.consent||!uid||!id)return true;
  let model;
  try {model=await loadGroup(uid,id);}
  catch(error) {
    // Home remains available during an outage; ending is never guessed or replayed.
    dispatchEvent(new CustomEvent('motodash-data-diagnostic',{detail:requestDiagnostic(error,'group-load')}));return true;
  }
  if(getAccount()?.uid!==uid||liveClient.getState().sessionId!==id)return false;
  if(!model.manager||model.group.state!=='active')return true;
  const view=dialog('host-return-dialog','groups.returnTitle');
  view.body.append(labelText(element('p'),'groups.returnHint'));
  return new Promise(resolve=>{
    let result=false;pending=view.node;
    view.body.append(button('groups.returnHome',()=>{result=true;view.node.close();},'host-return-home'),
      button('groups.endAll',()=>void runAction(view.body,view.status,async()=>{
        if(getAccount()?.uid!==uid)throw Object.assign(new Error('account-changed'),{code:'account-changed'});
        await setGroupState(uid,id,'completed');liveClient.stop('ended');result=true;view.node.close();
      },dataErrorKey),'host-return-end'));
    const off=onAccountChange(({user})=>{if(user?.uid!==uid)view.node.close();});
    view.node.addEventListener('close',()=>{off();pending=null;view.node.remove();resolve(result && getAccount()?.uid===uid);},{once:true});
    openView(view.node);
  });
}

import {registerGroupSection} from '../group-ui.js';
import {liveClient,liveEndpoint} from './live-client.js';
import {liveConfig} from '../../live-config.js';
import {element,labelText,field,button} from '../ui/forms.js';
import {t,setLocalizedText,onLanguageChange,getLocale} from '../i18n/i18n.js';
import {sessionURL,followSessionURL} from '../data/group-session.js';
import {summarizeLive} from './live-summary.js';

export function initLiveUI() {
  const dashboard=document.getElementById('live-dashboard');
  dashboard.addEventListener('click',()=>{const id=liveClient.getState().sessionId;if(id)followSessionURL(sessionURL(id));});
  function renderDashboard() {
    const s=liveClient.getState();dashboard.hidden=!s.consent;dashboard.dataset.connection=s.connection;
    setLocalizedText(dashboard,()=>t(s.connection==='connected'?'live.compact':'live.'+s.connection));
    dashboard.title=t('live.'+s.connection);dashboard.setAttribute('aria-label',dashboard.title);
    document.getElementById('status-tab').title=s.consent?dashboard.title:'';
  }
  registerGroupSection(async({uid,model,body})=>{
    const {group,participant}=model,s=liveClient.getState();
    if(s.sessionId===group.id && (!participant || group.state!=='active'))liveClient.stop('ended');
    const panel=element('section','feature-card');panel.id='group-live';panel.dataset.sessionId=group.id;
    panel.append(labelText(element('h3'),'live.title'));const status=element('p');status.id='group-live-state';panel.append(status);
    let configured=false;try {configured=Boolean(liveEndpoint(liveConfig.endpoint));}catch{}
    if(!configured)panel.append(labelText(element('p'),'live.notConfigured'));
    if(participant && group.state==='active' && configured) {
      const form=element('form');form.id='live-consent';
      field(form,'consent','live.consent',{type:'checkbox',required:true});form.append(labelText(element('p','muted'),'live.privacy'));
      const start=button('live.start');start.type='submit';form.append(start);
      form.addEventListener('submit',event=>{
        event.preventDefault();if(!form.reportValidity())return;
        document.getElementById('groups-dialog').close();
        document.getElementById('start-overlay').style.display='none';
        document.getElementById('back-to-start-btn').style.display='inline-flex';
        liveClient.start(uid,group.id);
      });panel.append(form);
    }else if(!participant || group.state!=='active')panel.append(labelText(element('p'),'live.activeOnly'));
    const stop=button('live.stop',()=>liveClient.stop());stop.id='live-stop';panel.append(stop,element('div','live-summary'));body.append(panel);
    renderPanel(panel);
  });
  liveClient.onChange(()=>{renderDashboard();const panel=document.getElementById('group-live');if(panel)renderPanel(panel);});
  onLanguageChange(()=>{renderDashboard();const panel=document.getElementById('group-live');if(panel)renderPanel(panel);});
  setInterval(()=>{const panel=document.getElementById('group-live');if(panel)renderPanel(panel);},5000);
}
function renderPanel(panel) {
  const s=liveClient.getState(),here=s.sessionId===panel.dataset.sessionId;
  setLocalizedText(panel.querySelector('#group-live-state'),()=>t('live.'+(here?s.connection:s.consent?'otherSession':s.connection)));
  panel.querySelector('#live-stop').hidden=!here || !s.consent;
  const form=panel.querySelector('#live-consent');if(form)form.hidden=here && s.consent;
  const summary=panel.querySelector('.live-summary');summary.replaceChildren();
  if(here && s.connection==='connected') {
    const values=summarizeLive(s);summary.append(labelText(element('p'),'live.counts',values));
    for(const [status,count] of Object.entries(values.statuses)) {
      const row=element('p');setLocalizedText(row,()=>t('groups.statusCount',{status:t('riderStatus.'+status),count}));summary.append(row);
    }
    summary.append(labelText(element('p'),'live.separation',{distance:values.maxDistance===null?t('live.unknown'):(values.maxDistance/1000).toLocaleString(getLocale(),{maximumFractionDigits:1})+' km'}),labelText(element('p','muted'),'live.regroupHint'));
  }
}

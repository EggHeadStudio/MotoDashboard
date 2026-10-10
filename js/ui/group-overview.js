import { RIDER_STATUSES } from '../data/group-session.js';
import { element, labelText } from './forms.js';
import { t, setLocalizedText, getLocale } from '../i18n/i18n.js';
import {liveConfig} from '../../live-config.js';

// Reuse already-loaded roster pages. A status timestamp is not live presence.
export function renderGroupOverview(root, group, participants) {
  const counts=Object.fromEntries(RIDER_STATUSES.map(status=>[status,0]));
  for(const participant of participants) if(participant.status in counts) counts[participant.status]++;
  const checked=Date.now();
  root.replaceChildren(labelText(element('h3'),'groups.overview'),labelText(element('p'),'groups.count',{count:group.participantCount}),
    labelText(element('p'),'groups.overviewCoverage',{loaded:participants.length,total:group.participantCount}));
  const list=element('ul');
  for(const status of RIDER_STATUSES) {
    const row=element('li');row.dataset.statusCount=status;
    setLocalizedText(row,()=>t('groups.statusCount',{status:t('riderStatus.'+status),count:counts[status]}));list.append(row);
  }
  const snapshot=element('p','muted');setLocalizedText(snapshot,()=>t('groups.checked',{time:new Date(checked).toLocaleString(getLocale())}));
  root.append(list,labelText(element('p','muted'),liveConfig.endpoint?'live.summaryHint':'groups.liveUnavailable'),snapshot,labelText(element('p','muted'),'groups.manualRefresh'));
}

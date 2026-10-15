import {element,labelText} from './forms.js';
import {formatNumber,setLocalizedText} from '../i18n/i18n.js';
import {formatDate} from '../utils.js';
export function renderActivityStats(root,data){
  root.replaceChildren();const list=element('dl','activity-stats');root.append(labelText(element('h4'),'activity.stats'),list);
  const stats=data.stats;
  for(const [key,value] of [['rides',stats.rides],['hours',stats.durationMs/3600000],['distance',stats.distanceMeters/1000],['riders',stats.riders],['groups',stats.group],['meets',stats.meet],['events',stats.event]]){
    const item=element('div'),number=element('dd');setLocalizedText(number,()=>formatNumber(value));item.append(labelText(element('dt'),'activity.'+key),number);list.append(item);
  }
  root.append(labelText(element('p','muted'),'activity.visibleStats'),labelText(element('p','muted'),'activity.asOf',{time:formatDate(data.checkedAt)}));
}

import { element, labelText, button } from './forms.js';
import { vehicleIcon, icon } from './icons.js';
import { getLocale } from '../i18n/i18n.js';
import { readableText } from '../data/branding.js';
import {decorateMedia} from '../media/media-render.js';

export function groupCard(group, open, {featured = false, detail = false} = {}) {
  const card = element('article', 'feature-card event-card' + (featured ? ' featured' : '') + (detail ? ' group-hero' : ''));
  const art = element('div','card-art'); art.append(vehicleIcon(group.category));
  const body = element('div','card-content');
  const badges = element('div','badges'); badges.append(labelText(element('span','badge'),'activity.'+group.activityType),labelText(element('span','badge'),'groupState.'+group.state));
  const date = element('p','meta'); date.append(icon('clock'), element('span','',new Date(group.startsAt).toLocaleString(getLocale(),{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})));
  const area = element('p','meta'); area.append(icon('pin'),element('span','',group.meetingArea));
  body.append(badges,element('h3','',group.title), labelText(element('p','category-label'),'category.'+group.category),date,area);
  if (group.description) body.append(element('p','card-description',group.description));
  body.append(element('p','muted',group.clubName || group.hostName));
  const footer = element('div','card-footer');
  footer.append(labelText(element('span','muted'),group.maxParticipants?'groups.capacityLabel':'groups.count',{count:group.participantCount,max:group.maxParticipants}));
  if(open) footer.append(button('ui.open',open));
  body.append(labelText(element('p','muted'),'policy.'+group.joiningPolicy));
  if(['scheduled','active'].includes(group.state)) body.append(labelText(element('p','availability'),group.maxParticipants && group.participantCount >= group.maxParticipants?'lobby.full':'lobby.available'));
  body.append(footer);
  card.append(art,body); return card;
}
export function clubCard(club, open, {member = false} = {}) {
  const card = element('article','feature-card community-card');
  const mark = element('div','club-monogram',club.name?.trim().slice(0,2).toLocaleUpperCase());
  if(/^#[0-9a-f]{6}$/i.test(club.primaryColor)) {mark.style.backgroundColor=club.primaryColor;mark.style.color=readableText(club.primaryColor);}
  const body = element('div','card-content'); body.append(element('h3','',club.name),labelText(element('p','category-label'),'category.'+club.category));
  if(member || club.membershipRole) body.append(labelText(element('p','badge'),'clubs.joined'));
  if (club.description) body.append(element('p','card-description',club.description));
  if (Number.isFinite(club.memberCount)) body.append(labelText(element('p','muted'),'clubs.memberCount',{count:club.memberCount}));
  body.append(labelText(element('p','badge'),'policy.'+club.membershipPolicy),button('ui.open',open)); card.append(mark,body);
  decorateMedia(card,{kind:'club',id:club.id},{logo:mark,banner:card});return card;
}
export function skeletons(root) {
  const section=element('div','skeleton-grid'); section.setAttribute('role','status'); section.append(labelText(element('span','sr-only'),'ui.loadingCards'));
  for(let n=0;n<3;n++) {const card=element('div','skeleton-card');card.setAttribute('aria-hidden','true');section.append(card);}
  root.replaceChildren(section); return section;
}
export function emptyState(key='discover.emptyTitle',hint='discover.emptyHint') {
  const node=element('div','empty-state');node.append(icon('rides'),labelText(element('h3'),key),labelText(element('p','muted'),hint));return node;
}

import {element} from './forms.js';
import {decorateMedia} from '../media/media-render.js';
import {getDisplayIdentity} from '../auth-state.js';
// Media references stay opaque; Worker checks the requesting viewer's current ACL.
export function riderMarker({name,profileId,clubId,rankId,rankName}={}){
  const node=element('span','rider-composite'),avatar=element('span','rider-avatar',(name || getDisplayIdentity()?.displayName || 'MD').trim().slice(0,2).toLocaleUpperCase());
  avatar.setAttribute('aria-hidden','true');node.append(avatar);const off=[];
  if(profileId)off.push(decorateMedia(avatar,{kind:'profile',id:profileId},{avatar},{themeRoot:node}));
  if(clubId){const badge=element('span','rider-club-badge','●');badge.setAttribute('aria-hidden','true');node.append(badge);
    off.push(decorateMedia(badge,{kind:'club',id:clubId},{logo:badge},{theme:false}));}
  node.title=rankName || name || '';node.append(element('span','rider-heading'));
  return {node,dispose:()=>off.forEach(fn=>fn())};
}

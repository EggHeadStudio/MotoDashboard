import {liveClient} from './live-client.js';
import {t,onLanguageChange,getLocale} from '../i18n/i18n.js';
import {riderMarker} from '../ui/rider-marker.js';
const STALE=45000,EXPIRE=120000;
export function attachLiveMap(map,L) {
  const layer=L.layerGroup().addTo(map),markers=new Map();
  function render() {
    const s=liveClient.getState(),now=Date.now(),visible=new Set();
    if(s.consent && s.connection==='connected')for(const [id,p] of s.participants) {
      const pos=p.position;if(id===s.selfId || !pos || now-pos.at>=EXPIRE || !Number.isFinite(pos.latitude) || !Number.isFinite(pos.longitude))continue;
      visible.add(id);let marker=markers.get(id);
      if(!marker){marker=L.marker([pos.latitude,pos.longitude],{icon:L.divIcon({className:'live-rider-icon',html:'<span class="live-rider-dot" aria-hidden="true"></span>',iconSize:[18,18]})}).addTo(layer);markers.set(id,marker);}
      const key=JSON.stringify([p.mediaIdentity,p.displayName,p.clubIdentity]);
      if(marker._identityKey!==key){marker._identityMedia?.dispose();const art=riderMarker({name:p.displayName,...p.mediaIdentity,rankName:p.clubIdentity?.rank});
        marker.setIcon(L.divIcon({className:'live-rider-icon rider-composite-icon',html:art.node,iconSize:[44,44],iconAnchor:[22,22]}));marker._identityMedia=art;marker._identityKey=key;}
      marker._identityMedia?.setHeading(pos.heading);
      marker.setLatLng([pos.latitude,pos.longitude]);const label=document.createElement('span');label.className='live-rider-label';
      const name=document.createElement('strong');name.textContent=p.displayName?.trim() || t('identity.member');label.append(name);
      for(const value of [p.vehicle?.nickname,p.vehicle? t('category.'+p.vehicle.category):null,p.clubIdentity?.name,p.clubIdentity?.rank,t('riderStatus.'+p.status),t('live.updated',{time:new Date(pos.at).toLocaleTimeString(getLocale()),seconds:Math.max(0,Math.floor((now-pos.at)/1000))}),now-pos.at>STALE?t('live.stale'):null])
        if(value){const text=document.createElement('span');text.textContent=value;label.append(text);}
      label.title=[...label.children].map(row=>row.textContent).join('\n');
      marker.unbindTooltip();marker.bindTooltip(label,{permanent:true,direction:'top',className:'live-rider-tooltip'});
      marker.setOpacity(now-pos.at>STALE?.45:1);
    }
    for(const [id,marker] of markers)if(!visible.has(id)){marker._identityMedia?.dispose();layer.removeLayer(marker);markers.delete(id);}
  }
  const off=liveClient.onChange(render),language=onLanguageChange(render),timer=setInterval(render,5000);
  return ()=>{off();language?.();clearInterval(timer);for(const marker of markers.values())marker._identityMedia?.dispose();map.removeLayer(layer);};
}

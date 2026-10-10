// UI advisory only. Reuses accepted GPS samples; no coordinates or network writes.
import { STOP_SPEED_THRESHOLD_KMH } from './config.js';
import { onAccountChange } from './auth-state.js';
let last = null;
const listeners = new Set();
export function riderMoving() {
  return Boolean(last && Date.now()-last.timestamp<20000
    && (last.moving || last.speed >= STOP_SPEED_THRESHOLD_KMH));
}
export function recordRiderMotion(sample) {
  last = sample?.accepted ? {timestamp:sample.timestamp,moving:sample.moving,speed:sample.validatedSpeedKmh} : null;
  for(const listener of listeners) listener(riderMoving());
}
export function onRiderMotion(listener) {listeners.add(listener);return ()=>listeners.delete(listener);}
onAccountChange(()=>{last=null;for(const listener of listeners) listener(false);});

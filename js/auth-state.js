// One application identity boundary; SDK Auth remains the authority for every operation.
let state = { user: null, ready: false };
let profile = null;
const profileListeners = new Set();
export const getDisplayIdentity = () => profile;
export function publishDisplayIdentity(uid, name) {
  if (state.user?.uid !== uid) return;
  profile = { uid, displayName: name || '' };
  profileListeners.forEach(listener => listener(profile));
}
export function onDisplayIdentity(listener) {
  profileListeners.add(listener); listener(profile);
  return () => profileListeners.delete(listener);
}
const listeners = new Set();
export const getAccount = () => state.user;
export const getAuthState = () => state;
export function publishAuthState(user, ready = true) {
  if (state.user?.uid !== user?.uid) { profile = null; profileListeners.forEach(listener => listener(null)); }
  state = { user, ready };
  for (const listener of listeners) listener(state);
}
export function onAccountChange(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

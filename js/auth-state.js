// One application identity boundary; SDK Auth remains the authority for every operation.
let state = { user: null, ready: false };
const listeners = new Set();
export const getAccount = () => state.user;
export const getAuthState = () => state;
export function publishAuthState(user, ready = true) {
  state = { user, ready };
  for (const listener of listeners) listener(state);
}
export function onAccountChange(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

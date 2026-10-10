export function validDisplayName(value) {
  return typeof value === 'string' && [...value.trim()].length >= 3 && [...value.trim()].length <= 30;
}
export function displayNameInput(value) {
  if (!validDisplayName(value)) throw Object.assign(new Error('invalid-display-name'), {code:'profile/invalid-name'});
  return value.trim();
}

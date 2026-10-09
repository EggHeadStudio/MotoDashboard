import { observeAuth, register, login, logout, authErrorKey } from './firebase/auth.js';
import { ensureProfile, saveProfileLanguage } from './firebase/profileRepository.js';
import { getLanguage, setLanguage, t, setLocalizedText, onLanguageChange } from './i18n/i18n.js';
import { publishAuthState } from './auth-state.js';

export function initAuthUI() {
  const dialog = document.getElementById('account-dialog');
  const open = document.getElementById('account-btn');
  const close = document.getElementById('account-close');
  const form = document.getElementById('auth-form');
  const mode = document.getElementById('auth-mode');
  const name = document.getElementById('auth-name');
  const email = document.getElementById('auth-email');
  const password = document.getElementById('auth-password');
  const submit = document.getElementById('auth-submit');
  const signOut = document.getElementById('auth-logout');
  const retry = document.getElementById('auth-retry');
  const status = document.getElementById('auth-status');
  const identity = document.getElementById('auth-identity');
  const languageSelector = document.getElementById('account-language');
  let user = null, profile = null, busy = false, ready = false, connected = false;
  let message = 'auth.loading', version = 0, languageWrites = Promise.resolve();
  let pendingLanguage = null;

  function render() {
    const signup = mode.value === 'register';
    form.hidden = !!user;
    document.getElementById('auth-name-row').hidden = !signup;
    name.required = signup;
    password.autocomplete = signup ? 'new-password' : 'current-password';
    password.minLength = signup ? 6 : 1;
    signOut.hidden = !user;
    retry.hidden = connected && (!user || (!!profile && message !== 'auth.languageError'));
    submit.disabled = busy || !ready;
    signOut.disabled = busy || !ready;
    retry.disabled = busy;
    mode.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
    languageSelector.value = getLanguage();
    setLocalizedText(submit, () => t(busy ? 'auth.working' : signup ? 'auth.register' : 'auth.login'));
    setLocalizedText(status, () => t(message));
    setLocalizedText(identity, () => user ? t('auth.signedInAs', { name: profile?.displayName || user.displayName || user.email }) : t('auth.signedOut'));
    setLocalizedText(open, () => t(user ? 'auth.account' : 'auth.open'));
  }

  async function synchronize(next, displayName) {
    const current = ++version;
    user = next; profile = null;
    message = next ? 'auth.profileLoading' : 'auth.ready'; render();
    if (!next) return;
    try {
      // Bound UI waiting; an SDK operation may still finish later. Rules remain authoritative.
      const result = await deadline(ensureProfile(next, getLanguage(), displayName));
      if (current !== version || user?.uid !== next.uid) return;
      profile = result; message = 'auth.profileReady';
      if (pendingLanguage?.uid === next.uid) {
        try { await queueLanguage(next, pendingLanguage.language); }
        catch { if (current === version) message = 'auth.languageError'; }
      }
    } catch {
      if (current !== version) return;
      message = 'auth.profileError';
    }
    if (current === version) render();
  }

  async function connect() {
    if (connected || busy) return;
    busy = true; message = 'auth.loading'; render();
    try {
      await observeAuth(next => {
        if (user?.uid !== next?.uid) { ++version; profile = null; pendingLanguage = null; }
        user = next;
        publishAuthState(next);
        if (!busy) void synchronize(next);
        else render();
      }, error => { message = authErrorKey(error); render(); });
      connected = true; ready = true; message = 'auth.ready';
    } catch (error) { message = authErrorKey(error); }
    busy = false; render();
    if (connected) void synchronize(user);
  }

  open.addEventListener('click', () => {
    dialog.showModal();
    if (!connected) void connect();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    password.value = ''; open.focus();
  });
  mode.addEventListener('change', () => { password.value = ''; message = 'auth.ready'; render(); });
  languageSelector.addEventListener('change', () => setLanguage(languageSelector.value));
  retry.addEventListener('click', () => connected ? void synchronize(user) : void connect());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !ready || !form.reportValidity()) return;
    const displayName = name.value.trim();
    if (mode.value === 'register' && !displayName) { message = 'auth.nameRequired'; render(); return; }
    busy = true; message = 'auth.working'; render();
    try {
      const next = mode.value === 'register'
        ? await register(email.value, password.value, displayName)
        : await login(email.value, password.value);
      password.value = '';
      await synchronize(next, mode.value === 'register' ? displayName : undefined);
    } catch (error) { password.value = ''; message = authErrorKey(error); }
    busy = false; render();
  });
  signOut.addEventListener('click', async () => {
    if (busy) return;
    busy = true; message = 'auth.working'; render();
    try { await logout(); await synchronize(null); }
    catch (error) { message = authErrorKey(error); }
    busy = false; render();
  });
  function queueLanguage(owner, language) {
    const task = languageWrites.catch(() => {}).then(async () => {
      if (user?.uid !== owner.uid) return;
      await deadline(saveProfileLanguage(owner, language));
      if (user?.uid === owner.uid && profile) profile.language = language;
      if (pendingLanguage?.uid === owner.uid && pendingLanguage.language === language) pendingLanguage = null;
    });
    languageWrites = task.catch(() => {});
    return task;
  }
  onLanguageChange(language => {
    render();
    const owner = user;
    if (!owner) return;
    pendingLanguage = { uid: owner.uid, language };
    if (!profile) return;
    queueLanguage(owner, language).catch(() => {
      if (user?.uid === owner.uid) { message = 'auth.languageError'; render(); }
    });
  });
  render(); void connect();
}

function deadline(promise) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('profile-timeout')), 12000);
  })]).finally(() => clearTimeout(timer));
}

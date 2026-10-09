import { getFirebase } from './firebase.js';

export async function observeAuth(onChange, onError) {
  const { auth, sdk } = await getFirebase();
  return sdk.onAuthStateChanged(auth, onChange, onError);
}

export async function register(email, password, displayName) {
  const { auth, sdk } = await getFirebase();
  const credential = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
  await sdk.updateProfile(credential.user, { displayName: displayName.trim() });
  return credential.user;
}

export async function login(email, password) {
  const { auth, sdk } = await getFirebase();
  return (await sdk.signInWithEmailAndPassword(auth, email.trim(), password)).user;
}

export async function logout() {
  const { auth, sdk } = await getFirebase();
  await sdk.signOut(auth);
}

export function authErrorKey(error) {
  switch (error?.code) {
    case 'app/invalid-config': return 'auth.configError';
    case 'auth/invalid-email': return 'auth.invalidEmail';
    case 'auth/email-already-in-use': return 'auth.emailInUse';
    case 'auth/weak-password': case 'auth/password-does-not-meet-requirements': return 'auth.weakPassword';
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': return 'auth.invalidCredentials';
    case 'auth/too-many-requests': return 'auth.tooManyRequests';
    case 'auth/user-disabled': return 'auth.disabled';
    case 'auth/operation-not-allowed': return 'auth.providerDisabled';
    case 'auth/unauthorized-domain': return 'auth.domainError';
    case 'auth/web-storage-unsupported': return 'auth.storageError';
    case 'auth/network-request-failed': return 'auth.networkError';
    default: return 'auth.unavailable';
  }
}

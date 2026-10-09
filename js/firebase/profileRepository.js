import { getFirebase } from './firebase.js';
import { getFirestoreService } from './firestore.js';

async function ownProfile(user) {
  const { auth } = await getFirebase();
  if (!user?.uid || auth.currentUser?.uid !== user.uid) throw new Error('profile-account-changed');
  const { db, sdk } = await getFirestoreService();
  return { sdk, db, ref: sdk.doc(db, 'users', user.uid) };
}

export async function ensureProfile(user, language, displayName) {
  const { sdk, db, ref } = await ownProfile(user);
  return sdk.runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const profile = snapshot.data();
      if (displayName && displayName !== profile.displayName) {
        const changes = { displayName: displayName.trim().slice(0, 64), updatedAt: sdk.serverTimestamp() };
        transaction.update(ref, changes);
        return { ...profile, ...changes };
      }
      return profile;
    }
    const profile = {
      uid: user.uid,
      displayName: (displayName || user.displayName || user.email?.split('@')[0] || 'MotoDash').trim().slice(0, 64),
      email: user.email,
      language: ['en', 'fi'].includes(language) ? language : 'en',
      createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp()
    };
    transaction.set(ref, profile);
    return profile;
  });
}

export async function saveProfileLanguage(user, language) {
  if (!['en', 'fi'].includes(language)) throw new Error('invalid-language');
  const { sdk, ref } = await ownProfile(user);
  await sdk.updateDoc(ref, { language, updatedAt: sdk.serverTimestamp() });
}

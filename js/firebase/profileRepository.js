import { getFirebase } from './firebase.js';
import { getFirestoreService } from './firestore.js';
import { displayNameInput } from '../data/identity.js';
import {profileProjection} from '../data/public-profile.js';
import {syncProfileDirectory} from './profileDirectory.js';

async function ownProfile(user) {
  const { auth } = await getFirebase();
  if (!user?.uid || auth.currentUser?.uid !== user.uid) throw new Error('profile-account-changed');
  const { db, sdk } = await getFirestoreService();
  return { sdk, db, ref: sdk.doc(db, 'users', user.uid) };
}

export async function ensureProfile(user, language, displayName) {
  if (displayName !== undefined) displayName = displayNameInput(displayName);
  const { sdk, db, ref } = await ownProfile(user);
  return sdk.runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const displayRef = sdk.doc(db, 'displayProfiles', user.uid);
    const display = await transaction.get(displayRef);
    const settings=await transaction.get(sdk.doc(db,'users',user.uid,'preferences','publicProfile'));
    if (snapshot.exists()) {
      const profile = snapshot.data();
      const nextName = displayName ?? profile.displayName;
      if(settings.exists()) {
        const prefs=settings.data();syncProfileDirectory(transaction,sdk,db,prefs,nextName);
        if(prefs.state==='active')transaction.set(sdk.doc(db,'publicProfiles',prefs.publicId),profileProjection(prefs.publicId,prefs,nextName,sdk.serverTimestamp()));
      }
      if (nextName?.trim() && (!display.exists() || display.data().displayName !== nextName)) {
        const prefs=settings.exists()?settings.data():null;
        const alias=prefs?.state==='active' && prefs.visibility==='public'?prefs.publicId:null;
        transaction.set(displayRef, {displayName: nextName,...(prefs?{publicProfileId:alias}:{}),updatedAt: sdk.serverTimestamp()});
        if(prefs?.state==='active')transaction.set(sdk.doc(db,'publicProfiles',prefs.publicId),profileProjection(prefs.publicId,prefs,nextName,sdk.serverTimestamp()));
      }
      if (displayName && displayName !== profile.displayName) {
        const changes = { displayName, updatedAt: sdk.serverTimestamp() };
        transaction.update(ref, changes);
        return { ...profile, ...changes };
      }
      return profile;
    }
    const profile = {
      uid: user.uid,
      displayName: displayNameInput(displayName ?? user.displayName ?? ''),
      email: user.email,
      language: ['en', 'fi'].includes(language) ? language : 'en',
      createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp()
    };
    transaction.set(ref, profile);
    transaction.set(displayRef, {displayName: profile.displayName, updatedAt: sdk.serverTimestamp()});
    return profile;
  });
}

export async function saveProfileLanguage(user, language) {
  if (!['en', 'fi'].includes(language)) throw new Error('invalid-language');
  const { sdk, ref } = await ownProfile(user);
  await sdk.updateDoc(ref, { language, updatedAt: sdk.serverTimestamp() });
}

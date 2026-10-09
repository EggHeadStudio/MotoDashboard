import { getFirebase, SDK_BASE } from './firebase.js';

let initialization;
export function getFirestoreService() {
  if (!initialization) initialization = (async () => {
    const { app } = await getFirebase();
    const sdk = await import(SDK_BASE + 'firebase-firestore.js');
    // Default memory cache; no persistent private-profile cache across accounts.
    return { db: sdk.getFirestore(app), sdk };
  })().catch(error => { initialization = undefined; throw error; });
  return initialization;
}

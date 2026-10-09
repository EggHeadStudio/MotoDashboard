import { getFirebase, SDK_BASE } from './firebase.js';

// Future boundary only. Nothing in Batch 1 calls this or subscribes to locations.
let initialization;
export function getRealtimeService() {
  if (!initialization) initialization = (async () => {
    const { app } = await getFirebase();
    const sdk = await import(SDK_BASE + 'firebase-database.js');
    return { db: sdk.getDatabase(app), sdk };
  })().catch(error => { initialization = undefined; throw error; });
  return initialization;
}

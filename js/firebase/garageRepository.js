import { ownDatabase, boundedRequest, dataError } from './access.js';
import { vehicleInput, validId } from '../data/schema.js';

export async function loadGarage(uid) {
  const service = await ownDatabase(uid, 'garage-load');
  const { db, sdk } = service;
  const [vehicles, preference] = await boundedRequest(Promise.all([
    sdk.getDocs(sdk.collection(db, 'users', uid, 'vehicles')),
    sdk.getDoc(sdk.doc(db, 'users', uid, 'preferences', 'garage'))
  ]));
  service.assertCurrent();
  return { vehicles: vehicles.docs.map(doc => doc.data()).filter(v => v.ownerUid === uid && validId(v.id)),
    defaultVehicleId: preference.exists() ? preference.data().defaultVehicleId : null };
}
export async function saveVehicle(uid, id, input) {
  const data = vehicleInput(input);
  const service = await ownDatabase(uid, 'garage-change'); const { db, sdk } = service;
  const vehicleId = id || crypto.randomUUID();
  if (!validId(vehicleId)) throw dataError('invalid-input');
  await boundedRequest(sdk.runTransaction(db, async transaction => {
    service.assertCurrent();
    const ref = sdk.doc(db, 'users', uid, 'vehicles', vehicleId);
    const existing = await transaction.get(ref);
    if (id && (!existing.exists() || existing.data().ownerUid !== uid)) throw dataError('permission-denied');
    transaction.set(ref, { id: vehicleId, ownerUid: uid, ...data,
      createdAt: existing.exists() ? existing.data().createdAt : sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
  }));
  service.assertCurrent(); return vehicleId;
}
export async function defaultVehicle(uid, id) {
  if (id !== null && !validId(id)) throw dataError('invalid-input');
  const service = await ownDatabase(uid, 'garage-change'); const { db, sdk } = service;
  await boundedRequest(sdk.runTransaction(db, async transaction => {
    service.assertCurrent();
    if (id) {
      const vehicle = await transaction.get(sdk.doc(db, 'users', uid, 'vehicles', id));
      if (!vehicle.exists() || vehicle.data().ownerUid !== uid) throw dataError('permission-denied');
    }
    transaction.set(sdk.doc(db, 'users', uid, 'preferences', 'garage'), { defaultVehicleId: id, updatedAt: sdk.serverTimestamp() });
  }));
  service.assertCurrent();
}
export async function deleteVehicle(uid, id) {
  if (!validId(id)) throw dataError('invalid-input');
  const service = await ownDatabase(uid, 'garage-change'); const { db, sdk } = service;
  await boundedRequest(sdk.runTransaction(db, async transaction => {
    service.assertCurrent();
    const ref = sdk.doc(db, 'users', uid, 'vehicles', id);
    const prefRef = sdk.doc(db, 'users', uid, 'preferences', 'garage');
    const [vehicle, pref] = await Promise.all([transaction.get(ref), transaction.get(prefRef)]);
    if (!vehicle.exists() || vehicle.data().ownerUid !== uid) throw dataError('permission-denied');
    if (pref.exists() && pref.data().defaultVehicleId === id)
      transaction.set(prefRef, { defaultVehicleId: null, updatedAt: sdk.serverTimestamp() });
    transaction.delete(ref);
  }));
  service.assertCurrent();
}

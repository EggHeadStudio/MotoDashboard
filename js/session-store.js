// Schema v2 only; existing non-session settings are retained.
export function isSessionRecord(record) {
  return record?.schemaVersion === 2 && typeof record.id === 'string'
    && record.id.length > 0 && record.id.length <= 100
    && ['active', 'completed'].includes(record.status)
    && Number.isFinite(record.startedAt) && Number.isFinite(record.updatedAt)
    && ['distanceMeters', 'movingDurationMs', 'maxSpeedKmh', 'averageMovingSpeedKmh']
      .every(key => Number.isFinite(record[key]) && record[key] >= 0)
    && (record.name === null || typeof record.name === 'string')
    && Array.isArray(record.routePoints)
    && record.routePoints.every(p => p && Number.isFinite(p.timestamp)
      && (p.break === true || (Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90
        && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180)));
}

export function createSessionStore(options) {
  const { sessionStorageKey, settingsStorageKey, dbName, dbVersion, sessionsStoreName, settingsStoreName } = options;
  const ownerUid = options.ownerUid || null;
  const scoped = record => (record?.ownerUid || null) === ownerUid;
  const prefix = sessionStorageKey + (ownerUid ? ':account:' + ownerUid : '') + ':';
  const clearedKey = sessionStorageKey + (ownerUid ? ':account:' + ownerUid : '') + '-cleared-at';
  let dbPromise = null;
  let writes = Promise.resolve();
  function openDb() {
    if (!globalThis.indexedDB) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(resolve => {
      let request;
      let settled = false;
      const finish = db => { if (!settled) { settled = true; clearTimeout(timer); resolve(db); } else db?.close(); };
      const timer = setTimeout(() => finish(null), 4000);
      try { request = indexedDB.open(dbName, dbVersion); } catch { finish(null); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(sessionsStoreName)) db.createObjectStore(sessionsStoreName, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(settingsStoreName)) db.createObjectStore(settingsStoreName, { keyPath: 'key' });
        if (sessionsStoreName !== 'sessions' && db.objectStoreNames.contains('sessions')) db.deleteObjectStore('sessions');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        finish(db);
      };
      request.onerror = request.onblocked = () => finish(null);
    });
    return dbPromise;
  }
  async function transaction(store, mode, action) {
    const db = await openDb();
    if (!db) throw new Error('storage-unavailable');
    return new Promise((resolve, reject) => {
      let result;
      try {
        const tx = db.transaction(store, mode);
        const request = action(tx.objectStore(store));
        if (request) request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('storage-write-failed'));
      } catch (error) { reject(error); }
    });
  }
  function fallbackRecords() {
    const records = [];
    try {
      for (let n = 0; n < localStorage.length; n++) {
        const key = localStorage.key(n);
        if (!key.startsWith(prefix)) continue;
        try { records.push(JSON.parse(localStorage.getItem(key))); } catch { /* Invalid local record. */ }
      }
    } catch { /* In-memory recording remains usable. */ }
    return records;
  }
  function queue(action) {
    const task = writes.then(action);
    writes = task.catch(() => {});
    return task;
  }
  async function readSessions() {
    let durable = [];
    try { durable = await transaction(sessionsStoreName, 'readonly', store => store.getAll()); } catch { /* Fallback below. */ }
    let clearedAt = 0;
    try { clearedAt = Number(localStorage.getItem(clearedKey)) || 0; } catch { /* Optional. */ }
    const byId = new Map();
    for (const record of [...(durable || []), ...fallbackRecords()]) {
      if (!record || !scoped(record) || typeof record.id !== 'string' || !(record.updatedAt > clearedAt)) continue;
      const prior = byId.get(record.id);
      if (!prior || record.updatedAt >= prior.updatedAt) byId.set(record.id, record);
    }
    return [...byId.values()].filter(isSessionRecord);
  }
  async function loadSessions() { await writes; return readSessions(); }
  async function writeSnapshot(snapshot) {
    try {
      await transaction(sessionsStoreName, 'readwrite', store => store.put(snapshot));
      try { localStorage.removeItem(prefix + snapshot.id); } catch { /* Optional cleanup. */ }
      return 'indexeddb';
    } catch {
      localStorage.setItem(prefix + snapshot.id, JSON.stringify(snapshot));
      return 'localstorage';
    }
  }
  function saveSession(record) {
    const snapshot = structuredClone(record);
    if (!isSessionRecord(snapshot) || !scoped(snapshot)) return Promise.reject(new Error('invalid-session-owner'));
    return queue(() => writeSnapshot(snapshot));
  }
  function updateSession(id, mutate) {
    return queue(async () => {
      const latest = (await readSessions()).find(record => record.id === id);
      if (!latest) return null;
      const next = mutate(structuredClone(latest));
      if (!next) return null;
      if (!isSessionRecord(next) || !scoped(next)) throw new Error('invalid-session-owner');
      await writeSnapshot(next); return next;
    });
  }
  function deleteSession(id) {
    return queue(async () => {
      let durable = false;
      const existing = await transaction(sessionsStoreName, 'readonly', store => store.get(id)).catch(() => null);
      if (existing && !scoped(existing)) throw new Error('invalid-session-owner');
      try {
        await transaction(sessionsStoreName, 'readwrite', store => store.delete(id));
        durable = true;
      } catch { /* A local tombstone hides an inaccessible IDB record. */ }
      try {
        if (durable) localStorage.removeItem(prefix + id);
        else localStorage.setItem(prefix + id, JSON.stringify({ id, ownerUid, deleted: true, updatedAt: Date.now() }));
      } catch {
        if (!durable) throw new Error('storage-write-failed');
      }
    });
  }
  function clearSessions() {
    return queue(async () => {
      let durable = false;
      try {
        const records = await transaction(sessionsStoreName, 'readonly', store => store.getAll());
        await transaction(sessionsStoreName, 'readwrite', store => { for (const record of records || []) if (scoped(record)) store.delete(record.id); });
        durable = true;
      } catch { /* Fallback below. */ }
      try {
        localStorage.setItem(clearedKey, String(Date.now()));
        for (const record of fallbackRecords()) if (record?.id) localStorage.removeItem(prefix + record.id);
      } catch {
        if (!durable) throw new Error('storage-write-failed');
      }
    });
  }
  function readSettingFromLocalStorage(key) {
    try { return JSON.parse(localStorage.getItem(settingsStorageKey) || '{}')[key]; } catch { return undefined; }
  }
  function writeSettingToLocalStorage(key, value) {
    try {
      const settings = JSON.parse(localStorage.getItem(settingsStorageKey) || '{}');
      settings[key] = value;
      localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    } catch { /* Optional preference. */ }
  }
  async function loadSettingFromIndexedDb(key) {
    try { return (await transaction(settingsStoreName, 'readonly', store => store.get(key)))?.value ?? null; } catch { return null; }
  }
  async function saveSettingToIndexedDb(key, value) {
    try { await transaction(settingsStoreName, 'readwrite', store => store.put({ key, value, updatedAt: Date.now() })); } catch { /* localStorage retains preferences. */ }
  }
  return { loadSessions, saveSession, updateSession, deleteSession, clearSessions, flush: () => writes,
    readSettingFromLocalStorage, writeSettingToLocalStorage, loadSettingFromIndexedDb, saveSettingToIndexedDb };
}

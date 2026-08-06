export function createSessionStore(options) {
  var sessionStorageKey = options.sessionStorageKey;
  var settingsStorageKey = options.settingsStorageKey;
  var dbName = options.dbName;
  var dbVersion = options.dbVersion;
  var sessionsStoreName = options.sessionsStoreName;
  var settingsStoreName = options.settingsStoreName;

  var openDbPromise = null;

  function supportsIndexedDb() {
    return typeof window.indexedDB !== 'undefined';
  }

  function openSessionDatabase() {
    if (!supportsIndexedDb()) {
      return Promise.resolve(null);
    }

    if (openDbPromise) {
      return openDbPromise;
    }

    openDbPromise = new Promise(function (resolve, reject) {
      var request;
      try {
        request = window.indexedDB.open(dbName, dbVersion);
      } catch (error) {
        reject(error);
        return;
      }

      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(sessionsStoreName)) {
          db.createObjectStore(sessionsStoreName, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(settingsStoreName)) {
          db.createObjectStore(settingsStoreName, { keyPath: 'key' });
        }
      };

      request.onsuccess = function () {
        var db = request.result;
        db.onversionchange = function () {
          db.close();
        };
        resolve(db);
      };

      request.onblocked = function () {
        console.warn('IndexedDB on varattu toisessa valilehdessa.');
      };

      request.onerror = function () {
        reject(request.error || new Error('IndexedDB:n avaus epaonnistui.'));
      };
    }).catch(function (error) {
      openDbPromise = null;
      console.warn('IndexedDB ei ole kaytettavissa, kaytetaan localStoragea.', error);
      return null;
    });

    return openDbPromise;
  }

  function loadSessionHistoryFromLocalStorage() {
    try {
      var saved = localStorage.getItem(sessionStorageKey);
      if (!saved) {
        return [];
      }
      var parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Sessiohistorian lataus localStoragesta epaonnistui.', error);
      return [];
    }
  }

  function saveSessionHistoryToLocalStorage(sessionHistory) {
    try {
      localStorage.setItem(sessionStorageKey, JSON.stringify(sessionHistory));
    } catch (error) {
      console.warn('Sessiohistorian tallennus localStorageen epaonnistui.', error);
    }
  }

  function loadSessionsFromIndexedDb() {
    return openSessionDatabase().then(function (db) {
      if (!db) {
        return null;
      }

      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(sessionsStoreName, 'readonly');
          var request = tx.objectStore(sessionsStoreName).getAll();
          request.onsuccess = function () {
            resolve(Array.isArray(request.result) ? request.result : []);
          };
          request.onerror = function () {
            console.warn('Sessiohistorian lataus IndexedDB:sta epaonnistui.', request.error);
            resolve(null);
          };
        } catch (error) {
          console.warn('Sessiohistorian lataus IndexedDB:sta epaonnistui.', error);
          resolve(null);
        }
      });
    });
  }

  function saveSessionsToIndexedDb(sessionHistory) {
    return openSessionDatabase().then(function (db) {
      if (!db) {
        return;
      }

      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(sessionsStoreName, 'readwrite');
          var store = tx.objectStore(sessionsStoreName);
          var keysRequest = store.getAllKeys();

          keysRequest.onsuccess = function () {
            var keepMap = Object.create(null);
            sessionHistory.forEach(function (item) {
              if (!item || !item.id) {
                return;
              }
              keepMap[item.id] = true;
              store.put(item);
            });

            (keysRequest.result || []).forEach(function (id) {
              if (!keepMap[id]) {
                store.delete(id);
              }
            });
          };

          keysRequest.onerror = function () {
            console.warn('Sessiohistorian avainhaku IndexedDB:sta epaonnistui.', keysRequest.error);
          };

          tx.oncomplete = function () { resolve(); };
          tx.onabort = function () {
            console.warn('Sessiohistorian tallennus IndexedDB:hen keskeytyi.', tx.error);
            resolve();
          };
          tx.onerror = function () {
            console.warn('Sessiohistorian tallennus IndexedDB:hen epaonnistui.', tx.error);
            resolve();
          };
        } catch (error) {
          console.warn('Sessiohistorian tallennus IndexedDB:hen epaonnistui.', error);
          resolve();
        }
      });
    });
  }

  function readSettingsFromLocalStorage() {
    try {
      var raw = localStorage.getItem(settingsStorageKey);
      if (!raw) {
        return {};
      }
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function readSettingFromLocalStorage(key) {
    return readSettingsFromLocalStorage()[key];
  }

  function writeSettingToLocalStorage(key, value) {
    try {
      var settings = readSettingsFromLocalStorage();
      settings[key] = value;
      localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    } catch (error) {
      console.warn('Asetuksen tallennus localStorageen epaonnistui.', error);
    }
  }

  function loadSettingFromIndexedDb(key) {
    return openSessionDatabase().then(function (db) {
      if (!db) {
        return null;
      }
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(settingsStoreName, 'readonly');
          var request = tx.objectStore(settingsStoreName).get(key);
          request.onsuccess = function () {
            resolve(request.result ? request.result.value : null);
          };
          request.onerror = function () {
            console.warn('Asetuksen lataus IndexedDB:sta epaonnistui.', request.error);
            resolve(null);
          };
        } catch (error) {
          console.warn('Asetuksen lataus IndexedDB:sta epaonnistui.', error);
          resolve(null);
        }
      });
    });
  }

  function saveSettingToIndexedDb(key, value) {
    return openSessionDatabase().then(function (db) {
      if (!db) {
        return;
      }

      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(settingsStoreName, 'readwrite');
          tx.objectStore(settingsStoreName).put({ key: key, value: value, updatedAt: Date.now() });
          tx.oncomplete = function () { resolve(); };
          tx.onabort = function () {
            console.warn('Asetuksen tallennus IndexedDB:hen keskeytyi.', tx.error);
            resolve();
          };
          tx.onerror = function () {
            console.warn('Asetuksen tallennus IndexedDB:hen epaonnistui.', tx.error);
            resolve();
          };
        } catch (error) {
          console.warn('Asetuksen tallennus IndexedDB:hen epaonnistui.', error);
          resolve();
        }
      });
    });
  }

  return {
    loadSessionHistoryFromLocalStorage: loadSessionHistoryFromLocalStorage,
    saveSessionHistoryToLocalStorage: saveSessionHistoryToLocalStorage,
    loadSessionsFromIndexedDb: loadSessionsFromIndexedDb,
    saveSessionsToIndexedDb: saveSessionsToIndexedDb,
    readSettingFromLocalStorage: readSettingFromLocalStorage,
    writeSettingToLocalStorage: writeSettingToLocalStorage,
    loadSettingFromIndexedDb: loadSettingFromIndexedDb,
    saveSettingToIndexedDb: saveSettingToIndexedDb
  };
}

import { firebaseConfig } from '../../firebase-config.js';

// Pinned browser modules; no build step. Load separately from the local dashboard.
export const SDK_BASE = 'https://www.gstatic.com/firebasejs/13.0.0/';
const APP_NAME = 'MotoDash';
let initialization;

export function getFirebase() {
  if (!initialization) initialization = initialize().catch(error => {
    initialization = undefined; // Allow retry after an offline/CDN failure.
    throw error;
  });
  return initialization;
}

async function initialize() {
  if (!validFirebaseConfig(firebaseConfig)) {
    throw Object.assign(new Error('Invalid MotoDash configuration'), { code: 'app/invalid-config' });
  }
  const [appSDK, sdk] = await Promise.all([
    import(SDK_BASE + 'firebase-app.js'),
    import(SDK_BASE + 'firebase-auth.js')
  ]);
  const existing = appSDK.getApps().find(app => app.name === APP_NAME);
  if (existing && existing.options.projectId !== firebaseConfig.projectId) {
    throw Object.assign(new Error('Firebase project mismatch'), { code: 'app/invalid-config' });
  }
  const app = existing || appSDK.initializeApp(firebaseConfig, APP_NAME);
  const auth = sdk.getAuth(app);
  await sdk.setPersistence(auth, sdk.browserLocalPersistence);
  return { app, auth, sdk };
}

export function validFirebaseConfig(config) {
  return !!config && config.projectId === 'motodash-87bf8'
    && ['apiKey', 'authDomain', 'appId', 'messagingSenderId', 'databaseURL']
      .every(key => typeof config[key] === 'string' && config[key].trim().length > 0)
    && config.authDomain === 'motodash-87bf8.firebaseapp.com'
    && config.databaseURL === 'https://motodash-87bf8-default-rtdb.europe-west1.firebasedatabase.app';
}

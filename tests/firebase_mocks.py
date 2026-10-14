from navigation_helpers import click_action, expand_controls, fill_control, select_control, click_control
"""Browser SDK fixtures only: these do not test deployed Firebase or its rules."""
MOCK_APP = r"""
const apps = [];
window.__mock = {initialize:0,persistence:0,creates:0,logins:0,writes:0,denyProfile:false};
export const getApps = () => apps;
export function initializeApp(options,name) {
  window.__mock.initialize++; const app={options,name}; apps.push(app); return app;
}
"""

MOCK_AUTH = r"""
const listeners = new Set();
const auth={currentUser:JSON.parse(localStorage.getItem('__mockUser') || 'null')};
export const browserLocalPersistence = 'local';
export const getAuth = () => auth;
export async function setPersistence() { window.__mock.persistence++; }
function notify() { localStorage.setItem('__mockUser',JSON.stringify(auth.currentUser)); for(const fn of listeners) fn(auth.currentUser); }
export function onAuthStateChanged(_,fn) { listeners.add(fn); queueMicrotask(()=>fn(auth.currentUser)); return ()=>listeners.delete(fn); }
function fail(code) { throw Object.assign(new Error(code),{code}); }
export async function createUserWithEmailAndPassword(_,email,password) {
  window.__mock.creates++;
  const accounts=JSON.parse(localStorage.getItem('__mockAccounts') || '{}');
  if(accounts[email]) fail('auth/email-already-in-use');
  if(password.length<6) fail('auth/weak-password');
  const user={uid:'fixture-'+Object.keys(accounts).length,email,displayName:null};
  accounts[email]={user,password}; localStorage.setItem('__mockAccounts',JSON.stringify(accounts));
  auth.currentUser=user; notify(); return {user};
}
export async function updateProfile(user,changes) { Object.assign(user,changes); notify(); }
export async function signInWithEmailAndPassword(_,email,password) {
  window.__mock.logins++;
  if(window.__mock.networkFailure) fail('auth/network-request-failed');
  const account=JSON.parse(localStorage.getItem('__mockAccounts') || '{}')[email];
  if(!account || account.password!==password) fail('auth/invalid-credential');
  auth.currentUser=account.user; notify(); return {user:auth.currentUser};
}
export async function signOut() { auth.currentUser=null; notify(); }
"""

MOCK_FIRESTORE = r"""
export const getFirestore = app => ({app});
export const doc = (_, ...parts) => parts.join('/');
export const collection = (_, ...parts) => parts.join('/');
export const serverTimestamp = () => ({__serverTimestamp:true});
function read() { return JSON.parse(localStorage.getItem('__mockProfiles') || '{}'); }
function write(ref,data) {
  if(window.__mock.denyProfile) throw Object.assign(new Error('Denied'),{code:'permission-denied'});
  const records=read(); records[ref]=data; localStorage.setItem('__mockProfiles',JSON.stringify(records)); window.__mock.writes++;window.dispatchEvent(new Event('__mockFirestoreChanged'));
}
export async function runTransaction(_,fn) {
  if(window.__mock.denyData) throw Object.assign(new Error('Offline fixture'),{code:'unavailable'});
  if(window.__mock.denyProfile) throw Object.assign(new Error('Denied'),{code:'permission-denied'});
  const staged=[];
  const result=await fn({get:async ref=>snap(ref,read()[ref]),set:(ref,data)=>staged.push(['set',ref,data]),
    update:(ref,changes)=>staged.push(['set',ref,{...read()[ref],...changes}]),delete:ref=>staged.push(['delete',ref])});
  const records=read();
  for(const [operation,ref,data] of staged) { if(operation==='delete') delete records[ref]; else records[ref]=data; }
  localStorage.setItem('__mockProfiles',JSON.stringify(records)); window.__mock.writes+=staged.length;window.dispatchEvent(new Event('__mockFirestoreChanged'));
  return result;
}
export async function updateDoc(ref,changes) { write(ref,{...read()[ref],...changes}); }
function snap(ref,data) { return {id:ref.split('/').at(-1),ref,exists:()=>!!data,data:()=>structuredClone(data)}; }
export async function getDoc(ref) { if(window.__mock.docFailure?.ref===ref)throw Object.assign(new Error('Injected doc failure'),{code:window.__mock.docFailure.code}); return snap(ref,read()[ref]); }
export async function getDocFromServer(ref) {window.__mock.serverReads=(window.__mock.serverReads || 0)+1;return getDoc(ref);}
export const where=(field,op,value)=>({kind:'where',field,op,value});
export const orderBy=(field,direction='asc')=>({kind:'order',field,direction});
export const limit=value=>({kind:'limit',value});
export const startAfter=value=>({kind:'after',value});
export const query=(path,...filters)=>({path,filters});
export async function getDocs(input) {
  const {path,filters=[]}=typeof input==='string'?{path:input}:input;
  if(window.__mock.queryFailure?.path===path) throw Object.assign(new Error('Injected query failure'),{code:window.__mock.queryFailure.code});
  (window.__mock.queries ||= []).push({path,filters});
  let docs=Object.entries(read()).filter(([key])=>key.startsWith(path+'/') && key.slice(path.length+1).split('/').length===1).map(([key,data])=>snap(key,data));
  const stages={where:0,order:1,after:2,limit:3};
  for(const filter of [...filters].sort((a,b)=>stages[a.kind]-stages[b.kind])) {
    if(filter.kind==='where') docs=docs.filter(doc=> {
      const v=doc.data()[filter.field];
      return filter.op==='=='?v===filter.value:filter.op==='>='?v>=filter.value:filter.op==='<='?v<=filter.value:filter.op==='>'?v>filter.value:filter.op==='<'?v<filter.value:filter.op==='in'?filter.value.includes(v):true;
    });
    if(filter.kind==='order') docs.sort((a,b)=>{
      const comparable=v=>v?.seconds!==undefined?v.seconds*1000+(v.nanoseconds || 0)/1e6:v?.__serverTimestamp?0:v;
      const av=comparable(a.data()[filter.field]),bv=comparable(b.data()[filter.field]);
      // Firestore orders equal field values by document name; the fixture must too.
      const order=av<bv?-1:av>bv?1:a.id<b.id?-1:a.id>b.id?1:0;
      return order*(filter.direction==='desc'?-1:1);
    });
    if(filter.kind==='after') { const i=docs.findIndex(doc=>doc.id===filter.value.id); if(i>=0) docs=docs.slice(i+1); }
    if(filter.kind==='limit') docs=docs.slice(0,filter.value);
  }
  return {docs,empty:docs.length===0,size:docs.length};
}
export async function getDocsFromServer(input) {window.__mock.serverReads=(window.__mock.serverReads || 0)+1;return getDocs(input);}
export async function setDoc(ref,data) { write(ref,data); }
export async function deleteDoc(ref) { const records=read(); delete records[ref]; localStorage.setItem('__mockProfiles',JSON.stringify(records)); }
export function writeBatch(db) { const ops=[]; return {set:(ref,data)=>ops.push(['set',ref,data]),delete:ref=>ops.push(['delete',ref]),
  commit:()=>runTransaction(db,async tx=>{for(const [op,ref,data] of ops) tx[op](ref,data);})}; }
export function onSnapshot(input,next,error) {
  let stopped=false;
  window.__mock.snapshotListeners=(window.__mock.snapshotListeners||0)+1;
  function stop(){if(stopped)return;stopped=true;window.removeEventListener('__mockFirestoreChanged',emit);window.__mock.snapshotListeners--;}
  async function emit(){try{const result=typeof input==='string'?await getDoc(input):await getDocs(input);if(!stopped)next(result);}catch(e){if(!stopped){stop();error?.(e);}}}
  window.addEventListener('__mockFirestoreChanged',emit);queueMicrotask(emit);
  return stop;
}
export const Timestamp={fromMillis:ms=>({seconds:Math.floor(ms/1000),nanoseconds:0})};
"""


def install(context):
    fixtures = {'firebase-app.js': MOCK_APP, 'firebase-auth.js': MOCK_AUTH, 'firebase-firestore.js': MOCK_FIRESTORE}
    def route_sdk(route):
        name = route.request.url.rsplit('/', 1)[-1]
        assert name in fixtures, f'Unexpected SDK requested: {name}'
        route.fulfill(body=fixtures[name], content_type='application/javascript')
    context.route('https://www.gstatic.com/firebasejs/**', route_sdk)


def run_account_tests(browser, base, route_map):
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    route_map(context)
    install(context)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script("window.__unhandled=[]; addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base, wait_until='networkidle')
    click_action(page, '#account-btn')
    page.wait_for_function("!document.querySelector('#auth-submit').disabled")
    assert page.locator('#auth-identity').inner_text() == 'Not signed in'
    page.select_option('#auth-mode', 'register')
    page.fill('#auth-name', 'Test Rider')
    page.fill('#auth-email', 'rider@example.test')
    page.fill('#auth-password', 'short')
    page.fill('#auth-confirm-password', 'short')
    page.click('#auth-submit')
    assert page.evaluate('window.__mock.creates') == 0, 'Native form validation must block short passwords'
    page.fill('#auth-password', 'fixture-password')
    page.fill('#auth-confirm-password', 'fixture-password')
    page.click('#auth-submit')
    page.wait_for_function("document.querySelector('#auth-status').textContent === 'Signed in. Your profile is ready.'")
    assert page.locator('#auth-identity').inner_text() == 'Signed in as Test Rider'
    assert page.locator('#auth-password').input_value() == ''
    assert page.evaluate('window.__mock.initialize') == 1
    assert page.evaluate('window.__mock.persistence') == 1
    records = page.evaluate("JSON.parse(localStorage.getItem('__mockProfiles'))")
    profile = next(iter(records.values()))
    assert set(profile) == {'uid', 'displayName', 'email', 'language', 'createdAt', 'updatedAt'}
    assert profile['displayName'] == 'Test Rider' and profile['language'] == 'en'
    page.select_option('#account-language', 'fi')
    page.wait_for_function("JSON.parse(localStorage.getItem('__mockProfiles'))['users/fixture-0'].language === 'fi'")
    assert page.locator('#auth-logout').inner_text() == 'Kirjaudu ulos'
    page.reload(wait_until='networkidle')
    click_action(page, '#account-btn')
    page.wait_for_function("document.querySelector('#auth-status').textContent.includes('Profiili on valmis')")
    assert page.locator('#auth-identity').inner_text() == 'Kirjautunut: Test Rider'
    assert page.evaluate('window.__mock.initialize') == 1
    page.select_option('#account-language', 'en')
    page.click('#auth-logout')
    page.wait_for_function("document.querySelector('#auth-identity').textContent === 'Not signed in'")
    page.fill('#auth-email', 'rider@example.test')
    page.fill('#auth-password', 'incorrect')
    page.click('#auth-submit')
    page.wait_for_function("document.querySelector('#auth-status').textContent === 'The email or password is incorrect.'")
    page.select_option('#account-language', 'fi')
    assert page.locator('#auth-status').inner_text() == 'S\u00e4hk\u00f6posti tai salasana on virheellinen.'
    page.select_option('#account-language', 'en')
    page.evaluate('window.__mock.networkFailure=true')
    page.fill('#auth-password', 'fixture-password')
    page.click('#auth-submit')
    page.wait_for_function("document.querySelector('#auth-status').textContent.includes('Account connection failed')")
    page.evaluate('window.__mock.networkFailure=false; window.__mock.denyProfile=true')
    page.fill('#auth-password', 'fixture-password')
    page.click('#auth-submit')
    page.wait_for_function("document.querySelector('#auth-status').textContent.includes('profile could not be saved')")
    assert page.locator('#auth-logout').is_visible(), 'Profile failure must not imply Auth failed'
    page.evaluate('window.__mock.denyProfile=false')
    page.click('#auth-retry')
    page.wait_for_function("document.querySelector('#auth-status').textContent === 'Signed in. Your profile is ready.'")
    page.evaluate('window.__mock.denyProfile=true')
    page.select_option('#account-language', 'fi')
    page.wait_for_function("document.querySelector('#auth-status').textContent.startsWith('Kieli tallennettiin')")
    assert page.locator('#auth-retry').is_visible()
    page.evaluate('window.__mock.denyProfile=false')
    page.click('#auth-retry')
    page.wait_for_function("JSON.parse(localStorage.getItem('__mockProfiles'))['users/fixture-0'].language === 'fi'")
    page.select_option('#account-language', 'en')
    guard = page.evaluate("""async () => {
      const {ensureProfile}=await import('./js/firebase/profileRepository.js');
      try { await ensureProfile({uid:'another-user',email:'other@example.test'},'en'); return false; }
      catch { return true; }
    }""")
    assert guard, 'Repository must reject another UID before SDK writes'
    page.set_viewport_size({'width': 320, 'height': 568})
    rect = page.locator('#account-dialog').bounding_box()
    assert rect['x'] >= 0 and rect['x'] + rect['width'] <= 321
    assert rect['y'] >= 0 and rect['y'] + rect['height'] <= 569
    page.screenshot(path=str(__import__('pathlib').Path(__import__('tempfile').gettempdir()) / 'motodash-account-mobile.png'))
    page.press('#account-close', 'Escape')
    assert not page.locator('#account-dialog').is_visible()
    assert not errors, errors
    assert not page.evaluate('window.__unhandled')
    context.close()
    print('PASS: MOCK SDK registration/login/logout, refresh persistence, single initialization, six-field private profile, language sync, form validation, localized errors, denied-profile retry, UID guard, 320px modal and Escape')

    offline = browser.new_context()
    route_map(offline)
    offline.route('https://www.gstatic.com/firebasejs/**', lambda route: route.abort())
    page = offline.new_page()
    page.goto(base, wait_until='networkidle')
    page.wait_for_function('document.body.dataset.ready === "true"')
    click_action(page, '#account-btn')
    page.wait_for_function("document.querySelector('#auth-status').textContent.includes('Account services are unavailable')")
    page.click('#account-close')
    assert page.locator('#start-btn').is_enabled()
    offline.close()
    print('PASS: Firebase CDN failure leaves local dashboard ready and exposes an account retry')

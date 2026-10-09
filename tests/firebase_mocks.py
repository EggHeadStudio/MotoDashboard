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
export const doc = (_,collection,uid) => collection+'/'+uid;
export const serverTimestamp = () => ({__serverTimestamp:true});
function read() { return JSON.parse(localStorage.getItem('__mockProfiles') || '{}'); }
function write(ref,data) {
  if(window.__mock.denyProfile) throw Object.assign(new Error('Denied'),{code:'permission-denied'});
  const records=read(); records[ref]=data; localStorage.setItem('__mockProfiles',JSON.stringify(records)); window.__mock.writes++;
}
export async function runTransaction(_,fn) {
  if(window.__mock.denyProfile) throw Object.assign(new Error('Denied'),{code:'permission-denied'});
  return fn({get:async ref=>({exists:()=>!!read()[ref],data:()=>read()[ref]}),set:write,update:(ref,changes)=>write(ref,{...read()[ref],...changes})});
}
export async function updateDoc(ref,changes) { write(ref,{...read()[ref],...changes}); }
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
    page.click('#account-btn')
    page.wait_for_function("!document.querySelector('#auth-submit').disabled")
    assert page.locator('#auth-identity').inner_text() == 'Not signed in'
    page.select_option('#auth-mode', 'register')
    page.fill('#auth-name', 'Test Rider')
    page.fill('#auth-email', 'rider@example.test')
    page.fill('#auth-password', 'short')
    page.click('#auth-submit')
    assert page.evaluate('window.__mock.creates') == 0, 'Native form validation must block short passwords'
    page.fill('#auth-password', 'fixture-password')
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
    page.click('#account-btn')
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
    page.click('#account-btn')
    page.wait_for_function("document.querySelector('#auth-status').textContent.includes('Account services are unavailable')")
    page.click('#account-close')
    assert page.locator('#start-btn').is_enabled()
    offline.close()
    print('PASS: Firebase CDN failure leaves local dashboard ready and exposes an account retry')

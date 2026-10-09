"""Batch 2 UI tests with SDK fixtures. Permissions are tested separately in the real emulator."""
from firebase_mocks import install

def register(page,email='garage@example.test'):
    page.click('#account-btn')
    page.wait_for_function('!document.querySelector("#auth-submit").disabled')
    page.select_option('#auth-mode','register')
    page.fill('#auth-name','Garage Rider')
    page.fill('#auth-email',email)
    page.fill('#auth-password','fixture-password')
    page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")')
    page.click('#account-close')

def open_garage(page):
    page.click('#garage-btn')
    page.wait_for_function('!document.querySelector("#garage-add").disabled')

def add_vehicle(page,name,category):
    page.click('#garage-add')
    page.fill('#vehicle-form-nickname',name)
    page.select_option('#vehicle-form-category',category)
    page.fill('#vehicle-form-manufacturer','Maker')
    page.fill('#vehicle-form-model','Model')
    page.fill('#vehicle-form-modelYear','2025')
    page.locator('#vehicle-form button[type=submit]').click()
    page.wait_for_selector('#garage-add')

def run_batch2_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844})
    route_map(context); install(context)
    page=context.new_page(); errors=[]
    page.add_init_script("""window.__geo={active:0}; Object.defineProperty(navigator,'geolocation',{value:{
      watchPosition(fn){window.__geo.callback=fn;window.__geo.active=1;return 1;},clearWatch(){window.__geo.active=0;}}});
      Element.prototype.requestFullscreen=undefined; navigator.wakeLock=undefined;""")
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base,wait_until='networkidle')
    page.click('#garage-btn')
    assert 'Sign in' in page.locator('#garage-dialog').inner_text()
    page.locator('#garage-dialog .feature-header button').click()
    register(page)
    open_garage(page)
    add_vehicle(page,'Road Bike','motorcycle'); add_vehicle(page,'Family Car','car')
    assert page.locator('#garage-dialog article').count()==2
    bike=page.locator('#garage-dialog article').filter(has_text='Road Bike')
    bike.get_by_role('button',name='Edit',exact=True).click()
    page.fill('#vehicle-form-nickname','Touring Bike')
    page.locator('#vehicle-form button[type=submit]').click()
    page.wait_for_selector('#garage-add')
    bike=page.locator('#garage-dialog article').filter(has_text='Touring Bike')
    bike.get_by_role('button',name='Make default',exact=True).click()
    page.wait_for_function('document.querySelector("#garage-dialog").textContent.includes("Default vehicle")')
    guard=page.evaluate("""async()=>{
      const {saveVehicle}=await import('./js/firebase/garageRepository.js');
      try { await saveVehicle('another-account',null,{nickname:'Stolen',category:'car'}); return false; }
      catch(e) { return e.code==='auth-required'; }
    }""")
    assert guard
    page.reload(wait_until='networkidle'); open_garage(page)
    assert page.locator('#garage-dialog article').count()==2
    assert 'Default vehicle' in page.locator('#garage-dialog').inner_text()
    page.on('dialog',lambda d:d.accept('Vehicle Ride' if d.type=='prompt' else None))
    for name,category in [('Touring Bike','motorcycle'),('Family Car','car')]:
        page.locator('#garage-dialog article').filter(has_text=name).get_by_role('button',name='Choose for ride',exact=True).click()
        assert name in page.locator('#selected-vehicle').inner_text()
        page.click('#start-btn')
        assert page.locator('#dashboard-vehicle').inner_text()==name
        page.click('#finish-session-btn')
        page.wait_for_selector('#start-overlay',state='visible')
        open_garage(page)
    rides=page.evaluate("""async()=>{const {createSessionStore}=await import('./js/session-store.js');
      const {getAccount}=await import('./js/auth-state.js'); const c=await import('./js/config.js'); return (await createSessionStore({ownerUid:getAccount()?.uid,sessionStorageKey:c.SESSION_STORAGE_KEY,
      settingsStorageKey:c.SETTINGS_STORAGE_KEY,dbName:c.DB_NAME,dbVersion:c.DB_VERSION,sessionsStoreName:c.SESSIONS_STORE_NAME,
      settingsStoreName:c.SETTINGS_STORE_NAME}).loadSessions()).filter(r=>r.status==='completed');}""")
    assert {r['category'] for r in rides}=={'motorcycle','car'}
    assert all(r['vehicleId'] and r['vehicleSnapshot']['nickname'] for r in rides)
    page.wait_for_function('document.querySelector("#cloud-status").textContent==="Private ride sync complete."')
    cloud=page.evaluate("Object.entries(JSON.parse(localStorage.getItem('__mockProfiles'))).filter(([k,v])=>k.includes('/sessions/') && v.status==='completed')")
    assert len(cloud)==2 and all(v['visibility']=='private' and v['uploadState']=='ready' for _,v in cloud)
    sync_result=page.evaluate("""async()=>{
      const {createSessionStore}=await import('./js/session-store.js'); const c=await import('./js/config.js');
      const {getAccount}=await import('./js/auth-state.js'); const uid=getAccount().uid;
      const store=createSessionStore({ownerUid:uid,sessionStorageKey:c.SESSION_STORAGE_KEY,settingsStorageKey:c.SETTINGS_STORAGE_KEY,
        dbName:c.DB_NAME,dbVersion:c.DB_VERSION,sessionsStoreName:c.SESSIONS_STORE_NAME,settingsStoreName:c.SETTINGS_STORE_NAME});
      const {queueRide,createSessionSync}=await import('./js/session-sync.js');
      const {createSessionRecord}=await import('./js/session-manager.js');
      const now=Date.now()-10000; const routePoints=Array.from({length:300},(_,i)=>({latitude:60+i*0.00001,longitude:25,
        timestamp:now+i,accuracy:5,speedKmh:30,heading:90}));
      let job=queueRide({...createSessionRecord('normal',now),ownerUid:uid,status:'completed',endedAt:now+1000,
        routePoints,name:'Chunk Test',vehicleId:null,vehicleSnapshot:null,category:null});
      await store.saveSession(job); window.__mock.denyData=true;
      const sync=createSessionSync({uid,store,onChange:()=>{},onStatus:()=>{}}); await sync.retry();
      const failed=(await store.loadSessions()).find(r=>r.id===job.id);
      window.__mock.denyData=false; await sync.retry();
      const saved=(await store.loadSessions()).find(r=>r.id===job.id);
      const {uploadSession}=await import('./js/firebase/sessionRepository.js');
      const before=window.__mock.writes;await uploadSession(uid,saved);const after=window.__mock.writes;
      const db=JSON.parse(localStorage.getItem('__mockProfiles'));
      const chunks=Object.entries(db).filter(([k])=>k.includes('/sessions/'+job.id+'/routeChunks/'));
      const otherStore=createSessionStore({ownerUid:'fixture-other',sessionStorageKey:c.SESSION_STORAGE_KEY,settingsStorageKey:c.SETTINGS_STORAGE_KEY,
        dbName:c.DB_NAME,dbVersion:c.DB_VERSION,sessionsStoreName:c.SESSIONS_STORE_NAME,settingsStoreName:c.SETTINGS_STORE_NAME});
      await otherStore.clearSessions();
      return {pending:failed.syncAction,success:saved.syncAction,chunks:chunks.length,max:Math.max(...chunks.map(([,v])=>v.pointCount)),
        duplicateWrites:after-before,other:(await otherStore.loadSessions()).length,preserved:(await store.loadSessions()).some(r=>r.id===job.id)};
    }""")
    assert sync_result=={'pending':'upsert','success':None,'chunks':3,'max':128,'duplicateWrites':0,'other':0,'preserved':True},sync_result
    page.locator('#garage-dialog article').filter(has_text='Family Car').get_by_role('button',name='Delete',exact=True).click()
    page.wait_for_function('document.querySelectorAll("#garage-dialog article").length===1')
    assert any(r['vehicleSnapshot']['nickname']=='Family Car' for r in rides)
    page.select_option('#language-select','fi')
    assert page.locator('#garage-dialog h2').inner_text()=='Autotalli'
    page.set_viewport_size({'width':320,'height':568})
    rect=page.locator('#garage-dialog').bounding_box()
    assert rect['x']>=0 and rect['x']+rect['width']<=321
    page.locator('#garage-dialog .feature-header button').click()
    page.select_option('#language-select','en')
    page.click('#start-btn')
    assert page.evaluate('window.__geo.active')==1
    # Simulate Auth changing in another tab while the dashboard is recording.
    page.evaluate("async()=>{const {logout}=await import('./js/firebase/auth.js');await logout();}")
    page.wait_for_selector('#start-overlay',state='visible')
    assert page.evaluate('window.__geo.active')==0
    page.click('#history-btn')
    assert 'Vehicle Ride' not in page.locator('#history-list').inner_text()
    page.click('#account-btn')
    page.wait_for_function('document.querySelector("#auth-identity").textContent==="Not signed in"')
    page.click('#account-close'); page.click('#garage-btn')
    assert page.locator('#garage-dialog article').count()==0
    assert not errors,errors
    context.close()
    print('PASS: MOCK Garage motorcycle/car create, edit, default, reload, delete, owner guard, logout isolation, Finnish and 320px dialog')
    print('PASS: MOCK vehicle snapshots in two rides, private completed cloud manifests, 300-point bounded chunks, durable failed-job retry, zero duplicate writes, scoped clear and logout during recording')

"""Batch 7 browser integration fixtures; no live account/physical-device claim."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle
import uuid

def run_batch7_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568})
    route_map(context);install(context);page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base,wait_until='networkidle');register(page,'batch7@example.test')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    page.select_option('#public-profile-form-visibility','public');page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    records=page.evaluate('JSON.parse(localStorage.getItem("__mockProfiles"))');entry=next(v for k,v in records.items() if k.startswith('profileDirectory/'))
    assert set(entry)=={'id','displayName','searchName','category','accent','visibility','updatedAt'} and entry['searchName']==entry['displayName'].lower()
    print('PASS: Batch 7: explicit Public save synchronizes a minimal opaque People directory without private fields')
    aliases=[str(uuid.uuid4()) for _ in range(23)]
    page.evaluate('''ids=>{const records=JSON.parse(localStorage.getItem('__mockProfiles'));for(const id of ids){
      records['profileDirectory/'+id]={id,displayName:'MÄKI Rider',searchName:'mäki rider',category:'car',accent:'ocean',visibility:'public',updatedAt:{__serverTimestamp:true}};
      records['publicProfiles/'+id]={id,displayName:'MÄKI Rider',bio:'Public touring',category:'car',accent:'ocean',banner:'road',featuredVehicle:null,vehicleIds:[],affiliationIds:[],updatedAt:{__serverTimestamp:true}};}
      records['users/private-user']={displayName:'MÄKI Private',email:'SECRET@example.test'};
      records['displayProfiles/private-user']={displayName:'MÄKI Private',updatedAt:{__serverTimestamp:true}};
      localStorage.setItem('__mockProfiles',JSON.stringify(records));}''',aliases)
    page.locator('#bottom-nav [data-destination=discover]').click();page.get_by_role('button',name='People',exact=True).click()
    before=page.evaluate('(window.__mock.queries||[]).filter(q=>q.path==="profileDirectory").length')
    page.fill('#people-search-name','m');page.locator('#people-search button[type=submit]').click()
    assert page.evaluate('(window.__mock.queries||[]).filter(q=>q.path==="profileDirectory").length')==before
    page.fill('#people-search-name','  MÄ  ');page.locator('#people-search button[type=submit]').click();page.wait_for_selector('#people-results .person-card')
    assert page.locator('#people-results .person-card').count()==10 and 'SECRET' not in page.locator('#people-results').inner_text() and 'Private' not in page.locator('#people-results').inner_text()
    page.click('#people-more');page.wait_for_function('document.querySelectorAll("#people-results .person-card").length===20')
    page.click('#people-more');page.wait_for_function('document.querySelectorAll("#people-results .person-card").length===23')
    found=page.locator('#people-results .person-card').evaluate_all('(rows)=>rows.map(row=>row.dataset.profileId)')
    assert len(set(found))==23 and set(found)==set(aliases)
    queries=page.evaluate('window.__mock.queries.filter(q=>q.path==="profileDirectory")');assert all(any(f['kind']=='limit' and f['value']==10 for f in q['filters']) for q in queries)
    assert all(any(f['kind']=='where' and f['field']=='searchName' and f['value']=='mä' for f in q['filters']) for q in queries)
    print('PASS: Batch 7: normalized Unicode prefix search uses bounded server queries and pages duplicate names without private recipient search')
    page.locator('#people-results .person-card a').first.click();page.wait_for_selector('#screen-rider h1');assert page.locator('#screen-rider h1').inner_text()=='MÄKI Rider'
    page.reload(wait_until='networkidle');page.wait_for_selector('#screen-rider h1');assert page.locator('#screen-rider h1').inner_text()=='MÄKI Rider'
    print('PASS: Batch 7: People opens stable public profile routes and reloads under the Pages subpath')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    page.select_option('#public-profile-form-visibility','private');page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    assert page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["profileDirectory/"+id]===undefined',entry['id'])
    print('PASS: Batch 7: making a profile Private atomically removes its search entry')
    page.locator('#bottom-nav [data-destination=discover]').click();page.select_option('#language-select','fi');page.get_by_role('button',name='Ihmiset',exact=True).click()
    assert page.get_by_label('Julkinen näyttönimi').is_visible()
    rect=page.locator('#people-search').bounding_box();assert rect['x']>=0 and rect['x']+rect['width']<=321
    assert not errors,errors
    print('PASS: Batch 7: Finnish People controls and 320px mobile layout')
    page.select_option('#language-select','en');page.keyboard.press('Escape')
    open_garage(page);add_vehicle(page,'Selected Bike','motorcycle');add_vehicle(page,'Private Car','car')
    bike=page.locator('#garage-dialog .vehicle-card').filter(has=page.get_by_role('heading',name='Selected Bike',exact=True))
    assert 'Private · not shown on profile' in bike.inner_text()
    bike.get_by_role('button',name='Show on profile',exact=True).click();page.wait_for_selector('#showcase-form')
    page.fill('#showcase-form-description','Public weekend trips');page.check('#showcase-form-consent');page.locator('#showcase-form button[type=submit]').click();page.wait_for_function('!document.getElementById("showcase-editor")')
    assert 'Selected · profile is Private' in bike.inner_text() and 'Featured vehicle' in bike.inner_text()
    page.locator('#garage-dialog').get_by_role('link',name='Preview as visitor',exact=True).click();page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider .vehicle-card').count()==0 and 'unavailable' in page.locator('#screen-rider').inner_text().lower()
    print('PASS: Batch 7: Garage distinguishes unpublished/selected/private/featured state; visitor preview cannot use owner private access')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    page.select_option('#public-profile-form-visibility','public');page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    open_garage(page);car=page.locator('#garage-dialog .vehicle-card').filter(has=page.get_by_role('heading',name='Private Car',exact=True))
    car.get_by_role('button',name='Show on profile',exact=True).click();page.wait_for_selector('#showcase-form')
    page.check('#showcase-form-consent');page.locator('#showcase-form button[type=submit]').click();page.wait_for_function('!document.getElementById("showcase-editor")')
    car.get_by_role('button',name='Set as featured vehicle',exact=True).click();page.wait_for_function('document.querySelector("#garage-dialog").getAttribute("aria-busy")!=="true" && document.querySelector("#garage-dialog .feature-body").getAttribute("aria-busy")!=="true"')
    page.wait_for_function('Array.from(document.querySelectorAll("#garage-dialog .vehicle-card")).find(row=>row.textContent.includes("Private Car")).textContent.includes("Featured vehicle")')
    page.locator('#garage-dialog').get_by_role('link',name='Preview as visitor',exact=True).click();page.wait_for_selector('#screen-rider .vehicle-card')
    assert page.locator('#screen-rider .vehicle-card').count()==2 and page.locator('#screen-rider .vehicle-card h3').first.inner_text()=='Private Car'
    print('PASS: Batch 7: direct Garage featured selection and public preview preserve selected safe cards')
    # Owner-readable retained card cannot claim to be visible after source privacy changes.
    page.evaluate('''()=>{const records=JSON.parse(localStorage.getItem('__mockProfiles'));const key=Object.keys(records).find(key=>key.startsWith('users/fixture-0/vehicles/')&&records[key].nickname==='Private Car');records[key].visibility='private';localStorage.setItem('__mockProfiles',JSON.stringify(records));}''')
    page.reload(wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider .vehicle-card').count()==1 and 'Private Car' not in page.locator('#screen-rider').inner_text()
    open_garage(page);car=page.locator('#garage-dialog .vehicle-card').filter(has=page.get_by_role('heading',name='Private Car',exact=True))
    assert 'unavailable to visitors' in car.inner_text()
    car.get_by_role('button',name='Hide from profile',exact=True).click();page.wait_for_function('Array.from(document.querySelectorAll("#garage-dialog .vehicle-card")).find(row=>row.textContent.includes("Private Car")).textContent.includes("Private · not shown")')
    print('PASS: Batch 7: visitor preview denies retained private source cards and direct Hide removes publication without deleting Garage')
    assert not errors,errors
    context.close()
    context=browser.new_context(viewport={'width':390,'height':844});route_map(context);install(context);page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''let library;Object.defineProperty(window,'L',{configurable:true,get:()=>library,set:value=>{library=value;const factory=value.map;value.map=function(...args){const map=factory(...args);window.__cameraMap=map;return map;};}});
      window.__geo={count:0,active:0};Object.defineProperty(navigator,'geolocation',{value:{watchPosition(success){window.__geo.callback=success;window.__geo.count++;window.__geo.active++;return 1;},clearWatch(){window.__geo.active=0;},getCurrentPosition(){}}});
      window.__fix=(v)=>{const [lat,lon,speed,time,heading=90,accuracy=5]=v;const original=Date.now;Date.now=()=>time;try{window.__geo.callback?.({timestamp:time,coords:{latitude:lat,longitude:lon,speed:speed/3.6,heading,accuracy}});}finally{Date.now=original;}};
      Element.prototype.requestFullscreen=undefined;navigator.wakeLock=undefined;''')
    page.goto(base,wait_until='networkidle');output=page.evaluate('async()=> (await import("./tests/camera-tests.js")).runCameraTests()');print('PASS: Batch 7:',output)
    page.click('#landing-try');page.locator('#screen-home details').filter(has=page.locator('#follow-zoom')).locator('summary').click();page.select_option('#follow-zoom','14')
    page.locator('#start-btn').click();page.wait_for_function('window.__geo.active===1');at=page.evaluate('Date.now()')
    for i in range(5):page.evaluate('(v)=>window.__fix(v)',[60+i*.00009,25,36,at+i*1000,90])
    page.wait_for_timeout(750);assert page.evaluate('window.__cameraMap.getZoom()')<=14
    page.click('#heading-btn');page.evaluate('(v)=>window.__fix(v)',[60.0005,25,36,at+6000,90]);page.wait_for_timeout(1600)
    assert 'scale(' not in page.locator('#map').evaluate('(node)=>node.style.transform')
    size=page.locator('#map').evaluate('(node)=>({w:node.offsetWidth,h:node.offsetHeight})');assert size['w']==size['h'] and size['w']>=928
    assert page.evaluate('window.__geo.count')==1 and page.locator('#hud').evaluate('(node)=>getComputedStyle(node).transform')=='none'
    print('PASS: Batch 7: real Leaflet heading coverage has no visual magnification, honors follow zoom and retains one GPS watcher')
    # Deliberate manual zoom stays untouched until explicit Center.
    page.dispatch_event('#map','pointerdown',{'pointerType':'mouse','clientX':150,'clientY':400})
    page.evaluate('window.__cameraMap.setZoom(17,{animate:false})');before=page.evaluate('window.__cameraMap.getCenter()')
    for i in range(5):page.evaluate('(v)=>window.__fix(v)',[60.0006+i*.0002,25,100,at+7000+i*1000,80])
    page.wait_for_timeout(800);assert page.evaluate('window.__cameraMap.getZoom()')==17 and page.evaluate('window.__cameraMap.getCenter()')==before
    page.click('#center-btn');page.wait_for_timeout(800);assert page.evaluate('window.__cameraMap.getZoom()')<17
    page.click('#heading-btn');page.wait_for_function('document.querySelector("#map").style.transform==="rotate(0deg)"');assert page.locator('#map').evaluate('(node)=>node.offsetWidth')==390
    points=page.evaluate('''async()=>{const c=await import('./js/config.js');const {createSessionStore}=await import('./js/session-store.js');
      const store=createSessionStore({sessionStorageKey:c.SESSION_STORAGE_KEY,settingsStorageKey:c.SETTINGS_STORAGE_KEY,dbName:c.DB_NAME,dbVersion:c.DB_VERSION,sessionsStoreName:c.SESSIONS_STORE_NAME,settingsStoreName:c.SETTINGS_STORE_NAME,ownerUid:null});return (await store.loadSessions()).find(ride=>ride.status==='active').routePoints.filter(p=>!p.break);}''')
    allowed_lats=[60+i*.00009 for i in range(5)]+[60.0005]+[60.0006+i*.0002 for i in range(5)]
    assert points and all(any(abs(point['latitude']-lat)<1e-10 for lat in allowed_lats) for point in points)
    assert all(point['speedKmh'] in [36,100] for point in points)
    assert not errors,errors
    print('PASS: Batch 7: manual zoom/pan pauses follow, explicit Center resumes, north-up restores coverage and saved GPS remains original')
    page.on('dialog',lambda dialog:dialog.accept('Recorded camera ride' if dialog.type=='prompt' else None))
    page.click('#finish-session-btn');page.wait_for_function('window.__geo.active===0');page.click('#guest-history')
    page.locator('#history-list button[data-action=open]').click();page.wait_for_selector('#saved-ride-title')
    assert page.locator('#saved-ride-title').inner_text()=='Recorded camera ride'
    for selector in ['#speed-block','#time-panel','#weather-panel','#gps-panel','#network-panel','#heading-btn','#center-btn','#finish-session-btn','#live-dashboard']:
        assert page.locator(selector).is_hidden(),selector
    assert page.locator('#history-detail .saved-ride-stats').is_visible() and page.evaluate('window.__geo.active')==0
    page.select_option('#saved-language','fi');assert page.locator('#saved-back').inner_text()=='Takaisin ajohistoriaan'
    assert 'Ei tallennettu' in page.locator('#history-detail').inner_text() and 'Tallennettu ajoneuvo' in page.locator('#history-detail').inner_text()
    page.select_option('#saved-language','en')
    page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(300)
    assert page.evaluate('Number.isFinite(window.__cameraMap.getCenter().lat) && Number.isFinite(window.__cameraMap.getCenter().lng)')
    assert page.locator('#history-detail').bounding_box()['height']<=391
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
    with page.expect_download() as download:page.locator('#history-detail-actions').get_by_role('button',name='Download JSON',exact=True).click()
    assert download.value.suggested_filename.endswith('.json')
    page.click('#saved-back');assert page.locator('#screen-rides').is_visible() and page.evaluate('window.__geo.active')==0
    assert not page.evaluate('document.body.classList.contains("saved-ride-view")') and not errors,errors
    print('PASS: Batch 7: saved ride has only recorded metadata/route, EN/FI, export and Back to History with no GPS/current telemetry')
    context.close()

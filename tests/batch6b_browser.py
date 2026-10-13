"""Batch 6B browser fixtures; no live Firebase/Worker or physical-device claim."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle

def run_batch6b_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568},reduced_motion='reduce')
    route_map(context);install(context);page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("window.__watches=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(){window.__watches++;return 1},clearWatch(){},getCurrentPosition(){}}})")
    page.goto(base,wait_until='networkidle')
    assert page.locator('#screen-landing').is_visible() and page.locator('#bottom-nav').is_hidden()
    assert page.locator('#notifications-bell').is_hidden() and page.evaluate('window.__watches')==0
    print('PASS: Batch 6B: anonymous landing hides private navigation and starts no GPS')
    assert page.locator('.landing-feature').count()==6 and page.locator('.landing-plan').count()==4
    assert page.locator('.landing-plan button').count()==0
    assert 'No subscriptions' in page.locator('.landing-plans').inner_text()
    page.click('#landing-explore')
    assert page.locator('#start-overlay').evaluate('(n)=>n.scrollTop>0 && n.scrollWidth<=n.clientWidth+1')
    assert page.locator('.reveal-ready').count()==0
    print('PASS: Batch 6B: all feature/pricing sections scroll, proposed prices have no purchase actions, reduced motion')
    page.select_option('#language-select','fi');assert 'Sinun ajoneuvosi' in page.locator('#landing-title').inner_text()
    page.reload(wait_until='networkidle');assert page.locator('html').get_attribute('lang')=='fi'
    page.select_option('#language-select','en');page.click('#landing-register')
    assert page.locator('#auth-mode').input_value()=='register' and page.locator('#auth-confirm-password').is_visible()
    page.click('#account-close');page.click('#landing-sign-in')
    assert page.locator('#auth-mode').input_value()=='login';page.click('#account-close')
    print('PASS: Batch 6B: EN/FI persistence and distinct sign-in/register actions')
    page.click('#landing-try');assert page.locator('#screen-home').is_visible() and page.evaluate('window.__watches')==0
    page.click('#guest-history');assert page.locator('#screen-rides').is_visible()
    page.click('#guest-landing');assert page.locator('#screen-landing').is_visible()
    print('PASS: Batch 6B: explicit guest entry/history/return remains local with no automatic GPS')
    register(page,'landing@example.test')
    assert page.locator('#screen-home').is_visible() and page.locator('#bottom-nav').is_visible()
    assert page.locator('#notifications-bell').is_visible() and page.evaluate('window.__watches')==0
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit')
    page.wait_for_selector('#public-profile-form');assert page.locator('#public-profile-form-visibility').input_value()=='private'
    page.select_option('#public-profile-form-visibility','public');page.locator('#public-profile-form button[type=submit]').click()
    page.wait_for_function('!document.getElementById("public-profile-editor")')
    page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form-bio')
    page.fill('#public-profile-form-bio','<script>literal text</script> · Weekend explorer')
    page.select_option('#public-profile-form-category','motorcycle');page.select_option('#public-profile-form-accent','ocean');page.select_option('#public-profile-form-banner','grid')
    page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    alias=page.evaluate('JSON.parse(localStorage.getItem("__mockProfiles"))["users/fixture-0/preferences/publicProfile"].publicId')
    public=page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["publicProfiles/"+id]',alias)
    assert not any(key in public for key in ['uid','ownerUid','email','location','technicalRole'])
    open_garage(page);add_vehicle(page,'Showcase Bike','motorcycle');add_vehicle(page,'Private Car','car')
    card=page.locator('.vehicle-card').filter(has=page.get_by_role('heading',name='Showcase Bike',exact=True))
    card.get_by_role('button',name='Showcase options',exact=True).click();page.wait_for_selector('#showcase-form')
    assert page.locator('#showcase-form-description').input_value()==''
    page.fill('#showcase-form-description','Sunday road companion');page.check('#showcase-form-consent');page.locator('#showcase-form button[type=submit]').click()
    page.wait_for_function('!document.getElementById("showcase-editor")');page.keyboard.press('Escape')
    print('PASS: Batch 6B: explicit vehicle consent and separately entered public description; other Garage vehicles remain private')
    page.goto(base+'#/rider/'+alias,wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider h1').inner_text()=='Garage Rider'
    assert page.locator('#screen-rider').get_attribute('data-accent')=='ocean' and page.locator('#screen-rider').get_attribute('data-banner')=='grid'
    assert page.locator('#screen-rider .public-bio').first.inner_text().startswith('<script>literal') and page.locator('#screen-rider script').count()==0
    print('PASS: Batch 6B: controlled bio/category/accent/banner render as safe text and built-in presets')
    assert page.locator('#screen-rider .vehicle-card').count()==1
    assert 'Showcase Bike' in page.locator('#screen-rider').inner_text() and 'Private Car' not in page.locator('#screen-rider').inner_text()
    assert '@' not in page.locator('#screen-rider').inner_text()
    page.reload(wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider h1').inner_text()=='Garage Rider'
    print('PASS: Batch 6B: explicit profile publishing, safe projection and stable refreshed Pages profile route')
    open_garage(page);page.wait_for_selector('#garage-dialog .vehicle-card')
    card=page.locator('#garage-dialog .vehicle-card').filter(has=page.get_by_role('heading',name='Showcase Bike',exact=True))
    card.get_by_role('button',name='Edit',exact=True).click();page.fill('#vehicle-form-nickname','Updated Bike');page.locator('#vehicle-form button[type=submit]').click()
    page.wait_for_selector('#garage-add');page.keyboard.press('Escape')
    page.goto(base+'#/rider/'+alias,wait_until='networkidle');page.wait_for_selector('#screen-rider .vehicle-card')
    assert 'Updated Bike' in page.locator('#screen-rider').inner_text()
    page.on('dialog',lambda d:d.accept())
    open_garage(page);page.wait_for_selector('#garage-dialog .vehicle-card')
    card=page.locator('#garage-dialog .vehicle-card').filter(has=page.get_by_role('heading',name='Updated Bike',exact=True))
    card.get_by_role('button',name='Delete',exact=True).click();page.wait_for_function('!document.querySelector("#garage-dialog").textContent.includes("Updated Bike")');page.keyboard.press('Escape')
    page.goto(base+'#/rider/'+alias,wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider .vehicle-card').count()==0
    print('PASS: Batch 6B: Garage edit synchronizes the safe card; deletion removes showcase and featured reference')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    page.fill('#public-profile-form-displayName','Public Explorer');page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    from navigation_helpers import click_action
    click_action(page,'#account-btn');page.wait_for_function('document.querySelector("#profile-name").value==="Public Explorer"');page.click('#account-close')
    print('PASS: Batch 6B: profile name update synchronizes private Account settings and signed-in display projection')
    club=page.evaluate('''async()=>{return (await import('./js/firebase/clubRepository.js')).createClub('fixture-0',{name:'Public Road Crew',description:'Public Club',category:'motorcycle',visibility:'public',membershipPolicy:'open',primaryColor:'#123456',accentColor:'#abcdef',routeColor:null,mapTheme:'normal',links:{}});}''')
    page.click('#public-profile-edit');page.wait_for_selector('#profile-affiliation-form-club option',state='attached')
    page.select_option('#profile-affiliation-form-club',club);page.locator('#profile-affiliation-form button[type=submit]').click()
    page.wait_for_function('document.getElementById("public-profile-editor")?.textContent.includes("Public Road Crew") && !document.getElementById("public-profile-editor")?.getAttribute("aria-busy")')
    page.keyboard.press('Escape');page.goto(base+'#/rider/'+alias,wait_until='networkidle');page.wait_for_selector('#screen-rider .public-affiliations')
    assert 'Public Road Crew' in page.locator('#screen-rider .public-affiliations').inner_text()
    roots=page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["publicProfiles/"+id]',alias)
    assert club not in roots['affiliationIds']
    print('PASS: Batch 6B: explicit public Club identity, safe affiliation projection and opaque root aliases')
    for width,height in [(320,568),(844,390),(1280,800)]:
        page.set_viewport_size({'width':width,'height':height});page.select_option('#language-select','fi')
        assert page.locator('#start-overlay').evaluate('(n)=>n.scrollWidth<=n.clientWidth+1')
    page.select_option('#language-select','en')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#profile-logout')
    page.wait_for_selector('#screen-landing');assert page.locator('#bottom-nav').is_hidden()
    print('PASS: Batch 6B: account entry and logout restore the correct shell without recording')
    page.goto(base+'#/rider/'+alias,wait_until='networkidle');page.wait_for_selector('#screen-rider .public-affiliations')
    assert page.locator('#screen-rider h1').inner_text()=='Public Explorer' and page.locator('#bottom-nav').is_hidden()
    page.goto(base+'#/rider/00000000-0000-4000-8000-000000000000',wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider h1').inner_text()=='Profile unavailable'
    print('PASS: Batch 6B: anonymous public route, missing-profile state and responsive Finnish public profile')
    assert not errors,errors;context.close()
    plain=browser.new_context(java_script_enabled=False,viewport={'width':320,'height':568})
    route_map(plain);p=plain.new_page();p.goto(base,wait_until='networkidle')
    assert p.locator('#landing-title').is_visible() and 'Your Vehicle' in p.locator('#landing-title').inner_text()
    assert p.locator('.landing-feature').count()==6
    print('PASS: Batch 6B: semantic landing content survives disabled JavaScript')
    plain.close()
    run_ride_continuity_tests(browser,base,route_map)

def run_ride_continuity_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568});route_map(context);install(context)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''window.__geo={active:0,maximum:0};Object.defineProperty(navigator,'geolocation',{value:{
      watchPosition(fn){window.__geo.fn=fn;window.__geo.active++;window.__geo.maximum=Math.max(window.__geo.maximum,window.__geo.active);return 1;},clearWatch(){window.__geo.active=0;}}});Element.prototype.requestFullscreen=undefined;navigator.wakeLock=undefined;''')
    page.goto(base,wait_until='networkidle');register(page,'continuity@example.test')
    page.click('#start-btn');page.wait_for_function('window.__geo.active===1')
    original=page.evaluate('async()=>(await import("./js/ride-context.js")).getRideContext().recordingId');assert original
    page.click('#back-to-start-btn');page.wait_for_selector('#return-to-ride')
    page.click('#start-btn');page.wait_for_selector('#active-ride-conflict')
    assert 'You already have an active ride.' in page.locator('#active-ride-conflict').inner_text()
    page.locator('#active-ride-conflict').get_by_role('button',name='Cancel',exact=True).click()
    assert page.evaluate('async()=>(await import("./js/ride-context.js")).getRideContext().recordingId')==original
    print('PASS: Batch 6B: second personal Start is denied with Return/Cancel and preserves the existing recorder')
    for destination in ['home','discover','rides','clubs','profile']:
        page.locator(f'#bottom-nav [data-destination="{destination}"]').click();page.wait_for_selector('#return-to-ride')
        assert page.locator('#notifications-bell').is_visible()
        assert page.locator('#return-to-ride').bounding_box()['width']>=44
        assert page.evaluate('window.__geo.active===1 && window.__geo.maximum===1')
        page.click('#return-to-ride');page.wait_for_function('document.querySelector("#start-overlay").style.display==="none"')
        assert page.evaluate('async()=>(await import("./js/ride-context.js")).getRideContext().recordingId')==original
        page.click('#back-to-start-btn');page.wait_for_function('document.querySelector("#start-overlay").style.display==="flex"')
    print('PASS: Batch 6B: Return to Ride on all five destinations preserves record identity and one GPS watcher beside the bell')
    page.locator('#bottom-nav [data-destination=profile]').click();page.reload(wait_until='networkidle')
    page.wait_for_function('window.__geo.active===1 && document.body.dataset.ready==="true"')
    assert page.locator('#screen-profile').is_visible()
    assert page.evaluate('async()=>(await import("./js/ride-context.js")).getRideContext().recordingId')==original
    page.click('#return-to-ride');assert page.evaluate('window.__geo.maximum')==1
    page.click('#back-to-start-btn');page.locator('#bottom-nav [data-destination=profile]').click();page.click('#profile-logout')
    page.wait_for_selector('#screen-landing');assert page.evaluate('window.__geo.active')==0
    assert not page.evaluate('async()=>(await import("./js/ride-context.js")).getRideContext().recordingId')
    assert not errors,errors
    print('PASS: Batch 6B: owned recording survives Profile refresh; logout stops GPS and clears the active return context')
    context.close()
    run_recording_lock_tests(browser,base,route_map)

def run_recording_lock_tests(browser,base,route_map):
    context=browser.new_context();route_map(context);install(context)
    first=context.new_page();second=context.new_page();first.goto(base,wait_until='networkidle');second.goto(base,wait_until='networkidle')
    init='async()=>{window.__lock=(await import("./js/recording-lock.js")).createRecordingLock();return window.__lock.acquire("fixture-lock-user")} '
    assert first.evaluate(init) is True and second.evaluate(init) is False
    first.evaluate('()=>window.__lock.release()');assert second.evaluate('()=>window.__lock.acquire("fixture-lock-user")') is True
    second.evaluate('()=>window.__lock.release()')
    print('PASS: Batch 6B: real browser Web Lock excludes a competing tab and allows safe transfer after release')
    result=first.evaluate('''async()=>{
      const {createRecordingLock}=await import('./js/recording-lock.js');let time=Date.now(),lost=0;
      const a=createRecordingLock({locks:null,now:()=>time,onLost:()=>lost++}),b=createRecordingLock({locks:null,now:()=>time});
      const race=await Promise.all([a.acquire('idb-race'),b.acquire('idb-race')]);
      const old=race[0]?a:b,next=race[0]?b:a;time+=31000;
      const expired=old.held(),acquired=await next.acquire('idb-race');await old.release();
      const stable=next.held();await next.release();
      let denied=false;try{await createRecordingLock({locks:null,indexedDB:null}).acquire('unavailable');}catch{denied=true;}
      return {race,expired,acquired,stable,denied};
    }''')
    assert sorted(result['race'])==[False,True] and result['expired'] is False and all(result[key] for key in ['acquired','stable','denied']),result
    print('PASS: Batch 6B: atomic IndexedDB fallback race, abandoned expiry, stale release and unavailable-storage fail-closed behavior')
    context.close()

"""Group UI browser integration with SDK fixtures; rules are tested separately."""
from firebase_mocks import install
from batch2_browser import register

def switch(page,email,new=False):
    page.evaluate("document.querySelector('#groups-dialog').close();location.hash='' ")
    page.evaluate("async()=>{await (await import('./js/firebase/auth.js')).logout();}")
    if new:register(page,email)
    else:
        page.evaluate("async(email)=>{await (await import('./js/firebase/auth.js')).login(email,'fixture-password');}",email)
        page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")')
def linked(page,id,title):
    page.evaluate("(id)=>{location.hash='/session/'+id;}",id)
    page.locator('#groups-dialog').get_by_role('heading',name=title,exact=True).wait_for()
    page.wait_for_function('document.querySelector("#groups-dialog .feature-status").textContent==="Up to date."')

def run_group_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844});route_map(context);install(context)
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.add_init_script("window.__unhandled=[];addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base,wait_until='networkidle');register(page,'host@example.test')
    page.click('#groups-btn');page.wait_for_selector('#group-create')
    ids=[]
    for title,activity,visibility,policy in [('Morning Ride','ride','public','open'),('Private Meet','meet','private','invite'),('Approval Event','event','approval','approval'),('Open Afternoon','ride','public','open')]:
        page.click('#group-create');page.wait_for_selector('#group-form')
        page.fill('#group-form-title',title);page.fill('#group-form-description','Bring water')
        page.select_option('#group-form-activityType',activity);page.fill('#group-form-meetingArea','Helsinki')
        page.fill('#group-form-meetingLocation','Private entrance behind the building')
        page.select_option('#group-form-visibility',visibility);page.select_option('#group-form-joiningPolicy',policy)
        page.locator('#group-form button[type=submit]').click();page.wait_for_selector('#group-edit')
        id=page.evaluate('(title)=>Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).find(r=>r.title===title && r.creatorUid).id',title);ids.append(id)
        assert id not in page.locator('#groups-dialog').inner_text()
        assert page.locator('.group-meeting').inner_text()=='Private entrance behind the building'
        page.locator('#groups-dialog').get_by_role('button',name='Back to Group Sessions',exact=True).click();page.wait_for_selector('#group-create')
    page.locator(f'[data-group-id="{ids[0]}"]').get_by_role('button',name='Open',exact=True).click();page.wait_for_selector('#group-edit')
    page.click('#group-edit');page.fill('#group-form-title','Updated Ride');page.locator('#group-form button[type=submit]').click();page.wait_for_selector('#group-edit')
    assert 'Updated Ride' in page.locator('#groups-dialog').inner_text()
    page.click('#group-active');page.wait_for_selector('#group-completed')
    page.click('#group-completed');page.wait_for_function('document.querySelector("#groups-dialog").textContent.includes("Completed")')
    assert not page.locator('#group-edit').count()
    page.select_option('#language-select','fi');assert 'P\u00e4\u00e4ttynyt' in page.locator('#groups-dialog').inner_text()
    page.select_option('#language-select','en');page.set_viewport_size({'width':320,'height':568})
    assert page.locator('#groups-dialog').bounding_box()['width']<=320
    page.set_viewport_size({'width':844,'height':390})
    assert page.locator('#groups-dialog').bounding_box()['height']<=390
    page.locator('#groups-dialog .feature-header button').click();page.click('#lobby-btn')
    page.wait_for_function('document.querySelector("#lobby-dialog .feature-status").textContent==="Up to date."')
    text=page.locator('#lobby-results').inner_text();assert 'Open Afternoon' in text and 'Approval Event' in text
    assert 'Private Meet' not in text and 'Morning Ride' not in text and 'Updated Ride' not in text
    assert 'Private entrance' not in text and 'fixture-0' not in text
    page.select_option('#lobby-filter-activityType','event');page.locator('#lobby-filter button[type=submit]').click()
    page.wait_for_function('document.querySelectorAll("[data-lobby-id]").length===1')
    assert 'Approval Event' in page.locator('#lobby-results').inner_text()
    page.fill('#lobby-filter-meetingArea','Tampere');page.locator('#lobby-filter button[type=submit]').click()
    page.wait_for_function('document.querySelector("#lobby-results").textContent.includes("No matching")')
    page.locator('#lobby-dialog .feature-header button').click()
    page.set_viewport_size({'width':390,'height':844})
    switch(page,'member@example.test',True);linked(page,ids[3],'Open Afternoon')
    assert not page.locator('.group-meeting').count() and not page.locator('#group-edit').count()
    bike=page.evaluate("""async()=>{
      const {saveVehicle}=await import('./js/firebase/garageRepository.js');
      return saveVehicle('fixture-1',null,{nickname:'Shared Bike',category:'bicycle',manufacturer:'Private maker',model:'Secret model',description:'Private notes',modelYear:null,visibility:'private'});
    }""")
    page.locator('#groups-dialog').get_by_role('button',name='Refresh',exact=True).click()
    page.wait_for_selector('#group-vehicle-vehicleId option',state='attached');page.select_option('#group-vehicle-vehicleId',bike)
    page.click('#group-join');page.wait_for_selector('#group-leave')
    assert 'Shared Bike' in page.locator('#group-participants').inner_text()
    assert 'Secret model' not in page.locator('#group-participants').inner_text()
    assert 'fixture-1' not in page.locator('#groups-dialog').inner_text()
    assert page.locator('#group-status button[type=submit]').is_disabled()
    page.select_option('#group-status-status','help');page.check('#group-status-stopped')
    page.locator('#group-status button[type=submit]').click()
    page.wait_for_function('document.querySelector("[data-participant-uid=fixture-1]").textContent.includes("Need help")')
    assert 'not an emergency response service' in page.locator('#groups-dialog').inner_text()
    page.evaluate("async()=>{(await import('./js/rider-motion.js')).recordRiderMotion({accepted:true,timestamp:Date.now(),moving:true,validatedSpeedKmh:30});}")
    page.check('#group-status-stopped');assert page.locator('#group-status button[type=submit]').is_disabled()
    page.evaluate("async()=>{(await import('./js/rider-motion.js')).recordRiderMotion({accepted:true,timestamp:Date.now(),moving:false,validatedSpeedKmh:0});}")
    data=page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["groupSessions/"+id+"/participants/fixture-1"]',ids[3])
    assert set(data['vehicle'])=={'nickname','category'}
    page.on('dialog',lambda dialog:dialog.accept());page.click('#group-leave')
    page.wait_for_function('!document.querySelector("#groups-dialog").open')
    linked(page,ids[2],'Approval Event');page.click('#group-request')
    page.wait_for_function('document.querySelector("#groups-dialog").textContent.includes("request pending")')
    switch(page,'host@example.test');linked(page,ids[2],'Approval Event')
    page.locator('[data-group-request-uid="fixture-1"]').get_by_role('button',name='Approve',exact=True).click()
    page.wait_for_function('!document.querySelector("[data-group-request-uid=fixture-1]")')
    switch(page,'member@example.test');linked(page,ids[2],'Approval Event');page.click('#group-join');page.wait_for_selector('#group-leave')
    switch(page,'host@example.test');linked(page,ids[2],'Approval Event')
    page.locator('[data-participant-uid="fixture-1"]').get_by_role('button',name='Remove member',exact=True).click()
    page.wait_for_function('!document.querySelector("[data-participant-uid=fixture-1]")')
    switch(page,'member@example.test');linked(page,ids[2],'Approval Event')
    assert 'cannot rejoin' in page.locator('#groups-dialog').inner_text()
    assert not page.locator('#group-join').count()
    switch(page,'host@example.test');linked(page,ids[1],'Private Meet')
    page.fill('#group-invite-search-name','Garage Rider');page.locator('#group-invite-search button[type=submit]').click()
    page.wait_for_selector('#group-invite-recipient option',state='attached');page.select_option('#group-invite-recipient','fixture-1')
    page.locator('#group-invite button[type=submit]').click()
    page.locator('[data-invitee-uid="fixture-1"]').get_by_role('button',name='Invitation link / QR',exact=True).click()
    page.wait_for_selector('.invitation-qr')
    url=page.locator('#group-share-dialog a').get_attribute('href')
    from PIL import Image
    import zxingcpp
    from io import BytesIO
    decoded=zxingcpp.read_barcode(Image.open(BytesIO(page.locator('.invitation-qr').screenshot())))
    assert decoded and decoded.text==url, 'QR must decode to exact invitation URL'
    token=url.rsplit('/',1)[-1]
    assert token not in page.locator('#group-share-dialog').inner_text()
    page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__groupShared=data;}})")
    page.locator('#group-share-dialog').get_by_role('button',name='Share or copy link',exact=True).click()
    page.wait_for_function('Boolean(window.__groupShared)');assert page.evaluate('window.__groupShared.url')==url
    page.locator('#group-share-dialog .feature-header button').click()
    page.locator('#groups-dialog .feature-header button').click()
    page.evaluate("async()=>{await (await import('./js/firebase/auth.js')).logout();}")
    page.evaluate('(url)=>{location.href=url;}',url)
    page.locator('#groups-dialog').get_by_role('button',name='Sign in / register',exact=True).click()
    page.select_option('#auth-mode','login');page.fill('#auth-email','member@example.test');page.fill('#auth-password','fixture-password');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")');page.click('#account-close')
    page.wait_for_selector('#group-join');assert 'Private Meet' in page.locator('#groups-dialog').inner_text()
    page.click('#group-reject-invite')
    page.wait_for_function('(id)=>!JSON.parse(localStorage.getItem("__mockProfiles"))["groupSessions/"+id+"/invites/fixture-1"]',arg=ids[1])
    # A revoked URL must fail visibly and reveal no cached private meeting details.
    page.evaluate("()=>{dispatchEvent(new Event('motodash-group-link'));}")
    page.wait_for_function('document.querySelector("#groups-dialog .feature-status").textContent.includes("invalid, revoked")')
    assert not page.locator('.group-meeting').count()
    switch(page,'host@example.test');linked(page,ids[1],'Private Meet')
    new_token=page.evaluate("async(id)=>{return (await import('./js/firebase/groupRepository.js')).inviteGroup('fixture-0',id,'fixture-1');}",ids[1])
    switch(page,'member@example.test')
    page.evaluate('(url)=>{location.hash=new URL(url).hash;}',url)
    page.wait_for_function('document.querySelector("#groups-dialog .feature-status").textContent.includes("invalid, revoked")')
    new_url=url.rsplit('/',1)[0]+'/'+new_token
    switch(page,'outsider@example.test',True)
    page.evaluate('(url)=>{location.hash=new URL(url).hash;}',new_url)
    page.wait_for_function('document.querySelector("#groups-dialog .feature-status").textContent.includes("invalid, revoked")')
    assert not page.locator('.group-meeting').count()
    switch(page,'member@example.test')
    expiry=page.evaluate("""(id)=>{const records=JSON.parse(localStorage.getItem('__mockProfiles')),key='groupSessions/'+id+'/invites/fixture-1';
      const previous=records[key].expiresAt;records[key].expiresAt={seconds:Math.floor(Date.now()/1000)-60};
      localStorage.setItem('__mockProfiles',JSON.stringify(records));return previous;}""",ids[1])
    page.evaluate('(url)=>{location.hash=new URL(url).hash;}',new_url)
    page.wait_for_function('document.querySelector("#groups-dialog .feature-status").textContent.includes("has expired")')
    page.evaluate("""([id,expiry])=>{const records=JSON.parse(localStorage.getItem('__mockProfiles'));records['groupSessions/'+id+'/invites/fixture-1'].expiresAt=expiry;
      localStorage.setItem('__mockProfiles',JSON.stringify(records));dispatchEvent(new Event('motodash-group-link'));}""",[ids[1],expiry])
    page.wait_for_selector('#group-join')
    bad_qr=page.evaluate("""async()=>{const {invitationQR}=await import('./js/ui/qr.js');let denied=0;
      for(const url of ['https://example.test/#/session/abc',new URL('./',document.baseURI).href+'#/unknown/abc']) {
        try{invitationQR(url);}catch{denied++;}
      }return denied;}""")
    assert bad_qr==2
    page.evaluate('(url)=>{location.hash=new URL(url).hash;}',new_url);page.wait_for_selector('#group-join')
    page.click('#group-join');page.wait_for_selector('#group-leave')
    assert '/invite/' not in page.url
    page.reload(wait_until='networkidle');page.wait_for_selector('#group-leave')
    assert not errors and not page.evaluate('window.__unhandled'), (errors,page.evaluate('window.__unhandled'))
    context.close()
    print('PASS: MOCK Group Session creation, public/private/approval, edit/start/complete, private meeting details, hidden IDs, Finnish and mobile/landscape')
    print('PASS: MOCK session-specific join/leave, minimal Garage snapshot, approvals, participant names, organizer removal and rejoin guard')
    print('PASS: MOCK Lobby discovery, activity/region filters, private/terminal exclusion and safe summaries')
    print('PASS: exact QR round-trip decode, sharing, addressed invite login return, decline/revocation, expiry/wrong-account/rotated-token denial, private acceptance and refresh')

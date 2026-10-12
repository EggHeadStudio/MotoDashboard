"""Static frontend integration using explicit mock live transport; no cloud calls."""
import json,time
from firebase_mocks import install,MOCK_AUTH

def run_live_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568})
    route_map(context);install(context)
    patched=MOCK_AUTH.replace('function notify() {',
      "function notify() { if(auth.currentUser)auth.currentUser.getIdToken=async()=> 'test-only-id-token';")
    context.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(body=patched,content_type='application/javascript'))
    # Load the real production config; intercept transport so no cloud requests/data writes occur.
    endpoint='https://motodash-live.old-sound-55f2.workers.dev'
    requests=[];sent=[];peers=[];ticket_status=200
    def tickets(route):
        requests.append(route.request)
        assert route.request.headers.get('authorization')=='Bearer test-only-id-token'
        assert not route.request.post_data
        if ticket_status!=200:route.fulfill(status=ticket_status,json={'error':'unavailable' if ticket_status==503 else 'access_denied'})
        else:route.fulfill(json={'ticket':'a'*64,'expiresAt':int(time.time()*1000)+30000,'protocol':1})
    context.route(endpoint+'/**/ticket',tickets)
    def socket(ws):
        peers.append(ws)
        assert '?' not in ws.url and 'token' not in ws.url
        def message(raw):
            m=json.loads(raw);sent.append(m)
            if m['type']=='hello':
                assert m['ticket']=='a'*64
                ws.send(json.dumps({'v':1,'type':'hello','riderId':'self'}))
                ws.send(json.dumps({'v':1,'type':'snapshot','participants':[
                  {'riderId':'self','displayName':'Live Rider','status':'ok','position':None},
                  {'riderId':'other','displayName':'Other <Rider>','status':'fuel','vehicle':{'nickname':'Bike','category':'motorcycle'},'clubIdentity':{'name':'Crew','rank':'Captain'},
                   'position':{'latitude':60.001,'longitude':25,'accuracy':5,'speedKmh':0,'heading':None,'sampledAt':int(time.time()*1000),'at':int(time.time()*1000)}}]}))
        ws.on_message(message)
    context.route_web_socket(endpoint.replace('https:','wss:')+'/**',socket)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''Element.prototype.requestFullscreen=undefined;
      window.__geo={callback:null,active:0,maximum:0};
      Object.defineProperty(navigator,'geolocation',{value:{
        watchPosition(fn){window.__geo.callback=fn;window.__geo.active++;window.__geo.maximum=Math.max(window.__geo.maximum,window.__geo.active);return 1;},
        clearWatch(){window.__geo.active=0;},getCurrentPosition(){}}});
      window.__position=(lat,at)=>{const prior=Date.now;Date.now=()=>at;
        try{window.__geo.callback?.({timestamp:at,coords:{latitude:lat,longitude:25,accuracy:5,heading:90,speed:10}});}finally{Date.now=prior;}};''')
    page.goto(base,wait_until='networkidle');page.wait_for_function('document.body.dataset.ready === "true"')
    page.click('#account-btn');page.wait_for_function('!document.querySelector("#auth-submit").disabled')
    page.select_option('#auth-mode','register');page.fill('#auth-name','Live Rider');page.fill('#auth-email','live4@example.test')
    page.fill('#auth-password','fixture-password');page.fill('#auth-confirm-password','fixture-password');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-form").hidden');page.click('#account-close')
    group=page.evaluate('''async()=>{const r=await import('./js/firebase/groupRepository.js');const a=await import('./js/auth-state.js');
      const id=await r.createGroup(a.getAccount().uid,{title:'Live group',description:'',activityType:'ride',category:'motorcycle',startsAt:Date.now()+60000,endsAt:null,meetingArea:'Helsinki',meetingLocation:'',visibility:'public',joiningPolicy:'open',maxParticipants:10,clubId:null});
      await r.setGroupState(a.getAccount().uid,id,'active');location.hash='/session/'+id;return id;}''')
    page.wait_for_selector('#live-consent');assert not requests and page.evaluate('window.__geo.active')==0
    page.click('#live-consent button');assert not requests
    page.check('#live-consent input[name=consent]');page.click('#live-consent button')
    page.wait_for_function('window.__geo.active === 1');assert len(requests)==1
    page.wait_for_selector('.live-rider-label');label=page.locator('.live-rider-label').inner_text()
    assert 'Other <Rider>' in label and 'Bike' in label and 'Captain' in label and 'Last location:' in label
    assert page.locator('.live-rider-label script').count()==0
    assert not page.locator('#start-overlay').is_visible()
    page.click('#live-dashboard');page.wait_for_selector('.live-summary')
    assert 'Fuel: 1' in page.locator('.live-summary').inner_text()
    assert 'straight-line' in page.locator('.live-summary').inner_text()
    page.select_option('#language-select','fi') if page.locator('#language-select').count() else page.evaluate('async()=> (await import("./js/i18n/i18n.js")).setLanguage("fi")')
    assert 'Suora' in page.locator('.live-summary').inner_text() or 'suora' in page.locator('.live-summary').inner_text()
    page.evaluate('async()=> (await import("./js/i18n/i18n.js")).setLanguage("en")')
    page.click('#groups-dialog .feature-close') if page.locator('#groups-dialog .feature-close').count() else page.evaluate('document.querySelector("#groups-dialog").close()')
    at=int(time.time()*1000);page.evaluate('(at)=>window.__position(60,at)',at)
    page.wait_for_timeout(100);assert sum(m['type']=='position' for m in sent)==1
    page.evaluate('(at)=>window.__position(60.00001,at)',at+1000)
    page.wait_for_timeout(50);assert sum(m['type']=='position' for m in sent)==1
    page.evaluate('(at)=>window.__position(60.0005,at)',at+5000)
    page.wait_for_timeout(50);assert sum(m['type']=='position' for m in sent)==2
    assert all('uid' not in m and 'routePoints' not in m for m in sent)
    # Existing recording shares the same watch (soft restart clears the old watch).
    page.click('#back-to-start-btn');page.wait_for_function('window.__geo.active === 0')
    page.wait_for_function('document.querySelectorAll(".live-rider-label").length===0')
    page.click('#start-btn');page.wait_for_function('window.__geo.active === 1')
    page.evaluate('(id)=>{location.hash="/session/"+id;dispatchEvent(new Event("motodash-group-link"));}',group)
    page.wait_for_selector('#live-consent input[name=consent]');page.check('#live-consent input[name=consent]');page.click('#live-consent button')
    page.wait_for_selector('.live-rider-label');assert page.evaluate('window.__geo.maximum')==1
    # Removal clears location and consent; personal recording retains its own watch.
    peers[-1].send(json.dumps({'v':1,'type':'error','code':'access_denied'}))
    page.wait_for_function('document.querySelectorAll(".live-rider-label").length===0')
    assert page.evaluate('window.__geo.active')==1
    assert page.locator('#live-dashboard').is_hidden()
    # Finish personal recording before testing live-only watcher cleanup.
    page.set_viewport_size({'width':390,'height':844})
    page.once('dialog',lambda d:d.accept('Live endpoint regression'))
    page.click('#finish-session-btn');page.wait_for_function('window.__geo.active === 0')
    def open_group(id):
        page.evaluate('(id)=>{location.hash="/session/"+id;dispatchEvent(new Event("motodash-group-link"));}',id)
        page.wait_for_function('(id)=>document.querySelector("#group-live")?.dataset.sessionId === id',arg=id)
    def start_sharing(id):
        open_group(id);page.check('#live-consent input[name=consent]');page.click('#live-consent button')
        page.wait_for_function('window.__geo.active === 1');page.wait_for_selector('.live-rider-label')
    def stopped():
        page.wait_for_function('window.__geo.active === 0 && document.querySelectorAll(".live-rider-label").length === 0')
        assert page.locator('#live-dashboard').is_hidden()
        assert page.evaluate('async()=>!(await import("./js/live/live-client.js")).liveClient.getState().consent')
    # HTTP failures are visible and never start GPS or expose room data.
    ticket_status=503;open_group(group);page.check('#live-consent input[name=consent]');page.click('#live-consent button')
    page.wait_for_function('document.querySelector("#live-dashboard").textContent.includes("Reconnecting")')
    assert page.evaluate('window.__geo.active')==0 and page.locator('.live-rider-label').count()==0
    page.click('#live-dashboard');page.wait_for_selector('#live-stop',state='visible');page.click('#live-stop')
    ticket_status=403;page.check('#live-consent input[name=consent]');page.click('#live-consent button')
    page.wait_for_function('async()=> (await import("./js/live/live-client.js")).liveClient.getState().connection === "accessDenied"')
    stopped();ticket_status=200
    # Auth logout immediately revokes local consent and clears the live-only watch.
    start_sharing(group)
    # Account entry is on the start overlay; open its existing dialog directly to
    # exercise logout while sharing, without Back already stopping the connection.
    page.evaluate('document.querySelector("#account-dialog").showModal()');page.click('#auth-logout')
    page.wait_for_function('!document.querySelector("#auth-form").hidden');stopped()
    page.select_option('#auth-mode','login');page.fill('#auth-email','live4@example.test');page.fill('#auth-password','fixture-password');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Live Rider")');page.click('#account-close')
    # Completing via the actual organizer control clears the sender without a server hint.
    start_sharing(group);page.click('#live-dashboard');page.wait_for_selector('#group-completed');page.click('#group-completed');stopped()
    # A remote completion frame also clears consent, markers and the watcher.
    next_group=page.evaluate('''async()=>{const r=await import('./js/firebase/groupRepository.js');const a=await import('./js/auth-state.js');
      const id=await r.createGroup(a.getAccount().uid,{title:'Stop lifecycle',description:'',activityType:'ride',category:'motorcycle',startsAt:Date.now()+60000,endsAt:null,meetingArea:'Helsinki',meetingLocation:'',visibility:'public',joiningPolicy:'open',maxParticipants:10,clubId:null});
      await r.setGroupState(a.getAccount().uid,id,'active');return id;}''')
    start_sharing(next_group);peers[-1].send(json.dumps({'v':1,'type':'session_ended'}));stopped()
    # Use a second real fixture account and normal joining for the leave control.
    page.click('#back-to-start-btn');page.click('#account-btn');page.click('#auth-logout');page.wait_for_function('!document.querySelector("#auth-form").hidden')
    page.select_option('#auth-mode','register');page.fill('#auth-name','Second Rider');page.fill('#auth-email','live-member@example.test')
    page.fill('#auth-password','fixture-password');page.fill('#auth-confirm-password','fixture-password');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Second Rider")');page.click('#account-close')
    open_group(next_group);page.wait_for_selector('#group-join');page.click('#group-join');page.wait_for_selector('#group-leave')
    start_sharing(next_group);page.click('#live-dashboard');page.wait_for_selector('#group-leave')
    page.once('dialog',lambda d:d.accept());page.click('#group-leave');stopped()
    assert not errors,errors
    context.close()
    print('PASS: production endpoint HTTPS/WSS (mock transport), consent, safe markers, throttling, one GPS watch, visible 503/403 errors, logout/leave/local and remote completion cleanup, Back/denial and personal recording preservation')

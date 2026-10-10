"""Static frontend integration using explicit mock live transport; no cloud calls."""
import json,time
from firebase_mocks import install,MOCK_AUTH

def run_live_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568})
    route_map(context);install(context)
    patched=MOCK_AUTH.replace("const user={uid:'fixture-'+Object.keys(accounts).length,email,displayName:null};",
      "const user={uid:'fixture-'+Object.keys(accounts).length,email,displayName:null,getIdToken:async()=> 'test-only-id-token'};")
    context.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',lambda r:r.fulfill(body=patched,content_type='application/javascript'))
    context.route('**/live-config.js',lambda r:r.fulfill(body="export const liveConfig={endpoint:'https://live.example.test'};",content_type='application/javascript'))
    requests=[];sent=[];peers=[]
    def tickets(route):
        requests.append(route.request)
        assert route.request.headers.get('authorization')=='Bearer test-only-id-token'
        assert not route.request.post_data
        route.fulfill(json={'ticket':'a'*64,'expiresAt':int(time.time()*1000)+30000,'protocol':1})
    context.route('https://live.example.test/**/ticket',tickets)
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
    context.route_web_socket('wss://live.example.test/**',socket)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''window.__geo={callback:null,active:0,maximum:0};
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
    assert 'Other <Rider>' in label and 'Bike' in label and 'Captain' in label
    assert page.locator('.live-rider-label script').count()==0
    assert not page.locator('#start-overlay').is_visible()
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
    assert not errors,errors
    context.close()
    print('PASS: live consent, authenticated POST/ticket-only socket frame, safe Leaflet identities, throttling, shared single GPS watcher, back/denial cleanup and personal recording preservation (mock transport)')

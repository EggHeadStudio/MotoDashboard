"""Batch 8.5 browser checks, local fixtures only."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle
from navigation_helpers import click_control,click_action
import base64,json
from pathlib import Path

def run_batch85_tests(browser,base,route_map):
    c=browser.new_context(viewport={'width':320,'height':568});route_map(c);install(c)
    p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(base,wait_until='networkidle');register(p,'ux85@example.test')
    open_garage(p);add_vehicle(p,'A long Finnish vehicle name','motorcycle')
    assert p.locator('#garage-dialog .feature-body').get_attribute('data-edit-mode')=='view'
    assert not p.locator('[data-media-kind=vehicle]').is_visible()
    assert p.locator('.vehicle-card').get_by_role('button',name='Choose for ride',exact=True).is_visible()
    p.click('#garage-edit');assert p.locator('[data-media-kind=vehicle]').is_visible()
    p.locator('.vehicle-card').get_by_role('button',name='Edit',exact=True).click()
    p.fill('#vehicle-form-nickname','Unsaved change')
    prompts=[]
    def dismiss(dialog):prompts.append(dialog.message);dialog.dismiss()
    p.on('dialog',dismiss);p.locator('#garage-dialog .feature-header button').click()
    assert prompts and p.locator('#vehicle-form').is_visible()
    p.remove_listener('dialog',dismiss);p.on('dialog',lambda dialog:dialog.accept())
    p.locator('#garage-dialog .feature-header button').click()
    assert not p.locator('#garage-dialog').is_visible()
    assert not errors,errors
    print('PASS: Batch 8.5 View/Edit separates management from content and guards unsaved closing at 320px')
    result=p.evaluate('''async()=>{const {dictionary:d}=await import('./js/i18n/dictionary.js');
      const {batch85:b}=await import('./js/i18n/batch85.js');return Object.keys(b.en).every(k=>typeof b.fi[k]==='string')
       && !Object.values(b.fi).some(v=>/\\w\\?\\w/.test(v)) && d.fi['ride.personal']==='Oma profiili';}''')
    assert result
    print('PASS: Batch 8.5 English/Finnish key parity and intact Unicode labels')
    p.locator('#bottom-nav [data-destination=home]').click()
    vehicle_id=p.locator('#ride-launch-vehicle option').last.get_attribute('value')
    p.select_option('#ride-launch-vehicle','')
    assert p.evaluate("async()=>(await import('./js/garage-ui.js')).selectedVehicle()") is None
    p.select_option('#ride-launch-vehicle',vehicle_id)
    assert p.evaluate("async()=>(await import('./js/garage-ui.js')).selectedVehicle().id")==vehicle_id
    assert p.locator('#ride-launch-group').input_value()==''
    assert p.evaluate("async()=>{const s=(await import('./js/ride-context.js')).getRideContext();return !s.recordingId&&!s.sharing;}")
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
    print('PASS: Batch 8.5 Home vehicle switching is compact, creates no Group and never enables live consent')
    club=p.evaluate('''async()=>{const {createClub}=await import('./js/firebase/clubRepository.js');const uid=(await import('./js/auth-state.js')).getAccount().uid;
      return createClub(uid,{name:'Identity Club',description:'',category:'motorcycle',visibility:'public',membershipPolicy:'open',primaryColor:'#101214',accentColor:'#e9bf73',routeColor:null,mapTheme:'normal',links:{}});}''')
    p.click('#home-refresh');p.wait_for_selector('#ride-launch-identity option[value="'+club+'"]',state='attached')
    p.select_option('#ride-launch-identity',club)
    p.wait_for_function('!document.querySelector("#ride-launch-identity").disabled')
    identity=p.evaluate("async()=>(await import('./js/riding-identity.js')).getRidingIdentity()")
    assert identity['clubId']==club and identity['clubName']=='Identity Club'
    assert not p.locator('#ride-launch-contribution').is_checked()
    result=p.evaluate('''async()=>{const i=await import('./js/riding-identity.js');const uid=(await import('./js/auth-state.js')).getAccount().uid;
      const key='clubs/'+i.getRidingIdentity().clubId+'/members/'+uid;const rows=JSON.parse(localStorage.getItem('__mockProfiles'));delete rows[key];localStorage.setItem('__mockProfiles',JSON.stringify(rows));
      try{await i.verifyRidingIdentity();return false;}catch{return true;}}''')
    assert result,'Revoked membership cannot be captured for a new ride'
    p.select_option('#ride-launch-identity','');p.wait_for_function('!document.querySelector("#ride-launch-identity").disabled')
    assert p.evaluate("async()=>(await import('./js/riding-identity.js')).getRidingIdentity().kind")=='personal'
    assert not errors,errors
    print('PASS: Batch 8.5 current Club identity verification, private-default contribution and revocation denial')
    click_action(p,'#groups-btn');p.wait_for_selector('#group-create');p.click('#group-create');p.wait_for_selector('#group-form')
    p.fill('#group-form-title','RSVP test ride');p.fill('#group-form-meetingArea','Helsinki');p.locator('#group-form button[type=submit]').click()
    p.wait_for_selector('#group-attendance [data-rsvp=interested]');p.locator('#group-attendance [data-rsvp=interested]').click()
    p.wait_for_selector('#group-attendance [data-rsvp=interested][aria-pressed=true]')
    p.locator('#group-attendance [data-rsvp=going]').click();p.wait_for_selector('#group-attendance [data-rsvp=going][aria-pressed=true]')
    before=p.evaluate('window.__mock.writes');p.locator('#group-attendance [data-rsvp=going]').click()
    p.wait_for_function('document.querySelector("#groups-dialog .feature-body").getAttribute("aria-busy")==="false"')
    assert p.evaluate('window.__mock.writes')==before,'Duplicate RSVP must not inflate or write counts'
    assert not p.evaluate("async()=>(await import('./js/ride-context.js')).getRideContext().sharing")
    assert not errors,errors
    print('PASS: Batch 8.5 RSVP selection, duplicate idempotency and live consent separation through actual Group UI')
    p.locator('#bottom-nav [data-destination=home]').click();p.click('#home-refresh')
    p.wait_for_selector('#home-upcoming .event-card:has-text("RSVP test ride") .badge:has-text("Going")')
    p.evaluate('''async()=>{const uid=(await import('./js/auth-state.js')).getAccount().uid;
      dispatchEvent(new CustomEvent('motodash-notification-feed',{detail:{uid,rows:[{id:'home-fixture',type:'group-invite',sourceId:'safe-fixture',readAt:null}]}}));}''')
    assert p.locator('#home-invitations button').count()==1
    assert 'fixture-0' not in p.locator('#home-invitations').inner_text()
    print('PASS: Batch 8.5 Home shows bounded RSVP plans and reuses private invitation feed without another listener')
    activity_club=p.evaluate('''async()=>{const {createClub}=await import('./js/firebase/clubRepository.js');const uid=(await import('./js/auth-state.js')).getAccount().uid;
      return createClub(uid,{name:'Activity Club',description:'',category:'motorcycle',visibility:'public',membershipPolicy:'open',primaryColor:'#101214',accentColor:'#e9bf73',routeColor:null,mapTheme:'normal',links:{}});}''')
    ledger={'revision':0,'entries':[],'next':None,'stats':{'rides':0,'distanceMeters':0,'durationMs':0,'group':0,'meet':0,'event':0,'riders':0},'checkedAt':1700000000000,'defaultAudience':'private','canManage':True}
    payloads=[]
    def activity_route(route):
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type,If-Match','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}
        if route.request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
        if route.request.method=='POST':
            body=route.request.post_data_json;payloads.append(body);assert set(body)=={'sourceType','sourceId','audience','consent','publicConsent'}
            ledger['revision']+=1;ledger['entries']=[{'id':'11111111-1111-4111-8111-111111111111','title':'Coastal ride','type':'ride','displayName':'Rider','startedAt':1700000000000,'distanceMeters':10000,'durationMs':3600000,'category':'motorcycle','clubName':'Activity Club','rankName':None,'audience':body['audience'],'own':True}]
            ledger['stats'].update(rides=1,distanceMeters=10000,durationMs=3600000,riders=1)
        elif route.request.method=='DELETE':ledger['revision']+=1;ledger['entries']=[];ledger['stats'].update(rides=0,distanceMeters=0,durationMs=0,riders=0)
        route.fulfill(json=ledger,headers=headers)
    c.route('https://motodash-live.old-sound-55f2.workers.dev/v1/clubs/**',activity_route)
    p.evaluate('''async clubId=>{const {contributionButton}=await import('./js/ui/club-activity.js');const n=document.createElement('div');n.id='test-contribution';n.style.cssText='position:fixed;top:0;left:0;z-index:999999';document.body.append(n);
      const uid=(await import('./js/auth-state.js')).getAccount().uid;contributionButton(n,{sourceId:'ride-fixture',session:{ownerUid:uid,id:'ride-fixture',remoteRevisionId:'ready',ridingIdentity:{clubId}}});}''',activity_club)
    p.click('#test-contribution button');p.wait_for_selector('#activity-contribution-form')
    assert p.locator('#activity-contribution-form-audience').input_value()=='private'
    assert not p.locator('#activity-contribution-form-consent').is_checked()
    p.check('#activity-contribution-form-consent');p.locator('#activity-contribution-form button[type=submit]').click()
    p.wait_for_function('!document.getElementById("activity-contribution")');assert payloads[0]['consent'] and payloads[0]['audience']=='private'
    p.evaluate('id=>{document.getElementById("test-contribution").remove();location.hash="/club/"+id;}',activity_club)
    p.wait_for_selector('#club-activity > details > summary');p.locator('#club-activity > details > summary').click()
    p.wait_for_selector('#club-activity .activity-card');assert p.locator('#club-activity').get_by_text('Coastal ride',exact=True).is_visible()
    assert p.locator('#club-activity-stats dd').all_inner_texts()==['1.0','1.0','10.0','1.0','0.0','0.0','0.0']
    assert not errors,errors
    print('PASS: Batch 8.5 explicit private ride contribution and lazy Club Activity Log use summary-only payloads')
    print('PASS: Batch 8.5 trusted Club statistics display visible mileage, hours, riders and separate participation counters')
    fixture=json.loads((Path(__file__).resolve().parents[1]/'cloudflare/tests/media-fixtures.json').read_text())
    media={'revision':1,'images':[{'id':'rank-image','slot':'icon','published':False}],'theme':{'icon':'star','badge':'crest'},'canWrite':True}
    deny=[False]
    def route_media(route):
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization'}
        if route.request.method=='OPTIONS':route.fulfill(status=204,headers=headers)
        elif '/images/' in route.request.url:
            if deny[0]:route.fulfill(status=403,json={'error':'access_denied'},headers=headers)
            else:route.fulfill(body=base64.b64decode(fixture['image/png']),content_type='image/png',headers=headers)
        else:route.fulfill(json=media,headers=headers)
    c.route('https://motodash-live.old-sound-55f2.workers.dev/v1/media/**',route_media)
    p.evaluate('''async()=>{const {decorateMedia}=await import('./js/media/media-render.js');const n=document.createElement('span');n.id='test-rank';n.className='rank-graphic';
      n.style.cssText='position:fixed;top:0;left:0;z-index:999999';document.body.append(n);window.__rankTarget={kind:'rank',id:'testclub',child:'captain'};
      decorateMedia(n,window.__rankTarget,{icon:n},{rank:true});}''')
    p.wait_for_selector('#test-rank.has-rank-image');assert p.locator('#test-rank img').is_visible()
    assert p.locator('#test-rank svg').evaluate('(n)=>getComputedStyle(n).visibility')=='hidden'
    media['images'][0]['id']='replacement'
    p.evaluate("dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target:window.__rankTarget}}))")
    p.wait_for_selector('#test-rank.has-rank-image');assert p.locator('#test-rank img').count()==1
    media['images']=[]
    p.evaluate("dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target:window.__rankTarget}}))")
    p.wait_for_function('!document.querySelector("#test-rank img")')
    assert p.locator('#test-rank svg').is_visible()
    media['images']=[{'id':'denied','slot':'icon','published':False}];deny[0]=True
    p.evaluate("dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target:window.__rankTarget}}))")
    p.wait_for_timeout(150);assert p.locator('#test-rank svg').is_visible() and not p.locator('#test-rank img').count()
    assert not errors,errors
    print('PASS: Batch 8.5 custom rank image precedence, replacement, deletion and unauthorized-image fallback')
    result=p.evaluate('''async()=>{const {colorField,decoratePalette}=await import('./js/ui/palette.js');
      const form=document.createElement('form');form.id='palette-test';document.body.append(form);
      const c=colorField(form,'route','branding.route',{value:'#123456',optional:true});
      const picker=form.querySelector('input[type=color]');picker.value='#6bbde9';picker.dispatchEvent(new Event('input'));
      if(c.value!=='#6bbde9'||new FormData(form).get('route')!=='#6bbde9')throw Error('color value lost');
      const {contrast,readableText}=await import('./js/data/branding.js');
      if(contrast(c.value,readableText(c.value))<4.5)throw Error('contrast');
      form.remove();return true;}''')
    assert result and not errors,errors
    print('PASS: Batch 8.5 visual color selection preserves legacy values, form serialization and readable contrast')
    c.close()

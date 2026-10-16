"""Rendered UX evidence. Only local disposable fixtures; no real accounts or GPS.

Run via run_browser.py --visual86; MOTODASH_VISUAL_PHASE=before/after.
Screenshots/metrics are kept in TEMP, never the published Pages artifact.
"""
import json, os, re, tempfile
from pathlib import Path
from firebase_mocks import install
from batch2_browser import register, open_garage, add_vehicle

SIZES = [(320,568),(390,844),(430,932),(844,390),(768,1024),(1440,1000)]

def run_visual86_tests(browser, base, route_map):
    phase=os.environ.get('MOTODASH_VISUAL_PHASE','before')
    out=Path(tempfile.gettempdir())/'motodash-ux86'/phase
    out.mkdir(parents=True,exist_ok=True)
    extra=os.environ.get('MOTODASH_VISUAL_EXTRA')=='1'
    manifest=json.loads((out/'manifest.json').read_text()) if extra and (out/'manifest.json').exists() else []
    def capture(p,screen,language,anchor=None):
        if extra and screen not in ['club-activity','meet-detail','event-detail','discover-people']:return
        for width,height in SIZES:
            p.set_viewport_size({'width':width,'height':height})
            p.evaluate('''()=>{window.scrollTo(0,0);for(const node of document.querySelectorAll('#start-overlay,dialog[open]'))node.scrollTop=0;}''')
            if anchor:p.locator(anchor).scroll_into_view_if_needed()
            p.wait_for_timeout(100)
            filename=f'{screen}-{language}-{width}x{height}.png'
            p.screenshot(path=str(out/filename),animations='disabled')
            metrics=p.evaluate('''()=>{const shell=document.querySelector('#start-overlay');
              const root=document.querySelector('dialog:modal')||shell;
              return {documentOverflow:document.documentElement.scrollWidth>innerWidth,
                surfaceOverflow:root.scrollWidth>root.clientWidth+1,
                activeWatch:window.__geo?.active||0};}''')
            manifest.append({'screen':screen,'language':language,'viewport':[width,height],'file':filename,**metrics})
            if phase=='after':assert not metrics['documentOverflow'] and not metrics['surfaceOverflow'],manifest[-1]
        print(f'CAPTURE: {phase} {language} {screen}: six rendered viewports',flush=True)

    if phase=='before' and not extra:
        production=browser.new_context(viewport={'width':390,'height':844})
        # Read-only public landing reference. Never authenticate or send mutations.
        production.route('**/*',lambda r:r.abort() if r.request.method not in ['GET','HEAD'] or re.search(r'(googleapis|firebaseio|firebasedatabase|workers\.dev)',r.request.url) else r.continue_())
        p=production.new_page()
        try:
            p.goto('https://eggheadstudio.github.io/MotoDashboard/',wait_until='domcontentloaded',timeout=45000)
            p.wait_for_timeout(1200)
            p.screenshot(path=str(out/'production-landing-en-390x844.png'))
            print('CAPTURE: read-only public production landing (cloud APIs blocked)',flush=True)
        except Exception as error:print('Production reference unavailable:',type(error).__name__,flush=True)
        production.close()
    for language in ['en','fi']:
        context=browser.new_context(viewport={'width':390,'height':844});route_map(context);install(context)
        context.route('https://motodash-live.old-sound-55f2.workers.dev/v1/clubs/**',lambda r:r.fulfill(json={'revision':0,'entries':[],'next':None,'stats':{'rides':0,'distanceMeters':0,'durationMs':0,'group':0,'meet':0,'event':0,'riders':0},'checkedAt':1700000000000,'defaultAudience':'private','canManage':True},headers={'Access-Control-Allow-Origin':'*'}))
        p=context.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
        p.add_init_script('''window.__geo={active:0,count:0};Object.defineProperty(navigator,'geolocation',{value:{
          watchPosition(fn){window.__geo.callback=fn;window.__geo.active++;window.__geo.count++;return 1;},clearWatch(){window.__geo.active=0;}}});
          Element.prototype.requestFullscreen=undefined;navigator.wakeLock=undefined;''')
        p.goto(base,wait_until='networkidle')
        p.select_option('#language-select',language);capture(p,'landing',language)
        p.click('[data-auth-entry=register] >> nth=0');capture(p,'register',language);p.click('#account-close')
        p.select_option('#language-select','en');register(p,'visual86@example.test')
        p.evaluate('''async()=>{const uid=(await import('./js/auth-state.js')).getAccount().uid;
          await (await import('./js/firebase/publicProfileRepository.js')).savePublicProfile(uid,{displayName:'Alex Rider',visibility:'public',bio:'Weekend roads and good company.',category:'motorcycle',accent:'gold',banner:'road'});}''')
        open_garage(p);add_vehicle(p,'Weekend Explorer','motorcycle');p.locator('#garage-dialog .feature-header button').click()
        club=p.evaluate('''async()=>{const uid=(await import('./js/auth-state.js')).getAccount().uid;
          return (await import('./js/firebase/clubRepository.js')).createClub(uid,{name:'Weekend Crew',description:'Short rides. Good company. Everyone welcome.',category:'motorcycle',visibility:'public',membershipPolicy:'open',primaryColor:'#101214',accentColor:'#e9bf73',routeColor:null,mapTheme:'normal',links:{}});}''')
        p.locator('#bottom-nav [data-destination=rides]').click();p.click('#groups-btn');p.click('#group-create')
        p.fill('#group-form-title','Sunday coastal ride');p.fill('#group-form-meetingArea','Helsinki area');p.locator('#group-form button[type=submit]').click();p.wait_for_selector('#group-attendance')
        group=p.evaluate('location.hash.split("/")[2]')
        p.locator('#bottom-nav [data-destination=home]').click();p.click('#home-refresh');p.wait_for_selector('#ride-launch-identity option[value="'+club+'"]',state='attached')
        p.select_option('#language-select',language);capture(p,'home',language)
        for destination in ['discover','rides','clubs','profile']:
            p.locator('#bottom-nav [data-destination='+destination+']').click()
            p.wait_for_timeout(180);capture(p,destination,language)
            if destination=='discover':
                p.get_by_role('button',name='People' if language=='en' else 'Ihmiset',exact=True).click()
                capture(p,'discover-people',language)
        p.click('#public-profile-edit');p.wait_for_selector('#public-profile-form');capture(p,'profile-edit',language)
        p.locator('#public-profile-editor .feature-header button').click()
        open_garage(p);capture(p,'garage',language);p.click('#garage-edit');capture(p,'garage-edit',language)
        p.locator('#garage-dialog .feature-header button').click()
        p.locator('#bottom-nav [data-destination=clubs]').click()
        p.locator('#clubs-dialog [data-club-id="'+club+'"] button').first.click()
        p.wait_for_selector('#club-branding');capture(p,'club-detail',language)
        p.locator('#club-activity summary').click();p.wait_for_selector('#club-activity-stats dl')
        capture(p,'club-activity',language,'#club-activity')
        p.click('#club-edit');capture(p,'club-edit',language)
        p.locator('#bottom-nav [data-destination=rides]').click();p.click('#groups-btn')
        # Reopen the fixture via its rendered Group card rather than a guessed ID.
        p.locator('#groups-dialog .event-card button').first.click();p.wait_for_selector('#group-attendance');capture(p,'group-detail',language)
        p.click('#group-edit');capture(p,'group-edit',language)
        for kind in ['meet','event']:
            p.locator('#bottom-nav [data-destination=rides]').click();p.click('#groups-btn');p.click('#group-create')
            p.fill('#group-form-title','Weekend '+kind);p.fill('#group-form-meetingArea','Helsinki area')
            p.select_option('#group-form-activityType',kind);p.locator('#group-form button[type=submit]').click()
            p.wait_for_selector('#group-attendance');capture(p,kind+'-detail',language)
        p.locator('#bottom-nav [data-destination=profile]').click();p.click('#notifications-bell');capture(p,'notifications',language)
        p.locator('#notifications-dialog .feature-header button').click()
        alias=p.evaluate('''async()=>{const uid=(await import('./js/auth-state.js')).getAccount().uid;return (await (await import('./js/firebase/publicProfileRepository.js')).loadOwnPublicProfile(uid)).publicId;}''')
        p.evaluate('(id)=>location.hash="/rider/"+id',alias);p.wait_for_selector('#screen-rider h1');capture(p,'public-profile',language)
        p.locator('#bottom-nav [data-destination=home]').click();p.click('#start-btn');p.wait_for_function('window.__geo.active===1')
        p.evaluate('''()=>{for(let i=0;i<5;i++)window.__geo.callback({timestamp:Date.now()+i*1000,coords:{latitude:60+i*.0001,longitude:25,accuracy:5,speed:5,heading:90}});}''')
        capture(p,'dashboard',language)
        p.on('dialog',lambda d:d.accept('Weekend ride' if d.type=='prompt' else None))
        p.click('#finish-session-btn');p.wait_for_function('window.__geo.active===0')
        p.locator('#bottom-nav [data-destination=rides]').click();p.locator('#history-list button[data-action=open]').first.click();p.wait_for_selector('#saved-ride-title');capture(p,'saved-replay',language)
        assert not errors,errors
        context.close()
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(f'PASS: {phase}: {len(manifest)} local screenshot/viewport cases; evidence {out}',flush=True)

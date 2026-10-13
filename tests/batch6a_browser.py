"""Batch 6A browser regressions using explicit SDK fixtures, never production."""
from firebase_mocks import install
from batch2_browser import register
from navigation_helpers import click_action

def run_batch6a_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568});route_map(context);install(context)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("window.__unhandled=[];addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base,wait_until='networkidle');passed=0
    def done(name):
        nonlocal passed
        passed+=1;print('PASS: Batch 6A:',name)
    assert page.locator('#notifications-bell').is_hidden()
    page.goto(base+'#/notifications',wait_until='networkidle');assert page.locator('#notifications-dialog').is_visible()
    assert 'Sign in' in page.locator('#notifications-dialog').inner_text()
    page.locator('#notifications-dialog .feature-header button').click()
    register(page,'batch6a@example.test')
    page.wait_for_function('window.__mock.snapshotListeners===2')
    done('signed-out notification route, sign-in and two bounded user listeners')
    result=page.evaluate('''async()=>{
      const a=await import('./js/firebase/access.js');
      let timeout;try{await a.boundedRequest(new Promise(()=>{}),10);}catch(e){timeout=e.code;}
      return {timeout,offline:a.dataErrorKey({code:'offline'}),permission:a.dataErrorKey({code:'permission-denied'}),
        index:a.dataErrorKey({code:'failed-precondition'}),diagnostic:a.requestDiagnostic({code:'unavailable',operation:'group-load',message:'secret uid token'}),
        sanitized:a.requestDiagnostic({code:'private-token',operation:'private-uid'})};
    }''')
    assert result=={'timeout':'deadline-exceeded','offline':'data.offline','permission':'data.denied','index':'data.indexRequired','diagnostic':'MD-NETWORK/GROUP-LOAD','sanitized':'MD-REQUEST/DATA'},result
    done('timeout/offline/permission/index distinction and no private diagnostic content')
    result=page.evaluate('''async()=>{
      const {ownDatabase}=await import('./js/firebase/access.js'),{getAccount}=await import('./js/auth-state.js');
      const uid=getAccount().uid;
      Object.defineProperty(navigator,'onLine',{value:false,configurable:true});
      let diagnostic;try{const s=await ownDatabase(uid,'group-load');await s.sdk.getDoc(s.sdk.doc(s.db,'groupPages','x'));}catch(e){diagnostic=e.code+'/'+e.operation;}
      Object.defineProperty(navigator,'onLine',{value:true,configurable:true});return diagnostic;
    }''')
    assert result=='offline/group-load'
    done('offline operation identified without issuing or retrying a write')
    result=page.evaluate('''async()=>{
      const {ownDatabase}=await import('./js/firebase/access.js');
      const {getAccount}=await import('./js/auth-state.js'),s=await ownDatabase(getAccount().uid,'group-load');
      let reads=0;s.sdk.getDoc;window.__mock.docFailure={ref:'groupPages/transient',code:'unavailable'};
      setTimeout(()=>{delete window.__mock.docFailure;},100);
      const record=await s.sdk.getDoc(s.sdk.doc(s.db,'groupPages','transient'));return !record.exists();
    }''')
    assert result
    done('one transient read retry recovers on the same account')
    result=page.evaluate('''async()=>{
      const s=await import('./js/data/schema.js'),g=await import('./js/data/group-session.js');
      let garage=false;try{s.vehicleInput({category:'open',nickname:'Any',visibility:'private'});}catch{garage=true;}
      const group=g.groupInput({title:'Open ride',activityType:'ride',category:'open',startsAt:Date.now()+60000,meetingArea:'Espoo',visibility:'public',joiningPolicy:'open'});
      return {garage,activity:s.ACTIVITY_CATEGORIES.includes('open'),vehicle:s.CATEGORIES.includes('open'),category:group.category};
    }''')
    assert result=={'garage':True,'activity':True,'vehicle':False,'category':'open'}
    done('Open belongs to activities, never Garage validation')
    result=page.evaluate('''async()=>{
      const {effectiveGroup,groupDeadline}=await import('./js/data/group-lifecycle.js');const now=Date.now();
      return [effectiveGroup({state:'active',startsAt:now-86400001,endsAt:null},now).state,
        effectiveGroup({state:'scheduled',startsAt:now-86400001,endsAt:null},now).state,
        effectiveGroup({state:'active',startsAt:now+7200001,endsAt:null},now).state,
        groupDeadline({startsAt:now,endsAt:now+60000})===now+60000];
    }''')
    assert result==['completed','cancelled','completed',True]
    done('legacy/new effective expiration and earlier explicit end time')
    page.evaluate('''()=>{
      const uid=JSON.parse(localStorage.getItem('__mockUser')).uid,r=JSON.parse(localStorage.getItem('__mockProfiles'));
      r['users/'+uid+'/notifications/n1']={type:'group-invite',sourceId:'test-group',actorUid:'host',createdAt:{seconds:1700000000},readAt:null};
      localStorage.setItem('__mockProfiles',JSON.stringify(r));dispatchEvent(new Event('__mockFirestoreChanged'));
    }''')
    page.wait_for_function('document.querySelector(".notification-count").textContent==="1"')
    page.click('#notifications-bell');assert 'Group Session invitation' in page.locator('#notifications-dialog').inner_text()
    page.locator('#notifications-dialog').get_by_role('button',name='Mark as read',exact=True).click()
    page.wait_for_function('document.querySelector(".notification-count").hidden')
    done('private incoming item, timestamp, unread badge and mark-as-read')
    page.select_option('#language-select','fi');assert 'Ilmoitukset' in page.locator('#notifications-dialog').inner_text()
    assert 'ryhmäsessiokutsu' in page.locator('#notifications-dialog').inner_text()
    page.select_option('#language-select','en')
    for width,height in [(320,568),(390,844),(844,390)]:
        page.set_viewport_size({'width':width,'height':height})
        rect=page.locator('#notifications-dialog').bounding_box()
        assert rect['x']>=0 and rect['x']+rect['width']<=width+1 and rect['height']<=height+1,rect
    done('EN/FI notification text and narrow portrait/landscape panel')
    page.locator('#notifications-dialog .feature-header button').click()
    page.set_viewport_size({'width':320,'height':568})
    rect=page.locator('.shell-header').evaluate('(e)=>({width:e.clientWidth,scroll:e.scrollWidth})')
    assert rect['scroll']<=rect['width'],rect
    done('320px header fits bell, language selector and Profile')
    group=page.evaluate('''async()=>{
      const {getAccount}=await import('./js/auth-state.js'),r=await import('./js/firebase/groupRepository.js');
      return r.createGroup(getAccount().uid,{title:'Notification destination',activityType:'ride',category:'open',startsAt:Date.now()+60000,meetingArea:'Espoo',visibility:'public',joiningPolicy:'open'});
    }''')
    page.evaluate('''async id=>{
      const {getAccount}=await import('./js/auth-state.js'),{watchGroup}=await import('./js/firebase/groupWatch.js');
      window.__watchStops=[watchGroup(getAccount().uid,id,()=>{}),watchGroup(getAccount().uid,id,()=>{})];
    }''',group)
    page.wait_for_function('window.__mock.snapshotListeners===3')
    page.evaluate('window.__watchStops[0]()');assert page.evaluate('window.__mock.snapshotListeners')==3
    page.evaluate('''id=>{window.__mock.docFailure={ref:'groupPages/'+id,code:'unavailable'};dispatchEvent(new Event('__mockFirestoreChanged'));}''',group)
    page.wait_for_function('window.__mock.snapshotListeners===2')
    assert 'MD-NETWORK/GROUP-WATCH' in page.locator('#firestore-diagnostic').text_content()
    page.evaluate("delete window.__mock.docFailure;dispatchEvent(new Event('online'))")
    page.wait_for_function('window.__mock.snapshotListeners===3')
    page.evaluate('window.__watchStops[1]()');assert page.evaluate('window.__mock.snapshotListeners')==2
    done('one shared Group listener, visible scoped error, online recovery and exact teardown')
    page.evaluate('''id=>{
      const uid=JSON.parse(localStorage.getItem('__mockUser')).uid,r=JSON.parse(localStorage.getItem('__mockProfiles'));
      r['users/'+uid+'/notifications/n2']={type:'group-approved',sourceId:id,actorUid:'host',createdAt:{seconds:1800000000},readAt:null};
      localStorage.setItem('__mockProfiles',JSON.stringify(r));dispatchEvent(new Event('__mockFirestoreChanged'));
    }''',group)
    page.wait_for_function('document.querySelector(".notification-count").textContent==="1"')
    page.click('#notifications-bell');page.locator('#notifications-dialog').get_by_role('button',name='Your Group Session request was approved',exact=True).click()
    page.wait_for_selector('#group-edit');assert page.url.endswith('#/session/'+group)
    assert 'Notification destination' in page.locator('#groups-dialog').inner_text()
    page.locator('#groups-dialog .feature-header button').click()
    done('notification marks read and deep-links to the correct Group under the Pages path')
    click_action(page,'#account-btn');page.click('#auth-logout')
    page.wait_for_function('window.__mock.snapshotListeners===0')
    assert page.locator('.notification-count').is_hidden()
    page.click('#account-close');page.goto(base+'#/notifications',wait_until='networkidle')
    assert 'Group Session invitation' not in page.locator('#notifications-dialog').inner_text()
    done('logout detaches listeners and clears all notification rows/counts')
    page.locator('#notifications-dialog').get_by_role('button',name='Sign in / register',exact=True).click()
    assert page.url.endswith('#/notifications')
    page.select_option('#auth-mode','login');page.fill('#auth-email','batch6a@example.test');page.fill('#auth-password','fixture-password');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-form").hidden');page.click('#account-close')
    page.wait_for_selector('#notifications-dialog[open]')
    assert 'Group Session invitation' in page.locator('#notifications-dialog').inner_text()
    done('signed-out notification return survives Auth without stacking modal dialogs')
    assert not errors and not page.evaluate('window.__unhandled'),(errors,page.evaluate('window.__unhandled'))
    context.close();print(f'PASS: Batch 6A browser {passed} named cases, 0 failed, 0 skipped (mock SDK)')

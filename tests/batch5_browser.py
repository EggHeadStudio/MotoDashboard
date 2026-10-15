from navigation_helpers import management_click
"""Product navigation/discovery/error regressions. Mock SDK; never production data."""
import os
from pathlib import Path
from firebase_mocks import install
from batch2_browser import register, open_garage, add_vehicle
from navigation_helpers import click_action, fill_control

def run_batch5_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    route_map(context);install(context)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.add_init_script("window.__unhandled=[];addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base,wait_until='networkidle')
    passed=0
    def done(name):
        nonlocal passed
        passed+=1;print('PASS: Batch 5:',name)
    def nav(screen):page.locator(f'#bottom-nav button[data-destination="{screen}"]').click()
    def loaded():page.wait_for_function("document.querySelector('#lobby-dialog .feature-status').textContent==='Up to date.'")
    def linked(id):
        page.evaluate('(id)=>{location.hash="/session/"+id;}',id)
        page.wait_for_function("document.querySelector('#groups-dialog .feature-status').textContent==='Up to date.'")
    assert page.locator('#bottom-nav button').count()==5 and page.locator('#start-btn').inner_text()=='Start Ride'
    assert page.locator('#bottom-nav').is_hidden()
    assert page.locator('#screen-landing').is_visible()
    page.click('#landing-try')
    assert 'Make the journey yours.' in page.locator('#home-title').inner_text()
    assert 'No matching' not in page.locator('#home-upcoming').inner_text()
    done('anonymous landing, intentional guest Home, prominent Start Ride and honest sign-in state')
    register(page,'premium-owner@example.test')
    sizes=page.locator('#bottom-nav button').evaluate_all('(nodes)=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,label:n.textContent}))')
    assert all(row['w']>=44 and row['h']>=44 and row['label'] for row in sizes)
    nav('profile');nav('home');page.go_back();page.wait_for_function('document.querySelector("#start-overlay").dataset.screen==="profile"')
    page.go_forward();page.wait_for_function('document.querySelector("#start-overlay").dataset.screen==="home"')
    done('44px navigation, active destination and browser Back/Forward')
    click_action(page,'#account-btn');page.fill('#profile-name','Vera West');page.click('#profile-name-form button')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Vera West")')
    assert page.locator('#account-private-email').inner_text()=='premium-owner@example.test'
    page.click('#account-close');nav('home')
    assert 'Vera West' in page.locator('#home-title').inner_text()
    assert '@example.test' not in page.locator('#screen-home').inner_text()
    nav('profile');assert '@example.test' not in page.locator('#screen-profile').inner_text()
    done('live display-name propagation; email visible only in Account settings')
    page.click('#profile-logout');register(page,'premium-recipient@example.test')
    nav('profile');page.click('#profile-logout');click_action(page,'#account-btn')
    page.select_option('#auth-mode','login');page.fill('#auth-email','premium-owner@example.test');page.fill('#auth-password','fixture-password');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")');page.click('#account-close')
    open_garage(page);add_vehicle(page,'Desert Runner','motorcycle');
    assert page.locator('.vehicle-art svg').count()==1
    management_click(page.locator('.vehicle-card').get_by_role('button',name='Make default',exact=True))
    page.wait_for_function('document.querySelector(".vehicle-card").textContent.includes("Default vehicle")')
    page.locator('.vehicle-card').get_by_role('button',name='Choose for ride',exact=True).click()
    nav('home');assert 'Desert Runner' in page.locator('#selected-vehicle').inner_text()
    done('Garage showcase SVG, default and selected vehicle persist into Home')
    data=page.evaluate('''async()=>{
      const a=await import('./js/auth-state.js'),c=await import('./js/firebase/clubRepository.js'),g=await import('./js/firebase/groupRepository.js');const uid=a.getAccount().uid;
      const clubs=[];for(let n=0;n<23;n++)clubs.push(await c.createClub(uid,{name:'Road Collective '+String(n).padStart(2,'0'),description:'People who enjoy the journey.',category:n<21?'motorcycle':'car',visibility:'public',membershipPolicy:'open',primaryColor:'#263648',accentColor:'#e9bf73',routeColor:null,mapTheme:'normal',links:{}}));
      const groups=[];for(const [title,activityType,visibility,joiningPolicy] of [['Coastal Escape','ride','public','open'],['Sunday Drive','drive','public','open'],['Harbour Meet','meet','approval','approval'],['Open Road Festival','event','public','open'],['Private Departure','ride','private','invite'],['Unlisted Departure','ride','unlisted','open']])groups.push(await g.createGroup(uid,{title,description:'A relaxed journey together.',activityType,category:'motorcycle',startsAt:Date.now()+7200000,endsAt:null,meetingArea:'Helsinki',meetingLocation:'Members-only entrance',visibility,joiningPolicy,maxParticipants:null,clubId:null}));
      return {clubs,groups};}''')
    page.click('#home-refresh');page.wait_for_function('document.querySelectorAll("#home-upcoming .event-card").length===3')
    assert page.locator('#home-clubs .community-card').count()==3
    assert page.evaluate("window.__mock.queries.filter(q=>q.path.endsWith('/groupRefs')||q.path.endsWith('/clubRefs')).every(q=>q.filters.some(f=>f.kind==='limit'&&f.value===20))")
    done('Home uses bounded owned memberships and actual upcoming groups')
    nav('discover');loaded()
    text=page.locator('#lobby-results').inner_text();assert 'Coastal Escape' in text and 'Harbour Meet' in text and 'Open Road Festival' in text
    assert 'Private Departure' not in text and 'Unlisted Departure' not in text and 'Members-only entrance' not in text
    done('Discover features real public/approval summaries; private/unlisted/precise location excluded')
    page.locator('.discovery-tabs').get_by_role('button',name='Rides',exact=True).click();loaded()
    text=page.locator('#lobby-results').inner_text();assert 'Coastal Escape' in text and 'Sunday Drive' in text and 'Harbour Meet' not in text
    page.locator('.discovery-tabs').get_by_role('button',name='Meets',exact=True).click();loaded();assert page.locator('[data-lobby-id]').count()==1
    page.locator('.discovery-tabs').get_by_role('button',name='Events',exact=True).click();loaded();assert 'Open Road Festival' in page.locator('#lobby-results').inner_text()
    done('Rides includes Ride/Drive; Meets and Events issue activity-constrained queries')
    page.locator('.chip-row').get_by_role('button',name='Cars',exact=True).click();loaded()
    assert page.locator('.empty-state').is_visible()
    assert page.evaluate("window.__mock.queries.filter(q=>q.path==='lobbyEvents').at(-1).filters.some(f=>f.field==='category'&&f.value==='car')")
    done('category chips filter on server and render a polished genuine empty state')
    page.locator('.discovery-tabs').get_by_role('button',name='Clubs',exact=True).click();loaded()
    assert page.locator('#lobby-results [data-club-id]').count()==2
    page.locator('.chip-row').get_by_role('button',name='Motorcycles',exact=True).click();loaded()
    assert page.locator('#lobby-results [data-club-id]').count()==20
    assert 'Joined' in page.locator('#lobby-results [data-club-id]').first.inner_text()
    page.locator('#lobby-results').get_by_role('button',name='Load more',exact=True).click()
    page.wait_for_function('document.querySelectorAll("#lobby-results [data-club-id]").length===21')
    ids=page.locator('#lobby-results [data-club-id]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.clubId)');assert len(set(ids))==21
    assert page.evaluate("window.__mock.queries.filter(q=>q.path==='clubDirectory'&&q.filters.some(f=>f.field==='category')).every(q=>q.filters.some(f=>f.kind==='limit'&&f.value===20))")
    done('public Club category query, safe page hydration and duplicate-free bounded pagination')
    page.locator('#lobby-results [data-club-id]').first.get_by_role('button',name='Open',exact=True).click()
    page.wait_for_selector('#club-branding');assert page.locator('#bottom-nav button[aria-current=page]').inner_text()=='Clubs'
    assert 'People who enjoy the journey.' in page.locator('#club-branding').inner_text()
    done('public Club cards route to branded details and the correct navigation destination')
    # An explicit operator failure remains visible with a safe diagnostic, never raw messages.
    for code,diagnostic in [('failed-precondition','MD-PRECONDITION'),('permission-denied','MD-PERMISSION'),('unavailable','MD-UNAVAILABLE'),('unknown','MD-UNEXPECTED')]:
        page.evaluate('(code)=>{window.__mock.queryFailure={path:"lobbyEvents",code};}',code)
        nav('discover');page.wait_for_function('(code)=>document.querySelector("#lobby-dialog .feature-status").textContent.includes(code)',arg=diagnostic)
        assert page.locator('#lobby-results .skeleton-card').count()==0
        done('visible query failure '+diagnostic)
    page.evaluate('delete window.__mock.queryFailure');nav('discover');loaded()
    assert page.locator('[data-lobby-id]').count()==4
    done('recovery after a query failure restores actual results')
    linked(data['groups'][4]);
    fill_control(page,'#group-invite-search-name','Unknown');page.locator('#group-invite-search button').click()
    page.wait_for_function('document.querySelector("#groups-dialog .feature-status").textContent.includes("No matching")')
    assert page.locator('#group-invite button').is_disabled()
    unknown=page.evaluate('''async id=>{try{await(await import('./js/firebase/groupRepository.js')).inviteGroup('fixture-0',id,'missing-recipient');return null;}catch(e){return e.code;}}''',data['groups'][4])
    assert unknown=='invalid-recipient'
    done('unknown recipient produces no write and Send stays disabled')
    fill_control(page,'#group-invite-search-name','Garage Rider');page.locator('#group-invite-search button').click()
    page.wait_for_function('!document.querySelector("#group-invite button").disabled')
    page.locator('#group-invite button').click();page.wait_for_selector('[data-invitee-uid]')
    duplicate=page.evaluate('''async id=>{try{await(await import('./js/firebase/groupRepository.js')).inviteGroup('fixture-0',id,'fixture-1');return null;}catch(e){return e.code;}}''',data['groups'][4])
    assert duplicate=='duplicate-invite'
    management_click(page.locator('[data-invitee-uid]').get_by_role('button',name='Invitation link / QR',exact=True))
    assert page.locator('dialog:modal').count()==1 and page.locator('#groups-dialog').is_visible()
    page.keyboard.press('Escape');assert page.locator('dialog:modal').count()==0
    done('registered recipient invite, duplicate guard and one modal QR layer with Escape')
    # Programmatic completion forms are covered by existing GPS/cloud suites.
    previews=Path(os.environ['TEMP'])/'motodash-batch5-preview';previews.mkdir(exist_ok=True)
    nav('home');page.screenshot(path=str(previews/'home-en.png'))
    nav('discover');loaded();page.screenshot(path=str(previews/'discover-en.png'))
    nav('profile');open_garage(page);page.screenshot(path=str(previews/'garage-en.png'));page.keyboard.press('Escape')
    for width,height,language in [(320,568,'fi'),(390,844,'en'),(844,390,'fi')]:
        page.set_viewport_size({'width':width,'height':height});nav('profile');page.select_option('#profile-language',language)
        assert page.locator('html').get_attribute('lang')==language
        assert page.locator('#start-overlay').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
        nav('discover');page.wait_for_timeout(100)
        assert page.locator('#start-overlay').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
        assert page.locator('#bottom-nav button[aria-current=page]').count()==1
    done('320/390px portrait and phone landscape, English/Finnish and no shell overflow')
    page.set_viewport_size({'width':390,'height':844});nav('profile');page.select_option('#profile-language','fi');page.screenshot(path=str(previews/'profile-fi.png'))
    page.evaluate("document.documentElement.style.fontSize='200%'")
    assert page.locator('#start-overlay').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
    assert page.locator('.large-avatar').evaluate('(el)=>getComputedStyle(el).animationName')=='none'
    assert page.locator('.wordmark').bounding_box()['height']>=44
    assert page.evaluate('''async()=>{
      const {contrast}=await import('./js/data/branding.js');
      return contrast('#f2f2ee','#191c20')>=4.5 && contrast('#b3b7bc','#191c20')>=4.5 && contrast('#20180a','#e9bf73')>=4.5;
    }''')
    done('200% text and reduced-motion layout')
    # Account changes clear owned overview data; no previous-user content is retained.
    page.click('#profile-logout');page.wait_for_function('document.querySelector("#start-overlay").dataset.screen==="landing"')
    assert 'Vera West' not in page.locator('#home-title').inner_text()
    assert page.locator('#home-upcoming .event-card').count()==0 and page.locator('#home-clubs .community-card').count()==0
    assert not errors,errors
    assert not page.evaluate('window.__unhandled'),page.evaluate('window.__unhandled')
    done('logout clears owned identity/cards with no page errors or rejected promises')
    context.close()
    print(f'PASS: Batch 5 browser: {passed} named cases passed, 0 failed, 0 skipped; mocked SDK only; previews in {previews}')

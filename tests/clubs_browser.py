from navigation_helpers import click_action, expand_controls, fill_control, select_control, click_control
from firebase_mocks import install
from batch2_browser import register

def open_clubs(page):
    page.wait_for_function('document.body.dataset.ready === "true"')
    click_action(page, '#clubs-btn');page.wait_for_selector('#club-create')

def back(page):
    page.locator('#clubs-dialog').get_by_role('button',name='Back to Clubs',exact=True).click()
    page.wait_for_selector('#club-create')

def lookup(page,id):
    fill_control(page, '#club-lookup-url',page.url.split('#')[0]+'#/club/'+id);page.locator('#club-lookup button[type=submit]').click()
    page.wait_for_function('document.querySelector("#clubs-dialog .feature-status").textContent==="Up to date."')

def switch(page,email,new=False):
    if page.locator('#clubs-dialog').is_visible():page.locator('#clubs-dialog .feature-header button').click()
    page.evaluate("async()=>{await (await import('./js/firebase/auth.js')).logout();}")
    if new: register(page,email)
    else:
        click_action(page, '#account-btn');page.select_option('#auth-mode','login')
        page.fill('#auth-email',email);page.fill('#auth-password','fixture-password');page.click('#auth-submit')
        page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")')
        page.click('#account-close')
    open_clubs(page)

def run_club_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844});route_map(context);install(context)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("window.__unhandled=[];addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base,wait_until='networkidle');register(page,'owner@example.test');open_clubs(page)
    clubs={}
    assert not page.locator('#start-debug').is_visible()
    assert not page.locator('#start-version').is_visible()
    assert 'fixture-0' not in page.locator('#clubs-dialog').inner_text()
    for name,policy,visibility in [('Open Riders','open','public'),('Approval Riders','approval','public'),('Private Riders','private','private')]:
        page.click('#club-create');page.fill('#club-form-name',name);page.fill('#club-form-description','Welcome riders')
        page.select_option('#club-form-membershipPolicy',policy);page.select_option('#club-form-visibility',visibility)
        page.locator('#club-form button[type=submit]').click();page.wait_for_selector('#club-edit')
        id=page.evaluate('(name)=>Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).find(v=>v.name===name && v.schemaVersion===1).id',name)
        clubs[policy]=id;back(page)
    lookup(page,clubs['open']);page.click('#club-edit');page.fill('#club-form-description','Updated description')
    page.locator('#club-form button[type=submit]').click();page.wait_for_selector('#club-edit')
    assert 'Updated description' in page.locator('#clubs-dialog').inner_text()
    assert page.locator('.owner-name').inner_text()=='Garage Rider'
    assert page.locator('.member-name').first.inner_text()=='Garage Rider'
    assert page.locator('.profile-avatar').count()>0
    assert 'fixture-0' not in page.locator('#clubs-dialog').inner_text()
    switch(page,'member@example.test',True)
    lookup(page,clubs['open'])
    outsider=page.evaluate('''async(id)=>{
      const repo=await import('./js/firebase/clubRepository.js');
      return (await repo.loadClub('fixture-1',id)).club;
    }''',clubs['open'])
    assert 'ownerUid' not in outsider and 'lastMembershipUid' not in outsider
    assert outsider['description']=='Updated description'
    page.click('#club-join');page.wait_for_selector('#club-leave')
    assert not page.locator('#club-edit').count()
    denied=page.evaluate("""async(id)=>{
      const repo=await import('./js/firebase/clubRepository.js');const {getAccount}=await import('./js/auth-state.js');
      const v=await repo.loadClub(getAccount().uid,id);
      try{await repo.editClub(getAccount().uid,id,{...v.club,name:'Stolen'});return false;}
      catch(e){return e.code==='permission-denied';}
    }""",clubs['open']);assert denied
    back(page);lookup(page,clubs['approval']);page.click('#club-request')
    page.wait_for_function('document.querySelector("#clubs-dialog").textContent.includes("request pending")')
    switch(page,'owner@example.test');lookup(page,clubs['approval'])
    page.locator('[data-request-uid="fixture-1"]').get_by_role('button',name='Reject',exact=True).click()
    page.wait_for_function('!document.querySelector("[data-request-uid=fixture-1]")')
    switch(page,'member@example.test');lookup(page,clubs['approval'])
    assert 'request rejected' in page.locator('#clubs-dialog').inner_text()
    page.locator('#clubs-dialog').get_by_role('button',name='Cancel / clear request',exact=True).click()
    page.wait_for_selector('#club-request');page.click('#club-request')
    page.wait_for_function('document.querySelector("#clubs-dialog").textContent.includes("request pending")')
    switch(page,'owner@example.test');lookup(page,clubs['approval'])
    page.locator('[data-request-uid="fixture-1"]').get_by_role('button',name='Approve',exact=True).click()
    page.wait_for_function('!document.querySelector("[data-request-uid=fixture-1]")')
    back(page);lookup(page,clubs['private'])
    fill_control(page, '#club-invite-search-name','Garage Rider');page.locator('#club-invite-search button[type=submit]').click()
    page.wait_for_selector('#club-invite-recipient option',state='attached')
    select_control(page, '#club-invite-recipient','fixture-1')
    page.locator('#club-invite button[type=submit]').click()
    page.wait_for_function('(id)=>Boolean(JSON.parse(localStorage.getItem("__mockProfiles"))["clubs/"+id+"/invites/fixture-1"])',arg=clubs['private'])
    switch(page,'member@example.test')
    assert page.locator('#clubs-dialog article').count()>=2
    lookup(page,clubs['private']);page.click('#club-join');page.wait_for_selector('#club-leave')
    assert page.evaluate('(id)=>!JSON.parse(localStorage.getItem("__mockProfiles"))["clubs/"+id+"/invites/fixture-1"]',clubs['private'])
    page.on('dialog',lambda d:d.accept())
    page.click('#club-leave');page.wait_for_selector('#club-create')
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    page.click('#rank-add');page.fill('#rank-form-name','Captain');page.locator('#rank-form button[type=submit]').click()
    page.wait_for_selector('#rank-add')
    rank=page.evaluate('(id)=>Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).find(v=>v.name==="Captain" && v.displayOrder===0).id',clubs['open'])
    select_control(page, '#member-fixture-1-rankId',rank)
    page.locator('#member-fixture-1 button[type=submit]').click();page.wait_for_selector('#rank-add')
    switch(page,'member@example.test');lookup(page,clubs['open'])
    assert 'Captain' in page.locator('[data-member-uid="fixture-1"]').inner_text()
    assert 'fixture-1' not in page.locator('[data-member-uid="fixture-1"]').inner_text()
    page.evaluate("()=>{const r=JSON.parse(localStorage.getItem('__mockProfiles'));delete r['displayProfiles/fixture-0'];localStorage.setItem('__mockProfiles',JSON.stringify(r));}")
    page.reload(wait_until='networkidle');open_clubs(page);lookup(page,clubs['open'])
    assert page.locator('.owner-name').inner_text()=='Member'
    assert page.locator('[data-member-uid="fixture-0"] .member-name').inner_text()=='Member'
    page.select_option('#language-select','fi')
    assert page.locator('.owner-name').inner_text()=='J\u00e4sen'
    page.select_option('#language-select','en')
    assert not page.locator('#rank-add').count() and not page.locator('#club-admission').count()
    denial=page.evaluate("""async(id)=>{
      const {setMember}=await import('./js/firebase/clubRepository.js');const {getAccount}=await import('./js/auth-state.js');
      try{await setMember(getAccount().uid,id,getAccount().uid,'host',null);return false;}
      catch(e){return e.code==='permission-denied';}
    }""",clubs['open']);assert denial
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    select_control(page, '#member-fixture-1-technicalRole','admin');page.locator('#member-fixture-1 button[type=submit]').click()
    page.wait_for_selector('#rank-add')
    switch(page,'member@example.test');lookup(page,clubs['open'])
    assert page.locator('#rank-add').count() and page.locator('#club-admission').count()
    assert not page.locator('#member-fixture-0').count() and not page.locator('#member-fixture-1-technicalRole').count()
    denial=page.evaluate("""async(id)=>{
      const {setMember}=await import('./js/firebase/clubRepository.js');const {getAccount}=await import('./js/auth-state.js');
      const uid=getAccount().uid;let n=0;
      for(const [target,role] of [['fixture-0','member'],[uid,'owner']]) {
        try{await setMember(uid,id,target,role,null);}catch(e){if(e.code==='permission-denied')n++;}
      }return n;
    }""",clubs['open']);assert denial==2
    page.locator('[data-rank-id]').get_by_role('button',name='Edit',exact=True).click()
    page.fill('#rank-form-name','Road Lead');page.locator('#rank-form button[type=submit]').click();page.wait_for_selector('#rank-add')
    assert 'Road Lead' in page.locator('[data-member-uid="fixture-1"]').inner_text()
    page.locator('[data-rank-id]').get_by_role('button',name='Delete',exact=True).click();page.wait_for_selector('#rank-add')
    assert 'No rank' in page.locator('[data-member-uid="fixture-1"]').inner_text()
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    select_control(page, '#member-fixture-1-technicalRole','host');page.locator('#member-fixture-1 button[type=submit]').click();page.wait_for_selector('#rank-add')
    switch(page,'member@example.test');lookup(page,clubs['open'])
    assert not page.locator('#rank-add').count() and not page.locator('#club-admission').count()
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    theme=page.locator('#theme-btn').inner_text()
    fill_control(page, '#branding-form-primaryColor','#000000');fill_control(page, '#branding-form-accentColor','#ffffff')
    fill_control(page, '#branding-form-routeColor','#12ab34');select_control(page, '#branding-form-mapTheme','forest')
    fill_control(page, '#branding-form-description','<img src=x onerror=window.__injected=true> Club description')
    fill_control(page, '#branding-form-website','javascript:alert(1)')
    page.locator('#branding-form button[type=submit]').click()
    page.wait_for_function('document.querySelector("#clubs-dialog .feature-status").textContent.startsWith("Check the fields")')
    fill_control(page, '#branding-form-website','https://example.test/club?a=1&b=2')
    fill_control(page, '#branding-form-whatsapp','https://wa.me/358401234567')
    fill_control(page, '#branding-form-discord','https://discord.gg/fixture')
    fill_control(page, '#branding-form-instagram','https://www.instagram.com/fixture/')
    fill_control(page, '#branding-form-facebook','https://www.facebook.com/fixture/')
    page.locator('#branding-form button[type=submit]').click()
    page.wait_for_function('document.querySelector("#club-branding")?.style.backgroundColor==="rgb(0, 0, 0)"')
    assert page.locator('#club-branding').evaluate('(el)=>getComputedStyle(el).color')=='rgb(255, 255, 255)'
    assert page.locator('#club-branding img').count()==0
    fill_control(page, '#wall-form-text',"<img src=x onerror='window.__injected=true'>\nMeet at 10:00")
    page.locator('#wall-form button[type=submit]').click()
    page.wait_for_function('document.querySelector("#club-wall .club-description")?.textContent.includes("Meet at 10:00")')
    assert page.locator('#club-wall img').count()==0 and not page.evaluate('Boolean(window.__injected)')
    assert page.locator('#club-links a').count()==5
    for link in page.locator('#club-links a').all():
        assert link.get_attribute('href').startswith('https://') and link.get_attribute('rel')=='noopener noreferrer'
    check=page.evaluate("""async()=>{
      const {contrast,readableText}=await import('./js/data/branding.js');const {safeURL}=await import('./js/data/schema.js');
      let minimum=21,denied=0;
      for(let color=0;color<=0xffffff;color+=0x1111){const hex='#'+color.toString(16).padStart(6,'0');minimum=Math.min(minimum,contrast(hex,readableText(hex)));}
      for(const url of ['javascript:alert(1)','http://example.test','https://user:pass@example.test','data:text/html,<script>', 'https://example.test/'+String.fromCharCode(228).repeat(200)]){
        try{safeURL(url);}catch{denied++;}
      }return {minimum,denied};
    }""");assert check['minimum']>=4.5 and check['denied']==5
    assert page.locator('#theme-btn').inner_text()==theme
    page.reload(wait_until='networkidle');open_clubs(page);lookup(page,clubs['open'])
    assert 'Meet at 10:00' in page.locator('#club-wall').inner_text()
    assert page.locator('#branding-form-mapTheme').input_value()=='forest'
    switch(page,'member@example.test');lookup(page,clubs['open'])
    assert not page.locator('#branding-form').count() and not page.locator('#wall-form').count()
    assert 'Meet at 10:00' in page.locator('#club-wall').inner_text()
    denial=page.evaluate("""async(id)=>{
      const r=await import('./js/firebase/clubRepository.js'),{getAccount}=await import('./js/auth-state.js');let n=0;
      for(const op of [()=>r.updateBranding(getAccount().uid,id,{}),()=>r.saveWall(getAccount().uid,id,'Attack')]){
        try{await op();}catch(e){if(e.code==='permission-denied')n++;}
      }return n;
    }""",clubs['open']);assert denial==2
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    page.locator('#clubs-dialog').get_by_role('button',name='Archive Club',exact=True).click()
    page.wait_for_function('document.querySelector("#clubs-dialog").textContent.includes("Retirement is blocked")')
    assert not page.locator('#clubs-dialog').get_by_role('button',name='Retire Club permanently',exact=True).count()
    back(page);lookup(page,clubs['private'])
    page.locator('#clubs-dialog').get_by_role('button',name='Archive Club',exact=True).click()
    page.wait_for_selector('#clubs-dialog button:text("Retire Club permanently")')
    assert 'stored records remain inaccessible' in page.locator('#clubs-dialog').inner_text()
    page.select_option('#language-select','fi')
    page.locator('#clubs-dialog').get_by_role('button',name='Sulje kerho lopullisesti',exact=True).wait_for()
    assert 'Kerhoa ei voi avata uudelleen' in page.locator('#clubs-dialog').inner_text()
    page.select_option('#language-select','en')
    page.locator('#clubs-dialog').get_by_role('button',name='Retire Club permanently',exact=True).click()
    page.wait_for_selector('#club-create')
    retired=page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))',clubs['private'])
    assert retired['clubs/'+clubs['private']]['state']=='deleted'
    assert 'clubPages/'+clubs['private'] not in retired
    assert 'users/fixture-0/clubRefs/'+clubs['private'] not in retired
    assert 'clubs/'+clubs['private']+'/members/fixture-0' in retired
    inaccessible=page.evaluate('''async(id)=>{
      const repo=await import('./js/firebase/clubRepository.js');
      try{await repo.loadClub('fixture-0',id);return false;}catch(e){return e.code==='deleted';}
    }''',clubs['private']);assert inaccessible
    page.select_option('#language-select','fi')
    assert page.locator('#clubs-dialog h2').inner_text()=='Kerhot'
    page.set_viewport_size({'width':844,'height':390})
    assert page.locator('#clubs-dialog').bounding_box()['width']<=844
    assert page.locator('#start-overlay').evaluate('(el)=>el.scrollHeight>=el.clientHeight')
    assert not errors,errors
    assert not page.evaluate('window.__unhandled')
    context.close()
    print('PASS: MOCK Clubs create/edit/open join, request reject/reapply/approve, multiple memberships, UID invite consumption/private leave, repository ownership denial, archive/deletion policy, Finnish and landscape dialog')
    print('PASS: MOCK Owner role changes, limited Admin, read-only Host/Member, custom rank assignment/rename/deletion, Captain gives no technical rights, and repository escalation guards')
    print('PASS: MOCK branding/Wall save/reload, five HTTPS links, invalid/credential URL rejection, escaped plain text, >4.5 color contrast, Host denial and unchanged dashboard theme')

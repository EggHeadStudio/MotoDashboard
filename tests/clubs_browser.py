from firebase_mocks import install
from batch2_browser import register

def open_clubs(page):
    page.click('#clubs-btn');page.wait_for_selector('#club-create')

def back(page):
    page.locator('#clubs-dialog').get_by_role('button',name='Back to Clubs',exact=True).click()
    page.wait_for_selector('#club-create')

def lookup(page,id):
    page.fill('#club-lookup-id',id);page.locator('#club-lookup button[type=submit]').click()
    page.wait_for_function('document.querySelector("#clubs-dialog .feature-status").textContent==="Up to date."')

def switch(page,email,new=False):
    if page.locator('#clubs-dialog').is_visible():page.locator('#clubs-dialog .feature-header button').click()
    page.evaluate("async()=>{await (await import('./js/firebase/auth.js')).logout();}")
    if new: register(page,email)
    else:
        page.click('#account-btn');page.select_option('#auth-mode','login')
        page.fill('#auth-email',email);page.fill('#auth-password','fixture-password');page.click('#auth-submit')
        page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")')
        page.click('#account-close')
    open_clubs(page)

def run_club_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844});route_map(context);install(context)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base,wait_until='networkidle');register(page,'owner@example.test');open_clubs(page)
    clubs={}
    for name,policy,visibility in [('Open Riders','open','public'),('Approval Riders','approval','public'),('Private Riders','private','private')]:
        page.click('#club-create');page.fill('#club-form-name',name);page.fill('#club-form-description','Welcome riders')
        page.select_option('#club-form-membershipPolicy',policy);page.select_option('#club-form-visibility',visibility)
        page.locator('#club-form button[type=submit]').click();page.wait_for_selector('#club-edit')
        id=page.evaluate('(name)=>Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).find(v=>v.name===name && v.schemaVersion===1).id',name)
        clubs[policy]=id;back(page)
    lookup(page,clubs['open']);page.click('#club-edit');page.fill('#club-form-description','Updated description')
    page.locator('#club-form button[type=submit]').click();page.wait_for_selector('#club-edit')
    assert 'Updated description' in page.locator('#clubs-dialog').inner_text()
    switch(page,'member@example.test',True)
    lookup(page,clubs['open']);page.click('#club-join');page.wait_for_selector('#club-leave')
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
    back(page);lookup(page,clubs['private']);page.fill('#club-invite-uid','fixture-1')
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
    page.select_option('#member-fixture-1-rankId',rank)
    page.locator('#member-fixture-1 button[type=submit]').click();page.wait_for_selector('#rank-add')
    switch(page,'member@example.test');lookup(page,clubs['open'])
    assert 'Captain' in page.locator('[data-member-uid="fixture-1"]').inner_text()
    assert not page.locator('#rank-add').count() and not page.locator('#club-admission').count()
    denial=page.evaluate("""async(id)=>{
      const {setMember}=await import('./js/firebase/clubRepository.js');const {getAccount}=await import('./js/auth-state.js');
      try{await setMember(getAccount().uid,id,getAccount().uid,'host',null);return false;}
      catch(e){return e.code==='permission-denied';}
    }""",clubs['open']);assert denial
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    page.select_option('#member-fixture-1-technicalRole','admin');page.locator('#member-fixture-1 button[type=submit]').click()
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
    page.select_option('#member-fixture-1-technicalRole','host');page.locator('#member-fixture-1 button[type=submit]').click();page.wait_for_selector('#rank-add')
    switch(page,'member@example.test');lookup(page,clubs['open'])
    assert not page.locator('#rank-add').count() and not page.locator('#club-admission').count()
    switch(page,'owner@example.test');lookup(page,clubs['open'])
    page.locator('#clubs-dialog').get_by_role('button',name='Archive Club',exact=True).click()
    page.wait_for_function('document.querySelector("#clubs-dialog").textContent.includes("Deletion is blocked")')
    assert not page.locator('#clubs-dialog').get_by_role('button',name='Permanently delete Club',exact=True).count()
    back(page);lookup(page,clubs['private'])
    page.locator('#clubs-dialog').get_by_role('button',name='Archive Club',exact=True).click()
    page.wait_for_selector('#clubs-dialog button:text("Permanently delete Club")')
    page.locator('#clubs-dialog').get_by_role('button',name='Permanently delete Club',exact=True).click()
    page.wait_for_selector('#club-create')
    assert not page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["clubs/"+id]',clubs['private'])
    page.select_option('#language-select','fi')
    assert page.locator('#clubs-dialog h2').inner_text()=='Kerhot'
    page.set_viewport_size({'width':844,'height':390})
    rect=page.locator('#clubs-dialog').bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=391
    assert not errors,errors
    context.close()
    print('PASS: MOCK Clubs create/edit/open join, request reject/reapply/approve, multiple memberships, UID invite consumption/private leave, repository ownership denial, archive/deletion policy, Finnish and landscape dialog')
    print('PASS: MOCK Owner role changes, limited Admin, read-only Host/Member, custom rank assignment/rename/deletion, Captain gives no technical rights, and repository escalation guards')

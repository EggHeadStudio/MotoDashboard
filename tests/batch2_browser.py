"""Batch 2 UI tests with SDK fixtures. Permissions are tested separately in the real emulator."""
from firebase_mocks import install

def register(page,email='garage@example.test'):
    page.click('#account-btn')
    page.wait_for_function('!document.querySelector("#auth-submit").disabled')
    page.select_option('#auth-mode','register')
    page.fill('#auth-name','Garage Rider')
    page.fill('#auth-email',email)
    page.fill('#auth-password','fixture-password')
    page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-status").textContent.includes("profile is ready")')
    page.click('#account-close')

def open_garage(page):
    page.click('#garage-btn')
    page.wait_for_function('!document.querySelector("#garage-add").disabled')

def add_vehicle(page,name,category):
    page.click('#garage-add')
    page.fill('#vehicle-form-nickname',name)
    page.select_option('#vehicle-form-category',category)
    page.fill('#vehicle-form-manufacturer','Maker')
    page.fill('#vehicle-form-model','Model')
    page.fill('#vehicle-form-modelYear','2025')
    page.locator('#vehicle-form button[type=submit]').click()
    page.wait_for_selector('#garage-add')

def run_batch2_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844})
    route_map(context); install(context)
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base,wait_until='networkidle')
    page.click('#garage-btn')
    assert 'Sign in' in page.locator('#garage-dialog').inner_text()
    page.locator('#garage-dialog .feature-header button').click()
    register(page)
    open_garage(page)
    add_vehicle(page,'Road Bike','motorcycle'); add_vehicle(page,'Family Car','car')
    assert page.locator('#garage-dialog article').count()==2
    bike=page.locator('#garage-dialog article').filter(has_text='Road Bike')
    bike.get_by_role('button',name='Edit',exact=True).click()
    page.fill('#vehicle-form-nickname','Touring Bike')
    page.locator('#vehicle-form button[type=submit]').click()
    page.wait_for_selector('#garage-add')
    bike=page.locator('#garage-dialog article').filter(has_text='Touring Bike')
    bike.get_by_role('button',name='Make default',exact=True).click()
    page.wait_for_function('document.querySelector("#garage-dialog").textContent.includes("Default vehicle")')
    guard=page.evaluate("""async()=>{
      const {saveVehicle}=await import('./js/firebase/garageRepository.js');
      try { await saveVehicle('another-account',null,{nickname:'Stolen',category:'car'}); return false; }
      catch(e) { return e.code==='auth-required'; }
    }""")
    assert guard
    page.reload(wait_until='networkidle'); open_garage(page)
    assert page.locator('#garage-dialog article').count()==2
    assert 'Default vehicle' in page.locator('#garage-dialog').inner_text()
    page.on('dialog',lambda d:d.accept())
    page.locator('#garage-dialog article').filter(has_text='Family Car').get_by_role('button',name='Delete',exact=True).click()
    page.wait_for_function('document.querySelectorAll("#garage-dialog article").length===1')
    page.select_option('#language-select','fi')
    assert page.locator('#garage-dialog h2').inner_text()=='Autotalli'
    page.set_viewport_size({'width':320,'height':568})
    rect=page.locator('#garage-dialog').bounding_box()
    assert rect['x']>=0 and rect['x']+rect['width']<=321
    page.locator('#garage-dialog .feature-header button').click()
    page.select_option('#language-select','en')
    page.click('#account-btn'); page.click('#auth-logout')
    page.wait_for_function('document.querySelector("#auth-identity").textContent==="Not signed in"')
    page.click('#account-close'); page.click('#garage-btn')
    assert page.locator('#garage-dialog article').count()==0
    assert not errors,errors
    context.close()
    print('PASS: MOCK Garage motorcycle/car create, edit, default, reload, delete, owner guard, logout isolation, Finnish and 320px dialog')

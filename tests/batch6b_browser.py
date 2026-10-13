"""Batch 6B browser fixtures; no live Firebase/Worker or physical-device claim."""
from firebase_mocks import install
from batch2_browser import register

def run_batch6b_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568},reduced_motion='reduce')
    route_map(context);install(context);page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("window.__watches=0;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(){window.__watches++;return 1},clearWatch(){},getCurrentPosition(){}}})")
    page.goto(base,wait_until='networkidle')
    assert page.locator('#screen-landing').is_visible() and page.locator('#bottom-nav').is_hidden()
    assert page.locator('#notifications-bell').is_hidden() and page.evaluate('window.__watches')==0
    print('PASS: Batch 6B: anonymous landing hides private navigation and starts no GPS')
    assert page.locator('.landing-feature').count()==6 and page.locator('.landing-plan').count()==4
    assert page.locator('.landing-plan button').count()==0
    assert 'No subscriptions' in page.locator('.landing-plans').inner_text()
    page.click('#landing-explore')
    assert page.locator('#start-overlay').evaluate('(n)=>n.scrollTop>0 && n.scrollWidth<=n.clientWidth+1')
    assert page.locator('.reveal-ready').count()==0
    print('PASS: Batch 6B: all feature/pricing sections scroll, proposed prices have no purchase actions, reduced motion')
    page.select_option('#language-select','fi');assert 'Sinun ajoneuvosi' in page.locator('#landing-title').inner_text()
    page.reload(wait_until='networkidle');assert page.locator('html').get_attribute('lang')=='fi'
    page.select_option('#language-select','en');page.click('#landing-register')
    assert page.locator('#auth-mode').input_value()=='register' and page.locator('#auth-confirm-password').is_visible()
    page.click('#account-close');page.click('#landing-sign-in')
    assert page.locator('#auth-mode').input_value()=='login';page.click('#account-close')
    print('PASS: Batch 6B: EN/FI persistence and distinct sign-in/register actions')
    page.click('#landing-try');assert page.locator('#screen-home').is_visible() and page.evaluate('window.__watches')==0
    page.click('#guest-history');assert page.locator('#screen-rides').is_visible()
    page.click('#guest-landing');assert page.locator('#screen-landing').is_visible()
    print('PASS: Batch 6B: explicit guest entry/history/return remains local with no automatic GPS')
    register(page,'landing@example.test')
    assert page.locator('#screen-home').is_visible() and page.locator('#bottom-nav').is_visible()
    assert page.locator('#notifications-bell').is_visible() and page.evaluate('window.__watches')==0
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit')
    page.wait_for_selector('#public-profile-form');assert page.locator('#public-profile-form-visibility').input_value()=='private'
    page.select_option('#public-profile-form-visibility','public');page.locator('#public-profile-form button[type=submit]').click()
    page.wait_for_function('!document.getElementById("public-profile-editor")')
    alias=page.evaluate('JSON.parse(localStorage.getItem("__mockProfiles"))["users/fixture-0/preferences/publicProfile"].publicId')
    public=page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["publicProfiles/"+id]',alias)
    assert not any(key in public for key in ['uid','ownerUid','email','location','technicalRole'])
    page.goto(base+'#/rider/'+alias,wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider h1').inner_text()=='Garage Rider'
    assert '@' not in page.locator('#screen-rider').inner_text()
    page.reload(wait_until='networkidle');page.wait_for_selector('#screen-rider h1')
    assert page.locator('#screen-rider h1').inner_text()=='Garage Rider'
    print('PASS: Batch 6B: explicit profile publishing, safe projection and stable refreshed Pages profile route')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#profile-logout')
    page.wait_for_selector('#screen-landing');assert page.locator('#bottom-nav').is_hidden()
    print('PASS: Batch 6B: account entry and logout restore the correct shell without recording')
    assert not errors,errors;context.close()
    plain=browser.new_context(java_script_enabled=False,viewport={'width':320,'height':568})
    route_map(plain);p=plain.new_page();p.goto(base,wait_until='networkidle')
    assert p.locator('#landing-title').is_visible() and 'Your Vehicle' in p.locator('#landing-title').inner_text()
    assert p.locator('.landing-feature').count()==6
    print('PASS: Batch 6B: semantic landing content survives disabled JavaScript')
    plain.close()

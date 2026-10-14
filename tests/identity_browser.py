from navigation_helpers import click_action, expand_controls, fill_control, select_control, click_control
"""Name validation and owner profile editing; SDK fixtures, not live Firebase."""
from firebase_mocks import install

def run_identity_tests(browser, base, route_map):
    context = browser.new_context(viewport={'width':320,'height':568})
    route_map(context); install(context)
    page = context.new_page(); errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.goto(base, wait_until='networkidle')
    assert not errors,errors
    click_action(page, '#account-btn');page.wait_for_function('!document.querySelector("#auth-submit").disabled')
    page.select_option('#auth-mode','register')
    page.fill('#auth-email','identity4@example.test');page.fill('#auth-password','fixture-password')
    page.fill('#auth-confirm-password','fixture-password')
    for name in ['', '   ', 'ab', 'x'*31, '  a  ', '\U0001f3cd'*2, '\U0001f3cd'*31]:
        page.fill('#auth-name',name)
        if len(name.encode('utf-16-le'))//2>60:
            page.locator('#auth-name').evaluate('(input,value)=>input.value=value',name)
        page.click('#auth-submit')
        assert page.evaluate('window.__mock.creates') == 0
    page.fill('#auth-name','  M\u00e4ki \u96ea  ');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-form").hidden')
    page.wait_for_function('document.querySelector("#profile-name").value === "M\u00e4ki \u96ea"')
    assert page.evaluate('Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).some(p=>p.displayName === "M\u00e4ki \u96ea")')
    page.fill('#profile-name','Updated Rider');page.click('#profile-name-form button')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Updated Rider")')
    docs=page.evaluate('JSON.parse(localStorage.getItem("__mockProfiles"))')
    assert sum(p.get('displayName')=='Updated Rider' for p in docs.values()) == 2
    page.fill('#profile-name','\U0001f3cd'*30);page.click('#profile-name-form button')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("\\u{1f3cd}".repeat(30))')
    page.fill('#profile-name','Updated Rider');page.click('#profile-name-form button')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Updated Rider")')
    page.reload(wait_until='networkidle');click_action(page, '#account-btn')
    page.wait_for_function('document.querySelector("#profile-name").value === "Updated Rider"')
    page.fill('#profile-name','ab');page.click('#profile-name-form button')
    assert 'Updated Rider' in page.locator('#auth-identity').inner_text()
    page.select_option('#account-language','fi')
    assert 'n\u00e4ytt\u00f6nimi' in page.locator('#auth-status').inner_text()
    # Old private profiles without a name require an explicit choice, never an email fallback.
    page.evaluate('''()=>{const docs=JSON.parse(localStorage.getItem('__mockProfiles'));
      for(const [path,data] of Object.entries(docs))if(data.uid){data.displayName='';delete docs['displayProfiles/'+data.uid];}
      localStorage.setItem('__mockProfiles',JSON.stringify(docs));}''')
    page.reload(wait_until='networkidle');click_action(page, '#account-btn')
    page.wait_for_function('!document.querySelector("#profile-name-prompt").hidden && document.querySelector("#profile-name").value === ""')
    assert 'identity4@example.test' not in page.locator('#auth-identity').inner_text()
    page.fill('#profile-name','Chosen Rider');page.click('#profile-name-form button')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Chosen Rider")')
    assert page.locator('#profile-name-prompt').is_hidden()
    context.close()
    print('PASS: Batch 4 display name boundaries, Unicode/trim, private/projection persistence, owner edit/reload and Finnish errors (fixtures)')

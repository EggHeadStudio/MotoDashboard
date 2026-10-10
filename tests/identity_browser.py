"""Name validation and owner profile editing; SDK fixtures, not live Firebase."""
from firebase_mocks import install

def run_identity_tests(browser, base, route_map):
    context = browser.new_context(viewport={'width':320,'height':568})
    route_map(context); install(context)
    page = context.new_page(); page.goto(base, wait_until='networkidle')
    page.click('#account-btn');page.wait_for_function('!document.querySelector("#auth-submit").disabled')
    page.select_option('#auth-mode','register')
    page.fill('#auth-email','identity4@example.test');page.fill('#auth-password','fixture-password')
    page.fill('#auth-confirm-password','fixture-password')
    for name in ['', '   ', 'ab', 'x'*31, '  a  ']:
        page.fill('#auth-name',name);page.click('#auth-submit')
        assert page.evaluate('window.__mock.creates') == 0
    page.fill('#auth-name','  M\u00e4ki \u96ea  ');page.click('#auth-submit')
    page.wait_for_function('document.querySelector("#auth-form").hidden')
    page.wait_for_function('document.querySelector("#profile-name").value === "M\u00e4ki \u96ea"')
    assert page.evaluate('Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).some(p=>p.displayName === "M\u00e4ki \u96ea")')
    page.fill('#profile-name','Updated Rider');page.click('#profile-name-form button')
    page.wait_for_function('document.querySelector("#auth-identity").textContent.includes("Updated Rider")')
    docs=page.evaluate('JSON.parse(localStorage.getItem("__mockProfiles"))')
    assert sum(p.get('displayName')=='Updated Rider' for p in docs.values()) == 2
    page.reload(wait_until='networkidle');page.click('#account-btn')
    page.wait_for_function('document.querySelector("#profile-name").value === "Updated Rider"')
    page.fill('#profile-name','ab');page.click('#profile-name-form button')
    assert 'Updated Rider' in page.locator('#auth-identity').inner_text()
    page.select_option('#account-language','fi')
    assert 'n\u00e4ytt\u00f6nimi' in page.locator('#auth-status').inner_text()
    context.close()
    print('PASS: Batch 4 display name boundaries, Unicode/trim, private/projection persistence, owner edit/reload and Finnish errors (fixtures)')

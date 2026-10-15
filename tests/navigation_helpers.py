"""Use the redesigned visible navigation before exercising existing feature controls."""
def click_action(page, selector):
    if selector=='#account-btn':
        page.wait_for_function('document.querySelector("#auth-form").getAttribute("aria-busy")==="false"')
    if page.locator('#bottom-nav').is_hidden():
        if selector=='#account-btn':
            if page.locator('#landing-sign-in').is_visible():page.click('#landing-sign-in')
            else:page.locator('#guest-actions [data-auth-entry="login"]').click()
            return
        if page.locator('#landing-try').is_visible():page.click('#landing-try')
        if selector in ['#start-btn','#resume-session-btn']:page.click('#guest-home')
        if selector=='#history-btn':page.click('#guest-history');return
    destination = {'#account-btn':'profile','#garage-btn':'profile','#groups-btn':'rides',
                   '#clubs-btn':'clubs','#lobby-btn':'discover','#start-btn':'home',
                   '#resume-session-btn':'home','#history-btn':'home'}[selector]
    if selector in ['#clubs-btn','#lobby-btn']:
        page.locator(f'#bottom-nav button[data-destination="{destination}"]').click()
        return
    if not page.locator(selector).is_visible():
        page.locator(f'#bottom-nav button[data-destination="{destination}"]').click()
    page.click(selector)
    if selector in ['#start-btn','#resume-session-btn']:
        # Recorder ownership is asynchronous; wait for admission or a visible denial.
        page.wait_for_function('''()=>document.querySelector('#start-overlay').style.display==='none'
          || document.getElementById('active-ride-conflict')?.open
          || document.querySelector('#start-status').textContent.includes('ownership')''')

def expand_controls(page, selector):
    """Open enclosing disclosures using their visible summary, never force a hidden click."""
    locator = page.locator(selector)
    editor = locator.locator('xpath=ancestor::*[@data-edit-mode="view"]')
    if editor.count() and locator.locator('xpath=ancestor-or-self::*[@data-edit-only]').count():
        editor.first.locator(':scope > .edit-toolbar button').first.click()
    xpath = 'xpath=ancestor::details[not(@open)]'
    if locator.evaluate('(node)=>node.tagName==="SUMMARY"'):
        xpath = 'xpath=ancestor::details[not(@open)][position()>1]'
    parents = locator.locator(xpath)
    while parents.count():
        parents.first.locator(':scope > summary').click()
        parents = locator.locator(xpath)

def fill_control(page, selector, value):
    expand_controls(page, selector)
    page.fill(selector, value)

def select_control(page, selector, value):
    expand_controls(page, selector)
    page.select_option(selector, value)

def click_control(page, selector):
    expand_controls(page, selector)
    page.click(selector)

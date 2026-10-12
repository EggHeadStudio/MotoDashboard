"""Use the redesigned visible navigation before exercising existing feature controls."""
def click_action(page, selector):
    destination = {'#account-btn':'profile','#garage-btn':'profile','#groups-btn':'rides',
                   '#clubs-btn':'clubs','#lobby-btn':'discover','#start-btn':'home',
                   '#resume-session-btn':'home','#history-btn':'home'}[selector]
    if selector in ['#clubs-btn','#lobby-btn']:
        page.locator(f'#bottom-nav button[data-destination="{destination}"]').click()
        return
    if not page.locator(selector).is_visible():
        page.locator(f'#bottom-nav button[data-destination="{destination}"]').click()
    page.click(selector)

def expand_controls(page, selector):
    """Open enclosing disclosures using their visible summary, never force a hidden click."""
    locator = page.locator(selector)
    parents = locator.locator('xpath=ancestor::details[not(@open)]')
    while parents.count():
        parents.first.locator(':scope > summary').click()
        parents = locator.locator('xpath=ancestor::details[not(@open)]')

def fill_control(page, selector, value):
    expand_controls(page, selector)
    page.fill(selector, value)

def select_control(page, selector, value):
    expand_controls(page, selector)
    page.select_option(selector, value)

def click_control(page, selector):
    expand_controls(page, selector)
    page.click(selector)

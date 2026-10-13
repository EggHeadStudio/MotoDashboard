from navigation_helpers import click_action, expand_controls, fill_control, select_control, click_control
"""Registration regressions using intercepted SDK fixtures, never live Firebase."""
from pathlib import Path
import tempfile
from firebase_mocks import install, MOCK_AUTH


def run_confirmation_tests(browser, base, route_map):
    context = browser.new_context(viewport={'width': 320, 'height': 568})
    route_map(context)
    install(context)
    # Record call counts/argument count only; delay and stricter-policy fixtures.
    instrumented_auth = MOCK_AUTH.replace('window.__mock.creates++;', '''
      window.__mock.creates++;
      window.__mock.registrationArgumentCount = arguments.length;
      if (window.__mock.holdRegistration) {
        await new Promise(resolve => window.__mock.releaseRegistration = resolve);
      }
      if (window.__mock.registrationError) fail(window.__mock.registrationError);
    ''')
    context.route('https://www.gstatic.com/firebasejs/**/firebase-auth.js',
                  lambda route: route.fulfill(body=instrumented_auth, content_type='application/javascript'))
    page = context.new_page()
    errors, console_errors = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
    page.add_init_script("window.__unhandled=[]; addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base, wait_until='networkidle')
    click_action(page, '#account-btn')
    page.wait_for_function("!document.querySelector('#auth-submit').disabled")
    passed = []

    def case(name, check):
        assert check, name
        passed.append(name)

    def fill(password, confirmation):
        page.fill('#auth-password', password)
        page.fill('#auth-confirm-password', confirmation)

    def calls():
        return page.evaluate('window.__mock.creates')

    case('Login has no confirmation constraint', page.locator('#auth-confirm-password').is_disabled()
         and not page.locator('#auth-confirm-password').is_visible()
         and page.locator('#auth-password').get_attribute('autocomplete') == 'current-password'
         and page.evaluate("!document.querySelector('#auth-confirm-password').required"))
    page.select_option('#auth-mode', 'register')
    page.fill('#auth-name', 'Confirmation Rider')
    page.fill('#auth-email', 'confirmation@example.test')
    case('Registration fields and English labels', all(page.locator(selector).get_attribute('type') == 'password'
         and page.locator(selector).get_attribute('autocomplete') == 'new-password'
         and page.evaluate('(selector)=>document.querySelector(selector).required', selector)
         for selector in ['#auth-password', '#auth-confirm-password'])
         and page.locator('label[for=auth-password]').inner_text() == 'Password'
         and page.locator('label[for=auth-confirm-password]').inner_text() == 'Confirm password')

    fill('fixture-password', 'different-password')
    page.click('#auth-submit')
    case('English mismatch blocks Firebase and preserves/focuses inputs', calls() == 0
         and page.evaluate('window.__mock.writes') == 0
         and page.locator('#auth-status').inner_text() == 'Passwords do not match.'
         and page.locator('#auth-password').input_value() == 'fixture-password'
         and page.locator('#auth-confirm-password').input_value() == 'different-password'
         and page.evaluate("document.activeElement.id === 'auth-confirm-password'"))
    case('Mismatch is accessible', page.locator('#auth-confirm-password').get_attribute('aria-invalid') == 'true'
         and page.locator('#auth-confirm-password').get_attribute('aria-describedby') == 'auth-status'
         and page.locator('#auth-status').get_attribute('role') == 'status'
         and page.locator('#auth-status').get_attribute('aria-live') == 'polite'
         and page.locator('#auth-status').get_attribute('aria-atomic') == 'true')
    page.select_option('#account-language', 'fi')
    case('Finnish labels and live mismatch translation', page.locator('#auth-status').inner_text() == 'Salasanat eiv\u00e4t t\u00e4sm\u00e4\u00e4.'
         and page.locator('label[for=auth-password]').inner_text() == 'Salasana'
         and page.locator('label[for=auth-confirm-password]').inner_text() == 'Vahvista salasana')
    page.click('#auth-submit')
    case('Finnish mismatch blocks Firebase', calls() == 0 and page.locator('#auth-status').inner_text() == 'Salasanat eiv\u00e4t t\u00e4sm\u00e4\u00e4.')
    page.select_option('#account-language', 'en')

    for password, confirmation in [('fixture-password ', 'fixture-password'), ('fixture-password', 'Fixture-password')]:
        fill(password, confirmation)
        page.click('#auth-submit')
        assert calls() == 0 and page.locator('#auth-status').inner_text() == 'Passwords do not match.'
    case('Matching is exact, without trimming or changing case', calls() == 0)
    fill('fixture-password', '')
    page.click('#auth-submit')
    # Also dispatch submit directly: the JS guard must still apply native validity.
    page.locator('#auth-form').dispatch_event('submit')
    case('Empty confirmation blocks native and direct submits', calls() == 0
         and page.evaluate("document.querySelector('#auth-confirm-password').validity.valueMissing")
         and page.evaluate("document.activeElement.id === 'auth-confirm-password'"))
    fill('', 'fixture-password')
    page.click('#auth-submit')
    case('Empty original password is still blocked', calls() == 0
         and page.evaluate("document.querySelector('#auth-password').validity.valueMissing"))
    fill('short', 'short')
    page.click('#auth-submit')
    case('Existing six-character registration minimum is preserved', calls() == 0
         and page.evaluate("document.querySelector('#auth-password').validity.tooShort")
         and page.evaluate("document.querySelector('#auth-password').minLength === 6"))

    fill('fixture-password', 'fixture-password')
    page.evaluate("window.__mock.registrationError='auth/password-does-not-meet-requirements'")
    page.click('#auth-submit')
    page.wait_for_function("document.querySelector('#auth-status').textContent.startsWith('Choose a stronger password')")
    case('Stricter Firebase policy errors retain localized handling', calls() == 1
         and page.locator('#auth-status').inner_text() == "Choose a stronger password that meets the project's password policy."
         and page.locator('#auth-confirm-password').input_value() == '')
    page.evaluate('delete window.__mock.registrationError; window.__mock.holdRegistration=true')
    # Including leading/trailing spaces also verifies that matching values reach Auth unchanged.
    fill(' fixture-password ', ' fixture-password ')
    page.click('#auth-submit')
    page.wait_for_function('window.__mock.creates === 2')
    page.locator('#auth-form').dispatch_event('submit')
    case('Duplicate submissions are blocked while registering', calls() == 2
         and page.locator('#auth-submit').is_disabled()
         and page.locator('#auth-mode').is_disabled()
         and page.locator('#auth-form').get_attribute('aria-busy') == 'true')
    page.evaluate('window.__mock.releaseRegistration()')
    page.wait_for_function("document.querySelector('#auth-status').textContent === 'Signed in. Your profile is ready.'")
    case('Matching passwords register once; confirmation is not an SDK argument', calls() == 2
         and page.evaluate('window.__mock.registrationArgumentCount') == 3
         and page.locator('#auth-password').input_value() == ''
         and page.locator('#auth-confirm-password').input_value() == ''
         and page.locator('#auth-confirm-password').get_attribute('aria-invalid') is None)

    page.click('#auth-logout')
    page.wait_for_function("document.querySelector('#auth-identity').textContent === 'Not signed in'")
    fill('another-password', 'another-password')
    page.select_option('#auth-mode', 'login')
    page.fill('#auth-password', ' fixture-password ')
    page.click('#auth-submit')
    page.wait_for_function("document.querySelector('#auth-status').textContent === 'Signed in. Your profile is ready.'")
    case('Login succeeds without confirmation and preserves password bytes', page.evaluate('window.__mock.logins') == 1
         and calls() == 2 and page.locator('#auth-confirm-password').is_disabled()
         and page.locator('#auth-password').get_attribute('autocomplete') == 'current-password'
         and page.evaluate("document.querySelector('#auth-password').minLength === 1"))

    # SDK fixtures keep synthetic credentials in __mockAccounts to emulate persistence.
    # Exclude fixture keys; the actual app's storage/profiles must contain neither password.
    storage = page.evaluate("""() => [...Object.keys(localStorage).filter(key=>!key.startsWith('__mock')).map(key=>localStorage.getItem(key)),
      ...Object.keys(sessionStorage).map(key=>sessionStorage.getItem(key)), localStorage.getItem('__mockProfiles')].join(String.fromCharCode(10))""")
    case('App storage and Firestore profiles contain no passwords', 'fixture-password' not in storage and 'another-password' not in storage)
    root = Path(__file__).resolve().parents[1]
    auth_sources = '\n'.join((root / path).read_text(encoding='utf-8') for path in ['index.html', 'js/auth-ui.js', 'js/firebase/auth.js'])
    case('Password reset remains unimplemented', 'sendPasswordResetEmail' not in auth_sources
         and 'resetPassword' not in auth_sources and not page.get_by_role('button', name='Forgot password?').count())

    page.click('#auth-logout')
    page.wait_for_function("document.querySelector('#auth-identity').textContent === 'Not signed in'")
    page.select_option('#auth-mode', 'register')
    page.select_option('#account-language', 'fi')
    fill('fixture-password', 'different-password')
    page.click('#auth-submit')
    for width, height in [(320, 568), (390, 844), (568, 320)]:
        page.set_viewport_size({'width': width, 'height': height})
        rect = page.locator('#account-dialog').bounding_box()
        assert rect['x'] >= 0 and rect['x'] + rect['width'] <= width + 1
        assert rect['y'] >= 0 and rect['y'] + rect['height'] <= height + 1
        assert page.locator('#account-dialog').evaluate('(el)=>el.scrollWidth <= el.clientWidth')
        for selector in ['#auth-password', '#auth-confirm-password', '#auth-submit']:
            page.locator(selector).scroll_into_view_if_needed()
            assert page.locator(selector).bounding_box()['height'] >= 44
    page.set_viewport_size({'width': 320, 'height': 568})
    page.locator('#auth-confirm-password').focus()
    page.keyboard.press('Tab')
    assert page.evaluate("document.activeElement.id === 'auth-submit'")
    page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motodash-registration-fi-mobile.png'))
    page.select_option('#account-language', 'en')
    page.locator('#auth-confirm-password').focus()
    page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motodash-registration-en-mobile.png'))
    page.click('#account-close')
    page.wait_for_function("document.querySelector('#auth-password').value === '' && document.querySelector('#auth-confirm-password').value === '' && ['account-btn','landing-sign-in'].includes(document.activeElement.id)")
    case('Narrow layouts, keyboard navigation and close cleanup', page.locator('#auth-password').input_value() == ''
         and page.locator('#auth-confirm-password').input_value() == ''
         and page.evaluate("['account-btn','landing-sign-in'].includes(document.activeElement.id)"))
    assert not errors, errors
    assert not console_errors, console_errors
    assert not page.evaluate('window.__unhandled')
    context.close()
    print(f'PASS: password confirmation: {len(passed)} named cases passed, 0 failed, 0 skipped (mock SDK only)')

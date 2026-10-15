from navigation_helpers import click_action, expand_controls, fill_control, select_control, click_control
"""Development-only tests: Python + Playwright; no application build/runtime dependency.

Run: python tests/run_browser.py
Install the Python playwright package and its Chromium browser beforehand.
External map tiles/weather are fixtures; no Firebase account or cloud writes are made.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import base64
import json
import re
import tempfile
import threading
import urllib.request
import sys
from playwright.sync_api import sync_playwright
from firebase_mocks import install, run_account_tests

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT.parent)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
    cached = Path(tempfile.gettempdir()) / 'motodash-leaflet-tests'
    cached.mkdir(exist_ok=True)
    for name in ('leaflet.js', 'leaflet.css'):
        p = cached / name
        if not p.exists():
            p.write_bytes(urllib.request.urlopen('https://unpkg.com/leaflet@1.9.4/dist/' + name, timeout=30).read())
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        pixel = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=')
        def route_map(ctx):
            ctx.route('https://motodash-live.old-sound-55f2.workers.dev/v1/media/**',lambda route:route.fulfill(status=503,json={'error':'not_configured'},headers={'Access-Control-Allow-Origin':'*'}))
            ctx.route('https://unpkg.com/**', lambda route: route.fulfill(
                body=(cached / route.request.url.rsplit('/', 1)[-1]).read_bytes(),
                content_type='text/css' if route.request.url.endswith('.css') else 'application/javascript'))
            ctx.route(re.compile(r'https://.*(?:tile|openstreetmap).*\.png'), lambda route: route.fulfill(body=pixel, content_type='image/png'))
            ctx.route('https://api.open-meteo.com/**', lambda route: route.fulfill(json={'current': {'temperature_2m': 12, 'wind_speed_10m': 5, 'weather_code': 0}}))
        if '--batch85-only' in sys.argv:
            from batch85_browser import run_batch85_tests
            run_batch85_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--identity-only' in sys.argv:
            from identity_browser import run_identity_tests
            run_identity_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--clubs-only' in sys.argv:
            from clubs_browser import run_club_tests
            run_club_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--batch5-only' in sys.argv:
            from batch5_browser import run_batch5_tests
            run_batch5_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--batch6a-only' in sys.argv:
            from batch6a_browser import run_batch6a_tests
            run_batch6a_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--batch6b-only' in sys.argv:
            from batch6b_browser import run_batch6b_tests
            run_batch6b_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--batch8-only' in sys.argv:
            from batch8_browser import run_batch8_tests
            run_batch8_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--batch7-only' in sys.argv:
            from batch7_browser import run_batch7_tests
            run_batch7_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--groups-only' in sys.argv:
            from groups_browser import run_group_tests
            run_group_tests(browser,base,route_map)
            browser.close();server.shutdown();return
        if '--live-only' in sys.argv:
            from live_browser import run_live_tests
            run_live_tests(browser,base,route_map)
            c=browser.new_context();route_map(c);install(c);p=c.new_page();p.goto(base,wait_until='networkidle')
            output=p.evaluate('async()=> (await import("./tests/live-client-tests.js")).runLiveClientTests()')
            print('PASS:',output);c.close()
            browser.close();server.shutdown();return
        route_map(context)
        install(context)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script("""
          window.__geo = { callback: null, active: 0 };
          Object.defineProperty(navigator, 'geolocation', {value: {
            watchPosition(success,error) { window.__geo.callback = success; window.__geo.error = error; window.__geo.active++; return 1; },
            clearWatch() { window.__geo.active = 0; },
            getCurrentPosition() {}
          }});
          window.__position = (lat, lon, speed, time, accuracy=5, heading=90) => {
            const originalNow = Date.now; Date.now = () => time;
            try { window.__geo.callback?.({ timestamp: time, coords: {latitude:lat, longitude:lon, speed:speed/3.6, accuracy, heading} }); } finally { Date.now = originalNow; }
          };
          navigator.wakeLock = undefined;
          Element.prototype.requestFullscreen = undefined;
          window.__unhandled = [];
          window.addEventListener('unhandledrejection', e => window.__unhandled.push(String(e.reason)));
        """)
        page.goto(base, wait_until='networkidle')
        page.wait_for_function("document.querySelector('#start-btn').textContent === 'Start Ride'")
        assert page.locator('html').get_attribute('lang') == 'en'
        assert page.locator('#network-row').inner_text() == 'Online'
        page.select_option('#language-select', 'fi')
        assert page.locator('#start-btn').inner_text() == 'Aloita ajo'
        assert page.locator('#network-row').inner_text() == 'Verkko k\u00e4yt\u00f6ss\u00e4'
        page.reload(wait_until='networkidle')
        assert page.locator('html').get_attribute('lang') == 'fi'
        page.select_option('#language-select', 'en')
        result = page.evaluate("""async () => {
          const i = await import('./js/i18n/i18n.js');
          const {dictionary:d} = await import('./js/i18n/dictionary.js');
          const missing = Object.keys(d.en).filter(k => !(k in d.fi));
          const extra = Object.keys(d.fi).filter(k => !(k in d.en));
          const saved=d.fi['ui.ready']; delete d.fi['ui.ready']; i.setLanguage('fi');
          const fallback=i.t('ui.ready'); d.fi['ui.ready']=saved; i.setLanguage('en');
          d.en['test.params']='Hello {name}'; const params=i.t('test.params',{name:'Alex'}); delete d.en['test.params'];
          return {missing,extra,fallback,params};
        }""")
        assert result == {'missing': [], 'extra': [], 'fallback': 'Ready', 'params': 'Hello Alex'}, result
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        ids = re.findall(r'\bid="([^"]+)"', html)
        assert len(ids) == len(set(ids)), 'Duplicate IDs'
        keys = page.evaluate("async () => Object.keys((await import('./js/i18n/dictionary.js')).dictionary.en)")
        for path in ROOT.glob('js/**/*.js'):
            source = path.read_text(encoding='utf-8')
            for key in re.findall(r"\bt\(['\"]([^'\"]+)['\"]", source):
                if key.endswith('.'):
                    continue  # Dynamic category/role keys are checked against enum values below.
                assert key in keys, f'Missing key {key} in {path}'
            for prefix,values in [('category',['motorcycle','car','moped','scooter','atv-utv','off-road','snowmobile','caravan','bicycle','e-bike','e-scooter','other'])]:
                assert all(prefix+'.'+value in keys for value in values)
            for specifier in re.findall(r"\bfrom\s+['\"]([^'\"]+)['\"]", source):
                if specifier.startswith('.'):
                    assert (path.parent / specifier).exists(), (path, specifier)
        for key in re.findall(r'data-i18n(?:-[\w-]+)?="([^"]+)"', html):
            assert key in keys, key
        assert not errors, errors
        assert not page.evaluate('window.__unhandled'), page.evaluate('window.__unhandled')
        print('PASS: localization, English/Finnish parity, fallback/parameters, dynamic status, refresh persistence, DOM IDs and import paths')
        # Parse/link every existing application module through native browser ES modules.
        modules = ['js/' + str(p.relative_to(ROOT / 'js')).replace('\\', '/') for p in (ROOT / 'js').rglob('*.js')]
        page.evaluate('(paths) => Promise.all(paths.map(path => import("./" + path)))', modules)
        print('PASS: browser ES module syntax/linking; no page errors or unhandled rejections')
        click_action(page, '#start-btn')
        page.evaluate('window.__geo.error({code:1})')
        permission_en = page.locator('#gps-error-msg').inner_text()
        page.select_option('#language-select', 'fi')
        assert page.locator('#gps-error-msg').inner_text() != permission_en, 'GPS error must update language dynamically'
        assert 'Vianm\u00e4\u00e4ritys' in page.locator('#start-debug').inner_text()
        page.select_option('#language-select', 'en')
        page.click('#retry-gps-btn')
        start_time = page.evaluate('Date.now()')
        for n in range(9):
            page.evaluate('(v) => window.__position(...v)', [60 + n * 0.00009, 25, 36, start_time + n * 1000])
        page.wait_for_timeout(900)
        assert page.locator('#weather-row').inner_text() == 'Clear sky'
        assert page.locator('#stat-distance').inner_text() != '0.0 km'
        assert page.locator('.leaflet-tile-pane').count() == 1
        page.select_option('#language-select', 'fi')
        assert page.locator('#weather-row').inner_text() == 'Selke\u00e4\u00e4'
        page.select_option('#language-select', 'en')
        page.on('dialog', lambda dialog: dialog.accept('My original ride' if dialog.type == 'prompt' else None))
        page.click('#finish-session-btn')
        click_action(page, '#history-btn')
        assert 'My original ride' in page.locator('#history-list').inner_text()
        page.select_option('#language-select', 'fi')
        assert 'My original ride' in page.locator('#history-list').inner_text()
        assert 'Avaa' in page.locator('#history-list').inner_text()
        assert 'Nime\u00e4' in page.locator('#history-list').inner_text()
        page.select_option('#language-select', 'en')
        assert not errors, errors
        assert not page.evaluate('window.__unhandled'), page.evaluate('window.__unhandled')
        print('PASS: simulated recording, Leaflet layers, localized weather, finish/history and unchanged user ride names')
        if (ROOT / 'js/position-pipeline.js').exists():
            assert page.evaluate('window.__geo.active') == 0, 'Finish must clear GPS watch'
            page.click('#history-list button[data-action="open"]')
            assert page.locator('#history-detail').is_visible()
            assert page.locator('#session-stats-panel').is_hidden()
            assert page.locator('#history-detail .saved-ride-stats').is_visible()
            assert not page.locator('#finish-session-btn').is_visible()
            page.click('#saved-back')
            click_action(page, '#start-btn')
            page.click('#heading-btn')
            for n in range(4):
                page.evaluate('(v) => window.__position(...v)', [60 + n * 0.00009, 25, 36, start_time + 20000 + n * 1000])
            page.wait_for_timeout(900)
            assert 'rotate(0deg)' not in page.locator('#map').evaluate('(el) => el.style.transform'), 'Automatic heading must rotate map'
            assert page.locator('#hud').evaluate('(el) => getComputedStyle(el).transform') == 'none'
            assert page.locator('#map-controls').evaluate('(el) => getComputedStyle(el).transform') == 'none'
            assert page.locator('.leaflet-overlay-pane svg').count() >= 1
            for _ in range(5):
                page.click('#theme-btn')
            assert page.locator('#theme-btn').inner_text() == 'Theme: Normal'
            page.reload(wait_until='networkidle')
            page.wait_for_function('document.body.dataset.ready === "true"')
            assert page.evaluate('window.__geo.active') == 0, 'Anonymous landing never starts GPS on refresh'
            assert page.locator('#screen-landing').is_visible()
            click_action(page, '#resume-session-btn')
            assert page.evaluate('window.__geo.active') == 1, 'Explicit guest Resume restores the owned recording'
            assert not page.locator('#start-overlay').is_visible()
            assert page.locator('#heading-btn').inner_text() == 'Direction: heading-up', 'Heading preference survives refresh'
            page.click('#heading-btn')
            assert page.locator('#heading-btn').inner_text() == 'Direction: north-up'
            page.wait_for_function('document.querySelector("#map").style.transform === "rotate(0deg)"')
            page.evaluate("Object.defineProperty(navigator,'onLine',{value:false,configurable:true}); window.dispatchEvent(new Event('offline'))")
            assert page.locator('#network-row').inner_text() == 'Offline'
            page.evaluate("Object.defineProperty(navigator,'onLine',{value:true,configurable:true}); window.dispatchEvent(new Event('online'))")
            page.click('#finish-session-btn')
            assert page.evaluate('window.__geo.active') == 0
            assert not errors, errors
            assert not page.evaluate('window.__unhandled'), page.evaluate('window.__unhandled')
            page.screenshot(path=str(Path(tempfile.gettempdir()) / 'motodash-mobile-start.png'))
            print('PASS: finish cleanup, completed details, automatic heading, fixed HUD/map controls, theme cycle, refresh restore, heading preference and offline status')
        # Additional milestone-specific suites use the same instrumented browser context.
        test_file = ROOT / 'tests' / 'domain-tests.js'
        if test_file.exists():
            output = page.evaluate('async () => (await import("./tests/domain-tests.js")).runTests()')
            print('PASS:', output)
        run_account_tests(browser, base, route_map)
        from password_confirmation_browser import run_confirmation_tests
        run_confirmation_tests(browser, base, route_map)
        from identity_browser import run_identity_tests
        run_identity_tests(browser,base,route_map)
        from batch2_browser import run_batch2_tests
        run_batch2_tests(browser, base, route_map)
        from clubs_browser import run_club_tests
        run_club_tests(browser, base, route_map)
        from groups_browser import run_group_tests
        run_group_tests(browser,base,route_map)
        from live_browser import run_live_tests
        run_live_tests(browser,base,route_map)
        from batch5_browser import run_batch5_tests
        run_batch5_tests(browser,base,route_map)
        from batch6a_browser import run_batch6a_tests
        run_batch6a_tests(browser,base,route_map)
        from batch6b_browser import run_batch6b_tests
        run_batch6b_tests(browser,base,route_map)
        from batch7_browser import run_batch7_tests
        run_batch7_tests(browser,base,route_map)
        from batch8_browser import run_batch8_tests
        run_batch8_tests(browser,base,route_map)
        from batch85_browser import run_batch85_tests
        run_batch85_tests(browser,base,route_map)
        output=page.evaluate('async()=> (await import("./tests/live-client-tests.js")).runLiveClientTests()')
        print('PASS:',output)
        run_real_sdk_imports(browser, base, route_map)
        browser.close()
    server.shutdown()


def run_real_sdk_imports(browser, base, route_map):
    cache = Path(tempfile.gettempdir()) / 'motodash-firebase-sdk-tests'
    cache.mkdir(exist_ok=True)
    context = browser.new_context()
    route_map(context)
    def serve_sdk(route):
        name = route.request.url.rsplit('/', 1)[-1]
        path = cache / name
        if not path.exists():
            path.write_bytes(urllib.request.urlopen(route.request.url, timeout=30).read())
        route.fulfill(body=path.read_bytes(), content_type='application/javascript', headers={'Access-Control-Allow-Origin': '*'})
    context.route('https://www.gstatic.com/firebasejs/13.0.0/**', serve_sdk)
    # This check only imports/initializes real SDKs. Any cloud API request is forbidden.
    context.route(re.compile(r'https://.*(?:googleapis|firebaseio|firebasedatabase)\.(?:com|app)/.*'), lambda route: route.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base, wait_until='networkidle')
    result = page.evaluate("""async () => {
      const {getFirebase}=await import('./js/firebase/firebase.js');
      const [a,b]=await Promise.all([getFirebase(),getFirebase()]);
      const {db,sdk}=await (await import('./js/firebase/firestore.js')).getFirestoreService();
      if(db.app !== a.app) throw Error('Firebase project/app mismatch');
      const {validFirebaseConfig}=await import('./js/firebase/firebase.js');
      if(validFirebaseConfig({}) || validFirebaseConfig({...a.app.options,projectId:'other'})) throw Error('Invalid config accepted');
      if(typeof sdk.getDocFromServer!=='function')throw Error('Pinned SDK lacks server-only public reads');
      return {same:a===b,project:a.app.options.projectId,name:a.app.name,
        auth:typeof a.sdk.createUserWithEmailAndPassword, firestore:typeof sdk.runTransaction, user:a.auth.currentUser};
    }""")
    assert result == {'same': True, 'project': 'motodash-87bf8', 'name': 'MotoDash', 'auth': 'function', 'firestore': 'function', 'user': None}, result
    for source in (ROOT/'js').rglob('*.js'):
        assert 'firebase-database.js' not in source.read_text(encoding='utf-8')
        assert 'getRealtimeService' not in source.read_text(encoding='utf-8')
    assert not errors, errors
    context.close()
    print('PASS: REAL Firebase 13.0.0 Auth/Firestore imports and one MotoDash app; invalid config rejection and no production RTDB initialization/imports; cloud APIs blocked')


if __name__ == '__main__':
    run()


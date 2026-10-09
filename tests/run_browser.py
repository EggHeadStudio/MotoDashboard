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
from playwright.sync_api import sync_playwright

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
        context.route('https://unpkg.com/**', lambda route: route.fulfill(
            body=(cached / route.request.url.rsplit('/', 1)[-1]).read_bytes(),
            content_type='text/css' if route.request.url.endswith('.css') else 'application/javascript'))
        pixel = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=')
        context.route(re.compile(r'https://.*(?:tile|openstreetmap).*\.png'), lambda route: route.fulfill(body=pixel, content_type='image/png'))
        context.route('https://api.open-meteo.com/**', lambda route: route.fulfill(json={'current': {'temperature_2m': 12, 'wind_speed_10m': 5, 'weather_code': 0}}))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.add_init_script("""
          window.__geo = { callback: null, active: 0 };
          Object.defineProperty(navigator, 'geolocation', {value: {
            watchPosition(success) { window.__geo.callback = success; window.__geo.active++; return 1; },
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
        page.wait_for_function("document.querySelector('#start-btn').textContent === 'New session'")
        assert page.locator('html').get_attribute('lang') == 'en'
        assert page.locator('#network-row').inner_text() == 'Online'
        page.select_option('#language-select', 'fi')
        assert page.locator('#start-btn').inner_text() == 'Uusi sessio'
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
                assert key in keys, f'Missing key {key} in {path}'
            for specifier in re.findall(r"\bfrom\s+['\"]([^'\"]+)['\"]", source):
                if specifier.startswith('.'):
                    assert (path.parent / specifier).exists(), (path, specifier)
        for key in re.findall(r'data-i18n(?:-[\w-]+)?="([^"]+)"', html):
            assert key in keys, key
        assert not errors, errors
        assert not page.evaluate('window.__unhandled'), page.evaluate('window.__unhandled')
        print('PASS: localization, English/Finnish parity, fallback/parameters, dynamic status, refresh persistence, DOM IDs and import paths')
        # Parse/link every existing application module through native browser ES modules.
        modules = ['js/' + str(p.relative_to(ROOT / 'js')).replace('\\', '/') for p in (ROOT / 'js').glob('*.js')]
        page.evaluate('(paths) => Promise.all(paths.map(path => import("./" + path)))', modules)
        print('PASS: browser ES module syntax/linking; no page errors or unhandled rejections')
        page.click('#start-btn')
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
        page.click('#history-btn')
        assert 'My original ride' in page.locator('#history-list').inner_text()
        page.select_option('#language-select', 'fi')
        assert 'My original ride' in page.locator('#history-list').inner_text()
        assert 'Avaa' in page.locator('#history-list').inner_text()
        page.select_option('#language-select', 'en')
        assert not errors, errors
        assert not page.evaluate('window.__unhandled'), page.evaluate('window.__unhandled')
        print('PASS: simulated recording, Leaflet layers, localized weather, finish/history and unchanged user ride names')
        if (ROOT / 'js/position-pipeline.js').exists():
            assert page.evaluate('window.__geo.active') == 0, 'Finish must clear GPS watch'
            page.click('#history-list button[data-action="open"]')
            assert page.locator('#history-detail').is_visible()
            assert page.locator('#session-stats-panel').is_visible()
            assert not page.locator('#finish-session-btn').is_visible()
            page.click('#back-to-start-btn')
            page.click('#start-btn')
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
            assert page.evaluate('window.__geo.active') == 1, 'Active recording must restore after authoritative load'
            assert not page.locator('#start-overlay').is_visible()
            assert page.locator('#heading-btn').inner_text() == 'Direction: heading-up', 'Heading preference survives refresh'
            page.click('#heading-btn')
            assert page.locator('#heading-btn').inner_text() == 'Direction: north-up'
            assert 'rotate(0deg)' in page.locator('#map').evaluate('(el) => el.style.transform')
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
        browser.close()
    server.shutdown()


if __name__ == '__main__':
    run()


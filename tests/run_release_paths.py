"""Static /MotoDashboard/ path and unavailable-Firebase regression checks.
Run after tests/run_browser.py (uses its cached Leaflet fixtures).
All cloud API requests are blocked; no Firebase account/data operations.
"""
from pathlib import Path
from urllib.parse import urlparse, urljoin
from html.parser import HTMLParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading, re, json, tempfile, urllib.request, sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright
from run_browser import QuietHandler
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/MotoDashboard/'
refs=[]
class Assets(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,val in attrs:
            if key in ['src','href'] and val:refs.append((ROOT/'index.html',val))
Assets().feed((ROOT/'index.html').read_text(encoding='utf-8'))
for path in (ROOT/'js').rglob('*.js'):
    source=path.read_text(encoding='utf-8')
    for ref in re.findall(r"\bfrom\s*['\"]([^'\"]+)['\"]|\bimport\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",source):
        ref=next(x for x in ref if x)
        assert ref.startswith(('.', 'https://')), (path,ref)
        refs.append((path,ref))
for ref in re.findall(r"url\(['\"]?([^)'\"]+)", (ROOT/'css/dashboard.css').read_text(encoding='utf-8')):refs.append((ROOT/'css/dashboard.css',ref))
manifest=json.loads((ROOT/'manifest.webmanifest').read_text(encoding='utf-8'))
for ref in [manifest['start_url'],manifest['scope']]+[icon['src'] for icon in manifest['icons']]:refs.append((ROOT/'manifest.webmanifest',ref))
local=set()
for path,ref in refs:
    assert not ref.startswith('/'),(path,ref)
    if urlparse(ref).scheme or ref.startswith('#'):continue
    url=urljoin(base+path.relative_to(ROOT).as_posix(),ref)
    assert urlparse(url).path.startswith('/MotoDashboard/'),url
    local.add(url)
for url in local:
    with urllib.request.urlopen(url,timeout=5) as r:assert r.status==200,url
print(f'PASS: {len(refs)} literal asset/import/manifest references, {len(local)} unique local URLs HTTP 200 under /MotoDashboard/; no root-relative assets or bare imports')
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    ctx=browser.new_context()
    cache=Path(tempfile.gettempdir())/'motodash-leaflet-tests'
    ctx.route('https://unpkg.com/**',lambda route:route.fulfill(body=(cache/route.request.url.rsplit('/',1)[-1]).read_bytes(),content_type='text/css' if route.request.url.endswith('.css') else 'application/javascript'))
    ctx.route('https://www.gstatic.com/firebasejs/**',lambda route:route.abort())
    ctx.route(re.compile(r'https://.*(?:googleapis|firebaseio|firebasedatabase)\.(?:com|app)/.*'),lambda route:route.abort())
    ctx.route(re.compile(r'https://.*(?:tile|openstreetmap).*\.png'),lambda route:route.abort())
    ctx.route('https://api.open-meteo.com/**',lambda route:route.fulfill(json={'current':{'temperature_2m':12,'wind_speed_10m':5,'weather_code':0}}))
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''
        window.__cleaned=[];
        Object.defineProperty(navigator,'serviceWorker',{value:{getRegistrations:async()=>[
            {scope:new URL('./',location.href).href,unregister:async()=>window.__cleaned.push('this-app')},
            {scope:new URL('../Sibling/',location.href).href,unregister:async()=>window.__cleaned.push('sibling')}
        ]}});
        Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok){window.__position=ok;return 1},clearWatch(){},getCurrentPosition(){}}});
    ''')
    page.goto(base,wait_until='networkidle')
    page.wait_for_function("document.querySelector('#start-btn').textContent==='New session'")
    assert page.evaluate('window.__cleaned')==['this-app']
    page.click('#account-btn');assert page.locator('#auth-retry').is_visible();page.click('#account-close')
    page.click('#start-btn')
    page.evaluate('''()=>{const start=Date.now();for(let n=0;n<9;n++){const time=start+n*1000;const old=Date.now;Date.now=()=>time;try{window.__position({timestamp:time,coords:{latitude:60+n*.00009,longitude:25,speed:10,accuracy:5,heading:90}})}finally{Date.now=old}}}''')
    page.wait_for_timeout(800)
    assert page.locator('#stat-distance').inner_text()!='0.0 km'
    page.on('dialog',lambda d:d.accept('Firebase unavailable ride' if d.type=='prompt' else None))
    page.click('#finish-session-btn');page.click('#history-btn')
    assert 'Firebase unavailable ride' in page.locator('#history-list').inner_text()
    assert not errors,errors
    print('PASS: scoped legacy service-worker cleanup preserves sibling scope; Firebase unavailable still permits guest GPS recording, finish and history with visible account retry')
    browser.close()
server.shutdown()

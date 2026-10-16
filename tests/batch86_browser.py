"""Batch 8.6 product regressions: rendered local fixtures, no production calls."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle

def run_batch86_tests(browser,base,route_map):
    c=browser.new_context(viewport={'width':390,'height':844});route_map(c);install(c)
    p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(base,wait_until='networkidle');register(p,'ux86@example.test')
    colors=p.evaluate('''async()=>{const {contrast}=await import('./js/data/branding.js');
      const s=getComputedStyle(document.documentElement),v=k=>s.getPropertyValue(k).trim();
      return [contrast(v('--md-text'),v('--md-bg')),contrast(v('--md-muted'),v('--md-surface')),contrast(v('--md-gold'),v('--md-gold-ink'))];}''')
    assert all(ratio>=4.5 for ratio in colors),colors
    for width,height in [(320,568),(390,844),(430,932),(844,390),(768,1024),(1440,1000)]:
        p.set_viewport_size({'width':width,'height':height})
        assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert p.locator('#bottom-nav button').count()==5
    print('PASS: Batch 8.6 shared contrast tokens, six responsive widths and existing navigation')
    assert not errors,errors
    c.close()

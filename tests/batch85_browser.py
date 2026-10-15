"""Batch 8.5 browser checks, local fixtures only."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle
from navigation_helpers import click_control
import base64,json
from pathlib import Path

def run_batch85_tests(browser,base,route_map):
    c=browser.new_context(viewport={'width':320,'height':568});route_map(c);install(c)
    p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(base,wait_until='networkidle');register(p,'ux85@example.test')
    open_garage(p);add_vehicle(p,'A long Finnish vehicle name','motorcycle')
    assert p.locator('#garage-dialog .feature-body').get_attribute('data-edit-mode')=='view'
    assert not p.locator('[data-media-kind=vehicle]').is_visible()
    assert p.locator('.vehicle-card').get_by_role('button',name='Choose for ride',exact=True).is_visible()
    p.click('#garage-edit');assert p.locator('[data-media-kind=vehicle]').is_visible()
    p.locator('.vehicle-card').get_by_role('button',name='Edit',exact=True).click()
    p.fill('#vehicle-form-nickname','Unsaved change')
    prompts=[]
    def dismiss(dialog):prompts.append(dialog.message);dialog.dismiss()
    p.on('dialog',dismiss);p.locator('#garage-dialog .feature-header button').click()
    assert prompts and p.locator('#vehicle-form').is_visible()
    p.remove_listener('dialog',dismiss);p.on('dialog',lambda dialog:dialog.accept())
    p.locator('#garage-dialog .feature-header button').click()
    assert not p.locator('#garage-dialog').is_visible()
    assert not errors,errors
    print('PASS: Batch 8.5 View/Edit separates management from content and guards unsaved closing at 320px')
    result=p.evaluate('''async()=>{const {dictionary:d}=await import('./js/i18n/dictionary.js');
      const {batch85:b}=await import('./js/i18n/batch85.js');return Object.keys(b.en).every(k=>typeof b.fi[k]==='string')
       && !Object.values(b.fi).some(v=>/\\w\\?\\w/.test(v)) && d.fi['ride.personal']==='Oma profiili';}''')
    assert result
    print('PASS: Batch 8.5 English/Finnish key parity and intact Unicode labels')
    fixture=json.loads((Path(__file__).resolve().parents[1]/'cloudflare/tests/media-fixtures.json').read_text())
    media={'revision':1,'images':[{'id':'rank-image','slot':'icon','published':False}],'theme':{'icon':'star','badge':'crest'},'canWrite':True}
    deny=[False]
    def route_media(route):
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization'}
        if route.request.method=='OPTIONS':route.fulfill(status=204,headers=headers)
        elif '/images/' in route.request.url:
            if deny[0]:route.fulfill(status=403,json={'error':'access_denied'},headers=headers)
            else:route.fulfill(body=base64.b64decode(fixture['image/png']),content_type='image/png',headers=headers)
        else:route.fulfill(json=media,headers=headers)
    c.route('https://motodash-live.old-sound-55f2.workers.dev/v1/media/**',route_media)
    p.evaluate('''async()=>{const {decorateMedia}=await import('./js/media/media-render.js');const n=document.createElement('span');n.id='test-rank';n.className='rank-graphic';
      n.style.cssText='position:fixed;top:0;left:0;z-index:999999';document.body.append(n);window.__rankTarget={kind:'rank',id:'testclub',child:'captain'};
      decorateMedia(n,window.__rankTarget,{icon:n},{rank:true});}''')
    p.wait_for_selector('#test-rank.has-rank-image');assert p.locator('#test-rank img').is_visible()
    assert p.locator('#test-rank svg').evaluate('(n)=>getComputedStyle(n).visibility')=='hidden'
    media['images'][0]['id']='replacement'
    p.evaluate("dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target:window.__rankTarget}}))")
    p.wait_for_selector('#test-rank.has-rank-image');assert p.locator('#test-rank img').count()==1
    media['images']=[]
    p.evaluate("dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target:window.__rankTarget}}))")
    p.wait_for_function('!document.querySelector("#test-rank img")')
    assert p.locator('#test-rank svg').is_visible()
    media['images']=[{'id':'denied','slot':'icon','published':False}];deny[0]=True
    p.evaluate("dispatchEvent(new CustomEvent('motodash-media-updated',{detail:{target:window.__rankTarget}}))")
    p.wait_for_timeout(150);assert p.locator('#test-rank svg').is_visible() and not p.locator('#test-rank img').count()
    assert not errors,errors
    print('PASS: Batch 8.5 custom rank image precedence, replacement, deletion and unauthorized-image fallback')
    result=p.evaluate('''async()=>{const {colorField,decoratePalette}=await import('./js/ui/palette.js');
      const form=document.createElement('form');form.id='palette-test';document.body.append(form);
      const c=colorField(form,'route','branding.route',{value:'#123456',optional:true});
      const picker=form.querySelector('input[type=color]');picker.value='#6bbde9';picker.dispatchEvent(new Event('input'));
      if(c.value!=='#6bbde9'||new FormData(form).get('route')!=='#6bbde9')throw Error('color value lost');
      const {contrast,readableText}=await import('./js/data/branding.js');
      if(contrast(c.value,readableText(c.value))<4.5)throw Error('contrast');
      form.remove();return true;}''')
    assert result and not errors,errors
    print('PASS: Batch 8.5 visual color selection preserves legacy values, form serialization and readable contrast')
    c.close()

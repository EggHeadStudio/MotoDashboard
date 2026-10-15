"""Batch 8.5 browser checks, local fixtures only."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle
from navigation_helpers import click_control

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
    c.close()

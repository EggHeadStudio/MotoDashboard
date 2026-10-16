"""Batch 8.6 product regressions: rendered local fixtures, no production calls."""
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle

def run_batch86_tests(browser,base,route_map):
    c=browser.new_context(viewport={'width':390,'height':844});route_map(c);install(c)
    p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.add_init_script('''window.__geo={active:0,count:0};Object.defineProperty(navigator,'geolocation',{value:{watchPosition(fn){window.__geo.callback=fn;window.__geo.active++;window.__geo.count++;return 1;},clearWatch(){window.__geo.active=0;}}});Element.prototype.requestFullscreen=undefined;navigator.wakeLock=undefined;''')
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
    p.set_viewport_size({'width':390,'height':844});p.locator('#bottom-nav [data-destination=home]').click()
    start=p.locator('#start-btn').bounding_box();nav=p.locator('#bottom-nav').bounding_box()
    assert start['y']+start['height']<nav['y'],(start,nav)
    assert p.locator('.launch-privacy').is_visible() and not p.locator('#ride-launch-contribution').is_visible()
    p.locator('.launch-privacy summary').click();assert not p.locator('#ride-launch-contribution').is_checked()
    assert p.locator('#ride-launch-group').is_visible() and p.locator('#ride-launch-identity').is_visible()
    assert not p.evaluate("async()=>{const c=(await import('./js/ride-context.js')).getRideContext();return c.recordingId||c.sharing;}")
    print('PASS: Batch 8.6 compact Home keeps Start above navigation and privacy optional without admission/sharing')
    p.locator('#bottom-nav [data-destination=discover]').click()
    p.wait_for_function('document.querySelector("#lobby-dialog .feature-body").getAttribute("aria-busy")==="false"')
    assert p.locator('.discovery-tabs button').count()==6
    assert p.locator('[data-discovery-tab=featured]').get_attribute('aria-pressed')=='true'
    p.click('[data-discovery-tab=people]');p.wait_for_selector('#people-search')
    p.wait_for_function('document.querySelector("#lobby-dialog .feature-status").textContent===""')
    for language in ['en','fi']:
        p.select_option('#language-select',language)
        for width in [320,390,430]:
            p.set_viewport_size({'width':width,'height':844})
            buttons=p.locator('.discovery-tabs button').evaluate_all('(nodes)=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,w:r.width,h:r.height};})')
            assert all(n['x']>=0 and n['x']+n['w']<=width and n['h']>=44 for n in buttons)
    print('PASS: Batch 8.6 deliberate Discover navigation and People search have no stale global loading or clipped EN/FI targets')
    p.select_option('#language-select','en');p.locator('#bottom-nav [data-destination=profile]').click()
    p.wait_for_selector('.profile-visibility');assert p.locator('.profile-visibility').inner_text()=='Private profile'
    p.click('#public-profile-edit');p.wait_for_selector('#public-profile-form')
    p.fill('#public-profile-form-bio','My weekend road story.');p.locator('#public-profile-form button[type=submit]').click()
    p.wait_for_function('!document.getElementById("public-profile-editor")')
    p.wait_for_function('document.querySelector(".own-bio").textContent==="My weekend road story."')
    assert p.locator('.profile-visibility').inner_text()=='Private profile'
    open_garage(p);add_vehicle(p,'Weekend explorer','motorcycle')
    assert p.locator('.garage-grid .vehicle-card').count()==1
    assert not p.locator('[data-media-kind=vehicle]').is_visible()
    assert p.locator('.vehicle-card').get_by_role('button',name='Choose for ride',exact=True).is_visible()
    p.locator('#garage-dialog .feature-header button').click()
    print('PASS: Batch 8.6 actual own bio/privacy and Garage collection preserve private defaults and View/Edit boundaries')
    p.locator('#bottom-nav [data-destination=clubs]').click();p.wait_for_selector('#club-create');p.click('#club-create')
    p.fill('#club-form-name','Weekend Crew');p.locator('#club-form button[type=submit]').click();p.wait_for_selector('#club-edit')
    assert p.locator('#clubs-dialog .section-nav button').count()>=4
    before=p.evaluate('window.__mock.queries.length')
    p.locator('#clubs-dialog .section-nav').get_by_role('button',name='Members and ranks',exact=True).click()
    assert p.evaluate('window.__mock.queries.length')==before
    assert p.evaluate('document.activeElement.closest("#club-members")!==null')
    assert not p.locator('#branding-form').is_visible()
    assert p.locator('#club-wall').evaluate('(node)=>node===node.parentElement.lastElementChild')
    print('PASS: Batch 8.6 Club section jumps focus existing authorized content without additional queries or exposing editors')
    p.locator('#bottom-nav [data-destination=rides]').click();p.click('#groups-btn');p.click('#group-create')
    p.fill('#group-form-title','Weekend meet');p.fill('#group-form-meetingArea','Helsinki area');p.select_option('#group-form-activityType','meet')
    p.locator('#group-form button[type=submit]').click();p.wait_for_selector('#group-edit')
    assert p.locator('.group-hero time').get_attribute('datetime')
    assert p.locator('.group-organizer').inner_text().startswith('Organized by')
    p.locator('#groups-dialog .section-nav [aria-controls=group-attendance]').click()
    assert p.evaluate('document.activeElement.closest("#group-attendance")!==null')
    assert p.locator('#group-attendance').bounding_box()['y']<p.locator('#group-vehicle').bounding_box()['y']
    assert not p.evaluate("async()=>(await import('./js/ride-context.js')).getRideContext().sharing")
    print('PASS: Batch 8.6 shared activity detail prioritizes actual date, organizer and independent RSVP without live consent')
    p.click('#group-edit');assert p.locator('#group-edit').get_attribute('aria-expanded')=='true'
    assert p.locator('#groups-dialog [data-edit-only].section-nav').is_visible()
    p.click('#group-general-edit');p.wait_for_selector('#group-form .editor-section')
    assert p.locator('#group-form .editor-section').count()==3
    p.fill('#group-form-title','');p.locator('#group-form button[type=submit]').click()
    assert p.locator('#group-form-title').get_attribute('aria-invalid')=='true'
    p.fill('#group-form-title','Unsaved replacement')
    assert p.locator('#group-form-title').get_attribute('aria-invalid') is None
    prompts=[]
    def stay(dialog):prompts.append(dialog.message);dialog.dismiss()
    p.on('dialog',stay);p.locator('#bottom-nav [data-destination=home]').click()
    assert prompts and p.locator('#group-form-title').input_value()=='Unsaved replacement'
    p.remove_listener('dialog',stay);p.on('dialog',lambda dialog:dialog.accept())
    p.locator('#bottom-nav [data-destination=home]').click()
    assert p.locator('#screen-home').is_visible()
    print('PASS: Batch 8.6 grouped editors preserve FormData, native accessible validation and unsaved navigation guards')
    p.set_viewport_size({'width':390,'height':844});p.click('#start-btn');p.wait_for_function('window.__geo.active===1')
    assert p.locator('#map').is_visible() and p.locator('#session-stats-grid').bounding_box()['width']>200
    speed=p.locator('#speed-block').bounding_box();bottom=p.locator('#bottom-panel').bounding_box()
    assert bottom['y']-(speed['y']+speed['height'])>100,(speed,bottom)
    p.click('#back-to-start-btn');p.locator('#bottom-nav [data-destination=profile]').click();p.click('#return-to-ride')
    assert p.evaluate('window.__geo.count')==1 and p.evaluate('window.__geo.active')==1
    assert p.locator('#finish-session-btn').is_visible()
    print('PASS: Batch 8.6 restrained dashboard retains visible map, readable statistics and one watcher through Return to Ride')
    assert not errors,errors
    c.close()

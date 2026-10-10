"""Group UI browser integration with SDK fixtures; rules are tested separately."""
from firebase_mocks import install
from batch2_browser import register

def run_group_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':390,'height':844});route_map(context);install(context)
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.add_init_script("window.__unhandled=[];addEventListener('unhandledrejection',e=>window.__unhandled.push(String(e.reason)))")
    page.goto(base,wait_until='networkidle');register(page,'host@example.test')
    page.click('#groups-btn');page.wait_for_selector('#group-create')
    ids=[]
    for title,activity,visibility,policy in [('Morning Ride','ride','public','open'),('Private Meet','meet','private','invite'),('Approval Event','event','approval','approval')]:
        page.click('#group-create');page.wait_for_selector('#group-form')
        page.fill('#group-form-title',title);page.fill('#group-form-description','Bring water')
        page.select_option('#group-form-activityType',activity);page.fill('#group-form-meetingArea','Helsinki')
        page.fill('#group-form-meetingLocation','Private entrance behind the building')
        page.select_option('#group-form-visibility',visibility);page.select_option('#group-form-joiningPolicy',policy)
        page.locator('#group-form button[type=submit]').click();page.wait_for_selector('#group-edit')
        id=page.evaluate('(title)=>Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).find(r=>r.title===title && r.creatorUid).id',title);ids.append(id)
        assert id not in page.locator('#groups-dialog').inner_text()
        assert page.locator('.group-meeting').inner_text()=='Private entrance behind the building'
        page.locator('#groups-dialog').get_by_role('button',name='Back to Group Sessions',exact=True).click();page.wait_for_selector('#group-create')
    page.locator(f'[data-group-id="{ids[0]}"]').get_by_role('button',name='Open',exact=True).click();page.wait_for_selector('#group-edit')
    page.click('#group-edit');page.fill('#group-form-title','Updated Ride');page.locator('#group-form button[type=submit]').click();page.wait_for_selector('#group-edit')
    assert 'Updated Ride' in page.locator('#groups-dialog').inner_text()
    page.click('#group-active');page.wait_for_selector('#group-completed')
    page.click('#group-completed');page.wait_for_function('document.querySelector("#groups-dialog").textContent.includes("Completed")')
    assert not page.locator('#group-edit').count()
    page.select_option('#language-select','fi');assert 'P\u00e4\u00e4ttynyt' in page.locator('#groups-dialog').inner_text()
    page.select_option('#language-select','en');page.set_viewport_size({'width':320,'height':568})
    assert page.locator('#groups-dialog').bounding_box()['width']<=320
    page.set_viewport_size({'width':844,'height':390})
    assert page.locator('#groups-dialog').bounding_box()['height']<=390
    assert not errors and not page.evaluate('window.__unhandled'), (errors,page.evaluate('window.__unhandled'))
    context.close()
    print('PASS: MOCK Group Session creation, public/private/approval, edit/start/complete, private meeting details, hidden IDs, Finnish and mobile/landscape')

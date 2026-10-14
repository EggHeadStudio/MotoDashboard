"""Batch 7 browser integration fixtures; no live account/physical-device claim."""
from firebase_mocks import install
from batch2_browser import register
import uuid

def run_batch7_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568})
    route_map(context);install(context);page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base,wait_until='networkidle');register(page,'batch7@example.test')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    page.select_option('#public-profile-form-visibility','public');page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    records=page.evaluate('JSON.parse(localStorage.getItem("__mockProfiles"))');entry=next(v for k,v in records.items() if k.startswith('profileDirectory/'))
    assert set(entry)=={'id','displayName','searchName','category','accent','visibility','updatedAt'} and entry['searchName']==entry['displayName'].lower()
    print('PASS: Batch 7: explicit Public save synchronizes a minimal opaque People directory without private fields')
    aliases=[str(uuid.uuid4()) for _ in range(23)]
    page.evaluate('''ids=>{const records=JSON.parse(localStorage.getItem('__mockProfiles'));for(const id of ids){
      records['profileDirectory/'+id]={id,displayName:'MÄKI Rider',searchName:'mäki rider',category:'car',accent:'ocean',visibility:'public',updatedAt:{__serverTimestamp:true}};
      records['publicProfiles/'+id]={id,displayName:'MÄKI Rider',bio:'Public touring',category:'car',accent:'ocean',banner:'road',featuredVehicle:null,vehicleIds:[],affiliationIds:[],updatedAt:{__serverTimestamp:true}};}
      records['users/private-user']={displayName:'MÄKI Private',email:'SECRET@example.test'};
      records['displayProfiles/private-user']={displayName:'MÄKI Private',updatedAt:{__serverTimestamp:true}};
      localStorage.setItem('__mockProfiles',JSON.stringify(records));}''',aliases)
    page.locator('#bottom-nav [data-destination=discover]').click();page.get_by_role('button',name='People',exact=True).click()
    before=page.evaluate('(window.__mock.queries||[]).filter(q=>q.path==="profileDirectory").length')
    page.fill('#people-search-name','m');page.locator('#people-search button[type=submit]').click()
    assert page.evaluate('(window.__mock.queries||[]).filter(q=>q.path==="profileDirectory").length')==before
    page.fill('#people-search-name','  MÄ  ');page.locator('#people-search button[type=submit]').click();page.wait_for_selector('#people-results .person-card')
    assert page.locator('#people-results .person-card').count()==10 and 'SECRET' not in page.locator('#people-results').inner_text() and 'Private' not in page.locator('#people-results').inner_text()
    page.click('#people-more');page.wait_for_function('document.querySelectorAll("#people-results .person-card").length===20')
    page.click('#people-more');page.wait_for_function('document.querySelectorAll("#people-results .person-card").length===23')
    found=page.locator('#people-results .person-card').evaluate_all('(rows)=>rows.map(row=>row.dataset.profileId)')
    assert len(set(found))==23 and set(found)==set(aliases)
    queries=page.evaluate('window.__mock.queries.filter(q=>q.path==="profileDirectory")');assert all(any(f['kind']=='limit' and f['value']==10 for f in q['filters']) for q in queries)
    assert all(any(f['kind']=='where' and f['field']=='searchName' and f['value']=='mä' for f in q['filters']) for q in queries)
    print('PASS: Batch 7: normalized Unicode prefix search uses bounded server queries and pages duplicate names without private recipient search')
    page.locator('#people-results .person-card a').first.click();page.wait_for_selector('#screen-rider h1');assert page.locator('#screen-rider h1').inner_text()=='MÄKI Rider'
    page.reload(wait_until='networkidle');page.wait_for_selector('#screen-rider h1');assert page.locator('#screen-rider h1').inner_text()=='MÄKI Rider'
    print('PASS: Batch 7: People opens stable public profile routes and reloads under the Pages subpath')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    page.select_option('#public-profile-form-visibility','private');page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    assert page.evaluate('(id)=>JSON.parse(localStorage.getItem("__mockProfiles"))["profileDirectory/"+id]===undefined',entry['id'])
    print('PASS: Batch 7: making a profile Private atomically removes its search entry')
    page.locator('#bottom-nav [data-destination=discover]').click();page.select_option('#language-select','fi');page.get_by_role('button',name='Ihmiset',exact=True).click()
    assert page.get_by_label('Julkinen näyttönimi').is_visible()
    rect=page.locator('#people-search').bounding_box();assert rect['x']>=0 and rect['x']+rect['width']<=321
    assert not errors,errors
    print('PASS: Batch 7: Finnish People controls and 320px mobile layout')
    context.close()

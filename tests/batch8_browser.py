"""Local Chromium/SDK/Worker fixtures. No production or physical-phone claims."""
from pathlib import Path
import json
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle
from clubs_browser import open_clubs,lookup
from navigation_helpers import click_action,click_control
import base64,uuid

def run_batch8_tests(browser,base,route_map):
    context=browser.new_context(viewport={'width':320,'height':568})
    route_map(context);install(context);page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base,wait_until='networkidle')
    fixtures=json.loads((Path(__file__).resolve().parents[1]/'cloudflare/tests/media-fixtures.json').read_text())
    output=page.evaluate('''async fixtures=>{
      const {prepareImage,cropRectangle}=await import('./js/media/prepare-image.js');let count=0;
      for(const [mime,base64] of Object.entries(fixtures)){
        const file=new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],'camera',{type:mime});
        const blob=await prepareImage(file,{aspect:1});const decoded=await createImageBitmap(blob);
        if(blob.type!=='image/jpeg'||decoded.width!==24||decoded.height!==24||blob.size>1500000)throw Error('bad preparation');decoded.close();count++;
        const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes[0]!==255||bytes[1]!==216)throw Error('bad signature');
      }
      const crop=cropRectangle(4000,3000,3,{zoom:2,x:100,y:0});if(crop.width!==2000||crop.x!==2000||crop.y!==0)throw Error('bad crop');
      for(const bad of [new Blob(['<svg><script/></svg>'],{type:'image/svg+xml'}),new Blob([new Uint8Array(12000001)],{type:'image/jpeg'})]){
        let denied=false;try{await prepareImage(bad);}catch{denied=true;}if(!denied)throw Error('invalid accepted');count++;
      }
      return count;
    }''',fixtures)
    assert output==5 and not errors,errors
    print('PASS: Batch 8: PNG/JPEG/WebP decode/crop/re-encode with bounded output; unsupported and oversized input denied')
    state={'revision':0,'images':[],'theme':{'accent':'gold','secondary':'slate','header':'road','card':'outlined','layout':'grid','icon':'shield','badge':'plain'},'canWrite':True}
    payloads={};requests=[]
    def media_route(route):
        request=route.request;path=request.url.split('/v1/media/')[1];requests.append((request.method,path))
        headers={'Access-Control-Allow-Origin':request.headers.get('origin','*'),'Access-Control-Allow-Headers':'Authorization, Content-Type, If-Match, X-Media-Published','Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS','Cache-Control':'no-store'}
        if request.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
        if path.startswith('images/'):
            ident=path.split('/')[-1]
            if ident not in payloads:route.fulfill(status=404,json={'error':'not_found'},headers=headers);return
            route.fulfill(body=payloads[ident],content_type='image/jpeg',headers=headers);return
        if request.method=='GET':route.fulfill(json=state,headers=headers);return
        assert request.headers.get('authorization')=='Bearer local-media-fixture'
        assert request.headers.get('if-match')==str(state['revision'])
        state['revision']+=1
        if request.method=='POST':
            slot=path.split('/')[-1];ident=str(uuid.uuid4());payloads[ident]=request.post_data_buffer
            assert (payloads[ident][:2]==b'\xff\xd8' or payloads[ident][:8]==b'\x89PNG\r\n\x1a\n') and len(payloads[ident])<=1500000
            state['images']=[img for img in state['images'] if img['slot']!=slot]+[{'id':ident,'slot':slot,'width':24,'height':24,'published':request.headers.get('x-media-published')=='true'}]
            route.fulfill(status=201,json={'id':ident,'revision':state['revision']},headers=headers)
        elif request.method=='DELETE':
            state['images']=[img for img in state['images'] if img['slot']!=path.split('/')[-1]];route.fulfill(json={'revision':state['revision']},headers=headers)
        elif request.method=='PUT':
            body=request.post_data_json;state['theme']=body['theme'];old={img['id']:img for img in state['images']};state['images']=[dict(old[ident],slot='photo'+str(index)) for index,ident in enumerate(body['order'])] if '/vehicle/' in path else state['images'];route.fulfill(json={'revision':state['revision']},headers=headers)
    context.route('https://motodash-live.old-sound-55f2.workers.dev/v1/media/**',media_route)
    register(page,'batch8@example.test');page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('#public-profile-form')
    assert page.get_by_text('Save your profile settings first, then reopen to add images.').is_visible()
    page.locator('#public-profile-form button[type=submit]').click();page.wait_for_function('!document.getElementById("public-profile-editor")')
    page.click('#public-profile-edit');page.wait_for_selector('[data-media-kind=profile]')
    page.locator('[data-media-kind=profile] > summary').click();page.wait_for_selector('#media-profile-form')
    page.locator('#media-profile-form-file').set_input_files({'name':'camera.png','mimeType':'image/png','buffer':base64.b64decode(fixtures['image/png'])})
    page.wait_for_selector('.media-preview:not([hidden])');assert not page.locator('[name=published]').is_checked()
    page.locator('#media-profile-form button[type=submit]').click();page.wait_for_selector('.media-gallery-item')
    assert state['images'][0]['slot']=='avatar' and not state['images'][0]['published']
    page.on('dialog',lambda dialog:dialog.accept());page.locator('.media-gallery-item').get_by_role('button',name='Delete',exact=True).click();page.wait_for_function('document.querySelectorAll(".media-gallery-item").length===0')
    page.select_option('#language-select','fi');assert page.locator('[data-media-kind=profile] > summary').inner_text()=='Kuvat ja ulkoasu'
    assert not errors,errors
    print('PASS: Batch 8: profile media private default, crop preview/progress/upload/delete and Finnish mobile controls')
    page.select_option('#language-select','en');page.locator('#public-profile-editor .feature-header button').click()
    open_garage(page);add_vehicle(page,'Photo motorcycle','motorcycle')
    page.locator('[data-media-kind=vehicle] > summary').click();page.wait_for_selector('#media-vehicle-form')
    assert page.locator('#media-vehicle-form-slot option').count()==6
    for index in range(2):
        page.locator('#media-vehicle-form-file').set_input_files({'name':'garage.png','mimeType':'image/png','buffer':base64.b64decode(fixtures['image/png'])})
        page.wait_for_selector('.media-preview:not([hidden])');page.locator('#media-vehicle-form button[type=submit]').click()
        page.wait_for_function(f'document.querySelectorAll(".media-gallery-item").length=={index+1}')
    first=state['images'][0]['id'];second=state['images'][1]['id']
    page.locator('.media-gallery-item').last.get_by_role('button',name='Make cover photo').click()
    page.wait_for_function(f'document.querySelector(".media-gallery-item").dataset.mediaId=="{second}"')
    assert state['images'][0]['slot']=='photo0' and state['images'][1]['id']==first
    assert not errors,errors
    print('PASS: Batch 8: bounded six-slot private Garage gallery, second photo and featured/reordering controls')
    page.locator('#garage-dialog .feature-header button').click();state['images']=[]
    open_clubs(page);page.click('#club-create');page.fill('#club-form-name','Media Club');page.locator('#club-form button[type=submit]').click();page.wait_for_selector('#club-edit')
    page.locator('[data-media-kind=club] > summary').click();page.wait_for_selector('#media-club-form')
    assert page.locator('#media-club-form-slot option').count()==2
    page.locator('#media-club-form-file').set_input_files({'name':'logo.png','mimeType':'image/png','buffer':base64.b64decode(fixtures['image/png'])})
    page.wait_for_selector('.media-preview:not([hidden])');page.locator('#media-club-form button[type=submit]').click();page.wait_for_selector('.media-gallery-item')
    appearance=page.locator('#media-theme-club');appearance.locator('..').locator('summary').click()
    page.select_option('#media-theme-club-secondary','navy');assert page.locator('#clubs-dialog .media-theme-preview').get_attribute('data-media-secondary')=='navy'
    appearance.locator('button[type=submit]').click();page.wait_for_function('document.querySelector("#media-theme-club-secondary").value==="navy" && !document.querySelector("#media-theme-club-secondary").disabled')
    assert state['theme']['secondary']=='navy' and not errors,errors
    print('PASS: Batch 8: Club logo slots, controlled secondary/accent/header/card presets and live preview')
    click_action(page,'#groups-btn');page.wait_for_selector('#group-create');state['images']=[]
    for activity in ['event','meet','ride']:
        if page.locator('#group-create').count()==0:
            page.locator('#groups-dialog').get_by_role('button',name='Back to Group Sessions',exact=True).click();page.wait_for_selector('#group-create')
        page.click('#group-create');page.wait_for_selector('#group-form');page.fill('#group-form-title','Media '+activity);page.fill('#group-form-meetingArea','Helsinki');page.select_option('#group-form-activityType',activity)
        page.locator('#group-form button[type=submit]').click();page.wait_for_selector('#group-edit')
        page.locator('[data-media-kind=group] > summary').click();page.wait_for_selector('#media-group-form')
        assert page.locator('#media-group-form-slot option').count()==1
        page.locator('#media-group-form-file').set_input_files({'name':'event.png','mimeType':'image/png','buffer':base64.b64decode(fixtures['image/png'])})
        page.wait_for_selector('#groups-dialog .media-preview:not([hidden])');page.locator('#media-group-form button[type=submit]').click();page.wait_for_selector('#groups-dialog .media-gallery-item')
    assert not errors,errors
    print('PASS: Batch 8: Event/Meet/Ride share the authorized Group banner/theme editor and existing activity cards')
    open_clubs(page);clubid=page.evaluate('Object.values(JSON.parse(localStorage.getItem("__mockProfiles"))).find(v=>v.name==="Media Club"&&v.schemaVersion===1).id')
    lookup(page,clubid);click_control(page,'#rank-add');page.fill('#rank-form-name','Captain');page.locator('#rank-form button[type=submit]').click();page.wait_for_selector('[data-media-kind=rank]')
    state['images']=[];page.locator('[data-media-kind=rank] > summary').click();page.wait_for_selector('#media-rank-form')
    page.locator('#media-rank-form-file').set_input_files({'name':'rank.png','mimeType':'image/png','buffer':base64.b64decode(fixtures['image/png'])})
    page.wait_for_selector('#clubs-dialog .media-preview:not([hidden])');page.locator('#media-rank-form button[type=submit]').click();page.wait_for_selector('[data-media-kind=rank] .media-gallery-item')
    form=page.locator('#media-theme-rank');form.locator('..').locator('summary').click();page.select_option('#media-theme-rank-icon','star');page.select_option('#media-theme-rank-badge','crest');form.locator('button[type=submit]').click()
    page.wait_for_function('document.querySelector("#media-theme-rank-icon").value==="star" && !document.querySelector("#media-theme-rank-icon").disabled')
    assert state['theme']['icon']=='star' and state['theme']['badge']=='crest'
    assert not errors,errors
    print('PASS: Batch 8: safe raster rank upload, vetted icon/badge/color selection and graphic preview')
    page.locator('#bottom-nav [data-destination=profile]').click();page.click('#public-profile-edit');page.wait_for_selector('[data-media-kind=profile]');page.locator('[data-media-kind=profile] > summary').click();page.wait_for_selector('#media-theme-profile',state='attached')
    appearance=page.locator('#media-theme-profile');appearance.locator('..').locator('summary').click();page.select_option('#media-theme-profile-layout','list');page.select_option('#media-theme-profile-accent','rose')
    assert page.locator('#public-profile-editor .media-theme-preview').get_attribute('data-media-layout')=='list'
    appearance.get_by_role('button',name='Reset preview to defaults').click();assert page.locator('#media-theme-profile-layout').input_value()=='grid'
    contrast=page.evaluate('''async()=>{const {contrast}=await import('./js/data/branding.js');return ['#1c2530','#162438','#242424'].every(bg=>contrast(bg,'#f4f4f4')>=4.5) && ['#e9bf73','#6bbde9','#7cd29d','#f9a3bb'].every(color=>contrast('#101214',color)>=4.5);}''')
    assert contrast and not errors,errors
    print('PASS: Batch 8: controlled profile/Garage/Club/activity templates, live layout preview/reset and WCAG text contrast presets')
    context.close()

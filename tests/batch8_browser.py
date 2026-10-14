"""Local Chromium/SDK/Worker fixtures. No production or physical-phone claims."""
from pathlib import Path
import json
from firebase_mocks import install
from batch2_browser import register,open_garage,add_vehicle
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
            assert payloads[ident][:2]==b'\xff\xd8' and len(payloads[ident])<=1500000
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
    page.locator('[data-media-kind=profile] summary').click();page.wait_for_selector('#media-profile-form')
    page.locator('#media-profile-form-file').set_input_files({'name':'camera.png','mimeType':'image/png','buffer':base64.b64decode(fixtures['image/png'])})
    page.wait_for_selector('.media-preview:not([hidden])');assert not page.locator('[name=published]').is_checked()
    page.locator('#media-profile-form button[type=submit]').click();page.wait_for_selector('.media-gallery-item')
    assert state['images'][0]['slot']=='avatar' and not state['images'][0]['published']
    page.on('dialog',lambda dialog:dialog.accept());page.locator('.media-gallery-item').get_by_role('button',name='Delete',exact=True).click();page.wait_for_function('document.querySelectorAll(".media-gallery-item").length===0')
    page.select_option('#language-select','fi');assert page.locator('[data-media-kind=profile] summary').inner_text()=='Kuvat ja ulkoasu'
    assert not errors,errors
    print('PASS: Batch 8: profile media private default, crop preview/progress/upload/delete and Finnish mobile controls')
    page.select_option('#language-select','en');page.locator('#public-profile-editor .feature-header button').click()
    open_garage(page);add_vehicle(page,'Photo motorcycle','motorcycle')
    page.locator('[data-media-kind=vehicle] summary').click();page.wait_for_selector('#media-vehicle-form')
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
    context.close()

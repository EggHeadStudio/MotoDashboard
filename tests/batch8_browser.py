"""Local Chromium/SDK/Worker fixtures. No production or physical-phone claims."""
from pathlib import Path
import json
from firebase_mocks import install

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
    context.close()

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectImage,boundedBody} from '../src/mediaImage.js';
const fixtures=JSON.parse(await readFile(new URL('./media-fixtures.json',import.meta.url),'utf8'));
for(const [mime,base64] of Object.entries(fixtures))test('actual '+mime+' signature and dimensions; spoof/truncation denied',()=>{
  const bytes=new Uint8Array(Buffer.from(base64,'base64'));assert.deepEqual(inspectImage(bytes,mime),{mime,width:32,height:24,bytes:bytes.length});
  assert.throws(()=>inspectImage(bytes,'image/svg+xml'),/invalid_image/);
  assert.throws(()=>inspectImage(bytes.slice(0,-10),mime),/invalid_image/);
});
test('SVG, executable text and fake PNG signatures denied',()=>{
  for(const input of ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>','<html>not an image at all</html>','\x89PNG\r\n\x1a\n'+'x'.repeat(100)])assert.throws(()=>inspectImage(new TextEncoder().encode(input),'image/png'),/invalid_image/);
});
test('declared and streaming payload limits deny before allocation',async()=>{
  await assert.rejects(boundedBody(new Request('https://test',{method:'POST',headers:{'Content-Length':'1500001'},body:'x'})),/too_large/);
  await assert.rejects(boundedBody(new Request('https://test',{method:'POST',body:'x'.repeat(100)}),50),/too_large/);
});

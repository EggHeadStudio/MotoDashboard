import {test} from 'node:test';
import assert from 'node:assert/strict';
// Native Node cannot import cloudflare:workers. Origin helper lives separately later.
test('Worker configuration reserves one SQLite room binding without secrets',async()=>{
  const {readFile}=await import('node:fs/promises');
  const cfg=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(cfg.vars.FIREBASE_PROJECT_ID,'motodash-87bf8');
  assert.equal(cfg.durable_objects.bindings[0].class_name,'LiveRoom');
  assert.deepEqual(cfg.migrations[0].new_sqlite_classes,['LiveRoom']);
  assert(!JSON.stringify(cfg).includes('private_key'));
});

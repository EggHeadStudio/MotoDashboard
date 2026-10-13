import {test} from 'node:test';
import assert from 'node:assert/strict';
// Configuration assertion complements the actual workerd route tests.
test('Worker configuration reserves one SQLite room binding without secrets',async()=>{
  const {readFile}=await import('node:fs/promises');
  const cfg=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  assert.equal(cfg.vars.FIREBASE_PROJECT_ID,'motodash-87bf8');
  assert.equal(cfg.durable_objects.bindings[0].class_name,'LiveRoom');
  assert.deepEqual(cfg.migrations[0].new_sqlite_classes,['LiveRoom']);
  assert.deepEqual(cfg.durable_objects.bindings[1],{name:'LIVE_IDENTITIES',class_name:'LiveIdentity'});
  assert.deepEqual(cfg.migrations[1],{tag:'v2',new_sqlite_classes:['LiveIdentity']});
  assert(!JSON.stringify(cfg).includes('private_key'));
});

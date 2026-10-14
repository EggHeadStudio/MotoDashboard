/* Development-only YAML/contracts/Bash syntax. Does not execute workflow bodies. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let yaml;try{yaml=require('yaml');}catch{
  const cached=path.join(process.env.TEMP || '', 'motodash-test-tools/playwright/driver/package/lib/utilsBundle.js');
  if(!fs.existsSync(cached))throw Error('Use an existing YAML parser (yaml) or the cached Playwright test tools. No application dependency is needed.');
  yaml=require(cached).yaml;
}
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
let blocks=0;
for(const file of ['deploy.yml','deploy-firebase.yml','deploy-cloudflare.yml']){
  const source=fs.readFileSync(path.join(root,'.github/workflows',file),'utf8'),document=yaml.parseDocument(source,{version:'1.2'});
  assert.equal(document.errors.length,0,file);const config=document.toJS();assert('workflow_dispatch' in config.on,file);
  if(file!=='deploy.yml')assert.deepEqual(Object.keys(config.on),['workflow_dispatch'],file+' must remain manual only');
  for(const job of Object.values(config.jobs))for(const step of job.steps || [])if(step.run){
    if(step.run.includes('python3 - <<'))continue; // Bash parses this too, including the heredoc; handled below.
    execFileSync(bash,['-n','-c',step.run],{stdio:'pipe'});blocks++;
  }
  for(const job of Object.values(config.jobs))for(const step of job.steps || [])if(step.run?.includes('python3 - <<')){execFileSync(bash,['-n','-c',step.run],{stdio:'pipe'});blocks++;}
  if(file==='deploy-firebase.yml'){
    assert(source.includes('tests/run_batch6b_rules.py'));assert(source.includes('tests/run_batch7_rules.py'));assert(source.includes("github.ref == 'refs/heads/main'"));
    assert(source.includes("inputs.confirmation == 'motodash-87bf8'"));assert(source.includes('FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON'));
    assert(!source.includes('CLOUDFLARE_API_TOKEN'));assert(!source.includes('firestore:delete'));
  }
  if(file==='deploy-cloudflare.yml')assert(source.includes('workingDirectory: cloudflare') && source.includes('wrangler-action@v4'));
}
const wrangler=JSON.parse(fs.readFileSync(path.join(root,'cloudflare/wrangler.jsonc'),'utf8'));
assert.equal(wrangler.name,'motodash-live');assert.deepEqual(wrangler.migrations,[{tag:'v1',new_sqlite_classes:['LiveRoom']},{tag:'v2',new_sqlite_classes:['LiveIdentity']}]);
assert.deepEqual(wrangler.durable_objects.bindings,[{name:'LIVE_ROOMS',class_name:'LiveRoom'},{name:'LIVE_IDENTITIES',class_name:'LiveIdentity'}]);
assert(!JSON.stringify(wrangler).includes('private_key'));
console.log(`PASS: 3 workflow YAMLs, ${blocks} Bash blocks, manual backend/main/project/gate contracts and preserved v1 + new v2 bindings; no workflow executed`);

"""Batch 6B real Rules tests. Hard-coded localhost demo only; no production identity."""
import uuid,json,urllib.request
from pathlib import Path
import run_rules as r

def compile_rules():
    rules=Path(__file__).resolve().parents[1].joinpath('firestore.rules').read_text(encoding='utf-8')
    payload=json.dumps({'rules':{'files':[{'name':'firestore.rules','content':rules}]}}).encode()
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8185/emulator/v1/projects/demo-motodash:securityRules',data=payload,headers={'Content-Type':'application/json'},method='PUT'),timeout=30).read()

def settings(id,**values):
    return dict(publicId=id,state='active',visibility='private',bio='',category=None,accent='gold',banner='road',featuredVehicle=None,vehicleIds=[],affiliationIds=[],updatedAt=r.SERVER,**values)

def projection(p,name='Rider alice'):
    return {**{k:p[k] for k in ['bio','category','accent','banner','featuredVehicle','vehicleIds','affiliationIds','updatedAt']},'id':p['publicId'],'displayName':name}

def save(uid,p,name=None):
    return [r.update('users/'+uid+'/preferences/publicProfile',p),r.update('publicProfiles/'+p['publicId'],projection(p,name or 'Rider '+uid)),r.update('displayProfiles/'+uid,dict(displayName=name or 'Rider '+uid,publicProfileId=p['publicId'] if p['visibility']=='public' else None,updatedAt=r.SERVER))]

def run():
    compile_rules()
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8185/emulator/v1/projects/demo-motodash/databases/(default)/documents',method='DELETE')).read()
    r.checks=0
    for uid in ['alice','bob']:
        r.commit(uid,[r.update('users/'+uid,dict(uid=uid,displayName='Rider '+uid,email=uid+'@example.test',language='en',createdAt=r.SERVER,updatedAt=r.SERVER))])
    id=str(uuid.uuid4());p=settings(id);reservation=r.update('profileOwners/'+id,dict(ownerUid='alice',createdAt=r.SERVER))
    r.commit('alice',[reservation,*save('alice',p)])
    r.read('alice','publicProfiles/'+id);r.read('bob','publicProfiles/'+id,False);r.read(None,'publicProfiles/'+id,False)
    r.read(None,'profileOwners/'+id,False);r.read('bob','profileOwners/'+id,False)
    r.read('bob','users/alice/preferences/publicProfile',False)
    r.query(None,'','publicProfiles',False);r.query('alice','','publicProfiles',False)
    r.commit('bob',save('alice',p),False)
    r.commit('bob',[r.update('profileOwners/'+id,dict(ownerUid='bob',createdAt=r.SERVER))],False)
    r.commit('alice',[r.delete('profileOwners/'+id)],False)
    p['visibility']='public';r.commit('alice',save('alice',p))
    data=r.read(None,'publicProfiles/'+id);r.read('bob','publicProfiles/'+id)
    assert set(data)==set(projection(p)) and not any(k in data for k in ['uid','ownerUid','email','technicalRole'])
    r.read('bob','users/alice',False);r.query('bob','users/alice','vehicles',False)
    for field,value in [('email','private@example.test'),('ownerUid','alice'),('technicalRole','owner'),('entitlements',{'rider':True}),('location',{'latitude':60}),('homeAddress','Private')]:
        r.commit('alice',[r.update('publicProfiles/'+id,{**projection(p),field:value})],False)
    for field,value in [('accent','url(evil)'),('banner','<script>'),('category','open'),('bio','x'*301),('visibility','members'),('subscription','rider')]:
        r.commit('alice',save('alice',{**p,field:value}),False)
    r.commit('alice',[r.update('displayProfiles/alice',dict(displayName='Rider alice',publicProfileId=str(uuid.uuid4()),updatedAt=r.SERVER))],False)
    # Private wins without deleting a retained public document.
    p['visibility']='private';r.commit('alice',save('alice',p));r.read(None,'publicProfiles/'+id,False)
    p['visibility']='public';r.commit('alice',save('alice',p));r.read(None,'publicProfiles/'+id)
    # Alias cannot be replaced, reused by another user or reactivated after retirement.
    other=settings(str(uuid.uuid4()));r.commit('alice',[r.update('profileOwners/'+other['publicId'],dict(ownerUid='alice',createdAt=r.SERVER)),*save('alice',other)],False)
    p.update(state='retired',visibility='private');r.commit('alice',[r.update('users/alice/preferences/publicProfile',p)])
    r.read(None,'publicProfiles/'+id,False);r.commit('alice',save('alice',{**p,'state':'active','visibility':'public'}),False)
    r.commit('bob',[r.update('profileOwners/'+id,dict(ownerUid='bob',createdAt=r.SERVER)),*save('bob',settings(id))],False)
    r.commit('alice',[r.delete('users/alice/preferences/publicProfile')],False)
    # Operator orphan fixtures are fail-closed, including malformed public documents.
    orphan=settings(str(uuid.uuid4()));r.commit('ADMIN',[r.update('publicProfiles/'+orphan['publicId'],projection(orphan))]);r.read(None,'publicProfiles/'+orphan['publicId'],False)
    print(f'PASS: {r.checks} Batch 6B public profile security assertions; 0 failed, 0 skipped; localhost demo only')

if __name__=='__main__':run()

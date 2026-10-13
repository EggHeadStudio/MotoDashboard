"""Batch 6B real Rules tests. Hard-coded localhost demo only; no production identity."""
import uuid,json,urllib.request
from pathlib import Path
import run_rules as r

def compile_rules():
    rules=Path(__file__).resolve().parents[1].joinpath('firestore.rules').read_text(encoding='utf-8')
    payload=json.dumps({'rules':{'files':[{'name':'firestore.rules','content':rules}]}}).encode()
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8185/emulator/v1/projects/demo-motodash:securityRules',data=payload,headers={'Content-Type':'application/json'},method='PUT'),timeout=30).read()

def settings(id,**values):
    return {**dict(publicId=id,state='active',visibility='private',bio='',category=None,accent='gold',banner='road',featuredVehicle=None,vehicleIds=[],affiliationIds=[],updatedAt=r.SERVER),**values}

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
    # Explicit publishing uses a safe card, two private mappings and current source proof.
    source=dict(id='bike',ownerUid='alice',nickname='Desert Runner',manufacturer='Yamaha',model='MT-09',modelYear=2025,category='motorcycle',description='PRIVATE HOME NOTES',visibility='public',createdAt=r.SERVER,updatedAt=r.SERVER)
    r.commit('alice',[r.update('users/alice/vehicles/bike',source)])
    source_fields=r.read('alice','users/alice/vehicles/bike');created=source_fields['createdAt']
    vid=str(uuid.uuid4());p.update(vehicleIds=[vid],featuredVehicle=vid)
    card=dict(id=vid,nickname=source['nickname'],manufacturer=source['manufacturer'],model=source['model'],modelYear=2025,category='motorcycle',publicDescription='Weekend road companion',createdAt=r.SERVER,updatedAt=r.SERVER)
    mapping=r.update(f'profileOwners/{id}/vehicles/{vid}',dict(sourceVehicleId='bike',sourceCreatedAt=(created['timestampValue'],),createdAt=r.SERVER))
    ref=r.update('users/alice/showcaseRefs/bike',dict(profileId=id,publicId=vid,createdAt=r.SERVER))
    child=f'publicProfiles/{id}/vehicles/{vid}'
    code,_=r.request('GET','/'+child,'alice');assert code==404,'Owner transaction must be able to read an unpublished card';r.checks+=1
    r.read(None,child,False)
    r.commit('alice',[r.update(child,card),*save('alice',p)],False)
    r.commit('alice',[mapping,ref,r.update(child,card),*save('alice',p)])
    fields=r.read(None,child);r.read('bob',child);r.read('bob','users/alice/vehicles/bike',False)
    assert 'description' not in fields and 'ownerUid' not in fields and 'sourceVehicleId' not in fields
    r.read(None,f'profileOwners/{id}/vehicles/{vid}',False);r.read('bob','users/alice/showcaseRefs/bike',False)
    r.query(None,'publicProfiles/'+id,'vehicles',False)
    for field,value in [('ownerUid','alice'),('vehicleId','bike'),('description','PRIVATE'),('photo','https://invalid.test'),('entitlements',{'paid':True})]:
        r.commit('alice',[r.update(child,{**card,field:value})],False)
    r.commit('bob',[r.update(child,card)],False)
    r.commit('alice',[r.update(child,{**card,'nickname':'Forged'})],False)
    r.commit('alice',[r.update(child,{**card,'category':'car'})],False)
    p['visibility']='private';r.commit('alice',save('alice',p));r.read(None,child,False)
    p['visibility']='public';r.commit('alice',save('alice',p));r.read(None,child)
    # A malicious owner bypassing UI cleanup still cannot keep a private source publicly readable.
    r.commit('alice',[r.raw_update('users/alice/vehicles/bike',source_fields,{'visibility':'private','updatedAt':r.SERVER})]);r.read(None,child,False)
    current=r.read('alice','users/alice/vehicles/bike');r.commit('alice',[r.raw_update('users/alice/vehicles/bike',current,{'visibility':'public','updatedAt':r.SERVER})]);r.read(None,child)
    r.commit('alice',[r.delete('users/alice/vehicles/bike')]);r.read(None,child,False)
    r.commit('alice',[r.update('users/alice/vehicles/bike',source)]);r.read(None,child,False) # same path, new source incarnation
    # Unpublishing removes the opaque alias from parent reads; extra/duplicate aliases denied.
    r.commit('alice',save('alice',{**p,'vehicleIds':[vid,vid]}),False)
    r.commit('alice',save('alice',{**p,'vehicleIds':[str(uuid.uuid4()) for _ in range(5)],'featuredVehicle':None}),False)
    p.update(vehicleIds=[],featuredVehicle=None);r.commit('alice',save('alice',p));r.read(None,child,False)
    # Public Club/rank cards disclose no UID/role, and source changes deny stale reads.
    cid=str(uuid.uuid4());r.create_club(cid,'alice');aid=str(uuid.uuid4());p['affiliationIds']=[aid]
    joined=r.read('alice',f'clubs/{cid}/members/alice')['joinedAt']['timestampValue']
    amap=r.update(f'profileOwners/{id}/affiliations/{aid}',dict(clubId=cid,joinedAt=(joined,),createdAt=r.SERVER))
    acard=dict(id=aid,clubId=cid,name='Club '+cid,rank=None,updatedAt=r.SERVER);apath=f'publicProfiles/{id}/affiliations/{aid}'
    r.commit('alice',[amap,r.update(apath,acard),*save('alice',p)])
    result=r.read(None,apath);r.read('bob',apath);assert set(result)==set(acard) and 'technicalRole' not in result and 'uid' not in result
    r.read('bob',f'profileOwners/{id}/affiliations/{aid}',False);r.query(None,'publicProfiles/'+id,'affiliations',False)
    r.commit('bob',[r.update(apath,acard)],False)
    for extra in [{'uid':'alice'},{'technicalRole':'owner'},{'email':'private@example.test'},{'rank':'Admin'},{'name':'Forged Club'}]:
        r.commit('alice',[r.update(apath,{**acard,**extra})],False)
    r.commit('alice',[r.update(f'clubs/{cid}/ranks/captain',dict(id='captain',name='Captain',displayOrder=0,createdAt=r.SERVER,updatedAt=r.SERVER))])
    member=r.read('alice',f'clubs/{cid}/members/alice');r.commit('ADMIN',[r.raw_update(f'clubs/{cid}/members/alice',member,{'rankId':'captain','updatedAt':r.SERVER})])
    r.read(None,apath,False);acard['rank']='Captain';r.commit('alice',[r.update(apath,acard)]);r.read(None,apath)
    rank=r.read('alice',f'clubs/{cid}/ranks/captain');r.commit('alice',[r.raw_update(f'clubs/{cid}/ranks/captain',rank,{'name':'Road Lead','updatedAt':r.SERVER})]);r.read(None,apath,False)
    acard['rank']='Road Lead';r.commit('alice',[r.update(apath,acard)]);r.read(None,apath)
    fields=r.read('alice','clubs/'+cid)
    r.commit('alice',r.club_changes(cid,fields,{'visibility':'private','membershipPolicy':'private','updatedAt':r.SERVER})+[r.delete('clubDirectory/'+cid)])
    r.read(None,apath,False);r.commit('alice',[r.update(apath,acard)],False)
    # Only opaque affiliation aliases remain in the independently public profile root.
    profile_fields=r.read(None,'publicProfiles/'+id);assert cid not in str(profile_fields['affiliationIds'])
    fields=r.read('alice','clubs/'+cid);r.commit('alice',r.club_changes(cid,fields,{'visibility':'public','membershipPolicy':'open','updatedAt':r.SERVER})+[r.raw_update('clubDirectory/'+cid,r.directory(fields),{'membershipPolicy':'open','updatedAt':r.SERVER})]);r.read(None,apath)
    r.commit('ADMIN',[r.delete(f'clubs/{cid}/members/alice')]);r.read(None,apath,False)
    r.commit('ADMIN',[r.update(f'clubs/{cid}/members/alice',r.membership('alice','owner'))]);r.read(None,apath,False) # rejoining does not resurrect prior opt-in
    p['affiliationIds']=[];r.commit('alice',[r.delete(apath),r.delete(f'profileOwners/{id}/affiliations/{aid}'),*save('alice',p)])
    r.read(None,apath,False)
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

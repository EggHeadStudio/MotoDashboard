"""Batch 7 actual Rules engine. Fixed localhost demo only, never production."""
import uuid,json,urllib.request,re
import run_rules as r
from run_batch6b_rules import compile_rules,settings,save

def directory(p,name):
    normalized=re.sub('[A-ZÄÖÅ]',lambda match:match[0].lower(),name)
    return dict(id=p['publicId'],displayName=name,searchName=normalized,category=p['category'],accent=p['accent'],visibility='public',updatedAt=r.SERVER)

def search(uid='bob',prefix='ri',limit=10,allowed=True,after=None,visibility=True,offset=None):
    conditions=[{'fieldFilter':{'field':{'fieldPath':'searchName'},'op':op,'value':r.value(value)}} for op,value in [('GREATER_THAN_OR_EQUAL',prefix),('LESS_THAN_OR_EQUAL',prefix+'\uf8ff')]]
    if visibility:conditions.append({'fieldFilter':{'field':{'fieldPath':'visibility'},'op':'EQUAL','value':r.value('public')}})
    query={'from':[{'collectionId':'profileDirectory'}],'where':{'compositeFilter':{'op':'AND','filters':conditions}},'orderBy':[{'field':{'fieldPath':'searchName'},'direction':'ASCENDING'},{'field':{'fieldPath':'__name__'},'direction':'ASCENDING'}]}
    if limit is not None:query['limit']=limit
    if offset is not None:query['offset']=offset
    if after:query['startAt']={'values':[r.value(after[0]),{'referenceValue':r.NAME+'profileDirectory/'+after[1]}],'before':False}
    code,body=r.request('POST',':runQuery',uid,{'structuredQuery':query})
    assert code==(200 if allowed else 403),(uid,limit,prefix,code,body)
    r.checks+=1
    return [row['document'] for row in body if 'document' in row] if allowed else []

def run():
    compile_rules()
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8185/emulator/v1/projects/demo-motodash/databases/(default)/documents',method='DELETE')).close()
    r.checks=0
    for uid in ['alice','bob']:
        r.commit(uid,[r.update('users/'+uid,dict(uid=uid,displayName='Rider '+uid,email=uid+'@example.test',language='en',createdAt=r.SERVER,updatedAt=r.SERVER))])
    alias=str(uuid.uuid4());p=settings(alias,visibility='private');path='profileDirectory/'+alias
    r.commit('alice',[r.update('profileOwners/'+alias,dict(ownerUid='alice',createdAt=r.SERVER)),*save('alice',p)])
    r.commit('alice',[r.update(path,directory(p,'Rider alice'))],False)
    p['visibility']='public';r.commit('alice',[*save('alice',p),r.update(path,directory(p,'Rider alice'))])
    fields=r.read('bob',path);assert set(fields)==set(directory(p,'Rider alice')) and 'uid' not in fields and 'email' not in fields
    r.read(None,path,False);r.read('bob','profileOwners/'+alias,False);r.read('bob','users/alice',False)
    search();search(None,allowed=False);search(limit=None,allowed=False);search(limit=11,allowed=False);search(offset=1,allowed=False);search(visibility=False,allowed=False)
    r.commit('bob',[r.update(path,directory(p,'Rider alice'))],False);r.commit('bob',[r.delete(path)],False)
    for extra in [{'uid':'alice'},{'ownerUid':'alice'},{'email':'private@example.test'},{'vehicleIds':['private-bike']},{'role':'admin'},{'bio':'Private bio'},{'location':{'latitude':60}},{'entitlements':{'rider':True}}]:
        r.commit('alice',[r.update(path,{**directory(p,'Rider alice'),**extra})],False)
    for changed in [{'searchName':'pretend'},{'displayName':'Another Rider','searchName':'another rider'},{'category':'open'},{'accent':'script'},{'visibility':'private'},{'id':str(uuid.uuid4())}]:
        r.commit('alice',[r.update(path,{**directory(p,'Rider alice'),**changed})],False)
    # Privacy/retirement may not leave even a safe name in the searchable projection.
    private={**p,'visibility':'private'};r.commit('alice',save('alice',private),False)
    r.commit('alice',[*save('alice',private),r.delete(path)]);assert not search()
    r.read(None,'publicProfiles/'+alias,False);r.commit('alice',[r.update(path,directory(p,'Rider alice'))],False)
    r.commit('alice',[*save('alice',p),r.update(path,directory(p,'Rider alice'))]);assert len(search())==1
    # A name/category edit cannot leave a stale searchable identity behind.
    user=r.read('alice','users/alice')
    rename=r.raw_update('users/alice',user,{'displayName':'MÄKI Rider','updatedAt':r.SERVER})
    r.commit('alice',[rename],False)
    r.commit('alice',[rename,*save('alice',p,'MÄKI Rider')],False)
    r.commit('alice',[rename,*save('alice',p,'MÄKI Rider'),r.update(path,directory(p,'MÄKI Rider'))]);assert len(search(prefix='mä'))==1
    category={**p,'category':'car'};r.commit('alice',save('alice',category,'MÄKI Rider'),False)
    r.commit('alice',[*save('alice',category,'MÄKI Rider'),r.update(path,directory(category,'MÄKI Rider'))])
    retired={**category,'visibility':'private','state':'retired'}
    r.commit('alice',[r.update('users/alice/preferences/publicProfile',retired)],False)
    r.commit('alice',[r.update('users/alice/preferences/publicProfile',retired),r.delete(path)]);assert not search(prefix='mä')
    r.commit('alice',[r.update(path,directory(category,'MÄKI Rider'))],False);r.read(None,'publicProfiles/'+alias,False)
    # Older public profiles without a directory are still secure; owned sync is supported.
    other=str(uuid.uuid4());q=settings(other,visibility='public')
    r.commit('bob',[r.update('profileOwners/'+other,dict(ownerUid='bob',createdAt=r.SERVER)),*save('bob',q)])
    assert not search(prefix='ri')
    r.commit('bob',[r.update('profileDirectory/'+other,directory(q,'Rider bob'))]);assert len(search(prefix='ri'))==1
    # Duplicate names use document-reference cursors, never a name-only skip.
    expected=[]
    for i in range(23):
        uid='twin-'+str(i);id=str(uuid.uuid4());pref=settings(id,visibility='public');name='Twin Rider'
        r.commit(uid,[r.update('users/'+uid,dict(uid=uid,displayName=name,email=uid+'@example.test',language='en',createdAt=r.SERVER,updatedAt=r.SERVER)),r.update('profileOwners/'+id,dict(ownerUid=uid,createdAt=r.SERVER)),*save(uid,pref,name),r.update('profileDirectory/'+id,directory(pref,name))]);expected.append(id)
    first=search(prefix='tw');second=search(prefix='tw',after=('twin rider',first[-1]['name'].split('/')[-1]));third=search(prefix='tw',after=('twin rider',second[-1]['name'].split('/')[-1]))
    ids=[row['name'].split('/')[-1] for row in first+second+third]
    assert [len(first),len(second),len(third)]==[10,10,3] and len(set(ids))==23 and set(ids)==set(expected)
    r.checks+=1
    # Other scripts remain valid identities, with case preserved instead of false Unicode folding.
    greek_id=str(uuid.uuid4());greek=settings(greek_id,visibility='public');name='Ω Rider'
    r.commit('greek',[r.update('users/greek',dict(uid='greek',displayName=name,email='greek@example.test',language='en',createdAt=r.SERVER,updatedAt=r.SERVER)),r.update('profileOwners/'+greek_id,dict(ownerUid='greek',createdAt=r.SERVER)),*save('greek',greek,name),r.update('profileDirectory/'+greek_id,directory(greek,name))]);assert len(search(prefix='Ω '))==1
    # Real limits must permit publishing/unpublishing a showcase alongside an indexed profile.
    bike=dict(id='bike',ownerUid='bob',nickname='Public Bike',manufacturer='Yamaha',model='MT',modelYear=None,category='motorcycle',description='PRIVATE',visibility='private',createdAt=r.SERVER,updatedAt=r.SERVER)
    r.commit('bob',[r.update('users/bob/vehicles/bike',bike)]);original=r.read('bob','users/bob/vehicles/bike')
    vid=str(uuid.uuid4());q.update(vehicleIds=[vid],featuredVehicle=vid);card=f'publicProfiles/{other}/vehicles/{vid}';mapping=f'profileOwners/{other}/vehicles/{vid}';ref='users/bob/showcaseRefs/bike'
    r.commit('bob',[r.raw_update('users/bob/vehicles/bike',original,{'visibility':'public','updatedAt':r.SERVER}),r.update(mapping,dict(sourceVehicleId='bike',sourceCreatedAt=(original['createdAt']['timestampValue'],),createdAt=r.SERVER)),r.update(ref,dict(profileId=other,publicId=vid,createdAt=r.SERVER)),r.update(card,dict(id=vid,nickname='Public Bike',manufacturer='Yamaha',model='MT',modelYear=None,category='motorcycle',publicDescription='Safe text',createdAt=r.SERVER,updatedAt=r.SERVER)),*save('bob',q),r.update('profileDirectory/'+other,directory(q,'Rider bob'))])
    r.read(None,card);r.read('alice','users/bob/vehicles/bike',False)
    current=r.read('bob','users/bob/vehicles/bike');r.commit('bob',[r.raw_update('users/bob/vehicles/bike',current,{'visibility':'private','updatedAt':r.SERVER})]);r.read(None,card,False)
    q.update(vehicleIds=[],featuredVehicle=None);r.commit('bob',[*save('bob',q),r.update('profileDirectory/'+other,directory(q,'Rider bob')),r.delete(card),r.delete(mapping),r.delete(ref)])
    r.query('bob','','publicProfiles',False);r.query('bob','users/alice','vehicles',False)
    r.query(None,'','profileDirectory',False);r.commit('bob',[r.update('systemAdmins/bob',{'admin':True})],False)
    print(f'PASS: Batch 7 Rules: {r.checks} passed, 0 failed, 0 skipped; actual local emulator only')

if __name__=='__main__':run()

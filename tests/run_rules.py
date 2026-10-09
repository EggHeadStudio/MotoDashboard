"""Real local Firestore rules tests via REST; Python stdlib, no application runtime.
Start the Firestore emulator on 127.0.0.1:8185 with project demo-motodash
and this repository's firestore.rules. This never targets production.
"""
import base64
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = 'http://127.0.0.1:8185/v1/projects/demo-motodash/databases/(default)/documents'
NAME = 'projects/demo-motodash/databases/(default)/documents/'
SERVER = object()
checks = 0

def token(uid):
    encode = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
    return encode({'alg':'none','typ':'JWT'}) + '.' + encode({
        'iss':'https://securetoken.google.com/demo-motodash','aud':'demo-motodash',
        'sub':uid,'user_id':uid,'email':uid+'@example.test','iat':int(time.time()),
        'exp':int(time.time())+3600,'firebase':{'sign_in_provider':'password','identities':{}}}) + '.'

def value(v):
    if v is None: return {'nullValue':None}
    if isinstance(v,bool): return {'booleanValue':v}
    if isinstance(v,int): return {'integerValue':str(v)}
    if isinstance(v,float): return {'doubleValue':v}
    if isinstance(v,str): return {'stringValue':v}
    if isinstance(v,dict): return {'mapValue':{'fields':{k:value(x) for k,x in v.items()}}}
    if isinstance(v,list): return {'arrayValue':{'values':[value(x) for x in v]}}
    raise TypeError(v)

def update(path, data):
    fields = {k:value(v) for k,v in data.items() if v is not SERVER}
    result = {'update':{'name':NAME+path,'fields':fields}}
    transforms=[{'fieldPath':k,'setToServerValue':'REQUEST_TIME'} for k,v in data.items() if v is SERVER]
    if transforms: result['updateTransforms']=transforms
    return result

def delete(path): return {'delete':NAME+path}

def request(method,path,uid=None,data=None):
    headers={'Content-Type':'application/json'}
    if uid: headers['Authorization']='Bearer '+('owner' if uid=='ADMIN' else token(uid))
    url=ROOT+path
    req=urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=15) as r: return r.status,json.load(r)
    except urllib.error.HTTPError as e: return e.code,json.load(e)

def commit(uid,writes,allowed=True,label='write'):
    global checks
    code,body=request('POST',':commit',uid,{'writes':writes})
    assert code == (200 if allowed else 403), (label,code,body)
    checks+=1
    return body

def read(uid,path,allowed=True):
    global checks
    code,body=request('GET','/'+path,uid)
    assert code == (200 if allowed else 403), (path,code,body)
    checks+=1
    return body.get('fields',{})

def decode(v):
    if 'timestampValue' in v: return v
    if 'mapValue' in v: return {k:decode(x) for k,x in v['mapValue'].get('fields',{}).items()}
    if 'integerValue' in v: return int(v['integerValue'])
    return next(iter(v.values()))

def raw_update(path,fields,changes):
    result={'update':{'name':NAME+path,'fields':dict(fields)}}
    transforms=[]
    for k,v in changes.items():
        if v is SERVER:
            result['update']['fields'].pop(k,None)
            transforms.append({'fieldPath':k,'setToServerValue':'REQUEST_TIME'})
        else: result['update']['fields'][k]=value(v)
    if transforms: result['updateTransforms']=transforms
    return result

def club_data(id,owner,policy='open',visibility='public'):
    return dict(schemaVersion=1,id=id,ownerUid=owner,name='Club '+id,description='',category='motorcycle',
        visibility=visibility,membershipPolicy=policy,primaryColor='#123456',accentColor='#abcdef',routeColor=None,
        mapTheme='normal',links={k:None for k in ['website','whatsapp','discord','instagram','facebook']},
        state='active',memberCount=1,lastMembershipUid=owner,createdAt=SERVER,updatedAt=SERVER)

def membership(uid,role='member'): return dict(uid=uid,technicalRole=role,rankId=None,joinedAt=SERVER,updatedAt=SERVER)
def ref(uid,id): return update(f'users/{uid}/clubRefs/{id}',dict(uid=uid,clubId=id,joinedAt=SERVER))
def directory(c): return {k:c[k] for k in ['id','name','category','membershipPolicy','primaryColor','accentColor','updatedAt']}

def create_club(id,owner,policy='open',visibility='public'):
    c=club_data(id,owner,policy,visibility)
    writes=[update('clubs/'+id,c),update(f'clubs/{id}/members/{owner}',membership(owner,'owner')),ref(owner,id)]
    if visibility=='public': writes.append(update('clubDirectory/'+id,directory(c)))
    commit(owner,writes,label='create '+id)

def join(id,uid,role='member',actor=None,allowed=True,extra=None):
    fields=read('ADMIN','clubs/'+id)
    writes=[raw_update('clubs/'+id,fields,{'memberCount':decode(fields['memberCount'])+1,'lastMembershipUid':uid,'updatedAt':SERVER}),
        update(f'clubs/{id}/members/{uid}',membership(uid,role)),ref(uid,id)]
    commit(actor or uid,writes+(extra or []),allowed,'join '+id+' '+role)

def run():
    rules=Path(__file__).resolve().parents[1].joinpath('firestore.rules').read_text(encoding='utf-8')
    req=urllib.request.Request('http://127.0.0.1:8185/emulator/v1/projects/demo-motodash:securityRules',
        data=json.dumps({'rules':{'files':[{'name':'firestore.rules','content':rules}]}}).encode(),
        headers={'Content-Type':'application/json'},method='PUT')
    urllib.request.urlopen(req,timeout=15).close()
    # Reset only the demo emulator database.
    url='http://127.0.0.1:8185/emulator/v1/projects/demo-motodash/databases/(default)/documents'
    urllib.request.urlopen(urllib.request.Request(url,method='DELETE'),timeout=15).close()
    profile=dict(uid='alice',displayName='Alice',email='alice@example.test',language='en',createdAt=SERVER,updatedAt=SERVER)
    commit('alice',[update('users/alice',profile)])
    read('alice','users/alice'); read('bob','users/alice',False); read(None,'users/alice',False)
    commit('alice',[raw_update('users/alice',read('alice','users/alice'),{'systemAdmin':True,'updatedAt':SERVER})],False,'system escalation')
    vehicle=dict(id='bike',ownerUid='alice',category='motorcycle',nickname='Bike',manufacturer='',model='',modelYear=2025,
        description='',visibility='public',createdAt=SERVER,updatedAt=SERVER)
    commit('alice',[update('users/alice/vehicles/bike',vehicle)])
    read('bob','users/alice/vehicles/bike',False)
    commit('bob',[update('users/alice/vehicles/car',{**vehicle,'id':'car'})],False)
    commit('alice',[update('users/alice/preferences/garage',{'defaultVehicleId':'bike','updatedAt':SERVER})])
    commit('alice',[delete('users/alice/vehicles/bike')],False,'default dangling')
    commit('alice',[delete('users/alice/vehicles/bike'),update('users/alice/preferences/garage',{'defaultVehicleId':None,'updatedAt':SERVER})])
    create_club('open','alice')
    join('open','bob','admin',allowed=False); join('open','bob','host',allowed=False); join('open','bob','owner',allowed=False)
    join('open','bob'); join('open','carol')
    b=read('bob','clubs/open/members/bob')
    commit('bob',[raw_update('clubs/open/members/bob',b,{'technicalRole':'admin','updatedAt':SERVER})],False)
    commit('alice',[raw_update('clubs/open/members/bob',b,{'technicalRole':'admin','updatedAt':SERVER})])
    c=read('bob','clubs/open/members/carol')
    commit('bob',[raw_update('clubs/open/members/carol',c,{'technicalRole':'host','updatedAt':SERVER})])
    commit('bob',[raw_update('clubs/open/members/carol',c,{'technicalRole':'admin','updatedAt':SERVER})],False)
    a=read('bob','clubs/open/members/alice')
    commit('bob',[raw_update('clubs/open/members/alice',a,{'rankId':None,'updatedAt':SERVER})],False)
    commit('carol',[update('clubs/open/ranks/captain',dict(id='captain',name='Captain',displayOrder=0,createdAt=SERVER,updatedAt=SERVER))],False)
    commit('bob',[update('clubs/open/ranks/captain',dict(id='captain',name='Captain',displayOrder=0,createdAt=SERVER,updatedAt=SERVER))])
    commit('bob',[raw_update('clubs/open/members/carol',read('bob','clubs/open/members/carol'),{'rankId':'captain','updatedAt':SERVER})])
    commit('carol',[update('clubs/open/wall/info',dict(text='Attack',updatedBy='carol',createdAt=SERVER,updatedAt=SERVER))],False,'rank has no rights')
    commit('bob',[update('clubs/open/wall/info',dict(text='Announcement',updatedBy='bob',createdAt=SERVER,updatedAt=SERVER))])
    read('dave','clubs/open/wall/info',False)
    create_club('private','alice','private','private')
    read('dave','clubs/private',False); join('private','dave',allowed=False)
    commit('ADMIN',[{'update':{'name':NAME+'clubs/private/invites/dave','fields':{'uid':value('dave'),'invitedBy':value('alice'),
        'expiresAt':{'timestampValue':'2099-01-01T00:00:00Z'},'createdAt':{'timestampValue':'2026-01-01T00:00:00Z'}}}}])
    read('dave','clubs/private')
    join('private','dave',extra=[delete('clubs/private/invites/dave')])
    create_club('approval','alice','approval')
    join('approval','dave',allowed=False)
    commit('dave',[update('clubs/approval/joinRequests/dave',dict(uid='dave',state='pending',requestedAt=SERVER,decidedAt=None,decidedBy=None))])
    req=read('alice','clubs/approval/joinRequests/dave')
    join('approval','dave',actor='alice',extra=[raw_update('clubs/approval/joinRequests/dave',req,{'state':'approved','decidedAt':SERVER,'decidedBy':'alice'})])
    fields=read('alice','clubs/open')
    commit('bob',[raw_update('clubs/open',fields,{'visibility':'private','membershipPolicy':'private','updatedAt':SERVER}),delete('clubDirectory/open')],False)
    commit('alice',[raw_update('clubs/open',fields,{'memberCount':999,'updatedAt':SERVER})],False,'forged count')
    commit('alice',[delete('clubs/open')],False,'delete active members')
    ride=dict(id='ride',schemaVersion=1,ownerUid='alice',vehicleId=None,vehicleSnapshot=None,category=None,name='Ride',status='completed',visibility='private',
        startedAt=1000,endedAt=2000,distanceMeters=0,movingDurationMs=0,averageMovingSpeedKmh=0,maxSpeedKmh=0,mapTheme='normal',pointCount=1,
        chunkCount=1,routeHash='a'*64,revisionId='b'*64,baseRevisionId=None,uploadState='uploading',clientUpdatedAt=2000,createdAt=SERVER,updatedAt=SERVER)
    commit('alice',[update('users/alice/sessions/ride',ride)])
    read('bob','users/alice/sessions/ride',False)
    chunk=dict(schemaVersion=1,ownerUid='alice',sessionId='ride',sequence=0,pointCount=1,pointsJson='[]',routeHash='a'*64)
    commit('alice',[update('users/alice/sessions/ride/routeChunks/0000',chunk)])
    commit('alice',[update('users/alice/sessions/ride/routeChunks/0000',{**chunk,'pointsJson':'changed'})],False)
    commit('alice',[raw_update('users/alice/sessions/ride',read('alice','users/alice/sessions/ride'),{'uploadState':'ready','updatedAt':SERVER})])
    commit('alice',[delete('users/alice/sessions/ride')],False)
    commit('alice',[update('users/alice/sessionTombstones/ride',dict(id='ride',ownerUid='alice',deletedAt=SERVER))])
    commit('alice',[delete('users/alice/sessions/ride/routeChunks/0000'),delete('users/alice/sessions/ride')])
    commit('alice',[update('users/alice/sessions/ride',ride)],False,'no resurrection')
    print(f'PASS: {checks} real emulator assertions, profile/Garage/private rides/Clubs/approval/invites/roles/ranks/wall and escalation denials')

if __name__ == '__main__': run()

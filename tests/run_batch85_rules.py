"""Batch 8.5: actual localhost demo Rules; never production."""
import uuid
import run_rules as r
from run_batch6b_rules import compile_rules
import run_group_rules as g

def identity_tests():
    base=dict(schemaVersion=1,ownerUid='identity85',vehicleId=None,vehicleSnapshot=None,category=None,name=None,status='completed',visibility='private',
        startedAt=1000,endedAt=2000,distanceMeters=0,movingDurationMs=0,averageMovingSpeedKmh=0,maxSpeedKmh=0,mapTheme='normal',pointCount=0,
        chunkCount=0,routeHash='a'*64,revisionId='b'*64,baseRevisionId=None,uploadState='uploading',clientUpdatedAt=2000,createdAt=r.SERVER,updatedAt=r.SERVER)
    identities=[dict(kind='personal',clubId=None,clubName=None,rankId=None,rankName=None),
      dict(kind='club',clubId='club85',clubName='Historical Club',rankId='captain',rankName='Captain')]
    for identity in identities:
        ident=str(uuid.uuid4());path='users/identity85/sessions/'+ident
        r.commit('identity85',[r.update(path,{**base,'id':ident,'ridingIdentity':identity})])
        fields=r.read('identity85',path)
        for actor in ['other85',None]:r.read(actor,path,False)
        r.commit('other85',[r.raw_update(path,fields,{'name':'Foreign edit','updatedAt':r.SERVER})],False)
        r.commit('identity85',[r.raw_update(path,fields,{'ridingIdentity':identities[1] if identity['kind']=='personal' else identities[0],'updatedAt':r.SERVER})],False)
    for identity in [{**identities[0],'kind':'admin'},{**identities[1],'technicalRole':'owner'},{**identities[0],'clubId':'club85'},
        {**identities[1],'clubName':'x'*81},{**identities[1],'rankName':'x'*65}]:
        ident=str(uuid.uuid4());r.commit('identity85',[r.update('users/identity85/sessions/'+ident,{**base,'id':ident,'ridingIdentity':identity})],False)
    r.read('identity85','users/other85/sessions/ride',False)

def group_identity_tests():
    uid='identity85';club='club85-current'
    r.commit('ADMIN',[r.update('displayProfiles/'+uid,dict(displayName='Rider '+uid,updatedAt=r.SERVER)),
      r.update('clubs/'+club,r.club_data(club,uid)),r.update('clubs/'+club+'/members/'+uid,r.membership(uid,'owner'))])
    group=g.group(uid);ident=group['id'];r.commit(uid,g.bootstrap(group))
    path=f'groupSessions/{ident}/participants/{uid}';original=r.read(uid,path)
    identity=dict(kind='club',clubId=club,clubName='Club '+club,rankId=None,rankName=None)
    r.commit(uid,[r.raw_update(path,original,{'ridingIdentity':identity,'updatedAt':r.SERVER})])
    current=r.read(uid,path)
    for bad in [{**identity,'clubName':'Forged name'},{**identity,'clubId':'not-member'},{**identity,'rankId':'captain','rankName':'Captain'}]:
        r.commit(uid,[r.raw_update(path,current,{'ridingIdentity':bad,'updatedAt':r.SERVER})],False)
    r.commit('other85',[r.raw_update(path,current,{'ridingIdentity':None,'updatedAt':r.SERVER})],False)
    r.commit(uid,g.changes(ident,r.read(uid,'groupSessions/'+ident),{'state':'active','updatedAt':r.SERVER}))
    r.commit(uid,[r.raw_update(path,current,{'ridingIdentity':None,'updatedAt':r.SERVER})],False)
    r.commit(uid,[r.raw_update(path,current,{'status':'fuel','updatedAt':r.SERVER})])
    r.read(None,path,False)

def run():
    compile_rules();r.checks=0;identity_tests();group_identity_tests()
    print(f'PASS: Batch 8.5 Rules: {r.checks} passed, 0 failed, 0 skipped; actual localhost demo, not production')
if __name__=='__main__':run()

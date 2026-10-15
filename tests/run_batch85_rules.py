"""Batch 8.5: actual localhost demo Rules; never production."""
import uuid
import run_rules as r
from run_batch6b_rules import compile_rules
import run_group_rules as g
from concurrent.futures import ThreadPoolExecutor

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

def attendance_writes(uid,id,choice,counts,prior=None):
    return [r.update(f'groupSessions/{id}/attendance/{uid}',dict(uid=uid,sessionId=id,choice=choice,createdAt=prior or r.SERVER,updatedAt=r.SERVER)),
      r.update(f'groupSessions/{id}/attendanceSummary/current',{**counts,'updatedAt':r.SERVER}),
      r.update(f'users/{uid}/attendanceRefs/{id}',dict(uid=uid,sessionId=id,choice=choice,updatedAt=r.SERVER))]

def attendance_tests():
    owner='attendance85';r.commit('ADMIN',[r.update('displayProfiles/'+owner,dict(displayName='Rider '+owner,updatedAt=r.SERVER))])
    group=g.group(owner);group['maxParticipants']=2;id=group['id'];r.commit(owner,g.bootstrap(group))
    summary=f'groupSessions/{id}/attendanceSummary/current';path=f'groupSessions/{id}/attendance/bob85'
    counts=dict(going=0,interested=1,**{'not-going':0},total=1)
    writes=attendance_writes('bob85',id,'interested',counts)
    r.commit('bob85',writes);fields=r.read('bob85',path);created=(fields['createdAt']['timestampValue'],)
    r.read(owner,path);r.read('outsider85',path,False);r.read(None,path,False)
    r.read('outsider85',summary);r.read('outsider85',f'users/bob85/attendanceRefs/{id}',False)
    r.commit('outsider85',writes,False)
    r.commit('bob85',[r.update(summary,{**counts,'interested':99,'updatedAt':r.SERVER})],False)
    r.commit('bob85',attendance_writes('bob85',id,'interested',counts,created)) # idempotent duplicate
    counts.update(going=1,interested=0);r.commit('bob85',attendance_writes('bob85',id,'going',counts,created))
    r.commit('bob85',attendance_writes('bob85',id,'going',{**counts,'going':2},created),False)
    r.commit('bob85',[r.raw_update(f'groupSessions/{id}/participants/{owner}',r.read(owner,f'groupSessions/{id}/participants/{owner}'),{'uid':'bob85','updatedAt':r.SERVER})],False)
    # Intent does not create a participant or allow private canonical/live reads.
    code,_=r.request('GET',f'/groupSessions/{id}/participants/bob85','bob85');assert code==404;r.checks+=1
    r.read('bob85','groupSessions/'+id,False)
    second={**counts,'going':2,'total':2};r.commit('carol85',attendance_writes('carol85',id,'going',second))
    r.commit('dave85',attendance_writes('dave85',id,'going',{**second,'going':3,'total':3}),False)
    # Unknown/private activity isolation, manager-only roster queries and terminal writes.
    for policy in ['approval','private']:
        sample=g.group(owner);sample.update(visibility=policy,joiningPolicy='approval' if policy=='approval' else 'invite');sid=sample['id'];r.commit(owner,g.bootstrap(sample))
        r.commit('bob85',attendance_writes('bob85',sid,'going',dict(going=1,interested=0,**{'not-going':0},total=1)),policy!='private')
        if policy=='approval':g.join(sid,'bob85',allowed=False)
        else:r.read('bob85',f'groupSessions/{sid}/attendanceSummary/current',False)
    g.limited_query(owner,id,'attendance',True);g.limited_query('bob85',id,'attendance',False)
    g.limited_query(owner,id,'attendanceSummary',False)
    r.commit(owner,g.changes(id,r.read(owner,'groupSessions/'+id),{'state':'cancelled','updatedAt':r.SERVER}))
    r.commit('bob85',attendance_writes('bob85',id,'interested',dict(going=1,interested=1,**{'not-going':0},total=2),created),False)
    # Two independent commits with the same old count: only one can win.
    sample=g.group(owner);sid=sample['id'];r.commit(owner,g.bootstrap(sample))
    def race(actor):return r.request('POST',':commit',actor,{'writes':attendance_writes(actor,sid,'going',dict(going=1,interested=0,**{'not-going':0},total=1))})[0]
    with ThreadPoolExecutor(max_workers=2) as pool:codes=list(pool.map(race,['race-a85','race-b85']))
    assert sorted(codes)==[200,403],codes;r.checks+=1
    r.read(owner,f'groupSessions/{sid}/attendanceSummary/current')

def run():
    compile_rules();r.checks=0;identity_tests();group_identity_tests();attendance_tests()
    print(f'PASS: Batch 8.5 Rules: {r.checks} passed, 0 failed, 0 skipped; actual localhost demo, not production')
if __name__=='__main__':run()

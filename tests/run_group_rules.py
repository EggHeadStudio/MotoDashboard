"""Group rules integration; fixed local demo project, no production access."""
import time
import uuid
import run_rules as r

PAGE = ['id', 'title', 'description', 'activityType', 'category', 'clubId', 'clubName', 'hostName',
        'startsAt', 'endsAt', 'meetingArea', 'visibility', 'joiningPolicy', 'maxParticipants', 'state', 'participantCount', 'updatedAt']
def group(owner='alice', **changes):
    return dict(id=str(uuid.uuid4()), schemaVersion=1, creatorUid=owner, clubId=None, clubName='', hostName='Rider '+owner,
        title='Morning ride', description='Public description', activityType='ride', category='motorcycle',
        startsAt=int(time.time()*1000)+3600000, endsAt=None, meetingArea='Helsinki', meetingLocation='Private exact meeting point',
        visibility='public', joiningPolicy='open', maxParticipants=None, state='scheduled', participantCount=1,
        lastParticipantUid=owner, createdAt=r.SERVER, updatedAt=r.SERVER, **changes)
def page(data): return {k:data[k] for k in PAGE}
def participant(uid): return dict(uid=uid, vehicleId=None, vehicle=None, status='ok', joinedAt=r.SERVER, updatedAt=r.SERVER)
def index(uid, id): return r.update(f'users/{uid}/groupRefs/{id}', dict(uid=uid, sessionId=id, joinedAt=r.SERVER))
def bootstrap(g):
    id=g['id'];uid=g['creatorUid']
    return [r.update('groupSessions/'+id,g),r.update('groupPages/'+id,page(g)),
            r.update(f'groupSessions/{id}/participants/{uid}',participant(uid)),index(uid,id)]
def changes(id, fields, values):
    return [r.raw_update('groupSessions/'+id,fields,values),
            r.raw_update('groupPages/'+id,page(fields),{k:v for k,v in values.items() if k in PAGE})]
def run():
    r.run()  # Loads actual rules and resets localhost demo fixtures, including previous security tests.
    r.checks=0
    for uid in ['alice','bob','carol','dave']:
        code, body=r.request('GET','/users/'+uid,uid)
        write=(r.raw_update('users/'+uid,body['fields'],{'displayName':'Rider '+uid,'updatedAt':r.SERVER}) if code==200
            else r.update('users/'+uid,dict(uid=uid,displayName='Rider '+uid,email=uid+'@example.test',language='en',createdAt=r.SERVER,updatedAt=r.SERVER)))
        r.commit(uid,[write,
            r.update('displayProfiles/'+uid,dict(displayName='Rider '+uid,updatedAt=r.SERVER))])
    g=group();id=g['id'];r.commit('alice',bootstrap(g))
    safe=r.read('dave','groupPages/'+id)
    assert set(safe)==set(PAGE) and 'creatorUid' not in safe and 'meetingLocation' not in safe
    r.read('dave','groupSessions/'+id,False);r.read(None,'groupPages/'+id,False)
    r.read('alice','groupSessions/'+id);r.read('alice',f'groupSessions/{id}/participants/alice')
    r.read('dave',f'groupSessions/{id}/participants/alice',False)
    r.query('dave','','groupSessions',False);r.query('dave','','groupPages',False)
    r.commit('alice',[r.update('groupPages/'+id,{**page(g),'creatorUid':'alice'})],False)
    r.commit('dave',bootstrap(group('alice')),False)
    r.commit(None,bootstrap(group()),False)
    bad=group();bad['id']='user-controlled-club-name';r.commit('alice',bootstrap(bad),False)
    bad=group();bad['participantCount']=2;r.commit('alice',bootstrap(bad),False)
    bad=group();bad['hostName']='Impersonated';r.commit('alice',bootstrap(bad),False)
    bad=group();bad['visibility']='private';r.commit('alice',bootstrap(bad),False)
    for uid, allowed in [('alice',True),('bob',True),('carol',True),('dave',False)]:
        sample=group(uid);sample.update(clubId='open',clubName='Club open')
        r.commit(uid,bootstrap(sample),allowed,label='Club prototype host '+uid)
        if allowed:
            club_group=r.read(uid,'groupSessions/'+sample['id'])
            r.commit(uid,changes(sample['id'],club_group,{'title':'Club hosted ride','updatedAt':r.SERVER}))
            updated=r.read(uid,'groupSessions/'+sample['id'])
            r.commit('dave',changes(sample['id'],updated,{'state':'cancelled','updatedAt':r.SERVER}),False)
            r.commit(uid,changes(sample['id'],updated,{'state':'cancelled','updatedAt':r.SERVER}))
            retired=r.read(uid,'groupSessions/'+sample['id'])
            r.commit(uid,changes(sample['id'],retired,{'state':'active','updatedAt':r.SERVER}),False)
    r.commit('alice',changes(id,r.read('alice','groupSessions/'+id),{'creatorUid':'bob','updatedAt':r.SERVER}),False)
    for activity in ['ride','drive','meet','event']:
        sample=group();sample['activityType']=activity;r.commit('alice',bootstrap(sample))
    for category in ['motorcycle','car','moped','scooter','atv-utv','off-road','snowmobile','caravan','bicycle','e-bike','e-scooter','other']:
        sample=group();sample['category']=category;r.commit('alice',bootstrap(sample))
    for visibility, policy in [('approval','approval'),('unlisted','open'),('private','invite')]:
        sample=group();sample.update(visibility=visibility,joiningPolicy=policy);r.commit('alice',bootstrap(sample))
        r.read('dave','groupPages/'+sample['id'],visibility!='private')
    fields=r.read('alice','groupSessions/'+id)
    r.commit('dave',changes(id,fields,{'title':'Stolen','updatedAt':r.SERVER}),False)
    r.commit('alice',[r.raw_update('groupSessions/'+id,fields,{'title':'Unsynchronized','updatedAt':r.SERVER})],False)
    r.commit('alice',changes(id,fields,{'state':'active','updatedAt':r.SERVER}))
    fields=r.read('alice','groupSessions/'+id)
    r.commit('alice',changes(id,fields,{'state':'completed','updatedAt':r.SERVER}))
    fields=r.read('alice','groupSessions/'+id)
    r.commit('alice',changes(id,fields,{'state':'scheduled','updatedAt':r.SERVER}),False)
    r.commit('alice',[r.delete('groupSessions/'+id)],False)
    r.commit('alice',bootstrap(g),False)
    print(f'GROUP RESULT: {r.checks} passed, 0 failed, 0 skipped; localhost emulator only')
if __name__=='__main__': run()

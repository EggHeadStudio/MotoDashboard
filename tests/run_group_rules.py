"""Group rules integration; fixed local demo project, no production access."""
import time
import uuid
from datetime import datetime, timedelta, timezone
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
def eligible(data): return data['visibility'] in ['public','approval'] and data['state'] in ['scheduled','active']
def participant(uid): return dict(uid=uid, vehicleId=None, vehicle=None, clubIdentity=None, status='ok', joinedAt=r.SERVER, updatedAt=r.SERVER)
def index(uid, id): return r.update(f'users/{uid}/groupRefs/{id}', dict(uid=uid, sessionId=id, joinedAt=r.SERVER))
def bootstrap(g):
    id=g['id'];uid=g['creatorUid']
    writes=[r.update('groupSessions/'+id,g),r.update('groupPages/'+id,page(g)),
            r.update(f'groupSessions/{id}/participants/{uid}',participant(uid)),index(uid,id)]
    if eligible(g):writes.append(r.update('lobbyEvents/'+id,page(g)))
    return writes
def changes(id, fields, values):
    writes=[r.raw_update('groupSessions/'+id,fields,values),
            r.raw_update('groupPages/'+id,page(fields),{k:v for k,v in values.items() if k in PAGE})]
    new={k:r.decode(v) for k,v in fields.items()};new.update(values)
    if eligible(new):writes.append(r.raw_update('lobbyEvents/'+id,page(fields),{k:v for k,v in values.items() if k in PAGE}))
    elif eligible({k:r.decode(v) for k,v in fields.items()}):writes.append(r.delete('lobbyEvents/'+id))
    return writes
def join(id,uid,allowed=True,extra=None,vehicle=None):
    fields=r.read('ADMIN','groupSessions/'+id)
    member=participant(uid)
    if vehicle: member.update(vehicleId=vehicle['id'],vehicle={k:vehicle[k] for k in ['nickname','category']})
    writes=changes(id,fields,{'participantCount':r.decode(fields['participantCount'])+1,'lastParticipantUid':uid,'updatedAt':r.SERVER})
    writes += [r.update(f'groupSessions/{id}/participants/{uid}',member),index(uid,id)]
    r.commit(uid,writes+(extra or []),allowed,label='Group join '+uid)
def leave(id,uid,actor=None,removed=False,allowed=True):
    fields=r.read('ADMIN','groupSessions/'+id)
    writes=changes(id,fields,{'participantCount':r.decode(fields['participantCount'])-1,'lastParticipantUid':uid,'updatedAt':r.SERVER})
    writes += [r.delete(f'groupSessions/{id}/participants/{uid}'),r.delete(f'users/{uid}/groupRefs/{id}')]
    if removed:writes.append(r.update(f'groupSessions/{id}/bans/{uid}',dict(uid=uid,removedBy=actor,removedAt=r.SERVER)))
    r.commit(actor or uid,writes,allowed,label='Group leave/remove '+uid)
def invite(id,uid,days=6):
    return r.update(f'groupSessions/{id}/invites/{uid}',dict(uid=uid,token=str(uuid.uuid4()),invitedBy='alice',createdAt=r.SERVER,
        expiresAt=((datetime.now(timezone.utc)+timedelta(days=days)).isoformat(),)))
def limited_query(uid,id,path,allowed=True,limit=20):
    code,body=r.request('POST',f'/groupSessions/{id}:runQuery',uid,{'structuredQuery':{'from':[{'collectionId':path}],'limit':limit}})
    assert code==(200 if allowed else 403),(uid,path,code,body);r.checks+=1
def lobby_query(uid,allowed=True,limit=20,extra=None):
    filters=[{'fieldFilter':{'field':{'fieldPath':key},'op':'IN','value':r.value(values)}}
             for key,values in [('visibility',['public','approval']),('state',['scheduled','active'])]]
    for key,value in (extra or {}).items(): filters.append({'fieldFilter':{'field':{'fieldPath':key},'op':'EQUAL','value':r.value(value)}})
    code,body=r.request('POST',':runQuery',uid,{'structuredQuery':{'from':[{'collectionId':'lobbyEvents'}],
        'where':{'compositeFilter':{'op':'AND','filters':filters}},'orderBy':[{'field':{'fieldPath':'startsAt'},'direction':'ASCENDING'}],'limit':limit}})
    assert code==(200 if allowed else 403),(uid,code,body);r.checks+=1
    return body
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
    # Membership records, counters, indexes and removals must change together.
    open_group=group();sid=open_group['id'];r.commit('alice',bootstrap(open_group))
    r.commit('bob',[r.update(f'groupSessions/{sid}/participants/bob',participant('bob')),index('bob',sid)],False)
    join(sid,'bob');join(sid,'bob',False)
    r.read('bob','groupSessions/'+sid);r.read('bob',f'groupSessions/{sid}/participants/alice')
    limited_query('bob',sid,'participants');limited_query('dave',sid,'participants',False);limited_query('bob',sid,'participants',False,51)
    r.read('dave',f'groupSessions/{sid}/participants/bob',False)
    r.read('bob',f'users/alice/groupRefs/{sid}',False)
    r.commit('bob',[r.delete(f'users/bob/groupRefs/{sid}')],False)
    r.commit('bob',[r.update(f'groupSessions/{sid}/participants/carol',participant('carol'))],False)
    fields=r.read('bob',f'groupSessions/{sid}/participants/bob')
    r.commit('bob',[r.raw_update(f'groupSessions/{sid}/participants/bob',fields,{'technicalRole':'host','updatedAt':r.SERVER})],False)
    r.commit('alice',[r.raw_update(f'groupSessions/{sid}/participants/bob',fields,{'status':'help','updatedAt':r.SERVER})],False)
    leave(sid,'alice',allowed=False);leave(sid,'bob',actor='dave',removed=True,allowed=False)
    leave(sid,'bob');r.read('bob','groupSessions/'+sid,False);join(sid,'bob')
    leave(sid,'bob',actor='alice',allowed=False);leave(sid,'bob',actor='alice',removed=True)
    join(sid,'bob',False);r.commit('bob',[r.delete(f'groupSessions/{sid}/bans/bob')],False)
    r.commit('alice',[invite(sid,'bob')],False)
    limited=group();limited['maxParticipants']=2;r.commit('alice',bootstrap(limited));join(limited['id'],'bob');join(limited['id'],'carol',False)
    approval=group();approval.update(visibility='approval',joiningPolicy='approval');aid=approval['id'];r.commit('alice',bootstrap(approval))
    join(aid,'bob',False)
    pending=dict(uid='bob',state='pending',requestedAt=r.SERVER,decidedAt=None,decidedBy=None)
    r.commit('bob',[r.update(f'groupSessions/{aid}/joinRequests/bob',pending)])
    req=r.read('bob',f'groupSessions/{aid}/joinRequests/bob')
    r.read('carol',f'groupSessions/{aid}/joinRequests/bob',False);limited_query('carol',aid,'joinRequests',False)
    r.commit('bob',[r.raw_update(f'groupSessions/{aid}/joinRequests/bob',req,{'state':'approved','decidedBy':'bob','decidedAt':r.SERVER})],False)
    r.commit('alice',[r.raw_update(f'groupSessions/{aid}/joinRequests/bob',req,{'state':'rejected','decidedBy':'alice','decidedAt':r.SERVER})])
    join(aid,'bob',False);r.commit('bob',[r.delete(f'groupSessions/{aid}/joinRequests/bob')])
    r.commit('bob',[r.update(f'groupSessions/{aid}/joinRequests/bob',pending)])
    req=r.read('alice',f'groupSessions/{aid}/joinRequests/bob')
    r.commit('alice',[r.raw_update(f'groupSessions/{aid}/joinRequests/bob',req,{'state':'approved','decidedBy':'alice','decidedAt':r.SERVER})])
    join(aid,'bob',extra=[r.delete(f'groupSessions/{aid}/joinRequests/bob')]);join(aid,'carol',False)
    private=group();private.update(visibility='private',joiningPolicy='invite');pid=private['id'];r.commit('alice',bootstrap(private))
    r.read('bob','groupPages/'+pid,False);join(pid,'bob',False)
    r.commit('bob',[invite(pid,'bob')],False);r.commit('alice',[invite(pid,'bob',days=8)],False)
    r.commit('alice',[invite(pid,'bob')]);r.read('bob','groupPages/'+pid);r.read('carol','groupPages/'+pid,False)
    r.read('carol',f'groupSessions/{pid}/invites/bob',False);limited_query('carol',pid,'invites',False)
    join(pid,'bob',False) # Invitation must be consumed in the same atomic commit.
    r.commit('alice',[r.delete(f'groupSessions/{pid}/invites/bob')]);r.read('bob','groupPages/'+pid,False)
    r.commit('ADMIN',[invite(pid,'bob',days=-1)]);r.read('bob','groupPages/'+pid,False)
    join(pid,'bob',False,extra=[r.delete(f'groupSessions/{pid}/invites/bob')])
    r.commit('alice',[invite(pid,'bob')]);join(pid,'bob',extra=[r.delete(f'groupSessions/{pid}/invites/bob')])
    r.read('bob','groupSessions/'+pid);leave(pid,'bob');r.read('bob','groupPages/'+pid,False)
    # Garage ownership and minimal vehicle snapshots are checked by rules.
    vehicle=dict(id='group-bike',ownerUid='bob',category='bicycle',nickname='City Bike',manufacturer='Private maker',model='Private model',
        modelYear=None,description='Private notes',visibility='private',createdAt=r.SERVER,updatedAt=r.SERVER)
    r.commit('bob',[r.update('users/bob/vehicles/group-bike',vehicle)])
    vg=group();vid=vg['id'];r.commit('alice',bootstrap(vg));join(vid,'bob',vehicle=vehicle)
    shared=r.read('alice',f'groupSessions/{vid}/participants/bob');assert set(shared['vehicle']['mapValue']['fields'])=={'nickname','category'}
    join(vid,'carol',False,vehicle=vehicle)
    member=r.read('bob',f'groupSessions/{vid}/participants/bob')
    for status in ['ok','fuel','mechanical','help']:
        r.commit('bob',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'status':status,'updatedAt':r.SERVER})])
    r.commit('bob',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'status':'emergency-dispatch','updatedAt':r.SERVER})],False)
    r.commit('carol',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'status':'fuel','updatedAt':r.SERVER})],False)
    r.commit('bob',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'clubIdentity':{'name':'Invented Club','rank':'Owner'},'updatedAt':r.SERVER})],False)
    r.commit('bob',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'vehicle':{'nickname':'Forged','category':'bicycle'},'updatedAt':r.SERVER})],False)
    r.commit('bob',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'vehicle':{'nickname':'City Bike','category':'bicycle','model':'Private model'},'updatedAt':r.SERVER})],False)
    status_group=r.read('alice','groupSessions/'+vid)
    r.commit('alice',changes(vid,status_group,{'state':'cancelled','updatedAt':r.SERVER}))
    r.commit('bob',[r.raw_update(f'groupSessions/{vid}/participants/bob',member,{'status':'fuel','updatedAt':r.SERVER})],False)
    rank_group=group('carol');rank_group.update(clubId='open',clubName='Club open');rid=rank_group['id']
    r.commit('carol',bootstrap(rank_group));rank_member=r.read('carol',f'groupSessions/{rid}/participants/carol')
    r.commit('carol',[r.raw_update(f'groupSessions/{rid}/participants/carol',rank_member,{'clubIdentity':{'name':'Club open','rank':'Captain'},'updatedAt':r.SERVER})])
    rank_member=r.read('carol',f'groupSessions/{rid}/participants/carol')
    r.commit('carol',[r.raw_update(f'groupSessions/{rid}/participants/carol',rank_member,{'clubIdentity':{'name':'Club open','rank':'Owner'},'updatedAt':r.SERVER})],False)
    host_group=r.read('alice','groupSessions/'+rid)
    r.commit('bob',changes(rid,host_group,{'title':'Admin edited','updatedAt':r.SERVER}))
    membership=r.read('alice','clubs/open/members/carol')
    r.commit('alice',[r.raw_update('clubs/open/members/carol',membership,{'technicalRole':'member','updatedAt':r.SERVER})])
    host_group=r.read('carol','groupSessions/'+rid)
    r.commit('carol',changes(rid,host_group,{'title':'Rank promoted me','updatedAt':r.SERVER}),False)
    # Retiring a Club closes all bound sessions and stale invitations without child deletion.
    r.create_club('group-bound','alice');bound=group();bound.update(clubId='group-bound',clubName='Club group-bound')
    bid=bound['id'];r.commit('alice',bootstrap(bound));r.commit('alice',[invite(bid,'bob')])
    club=r.read('alice','clubs/group-bound');r.commit('alice',r.club_changes('group-bound',club,{'state':'archived','updatedAt':r.SERVER})+[r.delete('clubDirectory/group-bound')])
    club=r.read('alice','clubs/group-bound');r.commit('alice',r.club_changes('group-bound',club,{'state':'deleted','updatedAt':r.SERVER})+[r.delete('clubPages/group-bound'),r.delete('users/alice/clubRefs/group-bound')])
    for actor in ['alice','bob','carol']:
        r.read(actor,'groupPages/'+bid,False);r.read(actor,'groupSessions/'+bid,False);r.read(actor,f'groupSessions/{bid}/invites/bob',False)
    public=group();lid=public['id'];r.commit('alice',bootstrap(public))
    safe=r.read('dave','lobbyEvents/'+lid);assert set(safe)==set(PAGE)
    for key in ['creatorUid','lastParticipantUid','meetingLocation','participants','invitationToken']:
        r.commit('alice',[r.update('lobbyEvents/'+lid,{**page(public),key:'private'})],False)
    lobby_query('dave');lobby_query(None,False);lobby_query('dave',False,limit=21)
    for key,value in [('activityType','ride'),('category','motorcycle'),('meetingArea','Helsinki'),('clubId','open')]:lobby_query('dave',extra={key:value})
    all_rows=lobby_query('dave');discovered=[row['document']['fields'] for row in all_rows if 'document' in row]
    assert all(row['visibility']['stringValue'] in ['public','approval'] and row['state']['stringValue'] in ['scheduled','active'] for row in discovered)
    hidden=group();hidden.update(visibility='unlisted');hid=hidden['id'];r.commit('alice',bootstrap(hidden))
    r.read('dave','lobbyEvents/'+hid,False);r.commit('alice',[r.update('lobbyEvents/'+hid,page(hidden))],False)
    fields=r.read('alice','groupSessions/'+lid)
    r.commit('alice',changes(lid,fields,{'visibility':'private','joiningPolicy':'invite','updatedAt':r.SERVER}))
    r.read('dave','lobbyEvents/'+lid,False);r.read('dave','groupPages/'+lid,False)
    r.commit('alice',[r.update('lobbyEvents/'+lid,page(public))],False)
    print(f'GROUP RESULT: {r.checks} passed, 0 failed, 0 skipped; localhost emulator only')
if __name__=='__main__': run()

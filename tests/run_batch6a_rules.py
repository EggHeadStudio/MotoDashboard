"""Batch 6A authorization, exclusively localhost demo-motodash."""
import time,uuid
import run_rules as r
import run_group_rules as g

def note(kind,source,actor='alice'):
    return dict(type=kind,sourceId=source,actorUid=actor,createdAt=r.SERVER,readAt=None)

def run():
    r.run();r.checks=0
    for uid in ['alice','bob','carol','dave']:
        code,body=r.request('GET','/users/'+uid,uid)
        if code==200:
            writes=[r.raw_update('users/'+uid,body['fields'],{'displayName':'Rider '+uid,'updatedAt':r.SERVER})]
        else:
            writes=[r.update('users/'+uid,dict(uid=uid,email=uid+'@example.test',displayName='Rider '+uid,language='en',createdAt=r.SERVER,updatedAt=r.SERVER))]
        r.commit(uid,writes+[r.update('displayProfiles/'+uid,dict(displayName='Rider '+uid,updatedAt=r.SERVER))])
    sample=g.group();sample['category']='open';sid=sample['id'];r.commit('alice',g.bootstrap(sample))
    # Open is activity metadata only, never a Garage category.
    vehicle=dict(id='open-test',ownerUid='bob',category='open',nickname='Test',manufacturer='',model='',modelYear=None,description='',visibility='private',createdAt=r.SERVER,updatedAt=r.SERVER)
    r.commit('bob',[r.update('users/bob/vehicles/open-test',vehicle)],False)
    for category in ['car','bicycle','snowmobile']:
        vehicle.update(id=category,category=category)
        r.commit('bob',[r.update('users/bob/vehicles/'+category,vehicle)])
    g.join(sid,'bob',vehicle={**vehicle,'id':'snowmobile'})
    r.read('alice','users/bob/vehicles/snowmobile',False)
    c=r.club_data(str(uuid.uuid4()),'alice');c['category']='open'
    r.commit('alice',[r.update('clubs/'+c['id'],c),r.update('clubPages/'+c['id'],r.page(c)),r.update('clubDirectory/'+c['id'],r.directory(c)),r.update('clubs/'+c['id']+'/members/alice',r.membership('alice','owner')),r.ref('alice',c['id'])])
    r.read('dave','clubPages/'+c['id']);r.read(None,'clubPages/'+c['id'],False)
    # No privilege can start a stale identity or extend an already active deadline.
    fields=r.read('alice','groupSessions/'+sid)
    r.commit('bob',g.changes(sid,fields,{'state':'active','updatedAt':r.SERVER}),False)
    r.commit('alice',g.changes(sid,fields,{'state':'active','updatedAt':r.SERVER}))
    fields=r.read('alice','groupSessions/'+sid)
    r.commit('alice',g.changes(sid,fields,{'startsAt':int(time.time()*1000)+86400000,'updatedAt':r.SERVER}),False)
    r.commit('alice',g.changes(sid,fields,{'endsAt':int(time.time()*1000)+86400000,'updatedAt':r.SERVER}),False)
    r.commit('bob',g.changes(sid,fields,{'state':'completed','updatedAt':r.SERVER}),False)
    r.commit('alice',g.changes(sid,fields,{'state':'completed','updatedAt':r.SERVER}))
    fields=r.read('alice','groupSessions/'+sid)
    r.commit('alice',g.changes(sid,fields,{'state':'active','updatedAt':r.SERVER}),False)
    r.commit('bob',[r.update(f'groupSessions/{sid}/participants/bob',{**g.participant('bob'),'status':'fuel'})],False)
    # A legitimate future scheduled Group cannot be started days in advance.
    future=g.group();future['startsAt']=int(time.time()*1000)+7*86400000;r.commit('alice',g.bootstrap(future))
    r.commit('alice',g.changes(future['id'],r.read('alice','groupSessions/'+future['id']),{'state':'active','updatedAt':r.SERVER}),False)
    # Admin seed simulates retained legacy data; all tested client operations still use real rules.
    stale=g.group();stale.update(state='active',startsAt=int(time.time()*1000)-86400001)
    r.commit('ADMIN',g.bootstrap(stale));old=stale['id']
    g.join(old,'bob',False)
    r.commit('alice',[g.invite(old,'dave')],False)
    r.commit('alice',g.changes(old,r.read('alice','groupSessions/'+old),{'startsAt':int(time.time()*1000),'updatedAt':r.SERVER}),False)
    r.commit('alice',[r.update(f'groupSessions/{old}/participants/alice',{**g.participant('alice'),'status':'help'})],False)
    r.commit('alice',g.changes(old,r.read('alice','groupSessions/'+old),{'state':'completed','updatedAt':r.SERVER}))
    # Invitations and notifications must be the same authorized atomic source event.
    fresh=g.group();fid=fresh['id'];r.commit('alice',g.bootstrap(fresh))
    invitation=g.invite(fid,'dave');token=invitation['update']['fields']['token']['stringValue'];nid='gi-'+token
    path='users/dave/notifications/'+nid;n=note('group-invite',fid)
    r.commit('alice',[r.update(path,n)],False)
    r.commit('bob',[invitation,r.update(path,n)],False)
    r.commit('alice',[invitation,r.update(path,{**n,'actorUid':'bob'})],False)
    r.commit('alice',[invitation,r.update(path,{**n,'text':'Forged message'})],False)
    r.commit('alice',[invitation,r.update(path,n)])
    r.read('dave',path);r.read('alice',path,False);r.read(None,path,False)
    r.query('dave','users/dave','notifications');r.query('bob','users/dave','notifications',False)
    r.commit('alice',[r.update('users/bob/notifications/'+nid,n)],False)
    r.commit('alice',[r.update(path,n)],False) # old event replay cannot reset unread
    fields=r.read('dave',path)
    r.commit('bob',[r.raw_update(path,fields,{'readAt':r.SERVER})],False)
    r.commit('dave',[r.raw_update(path,fields,{'actorUid':'dave','readAt':r.SERVER})],False)
    r.commit('dave',[r.raw_update(path,fields,{'readAt':r.SERVER})])
    r.commit('dave',[r.raw_update(path,r.read('dave',path),{'readAt':None})],False)
    r.commit('dave',[r.delete(path)])
    # Group approval cannot notify a different recipient or precede a real pending request.
    approval=g.group();approval.update(joiningPolicy='approval',visibility='approval');aid=approval['id'];r.commit('alice',g.bootstrap(approval))
    req=f'groupSessions/{aid}/joinRequests/bob';target='users/bob/notifications/ga-'+aid
    r.commit('alice',[r.update(target,note('group-approved',aid))],False)
    r.commit('bob',[r.update(req,dict(uid='bob',state='pending',requestedAt=r.SERVER,decidedAt=None,decidedBy=None))])
    changes=r.raw_update(req,r.read('alice',req),{'state':'approved','decidedAt':r.SERVER,'decidedBy':'alice'})
    r.commit('alice',[changes,r.update('users/dave/notifications/ga-'+aid,note('group-approved',aid))],False)
    r.commit('alice',[changes,r.update(target,note('group-approved',aid))])
    r.read('bob',target);r.read('dave',target,False)
    r.commit('alice',[r.update(target,note('group-approved',aid))],False)
    # Club approval source is coupled to the actual membership transaction.
    cid=str(uuid.uuid4());r.create_club(cid,'alice','approval')
    req=f'clubs/{cid}/joinRequests/dave';target='users/dave/notifications/ca-'+cid
    r.commit('dave',[r.update(req,dict(uid='dave',state='pending',requestedAt=r.SERVER,decidedAt=None,decidedBy=None))])
    r.commit('alice',[r.update(target,note('club-approved',cid))],False)
    fields=r.read('alice','clubs/'+cid);request=r.read('alice',req)
    writes=r.club_changes(cid,fields,{'memberCount':2,'lastMembershipUid':'dave','updatedAt':r.SERVER})+[r.update(f'clubs/{cid}/members/dave',r.membership('dave')),r.ref('dave',cid),r.raw_update(req,request,{'state':'approved','decidedAt':r.SERVER,'decidedBy':'alice'})]
    r.commit('alice',writes+[r.update(target,note('club-approved',cid))]);r.read('dave',target)
    r.commit('dave',[r.update('users/alice/notifications/ca-'+cid,note('club-approved',cid,'dave'))],False)
    # Unimplemented broadcast types fail closed, including self-forged announcements.
    for kind in ['club-event','group-updated','group-cancelled','system-admin']:
        r.commit('alice',[r.update('users/alice/notifications/unknown',note(kind,fid))],False)
    print(f'PASS: {r.checks} Batch 6A emulator assertions; Open activity, bounded lifecycle, source-proven notifications and cross-account denials')

if __name__=='__main__':run()

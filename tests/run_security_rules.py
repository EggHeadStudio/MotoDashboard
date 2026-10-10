"""Additional authorization regressions, including the four release-review failures.
Uses only the fixed localhost demo emulator; reruns the baseline to create fixtures.
Run: python tests/run_security_rules.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_rules as r
# Rebuild fixtures in the fixed local demo database with the full existing suite.
r.run()
passed=failed=0

def check(label,method,path,uid,data=None,expected=403):
    global passed,failed
    code,body=r.request(method,path,uid,data)
    ok=code==expected
    passed+=ok;failed+=not ok
    print(('PASS' if ok else 'FAIL')+': '+label+f' expected={expected} actual={code}')
    return body

def write(label,uid,writes,expected=403):
    return check(label,'POST',':commit',uid,{'writes':writes},expected)

profile=r.read('ADMIN','users/alice')
write('cross-account profile update','bob',[r.raw_update('users/alice',profile,{'language':'fi','updatedAt':r.SERVER})])
write('cross-account profile delete','bob',[r.delete('users/alice')])
vehicle=dict(id='security',ownerUid='alice',category='car',nickname='Car',manufacturer='',model='',modelYear=None,description='',visibility='private',createdAt=r.SERVER,updatedAt=r.SERVER)
r.commit('alice',[r.update('users/alice/vehicles/security',vehicle)])
v=r.read('ADMIN','users/alice/vehicles/security')
write('cross-account Garage update','bob',[r.raw_update('users/alice/vehicles/security',v,{'nickname':'Stolen','updatedAt':r.SERVER})])
write('cross-account Garage delete','bob',[r.delete('users/alice/vehicles/security')])
ride=r.read('ADMIN','users/alice/sessions/large')
write('cross-account ride rename','bob',[r.raw_update('users/alice/sessions/large',ride,{'name':'Stolen','updatedAt':r.SERVER})])
write('cross-account ride delete','bob',[r.delete('users/alice/sessions/large')])
check('cross-account route chunk read','GET','/users/alice/sessions/large/routeChunks/0000','bob')
write('cross-account chunk delete','bob',[r.delete('users/alice/sessions/large/routeChunks/0000')])
write('cross-account deletion fence','bob',[r.update('users/alice/sessionTombstones/large',dict(id='large',ownerUid='alice',deletedAt=r.SERVER))])
check('signed-out ride read','GET','/users/alice/sessions/large',None)
check('cross-account ride query','POST','/users/alice:runQuery','bob',{'structuredQuery':{'from':[{'collectionId':'sessions'}]}},403)
for path in ['systemAdmins/bob','unknown/bob','groupSessions/future','lobbyEvents/future','officialActivities/future','users/bob/earnedBadges/future']:
    write('deny unknown/protected write '+path,'bob',[r.update(path,{'uid':'bob'})])
    check('deny unknown/protected read '+path,'GET','/'+path,'bob')
for actor in ['bob','carol']:
    fields=r.read('ADMIN',f'clubs/open/members/{actor}')
    for role in ['owner','admin','host']:
        if r.decode(fields['technicalRole'])==role: continue
        write(f'{actor} cannot self-promote/change to {role}',actor,[r.raw_update(f'clubs/open/members/{actor}',fields,{'technicalRole':role,'updatedAt':r.SERVER})])
# A separate ordinary member tests ranks and branding without Host privileges.
r.join('open','erin')
club=r.read('ADMIN','clubs/open')
for actor in ['carol','erin','dave']:
    write(actor+' cannot brand Club',actor,r.club_changes('open',club,{'description':'Unauthorized','updatedAt':r.SERVER}))
    wall=r.read('ADMIN','clubs/open/wall/info')
    write(actor+' cannot edit Wall',actor,[r.raw_update('clubs/open/wall/info',wall,{'text':'Unauthorized','updatedBy':actor,'updatedAt':r.SERVER})])
    write(actor+' cannot create ranks',actor,[r.update('clubs/open/ranks/escalation',dict(id='escalation',name='Owner',displayOrder=1,createdAt=r.SERVER,updatedAt=r.SERVER))])
r.commit('bob',[r.raw_update('clubs/open/members/erin',r.read('ADMIN','clubs/open/members/erin'),{'rankId':'captain','updatedAt':r.SERVER})])
write('Member with Captain still cannot edit Wall','erin',[r.raw_update('clubs/open/wall/info',r.read('ADMIN','clubs/open/wall/info'),{'text':'Rank bypass','updatedBy':'erin','updatedAt':r.SERVER})])
check('outsider cannot read membership roster','GET','/clubs/open/members/erin','dave')
check('outsider cannot read private account Club refs','GET','/users/alice/clubRefs/open','dave')
write('Admin cannot transfer canonical owner','bob',r.club_changes('open',club,{'ownerUid':'bob','updatedAt':r.SERVER}))
# Four previously failing security expectations. Both boundaries are checked through REST.
body=check('outsider can read safe public Club metadata','GET','/clubPages/open','dave',expected=200)
check('outsider cannot read public canonical authorization data','GET','/clubs/open','dave')
ok=set(body.get('fields',{}))==set(r.PAGE_FIELDS)
passed+=ok;failed+=not ok
print(('PASS' if ok else 'FAIL')+': public metadata has exact safe fields, no membership ledger/owner UIDs')
# Normal client permissions: retirement retains children but denies every access.
id='lifecycle-review'
r.create_club(id,'alice','private','private')
r.commit('alice',[r.update(f'clubs/{id}/wall/info',dict(text='Original private Club secret',updatedBy='alice',createdAt=r.SERVER,updatedAt=r.SERVER)),r.update(f'clubs/{id}/invites/carol',dict(uid='carol',invitedBy='alice',expiresAt=('2099-01-01T00:00:00Z',),createdAt=r.SERVER)),r.update(f'clubs/{id}/ranks/old',dict(id='old',name='Founder',displayOrder=1,createdAt=r.SERVER,updatedAt=r.SERVER))])
# Preserve an old approval record through normal operations before closing admission.
# A separate approval Club supplies the approval-retirement regression below.
check('current Owner can read private Wall','GET',f'/clubs/{id}/wall/info','alice',expected=200)
check('valid invite sees safe private page','GET',f'/clubPages/{id}','carol',expected=200)
check('valid invite cannot see canonical owner/membership ledger','GET',f'/clubs/{id}','carol')
r.commit('alice',r.club_changes(id,r.read('ADMIN','clubs/'+id),{'state':'archived','updatedAt':r.SERVER}))
fields=r.read('ADMIN','clubs/'+id)
retirement=[r.raw_update('clubs/'+id,fields,{'state':'deleted','updatedAt':r.SERVER}),r.delete('users/alice/clubRefs/'+id),r.delete('clubPages/'+id),r.delete('clubDirectory/'+id)]
write('outsider cannot retire Club','bob',retirement)
write('Owner cannot hard delete archived Club','alice',[r.delete('clubs/'+id),r.delete(f'clubs/{id}/members/alice'),r.delete('users/alice/clubRefs/'+id)])
write('Owner must remove public projection during retirement','alice',retirement[:-2])
write('Owner can irreversibly retire archived Club','alice',retirement,expected=200)
new=r.club_data(id,'bob','private','private')
write('unrelated founder cannot recreate retired ID','bob',[r.update('clubs/'+id,new),r.update('clubPages/'+id,r.page(new)),r.update(f'clubs/{id}/members/bob',r.membership('bob','owner')),r.ref('bob',id)])
check('new unrelated founder must not read old private Wall','GET',f'/clubs/{id}/wall/info','bob')
check('stale invite must not expose retired Club','GET','/clubPages/'+id,'carol')
write('stale invite must not admit membership','carol',r.club_changes(id,fields,{'memberCount':2,'lastMembershipUid':'carol','updatedAt':r.SERVER})+[r.update(f'clubs/{id}/members/carol',r.membership('carol')),r.ref('carol',id),r.delete(f'clubs/{id}/invites/carol')])

# No retained privilege survives, including a former Owner's own-UID read exceptions.
retired=r.read('ADMIN','clubs/'+id)
for actor in ['alice','bob','carol']:
    for path in ['clubs/'+id,'clubPages/'+id,f'clubs/{id}/wall/info',f'clubs/{id}/members/alice',f'clubs/{id}/ranks/old']:
        check(actor+' cannot read retired '+path,'GET','/'+path,actor)
    check(actor+' cannot list retired membership','POST',f'/clubs/{id}:runQuery',actor,
        {'structuredQuery':{'from':[{'collectionId':'members'}]}})
    write(actor+' cannot reactivate retired ID',actor,r.club_changes(id,retired,{'state':'active','updatedAt':r.SERVER}))
    write(actor+' cannot hard delete ID reservation',actor,[r.delete('clubs/'+id)])
check('stale invitee cannot read retained invite','GET',f'/clubs/{id}/invites/carol','carol')
write('stale invitee cannot consume retained invite','carol',[r.delete(f'clubs/{id}/invites/carol')])
write('former Owner cannot regain account ref','alice',[r.ref('alice',id)])
write('former Owner cannot update old Wall','alice',[r.raw_update(f'clubs/{id}/wall/info',r.read('ADMIN',f'clubs/{id}/wall/info'),{'text':'Revived','updatedBy':'alice','updatedAt':r.SERVER})])
write('former Owner cannot update old rank','alice',[r.raw_update(f'clubs/{id}/ranks/old',r.read('ADMIN',f'clubs/{id}/ranks/old'),{'name':'Revived','updatedAt':r.SERVER})])
for child in ['wall/info','invites/carol','members/alice','ranks/old']:
    code,_=r.request('GET',f'/clubs/{id}/'+child,'ADMIN')
    ok=code==200;passed+=ok;failed+=not ok
    print(('PASS' if ok else 'FAIL')+': retained '+child+' exists; denial is enforced by rules')
r.create_club('fresh-private','bob','private','private')
check('new ID has no old Wall','GET','/clubs/fresh-private/wall/info','bob',expected=404)
check('old invite grants no access to new ID','GET','/clubPages/fresh-private','carol')

# Pending approval requests also survive physically and lose requester/manager access.
id='retired-approval';r.create_club(id,'alice','approval')
r.commit('carol',[r.update(f'clubs/{id}/joinRequests/carol',dict(uid='carol',state='pending',requestedAt=r.SERVER,decidedAt=None,decidedBy=None))])
check('requester can read live approval','GET',f'/clubs/{id}/joinRequests/carol','carol',expected=200)
fields=r.read('ADMIN','clubs/'+id)
write('active Club cannot skip archive', 'alice', [r.raw_update('clubs/'+id,fields,{'state':'deleted','updatedAt':r.SERVER}),r.delete('clubPages/'+id),r.delete('clubDirectory/'+id),r.delete('users/alice/clubRefs/'+id)])
r.commit('alice',r.club_changes(id,fields,{'state':'archived','updatedAt':r.SERVER})+[r.delete('clubDirectory/'+id)])
fields=r.read('ADMIN','clubs/'+id)
write('archived approval Club retirement succeeds','alice',[r.raw_update('clubs/'+id,fields,{'state':'deleted','updatedAt':r.SERVER}),r.delete('clubPages/'+id),r.delete('clubDirectory/'+id),r.delete('users/alice/clubRefs/'+id)],expected=200)
for actor in ['alice','carol']:
    check(actor+' cannot read retired approval','GET',f'/clubs/{id}/joinRequests/carol',actor)
    write(actor+' cannot delete retired approval',actor,[r.delete(f'clubs/{id}/joinRequests/carol')])
write('former manager cannot approve retired request','alice',[r.raw_update(f'clubs/{id}/joinRequests/carol',r.read('ADMIN',f'clubs/{id}/joinRequests/carol'),{'state':'approved','decidedAt':r.SERVER,'decidedBy':'alice'})])

# Ensure security rejections below carry all required page writes; not a stale-page denial.
club=r.read('ADMIN','clubs/open');wall=r.read('ADMIN','clubs/open/wall/info')
for actor in ['carol','erin','dave']:
    write(actor+' cannot edit branding with consistent page',actor,r.club_changes('open',club,{'description':'Attack','updatedAt':r.SERVER})+
        [r.raw_update('clubDirectory/open',r.read('ADMIN','clubDirectory/open'),{'updatedAt':r.SERVER})])
    write(actor+' cannot retire nonempty Club',actor,[r.raw_update('clubs/open',club,{'state':'deleted','updatedAt':r.SERVER}),r.delete('clubPages/open'),r.delete('clubDirectory/open'),r.delete(f'users/{actor}/clubRefs/open')])
# Exact page allowlist, privacy changes, and positive/negative member admission.
page=r.read('ADMIN','clubPages/open')
for secret in ['ownerUid','lastMembershipUid','invitationSecret','approvalRecords','memberUids']:
    write('even Owner cannot insert public '+secret,'alice',[r.raw_update('clubPages/open',page,{secret:'secret','updatedAt':r.SERVER})])
write('Owner cannot update canonical without page','alice',[r.raw_update('clubs/open',club,{'description':'Out of sync','updatedAt':r.SERVER})])
write('Owner cannot delete live safe page','alice',[r.delete('clubPages/open')])
check('anonymous cannot read safe page','GET','/clubPages/open',None)
check('outsider cannot read another invitation','GET','/clubs/open/invites/carol','dave')
check('outsider cannot list invite secrets','POST','/clubs/open:runQuery','dave',{'structuredQuery':{'from':[{'collectionId':'invites'}]}})
check('outsider cannot read approval ledger','GET','/clubs/approval/joinRequests/dave','erin')
check('member can read current canonical Club','GET','/clubs/open','erin',expected=200)
check('member can read current Wall','GET','/clubs/open/wall/info','erin',expected=200)
check('Owner can read Garage','GET','/users/alice/vehicles/security','alice',expected=200)
check('Owner can read ride','GET','/users/alice/sessions/large','alice',expected=200)
check('outsider cannot read Garage','GET','/users/alice/vehicles/security','bob')
check('outsider cannot read ride','GET','/users/alice/sessions/large','bob')
# Public -> private atomically withdraws both presentation entry points from outsiders.
id='privacy-switch';r.create_club(id,'alice')
fields=r.read('ADMIN','clubs/'+id)
write('Owner privacy switch succeeds with synchronized page','alice',r.club_changes(id,fields,{'visibility':'private','membershipPolicy':'private','updatedAt':r.SERVER})+[r.delete('clubDirectory/'+id)],expected=200)
check('old public page is now denied to outsiders','GET','/clubPages/'+id,'bob')
check('Owner still sees private page','GET','/clubPages/'+id,'alice',expected=200)
check('private Club no longer in directory','GET','/clubDirectory/'+id,'bob',expected=404)
r.create_club('unlisted-safe','alice',visibility='unlisted')
check('unlisted ID opens only safe page','GET','/clubPages/unlisted-safe','bob',expected=200)
check('unlisted canonical authorization remains private','GET','/clubs/unlisted-safe','bob')
# Valid member operations still work, and managers cannot evade retirement prerequisites.
id='nonempty-retirement';r.create_club(id,'alice');r.join(id,'bob')
fields=r.read('ADMIN',f'clubs/{id}/members/bob')
r.commit('alice',[r.raw_update(f'clubs/{id}/members/bob',fields,{'technicalRole':'admin','updatedAt':r.SERVER})])
fields=r.read('ADMIN','clubs/'+id)
r.commit('alice',r.club_changes(id,fields,{'state':'archived','updatedAt':r.SERVER})+[r.delete('clubDirectory/'+id)])
fields=r.read('ADMIN','clubs/'+id)
for actor in ['alice','bob']:
    write(actor+' cannot retire archived Club with another member',actor,[r.raw_update('clubs/'+id,fields,{'state':'deleted','updatedAt':r.SERVER}),r.delete('clubPages/'+id),r.delete('clubDirectory/'+id),r.delete('users/alice/clubRefs/'+id)])
write('Admin may leave archived Club','bob',r.club_changes(id,fields,{'memberCount':1,'lastMembershipUid':'bob','updatedAt':r.SERVER})+
    [r.delete(f'clubs/{id}/members/bob'),r.delete('users/bob/clubRefs/'+id)],expected=200)
fields=r.read('ADMIN','clubs/'+id)
write('Owner cannot retire without removing own index','alice',[r.raw_update('clubs/'+id,fields,{'state':'deleted','updatedAt':r.SERVER}),r.delete('clubPages/'+id),r.delete('clubDirectory/'+id)])
write('Owner retires after last other member leaves','alice',[r.raw_update('clubs/'+id,fields,{'state':'deleted','updatedAt':r.SERVER}),r.delete('clubPages/'+id),r.delete('clubDirectory/'+id),r.delete('users/alice/clubRefs/'+id)],expected=200)
check('departed Admin cannot read retired Wall','GET',f'/clubs/{id}/wall/info','bob')
write('departed Admin cannot recreate own private index','bob',[r.ref('bob',id)])
write('former Owner cannot self-promote retained membership','alice',[r.raw_update(f'clubs/{id}/members/alice',r.read('ADMIN',f'clubs/{id}/members/alice'),{'technicalRole':'admin','updatedAt':r.SERVER})])
id='unsynchronized-create';new=r.club_data(id,'alice')
write('Club creation requires safe page in atomic bootstrap','alice',[r.update('clubs/'+id,new),r.update(f'clubs/{id}/members/alice',r.membership('alice','owner')),r.ref('alice',id),r.update('clubDirectory/'+id,r.directory(new))])
# Even an accidentally malformed trusted backfill must never be publicly readable.
page=r.read('ADMIN','clubPages/open')
r.commit('ADMIN',[r.raw_update('clubPages/open',page,{'lastMembershipUid':'erin'})])
check('malformed backfill page with membership UID is denied','GET','/clubPages/open','dave')
r.commit('ADMIN',[r.raw_update('clubPages/open',page,{})])
check('repaired safe page remains readable','GET','/clubPages/open','dave',expected=200)
print(f'SECURITY RESULT: {passed} passed, {failed} failed, 0 skipped; fixed localhost demo-motodash only')
if failed: raise SystemExit(1)

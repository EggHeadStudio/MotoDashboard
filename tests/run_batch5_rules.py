"""Exact discovery/search query regressions against localhost demo Firestore only.
Emulator authorization results do not verify production composite-index availability.
"""
import json,itertools,time
from pathlib import Path
import run_rules as r
import run_group_rules as g

def run():
    source=Path(__file__).resolve().parents[1]
    rules=source.joinpath('firestore.rules').read_text(encoding='utf-8')
    import urllib.request
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8185/emulator/v1/projects/demo-motodash:securityRules',
      data=json.dumps({'rules':{'files':[{'name':'firestore.rules','content':rules}]}}).encode(),
      headers={'Content-Type':'application/json'},method='PUT'),timeout=15).close()
    r.checks=0
    r.request('DELETE','/displayProfiles/batch5-malformed','ADMIN')
    owner='batch5-owner';recipient='batch5-recipient';outsider='batch5-outsider'
    for uid,name in [(owner,'Batch Five Owner'),(recipient,'Batch Five Recipient'),(outsider,'Batch Five Outsider')]:
        for path in ['users/'+uid,'displayProfiles/'+uid]:r.request('DELETE','/'+path,'ADMIN')
        r.commit(uid,[r.update('users/'+uid,dict(uid=uid,displayName=name,email=uid+'@example.test',language='en',createdAt=r.SERVER,updatedAt=r.SERVER)),
                      r.update('displayProfiles/'+uid,dict(displayName=name,updatedAt=r.SERVER))])
    def field(key,op,value):return {'fieldFilter':{'field':{'fieldPath':key},'op':op,'value':r.value(value)}}
    def query(collection,filters,order,actor=outsider,limit=20,allowed=True,cursor=None):
        q={'from':[{'collectionId':collection}],'where':{'compositeFilter':{'op':'AND','filters':filters}},
           'orderBy':[{'field':{'fieldPath':key},'direction':'ASCENDING'} for key in order],'limit':limit}
        if cursor:q['startAt']=cursor
        code,body=r.request('POST',':runQuery',actor,{'structuredQuery':q})
        assert code==(200 if allowed else 403),(collection,actor,code,body)
        r.checks+=1
        return [row['document'] for row in body if 'document' in row] if code==200 else []
    prefix=[field('displayName','GREATER_THAN_OR_EQUAL','Batch Five'),field('displayName','LESS_THAN_OR_EQUAL','Batch Five\uf8ff')]
    rows=query('displayProfiles',prefix,['displayName'],limit=10)
    assert len(rows)==3 and all(set(row['fields'])=={'displayName','updatedAt'} for row in rows);r.checks+=1
    query('displayProfiles',prefix,['displayName'],actor=None,limit=10,allowed=False)
    query('displayProfiles',prefix,['displayName'],limit=31,allowed=False)
    r.read(outsider,'users/'+recipient,False)
    # Admin SDK writes bypass the rules; write validation is the projection invariant.
    # Do not pretend a query's map-key predicate sanitizes trusted/Admin data.
    r.request('DELETE','/displayProfiles/batch5-malformed','ADMIN')
    r.commit(recipient,[r.update('displayProfiles/'+recipient,{'displayName':'Batch Five Recipient','email':'secret@example.test','updatedAt':r.SERVER})],False)
    expected=set();private=set();now=int(time.time()*1000)+365*86400000
    club='batch5-club-'+str(now)
    r.create_club(club,owner)
    for visibility,policy in [('public','open'),('approval','approval'),('private','invite'),('unlisted','open')]:
        record=g.group(owner)
        record.update(hostName='Batch Five Owner',title='Batch5 '+visibility,meetingArea='Batch5Area',startsAt=now+3600000,visibility=visibility,joiningPolicy=policy,clubId=club,clubName='Club '+club)
        r.commit(owner,g.bootstrap(record));(expected if visibility in ['public','approval'] else private).add(record['id'])
    base=[field('visibility','IN',['public','approval']),field('state','IN',['scheduled','active']),
          field('startsAt','GREATER_THAN_OR_EQUAL',now),field('startsAt','LESS_THAN',now+86400000)]
    optional={'activityType':'ride','category':'motorcycle','meetingArea':'Batch5Area','clubId':club}
    for bits in itertools.product([False,True],repeat=4):
        filters=base+[field(key,'EQUAL',optional[key]) for key,enabled in zip(optional,bits) if enabled]
        rows=query('lobbyEvents',filters,['startsAt'])
        ids={row['fields']['id']['stringValue'] for row in rows}
        assert expected<=ids and not private&ids;r.checks+=1
    rows=query('lobbyEvents',base+[field('meetingArea','EQUAL','Batch5Area')],['startsAt','__name__'],limit=1)
    first=rows[0];cursor={'values':[first['fields']['startsAt'],{'referenceValue':first['name']}],'before':False}
    next_rows=query('lobbyEvents',base+[field('meetingArea','EQUAL','Batch5Area')],['startsAt','__name__'],limit=1,cursor=cursor)
    assert next_rows and next_rows[0]['name']!=first['name'];r.checks+=1
    query('lobbyEvents',base,['startsAt'],actor=None,allowed=False)
    query('lobbyEvents',base,['startsAt'],limit=21,allowed=False)
    query('lobbyEvents',[field('startsAt','GREATER_THAN_OR_EQUAL',now)],['startsAt'],allowed=False)
    query('lobbyEvents',base+[field('activityType','IN',['ride','drive'])],['startsAt'])
    sid=next(iter(expected))
    unknown=g.invite(sid,'batch5-unknown');unknown['update']['fields']['invitedBy']=r.value(owner)
    r.commit(owner,[unknown],False)
    invitation=g.invite(sid,recipient);invitation['update']['fields']['invitedBy']=r.value(owner)
    r.commit(owner,[invitation]);r.read(recipient,f'groupSessions/{sid}/invites/{recipient}')
    r.commit(outsider,[invitation],False)
    r.read(outsider,f'groupSessions/{sid}/invites/{recipient}',False)
    # Category discovery queries the safe projection, then hydrates safe pages only.
    query('clubDirectory',[field('category','EQUAL','motorcycle')],['name'])
    query('clubDirectory',[field('category','EQUAL','motorcycle')],['name'],actor=None,allowed=False)
    indexes=json.loads(source.joinpath('firestore.indexes.json').read_text())['indexes']
    lobby={tuple(f['fieldPath'] for f in index['fields']) for index in indexes if index['collectionGroup']=='lobbyEvents'}
    for bits in itertools.product([False,True],repeat=4):
        assert ('visibility','state',*(key for key,enabled in zip(optional,bits) if enabled),'startsAt') in lobby;r.checks+=1
    assert any(i['collectionGroup']=='clubDirectory' and [f['fieldPath'] for f in i['fields']]==['category','name'] for i in indexes);r.checks+=1
    print(f'PASS: Batch 5 authorization/query/index-source regressions: {r.checks} passed, 0 failed, 0 skipped; local emulator only')

if __name__=='__main__':run()

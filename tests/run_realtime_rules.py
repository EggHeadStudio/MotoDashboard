"""RTDB locked-foundation regression. No configurable host or production namespace."""
import json
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from run_rules import token

ROOT='http://127.0.0.1:9000'
NAMESPACE='demo-motodash-default-rtdb'
def request(method,path,actor=None,value=None):
    params={'ns':NAMESPACE};headers={'Content-Type':'application/json'}
    if actor=='ADMIN': headers['Authorization']='Bearer owner'
    elif actor: params['auth']=token(actor)
    req=urllib.request.Request(ROOT+'/'+path+'.json?'+urllib.parse.urlencode(params),
        method=method,headers=headers,data=json.dumps(value).encode() if value is not None else None)
    try:
        with urllib.request.urlopen(req,timeout=15) as response: return response.status,json.load(response)
    except urllib.error.HTTPError as error: return error.code,json.load(error)
def run():
    rules=json.loads(Path(__file__).resolve().parents[1].joinpath('database.rules.json').read_text())
    assert rules=={'rules':{'.read':False,'.write':False}},'Live tracking must remain locked without trusted ACL coordinator'
    code,body=request('PUT','.settings/rules','ADMIN',rules);assert code==200,(code,body)
    fixture={'uid':'participant','latitude':60.17,'longitude':24.94,'heading':90,'speed':0,'timestamp':123456789,'status':'ok'}
    code,body=request('PUT','liveSessions/fixture/participants/participant','ADMIN',fixture);assert code==200,(code,body)
    code,body=request('GET','liveSessions/fixture/participants/participant','ADMIN');assert code==200 and body==fixture
    checks=2
    for actor in [None,'participant','outsider','host','admin','owner']:
        for path in ['', 'liveSessions','liveSessions/fixture','liveSessions/fixture/participants',
                     'liveSessions/fixture/participants/participant','sessionACL/fixture']:
            code,body=request('GET',path,actor);assert code==401,(actor,path,code,body);checks+=1
        for path in ['liveSessions/fixture/participants/participant','liveSessions/fixture/participants/outsider','sessionACL/fixture']:
            code,body=request('PUT',path,actor,fixture);assert code==401,(actor,path,code,body);checks+=1
        code,body=request('DELETE','liveSessions/fixture/participants/participant',actor);assert code==401,(actor,code,body);checks+=1
    for malformed in [{**fixture,'latitude':91},{**fixture,'longitude':181},{**fixture,'speed':'fast'},
                      {**fixture,'secret':'not allowed'},{**fixture,'uid':'other'},{**fixture,'extra':'x'*10000}]:
        code,body=request('PATCH','liveSessions/fixture/participants/participant','participant',malformed)
        assert code==401,(code,body);checks+=1
    print(f'RTDB RESULT: {checks} passed, 0 failed, 0 skipped; locked foundation only, authorized live operations BLOCKED')
if __name__=='__main__':run()

"""Private media mirror boundary in actual localhost demo Rules. Never production."""
import uuid
import run_rules as r
from run_batch6b_rules import compile_rules
def run():
    compile_rules();r.checks=0
    for kind in ['profile','vehicle','club','group','rank']:
        ident=str(uuid.uuid4());path='mediaRecords/'+ident
        data={'id':ident,'kind':kind,'ownerUid':'alice','objectKey':'PRIVATE-KEY-MUST-NEVER-BE-PUBLIC','bytes':123}
        r.commit('ADMIN',[r.update(path,data)]);r.read('ADMIN',path)
        for uid in ['alice','bob',None]:
            r.read(uid,path,False);r.commit(uid,[r.update(path,data)],False);r.commit(uid,[r.delete(path)],False)
        r.query('alice','','mediaRecords',False)
    r.commit('alice',[r.update('users/alice/mediaRecords/forged',{'id':'forged'})],False)
    print(f'PASS: Batch 8 Rules: {r.checks} passed, 0 failed, 0 skipped; actual localhost demo, not production')
if __name__=='__main__':run()

"""Minimal display-profile authorization. Fixed localhost demo database only."""
import json
import urllib.request
from pathlib import Path
import run_rules as r


def run():
    rules = Path(__file__).resolve().parents[1].joinpath('firestore.rules').read_text(encoding='utf-8')
    payload = json.dumps({'rules': {'files': [{'name': 'firestore.rules', 'content': rules}]}}).encode()
    urllib.request.urlopen(urllib.request.Request(
        'http://127.0.0.1:8185/emulator/v1/projects/demo-motodash:securityRules',
        data=payload, headers={'Content-Type': 'application/json'}, method='PUT'), timeout=15).close()
    r.checks = 0
    for path in ['users/identity-owner', 'displayProfiles/identity-owner']:
        r.request('DELETE', '/' + path, 'ADMIN')
    profile = dict(uid='identity-owner', displayName='Identity Rider', email='identity-owner@example.test',
                   language='en', createdAt=r.SERVER, updatedAt=r.SERVER)
    display = dict(displayName='Identity Rider', updatedAt=r.SERVER)
    r.commit('identity-owner', [r.update('users/identity-owner', profile),
                               r.update('displayProfiles/identity-owner', display)])
    fields = r.read('identity-outsider', 'displayProfiles/identity-owner')
    assert set(fields) == {'displayName', 'updatedAt'}
    r.read('identity-outsider', 'users/identity-owner', False)
    r.read(None, 'displayProfiles/identity-owner', False)
    r.commit('identity-outsider', [r.update('displayProfiles/identity-owner', display)], False)
    r.commit('identity-owner', [r.update('displayProfiles/identity-owner', {**display, 'email': profile['email']})], False)
    r.commit('identity-owner', [r.update('displayProfiles/identity-owner', {**display, 'uid': 'identity-owner'})], False)
    r.commit('identity-owner', [r.update('displayProfiles/identity-owner', {**display, 'displayName': 'Impersonated name'})], False)
    r.commit('identity-owner', [r.delete('displayProfiles/identity-owner')], False)
    r.commit(None, [r.update('displayProfiles/identity-owner', display)], False)
    for actor, limit, allowed in [('identity-outsider', 10, True), ('identity-outsider', 31, False), (None, 10, False)]:
        query = {'structuredQuery': {'from': [{'collectionId': 'displayProfiles'}], 'limit': limit}}
        code, body = r.request('POST', ':runQuery', actor, query)
        assert code == (200 if allowed else 403), (actor, limit, code, body)
        r.checks += 1
    code, _ = r.request('GET', '/displayProfiles/identity-missing', 'identity-outsider')
    assert code == 404
    r.checks += 1
    changed = {**profile, 'displayName': 'Updated Rider'}
    original = r.read('identity-owner', 'users/identity-owner')
    r.commit('identity-owner', [r.raw_update('users/identity-owner', original,
              {'displayName': changed['displayName'], 'updatedAt': r.SERVER}),
              r.update('displayProfiles/identity-owner', {'displayName': changed['displayName'], 'updatedAt': r.SERVER})])
    original = r.read('identity-owner','users/identity-owner')
    for name in ['ab', ' '*3, 'x'*31, ' a ', ' Rider ', '\tAB\t', '\U0001f3cd'*31, '\U0001f3cd'*2]:
        r.commit('identity-owner',[r.raw_update('users/identity-owner',original,
                 {'displayName':name,'updatedAt':r.SERVER})],False)
    r.commit('identity-owner',[r.raw_update('users/identity-owner',original,
             {'displayName':'M\u00e4ki \u96ea','updatedAt':r.SERVER}),
             r.update('displayProfiles/identity-owner',{'displayName':'M\u00e4ki \u96ea','updatedAt':r.SERVER})])
    original=r.read('identity-owner','users/identity-owner')
    r.commit('identity-owner',[r.raw_update('users/identity-owner',original,
             {'displayName':'\U0001f3cd'*30,'updatedAt':r.SERVER}),
             r.update('displayProfiles/identity-owner',{'displayName':'\U0001f3cd'*30,'updatedAt':r.SERVER})])
    # Legacy short name can keep language updates, but cannot be assigned anew.
    legacy=r.read('identity-owner','users/identity-owner')
    r.commit('ADMIN',[r.raw_update('users/identity-owner',legacy,{'displayName':'A'})])
    legacy=r.read('identity-owner','users/identity-owner')
    r.commit('identity-owner',[r.raw_update('users/identity-owner',legacy,{'language':'fi','updatedAt':r.SERVER})])
    print(f'PASS: identity rules: {r.checks} passed, 0 failed, 0 skipped (local emulator only)')


if __name__ == '__main__':
    run()

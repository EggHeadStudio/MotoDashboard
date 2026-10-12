"""Read-only deployment contract validation; Python stdlib, no credentials/cloud calls."""
import hashlib
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate(root=ROOT):
    config = json.loads((root / 'firebase.deploy.json').read_text(encoding='utf-8'))
    assert set(config) == {'firestore', 'emulators'}, 'Deployment config must contain Firestore only'
    assert config['firestore'] == {'database': '(default)', 'rules': 'firestore.rules', 'indexes': 'firestore.indexes.json'}
    assert config['emulators'] == {'firestore': {'host': '127.0.0.1', 'port': 8185}, 'ui': {'enabled': False}, 'singleProjectMode': True}
    data = json.loads((root / 'firestore.indexes.json').read_text(encoding='utf-8'))
    assert set(data) == {'indexes', 'fieldOverrides'}
    optional = ['activityType', 'category', 'meetingArea', 'clubId']
    expected = {('sessions', (('uploadState', 'ASCENDING'), ('startedAt', 'DESCENDING'))),
                ('clubDirectory', (('category', 'ASCENDING'), ('name', 'ASCENDING')))}
    for bits in itertools.product([False, True], repeat=4):
        fields = ['visibility', 'state'] + [name for name, use in zip(optional, bits) if use] + ['startsAt']
        expected.add(('lobbyEvents', tuple((name, 'ASCENDING') for name in fields)))
    actual = []
    for index in data['indexes']:
        assert set(index) == {'collectionGroup', 'queryScope', 'fields'}
        assert index['queryScope'] == 'COLLECTION'
        assert all(set(field) == {'fieldPath', 'order'} for field in index['fields'])
        actual.append((index['collectionGroup'], tuple((field['fieldPath'], field['order']) for field in index['fields'])))
    assert len(actual) == 18 and len(set(actual)) == 18 and set(actual) == expected, 'Missing, duplicate or unexpected composite index'
    assert data['fieldOverrides'] == [{'collectionGroup': 'routeChunks', 'fieldPath': 'pointsJson', 'indexes': []}], 'Required route-chunk exemption changed'
    rules = (root / 'firestore.rules').read_text(encoding='utf-8')
    assert "rules_version = '2';" in rules
    assert 'match /{document=**} { allow read, write: if false; }' in rules, 'Default-deny rules required'
    for name in ['firestore.rules', 'firestore.indexes.json']:
        print(f'{name}: SHA256 {hashlib.sha256((root / name).read_bytes()).hexdigest()}')
    print('PASS: exact 18 composites, required single-field exemption, Firestore-only config and default-deny guard')
    print('Rules compilation/authorization still require the emulator suites; production indexes require Console verification.')


if __name__ == '__main__':
    validate()

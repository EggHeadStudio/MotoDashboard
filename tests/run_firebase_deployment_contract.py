"""Guard against wrong deployment scope, missing indexes and unsafe config changes."""
import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.validate_firebase_deployment import validate


def run():
    names = ['firebase.deploy.json', 'firestore.indexes.json', 'firestore.rules']
    with tempfile.TemporaryDirectory(prefix='motodash-deploy-test-') as raw:
        root = Path(raw).resolve()
        assert root.parent == Path(tempfile.gettempdir()).resolve() and root.name.startswith('motodash-deploy-test-')
        def reset():
            for name in names:
                (root / name).write_bytes((ROOT / name).read_bytes())
        reset()
        with contextlib.redirect_stdout(io.StringIO()):validate(root)
        changes = [
            ('firebase.deploy.json', lambda data: data.update(hosting={})),
            ('firebase.deploy.json', lambda data: data['firestore'].update(database='other')),
            ('firebase.deploy.json', lambda data: data['firestore'].update(rules='other.rules')),
            ('firestore.indexes.json', lambda data: data['indexes'].pop()),
            ('firestore.indexes.json', lambda data: data['indexes'].append(data['indexes'][0])),
            ('firestore.indexes.json', lambda data: data['indexes'][0].update(queryScope='COLLECTION_GROUP')),
            ('firestore.indexes.json', lambda data: data['indexes'][0]['fields'][1].update(order='ASCENDING')),
            ('firestore.indexes.json', lambda data: data.update(fieldOverrides=[])),
        ]
        for name, change in changes:
            reset();path=root/name;data=json.loads(path.read_text(encoding='utf-8'));change(data);path.write_text(json.dumps(data),encoding='utf-8')
            try:
                with contextlib.redirect_stdout(io.StringIO()):validate(root)
            except AssertionError:continue
            raise AssertionError('Invalid deployment contract was accepted: '+name)
        reset();path=root/'firestore.rules';path.write_text(path.read_text(encoding='utf-8').replace('match /{document=**} { allow read, write: if false; }',''),encoding='utf-8')
        try:
            with contextlib.redirect_stdout(io.StringIO()):validate(root)
        except AssertionError:pass
        else:raise AssertionError('Missing default deny was accepted')
    print('PASS: deployment contract: 10 cases passed, 0 failed, 0 skipped; no cloud calls')


if __name__ == '__main__':run()

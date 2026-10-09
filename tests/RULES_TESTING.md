# Local rules testing and live acceptance

Executed Batch 2 tests use the **real Firestore emulator**, an isolated demo
project, unsigned emulator-only test identities and REST requests. They do not
use an Admin credential and do not contact motodash-87bf8. Admin bypass is used
only to inspect/seed fixtures; assertions use alice/bob/carol/dave or no identity.

Prerequisites: Python 3 and Java 21. No npm, application dependency or build step.
Download the official emulator outside the repository:

```powershell
Invoke-WebRequest 'https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.20.2.jar' -OutFile "$env:TEMP\motodash-firestore-emulator-1.20.2.jar"
java -jar "$env:TEMP\motodash-firestore-emulator-1.20.2.jar" --host 127.0.0.1 --port 8185 --project_id demo-motodash --rules firestore.rules
```

In another terminal at the repository root:

```powershell
python tests/run_rules.py
```

The script reloads current rules and clears **only** the fixed local demo database.
Never substitute a production endpoint. Stop the emulator with Ctrl+C afterward.
Tests include valid founder creation, coupled membership/index/count changes,
approval/invite joining, private reads, Owner/Admin/Host/Member boundaries,
rank-without-rights, immutable route chunks, delete fences and unauthorized writes.

## Manual live acceptance, after user deploys reviewed rules

1. Verify Console project **motodash-87bf8**, Web app ID matches firebase-config.js,
   Auth Email/Password enabled, exact GitHub Pages host and localhost authorized.
2. Publish reviewed firestore.rules via Console Firestore > Rules; publish
   database.rules.json via RTDB > Rules (both root read/write false). This agent
   has not published anything. Add the routeChunks.pointsJson single-field index
   exemption from firestore.indexes.json in Firestore > Indexes > Single field.
3. Use two independent browser profiles, accounts A and B. Create own profiles and
   Garage vehicles; refresh, edit, choose default, delete. B must get denied for
   A's `users/A`, `users/A/vehicles/id`, `users/A/sessions/id` and route chunk reads
   and writes. Repeat with no signed-in account in Rules Playground.
4. Record/finish as A, inspect private manifest/chunks/ready state; force offline,
   finish/rename, reconnect/retry, verify one ID and no duplicate chunks. Log out
   while recording; B must see neither A's local history nor cloud data. Return
   to A and resume its unfinished local ride. Delete and retry an old upload;
   tombstone must prevent recreation.
5. Create public open, public approval and private invite Clubs as A. B joins
   open, requests approval (A approves/rejects), receives UID invite and consumes
   it on private join. An unrelated C must be denied all private Club data.
6. In Rules Playground use B's auth UID to update its membership role to admin,
   host or owner: each must fail. A may promote B to admin. B may manage another
   Host/Member but must not change A, another Admin, own role, Club privacy/policy,
   ownerUid or memberCount without corresponding atomic membership change.
7. Assign visible Captain rank to Member C; C's wall/branding/role writes must
   still fail. Test safe links/colors/plain wall, archive and deletion policy.
8. Attempt adding systemAdmin to own profile and writing systemAdmins, unknown
   collections and RTDB paths: all must fail. Retain RTDB lock for this batch.

Rules Playground cannot simulate a complete multi-document transaction; use the
emulator suite for those assertions and the UI for live transaction acceptance.
Physical iPhone/Android, Safari, GPS, screen lock, installed PWA and Web Share must
be checked separately. Browser fixtures do not establish live-project success.

Reference: [Firebase rules testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

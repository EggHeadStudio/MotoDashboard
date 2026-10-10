# Local rules testing and live acceptance

## Batch 3 local verification (2026-10-10)

Run the Firestore emulator as documented below. Download the official database
emulator outside the repository and run it in a second terminal (Java 21):

```powershell
Invoke-WebRequest 'https://storage.googleapis.com/firebase-preview-drop/emulator/firebase-database-emulator-v4.11.2.jar' -OutFile "$env:TEMP\motodash-database-emulator-4.11.2.jar"
java '-Duser.language=en' -jar "$env:TEMP\motodash-database-emulator-4.11.2.jar" --host 127.0.0.1 --port 9000
```

RTDB binary: 34,495,935 bytes, MD5 2fd771101c0e1f7898c04c9204f2ce63,
matching Firebase CLI's manifest. Scripts accept only fixed localhost demo
endpoints, never a production namespace. Local fixture setup uses emulator owner
bypass, with no actual privileged credential.

```powershell
python tests/run_security_rules.py
python tests/run_group_rules.py
python tests/run_identity_rules.py
python tests/run_realtime_rules.py
```

Do not run Firestore runners simultaneously: security/group rebuild fixed demo
fixtures. Each reruns the original 102 assertions; count that baseline once for
distinct coverage. Identity reloads actual rules and clears its fixed fixtures.
RTDB intentionally tests locked reads/writes, not an enabled live ACL. Stop both
emulator terminals using Ctrl+C afterward.

Browser tests need Python Playwright/Chromium plus Pillow and zxing-cpp for
independent QR decoding. These are development tools, not app dependencies:

```powershell
python -m pip install --target "$env:TEMP\motodash-test-tools" playwright Pillow zxing-cpp
$env:PYTHONPATH="$env:TEMP\motodash-test-tools"
python -m playwright install chromium
python tests/run_browser.py
python tests/run_release_paths.py
```

Stop after any nonzero script result; PowerShell may otherwise continue after a
failure. Focused --groups-only/--clubs-only flags are for debugging. Final
regression runs the full browser runner. Package.json's legacy node --test command
was not executed (Node/npm unavailable); authored domain assertions run in the
browser. There are no imported node:test cases.

| Suite | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Original Firestore | 102 | 0 | 0 |
| Previous additional security | 137 | 0 | 0 |
| Group/Lobby/participation | 273 | 0 | 0 |
| Minimal identity projection | 16 | 0 | 0 |
| RTDB locked foundation | 68 | 0 | 0 |
| Full browser runner | 21 groups | 0 | 0 |
| Pages/static/Firebase unavailable | 2 groups | 0 | 0 |

Distinct emulator assertions: **596**, including fixture checks. RTDB includes two
positive administrative fixture checks; every application operation is deliberately
denied. Browser groups include 17 password-confirmation cases, 36 domain assertions
and six Group integration groups. Pages: 162 references and 56 distinct local URLs
HTTP 200 below /MotoDashboard/.

Earlier test failures were corrected and the complete runner rerun: disabled
FormData capture, option synchronization, localized nested owner label, startup
readiness, mock cursor/limit ordering and current Club-role UI checks. Permission
expectations were not weakened. QR round-trip decoding and invite error cases,
bounded Lobby/roster/organizing-Club pagination and demoted Host controls pass.

Untested/blocked: allowed live-location operations, live markers, trusted
revocation/presence/reconnection races, separation/regroup and background tracking.
These are not skipped runnable tests: those implementations remain blocked, with
RTDB deny-all. Production rules/indexes/domains/inventory, two-account live security,
real-camera scanning and two-phone behavior remain unverified. See the current
Batch 3 section of ../DEPLOYMENT_CHECKLIST.md for operator instructions.

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
python tests/run_security_rules.py
```

The script reloads current rules and clears **only** the fixed local demo database.
Never substitute a production endpoint. Stop the emulator with Ctrl+C afterward.
Tests include valid founder creation, coupled membership/index/count changes,
approval/invite joining, private reads, Owner/Admin/Host/Member boundaries,
rank-without-rights, immutable route chunks, delete fences and unauthorized writes.

The additional runner reruns the baseline itself to rebuild known fixtures, then
collects its own security expectations and exits nonzero on any failure. It includes
the four failed release-review assertions: safe public metadata has no UID ledger;
an unrelated founder cannot read old Wall data; stale invitations cannot expose
the retired Club; stale invitations cannot admit membership. Additional cases cover
canonical confidentiality, exact page fields, synchronized privacy/count mutations,
irreversible retirement, forbidden hard deletion/recreation/reactivation, denied
retained private children and positive legitimate operations. Fixture setup/inspection
is excluded from its additional result count. All endpoints remain fixed localhost.

Run `python tests/run_browser.py` with Playwright/Chromium, then
`python tests/run_release_paths.py` to check asset/import paths under
`/MotoDashboard/`, scoped worker cleanup and guest recording with Firebase blocked.
SDK product fixtures do not enforce rules. Real authorization checks use the emulator.

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
   still fail. Test safe links/colors/plain wall, archive and permanent retirement.
   Public/unlisted nonmembers read only `clubPages/id`, never canonical `clubs/id`.
   Archive a disposable owner-only Club, retain its Wall/invite, then retire it:
   every client must be denied those children, the Owner cannot reactivate or remove
   its canonical reservation, and old invitees cannot read/join. A newly created
   Club has a fresh UUID and does not inherit any records. Physical operator erasure
   must preserve the reservation. Existing data must first pass deployment gate B6.
8. Attempt adding systemAdmin to own profile and writing systemAdmins, unknown
   collections and RTDB paths: all must fail. Retain RTDB lock for this batch.

Rules Playground cannot simulate a complete multi-document transaction; use the
emulator suite for those assertions and the UI for live transaction acceptance.
Physical iPhone/Android, Safari, GPS, screen lock, installed PWA and Web Share must
be checked separately. Browser fixtures do not establish live-project success.

Reference: [Firebase rules testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

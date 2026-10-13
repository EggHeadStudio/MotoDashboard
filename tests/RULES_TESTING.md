# MotoDashboard security and regression tests

Updated 2026-10-13 after local Batch 6A. The operator reports deployed Rules/all 18 Enabled indexes,
Batch 5 and the Cloudflare Worker. Real-account/phone acceptance is pending.
Current operator procedure: [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md).

## Isolation and coverage

These tests use fixed localhost demo emulators, never production motodash-87bf8.
Emulator-only unsigned identities and fixture owner bypass need no real credential.
Keep endpoints/project/namespace fixed. Run Firestore suites sequentially because
they rebuild shared fixtures. Count the repeated baseline once.

| Suite | Distinct assertions/cases |
| --- | ---: |
| Shared baseline | 102 |
| Additional Club confidentiality/retired-ID security | 137 |
| Group admission/Lobby/roles | 273 |
| Minimal display identity | 32 |
| Batch 5 authorization/query/index-source | 82 |
| Batch 6A Open/expiry/source-proven notifications | 79 |
| Total distinct Firestore | 705 |
| Separate locked RTDB | 68 |
| Deployment contract | 10 |

RTDB is deny-all and unused. Old fixture paths test intentional denial, not a live
RTDB implementation. Cloudflare provides actual live transport. Keep this negative
coverage and database.rules.json. Emulators do not certify production indexes.

## Existing-tool local execution

Developers with existing Python/Java 21 and cached binaries may run:

```powershell
java -jar "$env:TEMP\motodash-firestore-emulator-1.20.2.jar" --host 127.0.0.1 --port 8185 --project_id demo-motodash --rules firestore.rules
```

In a second terminal at the repository root, run sequentially:

```text
python tests/run_security_rules.py
python tests/run_group_rules.py
python tests/run_identity_rules.py
python tests/run_batch5_rules.py
python tests/run_batch6a_rules.py
```

Security/group runners already rebuild the baseline. For the separate RTDB lock:

```powershell
java '-Duser.language=en' -jar "$env:TEMP\motodash-database-emulator-4.11.2.jar" --host 127.0.0.1 --port 9000 --single_project_mode Error
python tests/run_realtime_rules.py
```

Stop only the local emulators you started. No production purge is needed.
The operator needs no local Node/npm/Firebase CLI for deployment: GitHub runners
install tools. Reuse existing development tools on a restricted workstation.

## Browser, Worker and deployment checks

Browser regression needs existing Playwright/Chromium and ZXing/Pillow for QR
decoding. Include existing tool-cache paths on PYTHONPATH; a missing decoder is an
environment failure, not permission to skip QR coverage.

```text
python tests/run_browser.py
python tests/run_release_paths.py
python tools/validate_firebase_deployment.py
python tests/run_firebase_deployment_contract.py
```

Browser tests use fixture data/simulated GPS, real Leaflet and real pinned Firebase
imports with cloud APIs blocked. SDK fixtures do not enforce Rules. The full run
covers 24 existing regression groups, 20 named Batch 5 and 13 named Batch 6A cases; nested domain/
registration cases are not added again. Pages tests use /MotoDashboard/.

Worker developers with Node 22 and installed cloudflare lockfile dependencies run
npm test at root (delegates to npm --prefix cloudflare test), or npm test inside
cloudflare/. Both build with Wrangler --dry-run before 50 checks, including 13
local workerd cases using mocked Firebase/OAuth. OpenSSL creates fixture keys only
outside the repository. Raw node --test without a build is not the supported path.

The Firebase workflow runs config/contract and all five Firestore suites before
explicit deployment. Validate mode performs no production operation. YAML/Bash/
credential/scope historical results are recorded in REPOSITORY_AUDIT.md; current
Batch 6A results are in BATCH_6A_RESULT.md.

## Pending live acceptance and history

Use the current checklist for two-account private-data/role/retirement/invitation
tests, actual production queries and two-phone Cloudflare checks. Some role matrices
need a third account: record unavailable paths NOT RUN. Rules Playground cannot
replace multi-document emulator assertions. Physical GPS/suspension/QR/Web Share
and effective revocation must be recorded separately. No bundled credentials exist.

Previous detailed reproductions/counts/probes are preserved in
[historical test notes](../docs/history/pre-batch6/RULES_TESTING.md). Their old rollout/
RTDB-blocker instructions are retired, with security expectations retained.
[Firebase emulator testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

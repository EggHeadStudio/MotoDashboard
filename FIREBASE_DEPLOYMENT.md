# Prototype Firebase deployment from main

The application and deployment workflow use **main**. The frontend uses the existing
GitHub Pages workflow; Firebase uses a separate **manual** workflow. All Node.js,
Firebase CLI and emulator tools run on GitHub-hosted runners. No local installation
or additional branch is needed.

This guide replaces the earlier firebase-deployment-setup branch registration and
WIF/environment procedure for the current prototype. The existing deployment branch
can remain as historical work; it is not part of this procedure.

## 1. Configure a dedicated deployment account in Google Cloud

Open [Google Cloud Console](https://console.cloud.google.com/?project=motodash-87bf8)
with the Google account managing **motodash-87bf8**, then:

1. Select project **motodash-87bf8**. Verify the Firestore **(default)** database
   already exists. Firebase Console -> Firestore currently has only the sessions
   composite index; the repository contains all **18** required definitions.
2. APIs & Services -> Enabled APIs & services: verify these APIs are enabled. Enable
   a missing one through Library using your project administrator account:
   Cloud Firestore (`firestore.googleapis.com`), Firebase Rules
   (`firebaserules.googleapis.com`), Firebase Management (`firebase.googleapis.com`),
   Cloud Resource Manager (`cloudresourcemanager.googleapis.com`), Service Usage
   (`serviceusage.googleapis.com`) and IAM (`iam.googleapis.com`). The deployment
   account cannot enable APIs or create a database.
3. IAM & Admin -> Roles -> **Create role**. Title **MotoDash Firestore Deployment**,
   ID **MotoDashFirestoreDeployer**, stage **General Availability**. Use Add permissions
   to add exactly the 19 permissions listed in
   [firebase-deployer-role.json](firebase-deployer-role.json). Save the role. If this
   custom role already exists, verify its permissions match the file.
4. IAM & Admin -> Service Accounts -> **Create service account**, ID
   **motodash-firebase-deployer**. Assign only the custom **MotoDash Firestore
   Deployment** role to this account. Its email must be
   **motodash-firebase-deployer@motodash-87bf8.iam.gserviceaccount.com**. If it already
   exists, verify this role binding. Do not assign Owner, Editor or document-data roles.
5. Open that account -> **Keys** -> **Add key** -> **Create new key** -> **JSON**.
   Download the key for this dedicated account. The existing Cloudflare service-account
   key is unrelated and must stay only in the Worker's encrypted secret.

The custom role permits Rules and index configuration plus necessary metadata access.
It contains no application-document read/write/delete, Auth administration, Hosting,
RTDB or IAM-policy editing permissions. Its index-delete permission is required by
the pinned CLI precheck; the workflow omits `--force` and preserves extra indexes.
Rules IAM permissions are project-wide configuration permissions: protect this key
and do not reuse the account for other applications.

If your organization prohibits JSON-key creation, ask the Google project administrator
for an approved authentication route; keep its policy intact. The Console role/account
steps require Google project privileges, not Windows administrator rights.

## 2. Add one GitHub repository secret

Open GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** ->
**New repository secret**:

- Name: **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON**
- Value: the **entire downloaded JSON** for the dedicated deployment account above.

Save it. No Actions variables, WIF pool or deployment environment is required by this
workflow. Keep the downloaded file outside the repository; never paste it into source,
workflow YAML, issues or logs. The workflow verifies its project/account and uses the
official Google authentication action without printing the key. Generated credentials
are ignored and cleaned up by the action. Firebase web config remains public web config.

Rotate the key at least every 90 days as the prototype's policy and immediately after
suspected exposure: create a replacement on the same account, replace this GitHub
secret, verify a reviewed run, then delete the old key in Google Cloud and remove old
private copies. After a one-off deployment, you may delete the key and repository
secret if further deployment is not needed.

## 3. Publish main when you choose to

The prepared changes are committed locally. From the repository terminal:

```powershell
git switch main
git push origin main
```

This publishes Batch 5 and the Firebase setup together. The existing **Deploy to
GitHub Pages** workflow runs on this main push and publishes the frontend. Keep that
workflow enabled; Settings -> Pages -> Source should be **GitHub Actions**.
The Firebase workflow is **workflow_dispatch only** and does not run on the push.
Cloudflare stays as deployed.

Once the workflow is on main, GitHub's default branch, Actions displays its manual
Run workflow control. No registration branch or workflow-only PR is needed. See
[GitHub manual workflow instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

The frontend may publish before the operator runs Firebase deployment. Cloud features
can show permission/index errors until current Rules are published and all required
indexes finish building; refresh and retest after the backend is ready. This sequence
does not certify the reported invitation/Lobby error as fixed.

## 4. Deploy manually with validation included

1. Before the production run, Firebase Console -> **motodash-87bf8** -> Firestore ->
   **Rules**: privately save the current published Rules and date for rollback. Review
   the main commit SHA and the complete current Rules and index source files.
2. GitHub -> **Actions** -> **Validate or deploy MotoDash Firestore** -> **Run workflow**.
   Select branch **main**, operation **deploy**, confirmation exactly
   **motodash-87bf8**, and leave scope **rules-and-indexes**. Clicking Run workflow with these
   inputs is the explicit production confirmation. Validation runs first.
3. The validation job checks all 18 composites and the `routeChunks.pointsJson`
   exemption, runs the contract tests and compiles/tests Rules with project
   **demo-motodash** on the runner. It uses no production secret. A failed validation
   prevents deployment. These tests do not verify production index availability.
4. After validation passes, the deploy job checks out the same immutable run SHA,
   obtains the dedicated account credentials and runs only:

   ```text
   firebase deploy --project motodash-87bf8 --config firebase.deploy.json --only firestore:rules,firestore:indexes --non-interactive
   ```

For an optional dry check, select operation **validate** with blank confirmation:
only local checks run and deployment is skipped. A separate validation-only run is
not required before deploy because every deploy runs those checks first.

The target project and database are fixed. Firebase Hosting, Authentication, Realtime
Database and Cloudflare are outside the deployment config/command. There is no
push/PR/scheduled trigger or automatic deployment. A combined failure can occur after
Rules publication: inspect both Rules and Indexes before retrying.

## 5. Verify and roll back safely if needed

- Firebase Console -> Firestore -> **Rules**: compare the complete published source
  with `firestore.rules` at the run SHA.
- Firestore -> **Indexes** -> Composite: wait until **every one of the 18 definitions**
  in `firestore.indexes.json` is **Enabled**. Compare fields, directions and Collection
  scope with the exact Batch 5 table in [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).
  Seventeen new definitions may initially show Building; successful submission is not
  readiness. Single field: verify **routeChunks.pointsJson** has indexes disabled and
  required discovery/name fields retain their automatic indexes.
- Check the Pages run succeeded, open **https://eggheadstudio.github.io/MotoDashboard/**,
  refresh and perform the existing two-account and phone acceptance checklist. Live
  Firebase/phone results remain pending until the operator actually performs them.
- For Rules rollback, choose only a known secure, schema-compatible source. Restore
  that Rules file in a reviewed main commit, keep current index definitions, push main,
  run validate, then explicitly run deploy with scope **rules-only** and the same
  confirmation. Security tests must pass. Alternatively review/publish a safe source
  through Firestore Console Rules history and reconcile it to the repository.
  Keep existing indexes and all private-data protections.

IAM or API errors must be resolved using the specific missing permission/API rather
than broadening the account to Owner/Editor or weakening Rules. The first actual
GitHub runner authentication/deployment is still unverified.

Implementation references: [official Google authentication action](https://github.com/google-github-actions/auth),
[Firebase selective deployment](https://firebase.google.com/docs/cli#deploy_specific_firebase_services).

Local preparation checks: 626 distinct Firestore emulator assertions and 10
deployment-contract cases passed, 0 failed/skipped; YAML and 11 Bash blocks parsed,
all 6 action uses are SHA-pinned; 7 confirmation/scope and 8 credential-identity
checks passed. The Pages test checked 218 references and 69 local URLs under
/MotoDashboard/, including guest recording/history when Firebase is unavailable.
The Rules/indexes and frontend/Pages/Cloudflare files are unchanged from Batch 5.
No private-key/service-account JSON material was found in repository files. Hosted
runner authentication, deployment and real Firebase/phone acceptance remain unperformed.

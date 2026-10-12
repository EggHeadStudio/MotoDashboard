> **Retired branch procedure; do not follow these commands.** Main now contains the simpler manual workflow. This unique branch document is preserved as history before recommending branch deletion. Current instructions: [FIREBASE_DEPLOYMENT.md](../../../FIREBASE_DEPLOYMENT.md).

# Firebase deployment branch: publish and run safely

This guide covers only Firestore Rules and Indexes for **motodash-87bf8**, database
**(default)**. Publishing a branch, registering an Actions workflow and deploying
Firebase are three separate actions. None has been performed by this preparation.

## Branch contents and isolation

`firebase-deployment-setup` starts from **4c3def5**, the remote main revision verified
on 2026-10-12. Local main keeps the unpublished Batch 5 commits **613b5dc**,
**ef5ebe1** and **bb97402**. Those commits are not ancestors of the deployment branch.

The branch adds the manual Firebase workflow, isolated deployment config, custom IAM
role definition, validators and instructions. It also copies the previously reviewed
current `firestore.rules`, `firestore.indexes.json` and standalone
`tests/run_batch5_rules.py` from local main. Relative to the baseline, these backend
changes add the registered-recipient invitation guard and 18th composite Club index.
The validator requires all 18 indexes and the `routeChunks.pointsJson` exemption.
Frontend files, Worker source and existing Pages/Cloudflare workflows stay identical
to the baseline. No private service-account key is included.

The prior uncommitted Firebase preparation on local main was preserved in a named
Git stash: **Preserve Firebase preparation from local Batch 5 main before isolated
deployment branch**. It is a recovery copy, not a deployment prerequisite. Avoid
applying it blindly: its older workflow trusted main rather than this dedicated branch.
Local Batch 5 commits remain available by switching back to main after finishing.

Local branch verification on 2026-10-12: **626 distinct Firestore emulator assertions**
and **10 deployment-contract cases passed**, with **0 failed and 0 skipped**.
Workflow YAML parsed, all 12 Bash blocks passed syntax checks and all 7 action uses
are pinned by commit SHA. Checks confirmed branch isolation, the exact 18-index
inventory and absence of private-key/service-account JSON material in repository
files. GitHub registration, hosted-runner execution, Google authentication and all
production tests remain **unperformed**.

## Publish only this branch when approved

From the repository terminal:

```powershell
git switch firebase-deployment-setup
git status --short
git log -1 --oneline
git push --set-upstream origin firebase-deployment-setup
```

Expect a clean working tree before the push. Do not push main, use `git push --all`,
force-push or merge Batch 5 to make this workflow available. Publishing this branch
does not start Firebase deployment. The existing Pages workflow listens to main
pushes; the Firebase and Cloudflare workflows require manual dispatch.

## Register manual triggering without publishing Batch 5

GitHub requires a `workflow_dispatch` workflow file to exist on the **default branch**
before manual triggering is available. Pushing only this non-default branch is not
enough; REST/CLI dispatch cannot bypass the registration requirement. After
registration, the browser's Run workflow branch selector can run the version on
**firebase-deployment-setup**. See [GitHub's manual workflow instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

Perform these browser steps only when approved:

1. Confirm repository Settings -> General -> Default branch remains **main**.
2. Actions -> **Deploy to GitHub Pages** -> three-dot menu -> **Disable workflow**.
   Verify disabled status. Check for and cancel any existing queued/running Pages run
   before the registration commit. Its main-push trigger would otherwise redeploy
   the existing frontend even for a workflow-only commit.
3. On the published **firebase-deployment-setup** branch open
   `.github/workflows/deploy-firebase.yml`, click Raw and copy the complete text.
4. In the repository browser switch to **remote main**, choose Add file -> Create
   new file. Name it exactly **.github/workflows/deploy-firebase.yml** and paste the
   copied text. Use Commit changes -> **Create a new branch for this commit and
   start a pull request** (for example, `register-firebase-workflow`).
5. Review that PR's Files changed. It must contain **one file only**:
   `.github/workflows/deploy-firebase.yml`. Verify no frontend, rules, indexes,
   service-account JSON or other workflow files appear. Merge this one-file PR
   after approval. Do not merge the local main history or the entire deployment branch.
6. Confirm remote main contains that workflow and the frontend files are unchanged.
   Leave Pages disabled until frontend deployment receives its own approval.

The workflow copy on main is for registration: both jobs require
`refs/heads/firebase-deployment-setup`. Selecting main or another branch skips the
jobs. The deployment branch provides all scripts and sources checked out by immutable
run SHA. No scripts need to be copied to main for registration.

If GitHub already has this exact workflow registered on main, verify its branch
restrictions and skip creating a duplicate file. If controls are missing, check
repository write access, Actions policy and workflow enabled status. Keep the default
branch and security restrictions unchanged.

## First run: validate without production credentials

1. Actions -> **Validate or deploy MotoDash Firestore** -> **Run workflow**.
2. Select branch **firebase-deployment-setup** explicitly; the default dropdown may
   initially show main, which intentionally skips both jobs.
3. Set operation **validate**, auth_method **wif**, scope **rules-and-indexes** and
   leave confirmation blank. Click Run workflow.
4. Verify the run SHA is the reviewed branch commit. The validate job must pass the
   exact config/index checks, deployment-contract cases and all emulator suites.
   The deploy job must be **skipped**. The demo emulator is local to the runner and
   does not verify production index availability or live Firebase authorization.

## Production configuration and later explicit deployment

Follow sections B-E of the latest Firebase Actions section in
[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md). Configure:

- GitHub environment **firebase-production**, permitting only branch
  **firebase-deployment-setup**, with a required reviewer when available.
- Dedicated service account
  **motodash-firebase-deployer@motodash-87bf8.iam.gserviceaccount.com**, assigned
  only the custom role in **firebase-deployer-role.json**; verify the documented APIs.
- Preferred WIF provider conditions requiring this repository's numeric IDs,
  `refs/heads/firebase-deployment-setup`, this workflow's exact branch-qualified
  `workflow_ref`, `workflow_dispatch` and the **firebase-production** environment
  subject. Main must not be trusted as a deployment branch.
- Environment variable **GCP_WORKLOAD_IDENTITY_PROVIDER**:
  `projects/349373433221/locations/global/workloadIdentityPools/motodash-github/providers/github`.
  The preferred WIF setup needs **no GitHub Secrets**.
- Only if choosing the documented key fallback: environment secret
  **FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON**, from the new dedicated deployment
  account. Never reuse the Cloudflare service account. Keep its private key out of
  repository files and workflow text; follow the checklist's rotation procedure.

After validation, configuration review and explicit deployment approval, use the same
Run workflow controls: branch **firebase-deployment-setup**, operation **deploy**,
confirmation **motodash-87bf8**, chosen auth method and scope **rules-and-indexes**.
Review the SHA and approve the environment gate if configured. Only Firestore Rules
and Indexes are targeted; no Firebase Hosting/Auth/RTDB or Cloudflare deployment occurs.

Verify published Rules match the reviewed run source and **all 18 composite indexes**
are **Enabled**, plus the single-field exemption. Production and two-account tests
remain pending until the operator actually performs them. A failed combined deploy
may have already published Rules: inspect both Console panels before retrying.

For a safe versioned Rules rollback, commit only a reviewed secure, schema-compatible
Rules change on **firebase-deployment-setup**, publish that branch, validate and run
the separately approved deploy with scope **rules-only**. Preserve indexes and all
security regression gates. Consult checklist section H for the Console alternative.

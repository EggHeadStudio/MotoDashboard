> **Batch 8 local implementation:** existing motodash-live now serves private R2
> media through MEDIA_BUCKET/motodash-media and serialized MediaState/v3, preserving
> LIVE_ROOMS/v1, LIVE_IDENTITIES/v2 and origin/Firebase checks. Media metadata is a
> private Firestore mirror; use the separate encrypted MEDIA_SERVICE_ACCOUNT and
> cloudflare/media-writer-role.json permissions, never the read-only live key.
> No real bucket/credential/deployment was created. Exact provisioning, rates/quotas,
> cleanup/retention, IAM risks, costs and rollback:
> [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md),
> [BATCH_8_RESULT.md](../BATCH_8_RESULT.md). No frontend build or public R2 URL.

# MotoDash live gateway

Separate server-side Worker project. The GitHub Pages frontend needs no npm/build.
Use Node 22 or newer only for this development tooling. From this directory:
`npm ci`, `npm test`, `npm run check` (local bundle dry-run), `npm run dev`.
Deployment is manual and requires separate approval. Never store secrets in tracked
files. Operator configuration and secure setup: [../CLOUDFLARE_SETUP.md](../CLOUDFLARE_SETUP.md).

`npm test` includes bundling and 98 checks (19 actual local Miniflare/workerd
integration cases; media fault/quota fixtures are separate); signed Firebase fixtures and Firestore/OAuth replies are
mocked. OpenSSL is required for temporary fixture keys (Git for Windows includes
it). No production credential is used. `node tools/estimate-cost.js` reproduces
UTF-8 fixture sizes and the documented workload/billing estimate. Pricing and
CPU/duration observations in production still require operator verification.

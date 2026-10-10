# MotoDash live gateway

Separate server-side Worker project. The GitHub Pages frontend needs no npm/build.
Use Node 22 or newer only for this development tooling. From this directory:
`npm ci`, `npm test`, `npm run check` (local bundle dry-run), `npm run dev`.
Deployment is manual and requires separate approval. Never store secrets in tracked
files. Operator configuration and secure setup: [../CLOUDFLARE_SETUP.md](../CLOUDFLARE_SETUP.md).

`npm test` includes bundling and 47 checks (12 actual local Miniflare/workerd
integration cases); signed Firebase fixtures and Firestore/OAuth replies are
mocked. OpenSSL is required for temporary fixture keys (Git for Windows includes
it). No production credential is used. `node tools/estimate-cost.js` reproduces
UTF-8 fixture sizes and the documented workload/billing estimate. Pricing and
CPU/duration observations in production still require operator verification.

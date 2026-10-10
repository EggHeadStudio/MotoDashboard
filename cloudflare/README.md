# MotoDash live gateway

Separate server-side Worker project. The GitHub Pages frontend needs no npm/build.
Use Node 22 or newer only for this development tooling. From this directory:
`npm ci`, `npm test`, `npm run check` (local bundle dry-run), `npm run dev`.
Deployment is manual and requires separate approval. Never store secrets in tracked
files. Operator configuration and secure setup will be in ../CLOUDFLARE_SETUP.md.

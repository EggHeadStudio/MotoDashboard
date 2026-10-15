# Batch 8.5 — local implementation record

Baseline: `b48e3c8`, clean `main` matching `origin/main`, 2026-10-15.
The operator reports Batch 8 deployed. Production consoles and phone acceptance
have not been independently inspected. No production operation is authorized.

## Milestone 0 — audit and implementation plan

| Surface | Finding and reuse |
| --- | --- |
| Home | Start/Resume, separate Garage button, latest three admitted Groups and Clubs. Vehicle selection is too far away. No general riding identity or tentative attendance. Reuse Garage state, shared GPS/recording and existing Group links. |
| Discover | Safe paged Club/Lobby/People projections; preserve privacy, invitation routes and bounded queries. Filters already use disclosures. |
| Rides | Private local/cloud history, separate saved viewer/replay and Group panel. Keep recording ownership and live consent independent. |
| Clubs | Owner general editor exists, but branding/media, rank CRUD, member role forms and admission controls share the content page. Split authorized management from readable members/Wall/upcoming content. |
| Profile/public profiles | Own Profile is mostly content; existing public-profile settings is an editor. Add cancellation/dirty guards. Public visitor pages must never acquire editors. |
| Garage/showcase | Every vehicle has up to eight management buttons plus media disclosure. Keep Choose in View; move default/showcase/delete/media to explicit editing. Preserve source/privacy gates and historical vehicle snapshots. |
| Groups/Meets/Events | One shared implementation with lifecycle/admission/participants and banner editor. Reuse it; separate content, editing and ordinary joining. RSVP must be separate from participants. |
| Notifications | Private source-proven invitation/approval listeners already exist; reuse their current state for Home instead of adding polling/fan-out. |
| Dashboard/live | One accepted GPS pipeline, one exclusive recorder/live claim, scoped state listener and Leaflet markers. Existing Group Club identity is a name/rank snapshot tied to organizing Club, not a general next-ride identity. |
| Saved/replay | Independent collapsible controls, timestamp/gap-aware replay, red route/gold progress. Preserve read-only lifecycle and exports. |
| R2/ranks | Correct private resource/slot references exist. Renderer always prepends built-in SVG; generic CSS puts it above uploaded image. Fix image load precedence and restore fallback on failure/removal. |
| Themes | Safe preset enums already exist. Club routeColor still accepts raw HEX text. Use accessible visual controls and retain legacy stored values. |
| Club activity/statistics | No existing attribution ledger/aggregator. Do not infer consent from membership/identity or implement browser-controlled counters. Require source-proven authorization, deletion/revocation handling and bounded trusted aggregation; document any unsafe dependency rather than weaken rules. |

Plan: (1) shared guarded View/Edit UI; (2) navigation/mobile hierarchy; (3) rank
rendering; (4) accessible palettes; (5–6) compact Home launch plus locked personal/
eligible Club identity and safe markers; (7–8) bounded Home invitations/upcoming and
independent RSVP with emulator coverage; (9–11) explicit, privacy-enforced Club
activity/aggregation only where secure dependencies are satisfied; (12–13) complete
UX/security/runtime regression, documentation and deployment/phone instructions.
Each logical milestone receives tests and a local commit. Static Pages, existing
Auth/Firestore, private R2, Worker live protocol, RTDB lock and all future product
requirements remain. No new framework, frontend build or paid service activation.

## Execution results

M1: shared authorized View/Edit controls hide media, branding, rank/role and vehicle
management in default content views. Existing per-section saves remain explicit;
Cancel/closing warns for unsaved fields. Media editors use unique IDs when several
rank editors coexist. Two focused Chromium checks pass (320px and EN/FI parity).
Existing regression fixtures now enter the actual Edit controls; no forced hidden
clicks or permission assertions are removed. Full regression is repeated at M13.

M2: shared navigation checks unsaved changes before switching panels; modal close
accepts a confirmed discard, preventing repeat prompts. Consistent sticky Edit bar,
touch targets, safe-area padding, wrapping and reduced-motion styles reuse the
current design system. Two focused checks and all eight Batch 8 browser groups pass.

M3: confirmed SVG stacking above uploaded rank image; a successfully decoded custom
image now hides the built-in icon, and failed/removed/replaced images restore it.
Resource refresh clears stale presentation classes and URLs. Three focused browser
groups pass including custom-image precedence, replacement, deletion and 403 fallback.
Existing Worker rank authorization/image upload tests are retained for M13.

M4: accessible named palette buttons augment controlled theme presets across all
shared media editors; Club colors/optional route color use native visual selection,
preview, reset and black/white contrast selection instead of raw HEX entry. Existing
values and strict backend validation remain. Theme Cancel restores the saved values.
Four focused browser groups and the eight existing media groups pass.

M5: Home now selects from the already-loaded Garage, renders the chosen cover/
category, and offers bounded existing Groups through their authorized detail flow.
Personal Start does not create/admit a Group or enable sharing. Active recording
locks the selector. Five focused checks pass including switching, no new sharing/
Group creation and 320px overflow. No additional Home Firestore queries were added.

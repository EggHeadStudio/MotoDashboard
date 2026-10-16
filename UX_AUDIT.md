# MotoDash Batch 8.6 - rendered UX audit

2026-10-16. Baseline **5c46455 / 1.6.5-batch8.5**, clean main matching
origin/main. The operator reports 8.5 deployed; device/Console acceptance is not
independently certified. This is the M0 audit, completed before redesign changes.

## Method and safe evidence

Actual Chromium rendering, screenshots and fixture interactions, not source-only
visual claims. Read-only public landing reference captured from
https://eggheadstudio.github.io/MotoDashboard/ with cloud APIs/mutations blocked.
No production sign-in or data mutation. Authenticated screens use disposable local
SDK fixtures, synthetic rides and names; no real passwords, emails, tokens, routes
or private Club data are committed. Map tiles/weather/media/Club log responses are
fixtures; visual review of a fixture map is a HUD/layout review, not live-map quality.

Evidence lives outside the repository at **%TEMP%/motodash-ux86/before/**.
The reproducible capture runner is tests/visual86_capture.py, invoked by
`python tests/run_browser.py --visual86`; existing development dependencies are
required. No frontend build/runtime dependency. The manifest records actual
screen, language, viewport, overflow and file. Screenshots are local evidence,
not deployed product content. Blank/error image states are deliberately included.

Sizes: **320x568, 390x844, 430x932, 844x390 landscape, 768x1024 tablet,
1440x1000 desktop**, each English and Finnish. Files follow
`{screen}-{en|fi}-{width}x{height}.png`. Initial matrix: 18 screens x12 =216
cases, plus focused People, Meet/Event and expanded Club log evidence. The
manifest is the exact inventory. Native Safari/physical devices are NOT RUN.

## Findings and planned corrections

Each row has screenshots at all six sizes/both languages unless noted. P1 affects
an important journey, P2 is coherence/discoverability, P3 is polish. These are
observed baseline findings, not claims of production authorization defects.

| Screen / evidence prefix | Priority | Observed problem | Correction / user benefit |
| --- | --- | --- | --- |
| production-landing-en-390x844 | P2 | Honest landing, but long repeated explanatory blocks and oversized spacing; registration is clear | Retain genuine content/art; refine type/spacing and CTA hierarchy |
| landing / register | P2 | Auth is a dense utility dialog with long hints before the action | Shared dialog/header, clearer form grouping and validation; preserve password/security requirements |
| home | P1 | Road illustration leaves 100px blank above stacked options. At 390px Start is below the first viewport; 320px shows only one selector. Same vehicle repeated below | Compact visual launch card, primary Start before optional contribution controls; preserve existing selector IDs/data and no auto-sharing |
| discover / discover-people | P1 | Five destinations wrap 4+1 or3+2; duplicate Discover/Find your people titles, permanent Up to date message and filters separate results from intent | Single purpose heading, deliberate five-destination navigation, clear search/paged results and quiet status |
| rides | P2 | Group launch and history lack a useful hierarchy; empty history is an unstructured status | Primary Group action, readable recorded-ride cards and honest empty state |
| clubs | P2 | Create/Refresh/link lookup precede membership content; cards feel like administration | Separate toolbar, compact lookup disclosure and community cards |
| profile | P1 | Name/avatar float in a large blank region; bio/public state absent although available. Edit and Account look unrelated | Actual own bio/privacy and a composed identity hero; clear Edit/Garage actions with no new privacy publication |
| public-profile | P2 | Existing source-safe showcase works, but media/hero/card rhythm varies from own profile | Shared hero/vehicle/card hierarchy; preserve private/absent-media fallbacks |
| garage / garage-edit | P1 | Add/Refresh/visitor links all compete; editing becomes an undifferentiated stack of buttons; vehicle cards have weak selected/privacy hierarchy | Collection layout, distinct create/Choose actions, selected/featured/private states and grouped management |
| club-detail / club-edit | P1 | Back/Refresh/Up to date/Edit dominate above hero; Wall precedes membership/upcoming; members/log are distant | Content section navigation, hero/relationship first, upcoming/members/log/Wall scan order; permission-gated editors retained |
| club-activity | P2 | Visible-only totals and conservative corrections need interpretation; nested disclosure is hard to find | Direct section jump opens existing lazy disclosure only on request; readable grouped statistics and retained privacy caveat |
| group-detail / meet-detail / event-detail | P1 | Large decorative placeholder plus policy/capacity paragraphs place actual RSVP/Join below fold | One shared compact detail hero with date/approximate area/organizer and section jumps; RSVP and admission stay separate |
| group-edit / profile-edit | P1 | Long flat form; Save far away; live previews/media/appearance have no consistent section entry | Named editor sections, clear section Save/Cancel, sticky mode controls and scroll/focus to invalid fields |
| notifications | P2 | Generic empty/status controls and tight repeated buttons | Compact notification rows, honest empty state and current source-checked links; no listener added |
| dashboard | P1 | Existing correct GPS/map geometry, but yellow glowing speed and dense dark status/control blocks compete with map | Restrained high-contrast surface/type, tidy HUD targets and optional secondary tools; no watcher/smoothing/consent changes |
| saved-replay | P1 | Details can obscure upper route and timeline controls wrap into a tall block | Tighter header/stat grid and playback hierarchy; retain independent collapse, gaps, timing, route colors and no live telemetry |
| all / especially Finnish320 | P1 | Long translations wrap inconsistent toolbars; fonts/spacing/radii differ by component, technical management language leaks into content | Shared type/space/surface/motion tokens, wrapping targets, localized plain labels; preserve full functionality |

## Twelve journey evaluations

These are rendered fixture walkthroughs plus repository/test review; final full
regression and physical phone acceptance are separate milestones.

| Journey | Friction / expected correction | Boundary to retain |
| --- | --- | --- |
| Visitor -> Register -> Home | Clear entry, crowded dialog; compose sections and feedback | Real Auth errors/confirmation, no invented account success |
| Home -> vehicle -> Start | Too much scrolling before Start; place compact selectors by action | One recorder/GPS, no Group creation |
| Home -> Club identity -> Start | Identity and contribution read like one form | Current membership check, locked identity, contribution off/separate |
| Discover -> Club -> Join | Category/tabs/filters have conflicting hierarchy; join far below hero | Source-checked open/approval/private policies |
| Discover -> user -> public Garage | People wraps to second row; showcase is distant | Bounded prefix search, explicit showcase/privacy opt-in |
| Discover -> event -> RSVP | Dense hero delays intent buttons | RSVP does not admit/live-share |
| Invitation -> Group -> Join | Generic repeated Open/Close labels and deep panels | Auth return/current invitation/approval authority |
| Dashboard -> away -> Return | Return works; control set is visually crowded | Existing active ride context/exclusive live claim |
| Profile -> photo/theme -> Save | Long editor mixes general/photo/appearance | Dirty guards, crop/preview, explicit photo publication |
| Club -> logo/banner/ranks -> Save | Management is hidden correctly but unstructured once open | Technical server roles; custom graphic never grants powers |
| Finish -> History -> Replay | Existing separate read-only view good; map controls need compact hierarchy | Timestamp/gaps/exports, no live GPS or network telemetry |
| Club -> Activity Log -> Statistics | Far down page, nested disclosure and caveats | Lazy request, audience-scoped trusted aggregates, epoch invalidation |

## Implementation sequence after this audit

1. M1 shared premium type/spacing/surfaces, buttons/cards/forms/dialogs/status and
   reduced-motion/focus tokens, reusing system fonts and original line icons.
2. M2 compact Home launch and genuine current identity/vehicle/upcoming/invitation.
3. M3 deliberate Discover destinations/search/cards, preserve bounded pagination.
4. M4 social own/public profile and vehicle collection, real private/public state.
5. M5 Club content hierarchy and reusable authorized section navigation.
6. M6 shared Ride/Meet/Event hero and RSVP/admission clarity.
7. M7 modern grouped editor sections, errors, cancellation/focus and media labels.
8. M8 minimal dashboard presentation; GPS/recording/live modules remain intact.
9. M9 saved viewer/replay presentation; preserve map and read-only timing.
10. M10 navigation/focus/keyboard/text scaling/loading/offline/accessibility pass.
11. M11 repeat the same rendered matrix; inspect before/after and perform another
    correction pass based on screenshots, not test counts alone.
12. M12 full emulator/Worker/R2/browser/Pages/localization/workflow checks and
    exact results/commits/hand-off, then stop. No push/deployment/production writes.

Architecture decisions: native static ES modules, no new framework/font dependency/
backend collection/listener/polling, no database schema/Rules or Worker/R2 protocol
change intended. Shared presentation reads only already-loaded models. No invented
popularity, content, metrics, imagery or entitlements. Final global logo/typeface,
all agreed account/commercial/Official/NFC/merchandise work stays in IDEA.md.

## Acceptance record

Before audit: actual Chromium screenshots inspected, including mobile EN/FI,
landscape/tablet/desktop. Final evidence (2026-10-17) has **264 matched before
and264 after cases**, 22 surfaces x6 sizes x2 languages, plus an intermediate
264-case review. Final document/surface overflow failures: **zero**.

The final baseline was regenerated from a read-only git archive of **5c46455** in
%TEMP%/motodash-ux86/baseline/MotoDashboard, using the same current capture harness
and real fixture UI profile-save/vehicle-choice steps as after. No branch, install,
production account or application source modification was needed for the baseline.
Fixture names/selection are now identical; dates differ naturally by capture time.
Each before/after folder has manifest.json with the exact matching case keys.

Actual visual iteration, beyond code/tests:

| Review evidence | Problem observed | Additional correction |
| --- | --- | --- |
| review/home-fi-320x568.png | Finnish Group label pushed part of Start behind bottom navigation | Tighter short-portrait heading/card rhythm; final Start fully above navigation, regression assertion added |
| review/discover-en-390x844.png and garage-en-390x844.png | Shared card padding inset artwork twice | Restore edge-to-edge media inside rounded activity/vehicle cards |
| review/club-detail and group-detail | Long section labels hid important destinations off the right edge | Short localized Club destinations and three activity actions all visible; all original sections retained |
| review/group-detail-en-430x932.png | Repeated policy/capacity paragraphs delayed RSVP | Compact actual admission metadata and fallback art; real date/area/organizer retained, RSVP buttons visible sooner |
| review/profile-en-390x844.png | Club shortcut arrow wrapped below its label | Balanced action padding/gap/type; final shortcuts align |
| viewport switching | Retained focused controls scrolled evidence during resizing | Capture harness blurs/resets scroll before each viewport; actual product focus/Back/dirty guards tested separately |

Examples to compare in before/ and after/: home-fi-320x568.png,
discover-en-390x844.png, profile-en-390x844.png, club-detail-fi-430x932.png,
group-detail-en-430x932.png, garage-en-390x844.png, profile-edit-en-390x844.png,
dashboard-en-390x844.png and saved-replay-fi-844x390.png. Tablet/desktop variants
use the same prefix with768x1024 or1440x1000. These are genuine local renders,
not invented production users/imagery/metrics. Small raster fixtures/error/empty
states do not certify production photography or camera behavior.

See BATCH_8_6_RESULT.md for final regression/commits/deployment and unrun phone
checks. Native Safari, real mobile rendering/GPS/camera/background and subjective
user acceptance remain **NOT RUN**; automated success is not a premium-quality
certificate or a claim to match Apple's proprietary design.

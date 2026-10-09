# MotoDash Platform --- IDEA.md

> **Purpose of this file:** This is the master product specification and
> phased implementation plan for the MotoDash prototype. It is intended
> to be read and followed by an AI coding agent working on the existing
> repository.
>
> **Prototype stack:** Existing static HTML/CSS/JavaScript application +
> GitHub Pages + Firebase.
>
> **Important:** The current application already contains working
> functionality. The AI agent MUST audit the existing codebase before
> implementing anything, preserve working features, identify what is
> already implemented, and adapt this plan to the actual repository
> before beginning implementation.

------------------------------------------------------------------------

# 1. Product vision

MotoDash is a **mobile-first social mobility platform for people and
communities that move together**.

It is not only a motorcycle dashboard and it is not intended to replace
Google Maps, Waze, dedicated navigation systems, WhatsApp, Discord,
Strava, or other specialized applications.

The core idea is to combine:

-   personal vehicles and identity;
-   live mobile dashboard;
-   ride/session recording;
-   personal Garage;
-   Clubs / Crews;
-   Group Sessions;
-   real-time group location;
-   Lobby / discovery;
-   sharing;
-   community identity and ranks;
-   simple event organization.

The platform is vehicle-agnostic, while motorcycles remain an important
initial use case and a strong part of the product identity.

A useful product summary is:

> **Your vehicle. Your crew. Your ride.**

A useful product loop is:

> **Discover → Join → Ride → Track → Share → Return**

------------------------------------------------------------------------

# 2. Prototype principles

The prototype must follow these principles throughout development:

1.  **Mobile first.** The product is primarily used on phones.
2.  **English first.** English is the default language.
3.  **Finnish supported from the beginning.**
4.  **Easy future localization.** No user-facing text should be
    scattered as hard-coded strings throughout the application.
5.  **Progressive enhancement.** Unsupported optional browser features
    must never break core functionality.
6.  **Automatic during movement.** The user should not need to
    constantly interact with the phone while riding/driving.
7.  **Safety first.** Do not encourage speed competition or interaction
    while moving.
8.  **Privacy first.** Live location and vehicle/profile visibility
    require clear access rules.
9.  **Preserve existing functionality.** Do not rewrite working features
    without a reason.
10. **Static frontend for prototype.** Keep HTML/CSS/JavaScript
    deployable directly to GitHub Pages.
11. **Firebase for prototype backend.**
12. **Modular architecture.** HTML, CSS and JavaScript may and should be
    separated into logical modules.
13. **No build step unless explicitly approved later.**
14. **No Stripe in this prototype.**
15. **No paid map/weather migration in this prototype.**
16. **Each implementation section must be verified before continuing.**

------------------------------------------------------------------------

# 3. Localization / language system

Localization is a foundation feature and must be designed before new UI
is added.

## 3.1 Languages for prototype

Initially support:

-   `en` --- English (**default / primary language**)
-   `fi` --- Finnish

The architecture must allow additional languages later without rewriting
UI components.

## 3.2 Dictionary architecture

Create a centralized translation/dictionary system.

Suggested structure:

``` text
js/
  i18n/
    i18n.js
    dictionary.js
```

or another equally clear modular structure discovered to fit the
existing repository.

Example concept:

``` js
const dictionary = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel"
    },
    garage: {
      title: "Garage",
      addVehicle: "Add vehicle"
    }
  },
  fi: {
    common: {
      save: "Tallenna",
      cancel: "Peruuta"
    },
    garage: {
      title: "Autotalli",
      addVehicle: "Lisää ajoneuvo"
    }
  }
};
```

Requirements:

-   Default language is English.
-   Language can be changed from the UI.
-   Selected language persists locally and, when a logged-in profile
    exists, may also be stored in the user profile.
-   Missing translation falls back to English.
-   Avoid hard-coded user-facing strings in application logic.
-   Dates, times and numbers should use locale-aware formatting where
    sensible.
-   Adding a third language later should mainly require adding another
    dictionary entry.
-   Firebase data such as user-created Club names must not be translated
    automatically.

------------------------------------------------------------------------

# 4. Core functionality catalogue

This section defines the overall product vision. Not everything here
belongs in the first prototype.

## 4.1 User account and profile

Users can:

-   create an account;
-   sign in;
-   sign out;
-   maintain a basic profile;
-   choose display name;
-   choose language;
-   manage profile visibility;
-   access their Garage, Clubs, sessions and history.

The prototype should use Firebase Authentication.

------------------------------------------------------------------------

## 4.2 Personal Garage

The Garage is the user's personal vehicle collection and a central
identity feature.

Users can add vehicles from categories such as:

-   Motorcycle
-   Car
-   Moped
-   Scooter
-   ATV / UTV
-   4x4 / Off-road
-   Snowmobile
-   Caravan / Motorhome
-   Bicycle
-   E-bike
-   Electric scooter
-   Other

Each vehicle can contain:

-   unique ID;
-   category;
-   nickname / display name;
-   manufacturer;
-   model;
-   model year;
-   optional description;
-   optional image when image storage is available;
-   visibility setting;
-   creation/update timestamps.

Users can:

-   add vehicles;
-   edit vehicles;
-   delete vehicles;
-   select a vehicle for a session;
-   have multiple vehicles.

The Garage should eventually function as a lightweight public
showcase/profile, but the prototype must avoid becoming a full
social-media feed.

------------------------------------------------------------------------

## 4.3 Vehicle identity in sessions

When starting or joining a session, a user can select one Garage
vehicle.

The selected vehicle is associated with:

-   the session participant;
-   saved session history;
-   live group marker identity where appropriate.

Example live identity:

> Alex\
> Yamaha MT-09\
> Road Lead · Midnight Riders

------------------------------------------------------------------------

## 4.4 Live Dashboard

Preserve and integrate the existing dashboard functionality.

Expected core information includes:

-   map;
-   current GPS speed;
-   local time;
-   current weather description;
-   temperature;
-   wind;
-   GPS status;
-   GPS accuracy;
-   network status;
-   current session distance;
-   moving time;
-   average moving speed;
-   maximum speed.

The UI must remain readable on a phone and must not become overloaded.

------------------------------------------------------------------------

## 4.5 Heading-up map

When reliable heading information is available:

-   map top should point toward the direction of travel;
-   heading changes should be smoothed;
-   stationary GPS noise must not cause constant rotation;
-   North-up mode must be available as fallback;
-   UI overlays must remain unrotated.

Heading source preference:

1.  reliable geolocation heading;
2.  bearing from consecutive accepted moving points;
3.  optional device orientation if supported and permission is granted;
4.  last stable heading;
5.  North-up fallback.

------------------------------------------------------------------------

## 4.6 Map appearance presets

Keep the existing map provider during the prototype.

Desired presets:

-   Normal
-   Black & White --- high contrast
-   Cruising --- high-contrast warm treatment
-   Water --- high-contrast blue/cyan treatment
-   Forest --- high-contrast green treatment
-   Night --- low-glare dark treatment

Because raster map tiles are already rendered, Cruising / Water / Forest
are visual approximations unless the map provider changes later.

Map styles must affect map tiles, not UI controls, markers or route
lines.

------------------------------------------------------------------------

## 4.7 Session recording

A user can start a new session.

A session should record:

-   session ID;
-   owner/user ID;
-   selected vehicle ID;
-   category;
-   start timestamp;
-   end timestamp;
-   accepted route points;
-   distance;
-   moving time;
-   average moving speed;
-   validated maximum speed;
-   session status.

Do **not** implement pause controls.

Movement should be detected automatically.

While stationary:

-   do not continuously save overlapping GPS points;
-   do not create false distance;
-   do not increase moving time.

When movement resumes, recording continues automatically.

Do not record altitude, start weather, end weather or pause-time
statistics for the prototype.

------------------------------------------------------------------------

## 4.8 Ride / session history

Users can see saved sessions.

History cards should show useful information such as:

-   date;
-   vehicle;
-   category;
-   distance;
-   moving time;
-   average speed;
-   maximum speed.

Opening a session should display:

-   route on map;
-   statistics;
-   associated vehicle;
-   basic metadata.

------------------------------------------------------------------------

## 4.9 Route export and sharing

Prototype sharing should support:

-   JSON export;
-   GPX export;
-   Web Share API when supported;
-   normal file download fallback.

Future commercial sharing should support shareable web URLs such as:

``` text
https://example.com/ride/ABC123
```

A recipient should eventually be able to view a shared ride without a
paid account.

------------------------------------------------------------------------

## 4.10 Group Sessions

A Host can create a Group Session.

Group Sessions may represent:

-   Ride
-   Drive / Convoy
-   Meet
-   Event

A Group Session contains:

-   title;
-   category;
-   type;
-   Host;
-   optional Club;
-   date/time;
-   approximate location / meeting point;
-   description;
-   visibility;
-   participant list;
-   status;
-   invite information.

------------------------------------------------------------------------

## 4.11 Group Session visibility

Support the conceptual visibility types:

### Public

Visible in Lobby. Eligible users can join.

### Approval required

Visible in Lobby, but joining requires approval.

### Unlisted

Not listed publicly. Accessible through invite link / QR.

### Private

Only explicitly invited or authorized users.

------------------------------------------------------------------------

## 4.12 Live Group Map

During an active Group Session:

-   participants send throttled validated location updates;
-   active participants appear on the shared map;
-   each marker can identify user and selected vehicle;
-   Club rank may be shown if relevant;
-   stale positions must be detected;
-   updates must not be sent on every raw GPS callback;
-   leaving or ending a session must stop live sharing.

The prototype must prioritize correctness, privacy and reasonable
Firebase usage over extremely high update frequency.

------------------------------------------------------------------------

## 4.13 Host

A Host can:

-   create Group Sessions;
-   edit permitted session information;
-   invite participants;
-   manage session visibility;
-   see participants;
-   manage joining where approval is required;
-   monitor live participants;
-   end the Group Session.

Host is a technical permission concept and later also a subscription
tier.

------------------------------------------------------------------------

## 4.14 Rider / participant status

During Group Sessions, a participant may set a simple status:

-   OK
-   Fuel
-   Mechanical
-   Need help

This is a group coordination feature, **not an emergency service**.

------------------------------------------------------------------------

## 4.15 Regroup detection

A later prototype phase may calculate whether participants are
significantly separated from the group.

Example:

> 2 members are 1.8 km behind.

Requirements:

-   avoid noisy warnings;
-   use validated locations;
-   do not turn this into navigation;
-   treat it as informational.

------------------------------------------------------------------------

## 4.16 Lobby

Lobby is the discovery layer of MotoDash.

Users can browse upcoming public sessions and events.

Possible filters:

-   category;
-   type;
-   date;
-   approximate location / region;
-   distance;
-   Club;
-   availability / participant count.

The first prototype Lobby should remain simple.

------------------------------------------------------------------------

## 4.17 Clubs / Crews

A Club is a persistent community.

A user may belong to multiple Clubs.

Club data may include:

-   Club ID;
-   name;
-   description;
-   logo;
-   banner later;
-   primary/accent colors;
-   links;
-   owner;
-   members;
-   membership rules;
-   upcoming sessions/events;
-   creation/update timestamps.

------------------------------------------------------------------------

## 4.18 Club membership rules

Support:

-   Open
-   Approval required
-   Invite only
-   Private

A user may request membership where applicable.

------------------------------------------------------------------------

## 4.19 Club technical roles

Technical permissions must be separate from visible community ranks.

Suggested roles:

-   Owner
-   Admin
-   Host
-   Member

Permissions must be enforced by Firebase Security Rules where relevant,
not only hidden in the frontend.

------------------------------------------------------------------------

## 4.20 Custom Club ranks

Clubs can create their own visible titles / ranks.

Examples:

-   Hangaround
-   Prospect
-   Member
-   Senior
-   Captain
-   Road Lead
-   Founder

A car Club may instead use:

-   Newcomer
-   Member
-   Organizer
-   President

Important:

> **Visible rank != technical authorization.**

A member displaying "Captain" does not automatically receive backend
Host/Admin rights.

------------------------------------------------------------------------

## 4.21 Club branding

A Club can define controlled branding values:

-   logo;
-   primary color;
-   accent color;
-   route color;
-   optional marker style;
-   optional map preset;
-   banner later.

Do not allow arbitrary custom CSS/JavaScript.

A Club-organized session may inherit Club branding.

------------------------------------------------------------------------

## 4.22 Club Wall / Info Wall

A lightweight information area, not a chat platform.

Possible content:

-   meeting instructions;
-   next meeting;
-   location;
-   announcement;
-   WhatsApp link;
-   Discord link;
-   Instagram link;
-   Facebook link;
-   website.

Do not build a full internal chat for the prototype.

------------------------------------------------------------------------

## 4.23 Meets and Events

MotoDash must not assume every community activity is a ride.

Supported conceptual types:

-   Ride
-   Meet
-   Event

Examples:

-   motorcycle ride;
-   car cruise;
-   coffee meet;
-   tuning meet;
-   track day;
-   caravan gathering;
-   snowmobile gathering.

The Lobby can use the same discovery system for all.

------------------------------------------------------------------------

## 4.24 QR joining

Generate join URLs for:

-   Clubs;
-   Group Sessions.

A QR code may encode the same URL.

The join flow should be as low-friction as possible.

------------------------------------------------------------------------

## 4.25 NFC ecosystem --- future

The same Club/Session URL can later be programmed to an NFC tag.

Potential products:

-   keychain;
-   sticker;
-   vehicle/dashboard tag;
-   Club card;
-   branded physical tags.

NFC is **not required for the initial software prototype**.

------------------------------------------------------------------------

## 4.26 Privacy controls

Eventually users must be able to control:

-   profile visibility;
-   Garage visibility;
-   individual vehicle visibility;
-   ride/session visibility;
-   live location visibility.

Private/Unlisted session location must never leak into public Lobby
data.

------------------------------------------------------------------------

## 4.27 Safe Zone --- future

Future privacy feature:

-   hide or blur route starts/ends around sensitive locations such as
    home.

Not required for the first prototype.

------------------------------------------------------------------------

## 4.28 Achievements --- future

Safe gamification examples:

-   First Ride
-   10 Group Sessions
-   1,000 km
-   Five Countries
-   Winter Rider
-   Event Host
-   Club milestones

Never add:

-   fastest rider;
-   top-speed leaderboards;
-   speed challenges;
-   rewards for dangerous driving.

------------------------------------------------------------------------

## 4.29 Vehicle Passport --- future

Each Garage vehicle may later have a richer summary:

-   total MotoDash distance;
-   session count;
-   events attended;
-   achievements;
-   optional modifications/details;
-   shareable vehicle card.

Not required for the first prototype.

------------------------------------------------------------------------

## 4.30 Club Challenges --- future

Possible safe Club challenges:

-   travel 500 km this month;
-   attend three Club rides;
-   visit five meets.

Do not base challenges on speed.

------------------------------------------------------------------------

## 4.31 Ride Memories --- future

Generate a shareable visual summary after a session:

-   route;
-   distance;
-   duration;
-   participants;
-   Club branding.

Potential sharing:

-   WhatsApp;
-   Instagram;
-   other system share targets.

Not required for first prototype.

------------------------------------------------------------------------

## 4.32 Featured / Sponsored events --- future commercial feature

Future revenue opportunity:

-   dealer rides;
-   brand events;
-   featured Lobby listings;
-   sponsored community events.

Do not implement advertising in the prototype.

------------------------------------------------------------------------

## 4.33 Merchandise --- future

Potential later products:

-   shirts;
-   hoodies;
-   patches;
-   stickers;
-   Club-branded NFC products.

Only pursue after the community has proven demand.

------------------------------------------------------------------------

## 4.34 MotoDash Official Sessions / Challenges --- late prototype feature

MotoDash itself must be able to publish **official platform-owned Sessions / Challenges** into the Lobby.

Purpose:

- ensure that new users immediately see something meaningful to do even if there are no nearby user-created Clubs or rides yet;
- create recurring reasons to return to the app;
- reward participation with safe, non-speed-based badges / achievements;
- give MotoDash administrators a way to seed activity in new countries, cities and categories.

Official Sessions are created and managed by **MotoDash platform administrators**, not by normal Club Owners or Hosts.

Examples:

- First MotoDash Ride
- October Weekend Ride
- Helsinki Autumn Cruise
- Baltic Roadtrip Weekend
- Snowmobile Winter Opening
- Ride 100 km This Weekend
- Join Your First Group Session
- Explore 3 Different Sessions This Month

Official Sessions may be:

- global;
- country-specific;
- region/city-specific;
- radius-based around a configured location;
- category-specific;
- available only during a defined start/end date;
- recurring through configuration where practical.

The Lobby should prioritize or clearly identify relevant official activities that apply to the user's approximate area/category without exposing precise private user location.

### Official Session / Challenge parameters

Design the data model so an administrator can configure, at minimum:

- title;
- localized description where needed;
- event/challenge type;
- eligible vehicle categories;
- geographic scope (`global`, `country`, `region`, `radius`);
- optional country/region identifiers;
- optional latitude/longitude + radius;
- start date/time;
- end date/time;
- visibility / published state;
- completion rule;
- badge/reward definition;
- banner/theme metadata where supported;
- optional maximum/recommended participant count for true live events.

### Completion rules

The first implementation must use **safe and objective rules** only. Examples:

- complete one recorded session;
- participate in one Group Session;
- record at least X kilometres during the campaign period;
- complete X eligible sessions;
- use an eligible vehicle category;
- attend a specific official session/event.

Never use:

- top speed;
- fastest completion;
- speed ranking;
- dangerous acceleration/braking competition.

### MotoDash badges / rewards

Completing an official Session/Challenge may grant a platform badge or achievement.

Requirements:

- badges are distinct from Club ranks;
- badges never grant administrative permissions;
- rewards should be visible on the user's profile/Garage where appropriate;
- duplicate reward granting must be prevented;
- the completion logic must be deterministic and auditable;
- the prototype may begin with symbolic digital rewards only.

Physical rewards, discount codes, merch rewards or sponsor prizes are future commercial extensions and are **not required in the first implementation**.

### Administration

The prototype needs a minimal administrator-only method to create, edit, publish, unpublish and retire MotoDash Official Sessions / Challenges.

Because the prototype is hosted on GitHub Pages, administration must still be protected by Firebase Security Rules. Do not rely on a hidden admin button as security.

For the prototype, a practical approach is:

- maintain a `systemAdmins` / equivalent collection in Firebase;
- seed administrator UID(s) manually through Firebase Console;
- normal clients must not be able to grant themselves administrator access;
- Firebase Rules must check administrator authorization before allowing writes to official activity definitions.

If a stronger backend/custom-claims model is adopted later, this can be migrated during commercialization.

### Automation

The first prototype does **not** need scheduled server automation.

Instead, support configurable date/geographic/category parameters so many recurring-looking campaigns can be prepared manually. The Lobby can determine whether an active campaign is relevant based on its stored parameters.

True scheduled generation, automated campaign creation, push notifications and advanced segmentation are future enhancements and may require backend/Cloud Functions infrastructure.

------------------------------------------------------------------------

# 5. Planned commercial tiers --- future, not prototype billing

The prototype should model roles/features in a way that can later
support subscriptions, but **Stripe and actual billing enforcement are
out of scope for now**.

## Free

Conceptual future access:

-   live dashboard;
-   Lobby;
-   view shared rides;
-   join Group Sessions;
-   limited Garage / limited recording if desired.

## Rider

Indicative future price hypothesis:

-   approximately €5.99/month;
-   annual option later.

Potential features:

-   full Personal Garage;
-   own session recording;
-   history;
-   route export/share;
-   advanced personal features.

## Host

Indicative future price hypothesis:

-   approximately €11.99/month.

Potential features:

-   Rider features;
-   create Group Sessions;
-   live group management;
-   invite links / QR;
-   statuses;
-   regroup;
-   session branding;
-   Wall.

## Club

Indicative future price hypothesis:

-   approximately €29.99/month.

Potential features:

-   permanent Club;
-   members;
-   custom ranks;
-   multiple Hosts;
-   Club branding;
-   Club Wall;
-   events;
-   Club-specific management.

These prices are hypotheses to validate later.

------------------------------------------------------------------------

# 6. Explicitly out of scope for the first prototype

Keep these ideas documented, but DO NOT implement them unless the user
later explicitly moves them into scope:

-   Stripe;
-   real subscription billing;
-   production subscription enforcement;
-   paid commercial map migration;
-   paid commercial weather migration;
-   turn-by-turn navigation;
-   manual route planning;
-   internal full chat/messaging platform;
-   marketplace;
-   vehicle sales;
-   parts marketplace;
-   TikTok/Instagram-style feed;
-   follower system;
-   public comments system;
-   AI features without a validated need;
-   detailed vehicle maintenance management;
-   fuel expense tracking;
-   insurance features;
-   NFC hardware;
-   merch store;
-   sponsored rides;
-   advertising system;
-   Club Challenges;
-   Achievements;
-   Vehicle Passport;
-   Ride Memories;
-   Ride Replay;
-   Safe Zone;
-   full moderation system;
-   business analytics dashboard;
-   push notification system unless later required;
-   complex media galleries.

------------------------------------------------------------------------

# 7. Prototype technical direction

The final implementation details must be adapted after auditing the
existing repository.

Expected high-level stack:

-   HTML
-   CSS
-   JavaScript ES modules
-   GitHub Pages
-   Firebase Authentication
-   Cloud Firestore
-   Firebase Realtime Database if selected for high-frequency live
    positions
-   existing Leaflet map integration
-   existing map provider during prototype
-   existing weather provider during prototype

A likely architecture is:

``` text
index.html

css/
  base.css
  components.css
  dashboard.css
  garage.css
  clubs.css
  sessions.css
  lobby.css

js/
  app.js
  config.js

  i18n/
    i18n.js
    dictionary.js

  firebase/
    firebase.js
    auth.js
    firestore.js
    realtime.js

  modules/
    profile.js
    garage.js
    dashboard.js
    gps.js
    map.js
    weather.js
    recording.js
    history.js
    sharing.js
    clubs.js
    permissions.js
    ranks.js
    groupSessions.js
    liveGroup.js
    lobby.js
    qr.js

  ui/
    navigation.js
    dialogs.js
    notifications.js
```

This is a conceptual target, not a mandatory exact file structure. The
completed Section 0 audit recommends retaining current module paths and
adding the incremental structure in Section 15.8 rather than moving working
modules solely to match this example.

------------------------------------------------------------------------

# 8. Firebase planning principles

The Firebase project setup will be verified with the user before implementation
begins. Section 0 found an unused configuration for `motodash-87bf8`;
first reconcile that existing registration and its enabled services rather
than assume a new project must be created. No Firebase setup was performed
during the audit.

Do not hard-code a final database schema before the repository audit and
Firebase setup.

Likely responsibilities:

## Firebase Authentication

-   user identity;
-   login/logout;
-   account creation.

## Cloud Firestore

Likely persistent data:

-   user profiles;
-   vehicles;
-   saved sessions;
-   route metadata / possibly route points depending on design;
-   Clubs;
-   Club memberships;
-   ranks;
-   Group Session metadata;
-   Lobby/event metadata;
-   join requests;
-   invitations.

## Firebase Realtime Database

Potential use:

-   active live Group Session locations;
-   ephemeral presence;
-   live status.

This hybrid should be evaluated before implementation rather than
assumed blindly.

------------------------------------------------------------------------

# 9. AI implementation workflow

> **Batch 1 authorization, 2026-10-09:** The user approved implementation of
> localization, dashboard reliability repairs and Firebase/Auth foundation
> in one session, with technical checks and separate commits between
> milestones. No push or rules/production deployment is authorized. The user
> deleted old ride history; legacy session migration/backward compatibility
> and the migration-specific backup-export prerequisite are superseded.
> Preserve unrelated preferences. No backend server, npm/build/framework,
> Garage, Clubs, groups, Lobby, QR or billing belongs to this batch.
> Historical Section 0 findings below describe the pre-implementation baseline.


The implementation must be divided into controlled sections.

## Mandatory rule

After each implementation section:

1.  AI reviews its own diff.
2.  AI performs technical checks.
3.  AI verifies previous functionality has not regressed.
4.  AI updates checkboxes/status.
5.  AI stops.
6.  Human manually tests the feature.
7.  Only after explicit human approval may AI continue.

------------------------------------------------------------------------

# SECTION 0 --- EXISTING APPLICATION AUDIT

> **Section 0 audit adaptation:** Completed as a documentation/source/deployment audit on 2026-10-08. See Section 15 for baseline evidence. The user approved the bounded Batch 1 implementation on 2026-10-09; current results appear in Section 16 below.

## Goal

Understand the existing application completely before modifying it.

## Agent tasks

-   [x] Read this entire `IDEA.md`.
-   [x] Inspect every relevant existing HTML file.
-   [x] Inspect every relevant CSS file.
-   [x] Inspect every relevant JavaScript file.
-   [x] Inspect repository structure.
-   [x] Identify current GitHub Pages path assumptions.
-   [x] Identify existing Firebase code, if any.
-   [x] Identify existing authentication code, if any.
-   [x] Identify existing GPS implementation.
-   [x] Identify existing speed calculation/smoothing.
-   [x] Identify existing map implementation.
-   [x] Identify existing heading/map rotation implementation.
-   [x] Identify existing map presets.
-   [x] Identify existing weather implementation.
-   [x] Identify existing session recording.
-   [x] Identify existing history/storage.
-   [x] Identify existing sharing/export.
-   [x] Identify existing language handling.
-   [x] Identify existing PWA/manifest/service worker functionality.
-   [x] Identify reusable UI/components.
-   [x] Identify duplicated or risky code.
-   [x] Identify browser/mobile compatibility risks.
-   [x] Identify current errors/warnings.
-   [x] Identify which requirements in this document already exist.
-   [x] Identify which requirements need modification rather than
    replacement.

## Required output

Before implementation, the AI must modify this file by adding an **Audit
Result** section containing:

-   current architecture;
-   current features;
-   existing reusable modules;
-   existing Firebase integration;
-   conflicts with this specification;
-   functionality already complete;
-   recommended changes to implementation order;
-   any required data migrations;
-   risks.

The AI may refine the implementation sections below to match the real
repository, but it must:

-   preserve the product vision;
-   preserve out-of-scope decisions;
-   not silently remove requirements;
-   explain material plan changes.

## Acceptance criteria

-   [x] No product code changed before audit completion.
-   [x] Existing functionality documented.
-   [x] Existing architecture documented.
-   [x] IDEA.md adapted to the real codebase.
-   [x] Human reviews the audit before implementation begins. (Batch 1 authorized 2026-10-09.)

### HUMAN CHECKPOINT

**STOP. Do not implement Section 1 until the user explicitly approves
the audited IDEA.md.**

------------------------------------------------------------------------

# SECTION 1 --- LOCALIZATION FOUNDATION

> **Section 0 audit adaptation (planning only):** Localize the existing index.html, app.js, config.js, session-manager.js, gps.js, map.js, weather.js and utils.js rather than create replacement dashboard modules. Add js/i18n/ incrementally; include dynamic history, prompts, ARIA labels and WMO descriptions. See 15.9.

## Goal

Create English-first localization before adding substantial new UI.

## Tasks

-   [x] Create centralized dictionary.
-   [x] Add English translations.
-   [x] Add Finnish translations.
-   [x] English is default.
-   [x] Add language selector.
-   [x] Persist selected language.
-   [x] Add fallback to English.
-   [x] Refactor relevant existing visible UI strings through
    translation system.
-   [x] Ensure adding another language is straightforward.
-   [x] Use locale-aware date/time formatting where sensible.

## Checks

-   [x] English UI works.
-   [x] Finnish UI works.
-   [x] Refresh preserves language.
-   [x] Missing translation falls back to English.
-   [x] No console errors.
-   [x] Existing dashboard still works.

**Batch 1 Milestone 1:** Implemented and checked in headless Chromium with simulated external services. Dictionary parity/fallback/parameters, dynamic labels, refresh preference, DOM IDs and native module syntax/linking passed. GPS/map/weather algorithms were preserved. Physical-device checks remain pending. User authorized continuing within this batch.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 2 --- FIREBASE FOUNDATION + AUTH

> **Section 0 audit adaptation (planning only):** Reconcile the existing unused root firebase-config.js for project motodash-87bf8 before creating a project. Use pinned browser ESM imports and one service initializer. Empty firestore.rules is not a security foundation. Decide UID-scoped caches, deny-by-default rules, database regions, Auth domains and the hybrid authorization prerequisite in 15.7 before backend-dependent features.

> Batch 1 reuses the existing dedicated project `motodash-87bf8` and its root
> web configuration. No project or production setup was created/changed.

## Goal

Connect the prototype safely to Firebase.

## Tasks

-   [x] Add Firebase configuration in the architecture agreed during
    setup.
-   [x] Initialize Firebase only once.
-   [x] Implement Authentication.
-   [x] Sign up.
-   [x] Sign in.
-   [x] Sign out.
-   [x] Authentication state handling.
-   [x] Basic user profile document.
-   [x] Loading/error states.
-   [x] Create initial Security Rules.
-   [x] Verify GitHub Pages compatibility.
-   [x] Ensure secrets are treated appropriately; understand Firebase
    web config is not a server secret and security relies on Rules/Auth.

## Checks

-   [ ] New user registration.
-   [ ] Login.
-   [ ] Logout.
-   [ ] Refresh preserves auth session.
-   [ ] Unauthorized data access rejected by rules.
-   [x] No JS errors. (Executed browser/fixture scenarios.)
-   [x] Existing dashboard remains functional. (Simulated GPS/providers.)

**Batch 1 Milestone 3:** Code and local rules preparation complete. Auth/profile
flows, refresh persistence, failure/retry and own-UID guards passed using SDK mocks.
Real Firebase 13.0.0 browser imports/exports, single initialization and Auth local
persistence setup passed with cloud APIs blocked. The first five live checks above
remain unchecked: no test accounts, production writes or rules-engine tests were
performed. Both rules files require user review/approval before deployment.
Realtime Database remains unused/default-denied; rides remain local. No Garage,
Clubs, groups, Lobby, QR, billing, backend or build system was implemented.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 3 --- USER PROFILE + PERSONAL GARAGE

> **Section 0 audit adaptation (planning only):** Add profile/Garage screens around the retained dashboard. Use stable vehicle category IDs, owner-scoped records, visibility boundaries and nullable historical vehicle associations. Keep selected vehicle snapshot separate from live/current Garage data. Optional images require verified Storage setup/rules.

## Goal

Implement the personal identity and vehicle system.

## Tasks

-   [ ] Profile screen.
-   [ ] Display name.
-   [ ] Language preference integration.
-   [ ] Garage screen.
-   [ ] Add vehicle.
-   [ ] Edit vehicle.
-   [ ] Delete vehicle with confirmation.
-   [ ] Vehicle categories.
-   [ ] Vehicle nickname.
-   [ ] Manufacturer.
-   [ ] Model.
-   [ ] Year.
-   [ ] Description.
-   [ ] Vehicle visibility.
-   [ ] Multiple vehicles.
-   [ ] Persist to Firebase.
-   [ ] Restore after logout/login.
-   [ ] Mobile-friendly empty states.

Image upload may be postponed if Firebase Storage is not yet configured.

## Checks

-   [ ] Create motorcycle.
-   [ ] Create car.
-   [ ] Create multiple vehicles.
-   [ ] Edit.
-   [ ] Delete.
-   [ ] Logout/login persistence.
-   [ ] Security Rules prevent editing another user's Garage.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 4 --- EXISTING DASHBOARD INTEGRATION

## Batch 1: Section 4A repair checkpoint (2026-10-09)

- [x] Connect reliable automatic heading and unwrap angle transitions; keep HUD/control layers fixed.
- [x] Validate and deduplicate GPS timestamps before distance, moving time and maximum speed accounting.
- [x] Break routes after stops, quality loss, gaps and refresh; never bridge interruption distance.
- [x] Stop GPS, release Wake Lock, cancel save timer and flush a captured completed record on finish.
- [x] Introduce schema v2 per-record IndexedDB storage with localStorage fallback, preserving settings.
- [x] Await authoritative local history before active restoration and show completed ride details.
- [x] Execute simulated browser scenarios and 36 deterministic domain assertions.
- [ ] Physical-phone GPS, browser suspension, battery and real-provider checks.

This completes Batch 1 Milestone 2 only. Account/Garage integration, cloud session persistence,
export and future product requirements below remain pending. No historical migration is needed
under the user's Batch 1 authorization. Checks used headless Chromium, simulated GPS and
provider fixtures; they do not establish physical-device or background-recording support.

> **Section 0 audit adaptation (planning only):** Split into a separately approved Section 4A repair checkpoint after Section 1, then account/Garage integration after Section 3. Repair disconnected automatic heading, GPS timestamp/dedup/gap/max accounting, stop lifecycle and asynchronous local restore before cloud session sync. Preserve existing module paths and all original integration requirements; see 15.6 and 15.10.

## Goal

Integrate the current working dashboard with account/Garage architecture
without breaking it.

## Tasks

-   [ ] Preserve GPS.
-   [ ] Preserve speed.
-   [ ] Preserve map.
-   [ ] Preserve heading behavior.
-   [ ] Preserve weather.
-   [ ] Preserve time.
-   [ ] Preserve network/GPS status.
-   [ ] Allow selected Garage vehicle.
-   [ ] Display selected vehicle unobtrusively.
-   [ ] Ensure dashboard works when authenticated.
-   [ ] Define sensible behavior for Free/guest prototype users.
-   [ ] Preserve mobile layout.

## Checks

-   [ ] GPS works.
-   [ ] Speed works.
-   [ ] Map works.
-   [ ] Weather works.
-   [ ] Heading works/falls back safely.
-   [ ] Selected vehicle works.
-   [ ] No regression from pre-Firebase dashboard.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 5 --- SESSION RECORDING

> **Batch 1 status:** Existing local recording, timestamp/quality filtering,
> movement statistics, finish/flush and refresh restoration are implemented and
> simulated-tested in Section 4A. Checkboxes below describe the future complete
> account/vehicle/cloud phase, which has not begun. Historical migration is not
> required under Batch 1; future local-to-account ownership policy remains necessary.

> **Section 0 audit adaptation (planning only):** Extend createSessionRecord, createMovementTracker, createRouteRecorder and createSessionStore through a local-first repository/outbox. Keep local recording usable without Firebase. Add schema versions, UID/vehicle/category, chunked routes, upload revisions and explicit legacy ownership consent. Pull forward a local backup-export subset from Section 6 before migration. No per-GPS-callback cloud writes; no pause UI.

## Goal

Persist personal sessions.

## Tasks

-   [ ] Start new session.
-   [ ] Select vehicle.
-   [ ] Record accepted GPS route points.
-   [ ] Automatic movement detection.
-   [ ] Stationary point filtering.
-   [ ] Unrealistic jump filtering.
-   [ ] Distance.
-   [ ] Moving time.
-   [ ] Average moving speed.
-   [ ] Maximum validated speed.
-   [ ] End session.
-   [ ] Save session.
-   [ ] Recover safely from refresh where feasible.
-   [ ] Prevent duplicate session creation.
-   [ ] Avoid excessive Firebase writes.

## Checks

-   [ ] Stationary GPS does not accumulate overlapping route.
-   [ ] Movement adds route.
-   [ ] Stop/resume works automatically.
-   [ ] Bad GPS does not create huge distance.
-   [ ] Session associated with correct vehicle.
-   [ ] Saved data reloads.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 6 --- HISTORY + EXPORT / SHARE

> **Section 0 audit adaptation (planning only):** Reuse existing history/rename/delete and segmented polyline rendering. Add a visible read-only detail panel (current summary is hidden), vehicle/category identity and cloud adapter. Export GPX segments without connecting break markers; JSON retains schema/units. Feature-detect file sharing, preserve download fallback and handle cancellation. Public share pages remain deferred.

## Goal

Make recorded sessions useful after the ride.

## Tasks

-   [ ] History list.
-   [ ] Session detail.
-   [ ] Route rendering.
-   [ ] Statistics.
-   [ ] Vehicle identity.
-   [ ] Delete own session.
-   [ ] JSON export.
-   [ ] GPX export.
-   [ ] Web Share API.
-   [ ] File download fallback.
-   [ ] Import only if explicitly approved during implementation.

## Checks

-   [ ] History survives login/reload.
-   [ ] Route displays correctly.
-   [ ] JSON valid.
-   [ ] GPX valid enough for standard GPX consumers.
-   [ ] Sharing failure does not break app.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 7 --- CLUB FOUNDATION

> **Section 0 audit adaptation (planning only):** Define minimum Owner/Admin/Host/Member authorization and rule invariants before enabling Club management/join approvals. Store memberships by UID rather than an unbounded member array; separate join requests and user navigation refs. Section 8 still completes role tooling and visible custom ranks.

## Goal

Implement persistent communities.

## Tasks

-   [ ] Create Club.
-   [ ] Edit Club.
-   [ ] Club page.
-   [ ] Club description.
-   [ ] Basic links.
-   [ ] Club Owner.
-   [ ] Membership collection/model.
-   [ ] Open joining.
-   [ ] Approval-required joining.
-   [ ] Invite-only concept.
-   [ ] Private concept.
-   [ ] Join request.
-   [ ] Approve/reject request.
-   [ ] Leave Club.
-   [ ] Multiple Clubs per user.
-   [ ] Owner transfer/delete policy documented before destructive
    actions.

## Checks

-   [ ] Create Club.
-   [ ] Join open Club.
-   [ ] Request approval.
-   [ ] Approve/reject.
-   [ ] User belongs to multiple Clubs.
-   [ ] Unauthorized users cannot edit Club.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 8 --- CLUB ROLES + CUSTOM RANKS

> **Section 0 audit adaptation (planning only):** Extend the permission foundation established in Section 7; visible rankId/name must never grant rights. Test self-promotion, owner transfer, cross-Club access and membership revocation. UI permission helpers mirror rules rather than replace them.

## Goal

Separate authorization from community identity.

## Technical roles

-   Owner
-   Admin
-   Host
-   Member

## Tasks

-   [ ] Role data model.
-   [ ] Permission helpers.
-   [ ] Firebase Rules enforcement.
-   [ ] Custom visible rank definitions.
-   [ ] Assign rank.
-   [ ] Change rank.
-   [ ] Remove rank.
-   [ ] Custom rank display.
-   [ ] Ensure visible rank never grants technical permission.

## Checks

-   [ ] Member cannot perform Admin action.
-   [ ] Host receives only intended rights.
-   [ ] Custom "Captain" rank alone grants nothing.
-   [ ] Owner/Admin management works.
-   [ ] Security Rules tested.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 9 --- CLUB BRANDING + INFO WALL

> **Section 0 audit adaptation (planning only):** Use validated branding fields, safe link protocols and plain-text Info Wall rendering. Separate tile preset choice from UI/route/marker branding. Reuse existing CSS controls/map hooks; logos require Storage rules. Existing product logo is not Club-logo support.

## Goal

Give communities identity without building a social network.

## Tasks

-   [ ] Club logo support if storage is configured.
-   [ ] Primary color.
-   [ ] Accent color.
-   [ ] Optional route color.
-   [ ] Club links.
-   [ ] Info Wall / announcement.
-   [ ] WhatsApp link.
-   [ ] Discord link.
-   [ ] Instagram link.
-   [ ] Facebook link.
-   [ ] Website link.
-   [ ] Safe URL validation.
-   [ ] Controlled theming only.

## Checks

-   [ ] Invalid colors/URLs handled.
-   [ ] Branding does not break readability.
-   [ ] No arbitrary HTML/CSS injection.
-   [ ] Club Wall permissions work.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 10 --- GROUP SESSION FOUNDATION

> **Section 0 audit adaptation (planning only):** Keep Group Sessions distinct from users recorded sessions. Retain Drive/Convoy alongside Ride/Meet/Event and all four visibility modes. Implement authorization, admission/approval, explicit sharing consent and a Pages-safe invite resolver/auth-return flow before live publishing. Private meeting details and public Lobby summaries must be separate.

## Goal

Allow users with Host permissions to organize shared sessions.

## Tasks

-   [ ] Create Group Session.
-   [ ] Type: Ride / Meet / Event.
-   [ ] Category.
-   [ ] Title.
-   [ ] Description.
-   [ ] Date/time.
-   [ ] Meeting location.
-   [ ] Optional Club association.
-   [ ] Visibility.
-   [ ] Host.
-   [ ] Join.
-   [ ] Leave.
-   [ ] Participant list.
-   [ ] Approval workflow where needed.
-   [ ] Selected Garage vehicle.
-   [ ] Start/end session.
-   [ ] Invite URL.

## Checks

-   [ ] Public join.
-   [ ] Approval join.
-   [ ] Unlisted URL access.
-   [ ] Private access enforcement.
-   [ ] Correct vehicle attached.
-   [ ] Only permitted users manage session.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 11 --- LIVE GROUP MAP

> **Section 0 audit adaptation (planning only):** Use the approved live repository choice in 15.7: recommended RTDB latest positions/presence only with trusted ACL coordination, otherwise Firestore-only low-frequency live documents. Enforce authorization before listeners/writes; test revoked/ended state, duplicate connections, stale timestamps and reconnect. Do not attach all Lobby clients to live streams.

## Goal

Show active participants together in real time.

## Tasks

-   [ ] Decide Firestore vs Realtime Database for ephemeral location
    after measuring/design review.
-   [ ] Start live sharing only after explicit Group Session
    participation.
-   [ ] Throttle location updates.
-   [ ] Validate locations.
-   [ ] Show active participants.
-   [ ] Marker identity.
-   [ ] Selected vehicle.
-   [ ] Club rank when applicable.
-   [ ] Last-update timestamp.
-   [ ] Stale marker handling.
-   [ ] Stop sharing on leave/end.
-   [ ] Reconnect handling.
-   [ ] Avoid persistent high-frequency location history unless
    explicitly needed.

## Checks

-   [ ] Two simulated/users appear.
-   [ ] Updates move markers.
-   [ ] Leaving stops updates.
-   [ ] Stale positions identified.
-   [ ] Unauthorized outsiders cannot read private live locations.
-   [ ] Firebase usage is not excessive.

### HUMAN CHECKPOINT

This is a major milestone. Test with at least two real devices/accounts
if possible.

STOP after this section.

------------------------------------------------------------------------

# SECTION 12 --- RIDER STATUS + REGROUP

> **Section 0 audit adaptation (planning only):** Use authorized latest locations and localized stable status codes. Regroup calculations must tolerate stale/outlier samples and require sustained separation rather than a single noisy fix; retain informational/non-emergency behavior.

## Goal

Add lightweight group coordination.

## Tasks

-   [ ] OK.
-   [ ] Fuel.
-   [ ] Mechanical.
-   [ ] Need help.
-   [ ] Status visible to permitted participants.
-   [ ] Reset status.
-   [ ] Basic regroup/separation calculation.
-   [ ] Avoid noisy alerts.
-   [ ] Clear disclaimer that status is not an emergency service.

## Checks

-   [ ] Status syncs.
-   [ ] Permissions correct.
-   [ ] Regroup handles GPS noise.
-   [ ] No navigation behavior introduced.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 13 --- LOBBY / DISCOVERY

> **Section 0 audit adaptation (planning only):** Pull forward a separately approved Section 13A public/approval-required projection and basic joining checkpoint after Section 10, before Section 11. Preserve remaining filters and completion checks. Use lobbyEvents sanitized summaries, omit Unlisted/Private, paginate queries and use approximate region initially; Official content is added in Section 17.

## Goal

Allow discovery of public upcoming activity.

## First prototype scope

-   [ ] Public upcoming Group Sessions.
-   [ ] Ride / Meet / Event.
-   [ ] Category.
-   [ ] Date.
-   [ ] Approximate location/region.
-   [ ] Club.
-   [ ] Participant count.
-   [ ] Simple filters.
-   [ ] Open session details.
-   [ ] Join flow.

## Privacy

Lobby must never expose:

-   private session live locations;
-   precise participant home locations;
-   Unlisted/Private sessions to unauthorized users.

## Checks

-   [ ] Public event visible.
-   [ ] Private event absent.
-   [ ] Filters work.
-   [ ] Mobile UI usable.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 14 --- QR JOINING

> **Section 0 audit adaptation (planning only):** Reuse stable Pages hash-based invite URLs and authenticated resolver already designed for Clubs/groups. This phase adds QR generation, expiry/error UI and cross-phone verification, not a separate authorization flow. NFC hardware stays deferred.

## Goal

Make joining fast and prepare for future NFC.

## Tasks

-   [ ] Stable Club invite URL.
-   [ ] Stable Session invite URL.
-   [ ] QR generation.
-   [ ] QR opens correct destination.
-   [ ] Authentication return flow where login is required.
-   [ ] Invalid/expired invite handling.

## Checks

-   [ ] Scan Club QR on another phone.
-   [ ] Scan Session QR.
-   [ ] Logged-out flow.
-   [ ] Invalid invite.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 15 --- PRIVACY + VISIBILITY REVIEW

> **Section 0 audit adaptation (planning only):** This is a whole-product review; enforce visibility, deletion and rules in each feature phase already. Include UID-scoped local/cloud caches, route-chunk deletion, public projection removal, invitation revocation and RTDB ACL lifecycle. Do not rely on hidden UI or client cleanup for privacy.

## Goal

Review the entire prototype before polishing.

## Tasks

-   [ ] Profile visibility.
-   [ ] Garage visibility.
-   [ ] Vehicle visibility.
-   [ ] Club visibility.
-   [ ] Session visibility.
-   [ ] Live location access.
-   [ ] Join permissions.
-   [ ] Delete own data paths.
-   [ ] Firebase Rules audit.
-   [ ] Ensure UI hiding is not used as security.
-   [ ] Document current privacy limitations.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 16 --- MOBILE UX POLISH

> **Section 0 audit adaptation (planning only):** Preserve safe-area/collapsible HUD behavior while correcting zoom restriction, short-screen clipping, small history targets, modal focus/error layering and rotated map controls. Check both languages and real browser/device behavior; an install manifest does not guarantee offline/background recording.

## Goal

Make the prototype pleasant and credible on phones.

## Requirements

-   [ ] Phone-first layout.
-   [ ] Portrait optimized.
-   [ ] Landscape usable.
-   [ ] Safe-area support.
-   [ ] Large touch targets.
-   [ ] No unnecessary scrolling in live dashboard.
-   [ ] Clear navigation.
-   [ ] Loading states.
-   [ ] Empty states.
-   [ ] Error states.
-   [ ] Confirmation dialogs for destructive actions.
-   [ ] English and Finnish checked.
-   [ ] Different screen widths checked.
-   [ ] Optional APIs feature-detected.
-   [ ] Core app works without Wake Lock/fullscreen/device orientation.

### HUMAN CHECKPOINT

STOP after this section.

------------------------------------------------------------------------

# SECTION 17 --- MOTODASH OFFICIAL SESSIONS + PLATFORM REWARDS

> **Section 0 audit adaptation (planning only):** Preserve this late-prototype requirement despite the generic Achievements deferral elsewhere. Manually seed protected systemAdmins; use administrator/trusted on-demand completion evaluation and idempotent badge grants, not unrestricted client self-awards. No scheduled automation, paid rewards or speed criteria. Preserve all five completion-rule types.

## Goal

Give the platform administrator a controlled way to seed useful activities into the Lobby and reward safe participation. This section is intentionally near the end because it depends on Lobby, sessions, profiles, Garage, history and permissions already working.

## Tasks

-   [ ] Add secure MotoDash system administrator concept.
-   [ ] Seed administrator UID(s) manually; users cannot self-promote.
-   [ ] Add Firebase Security Rules for official content.
-   [ ] Add Official Session / Challenge data model.
-   [ ] Support global, country, region and radius scope.
-   [ ] Support category eligibility.
-   [ ] Support start/end dates.
-   [ ] Support draft/published/retired state.
-   [ ] Add minimal administrator UI for create/edit/publish/unpublish/retire.
-   [ ] Surface relevant official activities in Lobby with clear `MotoDash Official` identity.
-   [ ] Keep official activities visually distinguishable from user/Club-created Sessions.
-   [ ] Implement simple safe completion-rule engine.
-   [ ] Support at least these prototype rule types:
    - complete one eligible session;
    - participate in an eligible Group Session;
    - accumulate at least X distance during the activity period;
    - complete at least X eligible sessions;
    - attend a specific official Session.
-   [ ] Add MotoDash badge/reward definitions.
-   [ ] Grant a badge exactly once when completion criteria are met.
-   [ ] Show earned badges on the user's profile/Garage in a compact form.
-   [ ] Ensure badges do not affect technical permissions or Club ranks.
-   [ ] Add English and Finnish strings through the dictionary system.
-   [ ] Do not implement speed-based competition.
-   [ ] Do not implement monetary/physical rewards yet.
-   [ ] Do not require scheduled Cloud Functions for the prototype.

## Suggested prototype data concepts

Possible collections / concepts (adapt after audit):

```text
officialActivities/{activityId}
officialActivities/{activityId}/...
users/{uid}/earnedBadges/{badgeId}
systemAdmins/{uid}
```

Exact schema must be decided after the Firebase architecture review.

## Relevance / nearby behavior

For the first prototype:

- global activities are visible to everyone;
- country/region activities are shown when the user's profile/current approximate area matches;
- radius activities may be evaluated from the current location only when the user has granted location permission;
- do not permanently store precise location solely for campaign matching;
- Lobby should have an `Official` filter/label and may prioritize nearby official activities.

## Checks

-   [ ] Normal user cannot create or modify official activities.
-   [ ] Admin can create and publish an official activity.
-   [ ] Draft activity is not visible to normal users.
-   [ ] Published global activity appears in Lobby.
-   [ ] Region/category filtering behaves correctly.
-   [ ] Completion rule grants correct badge.
-   [ ] Badge cannot be granted twice.
-   [ ] No speed-based reward logic exists.
-   [ ] Official content does not expose private live-location data.
-   [ ] Existing Lobby and user-created Sessions still work.

### HUMAN CHECKPOINT

STOP after this section. Manually verify admin creation, Lobby visibility and at least one badge completion flow before final validation.

------------------------------------------------------------------------

# SECTION 18 --- FINAL PROTOTYPE VALIDATION

> **Section 0 audit adaptation (planning only):** Validate retained dashboard plus all new flows using declared environments. Include deterministic GPS-gap/dedup fixtures, rules/emulator tests, Pages subpath/deep-link tests, storage failure/account-switch tests and two-account/device live revocation. Create PROTOTYPE_STATUS.md only in this final implementation phase and report untested devices honestly.

## Functional validation

-   [ ] Sign up.
-   [ ] Sign in.
-   [ ] Sign out.
-   [ ] English.
-   [ ] Finnish.
-   [ ] Add/edit/delete Garage vehicle.
-   [ ] Dashboard.
-   [ ] GPS.
-   [ ] Map.
-   [ ] Weather.
-   [ ] Record session.
-   [ ] Save session.
-   [ ] History.
-   [ ] JSON export.
-   [ ] GPX export.
-   [ ] Create Club.
-   [ ] Join Club.
-   [ ] Approval flow.
-   [ ] Roles.
-   [ ] Custom ranks.
-   [ ] Branding.
-   [ ] Club Wall.
-   [ ] Create Group Session.
-   [ ] Join Group Session.
-   [ ] Multiple participants.
-   [ ] Live group map.
-   [ ] Participant status.
-   [ ] Lobby.
-   [ ] QR join.
-   [ ] MotoDash Official Session / Challenge creation by admin.
-   [ ] Official activity appears correctly in Lobby.
-   [ ] Official badge/reward completion flow.
-   [ ] Privacy rules.

## Technical validation

-   [ ] No known JavaScript syntax errors.
-   [ ] No broken imports.
-   [ ] No broken GitHub Pages paths.
-   [ ] No duplicate IDs.
-   [ ] No obvious uncaught promise rejections.
-   [ ] Firebase Rules reviewed.
-   [ ] Excessive realtime writes checked.
-   [ ] Existing map/weather APIs still work.
-   [ ] Mobile layout manually tested.
-   [ ] Existing features from before the project expansion still work.

## Required deliverable

Create/update:

``` text
PROTOTYPE_STATUS.md
```

Include:

-   implemented features;
-   incomplete features;
-   known bugs;
-   tested browsers/devices;
-   untested browsers/devices;
-   Firebase architecture;
-   known security/privacy limitations;
-   recommended next steps.

------------------------------------------------------------------------

# 10. Post-prototype roadmap

Only after the prototype has been validated with real users should the
project move toward commercial infrastructure.

## Commercialization phase

Potential next steps:

1.  Validate real user demand.
2.  Validate Free / Rider / Host / Club packaging.
3.  Add Stripe.
4.  Add subscription entitlement system.
5.  Move to commercial map service if required.
6.  Move weather to commercially licensed service.
7.  Add proper production monitoring.
8.  Add legal Terms / Privacy.
9.  Add VAT/GST/sales-tax process.
10. Add production backup/recovery.
11. Improve moderation/reporting.
12. Add shareable public ride pages.
13. Add Ride Memories / Replay if validated.
14. Add Safe Zone.
15. Expand MotoDash Official badges/challenges and add optional Club challenges if retention data supports them.
16. Explore NFC products.
17. Explore merchandise.
18. Explore Featured/Sponsored events.
19. Explore Club Pro / larger organization tier.
20. Prepare architecture and operations for delegation or acquisition.

------------------------------------------------------------------------

# 11. Features intentionally reserved for later

Keep these in product memory but do not let them distract from prototype
completion:

## Ride Memories

Shareable visual route/session cards.

## Ride Replay

Animated playback of a completed session.

## Vehicle Passport

Richer vehicle statistics and identity.

## Expanded Achievements

The prototype includes a minimal MotoDash Official badge/reward system. Richer achievement progression, collections, advanced badge families and long-term gamification remain future features. All progression must remain non-speed-based.

## Club Challenges

Safe engagement mechanics.

## Automated Official Campaigns

Scheduled generation, geo-segmented campaigns, push-triggered official events, sponsor rewards and advanced campaign automation. The prototype uses administrator-configured activities without scheduled server automation.

## Safe Zone

Privacy around sensitive start/end locations.

## NFC

Physical Club/Session joining tags.

## Merch

Branded physical products.

## Featured / Sponsored events

Future B2B revenue.

## Public share pages

Web-based shared ride pages.

## Club Pro

Larger communities and organizations.

------------------------------------------------------------------------

# 12. Product guardrails

The AI and future developers must preserve these decisions unless
explicitly changed by the product owner:

-   MotoDash is not a turn-by-turn navigator.
-   MotoDash is not a speed competition platform.
-   MotoDash is not a full chat application.
-   MotoDash is not a marketplace in the prototype.
-   MotoDash is not a generic social-media feed.
-   The core value is vehicles + communities + sessions + live group
    coordination + discovery.
-   Joining must remain low-friction.
-   Live location must be protected.
-   The UI must remain mobile-first.
-   The platform must remain cross-vehicle.
-   Motorcycles remain an important initial market and brand anchor.
-   Technical permissions and visible Club ranks are always separate.
-   New features should strengthen the core loop rather than simply
    increase feature count.

------------------------------------------------------------------------

# 13. Success criteria for the prototype

The prototype is successful when a real user can complete this flow on a
phone:

1.  Open MotoDash.
2.  Select English or Finnish.
3.  Create an account.
4.  Add a motorcycle/car/other vehicle to Garage.
5.  Start and record a personal session.
6.  See it in history.
7.  Create or join a Club.
8.  See their Club rank.
9.  Create or join a Group Session.
10. Select their Garage vehicle.
11. Start live location sharing.
12. See other permitted participants live on the map.
13. End the session.
14. Browse a public session in Lobby.
15. Join through a link or QR.
16. Export/share their recorded route.

If this flow works reliably and looks credible on real phones, the
prototype is ready for user validation before subscription/payment work
begins.

------------------------------------------------------------------------

# 14. Agent operating instructions

When an AI coding agent receives this file:

1.  Read the entire file before acting.
2.  Start with Section 0.
3.  Do not assume the repository is empty.
4.  Reuse existing working functionality.
5.  Do not rewrite features simply to match this document's example
    architecture.
6.  Adapt the implementation plan to the actual codebase.
7.  Keep this file updated honestly.
8.  Check boxes only after implementation and verification.
9.  Never claim physical-device testing unless actually performed.
10. Stop at every HUMAN CHECKPOINT.
11. Do not proceed without explicit user approval.
12. Before every checkpoint:
    -   review changed files;
    -   inspect console/runtime errors where possible;
    -   check imports/paths;
    -   verify Firebase errors;
    -   verify existing functionality;
    -   summarize exactly what changed;
    -   provide a short manual test list for the user.
13. If a requirement is technically unsafe, impossible, or conflicts
    with existing architecture, explain it rather than silently
    implementing a poor workaround.
14. Never weaken Firebase Security Rules merely to make a feature appear
    to work.
15. Prefer a smaller reliable implementation over a large fragile
    implementation.

------------------------------------------------------------------------

# 15. Audit Result

## 15.1 Scope, evidence and checkpoint

Audit completed on **2026-10-08**, against local commit
`4813196ea98765625a8978fb6dc719d7c8568fc6` (`main`). This is a Section 0
documentation deliverable, not approval to implement any later section.
Only `IDEA.md` was edited. No application code, Firebase configuration,
rules, cloud resources or deployment settings were changed.

The complete specification, all 14 JavaScript files, `index.html`, the
complete stylesheet, manifest, SVG icon, README, package metadata,
`.nojekyll` and `.github/workflows/deploy.yml` were reviewed. The PNG logo
is an existing static asset, referenced by HTML and CSS. No additional
HTML screens, service worker, test files or application dependencies
were found. No repository `AGENTS.md` was found.

At audit start, `IDEA.md`, `firebase-config.js` and `firestore.rules` were
already untracked local files. Preserve them; their presence is not
evidence of deployed Firebase integration. `firestore.rules` is empty.

Evidence levels used below:

- **Implemented** means the feature has a connected code path in the
  inspected application; it does not mean verified on a physical phone.
- **Partial** means a useful foundation exists but requirements or
  integration are incomplete, or a specific defect affects behavior.
- **Missing** means no connected implementation was found.
- **Deferred** means intentionally outside the agreed initial scope.

Read-only checks passed: HTML IDs are unique; all required `dom.js` IDs
exist; relative JavaScript import targets exist; manifest JSON parses;
current published application paths return HTTP 200. Published HTML,
app.js, CSS, manifest and SVG match local text after normalizing line
endings; the PNG matches byte-for-byte. Latest public deployment workflow
reported success for the audited commit.

Limitations: no browser automation tool or JavaScript runtime was
available in this environment (`node`/`npm` were not on PATH). No syntax
execution, browser console session, Firebase emulator tests, GPS ride,
device-orientation test, installation test or multi-device test was
performed. No physical-device verification is claimed. Static findings
below are distinguished from runtime symptoms to be confirmed later.
The Firebase Console, deployed rules, enabled providers, database
contents, billing and Storage availability were not accessed. The public
GitHub Pages settings API returned 404 without authentication; actual
site responses and the checked-in workflow provide deployment evidence.

**STOP: Section 1 and all implementation remain pending explicit human
approval.**

## 15.2 Current architecture and execution flow

The application is a static, Finnish-only, single-screen dashboard with
start/history and GPS-error overlays. It already uses native ES modules
without a build step. Leaflet 1.9.4 CSS and JavaScript load from unpkg;
Leaflet is accessed through the global `L` rather than an ES import.
`package.json` declares `type: module` and `node --test`, but contains no
dependencies and the repository contains no tests.

`js/app.js` is approximately 2,013 lines / 71 KB. Its DOMContentLoaded
closure owns map layers, GPS watch, movement state, timers, local
session history, active session, settings, overlays and event handlers.
It calls smaller reusable modules but still mixes lifecycle, rendering,
persistence orchestration and user interaction.

Current data flow:

```text
index.html -> app.js -> required DOM references
                   -> synchronous localStorage history/settings
                   -> asynchronous IndexedDB history/settings
                   -> Leaflet map + tile provider selected by theme
Start/resume -> Geolocation watch + one-shot startup request
GPS callback -> speed validation -> smoothing -> movement confirmation
             -> moving-time/max calculation -> accepted route points
             -> map position -> weather (15-minute interval)
Session changes -> 600 ms scheduled save -> whole local history
                -> localStorage AND IndexedDB
Finish -> mark completed -> local save -> start overlay
History open -> route on existing map, last route point as map center
```

There is no account system, backend-connected repository layer, router,
Garage, Club, Lobby or Group Session application yet. `gestures.js`
exists but is not imported by the application. The current domain
"session" is a personal recorded ride, not an organized Group Session.
These concepts must remain distinct in future data models.

## 15.3 Feature inventory and IDEA requirement coverage

| IDEA reference / feature | Status | Existing implementation and remaining work |
| --- | --- | --- |
| Principles: static frontend, ES modules, no build, mobile focus | Implemented foundation | Relative assets and ES modules; preserve this deployment model. Mobile reliability and accessibility still require verification. |
| Section 3; 4.1 language preference | Missing localization system | Finnish literals throughout HTML/JS/config/manifest; no dictionary, selector, English default or locale setting. Finnish UI exists but does not satisfy bilingual requirements. |
| 4.1 accounts and profiles | Missing | No Auth SDK, sign-up/in/out, profile screen or account visibility. |
| 4.2 Garage | Missing | No vehicle collection, CRUD, categories, images or visibility. |
| 4.3 vehicle identity | Missing | Personal records and markers have no vehicle/user/category association. |
| 4.4 map, GPS speed, clock, weather, temperature, wind, network/GPS/accuracy | Implemented | `map.js`, `gps.js`, `speed.js`, `weather.js`, app.js HUD. Network display uses navigator.onLine, not actual service reachability. |
| 4.4 distance, moving time, average/max speed | Partial | All displayed and saved locally; movement accounting and maximum validation need corrections in 15.6. |
| 4.5 heading-up | Partial / disconnected | Bearing selection and smoothing exist in map-rotation.js, but app.js never calls its getReliableHeading/updateMapRotation wrappers. Automatic heading-up does not run. North-up toggle and manual rotation exist. Device orientation is absent and remains optional. |
| 4.6 map presets | Partial | Normal, Black & White, Forest, Urban/Asutus and Night exist. Cruising and Water are missing. Presets switch OSM/OpenTopoMap/CyclOSM sources as well as CSS filters; filters target tile pane, but theme rules also change HUD/markers/route color. |
| 4.7 personal recording | Partial | Start/end, IDs, timestamps, active/completed status, route, moving detection, distance and summary statistics exist. No pause button, altitude or weather snapshots are recorded, matching exclusions. Owner/vehicle/category/cloud sync are missing; filtering/recovery defects remain. |
| 4.8 history | Partial | Local list, dates/stats/point count, active/completed labels, resume, rename, delete and clear-all confirmations exist. Completed route opens; vehicle/category/cloud persistence and visible detail statistics are missing. |
| 4.9 JSON, GPX, Web Share/download | Missing | No exporter or sharing code. Local serialization for storage is not JSON export. Public ride URLs remain deferred. |
| 4.10–4.13 groups, visibility, live group map and Host controls | Missing | Only a personal location dot/logo marker exists. No participation, approval, permissions, invitations, network location writes or group lifecycle. |
| 4.14–4.15 participant status/regroup | Missing | Existing GPS/network quality labels are not Rider status. No group separation calculation. |
| 4.16 Lobby | Missing | No discovery, filters, event cards, nearby logic or public data projection. |
| 4.17–4.18 Clubs/membership | Missing | No Clubs, multiple membership, requests, approvals or invitations. |
| 4.19–4.20 technical roles/custom ranks | Missing | No permission model or rank definitions. Must be separate fields and separate security concerns. |
| 4.21–4.22 branding/Info Wall | Missing | Existing product logo and map themes are reusable UI foundations; no Club branding, links or wall. |
| 4.23 Meets/Events and Drive/Convoy concept | Missing | Current recording has no activity type/category. Organized activities must support these without forcing a recorded ride. |
| 4.24 QR joining | Missing | No stable join URLs, invite resolver, QR generation or auth return flow. |
| 4.26 privacy | Partial local-only foundation | No own backend upload currently; precise route history stays in this browser. No visibility controls. Weather coordinates go to Open-Meteo; tile requests reveal viewed areas to providers. This is not full privacy implementation. |
| 4.34 Official activities/minimal platform badges | Missing; late prototype | No system admins, definitions, completion evaluator or grants. Preserve this agreed prototype requirement. |
| PWA / optional browser APIs | Partial | Relative manifest, standalone display, portrait preference, SVG icon, Apple meta tags; Wake Lock/fullscreen feature detection. No service worker or offline shell. Startup actively unregisters service workers. |
| Mobile UX and safety | Partial | Safe-area CSS, portrait/landscape layouts, 44 px main controls, keyboard panel handlers, collapsible HUD and confirmations. Zoom disabled, small history buttons, overflow/clipping and hidden safety text need review. No navigation or speed competition exists. |
| 4.25, 4.27–4.33 and future roadmap | Deferred / absent | NFC, Safe Zone, expanded achievements, Vehicle Passport, Club Challenges, Ride Memories/Replay, sponsored content and merch remain future scope. Minimal Official badges are the explicit exception to broad achievements deferral. |
| Billing/commercial tiers and other Section 6 exclusions | Deferred / absent | No Stripe, subscriptions, commercial entitlement enforcement, full chat/feed, marketplace, route planning or paid provider migration; preserve exclusions. |

Existing additional functionality to retain: saved map theme and heading
mode; migration of older heading-mode values; center/follow button;
automatic initial follow zoom; manual two-finger/mouse/Shift-wheel/Safari
gesture rotation; compass gesture overlay; GPS permission hints/retry;
history naming; recent single-active-session auto-restore; visibility/
pageshow GPS recovery; collapsible top/status/stats panels and controls.
Theme swipe helpers are available but unused, so swipe theme switching
must not be advertised as an implemented user flow.

## 15.4 Reusable modules and existing records

| Existing file | Reuse boundary |
| --- | --- |
| js/config.js | Version, filtering thresholds, provider configuration, storage constants. Replace user-visible theme/WMO text with dictionary keys; retain stable enum IDs. |
| js/dom.js | Required element lookup and validation. Scope new screens independently so missing optional screens do not prevent dashboard startup. |
| js/gps.js | Geolocation support/watch/error helpers. Localize errors and coordinate one subscription/lifecycle. |
| js/speed.js | Raw GPS/fallback speed evaluation, display smoothing and movement hysteresis. Correct validation and sampling assumptions rather than replace algorithms blindly. |
| js/map-rotation.js | Angle/scale/pan math, reliable heading candidates and smoothing. Connect to accepted movement pipeline and verify rotation on real devices. |
| js/map.js | Leaflet initialization, tile switching, follow view and markers. Extend marker ownership and provider options while preserving single-map reuse. |
| js/route-recorder.js | Route acceptance, segment-break representation and polyline rendering. Separate route domain logic from rendering/persistence effects when needed. |
| js/session-manager.js | Record factory, average computation, name normalization, history summaries. Extract history UI at the existing boundary; localize generated HTML. |
| js/session-store.js | IndexedDB/localStorage access. Keep local durability behind a repository adapter; improve transactions/error reporting and per-account ownership. |
| js/utils.js | Haversine/bearing/angle math and duration formatting. Locale-sensitive date/number presentation must use selected language. |
| js/weather.js | Open-Meteo current-data request. Separate WMO codes/data from localized rendering; add stale/error/retry handling. |
| js/ui.js | Safe text updates and collapsed-state helper. Reuse for screen/dialog controls. |
| js/gestures.js | Standalone theme-swipe detector/binder with cleanup. Currently unused; check conflicts with map drag before integrating. |
| css/dashboard.css; index.html | Existing mobile HUD, panel/button styles, compass, start/history/error overlays and map shell. Incrementally add screens; avoid a wholesale redesign. |

Current session shape (numeric epoch milliseconds, meters, km/h):

```js
{
  id: "ride-<epochMs>-<random0..9999>", name: null,
  status: "active", // or "completed"
  startedAt, endedAt: null, updatedAt,
  distanceMeters: 0, movingDurationMs: 0,
  maxSpeedKmh: 0, averageMovingSpeedKmh: 0,
  routePoints: [], lastAcceptedPoint: null,
  stopAnchorPending: false, resumeAnchorPending: false,
  mapTheme: "normal"
}
// Normal point:
{ latitude, longitude, timestamp, accuracy, speedKmh, heading }
// Segment separator:
{ break: true, timestamp }
```

Route separators matter: rendering, migration and GPX export must not
connect a GPS outage/relocated resume with an artificial straight line.
Transient anchors belong in local recorder state, not authoritative
cloud session metadata. Unknown heading is currently coerced to zero,
which conflates missing heading with true north.

Persistence is IndexedDB `moto-dashboard-db`, version 1, stores
`sessions` (keyPath `id`) and `settings` (keyPath `key`). Settings records
are `{ key, value, updatedAt }`. localStorage keys are
`moto-dashboard-sessions-v1` and `moto-dashboard-settings-v1`. Current
settings include `mapTheme` and `mapHeadingMode`; heading values are
`lukittu` / `menosuunta`, with backwards compatibility for `north-up` /
`heading-up`. Migrate to stable language-independent enums with an
explicit compatibility reader, not by translating saved values.

## 15.5 GitHub Pages and Firebase setup audit

- The workflow deploys repository root `.` on pushes to `main` and
  workflow_dispatch, with Pages/OIDC permissions and concurrency control.
  There is no build, test or Firebase Rules deployment step. `.nojekyll`
  is present. Do not assume adding a rules file deploys rules.
- Current base URL is `https://eggheadstudio.github.io/MotoDashboard/`.
  HTML uses `./js/app.js`, `./css/dashboard.css`, `./manifest.webmanifest`,
  `./icon.svg`, and `./EggHeadStudio_logo.png`; CSS uses
  `../EggHeadStudio_logo.png`. Module imports are relative. Manifest
  start_url/scope are `./`. These work under the project subpath.
- Future links must retain `/MotoDashboard/`. Use a hash router, e.g.
  `.../MotoDashboard/#/join/session/<opaque-token>`, rather than bare
  `/ride/ABC123` or `/clubs/123`, which Pages does not rewrite to the app.
  Save and validate the join destination across authentication. Public
  share pages remain future work.
- Firebase snippet identifies project `motodash-87bf8`, its Auth domain,
  Storage bucket and an RTDB URL in europe-west1. This suggests an
  existing project registration; it does not prove any services are
  configured. Reconcile Section 8's project-creation wording with this
  evidence before setup; do not create a replacement project blindly.
- `firebase-config.js` imports the bare specifier `firebase/app` and
  initializes a local `app` variable without exports. It is neither
  referenced by HTML nor imported by app.js. Direct browser loading
  would require resolution that this repository does not provide.
  For the no-build frontend, use pinned Firebase browser ESM URLs and
  export one initialized service module. Firebase documents this
  [browser-module option](https://firebase.google.com/docs/web/alt-setup).
- No Auth/Firestore/RTDB/Storage SDK integration exists. Empty
  `firestore.rules` provides no reviewable security implementation.
  No firebase.json, index definitions or RTDB/Storage rules are present.
  Web config is public configuration, not an authorization mechanism;
  never put Admin SDK credentials or service-account keys in Pages.
- Before Section 2: verify project ownership, desired database locations,
  enabled providers, authorized domain `eggheadstudio.github.io`, localhost
  testing policy, actual deny-by-default rules and provider redirect
  behavior. GitHub project path is not an Auth authorized-domain entry.
  Account/redirect behavior must be tested in target browsers.
- Root artifact deployment would also publish newly committed planning/
  config/rules files. They must contain no server secrets. A future
  allowlist artifact can improve separation without introducing a build.

## 15.6 Architectural defects, duplication and compatibility risks

These findings require future corrections, not changes during this audit.

| Priority | Evidence | Impact and recommended correction |
| --- | --- | --- |
| High | app.js:700 and :717 wrappers have no call sites | Automatic heading candidate selection/smoothing never runs. Connect heading before updating previous/accepted point references; otherwise bearing fallback may compare the current point with itself. |
| High | app.js:561 setMapDraggingForMode is also never called | Native Leaflet drag remains enabled alongside rotation-aware pan handlers. Rotated dragging can have conflicting movement. Apply mode lifecycle consistently and verify zoom/rotation gestures together. |
| High | app.js:1541 uses Math.max(1000, now - prevCoords.t) | Subsecond/duplicate callbacks can count a full second each; stale previous coordinates can credit an outage as moving time. Use geolocation sample timestamps, deduplicate, bound gaps and integrate only validated intervals. |
| High | app.js:1604 startup calls both watchPosition and getCurrentPosition | Both deliver samples into the same state-mutating handler. Prevent duplicate/out-of-order processing and synthetic time increments. Reset speed/reference state at session boundaries and GPS restart. |
| High | route-recorder.js:142–149 stop break only appends a separator | It does not re-anchor/return; the subsequent distance path can still credit a stop-gap displacement. Reset anchor without distance at segment breaks. Prove with stop/resume and teleport/outage fixtures. |
| High | route-recorder.js rejects every jump over 500 m without updating anchor | A legitimate sparse GPS interval can strand recording against an old anchor. Introduce a deliberate gap/re-anchor policy while rejecting impossible motion; do not bridge missing travel as recorded distance. |
| High | app.js:1542 updates max from smoothed speed before route acceptance | A point rejected as a route jump can still influence saved maximum; smoothed display speed is not a validated peak. Separate accepted physical sample statistics from display smoothing. First-point/max behavior also needs review. |
| High | app.js:1264 finishSession never clears watch or releases Wake Lock | Location callbacks and weather requests continue behind start/history overlays. Define dashboard-only vs recording modes and stop subscriptions when no longer needed; live sharing must stop independently on leave/end/logout. |
| High | app.js:1018 loads IndexedDB asynchronously; :1729 auto-restores synchronously | Auto-restore uses the localStorage snapshot; late IndexedDB replacement can overwrite newer state or miss an IDB-only active ride. Await authoritative load before restore/start actions; resolve revisions explicitly. |
| High | session-store.js:114 rewrites/prunes every session; errors resolve like success | Expensive growing full-history writes, last-writer-wins multi-tab risks and hidden quota failures. Use per-record writes, serialized commits, observable results and explicit storage failure UI. |
| High | app.js:1145 save timer captures mutable activeSession | Switching/opening another session or deleting/clearing history can let a pending commit save the wrong record or resurrect deleted data. Capture immutable record identity/revision and cancel/flush on every transition. |
| High | app.js:70 unregisters every service-worker registration returned for the origin | Could affect sibling projects on the same github.io origin. Scope any future cleanup to this app; catch registration/unregister failures. This is not an offline PWA strategy. |
| Medium | Passive touchmove at app.js:836 calls preventDefault | Browsers ignore cancellation in passive handlers and may warn; rotation can conflict with native page/Leaflet gestures. Use a deliberate touch-action/event policy and avoid duplicate handlers. |
| Medium | applyStoredHeadingMode runs before initMap establishes rotation support | A saved heading-up preference can be disabled as unsupported during startup. Restore settings only after capabilities are known. |
| Medium | app.js history detail sets sessionActive=false and hides stats | Completed route renders, but its summary is written into the now-hidden start overlay. Detail statistics are not visible in the map view. Add dedicated read-only detail UI and route fitBounds. |
| Medium | Resume logic repeated in previous-session, selected-history and auto-restore flows | Different follow-zoom, collapsed-state and error handling. Centralize lifecycle transitions; keep one owner for GPS/subscriptions/timers. Existing thin module wrappers are not themselves duplicate algorithms. |
| Medium | map.js repeats load/tileerror handlers; weather data renders directly to DOM | Share lifecycle/status helpers; split service data from UI for i18n and testing. Route recorder similarly mixes acceptance/render/save effects. |
| Medium | GPS validation relies on bounds and current accuracy; Date.now timestamps | Previous accuracy, stale/future/out-of-order positions and acceleration consistency are not robustly checked. Centralize a validated sample pipeline for recorder and live publisher. Do not send raw callbacks to Firebase. |
| Medium | CSS rotates/scales the whole #map | Leaflet attribution/controls, marker labels and future popups rotate too. HUD siblings remain fixed. Scaling can magnify tiles/markers and increase coverage demand. Preserve unrotated controls/identity while avoiding a provider rewrite. |
| Medium | map.js maxZoom=19 for every provider; keepBuffer=12 and repeated redraws | Per-provider zoom support and network/battery/memory cost need measurement. Do not assume OpenTopoMap/CyclOSM share OSM zoom limits or cache policy. Keep current providers pending measured corrections. |
| Medium | Theme CSS modifies HUD text/position dot; app changes route color | This conflicts with tile-only appearance requirements. Separate tile preset from explicit UI/Club branding; retain readable existing defaults during migration. Night inversion is not a verified low-glare preset. |
| Medium | weather.js has no response.ok check, timeout or stale timestamp | app sets lastWeatherFetch before request, delaying failed fetch retry up to 15 minutes; network restoration only changes the status label. Add bounded retry, stale UI and reconnect refresh. |
| Medium | session-manager.js escapes names but interpolates session.id into HTML attributes | Locally generated IDs are constrained, but stored/migrated cloud data needs validation/escaping. Prefer DOM text/dataset assignment. Do not introduce arbitrary HTML for names, walls or marker content. |
| Medium | Local records are not schema-validated or account-scoped | Corrupt records may break rendering; future login/logout can expose another account's cached history on a shared device. Validate migrations and partition local/cloud caches by UID; legacy data remains unclaimed until consent. |
| Medium | Viewport disables zoom; body overflow:hidden; start overlay has no scroll | Large logo/history/text may clip on short screens; landscape columns have large minimum widths. History buttons lack the main controls' 44 px target. Test text scaling, focus, short/narrow displays and longer English/Finnish strings. |
| Medium | Wake Lock/fullscreen detection exists, but release lifecycle is incomplete | Screen lock/background browsers can suspend GPS regardless of PWA status. Never promise uninterrupted background tracking; visible-tab recovery must re-anchor and show gaps. SVG-only Apple icon/install behavior is unverified. |
| Medium | Network labels use navigator.onLine; GPS status has no running stale timer | Connectivity/position freshness can be misleading. Add independent service/error/freshness states; optional APIs must not gate local recording. |

No observed browser console log is claimed. Likely console/runtime
issues from static inspection include passive-listener cancellation,
unhandled service-worker cleanup rejection, storage warnings, tile/CDN
failures and the bare Firebase import if someone loads the unused file.

Provider review: preserve visible map attribution, reduce excessive tile
coverage after measurement, and do not add offline tile downloads.
[OSM's tile policy](https://operations.osmfoundation.org/policies/tiles/)
requires attribution and forbids bulk/offline prefetching. OpenTopoMap
and CyclOSM policies/capabilities need separate checks; the OpenTopoMap
about page could not be retrieved during this audit. Add appropriate
weather attribution and verify prototype usage against
[Open-Meteo's terms](https://open-meteo.com/en/terms), which limit the
free API to non-commercial use. No paid migration is proposed here.

## 15.7 Proposed Firebase architecture and data model

This is a **recommended design for approval**, not a committed schema or
an implementation. Preserve local recording without network/account
dependency. Firebase Authentication supplies stable UIDs; Firestore
stores durable domain records and queryable discovery summaries; RTDB
stores latest live positions/presence/status. Storage is optional for
vehicle/Club images once configured; store references, not image blobs
or base64 data in Firestore.

### Persistent Firestore documents

All applicable records carry schemaVersion, createdAt/updatedAt server
timestamps, validated enums and immutable ownership. Keep existing local
numeric timestamps through an explicit serialization adapter. Visibility
is a policy enforced by rules, not merely a displayed string.

| Path | Proposed fields and access boundary |
| --- | --- |
| users/{uid} | Private preferences/profile: displayName, language=en/fi, profileVisibility, garageVisibility, approximate country/region (optional), createdAt, updatedAt. Owner-only private reads/writes with field allowlists; do not copy Auth email into public profile documents. No client-writable technical role/entitlement fields. |
| publicProfiles/{uid} | Opt-in public projection: displayName and approved public presentation only. No precise location, private preferences or email. Public visibility changes remove/restrict the projection. |
| users/{uid}/vehicles/{vehicleId} | category, nickname, manufacturer, model, modelYear, description, imagePath optional, visibility, timestamps; UID in path establishes owner. Multiple vehicles. Category IDs are stable enums supporting all 12 agreed categories. |
| publicVehicles/{vehicleId} | Optional opt-in Garage showcase projection: ownerUid and explicitly shareable vehicle fields; effective visibility combines profile/Garage/vehicle policy. Implement only needed showcase behavior, not a feed. |
| users/{uid}/sessions/{sessionId} | Private recorded-session metadata: ownerUid, name, vehicleId, vehicleSnapshot, category, groupSessionId optional, status, startedAt/endedAt, distanceMeters, movingDurationMs, averageMovingSpeedKmh, maxSpeedKmh, mapTheme, pointCount, segmentCount, routeVersion, syncRevision, uploadState. No pause/altitude/weather stats. |
| users/{uid}/sessions/{sessionId}/routeChunks/{chunkId} | sequence, schemaVersion, points with segment IDs or preserved break entries, min/max sample timestamp. Bound serialized bytes per chunk; deterministic IDs/retries. Owner-only access, no public route listing. |
| clubs/{clubId} | name, description, ownerUid, visibility, membershipPolicy=open/approval/invite/private, controlled branding, safe links, Info Wall text, timestamps. Split public card from private/member details if required; no unbounded member array. |
| clubDirectory/{clubId} | Public-safe discovery/presentation only for eligible visible Clubs. Private Clubs absent. Membership list and sensitive meeting details stay elsewhere. |
| clubs/{clubId}/members/{uid} | uid, state=active, technicalRole=owner/admin/host/member, rankId nullable, joinedAt. Canonical Club permission source, distinct from rank. Open join cannot grant an elevated role. |
| users/{uid}/clubRefs/{clubId} | Minimal membership navigation index, maintained consistently with canonical membership; not an authorization source. Helps list multiple Clubs without scanning the database. |
| clubs/{clubId}/joinRequests/{uid} | requesterUid, state=pending/approved/rejected, requestedAt, decidedAt, decidedBy. Requester can submit their own request; permitted manager decides. No self-approval. |
| clubs/{clubId}/ranks/{rankId} | name (user-created, untranslated), displayOrder, optional controlled color, timestamps. No permissions. Rank assignment restricted to authorized managers; deleting a rank clears or safely tolerates references. |
| groupSessions/{groupId} | hostUid, clubId nullable, title, description, category, type=ride/drive/meet/event, visibility=public/approval/unlisted/private, startsAt/endsAt, approximate region, lifecycle=scheduled/active/ended/cancelled, capacity optional, branding snapshot, timestamps. Membership/precise-location access follows policy; Host ownership and Club authority checked on writes. |
| groupSessions/{groupId}/details/meeting | Precise meeting point/instructions with explicitly authorized reads, separate from public summary. Public approximate discovery never exposes participant live positions or private route endpoints. |
| groupSessions/{groupId}/participants/{uid} | membershipState=pending/approved/joined/left/removed, vehicleId, vehicleSnapshot, clubRankSnapshot optional, joinedAt/leftAt. Track selected vehicle; never infer backend authority from snapshots. |
| groupSessions/{groupId}/joinRequests/{uid} | Approval workflow and decision metadata, separate from admitted participant authorization. |
| lobbyEvents/{groupId} | Sanitized public projection for public AND approval-required upcoming activities: title, category, type, startsAt, approximate country/region, coarse geo cell optional, clubId/public Club name, capacity/count, joinPolicy, status. No exact participant location, invite secret or private/unlisted listing. Deterministic ID ties it to one Group Session; not a second independent event lifecycle. |
| invites/{inviteId} | Target type/id, issuerUid, token hash, expiry, revokedAt, allowedUid optional, bounded-use policy optional. Trusted token resolver handles acceptance and cannot expose an enumerable secret collection. Unlisted possession permits only the agreed access; a private invite must identify/authorize its recipient. |
| officialActivities/{activityId} | title, localizedDescription {en,fi}, type, eligibleCategories, scope=global/country/region/radius, approximate scope parameters, startsAt/endsAt, state=draft/published/retired, completionRule, badgeId, theme metadata, groupSessionId optional for a real hosted activity, admin UID/timestamps. Normal users read published allowed content only. |
| badgeDefinitions/{badgeId} | Safe digital reward presentation and localized labels/descriptions; platform-admin-controlled. No role/rank effects. |
| users/{uid}/earnedBadges/{badgeId} | activityId, grantedAt, ruleVersion, bounded evidence references, evaluator identity. Deterministic badge document ID prevents duplicate grants; trusted evaluator writes. Decide explicitly whether a recurring activity uses a new badge definition. |
| systemAdmins/{uid} | Manually seeded platform-admin membership; normal clients cannot create/change it. Club ownership/Host roles confer no system-admin access. |

Firestore reads return documents, not a security-filtered selection of
their fields. Public projections must therefore contain only safe data.
Queries must match rules; do not fetch everything and hide private records
in JavaScript. See Firebase's
[query security guidance](https://firebase.google.com/docs/firestore/security/rules-query).

Keep growing route arrays out of session documents. Firestore's
[document limit](https://firebase.google.com/docs/firestore/quotas) is
1 MiB. Use bounded chunks, disable unnecessary indexing of point arrays,
paginate history, and upload metadata/chunks in batches rather than on
each accepted GPS sample. Load route chunks only for detail/export.
Vehicle snapshots preserve history after rename/delete; snapshots must
contain only permitted fields. Vehicle deletion must not delete sessions.

Initial query/index plan: owner history ordered by startedAt; Club
membership navigation via UID refs or deliberate collection-group
queries; participant/request lists scoped to their authorized group;
Lobby upcoming state/date queries with optional category/type/region/
club filters; published official activity/date queries. Add composite
indexes only for supported query combinations, pagination and query
limits. Start nearby discovery with regions/coarse cells; if radius
queries are added, use a reviewed geo-index/bounding-candidate strategy
and exact distance filtering without scanning all activities or storing
precise user location solely for discovery.

### Ephemeral Realtime Database state

```text
liveSessions/{groupId}/control
  { active, hostUid, authorizationVersion }
liveSessions/{groupId}/access/{uid}
  { canRead, canPublish, authorizationVersion }
liveSessions/{groupId}/locations/{uid}/{connectionId}
  { latitude, longitude, accuracy, heading: number|null,
    speedKmh, sampledAt, updatedAt, sequence, vehicleId }
liveSessions/{groupId}/presence/{uid}/{connectionId}
  { connectedAt, lastSeenAt }
liveSessions/{groupId}/statuses/{uid}
  { code: ok|fuel|mechanical|help, updatedAt }
```

`control` and `access` are trusted-server-managed. Each admitted user can
write only their own validated position/presence/status paths, while
permitted active participants can read only that session's live data.
No global/root live read; no public Lobby access even for public groups.
Connection IDs avoid one device/tab disconnect removing another device's
position; select the latest fresh connection per user for display, with
a defined one-publisher policy if recording concurrently is disallowed.

Starting tuning proposal: moving-location publication at most once per
5 seconds and only for fresh accurate valid samples, plus a bounded
stationary heartbeat (e.g. 30 seconds). Mark stale after approximately
30 seconds and hide after approximately 2 minutes; tune from two-device
measurement. These are proposals, not verified thresholds. Stationary
users still need presence/live position, even when no route point is
accepted. Keep live validity distinct from route-distance acceptance.
Use server receipt time for freshness, sample time for movement, bounded
sequence handling and no backlog replay of old live locations.

Register disconnect cleanup before publishing; explicitly remove own
live state/unsubscribe on leave, end, logout and sharing disable. Ended
session control must deny live access, not rely only on every participant
running cleanup. Reconnect rechecks membership/session state and explicit
sharing consent before publishing fresh data. RTDB
[connection/disconnect primitives](https://firebase.google.com/docs/database/web/offline-capabilities)
support this lifecycle but do not guarantee continuous background GPS.
Do not mirror full presence into Firestore or persist a second live
trajectory without a specific requirement.

### Hybrid recommendation and authorization prerequisite

**Recommend Firestore + RTDB for the completed live-group prototype**, but
do not initialize/use RTDB simply because a databaseURL exists. Firestore
is suited to durable/queryable records; RTDB offers native presence and
latest-state streaming. This recommendation follows the application
workload, not a blanket claim that RTDB is always cheaper. Firebase's
[database comparison](https://firebase.google.com/docs/database/rtdb-vs-firestore)
documents the presence distinction. Measure actual update/read/bandwidth
usage before finalizing Section 11.

Critical design constraint: RTDB rules evaluate RTDB state and Auth;
they cannot look up Firestore Club/participant documents. Likewise,
Firestore rules cannot use an RTDB ACL as their document permission
source. See the RTDB
[rule-condition model](https://firebase.google.com/docs/database/security/rules-conditions).
Do not let a client copy its claimed Firestore membership into a
client-writable privileged RTDB access record.

Recommended solution: a small trusted, event/callable backend coordinates
group admission, revocation, visibility and end state, validates current
Firestore authority, and maintains the RTDB ACL. This adds server-side
code outside the static Pages frontend and requires an explicit setup/
cost review before implementation. It does not require scheduled Cloud
Functions and does not introduce a frontend build step. Privileged
membership/lifecycle writes must use this coordinator; rules prevent
clients bypassing it.

There is no atomic transaction spanning the two databases. Design for
idempotent operations and fail-closed partial failure: grant durable
admission before enabling live access; revoke RTDB live permission/
close control before reporting successful leave/removal/end and before
finalizing the durable revocation. Serialize conflicting operations per
group/participant and use authorization versions so an old grant retry
cannot reopen revoked access. Failed transitions remain visibly pending
and are retried/reconciled by a trusted path. An asynchronous Firestore
trigger alone has a revocation delay and must not be presented as instant
privacy enforcement. Location already received by another client cannot
be remotely erased; document this limitation.

If a trusted coordinator is not approved, use **Firestore-only live
locations initially** (group-scoped latest-location documents authorized
directly from Firestore participants), at low frequency with stale-state
handling. Keep the live repository interface replaceable. This preserves
all live-map requirements without insecure cross-database ACLs; native
disconnect presence would remain a limitation, addressed by timestamps.
Alternative RTDB-authoritative group permissions would be a larger model
change and is not the default recommendation.

Estimate before launch: at one update per 5 seconds, one moving user
publishes up to 720 updates/hour; 10 users publish 7,200. Listener fanout
adds reads/bandwidth for each viewer. Benchmark actual payloads, group
sizes, background/reconnect behavior and budget; never connect every
Lobby viewer to all live sessions. Unsubscribe off-screen streams.

### Authorization, rewards and deletion invariants

- Deny by default; validate allowed fields/types/enums, coordinate
  ranges, timestamps, ownership and state transitions. Client physics
  validation improves quality but cannot prove genuine GPS travel.
- Owner/Admin/Host/Member are technical permissions. Custom Club ranks
  and badges never grant permissions. Store platform Host eligibility in
  protected authorization data, separate from editable user profile and
  future billing. Document whether any signed-in prototype user can host
  personal groups and whether Club hosts require Club role authorization.
- Self-joining an open Club/group yields ordinary membership only;
  approval/invite/private flows require independent authorized decisions.
  Enforce owner invariants and transfer/delete policy before Club removal.
- Lobby/public projection publishing/removal is trusted and versioned so
  stale writes cannot republish a newly private activity. Include
  approval-required discovery and preserve Unlisted/Private exclusions.
- Official completion over client-writable multi-session statistics
  cannot be fully secured by a browser evaluator. Use an admin/trusted
  on-demand evaluator with auditable evidence and idempotent grants;
  no scheduler is required. Symbolic rewards can acknowledge that GPS
  records are user-supplied, but clients must not freely grant badges.
- Deletion includes route chunks, indexes/projections, invitations,
  participant/live state and optional Storage images. Firebase documents
  that [deleting a Firestore parent does not delete its subcollections](https://firebase.google.com/docs/firestore/manage-data/delete-data).
  Plan a resumable trusted deletion operation; account deletion must
  resolve owned Clubs and groups before removing identity. Retain only
  explicitly documented necessary history snapshots, not hidden routes.
- Test rules with separate users/outsiders, pending/removed participants,
  role escalation, private/unlisted reads, forged rank/admin changes,
  expired invites, stale operations, route ownership and account changes
  before any relevant section is called complete.

## 15.8 Proposed files and migration boundaries

Retain current module paths first; do not move functioning GPS/map modules
into a new modules/ folder merely to match Section 7's conceptual tree.
Add modules incrementally where responsibilities become clear:

```text
index.html                         existing map/HUD + screen containers
css/dashboard.css                  retained dashboard styles
css/components.css                 extracted shared controls/dialogs
css/garage.css, clubs.css, sessions.css, lobby.css   when screens exist
js/app.js                          gradually reduced composition/lifecycle
js/config.js, dom.js, ui.js, utils.js                retained
js/gps.js, speed.js, map.js, map-rotation.js         retained
js/weather.js, route-recorder.js                    retained/adapted
js/session-manager.js, session-store.js             retained/adapted
js/gestures.js                     reuse only after interaction review
js/i18n/i18n.js, dictionary.js      new bilingual service/dictionary
js/firebase/firebase.js            pinned ESM imports, single app/services
js/firebase/auth.js, firestore.js, realtime.js      service adapters
js/data/session-repository.js      local-first sessions + cloud adapter
js/data/sync-queue.js               UID-scoped durable idempotent outbox
js/data/migrations.js              versioned legacy conversion
js/features/profile.js, garage.js, history.js, sharing.js
js/features/clubs.js, permissions.js, ranks.js
js/features/group-sessions.js, live-group.js, lobby.js, qr.js
js/features/official-activities.js, rewards.js      late prototype
js/ui/navigation.js, dialogs.js, notifications.js   as needed
firestore.rules, firestore.indexes.json             future reviewed rules
database.rules.json, storage.rules                 when services used
firebase.json                       future emulator/rules deploy config
functions/                          only if trusted-backend design approved
tests/                              focused domain/rules tests later
```

These files are proposals; none were created by Section 0. Root
`firebase-config.js` should later become an intentionally imported/exported
configuration source or be migrated to the Firebase service module; do not
leave two initializeApp paths. Avoid directory js/ui.js vs js/ui/ confusion
with explicit relative module filenames; both can coexist without a build.

Legacy migration plan:

1. Preserve original local history/settings; add schema validation and
   versioned conversion, with recovery feedback for invalid records.
2. Keep existing ride IDs as legacy source IDs; generate collision-resistant
   new IDs for new records. Use deterministic source-to-cloud mapping to
   make retries idempotent. Do not silently duplicate history at login.
3. Legacy routes have no account, vehicle or category. Keep them local and
   unclaimed by default; provide an explicit ownership/cloud-upload choice
   after sign-in. Do not attribute old rides to a new default vehicle.
4. Add nullable vehicle/category metadata and honest "legacy/unspecified"
   presentation, then optional explicit user association. Do not invent
   historical identity or recalculate unverified old statistics silently.
5. Preserve segment breaks, meters, milliseconds and raw sample fields;
   adapt timestamps at cloud boundaries. Split routes into bounded chunks
   with deterministic sequence IDs and finalization state.
6. Partition local history/outbox and cloud cache by UID; guest data remains
   separate. Flush only the correct account's jobs, stop listeners/publishers
   on logout, and prevent cached private data flashing for the next account.
7. Use immutable session IDs, revision checks, resumable uploads and deletion
   tombstones so offline retries cannot resurrect deleted rides. Never
   depend on Firebase connectivity to keep recording locally.

## 15.9 English/Finnish requirements and adaptation

Section 1 remains unstarted. Its scope includes existing static HTML text,
ARIA/title/placeholder text, generated history HTML, confirmations/prompts,
GPS/network/map/weather messages, theme names, session fallback names and
summaries. `WMO_CODES` currently contains Finnish descriptions; localize by
WMO key rather than translating weather strings received at runtime.
`formatDate` forces fi-FI, clock manually uses HH.mm and numeric utilities
use toFixed; presentation should use selected-language Intl formatters
while storage/export remains locale-independent.

Use centralized nested en/fi dictionaries and a `t(key, parameters)`
helper with English fallback. English is the default regardless of browser
language unless the user has chosen otherwise. Persist choice locally;
once logged in, apply a documented profile-vs-device preference policy
and save explicit changes to the profile. Set document.documentElement.lang
and refresh dynamic UI when language changes. Manifest currently says fi;
set English metadata by default and document install-metadata language
limitations separately from in-app switching.

Do not translate saved user ride names, vehicle nicknames, Club names,
custom ranks or wall text. Official administrator content can have explicit
en/fi description fields with English fallback. Store stable category,
role, status, type and theme IDs; translate labels only. Handle interpolation,
singular/plural text, aria-live frequency and UTF-8 consistently. Test longer
labels and fallback errors in both languages. Preserve units unless a
separate unit preference is approved. Finnish accent characters in the
UTF-8 files are valid; initial PowerShell default-decoding mojibake was
not evidence of corrupt source content.

## 15.10 Revised order, section dependencies and validation plan

All original product requirements and HUMAN CHECKPOINTs remain. The
section-specific audit adaptation notes above define how each phase fits
the actual code. No future implementation checkbox is marked complete
solely because legacy code contains a similar feature.

Recommended execution after approval:

1. **Section 1:** localization over existing modules and UI; establish
   regression baseline and screen navigation boundaries without building
   social features. Remain English-first with Finnish parity.
2. **Section 4A (new checkpoint, existing-dashboard repairs only):** address
   timestamp/dedup/gap/max/heading/lifecycle/storage-load defects before
   cloud persistence. This is the preservation/repair subset of Section 4,
   not permission to skip its later account/vehicle integration. Verify
   deterministic GPS fixtures and real-device behavior separately.
3. **Section 2:** reconcile the existing Firebase project/snippet; select
   Auth and SDK setup; rules/cost/region/cache decisions. Decide the trusted
   backend prerequisite before committing to hybrid live permissions.
4. **Section 3 then remaining Section 4:** profile/Garage and selected
   vehicle integration while keeping guest/local dashboard useful.
5. **Section 5:** extend the existing recorder through local-first
   repository/outbox/migrations; cloud metadata/chunks and deletion design.
   Do not replace working movement detection with per-callback writes.
6. **Section 6:** reuse local history/route rendering, add visible detail,
   vehicle identity and JSON/GPX/export/share/download. A local backup
   export should precede any legacy cloud migration UI; it is a bounded
   Section 6 dependency pulled into Section 5, not approval to implement
   the entire Section 6 early.
7. **Sections 7–8:** define/enforce minimum technical Owner/Admin/Host/
   Member permissions during Club foundation, before exposing management
   or approval UI. Section 8 completes role tooling/custom visible ranks.
8. **Section 9:** controlled branding/Info Wall; images only after Storage
   rules and availability are verified. Do not change providers for themes.
9. **Section 10:** organized Group Sessions, approval/visibility, explicit
   participation, consent and invite resolution. Establish Pages-safe hash
   links/auth return flow here, using the same resolver needed for Clubs.
   Preserve Drive/Convoy as well as Ride/Meet/Event.
10. **Section 13A (bounded discovery checkpoint):** public/approval-safe
    Lobby projection before live sharing, making public joining testable.
    Complete remaining Section 13 filters/discovery afterward as appropriate.
11. **Section 11:** measured live-group map only after ACL/rules tests and
    privacy checks pass. Explicit consent, freshness, leave/end/reconnect,
    two accounts and preferably two physical devices are mandatory tests.
12. **Sections 12, remaining 13 and 14:** statuses/regroup, full simple Lobby
    and QR generation. URL routing/authorization is already a prerequisite,
    so Section 14 adds QR and cross-phone verification rather than inventing
    a second joining flow.
13. **Sections 15–16:** full privacy audit and mobile polish. Privacy rules,
    cleanup, locale parity, touch/accessibility and error states are required
    in each preceding feature, not postponed until these review sections.
14. **Section 17:** Official administrator activities and safe symbolic
    rewards, with trusted/manual evaluation and deterministic grants.
    Preserve all specified rule types and scope/date/category behavior.
15. **Section 18:** end-to-end validation and PROTOTYPE_STATUS.md. No claim
    of prototype completion until the agreed real-phone flow is verified.

Why reorder: existing correctness defects would otherwise contaminate
cloud session history; authorization is a prerequisite for Club/group
management; public discovery depends on sanitized projections rather
than location streams; stable joins precede QR; privacy cannot wait until
Section 15. Each split/subset still stops for approval. No new payment,
paid map/weather migration, chat/feed, navigation, pause controls or
scheduled automation is introduced.

Specification clarifications preserved for human review:

- Section 6's broad "Achievements" exclusion refers to expanded
  achievements; the explicitly agreed minimal Official badge system in
  Sections 4.34/17 remains in prototype scope.
- Section 10's shorter Ride/Meet/Event checklist must also retain
  Section 4.10's Drive/Convoy concept, with category separate from type.
- Section 4.6's tile-only requirement conflicts with current HUD/route
  theme coupling; separate preset and branding behavior deliberately.
- No-build/static frontend does not prevent a separately deployed trusted
  backend. If backend setup is not approved, choose the documented
  Firestore-only live fallback rather than weakening security.

Manual audit review / later regression checklist:

- Confirm current baseline on phone: start, GPS permission/retry, speed,
  map follow/center, every current theme, north/heading/manual gestures,
  clock/weather and portrait/landscape panel controls.
- Record a stationary/moving/stopped/resumed trip; inspect gap handling,
  time/max/distance, finish, refresh/resume, rename/delete/clear history
  and completed-route statistics. Expect the static defects above until
  their approved repair phase; do not erase valuable history to test.
- Check network loss/restoration, background/foreground, screen lock,
  denied optional APIs, cold launch and local storage failure behavior.
- Review the proposed identity/visibility/Host policy, hybrid coordinator
  prerequisite, legacy-upload consent and Official reward trust model.
- After Firebase implementation is authorized, add emulator/security,
  account-switch, unauthorized-user and two-device tests at the relevant
  checkpoints. Firebase checks are currently **not applicable**, since
  no connected integration was executed.

**Historical Section 0 checkpoint:** The source/deployment/documentation audit
was complete at the recorded baseline. Its initial implementation stop was
superseded only for the user-approved Batch 1 scope described below.

------------------------------------------------------------------------

# 16. Implementation Batch 1 Result (2026-10-09)

This result updates the historical Section 0 audit. Original product requirements
and future phase boundaries remain intact. The user approved three milestones in
one session, each with checks and its own local commit; publication remains unapproved.

| Milestone | Implementation | Executed verification | Remaining acceptance |
| --- | --- | --- | --- |
| 1: English/Finnish | Central dictionary, `t(key, params)`, English fallback, selectors, local language, dynamic UI/ARIA/weather/history/dialog labels and Intl formatting. User names unchanged. | Dictionary parity/fallback/interpolation, dynamic switching, refresh, module linking and dashboard smoke check. | Physical phone/browser checks. |
| 2: Reliability / Section 4A | Existing heading functions connected, shortest rotation transitions, fixed control/HUD layer, map accuracy circle; GPS timestamp/quality/dedup gate; segmented routes after stops/outages; accepted peaks; finish cleanup; async schema v2 restore and per-record storage with fallback; visible completed details. | 36 deterministic domain assertions plus real Leaflet/fixture GPS browser scenarios, active refresh, finish, history, theme cycle, north/heading modes and offline labels. | Real GPS, optional APIs, suspension, provider behavior and multi-tab recording. |
| 3: Firebase/Auth | Dedicated config export; one named lazy CDN initializer; Auth listener/persistence/forms/errors; transactional six-field own profile; language updates; restrictive Firestore and default-deny RTDB files; setup docs. | Mock registration/login/logout/profile/language/failure/retry/refresh and UID guard; real pinned SDK imports/exports and single initialization with cloud APIs blocked; narrow mobile modal. | Console setup verification, rule approval/deployment, rules-engine denial tests and live accounts/profile writes. |

## Architecture after Batch 1

The static frontend retains `app.js`, map/GPS/weather helpers, speed/movement,
route recorder and session/history modules. New `position-pipeline.js` validates
samples before metrics; local storage remains independent of Auth. New i18n modules
bind render callbacks to current language. `auth-ui.js` owns account UI and uses
`js/firebase/{firebase,auth,firestore,profileRepository,realtime}.js` boundaries.
Only Auth and own Firestore profile operations have callers; RTDB has none.
Firebase failures leave local recording usable. No per-GPS cloud writes exist.

Local records use schemaVersion 2, unique IDs and per-record `sessions-v2` storage.
Legacy formats are not migrated; unrelated settings are retained. Shared local
history is device/browser-scoped until a separately approved cloud ownership phase.
Firestore profiles use exactly UID, displayName, email, language, createdAt and
updatedAt; timestamps are server-generated. Language on this device controls UI;
explicit signed-in changes update the profile, with visible failure/retry.

## Review and outstanding work

- [x] Retain modular static Pages-compatible paths; no new app runtime/build dependencies.
- [x] Run native browser syntax/linking, key/path/ID checks and error/rejection monitoring.
- [x] Verify recorded local/history functionality through simulated browser scenarios.
- [x] Prepare dedicated-project config and two restrictive rules files.
- [x] Update README setup and IMPLEMENTATION_STATUS with actual test evidence and limitations.
- [ ] User reviews/approves rules; no publication has occurred.
- [ ] Test rules in Rules Playground/emulator and verify live Auth/profile operations.
- [ ] Manually test physical iPhone/Android, browsers, real GPS, both languages and optional APIs.
- [ ] User approves a subsequent implementation milestone before any Garage/product expansion.

Detailed created/modified file inventory, manual checklist and next recommended
checkpoint are in `IMPLEMENTATION_STATUS.md`. SDK mock results do not prove cloud
permissions. Headless Chromium checks do not prove physical phone, Safari or installed
PWA behavior. Known limits include no background/offline cold start guarantees,
conservative distance/time around interruptions, local storage capacity and concurrent
tabs without a recording lock.

**STOP: Batch 1 is complete as a local implementation and verified preparation.
Wait for explicit approval before further implementation, pushing or deploying.**

------------------------------------------------------------------------

# 17. Implementation Batch 2 (user-authorized scope, 2026-10-09)

The user's Batch 2 request supersedes the Batch 1 implementation stop only for
the eight milestones below. All original future product requirements remain.
No push, Pages publication, rules deployment, Group Sessions, live map, Lobby,
QR, Official Events, Stripe or subscription enforcement is authorized.

- [x] M1: dedicated-project single app/services, shared Auth state and least-privilege
  exact schema rules; real local emulator positive/negative tests. Live acceptance pending.
- [x] M2: Personal Garage CRUD, default/next-ride selection, private owner repository, localized mobile dialog; SDK fixture checks pass.
- [x] M3: compact selected vehicle, pre-start chooser, stable vehicle ID/category/display snapshot; two-vehicle recording and deletion-history checks pass.
- [x] M4: local account isolation, completed-only private manifests/chunks, durable retry/idempotency/revision conflicts and delete fences; mocked 300-point retry/duplicate/logout checks plus real rules assertions pass.
- [x] M5: paged private cloud history, lazy validated route detail/cache, rename/delete fences, JSON v1/GPX 1.1, file share/download; fresh-storage retrieval, rename/delete/reload and exports checked.
- [x] M6: Club CRUD/discovery, open/approval/UID invite/private admission, multiple memberships, leave/archive/safe deletion; browser flows and 84 real rules assertions pass.
- [x] M7: centralized technical permission helpers, Owner/Admin/Host/Member management boundaries, separate custom rank CRUD/assignment; browser role/rank/escalation checks and real rules assertions pass.
- [ ] M8: safe branding and Info Wall.
- [ ] Final Batch 2 regression review/documentation.

Batch 2 data contract: DATA_MODEL.md. Real emulator runner and live/manual
acceptance instructions: tests/RULES_TESTING.md. Each milestone is checked and
committed separately; a checked implementation item never implies deployment,
live Firebase validation or physical phone testing.

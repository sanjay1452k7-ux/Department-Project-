# HackTrack

A mobile-first PWA that replaces the Excel sheets, emails and WhatsApp forwards a
department uses to track hackathons and competitions. Staff post every listing
directly in the app; students discover, search, get notified about and see
recognition for them.

Visitors land on an animated 3D page; from there, two roles get two entirely
separate dashboards — not one screen with permission toggles.

| Admin (staff) | Student |
| --- | --- |
| Add & manage hackathons (full CRUD, every field) | Home feed with filters and sorting |
| Duplicate-as-template for recurring events | Hackathon detail + external **Register** link |
| Add & manage achievements/winners | Achievements feed + personal history |
| Feedback inbox (filter, mark reviewed/resolved) | Search across hackathons and achievements |
| CSV export for reporting | Feedback form + own submission history |
| Dashboard counters, closing-soon list | Push notifications + per-theme preferences |
| | Floating AI assistant |

---

## Quick start

```bash
npm install          # installs both workspaces
npm run seed         # demo staff, students, hackathons, winners, feedback
npm run dev          # API on :4000, Vite dev server on :5173
```

Open <http://localhost:5173>.

Demo accounts (password `hacktrack123` for all):

| Role | Login |
| --- | --- |
| Staff | `meera.k@college.edu` · `arun.r@college.edu` |
| Student | `sanjay.k@college.edu` (Year III) · `priya.n@college.edu` (Year I) · and three more |

You can log in with either the email or the college ID (`22CS041`, `STF001`, …).

### Production-style single-origin run

```bash
npm run build        # builds web/dist
npm start            # API serves the built PWA from the same origin on :4000
```

---

## Tech stack

- **Frontend** — React 18 + React Router + Tailwind, built with Vite. Installable
  PWA: web app manifest, service worker with an offline app shell, push handling.
- **Landing page** — three.js WebGL scene driven by scroll, code-split into its
  own chunk so only visitors to `/` download it.
- **Backend** — Node.js + Express (ES modules), one process serving the JSON API
  and the built frontend.
- **Database** — SQLite via `better-sqlite3`, schema created on boot.
- **Auth** — email/college-ID + password, bcrypt hashes, JWT bearer tokens, a
  `role` field of `staff` or `student` enforced by route middleware.
- **Notifications** — in-app notification store plus Web Push (VAPID) to the
  service worker, so alerts arrive with the app closed.
- **AI assistant** — a single Anthropic Messages API call per question with the
  live `hackathons` collection and a static help doc passed as context. No
  retrieval infrastructure; no API key needed to demo (see below).

### Why SQLite rather than Firestore

The brief allowed "Firestore (or PostgreSQL if preferred)". SQLite keeps the
project runnable and testable with no cloud project, credentials or emulator —
which matters for a department project that gets cloned and marked on a laptop.
The collections map 1:1 onto tables, all access goes through
`server/src/routes/*`, and the JSON-array columns mirror the document shapes, so
swapping the storage layer for Firestore is a contained change. The same applies
to auth: `server/src/auth.js` is the only place that knows how a session is
minted, so moving to Firebase Auth means replacing that one module.

---

## Data model

`hackathons`, `winners`, `feedback` and `users` follow the brief's shapes.
Array fields (`themes`, `eligibility`, `tags`, `members`, `interests`,
`notifyThemes`) are stored as JSON text and expanded by the API. Three
supporting tables carry the notification machinery: `notifications` (the in-app
inbox), `push_subscriptions` (browser Push API endpoints) and `reminder_log`
(one row per hackathon/milestone actually sent, so reminders never repeat).

Every hackathon and achievement records `postedBy`, `createdAt` and `updatedAt`;
hackathons also record `updatedBy`, so every add and edit is attributed and
timestamped.

---

## Feature notes

**Landing page** (`/`) is the front door for anyone not signed in — a WebGL
scene rendered with three.js behind scroll-driven content. A single scroll
value (0 → 1) drives the whole shot: the camera dollies between five framed
positions, the colour theme lerps blue → cyan → violet → amber → green, and the
central "idea core" morphs between five solids (icosahedron → cube → octahedron
→ torus knot → dodecahedron) with a scale bounce on each change. Around it,
seven instanced satellites orbit faster as you descend, and 42 drifting nodes
re-link themselves each frame into a collaboration mesh whose reach widens with
scroll. Sections reveal on `IntersectionObserver`, stats count up, a theme
ticker loops, and the assistant demo types itself out.

It degrades safely: the three.js chunk is lazy-loaded so the dashboards never
pay for it, WebGL failure falls back to the CSS gradient behind the canvas,
device pixel ratio and particle counts are capped on phones, and
`prefers-reduced-motion` renders a single static frame with all content shown
immediately. Signed-in users go straight to their dashboard at `/` instead, and
can revisit the landing page at `/welcome`.

**Search** (`server/src/services/search.js`) is deliberately loose. It tokenises
the query, drops stop words, expands a small synonym map (`ai` → `agentic`,
`machine`; `language` → `nlp`, `llm`, `speech`), applies cheap stemming, then
scores each hackathon and achievement across weighted fields with exact-word >
prefix > substring matching. That is why `"language ai"` surfaces the *Bhashini
Bhasha Setu Challenge* — a differently-named hackathon tagged `language model`
— and why a team name returns what that team won and where.

**Notifications** fire on two triggers:

- *New hackathon posted* — publishing fans out immediately to every eligible
  student, matched on year and, if they narrowed them, their chosen themes.
- *Deadline approaching* — a sweep every 15 minutes sends reminders at 7, 3 and
  1 day before `regDeadline` and on the closing day, with the copy and urgency
  escalating as it nears. A hackathon posted two days before its deadline gets
  the 1-day reminder only, not a burst of every missed milestone.

Students control both categories, plus a theme allow-list, in
Profile → Notifications. Push delivery needs VAPID keys
(`npx web-push generate-vapid-keys`); without them the in-app notification
centre still works in full.

**AI assistant** answers two kinds of question: hackathon queries from the live
collection ("which hackathons is a 2nd year eligible for", "when's the deadline
for the Bhashini one") and app-usage questions from a short help doc
(`server/src/services/help-doc.js`). It is read-only by construction — the
endpoint has no write path — and the system prompt tells it to ignore
instructions embedded in user-authored hackathon or feedback text. Set
`ANTHROPIC_API_KEY` to use the model; without one it falls back to a local
rule-based answerer so the feature still demonstrates end to end.

**Archive & reporting** — closed hackathons stay in the same collection with
`status: "closed"`, reachable from the student feed's status filter and fully
searchable. Admins can export hackathons, achievements or feedback as CSV, with
the current filters applied.

**Status lifecycle** — a hackathon moves `upcoming → ongoing` once its
registration deadline passes and `→ closed` once its last round date does,
recalculated on every scheduler tick. Admins can still override the status by
hand.

---

## Configuration

Copy `.env.example` to `server/.env`. Everything has a working default for local
development; the ones that matter in production are `JWT_SECRET`,
`STAFF_EMAIL_DOMAINS` (so students cannot self-register as staff), the VAPID
keys and `ANTHROPIC_API_KEY`.

---

## Tests

```bash
npm test
```

34 tests over the HTTP API (`server/test/api.test.js`) covering registration and
login, role enforcement on every staff-only route, hackathon validation and CRUD,
duplicate-as-template, eligibility filtering, search behaviour, the achievements
and feedback flows, notification fan-out and mute preferences, reminder
idempotency and urgency, status transitions, CSV export and the assistant. Each
run uses a throwaway database.

The full app (both dashboards and the landing page) has also been verified
end-to-end in a real Chromium browser: WebGL rendering, all scroll stages,
routing guards in both directions, search, achievements, notifications, the
chat assistant, and `prefers-reduced-motion` all confirmed working with zero
console errors.

---

## Project layout

```
server/
  src/
    app.js            Express app and error handling
    auth.js           password hashing, JWT, role middleware
    db.js              SQLite connection and schema
    models.js         payload validation and API serialisation
    routes/            auth, hackathons, winners, feedback, notifications, search/chat/stats
    services/          search, notifications, scheduler, ai, help-doc
    seed.js            demo dataset
  test/api.test.js
web/
  public/              manifest, service worker, icons
  src/
    landing/           3D landing page (Scene3D, scroll-reveal bits)
    admin/              staff dashboard shell and screens
    student/            student dashboard shell, screens and chat assistant
    components/ui.jsx   shared primitives
    lib/                api client, auth context, push helpers, formatting
```

---

## Out of scope (by design)

No email or WhatsApp ingestion, and no AI auto-extraction from external sources.
Every hackathon, achievement and status change enters the system through the
staff-facing forms — one manual source of truth.

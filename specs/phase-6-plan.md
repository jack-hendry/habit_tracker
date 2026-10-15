# Phase 6 — Personal & portable: slicing plan

**Status:** proposed, not started (2026-10-14). This is a *planning* document,
not a spec. Each slice below becomes its own `specs/<name>/` directory
(Analyst → harden → tasks) when it opens. Nothing here is committed to until
its slice opens.

## Goal

Use the tracker from a phone, against one copy of the data, reachable by
exactly one person:

1. **Log a missed day** — complete a habit for a past date you forgot to tick.
2. **Make every page usable on a phone.**
3. **Host it on Fly.io**, locked to a single user.
4. **Move the data to a server**, so phone and laptop see the same habits.

## Why this needs slicing

The four goals touch four different layers, and two of them are patterns this
project has never used:

| Goal | Layer | New pattern? |
|---|---|---|
| Past-day completion | service mutation + day-cell UI | No — generalises `toggleToday` |
| Fly + auth | infra + a new server process | **Yes** — no server, no deploy, no auth exists |
| Server storage | API + DB + every service's load/save | **Yes** — persistence is sync `localStorage` today |
| Mobile layout | SCSS on every page + the shell | **Yes** — `src/` has **zero** `@media` queries; every mockup in `design/target/` is desktop |

As one unit this is Complex by the `CLAUDE.md` table and impossible to verify
in one pass. It also overturns the roadmap's locked architecture decision
("client-side only, localStorage, single device") — that reversal belongs to
slice 6d, and gets its own `AD` entry when 6d's Analyst is written, not before.

## The four slices

| Slice | Name | Size | Depends on | Ships |
|---|---|---|---|---|
| **6a** | `backfill-completion` | Medium | — | Tick / un-tick a habit for a past day |
| **6b** | `mobile-layout` | Complex, sliced per page | 6a | Every route usable at 390 px |
| **6c** | `fly-deploy` | Large | 6b | App served from Fly behind single-user auth; data still per-browser |
| **6d** | `server-storage` | Large | 6c | Habits and stacks stored on the server; one copy across devices |

**Order rationale.**
- **6a first:** client-only, smallest, and it delivers value on day one. It also
  replaces `toggleToday(id)` with a general `toggleOn(id, iso)` — the mutation 6d
  will carry over the wire anyway, so it's better settled before the API exists.
  Its new tappable day cells are then sized for touch in 6b, not retrofitted.
- **6b before hosting:** the point of 6c and 6d is using the app from a phone,
  and they can only be tested there for real once the UI works at phone width.
  Shipping the server first would mean judging it through a desktop layout
  squeezed onto a phone — the UI would hide or confuse what 6c/6d need to
  prove (login flow, sync between devices, save-failure states).
- **6c before 6d:** prove deploy and auth with **nothing sensitive behind them**.
  If the auth is wrong in 6c, the worst leak is an empty app shell; the same
  mistake in 6d leaks your history.

**Interaction with earlier phases.**
- **4c `completion-types`** is still planned and is the slice that bumps
  `STORAGE_KEY` to v2. 6d must decide where migration lives once the server
  owns the data. Recommendation: the server stores each collection as an
  opaque, versioned JSON document and the **client** keeps running `load()`'s
  migrations — then 4c and 6d stay independent and can land in either order.
  6d's localStorage import must accept both `habits.v1` and `habits.v2`.
- **5 notifications** said it would "force the backend conversation". 6d *is*
  that conversation; revisit Phase 5's approach (Web Push from the server)
  once 6d ships.

---

## Slice 6a — `backfill-completion`

**Today:** `toggleToday(id)` (`habit.service.ts:177`) is the only completion
mutation, and no day cell anywhere is clickable — the calendar, habit-detail
month grid and day strip render status only.

**In scope**
- `HabitService.toggleOn(id, iso)`; `toggleToday` becomes a one-line caller.
- Guards inside `toggleOn` (not in components): reject a future date and a date
  before the habit's start. Every derivation is computed live (AD-004), so
  streaks, rates and calendars update with no further work.
- UI: tap a day in the habit-detail month grid to toggle it. A fast path on
  the dashboard for the commonest case — "I forgot yesterday".

**Out of scope**
- Bulk editing ranges of days. Per-day notes. A "logged late" marker (it would
  need a new field on every completion — a model change for no stated need).

**Decisions for the Analyst**
- **How far back?** Unlimited, or a window (e.g. 7 days)? Unlimited is simpler
  and honest; a window guards against fat-finger edits to old history.
  Recommendation: unlimited, with an undo affordance.
- **Paused days and not-due days.** Can you complete a day the habit was paused
  or not scheduled? `dayStatus` already has rules for both — decide whether a
  completion there counts, is ignored, or is refused.
- **Archived habits.** Editable from their detail page, or read-only?

**Done when:** you can tick and un-tick yesterday and an older day; streak and
stats update immediately; a future date and a pre-start date are refused at the
service level (tested); tests green.

---

## Slice 6b — `mobile-layout`

**Today:** no breakpoints anywhere in `src/`; fixed widths; every mockup is a
desktop capture, so the design-check loop has nothing to compare a phone
layout against.

**Approach:** the same per-page slicing that worked for the redesign (§0–§4).

1. **6b.0 — foundation.** Breakpoint tokens, the global shell's navigation on
   a narrow screen (a bottom tab bar is the usual answer), 44 px minimum touch
   targets, and a rule for hover-only information (tooltips) since a phone has
   no hover.
2. **6b.1 … 6b.n — one page per slice:** dashboard, habits, habit-detail,
   calendar, analytics, stacks.

**Prerequisite:** mobile mockups in `design/target/` (e.g. `dashboard-mobile.png`
at 390 px) — drawn in Claude Design, or agreed rules if no mockup is wanted.
Without them, `design:shot --width 390` has nothing to compare against and the
check degrades to "looks fine to me".

**Watch for:** the wide data views — heat grid, activity grid, month grid, bar
chart — which can't just shrink. Decide per view: scroll horizontally, shorten
the window, or reflow.

**Done when:** every route at 390 px has no horizontal page scroll, readable
text, touch-sized controls, and a passing design check against its mobile
mockup.

---

## Slice 6c — `fly-deploy`

**In scope**
- A small Node server (one process) that serves the built Angular app and,
  from now on, enforces auth on **every** route — static files included, so
  there is no unauthenticated surface to reason about.
- `Dockerfile` (multi-stage: `ng build` → slim Node runtime), `fly.toml`,
  `force_https`, a single machine.
- Deploy is `fly deploy` by hand at first; a CI deploy job is a later Small task.
- Server tests — a new runner, since Karma only covers the browser. Choosing
  it is part of this slice.

**The auth decision (the Analyst's main job)**

| Option | Phone experience | Strength | Cost |
|---|---|---|---|
| **App-level password + session cookie** *(recommended)* | Log in once; a 30-day cookie keeps the home-screen app signed in | Strong if: Argon2-hashed password in a Fly secret, `HttpOnly; Secure; SameSite=Strict` signed cookie, login rate-limited | ~1 file of server code; no domain needed |
| HTTP basic auth | Browser prompt; clunky in a home-screen web app; no logout | Weakest — credential sent on every request, no rate limit by default | Smallest |
| Cloudflare Access in front | Email one-time code or Google login | Strong, with 2FA for free | Needs a domain on Cloudflare, **and** the server must verify Access's JWT — otherwise the `*.fly.dev` URL bypasses it |
| Private network only (Tailscale / Fly WireGuard) | VPN must be on to use the app | Strongest — no public endpoint at all | Daily friction on a phone |

Recommendation: app-level password + cookie. It's the only option that is both
strong and frictionless on a phone without extra infrastructure. Add a second
factor (TOTP) later if wanted.

**Security baseline, regardless of option:** HTTPS only + HSTS; secrets only
via `fly secrets`, never in the repo or image (see the `repo-hygiene` skill);
security headers (CSP, `X-Content-Type-Options`, `frame-ancestors 'none'`);
no account-creation endpoint — the single user is configured, not registered.

**Done when:** the app loads at the Fly URL only after login; a request without
the cookie gets 401 on every path (tested); wrong passwords are rate-limited;
`fly secrets list` holds the only copy of the credential.

---

## Slice 6d — `server-storage`

**Shape (recommended):** two documents, not a relational schema — one user,
whole-array saves, which is exactly what `persist()` already does.

- `GET /api/habits`, `PUT /api/habits`, same for `/api/stacks`.
- SQLite on a Fly volume; each document stored with a `version` integer.
- `PUT` sends the version it read; the server rejects a stale one with `409`
  and the client reloads. Two open devices then can't silently overwrite each
  other — the one real multi-device risk.

**Client work — where the effort actually is**
1. **Loading becomes async.** Both services load synchronously in their
   constructors today. `habit-detail.component.ts` depends on that: its
   constructor redirects to `/habits` when the habit is missing, which is safe
   only because "there is no window in which a real habit reads as missing".
   With a server there is one, so **every deep link to `/habits/:id` would bounce
   to the list.** Needs a `loaded` signal (or a route resolver) and that guard
   rewritten. Audit every component for the same assumption.
2. **Save failures become real.** `persist()` swallows errors by design. Over a
   network that loses data silently — needs at least a visible "not saved" state
   and a retry.
3. **One-time import.** On first load, if the server is empty and localStorage
   isn't, upload it. Then stop reading localStorage.

**Decisions for the Analyst**
- Offline: keep a localStorage cache and sync later, or require a connection?
  Recommendation: require a connection for v1 — offline sync is its own
  Complex slice.
- Backups: Fly volume snapshots alone, or Litestream streaming SQLite to object
  storage? A volume lives on one machine; losing it without a backup loses
  everything.

**Done when:** a habit ticked on one device shows on another after reload; a
stale write returns 409 and the client recovers; deep links to `/habits/:id`
work cold; a forced save failure is visible in the UI; existing local data
imports once; tests green on both sides.

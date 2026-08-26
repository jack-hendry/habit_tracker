# STATE — archive

Overflow for `STATE.md`. When that file gets unwieldy (~300 lines), old
`AD` (decisions) and `B` (blockers) entries and closed Quick Tasks move here.

Rules:

- **Lessons (`L-NNN`) never move here.** They are permanent and stay in
  `STATE.md`.
- Numbers are preserved exactly — moving an entry never renumbers it.
- A moved entry leaves a one-line stub in `STATE.md` pointing here, so a
  citation like "supersedes AD-004" is always resolvable.
- Superseded decisions are moved here, not deleted. The reasoning that turned
  out to be wrong is the most useful part of the record.

## Decisions

**AD-001 — Client-side only: localStorage, single device, no backend.**
(2026-07-16, `ROADMAP.md`) No accounts, no server until a phase explicitly
demands one. Buys a shippable Phase 1 in hours instead of days. Known expiry:
Phase 5 (notifications) is the phase that forces the conversation.

**AD-002 — Corrupt rows are dropped, never coerced.**
(2026-07-17, `archive/2026-07-17-habit-checklist` R3, reaffirmed
`scheduling-streaks` R1, `habit-metadata` R7, `habit-lifecycle` R4) `isHabit`
rejects any row with a present-but-malformed field; the row is discarded on
load. Only *absent* fields are backfilled with defaults. Coercing corrupt data
produces a habit that looks fine and silently reports wrong numbers — the
worst failure mode for a tracker whose entire value is its history.

**AD-003 — Dates are constructed as local calendar dates, never parsed from ISO.**
(2026-07-17, `scheduling-streaks` R2/R5) `new Date(y, m-1, d)` from split
parts, never `new Date('2026-07-17')` — the latter parses as UTC midnight, so
in negative-offset timezones `getDay()` returns the previous weekday. One
shared helper derives the start-of-history boundary so every derivation agrees.

**AD-004 — Derivations are live and pure, never stored.**
(2026-07-17, Phases 2–3) Streaks, completion rate, day status and lapsed-ness
are computed from `completedDates` + `schedule` on every read. `habits` is a
signal, so changing a habit recomputes everything with nothing to invalidate.
Cost is trivial at this scale (`scheduling-streaks` R10) and it removes a whole
class of stale-cache bugs.

**AD-005 — History is unrepresentable in an edit patch, not stripped at runtime.**
(2026-07-23, `habit-metadata` R1/R2) `update` takes an explicit `HabitPatch`
type rather than `Partial<Habit>`, so `id` / `createdAt` / `completedDates` are
a *compile* error rather than a silent runtime no-op the caller cannot see.
Validation is atomic: any invalid key rejects the whole patch. Extended by
AD-007.

**AD-006 — Colour never carries meaning on its own.**
(2026-07-23, `habit-metadata` R8/R10/R16) Status owns the colour channel that
was already encoding status (calendar day cells, the dashboard's status
border); habit colour appears only as decoration alongside an icon and a text
label, and moves to a different element where it would collide. Two meanings on
one channel makes the important one unreadable.

**AD-007 — `status` is `'active' | 'archived'`; paused is derived.**
(2026-07-23, `habit-lifecycle` R1/R2/R5/R6, supersedes the three-value union
proposed in `phase-4-plan.md`) Paused-right-now is fully determined by "is
there an open `pausedRange`?", so storing it too creates two facts that drift.
`PausedRange.to` is **exclusive** — `[from, to)` — so same-day pause/resume is
a well-formed empty range instead of an inverted one. Archive opens a range and
reactivate closes it, so an archived stretch accrues no missed days. Because
`pausedRanges` determines what *was* due, it is history and stays out of
`HabitPatch` per AD-005 — reachable only through the named transitions.

**AD-008 — `specs/STATE.md` is the project memory; root `STATE.md` is a
run-marker only.** (2026-07-23) The two files had drifted into duplicate,
disagreeing status tables. Memory (decisions, blockers, lessons, quick tasks)
lives here, next to the specs it is extracted from. Root `STATE.md` keeps only
the `## Executing: <spec>` marker that `enforce-haiku-tasks-pretooluse.sh`
greps for, plus a pointer here — the hook reads the repo root and is not worth
re-pointing.

**AD-009 — The redesign's visual language lives as CSS custom properties on
`:root` in `src/styles.scss`; there is no shell-level content width.**
(2026-07-26, `global-shell` §2.5, R10/R12) Two halves of one decision. (a)
Colours, radii, the content padding and the font family are declared once as
tokens — including the status accents, declared ahead of their first use so
roadmap §1–§3 *consume* rather than re-sample them. The accepted cost is a few
inert `:root` lines until their section lands; the alternative is three sections
each sampling their own green. Hex literals are banned from component SCSS for
any value that has a token. (b) The shell imposes **no** `max-width` on
`<router-outlet>` — the prototype gives each page its own centered column
(Dashboard 960 / Habits 1000 / Calendar 900 / Analytics 1000 / Stacks 900), so
the width is a per-page concern. The roadmap's "~1150px shell column" was a
paraphrase and is superseded.

**AD-010 — "Completion rate" means one thing: pooled due-days.**
(2026-08-18, `dashboard-redesign` §3.1) `HabitService.poolCounts(habits, from,
to)` returns `{done, countable}` over an inclusive window, pooled across habits;
the Dashboard header, the LAST 7 DAYS card and the month-over-month delta all
divide it. This **supersedes the mean-of-per-habit-rates** the header used
before: mean-of-rates gave a habit created yesterday the same weight as one with
six months of history, so adding a habit moved a number that describes the past.
The window arithmetic is `completionRate`'s contract lifted verbatim, `isDueOn`
guard included — `dayStatus` reports `'done'` before `'not-due'`, so without the
guard an off-schedule completion inflates the numerator alone and the header
prints >100%. Analytics (roadmap §4) consumes the same primitive. Falls out:
habits exist but no due day has resolved → `—`, not `100%`.

**AD-011 — "Longest active streak" is the longest *running* streak, and names
nobody when there is none.** (2026-08-18, `dashboard-redesign` §3.2, R3)
`topCurrentStreak` reduces `currentStreak`, not `longestStreak` — *active* is
load-bearing in the label, which is why the card can name an owner and why the
number drops the day a streak breaks. It returns `null` rather than a
zero-streak winner, so the card cannot credit an arbitrary habit with a streak
of nothing. The roadmap's "aggregate `longestStreak` + owner" is superseded.

**AD-012 — Perfect-days and the overall rate read `activeHabits`, so archiving
edits the past.** (2026-08-18, `dashboard-redesign` §3.3, R4) Archiving a habit
removes it from every *past* day too, so days it used to spoil become perfect
retroactively and the count can go **up**. Kept deliberately, consistent with
what the header has always done (`habit-lifecycle` R10); the alternative makes
archiving cosmetic and puts two different histories on one page. Named as a
decision so nobody "fixes" it into an inconsistency — see L-008.

**AD-013 — The stat card is a shared component from its first use.**
(2026-08-18, `dashboard-redesign` §3.6) `<app-stat-card>` in
`src/app/shared/stat-card/` owns the label / value / inline-unit / sub triad and
shows **either** a sub-line **or** a progress bar, never both. Roadmap §4 reuses
it for the Analytics cards; building it inline on the Dashboard meant restyling
it twice. `:host` is the card — no wrapper element — so it behaves as a grid
item wherever it is dropped.

**AD-018 — The habit-detail month grid keeps its own palette; `missed` is grey.**
(2026-08-18, `habit-detail` §2b, Analyst §2.9 D) `circleFor` in the prototype is
a **second** palette over the same `dayStatus`, not a reuse of the Calendar
page's. A missed day is `--circle-missed-bg` / `--circle-missed-text` (grey), not
`--missed` (red). Two pages, two intents: the Calendar is a status grid across
habits, while this is one habit's own record and the design deliberately chooses
not to shout at you about it. Reusing `CS` here would paint a per-habit page in
alarm colours the design drops on purpose. The Calendar page stays red — do not
"align" them. Pinned by an acceptance criterion that asserts the missed cell is
**not** `--missed`, because this is the kind of difference a later reader
flattens for consistency.

**AD-019 — `/habits/:id` is the first per-entity route, and it reads `habits()`,
not `activeHabits()`.** (2026-08-18, `habit-detail` §2b, Analyst §2.9 E/F) Every
prior route is a static path. Two consequences worth pinning: (1) an unknown or
malformed id **redirects to `/habits`**, not to a 404 — the app has no designed
404 page, and the `**` route already redirects rather than rendering one; (2) the
component resolves against `habits()` so an **archived** habit's detail page
still renders, which is what makes a deep link, or a back-button press right
after archiving, resolve instead of bouncing. Only `/habits` filters by status.
The route sits between `habits` and `**`: `path: 'habits'` is a full-path match
and cannot swallow `/habits/x`, but the wildcard can.

**AD-020 — Cell fills are page-scoped tokens; a status name is not a colour.**
(2026-08-19, `calendar-redesign` CriticReview R1) `--cal-done-bg` (#dcfce7)
and `--cal-missed-bg` (#fee2e2) exist *because* `--done-bg` (#f4fbf6) and
`--missed-bg` (#fdf4f4) already exist and are different colours. Same status,
same product, two values, because they do different jobs: the Dashboard's are
pale washes behind a text row on white, the calendar's are saturated fills for
a 52px block that must read as colour at a glance. The Analyst assumed one
status meant one value and asserted the calendar's fills were already
tokenised; building that would have washed every done cell to near-white while
AC 3's raw-hex grep, the build and the suite all stayed green — a token *was*
being used, just the wrong one. `not-due` had no token at all: its #f3f4f6 /
#d1d5db lived only as literals inside `calendar.component.scss`. Naming a token
after its **status** invites the collision; these are named after their
**page**. Before reusing a status token on a new surface, compare the hexes —
the name will not warn you (L-012's rule, one level up).

**AD-021 — The prototype's dataset shape is not adopted, only its style.**
(2026-08-19, `calendar-redesign` §3.6 + CriticReview R3) Two non-adoptions on
one page, one rule. (a) The source's `statusOf` has a **sixth** state, `off`
(#fafaf9 fill, #c2c6cc numeral), for real days before its dataset begins —
in its March, `off:-20` puts days 1–20 there. `HabitService.dayStatus` folds
"before creation" into `not-due` and keeps five `DayStatus` values; a sixth
would mean a service change, a seventh legend item and new spec surface, for a
state that exists only because the prototype has 126 days of history. (b)
`Prev`/`Next` grey out at `calM === 0 / 4` in the source; `monthGrid` takes an
arbitrary year/month with no bound, so copying that condition would cap the
app's calendar at whatever range happened to match the fake data. Both are the
same failure: **a prototype's data-shape artifacts are indistinguishable from
product decisions in a screenshot.** Sample the colours, never the dataset's
limits. The colour pair for the disabled arrows was still sampled faithfully;
only the *condition* that switches between them was dropped.

**AD-022 — A design-conformance spec asserts computed style against the
design source.** (2026-08-19, follow-on to `calendar-redesign`)
`*.design.spec.ts` — `src/app/calendar/calendar.design.spec.ts` is the first —
reads `getComputedStyle` on probe elements and compares against values
transcribed from the `.dc.html`. Three properties are load-bearing and all
three are easy to lose: (a) expected values come from the **design source, not
the component's SCSS** — copying the SCSS yields a change-detector that agrees
with whatever the component happens to say and catches nothing; (b) the
assertion reads **computed style, not stylesheet text**, because only a real
cascade catches a rule that is correct and never fires (L-025); (c) it uses
**probe elements carrying the component's `_ngcontent-*` attribute rather than
seeded data**, so it is date-independent — a habit crafted to produce all five
statuses has no past days on the 1st and no future days on the 31st. Proven by
mutation, not by being green: pointing `--cal-done-bg` at #f4fbf6 fails it, and
so does collapsing a day-number colour to grey. This is the mechanism that
covers what a screenshot structurally cannot (L-026).

**AD-023 — The leaderboard ranks by `lifetimeCounts`, not `completionRate`.**
(2026-08-19, `analytics` CriticReview R1/R2) The leaderboard plan originally
bound rows to `completionRate(habit)`, which returns `1` for a habit with no
resolved due day — a brand-new habit would rank first at 100%, contradicting
AD-010's `countable === 0` → `—` rule — and the fraction it returns is 0–1, not
0–100, so binding it straight to `width:{rate}%` renders 1px-wide bars. Fixed
by scoring each row from `HabitService.lifetimeCounts(habit)` directly:
`countable === 0` rows render `—` with a 0-width bar and sort last regardless
of tie order, everyone else gets `Math.round(done/countable*100)`.
`completionRate` itself is unchanged — it is pinned by the Dashboard and
Habit-detail specs — this is a second, per-habit caller choosing the right
primitive instead of the closest-sounding one.

**AD-024 — The bar chart and weekday "best" highlight the maximum, not "today"
or an arbitrary tie-winner.** (2026-08-19, `analytics` §0.1, "§4's version of
AD-011") The 14-day bar chart highlights `bb.v === mx` in the prototype — the
tallest bar — not the current day's bar; getting this backwards produces a
page that matches the mockup today and is wrong every other day.
`BarChartComponent.isHighlighted` follows suit, with one deliberate deviation
from the source: when every bar is zero, the app highlights nothing rather
than all bars, so a habit-free window doesn't paint every column in the
accent colour. The weekday card's "best day" pick is the same case one level
up — earliest weekday wins a tie, matching `topCurrentStreak`'s documented
tie rule — and a page with no resolved weekday (`bestRate === null`) names no
best day, echoing AD-011's "returns null rather than crediting nothing."

**AD-025 — Analytics needs three separate per-day derivations, not two.**
(2026-08-19, `analytics` CriticReview R10, extends AD-014) `dailyPooledRates`
(heatmap) is due-guarded like `poolCounts`; `dailyDoneCounts` (bar chart) is a
raw completion tally with no `isDueOn` guard, like `recentStatuses`. Merging
them into one per-day pass — tempting, since both walk the same date range —
would force one of the two callers to consume the wrong semantics, which is
exactly the unification AD-014 forbids for the day-strip vs. the rate.
Confirmed, not new: the reasoning is now written into the Analyst directly
instead of living only in AD-014's original context, so a future reader
touching either derivation sees why they don't collapse.

**AD-026 — `<app-heat-grid>` stays a separate component from the
day-strip/activity-grid family.** (2026-08-19, `analytics` CriticReview R11,
extends AD-018) The heatmap's cell shape (`rate: number | null` per day, a
five-step colour ramp) and the day-strip family's shape (a status enum,
per-habit colour) are different input contracts and different colour modes on
the same "grid of days" geometry. AD-018 already established, for the
habit-detail month grid vs. the Calendar page, that shared geometry does not
imply a shared component when the two modes are mutually exclusive — the same
call applies here instead of parameterising one component with a mode flag.

**AD-027 — `--heat-4` and `--bar-max` are `--accent` by identity, not by a
coincidentally equal hex.** (2026-08-19, `analytics` §6) Both tokens are
declared as `var(--accent)` rather than a re-sampled `#0066cc` literal. They
are the same colour because they are the same design role — the heatmap's
topmost activity step and the bar chart's highlight are both "this is the
accent, doing its job as the strongest signal on the page" — and aliasing
says so in the token itself instead of leaving two literals that happen to
agree today and can silently drift apart in a future edit.

**AD-028 — Native HTML5 drag-and-drop, not Angular CDK.**
(2026-08-21, `stacks` §3.1) Stack reordering within and between cards is
implemented with native `draggable` attributes and `dragstart`/`dragover`/`drop`
event listeners, not `@angular/cdk/drag-drop`. The prototype uses the same
native APIs; `@angular/cdk` is not a project dependency and adding it for one
page is a cost the source does not pay. Transient drag state lives in the
component (`{ from: string | null; habitId: string }`) and is never persisted.

**AD-029 — Stack colour/glyph are palette ids; the palette gains indigo,
coffee, moon, clock.** (2026-08-21, `stacks` §3.2) `Stack.color` and
`Stack.aglyph` store `HABIT_COLORS` and `HABIT_ICONS` ids, never raw hex or
emoji, matching the project invariant that `Habit.color` and `Habit.icon`
follow (AD-004 at the service level, habitat-metadata R9). Two prototype
values fall outside the existing palette: `#6366f1` (indigo) and the three
emoji ☕ / 🌙 / ⏰. The palette expands rather than the rule breaking:
`HABIT_COLORS += { id: 'indigo', label: 'Indigo', hex: '#6366f1' }` and
`HABIT_ICONS += { id: 'coffee', label: 'Coffee', glyph: '☕' }, { id: 'moon',
label: 'Night', glyph: '🌙' }, { id: 'clock', label: 'Time', glyph: '⏰' }`.
Additive and back-compatible — `colorOf`/`iconOf` already fall back for unknown
ids, and existing habits gain three new icon options.

**AD-030 — A habit belongs to at most one stack.**
(2026-08-21, `stacks` §3.3) Adding a habit to stack B removes it from stack A.
Settled by the prototype source, not invented here — `dragTo` splices from the
origin and `addChips` filters on `!stacks.some(x => x.items.includes(k))`.
Consequence: the Unstacked tray is the well-defined complement of the union of
all stack `habitIds`.

**AD-031 — Deleting a habit prunes it from stacks; archiving hides it.**
(2026-08-21, `stacks` §3.4) Two distinct rules. A **deleted** habit has its id
removed from every stack and the change persists immediately. An **archived**
habit keeps its `id` in `habitIds`, the row does not render in `visibleHabits()`,
and it is excluded from the "N of M done today" counts. Reactivating restores
it to its original position. Mechanism: `StacksService` runs an `effect()` over
`habitService.habits()` and prunes ids with no matching habit, using `untracked()`
on reads so the write cannot re-trigger. Archived habits are still in `habits()`
(not `activeHabits()`), so the distinction holds. Side note: `HabitService.archive()`
opens a pause range, so an archived habit already reads `isDueOn() === false`.

**AD-032 — Stack editing is inline, not modal.**
(2026-08-21, `stacks` §3.5) The inline editor pattern follows
`HabitFormComponent`: an `input<Stack | null>` signal gates the render, with
`save()`/`cancel()` outputs from the form. The editor takes over the card's
header in place of the static name/time/anchor display. Consistent with the
house pattern; no modal primitive exists and the design provides no mockup for
one.

**AD-033 — `Model:` is a mandatory `tasks.md` step field.**
(2026-08-21, `model-tiering` §3) Allowed values are `haiku`, `sonnet` and
`top-level` — **never `opus`**. The mapping rule is mechanical: *a step is
`sonnet` if and only if its `Done when` requires looking at an image; everything
else is `haiku`.* `top-level` exists because
`protect-spec-docs-from-subagents.sh` denies subagent writes to `tasks.md` /
`Analyst.md` / `CriticReview.md`, so a wrap-up step cannot be delegated at all.
Enforced by grep in the critic pass rather than by a runtime fallback, because an
absent field silently inherits `~/.claude/settings.json` (`"model": "opus"`,
`"effortLevel": "high"`) — the most expensive possible default — and making
absence a *visible* defect is the entire point. The gate needs its non-zero
guard: `steps=$(grep -c '^### Step ' tasks.md)` then
`[ "$steps" -gt 0 ] && [ "$(grep -c '^\*\*Model:\*\*' tasks.md)" = "$steps" ]`.
Without the guard a file whose headings sit at another level compares 0 to 0 and
passes vacuously — which is exactly the state this spec's own `tasks.md` was in
when the critic pass caught it.

Paired change: `enforce-haiku-tasks-pretooluse.sh` now returns `ask` (not `deny`)
when the **top-level** session runs a verification command — `npm|pnpm|yarn
test|build|design:shot`, `ng test|build`, `scripts/design-shot.mjs` — while a
marker is live. `ask` not `deny` so a stale marker costs one keystroke instead of
a lockout (the B-002 failure mode). `verify_re` is anchored to a command position
so `grep -rn "npm test" specs/` and `cat scripts/design-shot.mjs` stay allowed;
`npm start` is deliberately unmatched because `design:shot` needs the dev server
already running. Deny remains the fall-through, so `npm test > src/app/out.log`
still denies. Known false negative: a wrapper prefix (`time npm test`) slips
through — acceptable, since the decision is ASK.

## Blockers

**B-001 — The Haiku-enforcement hook denied every non-`.md` edit in the repo.**
(2026-07-23, resolved) `enforce-haiku-tasks-pretooluse.sh` fired whenever the
string `tasks.md` appeared in the last 60 transcript lines — and merely
*reading* `STATE.md` put it there, so unrelated Small tasks were blocked with a
message about a spec run that was not happening. Fixed by keying the hook to an
explicit `## Executing: <spec>` line in the root `STATE.md`, which the session
adds when a run starts and removes when it ends. See L-004.

**B-002 — The Haiku-enforcement hook was dormant for every run, shadowed by its
own documentation.** (2026-08-18, found while starting `habit-detail` run 1,
resolved) The hook resolves the active spec with `grep -m1 -E '^## Executing: '`
on the root `STATE.md` — **first match wins**. That file's own explanatory
section contains an unindented example line, `## Executing: <spec-dir-name>`,
inside a code fence at line 11. `grep` does not know about fences, so the hook
read the spec name as the literal `<spec-dir-name>`, found no such directory, and
exited 0 — **dormant** — no matter what real marker was added below it.

So the fix for B-001 shipped a guard that never fired: `dashboard-redesign` and
`habits-redesign` both ran with top-level edits unblocked, and nothing reported a
problem, because a guard failing open is silent by construction. Verified by
simulating the hook's own grep before the `habit-detail` run rather than
trusting the marker.

Fixed by indenting the documentation example two spaces so it no longer matches
`^## Executing: `, with a note in the file explaining why the indent is load-
bearing. See L-019.

**B-003 — There is no keyboard or touch reordering.**
(2026-08-21, `stacks` §3.1) Native HTML5 DnD is mouse-only. The `+ Add habit`
chip picker provides a non-drag way to add items to a stack, so the page is not
unusable without dragging — but reordering within or between stacks is drag-only
and inaccessible to keyboard and touch users. Accepted cost of AD-028.

**B-004 — The NOT TODAY pill's background and padding have no oracle.**
(2026-08-21, `model-tiering` §3) The prototype writes both as bindings
(`{{ h.ntBg }}`, `{{ h.ntPad }}`), so there is no CSS rule to transcribe and no
value to assert. `habit-list.design.spec.ts` therefore asserts only the pill's
literal declarations — `10px`, uppercase, `.5px` letter-spacing, `4px` radius,
`#a3a7ad` — and those two declarations remain unverified by anything. Narrower
than first reported: `.not-scheduled` *does* have a CSS rule
(`habit-list.component.scss:217`); what is missing is the oracle for two of its
declarations, not the rule. Inventing values to close the gap is the failure
mode; the gap is recorded instead.

## Quick Tasks

*(none yet)*

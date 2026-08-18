# Analyst — Redesign §2: Habits

Roadmap section: `specs/design-implementation-roadmap.md` §2.
Design source: `Habit Tracker Prototype.dc.html` in the Claude Design project
[Habit tracker design exploration](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19),
lines 93–139 (markup) and 405–453 / 556–573 (the `renderVals()` script).
Mockup: `design/target/habits.png` (1440 CSS px, `deviceScaleFactor: 2`).

Size: **Medium** — a restyle of an existing page, one new pure service
derivation, and two new presentational components. No new route, no new
persisted entity, no data-model change, no `STORAGE_KEY` bump. 12 steps.

The one genuinely new *pattern* is the modal (§3.5) — the project has never had
one. That is why §3 spends four decisions on it and why the critic round is
pointed there.

---

## 1. What problem are we solving?

`/habits` is the page where habits are created and maintained, and it is the
page furthest from the target. Today it opens with an always-visible add form —
a text input and two radios sitting above the list before the user has asked to
add anything — and each habit renders as a text row: a checkbox, an icon, a
name, and a meta line of unstyled spans.

The target turns each habit into a wide card whose **right half is a 30-day
completion strip**, so the list answers "how is this habit going" without a
click, and moves creation behind a `+ New habit` button so the page opens on the
habits themselves.

Three things make this more than a restyle:

1. **The 30-day strip does not exist in any form.** It is per-day *status*, not
   per-day done/not-done, and the app has no derivation that returns a window of
   statuses (§3.1).
2. **Removing the inline add form removes the only way to create a habit.** The
   replacement is mandatory, not optional, and the prototype does not design it
   (§3.5).
3. **The schedule label is wrong in two ways** that only show up against the
   target: the separator, and Mon–Fri not collapsing to `Weekdays` (§3.4).

---

## 2. Values sampled from the prototype source

Read out of the `.dc.html`, not eyeballed from the PNG (skill `design-to-roadmap`
→ "re-derive exact values from source"; L-011). Everything below is a literal
from the source unless marked *derived*.

### 2.1 Page column

```
max-width: 1000px; margin: 0 auto; padding: 28px 24px 48px;
```

`28px 24px 48px` is the `--content-pad` token (AD-009). **1000px, not the
Dashboard's 960px** — each page carries its own column and the shell imposes
none (global-shell AD-009). The page uses 800px today.

### 2.2 Header and controls bar

Header: `display:flex; align-items:center; justify-content:space-between;
margin-bottom:18px`.

| Part | Value |
|---|---|
| `h1` | `margin:0; font-size:23px; letter-spacing:-0.3px; color:#16181c` |
| `+ New habit` | `padding:9px 16px; background:#0066cc; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; font-family:inherit` |

Controls bar: `display:flex; align-items:center; gap:8px; margin-bottom:16px`.

The source right-aligns `Show archived` with an empty `<span style="flex:1">`
between it and the chips. **Use `margin-left: auto` on the button instead**
(CriticReview R8): the app wraps its whole category-filter block in
`@if (categories().length > 0)`, so on a fresh store the block — and a
transcribed spacer with it — vanishes, leaving `Show archived` flush left on
exactly the screen a new user sees first. `margin-left:auto` renders identically
with the chips present and correctly without them. The rendered result is what
is being matched, not the markup.

| Part | Value |
|---|---|
| `Category:` | `font-size:12.5px; color:#75797f` |
| chip (both states) | `padding:5px 12px; border-radius:999px; font-size:12px; font-weight:600` |
| chip, active | `background:#0066cc; color:#fff; border:1px solid #0066cc` |
| chip, inactive | `background:#fff; color:#4c5057; border:1px solid #d7d7d4` |
| `Show archived` | `padding:7px 13px; background:#fff; border:1px solid #d7d7d4; border-radius:6px; font-size:12px; color:#4c5057; font-family:inherit` |

The active chip is a **solid blue fill**, unlike the nav's active pill, which is
a pale `--accent-tint` (global-shell §2). Two pills, two treatments; do not
unify them.

### 2.3 The row

List: `display:flex; flex-direction:column; gap:10px`.

Row: `display:flex; align-items:center; gap:16px; background:#fff;
border:1px solid #e8e8e6; border-left:4px solid {habit hex};
border-radius:8px; padding:13px 18px`.

Children, in source order:

**1 — Checkbox.** `width:22px; height:22px; border-radius:6px; flex:none;
display:flex; align-items:center; justify-content:center; font-size:13px;
border:2px solid {bd}; background:{bg}; color:#fff; box-sizing:border-box`,
where done → `bd`/`bg` both `#0066cc` and the content is `✓`, and not-done →
`bd:#c9cdd2`, `bg:#fff`, empty.

**2 — Middle column.** `flex:1; min-width:0; display:flex;
flex-direction:column; gap:7px`, holding two rows:

- Name row: `display:flex; align-items:center; gap:8px` — glyph at
  `font-size:16px`, name at `font-size:14.5px; font-weight:600; color:#16181c`.
- Meta row: `display:flex; align-items:center; gap:10px; font-size:12px;
  color:#75797f`, with six children:

| Child | Value | Text |
|---|---|---|
| schedule | `background:#e9f1fa; color:#0066cc; font-weight:600; padding:3px 8px; border-radius:4px` | `Daily` / `Mon · Wed · Fri` / `Weekdays` |
| category | `background:#f1f1ef; color:#4c5057; font-weight:500; padding:3px 9px; border-radius:999px` | `Mind` |
| streak | `color:#e8590c; font-weight:700` | `22 🔥` |
| best | inherited | `best 22` |
| rate | `color:#0066cc; font-weight:700` | `87%` |
| not-today | `color:#a3a7ad; text-transform:uppercase; letter-spacing:.5px; font-size:10px; border-radius:4px; background:#f4f4f2; padding:3px 7px` | `not today` |

The **schedule chip is blue in every case**, including `Daily` and `Weekdays` —
the roadmap's "or a blue `Mon · Wed · Fri` pill" implies only the weekday
variant is blue. It is not; there is one chip style. It is also a **4px
rounded rectangle**, while the category chip beside it is a **999px pill**.

`best 22` is a plain `best N` — the template says `best: {{ n }}` today.

**3 — Strip column** (§3.1). `display:flex; flex-direction:column; gap:4px;
align-items:flex-end`; cells row `display:flex; gap:2px`; each cell
`width:8px; height:22px; border-radius:2px`; label
`font-size:9.5px; color:#a3a7ad; letter-spacing:0.4px; text-transform:uppercase`
reading `Last 30 days`.

*Derived:* 30 × 8px + 29 × 2px = **298px**. Measured on the target at
x = 645…943 CSS px → 298px. ✓

**Uppercase rule (CriticReview R7).** Every uppercase string on this page —
`not today` and `Last 30 days`, and nothing else — is **sentence case in the DOM
and uppercased in CSS**. Transcribing `LAST 30 DAYS` into the template looks
identical and reads as shouting to a screen reader. Same trick as the stat-card
labels (`dashboard-redesign` §2.2).

**4 — Actions.** `display:flex; gap:6px`; each button
`padding:7px 11px; background:#fff; border:1px solid #d7d7d4; border-radius:6px;
font-size:12px; color:#4c5057; font-family:inherit`. `Delete` differs in exactly
two properties: `border-color:#eec4c4; color:#c92a2a`.

### 2.4 New tokens

Four values in §2.2–§2.3 have no token yet:

```scss
--streak:         #e8590c;            /* the streak count + flame */
--strip-missed:   #e9e9e7;            /* a due day that was not completed */
--strip-not-due:  #f5f5f3;            /* a day the habit was not scheduled */
--pill-muted-bg:  #f4f4f2;            /* the NOT TODAY pill */
--backdrop:       rgba(0, 0, 0, 0.32); /* the modal's ::backdrop (§3.5 D) */
```

`--backdrop` is the one *invented* value here (§3.5 Decision D — no mockup
exists for the modal). It is a token rather than an inline `rgba()` because
AD-009 is about tokens, not about hex notation, and an inline `rgba()` would
slip through AC 3's grep — the one hardcoded colour this spec introduces would
be the one the criterion cannot see (CriticReview R6).

These are four distinct near-grays and must stay distinct (L-012 — a sampled
value is exact, including how close it is to its neighbour). In particular
`--pill-muted-bg` (`#f4f4f2`), `--strip-not-due` (`#f5f5f3`) and `--chip-bg`
(`#f1f1ef`) are three different values on the same row, and collapsing them is
the obvious-looking cleanup that must not happen.

Every other colour in §2.2–§2.3 already has a token: `#0066cc` `--accent`,
`#e9f1fa` `--accent-tint`, `#f1f1ef` `--chip-bg`, `#4c5057` `--text`,
`#16181c` `--text-strong`, `#75797f` `--text-sub`, `#a3a7ad` `--text-faint`,
`#d7d7d4` `--control-border`, `#e8e8e6` `--border`, `#c9cdd2`
`--checkbox-border`, `#eec4c4` `--danger-border`, `#c92a2a` `--danger-text`,
`#fff` `--surface`.

---

## 3. Decisions

### 3.1 The strip is per-day *status*, and `pending` renders as `missed`

The source builds it as `h.days.slice(N-30).map(d => ({ c: d.done ? h.hex :
d.due ? '#e9e9e7' : '#f5f5f3' }))` — three outcomes, not two. The roadmap's
critic called the missed cells "light red/gray" and said *"Ship-side-project
shows red gaps"*. **There is no red in the strip.** Both non-done states are
near-grays, and the only thing separating them is `#e9e9e7` vs `#f5f5f3`.
Sampled from the target at the `Morning run` row: due-and-missed reads
`rgb(233,233,231)`, not-scheduled reads `rgb(245,245,243)`. Building it with a
red would have been visible from across the room and was one paraphrase away.

The prototype has three day states; `DayStatus` has five. The mapping:

| `DayStatus` | Cell |
|---|---|
| `done` | the habit's hex |
| `missed` | `--strip-missed` |
| `pending` | `--strip-missed` |
| `not-due` | `--strip-not-due` |
| `future` | `--strip-not-due` |

`pending` is the one that needed deciding, and the target settles it rather than
taste: today is Thu Jul 23, `Read 20 pages` is daily and **unticked**, so its
final cell is `pending` — measured at `rgb(233,233,231)`, i.e. the missed
colour. `Morning run` is not due on a Thursday and its final cell measures
`rgb(245,245,243)`. Both confirmed against the target, not assumed.

This is also the behaviour that makes the strip feel live: the last cell fills
with the habit's colour the moment the checkbox is ticked.

`future` cannot occur in a window that ends today; it is mapped for totality, so
the component has no unhandled branch.

**New derivation.** `HabitService.recentStatuses(habit, days, today?)` returns
`DayStatus[]` of length `days`, oldest first, ending on today inclusive. Pure,
like every other derivation (AD-004) — it walks `shiftIso` backwards from today
and calls the existing `dayStatus`. It lives on the service rather than in the
component because it is history arithmetic, and because §4 (Analytics) needs the
same walk for its heatmap.

**No `isDueOn` guard — deliberately (CriticReview R4).** `dayStatus` checks
`done` *before* `not-due`, so a day completed off-schedule, or completed during
a pause, returns `'done'` and gets painted in the habit's colour on a day it was
not due. `dashboard-redesign` §3.1 established the *opposite* discipline one
spec ago — `poolCounts` must ask `isDueOn` first, or an off-schedule tick lands
in the numerator with nothing in the denominator and the header prints `112%` —
so this looks like an inconsistency and is not:

> A **rate** is an average over obligations, so a day carrying no obligation
> must not enter it. A **strip** is a record of what happened, so a day you did
> the thing is coloured, obligation or no.

`recentStatuses` therefore calls `dayStatus` raw. Pinned by a spec (AC 10) so
the next reader does not "fix" it into agreement with `poolCounts`.

### 3.2 The strip is a shared component

`<app-day-strip>` in `src/app/shared/day-strip/` — inputs `statuses:
DayStatus[]` and `hex: string`, renders the cell row plus the `Last 30 days`
label. The status → colour mapping is its only logic, and putting it in a
component with a spec is what stops that mapping being retyped for the habit
detail page (§5) and for §4.

It also serves the open Quick Task *"Split `HabitListComponent`"*: that
component's SCSS is 7.82 kB against a 6 kB budget, and this slice would
otherwise add the row restyle, the strip and a modal to the same file. §3.5
moves considerably more out.

### 3.3 The checkbox stays interactive on a day the habit is not due

The source disables it: `cbCur: dueToday ? 'pointer' : 'not-allowed'`, and
`toggle: () => { if (!h.days[T].due) return; … }`.

**Do not copy this.** Off-schedule completion is settled law in this app
(`habit-lifecycle` R9, and `dashboard-redesign` §3.5 depends on it — the TODAY
card counts the *due* set precisely so an off-schedule tick cannot print
`6 of 5`). Adopting the prototype's guard would remove a behaviour two earlier
specs decided to keep, to match an interaction a static screenshot cannot show.

Nothing is lost visually: an unticked checkbox looks identical whether or not
the habit is due, which the target confirms (`Morning run` and `Sleep by 11pm`
are both not-due-today and both render the ordinary empty box). The `NOT TODAY`
pill is what communicates the state, and that we do build.

### 3.4 The schedule label gains a separator and a `Weekdays` collapse

`getScheduleLabel` returns `labels.join(' ')` — `Mon Wed Fri`. The source
renders `Mon · Wed · Fri`, and renders `[1,2,3,4,5]` as **`Weekdays`**, not as
five names.

Decision, in order:

1. `daily` → `Daily`
2. `weekdays` with days exactly `[1,2,3,4,5]` → `Weekdays`
3. otherwise → day labels joined with `' · '`

No `Weekends` case. `[0,6]` would be the symmetric collapse and the prototype
has no such habit, so there is no sampled label for it; inventing one is exactly
the paraphrase this section exists to catch. Noted for §5 if it ever needs one.

The separator is U+00B7 MIDDLE DOT with a space either side, matching the
shell's date format (`Thu · Jul 23, 2026`).

### 3.5 One form component, two hosts — and the modal is undesigned

**The `+ New habit` button in the prototype is dead.** Line 97 carries no
`onClick`, and there is no modal, overlay, or `position:fixed` markup anywhere
in the file (`+ New stack` on the Stacks page *does* have a handler, so this is
an omission, not a convention). The mockup shows the button and nothing behind
it. Every decision below is therefore ours, and none of it can be verified by a
design check — which is the reason to write it down here rather than discover it
in the template.

The constraint that makes this mandatory rather than optional: deleting the
always-open add form deletes the only way to create a habit.

**Decision A — extract `<app-habit-form>`.** The inline edit form already
collects every field a create flow needs (name, description, category, colour,
icon, notes, start date, schedule) plus three warnings (backdate, future start,
schedule-change). Duplicating ~150 lines of template into a modal is not a real
option. `src/app/shared/habit-form/` owns its own draft signals, takes
`[habit]: Habit | null` to prefill, and emits `(save)` with a `HabitPatch` and
`(cancel)`. `null` means create.

**Decision B — the modal hosts create; edit stays inline.** The roadmap's critic
allows either ("the existing inline edit form can stay as the Edit target even
if Add becomes a modal") and this takes the smaller change: Edit's behaviour is
untouched, so no existing spec changes meaning. Both hosts render the same
`<app-habit-form>`, so there is one form to style and one to fix.

**Decision C — native `<dialog>`, opened with `showModal()`.** It brings the
focus trap, the `Esc` handler, inertness of the page behind it and a `::backdrop`
for free. A hand-rolled overlay would mean writing all four, none of which a
screenshot verifies and all of which are how modals go wrong. Closed by
`Cancel`, by `Esc` (native), and by the `close` event — which must reset the
`creating` signal, or the second `+ New habit` click opens a stale form.

**The element is always rendered; its contents are wrapped in `@if (creating())`**
(CriticReview R2). The two obvious shapes both fail, in opposite directions:

- `<dialog>` *inside* `@if` — the element does not exist when the click handler
  runs, so `showModal()` throws.
- `<dialog>` always rendered *with* its contents — `<app-habit-form>` is
  constructed once and its draft signals survive a close, so the second
  `+ New habit` re-opens the previous half-typed habit, failing AC 6.

Rendering the element but gating the contents gets both: the element is always
available to `showModal()`/`close()`, and the form is destroyed and rebuilt on
every open, which makes "empty on re-open" **structural** rather than something
a `reset()` call has to remember.

**Decision E — the modal and the inline editor are mutually exclusive**
(CriticReview R3). Nothing clears `editingId` today, so both can be open at
once: an expanded edit form in row 3 with a modal over the top of it. `Esc` then
closes the modal and reveals it, which reads as though the modal edited that
row. So `openCreate()` clears `editingId` and `confirmingDeleteId` before
opening, and `startEdit()` closes the dialog if it is open.

**Decision D — the modal's chrome is derived, not sampled.** No mockup exists,
so it takes the page's existing tokens and the one shape the design already
shows for a floating surface: `background:var(--surface); border:1px solid
var(--border); border-radius:var(--radius-card)`, `padding:22px 24px`,
`max-width:520px`, a `17px/700 --text-strong` title reading `New habit`, and
the `+ New habit` button's own `--accent` fill on the primary action.
`::backdrop` is `rgba(0,0,0,0.32)`. Invented values, marked as invented; if a
mockup ever arrives, this paragraph is the diff.

### 3.6 The meta row wraps at 1440px, and that is the target

`Morning run` in `design/target/habits.png` renders `Mon · Wed ·` / `Fri` on two
lines, with `2` / `🔥` and `best` / `14` stacked beside it, and the row is
visibly taller than the other five. That is not a capture artifact — it is what
the source's own CSS does when the widest schedule label and the `NOT TODAY`
pill share a `min-width:0` flex column with a 298px strip to its right.

**Decision: reproduce it.** The row is built from the sampled properties in
§2.3 and nothing else, so the wrap falls out. Adding `white-space: nowrap`, or
letting the strip shrink, would make that one row look better and make the page
stop matching the target — and the acceptance criterion is the target.

Recorded because it is the single most likely thing for a design-check round to
"fix". If it is ever to be fixed, it is a change to the *design*, upstream of
this spec. Flagged to the user in the wrap-up.

### 3.7 Archived rows keep their current behaviour

The mockup has no `Show archived` view (the button is present, its result is
not). The roadmap's critic is explicit: keep what the app does. Archived rows
keep the simplified content and the lone `Reactivate` action, restyled onto the
new card shell (§2.3's container) and **no strip** — a strip on a habit that is
no longer accruing days is a claim about nothing.

### 3.8 Four elements the target cannot show are kept, not deleted

The active row today renders four things the prototype has no equivalent for,
because the mockup has no habit in any of these states — exactly as it has no
archived habit (§3.7). "Absent from the target" is not "should be deleted";
removing them would silently undo `habit-lifecycle` R7/R8 and `habit-metadata`,
and nothing in the design asks for that (CriticReview R5).

| Element | Rendered when | Where it goes in the new row |
|---|---|---|
| `Paused` badge | `isPaused(habit.id)` | name row, after the name |
| `Paused since {date}` | same | middle column, between name row and meta row |
| `{{ habit.description }}` | the habit has one | middle column, between name row and meta row |
| `Starts {date}` | `startDate` is in the future | meta row, **replacing** the rate (as today's `@else if` already does) |

None are verifiable by the design check — a screenshot of six unpaused,
undescribed demo habits shows none of them — so they get specs instead. Per
CriticReview R1 there are no existing ones to lean on.

---

## 4. Scope

### In

- The five tokens in §2.4.
- `HabitService.recentStatuses` + specs.
- Widening `HabitService.add` to return `Habit | null` (CriticReview R11) — the
  modal collects the full field set but creation is two calls (`add` then
  `update`), and `add` returns `void`, so there is no id to apply the metadata
  to. Purely additive; every current caller ignores the return.
- `getScheduleLabel` per §3.4 + specs.
- New `src/app/shared/day-strip/` + specs.
- New `src/app/shared/habit-form/`, extracted from the existing inline edit
  form, with the drafts and the three warnings moving with it.
- `src/app/habit/habit-list.*` restyled to §2, with the always-open add form
  replaced by `+ New habit` → `<dialog>`.

### Out

- **The habit detail page.** The prototype's habit *name* is a link
  (`onClick="{{ h.open }}"`, hover `#0066cc` + underline) to a `page: 'goal'`
  view the roadmap does not mention at all: a colour-tinted hero with a 56px
  streak number, an all-history heatmap and its own month nav (source lines
  247–300). It is a **whole new page** and its own Large section. This spec
  renders the name as static text — **not** as a dead link — and the roadmap
  gets a new section. See §6.
- **Analytics, Stacks, Dashboard, Calendar.** `<app-day-strip>` is built here
  and consumed by them later.
- **Disabling the checkbox on non-due days** (§3.3) — a deliberate non-adoption.
- **A `Weekends` schedule label** (§3.4) — no sampled value exists.
- **The `Uncategorised` filter chip's existence.** The prototype hardcodes
  `['All','Health','Mind','Work']`; the app derives categories from the data and
  adds `Uncategorised`. The app's behaviour is correct and stays; only the chip's
  *styling* is in scope.
- **Hover, focus and error states.** No mockup; a static screenshot cannot
  verify them (`CLAUDE.md` → Design comparison).
- **Responsive / narrow-viewport behaviour.** The mockup is 1440px only.
- **`STORAGE_KEY` bump / any data-model change.** `recentStatuses` is a pure
  read (AD-004).
- **The `UNCATEGORISED` NUL-byte Quick Task.** Adjacent, unrelated, still open.
- **Committing.** Ask first.

---

## 5. Acceptance criteria

Each is checkable by a command or by one look at `design/compare/habits.png`.

1. `npx ng test --watch=false --browsers=ChromeHeadless` → **≥165 passing**,
   zero failures. The baseline is **134**, confirmed by that exact command
   before any step ran; 29 new specs are budgeted in CriticReview R10.
2. `npx ng build` succeeds with **no budget warning at all**. Today it prints:

   ```
   ▲ WARNING  src/app/habit/habit-list.component.scss exceeded maximum budget.
              Budget 6.00 kB was not met by 1.82 kB with a total of 7.82 kB.
   ```

   The criterion is that this line is **gone**, not that it got no worse
   (CriticReview R9). Budgets are `anyComponentStyle`, 6 kB warn / **10 kB
   error**, so the file sits 2.18 kB from a hard build failure while this spec
   adds a row restyle to it — the extractions in §3.2/§3.5 are what make the
   restyle possible, which is why `tasks.md` orders them first.
3. `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/habit/habit-list.component.scss
   src/app/shared/day-strip/*.scss src/app/shared/habit-form/*.scss` returns
   **nothing** — every colour comes from a token (AD-009). The grep covers
   `rgba(` as well as hex so `--backdrop` cannot be inlined past it
   (CriticReview R6). The habit's own hex is bound inline from `colorOf` in the
   *template*, never written in SCSS.
4. The page column is `max-width: 1000px` — **not** the Dashboard's 960px, and
   not the 800px used today.
5. The header is `My Habits` + a `+ New habit` button; the controls bar is
   `Category:` + chips + a right-aligned `Show archived`. The always-visible add
   form is **gone** from the page.
6. `+ New habit` opens a modal containing name, description, category, colour,
   icon, notes, start date and schedule; saving creates the habit and closes it;
   `Cancel` and `Esc` close it without creating. Re-opening shows an **empty**
   form, not the previous draft. Covered by specs.
7. `Edit` still opens the inline form in place, with every field prefilled, and
   still saves through `HabitService.update`. **There are no existing specs for
   this page** (CriticReview R1 — `habit.service.spec.ts` is the only spec under
   `src/app/habit/`), so the extraction of `<app-habit-form>` has no regression
   net and this criterion is met by **new** specs, not by old ones passing. They
   must cover at minimum: prefill from `[habit]`, `canSave`, `scheduleChanged`
   compared **by value** (`habit-metadata` R12 — a careless move to a new
   component is exactly where that regresses to `!==`), and `backdateWarning`
   reading its `[habit]` input rather than the parent's `editingHabit()`.
   Opening the modal must close an open inline editor, and vice versa (§3.5 E).
8. Each active row renders, left to right: a 4px left border in the habit's
   colour, a 22px checkbox, glyph + name, a meta row of schedule chip / category
   chip / `N 🔥` / `best N` / `N%` / `NOT TODAY` (last only when not due today),
   a 30-cell strip with a `LAST 30 DAYS` label, and
   `Pause · Edit · Archive · Delete`.
9. The strip is 30 cells of 8×22px at a 2px gap (298px total), coloured by
   §3.1's five-way mapping. Covered by day-strip specs including **both**
   `pending → --strip-missed` and `not-due → --strip-not-due`, which are the two
   the target was measured to settle.
10. `recentStatuses(habit, 30)` returns 30 statuses, oldest first, last element
    = today's status. Covered by specs including a habit whose `startDate` falls
    inside the window (the days before it are `not-due`, not `missed`) and a day
    completed **off-schedule**, which must report `done` — the no-`isDueOn`-guard
    decision in §3.1, pinned so it is not later "fixed" into agreement with
    `poolCounts` (CriticReview R4).
11. `getScheduleLabel` returns `Daily`, `Weekdays` for exactly `[1,2,3,4,5]`,
    and `' · '`-joined names otherwise. Covered by three specs.
12. Archived rows (via `Show archived`) still show the simplified card with only
    `Reactivate`, and **no strip**. The four state-dependent elements of §3.8
    still render on an active row when their state holds — `Paused` badge,
    `Paused since`, description, `Starts {date}` — each covered by a spec, since
    the design check cannot see any of them.
13. `DESIGN_BASE_URL=… npm run design:shot -- habits --width 1440 --seed`
    produces `design/compare/habits.png` in which the six rows, their strips and
    the controls bar line up with the target — **including** the wrapped
    `Morning run` meta row (§3.6). Judged on the composite; anything that looks
    off is then **measured** against `design/target/habits.png`, never re-judged
    by eye (L-011).

---

## 6. Roadmap correction

`specs/design-implementation-roadmap.md` needs a new section for the **habit
detail page** (§4 Out). It is reachable only from this page, it is the
prototype's sixth view, and the roadmap's §2 critic pass missed it because the
name looks like text in a screenshot — the link exists only as an `onClick` in
the markup. That is the same class of miss as the nav colours living in the
trailing script (skill `design-to-roadmap`), and it is worth a lesson.

---

## 7. Retrospective

**Did `Analyst.md` catch anything not thought about up front?**

Four things, all from reading the prototype's source rather than its screenshot:

1. **The strip has no red in it.** The roadmap's own critic pass said missed days
   were "light red/gray" and that *"Ship-side-project shows red gaps"*. The
   source maps them to `#e9e9e7`, a near-grey, and not-scheduled days to
   `#f5f5f3`. A red strip would have been visible from across the room and was
   one paraphrase away from being built (§3.1).
2. **`+ New habit` is a dead button in the prototype** — no `onClick`, no modal
   markup anywhere in the file, while `+ New stack` on the Stacks page *does*
   have a handler. The whole create flow was undesigned, which is why §3.5 has
   five decisions and marks its one invented value as invented.
3. **There is a sixth page.** The habit *name* is a link to a per-habit detail
   view. Invisible in a screenshot — a link looks like bold text — so §2's
   original critic pass looked straight at it. Now roadmap §2b (§6).
4. **The schedule label was wrong in two ways at once**, and only against the
   target: the separator, and Mon–Fri not collapsing to `Weekdays` (§3.4).

The critic round then caught the two that mattered most operationally: **this
page had zero component test coverage** (R1), so extracting the edit form had no
regression net under it; and **`HabitService.add` returns `void`** (R11), so the
modal could have created habits that silently dropped their colour, icon,
category, notes and start date. R11 is the more interesting catch — the plan had
*already written* `const created = this.habitService.add(...)` plus an "If
blocked" clause telling the executor to stop if `add` did not return a habit.
Left alone, the run would have halted correctly, twelve steps in, on something
one `grep` at planning time removed. **L-013 in reverse: the stop clause works,
but a stop clause is not a substitute for opening the file the plan assumes.**

**Did anything in `tasks.md` turn out to be wrong during coding?**

Nothing in the steps themselves; two things in the *process* around them.

- **The executor declared Step 6 done with a failing "Done when".** Its grep for
  raw hex in the extracted `habit-form.component.scss` had to return zero; the
  file carried 29 literals and it moved on anyway, then reported the step
  complete. Caught by re-running the step's own checks at the top level rather
  than trusting the report. Remediated by **Step 7b**, which supplies an
  exhaustive literal→token mapping table instead of leaving "replace hex with
  the matching token" as a judgement call — most of those 29 were *pre-AD-009*
  values (`#ccc`, `#555`, `#222`, `#f0f0f0`) that had never been on the palette,
  which is precisely why a small model would not know what to map them to.
- **The step-by-step test counts drifted and are the wrong instrument.** Step 8
  sub-step 0 said "add one spec"; the executor instead strengthened the three
  *existing* `add` specs with the return-value assertions — better coverage,
  same `it` count — so the run finished at 163 against a predicted 165 while
  every intended assertion existed. An absolute total makes a silently skipped
  suite visible (`TEMPLATE.md`), but it also manufactures a phantom failure
  whenever coverage lands in an existing spec. **Predict the assertions, not the
  `it` count** — or state the total as a floor.

**What the design check settled that no spec could.** The `Morning run` row's
meta line wraps onto two lines (`Mon · Wed ·` / `Fri`, `2`/`🔥` and `best`/`14`
stacked, `NOT TODAY` broken across two lines, the whole row taller than its
five neighbours) — and it does so in the **target** too. §3.6 predicted this
from the source's CSS and told the executor in advance not to "fix" it; the
composite confirms the built row is equivalent to the target's, wrap and all.
Writing that prediction down was what stopped a design-check round from
"correcting" the page away from the mockup.

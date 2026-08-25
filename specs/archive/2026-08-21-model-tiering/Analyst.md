# Analyst — Model tiering for `tasks.md` runs

**Size: Medium.** Clear feature, 9 steps, no new pattern — the design-spec
backfills copy `calendar.design.spec.ts` and the hook change extends a script
that already exists. One harden round (`CriticReview.md`).

---

## 1. Why

A forensic pass over the completed `stacks` run (17 steps) measured where the
money went:

| Scope | Turns | Output | Cache read | Cost |
|---|---|---|---|---|
| Orchestrator (Opus 5) | 519 | 492k | 33.6M | **$45.01** |
| Orchestrator (Sonnet 5) | 39 | 14k | 2.5M | $2.38 |
| 15 Haiku subagents | 1,333 | 229k | 69.2M | $12.88 |

The originating suspicion — that steps were secretly executing on Opus — is
**disproven**. All 15 `Agent` spawns passed `"model":"haiku"`; all 15 subagent
transcripts are 100% `claude-haiku-4-5-20251001` across 1,333 turns. The
screenshot showing `opus` in the status line is the session's *configured*
model, not the serving model of the running subagent. `message.model` in the
transcript is the only authority (→ L-038).

Delegation works: subagents read **twice** the cache for **a quarter** the cost.
The problem is the other side. The orchestrator is 75% of ~$60 because nothing
stops it re-verifying every step by hand. Its 211 Bash calls:

| Kind | Calls | Needs vision? |
|---|---|---|
| read / inspect / other | 152 | no |
| git | 19 | no |
| **design-shot** | **18** | **yes** |
| test | 15 | no |
| server-check | 4 | no |
| build | 3 | no |

**189 of 211 are pure text.** `enforce-haiku-tasks-pretooluse.sh` already denies
top-level *writes* to protected paths during a run, but its own comments say
reads and `npx ng test` "must stay allowed". So the guard stops the orchestrator
writing code and does nothing about it verifying everything itself — which is
exactly where the money went. `TEMPLATE.md`'s **Done when** already instructs
the subagent to run `npm test`; the orchestrator re-running it is duplicated
work, not extra safety.

**Intended outcome:** textual step work on Haiku, visual judgement on Sonnet,
the orchestrator deciding rather than doing — and fewer checks depending on any
model's eyesight at all.

## 2. Findings that shaped the plan

### 2.1 The verification commands never reach the hook's write logic

`npx ng test`, `npx ng build` and `npm run design:shot -- …` name no path
matching `protected_re` (`src/`, `scripts/`, `.claude/hooks/`, `*.json`), so
they exit at **stage 1**, long before the stage-2 write test. Only
`node scripts/design-shot.mjs` reaches stage 2, and passes as a non-write.

A naive "stage 0" ahead of everything would work but loses precedence: it would
let `npm test > src/app/out.log` ASK instead of DENY. **Decision (AD-033):**
compute `is_verify` immediately after `command` is extracted, then convert
stage 1's and stage 2's `exit 0` into "ask if verify, else exit 0", leaving deny
as the fall-through. A redirect into a protected path then still denies.

Anchor `verify_re` to a command position (`^`, `;`, `&`, `|`, `(`) so
`grep -rn "npm test" specs/` and `cat scripts/design-shot.mjs` stay allowed.
Known false negative: a wrapper prefix (`time npm test`) slips through.
Acceptable — the decision is ASK, not DENY.

`npm start` is deliberately **not** matched: the dev server is cheap and
`design:shot` requires it already running.

### 2.2 The test harness cannot express a third outcome

`.claude/hooks/enforce-haiku-tasks.test.sh:61` collapses the verdict to
`[[ -z "$out" ]] && ALLOW || DENY`. An `ask` would be silently misread as DENY —
the matrix would report green while testing nothing. `run()` must parse
`.hookSpecificOutput.permissionDecision` and assert three-way.

Keep the armed-guard at lines 51–55 verbatim. It is what stops the whole matrix
inverting into meaningless passes — that already happened once to
`calendar-redesign`, where all 8 DENY cases reported ALLOW.

### 2.3 The design oracle is not in the repo

`calendar.design.spec.ts` cites `Habit Tracker Prototype.dc.html` as its source.
That file lives in the **Claude Design** project *Habit tracker design
exploration* (`7089b0b3-0042-4029-bd4c-bef0ce5a6d19`), not in git. The archived
Analysts preserved it unevenly: dashboard kept 18 hexes, habits kept 5,
**habit-detail kept none**. Since L-022 forbids sourcing expected values from
the component SCSS, habit-detail had no usable oracle at all.

**A Haiku executor cannot reach the Claude Design MCP mid-step.** Oracle
derivation therefore happened during *this* spec-writing pass, and the values
live in `tasks.md` → `## Reference values used across steps`, exactly as
`specs/archive/2026-08-21-stacks/tasks.md` did. The prototype is HTML text, not
an image, so no vision was needed and all three backfills stay Haiku-eligible.

**This gate is now closed.** Prototype lines 1–337 were read and every value the
three backfills need is transcribed. Lines 338–600 are the stacks page only,
already covered by `specs/archive/2026-08-21-stacks/`.

### 2.4 Data-bound values have no CSS oracle

The single largest trap in this spec. Values written `{{ expr }}` in the
prototype are inline-bound per item; there is no CSS rule to assert, and a
probe-based assertion on them **passes vacuously** — it looks like coverage and
tests nothing. Per page:

- **dashboard** — the colour dot `{{ h.hex }}` is bound. But the three row tints
  are **literal** (`#fff` / `#f4fbf6` / `#fdf4f4` with `#dcdcd9` / `#22c55e` /
  `#ef4444` left borders), which is what makes `done` assertable, and
  `last-done` is literal `12px` / `#75797f`.
- **habits** — checkbox `{{ h.cbBd }}` / `{{ h.cbBg }}`, not-today pill
  `{{ h.ntBg }}` / `{{ h.ntPad }}`, row left border `{{ h.hex }}`, and every
  30-day cell `{{ c.c }}` are all bound.
- **calendar** — every day cell is bound; the **legend swatches are literal**,
  which is precisely what made the existing spec possible.
- **analytics** — bars and dow weights are bound; the **heat ramp and both
  track greys `#f0f0ee` are literal**.
- **habit-detail** — hero tint, every circle's bg/colour/border, activity cells,
  progress fill and Today colour are bound. Literal and assertable: the 40px
  grid columns + 6px gap, 36px/50% circles, 12.5px/600 circle font, the
  56px/800/-2px streak number, `#e8590c` streak label, 52×52/12px glyph tile,
  `rgba(0,0,0,0.12)` divider, `rgba(0,0,0,0.1)` tile border, `#eef0f2` progress
  track at 8px/4px radius, `#f0f0ee` divider rule, 11px activity cells at
  2.5px gap.

### 2.5 Two Plan-agent claims corrected during verification

- **`.not-scheduled` does have a CSS rule** — `habit-list.component.scss:217`.
  The Plan agent reported "no CSS rule anywhere". What is actually missing is
  the *oracle* for two of its declarations: the prototype binds `{{ h.ntBg }}`
  and `{{ h.ntPad }}`, so background and padding cannot be asserted. The
  literal parts (10px, uppercase, `.5px` letter-spacing, 4px radius, `#a3a7ad`)
  can. This is **B-004** — narrower than first stated.
- **The 30-day strip is a child component.** `habit-list.component.html:156`
  renders `<app-day-strip [statuses]="…" [hex]="…" />`; there is no strip markup
  or strip CSS in habit-list. The `--strip-missed` / `--strip-not-due` greys
  belong to that component and are **out of scope** for
  `habit-list.design.spec.ts`.

### 2.6 `/design-check` is already broken mid-run

Its step 6 edits `.scss`. With a `## Executing:` marker live, the pretooluse
hook DENIES a top-level `Edit` to `src/`. A subagent has a non-empty `agent_id`
and exits at line 30 before any of that, so **the agent form is the only working
form of the loop during a run** — moving it into an agent is a bug fix, not an
optimisation.

Pinning that agent to `sonnet` also matters because Haiku degrades *quietly* on
a two-image composite, reporting "looks good" — the worst possible failure mode
for a design check. `design-page-tour`'s rule applies verbatim: **never return
an image to the caller** (~2k tokens each; this run took 18).

### 2.7 A third file contradicts the change

`.claude/hooks/enforce-haiku-tasks-promptsubmit.sh` hardcodes `model: "haiku"`
in its injected `additionalContext`. Left alone it injects a contradiction of
the new template on every execution prompt. Not in the original plan; folded
into Step 1.

## 3. Decisions

**AD-033 — `Model:` is a mandatory step field, enforced by grep.**
Allowed values are `haiku`, `sonnet`, `top-level` — **never `opus`**.
`top-level` is necessary because `protect-spec-docs-from-subagents.sh` denies
subagent writes to `tasks.md` / `Analyst.md` / `CriticReview.md`, so the wrap-up
step cannot be delegated.

An absent field today means the subagent inherits `~/.claude/settings.json`
(`"model": "opus"`, `"effortLevel": "high"`) — the most expensive possible
default. Making absence a visible defect is the entire point, so enforce by
grep in the critic pass rather than by a runtime fallback:

```sh
steps=$(grep -c '^### Step ' tasks.md)
[ "$steps" -gt 0 ] && [ "$(grep -c '^\*\*Model:\*\*' tasks.md)" = "$steps" ]
```

The non-zero guard is load-bearing, not defensive noise: without it a `tasks.md`
whose step headings are written at a different level compares 0 to 0 and the
gate passes vacuously — which is exactly the state this spec's own `tasks.md`
was in when the critic pass found it (CriticReview R3).

If a step with no `Model:` nonetheless reaches the orchestrator, spawn `haiku`
and say so out loud — never inherit the session model.

**One mechanical mapping rule:** *a step is `sonnet` if and only if its
`Done when` requires looking at an image. Everything else is `haiku`.*

**B-004 — the NOT TODAY pill's background and padding have no oracle.** The
prototype binds both. The step must assert only the literal declarations and
must **not** invent the missing two.

## 4. Scope

**Modify** — `specs/TEMPLATE.md`, `CLAUDE.md`,
`.claude/hooks/enforce-haiku-tasks-pretooluse.sh`,
`.claude/hooks/enforce-haiku-tasks.test.sh`,
`.claude/hooks/enforce-haiku-tasks-promptsubmit.sh`,
`.claude/commands/design-check.md`

**Create** — `.claude/agents/design-check.md`,
`src/app/dashboard/dashboard.design.spec.ts`,
`src/app/habit/habit-list.design.spec.ts`,
`src/app/habit-detail/habit-detail.design.spec.ts`

Note the path: the `habits` route loads `src/app/habit/habit-list.component.ts`
(`app.routes.ts`). There is no `src/app/habits/` directory.

**Out of scope** — the 30-day strip's greys (§2.5); the `archived` and
`paused-badge` states, which have no mockup at all; implementing the missing
NOT TODAY declarations (B-004); `~/.claude/scripts/context-report.py`, whose
single-level `glob.glob` hides 100% of subagent spend — a user-level file, not
this repo, recorded so it is not rediscovered.

## 5. Acceptance criteria

1. `./.claude/hooks/enforce-haiku-tasks.test.sh` passes, including three-way ASK
   rows. The armed-guard abort still fires when the marker is removed.
2. `npm test` green, up from the measured **404** baseline by the three new
   design specs' cases.
3. Mutating one colour in `dashboard.component.scss` makes the new spec
   **fail**. A design spec that cannot fail proves nothing.
4. With a marker live, `npx ng test` from the top-level session prompts for
   approval; `npm start` does not.
5. `/design-check dashboard` spawns the Sonnet agent and returns written
   findings with **no image** in the orchestrator's context.
6. Every `### Step` in `tasks.md` carries a `**Model:**` line — grep counts
   equal **and** the step count is non-zero (§3's two-line form; a zero-to-zero
   comparison is not a pass).

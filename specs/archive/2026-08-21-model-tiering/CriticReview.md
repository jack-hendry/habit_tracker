# Critic Review — Model tiering (round 1 of 1)

**Size: Medium**, so one harden round. Every finding below was checked against
the file or the source it cites, not asserted from the plan. Line numbers are
`specs/model-tiering/tasks.md` unless another file is named.

Four findings would break the run as written (R1–R4). Six are corrections that
leave a real gap in the verification (R5–R10). Two are informational (R11–R12).

---

## R1 — Step 2 expects 9 failures; the step produces 8. **(high, run-breaking)**

`Do` item 3 (271–273) adds **four** ASK rows:

```
npm test
npm run build
cd /Users/x && npm test
npm run design:shot -- dashboard --seed
```

`Do` item 2 (267–270) flips **four** existing rows. `Done when` (285–287) then
demands "**exactly 9 FAILED** — the four flipped rows plus the five new ASK
rows". 4 + 4 = **8**.

This is not cosmetic. `If blocked` (292–293) reads "a failure count other than 9
is a stop condition, not something to tune the expectations around" — so a
*correct* execution of Step 2 hits a hard stop, and the only escapes available to
the executor are the two the step explicitly forbids.

**Fix** — say **8**, and "the four flipped rows plus the four new ASK rows".
(Adding a fifth ASK row instead would work, but there is no fifth command worth
covering: `pnpm`/`yarn` are not used in this repo.)

## R2 — The three-way verdict line will not parse. **(medium, run-breaking)**

Line 263:

```bash
got=$(jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"${out:-\{\}}" \
  | tr '[:lower:]' '[:upper:]')
```

Inside `${out:-…}` the backslashes are not an escape — the default expands to the
literal four characters `\{\}`, which is not JSON, so `jq` errors and `got` comes
back empty on exactly the case item 1 calls out ("Empty output must still read as
ALLOW"). Every ALLOW row then fails.

**Fix** — branch explicitly rather than defaulting inside the expansion:

```bash
if [[ -z "$out" ]]; then
  got=ALLOW
else
  got=$(jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$out" \
    | tr '[:lower:]' '[:upper:]')
fi
```

## R3 — The AD-033 grep gate cannot pass, and fails open. **(high, run-breaking)**

The gate appears in three places — `Analyst.md:179`, restated at `tasks.md:212`
(Step 1 item 4) and as AC 6 at `Analyst.md:226`:

```sh
[ "$(grep -c '^\*\*Model:\*\*' tasks.md)" = "$(grep -c '^### Step ' tasks.md)" ]
```

`specs/TEMPLATE.md:58` heads a step `### Step N — …`. **This file heads all nine
of its steps `## Step N — …`** (h2, at 164, 235, 297, 365, 381, 445, 506, 583,
638). Run against this `tasks.md` the gate compares 9 to 0 and fails.

The second half is worse than the first. On any file whose headings do not match
— a renamed heading style, a typo in the pattern, the wrong working directory —
both counts are 0, `0 = 0`, and the gate **passes vacuously**. A gate whose whole
purpose is catching an absent field cannot be one that reports green on a file it
never read.

**Fix, three parts:**
1. Normalise all nine headings in this file to `### Step N — …`, matching
   `specs/TEMPLATE.md:58`.
2. Add a non-zero guard so an empty count cannot satisfy the gate:
   ```sh
   steps=$(grep -c '^### Step ' tasks.md)
   [ "$steps" -gt 0 ] && [ "$(grep -c '^\*\*Model:\*\*' tasks.md)" = "$steps" ]
   ```
3. Carry the guarded form into `Analyst.md` §3 (179) and AC 6 (226) and into
   Step 1 item 4 (212), so the three copies stay identical.

## R4 — Step 7's button probes will be unstyled. **(medium, run-breaking)**

Step 7 item 5 (557–559) asserts the row buttons and Delete's divergence. Both
rules are **descendant** selectors:

- `habit-list.component.scss:257` — `.habit-actions button`
- `habit-list.component.scss:271` — `.habit-actions .delete-button, .habit-actions .delete-button.confirming`

A probe `<button class="delete-button">` appended anywhere else in the host
matches neither: it renders with UA defaults, and every assertion in item 5
either fails outright or — for the properties where a UA default happens to
coincide — passes for the wrong reason. The comment at `scss:268-270` records
that this exact specificity trap already shipped a grey Delete button once.

**Fix** — Step 7 must state that the button probes are appended **inside a
`.habit-actions` probe**, and say why. Note that the `_ngcontent-*` guard Step 5
mandates must be applied to the wrapper as well as the buttons, or the ancestor
is present but unscoped and the descendant rule still misses.

The two safe cases are worth stating in the same breath so the executor does not
over-apply this: `.habit-checkbox` + `&.checked` (112, 137) and `.filter-chip` +
`&.active` (61, 72) compile to **flat compound** selectors — `&` is not nesting
in the descendant sense — so items 2 and 4 need no wrapper.

---

## R5 — Steps 5–7 can leave a mutation in the source. **(should fix)**

Step 5 (433–436) proves the spec can fail by mutating a hex in
`dashboard.component.scss`, then says "revert and confirm green again" in prose.
Steps 6 (496–497) and 7 (571–572) shrink that to "Failure proven by mutation as
in Step 5".

`grep -n 'git diff' tasks.md` returns **nothing**. Not one of the three steps
mechanically confirms the revert landed. A green re-run does not prove it: if the
executor reverts the wrong line, or reverts and then re-applies while iterating,
the suite is green *and* a real design regression is in the working tree — which
is precisely the class of bug these specs exist to catch, introduced by the step
that adds them.

**Fix** — add to each of the three `Done when` blocks:
`git diff --quiet src/app/<dir>/` exits 0 after the mutation is reverted.

## R6 — N, M and P have no floor. **(should fix)**

Step 5 (431) says "green at **404 + N**, N = the number of cases added"; Step 6
(495) "the Step 5 total + M"; Step 7 (570) "the Step 6 total + P". Nothing
constrains N, M or P, so a file with three trivial cases satisfies the criterion
exactly as well as one that covers all of items 2–7. Each step's `Do` list
enumerates roughly 20–30 individual assertions.

**Fix** — state a minimum in each `Done when` (`N ≥ 15`, `M ≥ 18`, `P ≥ 15` are
consistent with the `Do` lists), and keep the "state the exact number" clause.

## R7 — Step 3's deny-string check is an eyeball. **(should fix)**

353–356: "`git diff …` shows no change to the wording of the existing … text
beyond its move into `decide()`". A diff that moves a 60-word string into a
function is exactly the diff a reader skims. The point of the criterion is that
the string is byte-identical, and that is mechanically checkable.

**Fix** — replace with a grep for the exact opening, run against the modified
hook:

```sh
grep -qF 'Per CLAUDE.md, implement tasks.md steps via a Haiku subagent (Agent tool, model: "haiku"), not by editing code directly from the top-level session.' \
  .claude/hooks/enforce-haiku-tasks-pretooluse.sh
```

## R8 — Step 9 item 3 runs `/design-check` with no dev server. **(should fix)**

657 runs `/design-check dashboard` as the smoke test for the new Sonnet agent.
`CLAUDE.md` states `design:shot` "requires the dev server to already be running",
and `Analyst.md:72-73` relies on that same fact to justify leaving `npm start`
out of `verify_re`. The step never says to start it. The smoke test then fails
for a reason unrelated to what it is testing, and the natural next move — the
orchestrator running `npm start` itself — is fine but undocumented.

**Fix** — item 3 states the prerequisite: confirm the dev server on :4200, start
it in the background if absent (`npm start` deliberately does not prompt, per
Step 3 item 1), and seed via `--seed` as `CLAUDE.md` requires.

## R9 — Step 1's `Done when` expects the wrong grep output. **(should fix)**

224–226:

```
grep -rn 'model haiku\|model: "haiku"' CLAUDE.md specs/TEMPLATE.md .claude/hooks/
```
> returns only the selection table's `haiku` cell and this spec.

Two errors. The path list does not include `specs/model-tiering/`, so it cannot
return "this spec" under any circumstance. And the selection table's cell is
`` `haiku` `` — it matches neither alternative in the pattern (grep is
case-sensitive here, so the `**Model:** haiku` lines do not match `model haiku`
either). After items 5 and 6 land, the correct expectation is that the grep
returns **nothing** and exits 1.

**Fix** — "returns no matches (exit status 1)". Keep the separate
`grep -n 'Model:' specs/TEMPLATE.md` line at 222–223, which is what actually
proves the field was added.

## R10 — Step 7's strip check does not assert what it means. **(should fix)**

574–575 expects `grep -n 'strip'` to return "only the `--strip-not-due`
token-identity line and the comment explaining the scope". Comment wording is not
predictable in advance, so the criterion cannot be evaluated without judgement,
and it is the *stated intent* (§2.5: the strip is a child component and out of
scope) that matters.

**Fix** — assert the thing directly: the file queries no `.day-strip` or
`app-day-strip` selector, and imports nothing from the day-strip component.
`--strip-not-due` may appear only in item 7's `:root` token-identity read.

---

## R11 — Informational: the nesting hazard is confined to habit-list.

R4 was checked against all three target stylesheets, not assumed:

- `dashboard.component.scss:76-175` — `.habit-row` and its `&.done` / `&.lapsed`,
  `.tick`, `.dot`, `.name`, `.last-done`, `.rate` are all flat and top-level.
  **Step 5 probes may be appended anywhere in the host.**
- `habit-detail.component.scss` — flat throughout except `.card-title` (267,
  under `.summary-card`), which Step 6 does not assert. **No hazard.**

One incidental note for Step 6: `.month-grid` is declared **twice** (197 and
215). That is an argument *for* the `getComputedStyle` approach the step already
mandates — only the resolved cascade says which declaration wins — and against
ever transcribing from the stylesheet, which L-022 forbids anyway.

## R12 — Informational: Step 2 item 4's rationale is backwards.

276–278 justifies the `./.claude/hooks/enforce-haiku-tasks.test.sh` ALLOW row as
"names `.claude/hooks/…` so it hits stage 1". `.claude/hooks` **is** in
`protected_re` (pretooluse hook line 64), so the command *matches* at stage 1 and
therefore does **not** exit there — it falls through to stage 2, carries no write
token, and exits 0 as a read.

The row's expected verdict is right, and it stays right after Step 3 (stage 2's
converted `exit 0` asks only when `is_verify`, and `verify_re` does not match
`.test.sh`). Only the explanation is wrong, and it is the kind of wrong that
makes an executor "fix" a correct row.

**Fix** — "matches `protected_re` at stage 1, so it reaches stage 2, where it
carries no write token and exits as a read."

---

## Verified OK — checked, no change needed

- **`verify_re`'s command-position anchor (322–327) is correct as written.** It
  matches `cd /Users/x && npm test` (the second `&` satisfies `[;&|(]`), and
  skips `grep -rn "npm test" specs/` (preceded by `"`) and
  `cat scripts/design-shot.mjs` (not at a command position). It does not match
  `./.claude/hooks/enforce-haiku-tasks.test.sh`.
- **Step 9's ordering is sound.** The live hook smoke test (item 2, 654–656)
  precedes marker removal (item 8, 683). Reversed, the hook would be dormant and
  item 2 would report a false pass.
- **Step 4's checkpoint claim is accurate.** Steps 1–3 modify exactly
  `enforce-haiku-tasks-promptsubmit.sh`, `enforce-haiku-tasks.test.sh` and
  `enforce-haiku-tasks-pretooluse.sh`, so `git diff --stat` touching only those
  three plus the docs is the right expectation.
- **The sequential-only declaration is right.** Steps 5–7 have no `Depends on`
  cycle and share no `Files` entry, but each `Done when` chains a cumulative test
  count (404 + N → + M → + P), which is a genuine ordering dependency the
  parallel rules in `specs/TEMPLATE.md` do not cover.
- **B-004's scope is correctly narrow.** `.not-scheduled` does have a rule
  (`habit-list.component.scss:217`); only `background: var(--pill-muted-bg)` and
  `padding: 3px 7px` lack an oracle, and Step 7 item 3 forbids exactly those two.

---

## Disposition

R1–R4 must be applied before Step 1 starts. R5–R10 and R12 are edits to
`tasks.md` in the same pass. R3 additionally edits `Analyst.md` §3 (179) and
AC 6 (226). R11 needs no edit; it is recorded so the next reader does not
re-derive it.

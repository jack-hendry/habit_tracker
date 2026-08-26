#!/usr/bin/env python3
"""Rotate aged AD/B entries out of specs/STATE.md into specs/STATE-ARCHIVE.md.

STATE.md is project memory, read at the start of every session, so its size is a
running cost rather than a filing preference. Rule 3 of "Rules for this file"
puts the budget at ~300 lines and says old `AD` / `B` entries move to the
archive leaving a one-line stub behind. This script is that rule, executable.

Two modes, and the split is the point:

    --check   Report only. Never writes. Exits non-zero when STATE.md is over
              budget. This is the mode the pre-push hook and CI run.
    --apply   Perform the move. Only ever run by a human who has decided to
              rotate.

The hook never runs --apply. A gate that rewrites your files while you push is a
gate you stop trusting: clean-table-check.sh checks and refuses, it does not
edit on your behalf, and this follows it.

What never moves:

  * Lesson headlines (`L-NNN`). They are permanent under rule 3, and their
    bodies live in LESSONS.md where the pre-push lessons gate keeps the two in
    correspondence. Rotating a headline would break that gate.
  * Entries already rotated — they end in the stub marker.
  * Anything outside the Decisions and Blockers sections.

Numbers are never renumbered: `AD-003` means the same thing forever so other
documents can cite it. A moved entry leaves a stub in place, so "supersedes
AD-004" stays resolvable from STATE.md alone without opening the archive.

Oldest-first is by the entry's own date — every entry is dated under rule 4 —
not by position in the file, because entries are appended in the order they were
written, not the order they aged.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_STATE = REPO_ROOT / "specs" / "STATE.md"
DEFAULT_ARCHIVE = REPO_ROOT / "specs" / "STATE-ARCHIVE.md"

DEFAULT_BUDGET_LINES = 300
STUB_SUFFIX = "→ moved to `STATE-ARCHIVE.md`"

# Section heading -> the entry prefix that lives under it. A section not listed
# here is never touched, which is what keeps Lessons, Quick Tasks, Phases and
# Notes out of the rotation.
ROTATABLE_SECTIONS = {"Decisions": "AD", "Blockers": "B"}

ENTRY_RE = re.compile(r"^\*\*(AD|B)-(\d{3}) ")
HEADING_RE = re.compile(r"^## +(.+?)\s*$")
# The date that opens an entry body: "(2026-07-17, Phases 2-3)" or "(2026-07-23,
# resolved)". Anchored to a "(" so a date inside prose does not win.
DATE_RE = re.compile(r"\((\d{4})-(\d{2})-(\d{2})[,)]")

# Sorts undated entries after every dated one instead of pretending they are
# ancient. An undated entry is a rule-4 violation, not an old entry.
NO_DATE = (9999, 99, 99)


@dataclass
class Entry:
    """One `**AD-NNN — title**` block and everything under it up to the next."""

    prefix: str
    number: int
    section: str
    start: int  # index into the source lines, inclusive
    end: int  # exclusive, trailing blank lines already stripped
    lines: list[str]

    @property
    def label(self) -> str:
        return f"{self.prefix}-{self.number:03d}"

    @property
    def title(self) -> str:
        """The bold headline, collapsed to one line — it may wrap in the source."""
        text = " ".join(self.lines)
        match = re.search(r"\*\*(.+?)\*\*", text, re.DOTALL)
        headline = match.group(1) if match else text
        return " ".join(headline.split())

    @property
    def is_stub(self) -> bool:
        return " ".join(self.lines).rstrip().endswith(STUB_SUFFIX)

    @property
    def date(self) -> tuple[int, int, int]:
        match = DATE_RE.search(" ".join(self.lines))
        if not match:
            return NO_DATE
        return (int(match.group(1)), int(match.group(2)), int(match.group(3)))

    @property
    def date_str(self) -> str:
        return "undated" if self.date == NO_DATE else "{:04d}-{:02d}-{:02d}".format(*self.date)

    def stub_line(self) -> str:
        return f"**{self.title}** {STUB_SUFFIX}"


def read_lines(path: Path) -> list[str]:
    try:
        return path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        sys.exit(f"state_rotate: no such file: {path}")


def strip_trailing_blanks(lines: list[str], end: int, start: int) -> int:
    """Walk `end` back past blank lines, never before `start` + 1."""
    while end > start + 1 and not lines[end - 1].strip():
        end -= 1
    return end


def parse_entries(lines: list[str]) -> list[Entry]:
    """Every AD/B entry under a rotatable section, in file order.

    An entry runs from its bold headline to the next headline or the next `## `,
    whichever comes first. Blank lines at the tail belong to the separation
    between entries, not to the entry, so they are trimmed.
    """
    entries: list[Entry] = []
    section: str | None = None
    open_entry: Entry | None = None

    def close(end: int) -> None:
        nonlocal open_entry
        if open_entry is None:
            return
        real_end = strip_trailing_blanks(lines, end, open_entry.start)
        open_entry.end = real_end
        open_entry.lines = lines[open_entry.start : real_end]
        entries.append(open_entry)
        open_entry = None

    for i, line in enumerate(lines):
        heading = HEADING_RE.match(line)
        if heading:
            close(i)
            section = heading.group(1)
            continue

        match = ENTRY_RE.match(line)
        if match and section in ROTATABLE_SECTIONS:
            close(i)
            # A `B-NNN` under Decisions (or vice versa) is a filing mistake, not
            # something to silently rotate into the wrong archive section.
            if match.group(1) != ROTATABLE_SECTIONS[section]:
                continue
            open_entry = Entry(
                prefix=match.group(1),
                number=int(match.group(2)),
                section=section,
                start=i,
                end=i + 1,
                lines=[],
            )

    close(len(lines))
    return entries


def select(entries: list[Entry], total_lines: int, budget: int) -> list[Entry]:
    """Oldest-first, only as many as it takes to get under budget.

    Each moved entry collapses to a one-line stub, so it frees `len(lines) - 1`
    lines. Stop the moment the projection fits: rotating more than the budget
    demands would push still-relevant decisions behind a pointer for nothing.
    """
    candidates = sorted(
        (e for e in entries if not e.is_stub),
        key=lambda e: (e.date, e.prefix, e.number),
    )

    selected: list[Entry] = []
    projected = total_lines
    for entry in candidates:
        if projected <= budget:
            break
        projected -= len(entry.lines) - 1
        selected.append(entry)
    return selected


def rewrite_state(lines: list[str], selected: list[Entry]) -> list[str]:
    """Replace each selected entry block with its stub line, in place."""
    by_start = {e.start: e for e in selected}
    out: list[str] = []
    i = 0
    while i < len(lines):
        entry = by_start.get(i)
        if entry is None:
            out.append(lines[i])
            i += 1
            continue
        out.append(entry.stub_line())
        i = entry.end
    return out


def insert_into_archive(lines: list[str], selected: list[Entry]) -> list[str]:
    """Merge entries into the archive's matching section, in numeric order.

    Numeric rather than append order so the archive stays readable as a
    numbered record — a reader chasing "AD-004" scans, they do not grep.
    """
    wanted = {e.section for e in selected}
    out: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        heading = HEADING_RE.match(lines[i])
        if not heading or heading.group(1) not in wanted:
            out.append(lines[i])
            i += 1
            continue

        section = heading.group(1)
        out.append(lines[i])
        i += 1

        # Consume the whole section body up to the next `## `.
        body_start = i
        while i < n and not HEADING_RE.match(lines[i]):
            i += 1
        body = lines[body_start : strip_trailing_blanks(lines, i, body_start - 1)]

        existing = parse_entries([f"## {section}", *body])
        incoming = sorted(
            (e for e in selected if e.section == section),
            key=lambda e: e.number,
        )

        # Offset by one for the synthetic heading prepended above.
        first_entry = existing[0].start - 1 if existing else len(body)
        prose = [ln for ln in body[:first_entry] if ln.strip()]
        # "*(none yet)*" is a placeholder for an empty section, not content.
        prose = [ln for ln in prose if ln.strip() != "*(none yet)*"]

        blocks = [(e.number, e.lines) for e in existing]
        blocks += [(e.number, e.lines) for e in incoming]
        blocks.sort(key=lambda b: b[0])

        out.append("")
        for line in prose:
            out.append(line)
            out.append("")
        for index, (_, block) in enumerate(blocks):
            out.extend(block)
            if index != len(blocks) - 1:
                out.append("")
        out.append("")

    return out


def report(path: Path, total: int, budget: int, selected: list[Entry], rotatable: int) -> None:
    over = total - budget
    print(f"state_rotate: {path} is {total} lines, budget {budget} ({over} over)")

    if not selected:
        print("  Nothing left to rotate — every AD/B entry is already a stub.")
        print("  The overage is in content this script never moves (lessons,")
        print("  Quick Tasks, phases, the header). Raise the budget or prune by hand.")
        return

    freed = sum(len(e.lines) - 1 for e in selected)
    print(f"  Rotate {len(selected)} of {rotatable} live entries, freeing {freed} lines:")
    for entry in selected:
        print(f"    {entry.label}  {entry.date_str}  {len(entry.lines):>3} lines")

    landing = total - freed
    if landing > budget:
        print(f"  Still {landing - budget} lines over afterwards — see the note above.")
    print("  Fix: python3 tools/state_rotate.py --apply")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Rotate aged AD/B entries from STATE.md into STATE-ARCHIVE.md.",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--check",
        action="store_true",
        help="report only, never write; exit 1 if over budget (the hook uses this)",
    )
    mode.add_argument("--apply", action="store_true", help="perform the move")
    parser.add_argument("--budget", type=int, default=DEFAULT_BUDGET_LINES)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    args = parser.parse_args(argv)

    state_lines = read_lines(args.state)
    total = len(state_lines)
    entries = parse_entries(state_lines)
    rotatable = sum(1 for e in entries if not e.is_stub)

    if total <= args.budget:
        print(f"state_rotate: {args.state} is {total} lines, budget {args.budget} — ok")
        return 0

    selected = select(entries, total, args.budget)

    if args.check:
        report(args.state, total, args.budget, selected, rotatable)
        return 1

    if not selected:
        report(args.state, total, args.budget, selected, rotatable)
        return 1

    archive_lines = read_lines(args.archive)
    new_state = rewrite_state(state_lines, selected)
    new_archive = insert_into_archive(archive_lines, selected)

    args.state.write_text("\n".join(new_state) + "\n", encoding="utf-8")
    args.archive.write_text("\n".join(new_archive) + "\n", encoding="utf-8")

    print(f"state_rotate: moved {len(selected)} entries to {args.archive}")
    for entry in selected:
        print(f"  {entry.label}  {entry.date_str}")
    print(f"state_rotate: {args.state} is now {len(new_state)} lines (budget {args.budget})")
    if len(new_state) > args.budget:
        print("  Still over budget — nothing rotatable left.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

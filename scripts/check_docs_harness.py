#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import re
from pathlib import Path

DATE_RE = re.compile(r"^Last verified:\s*(\d{4}-\d{2}-\d{2})\s*$", re.MULTILINE)
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")

REQUIRED_QUALITY_HEADINGS = [
    "## Scoring Scale",
    "## Domain Scorecard",
    "## Architecture Layer Scorecard",
    "## Top Risks",
    "## Weekly KPI",
    "## Next Review",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate docs harness structure and freshness")
    parser.add_argument("--max-age-days", type=int, default=90)
    return parser.parse_args()


def err(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def validate_required_paths(root: Path, errors: list[str]) -> None:
    required = [
        root / "docs" / "index.md",
        root / "docs" / "QUALITY_SCORE.md",
        root / "docs" / "templates" / "QUALITY_SCORE_TEMPLATE.md",
        root / "docs" / "plans" / "active",
        root / "docs" / "plans" / "completed",
        root / "docs" / "plans" / "tech-debt.md",
    ]
    for path in required:
        if not path.exists():
            err(f"Missing required docs path: {path.relative_to(root)}", errors)


def validate_freshness(root: Path, max_age_days: int, errors: list[str]) -> None:
    today = dt.date.today()
    for rel in ["docs/index.md", "docs/plans/tech-debt.md", "docs/QUALITY_SCORE.md"]:
        path = root / rel
        if not path.exists():
            continue

        content = path.read_text(encoding="utf-8")
        match = DATE_RE.search(content)
        if not match:
            err(f"Missing 'Last verified: YYYY-MM-DD' in {rel}", errors)
            continue

        try:
            verified_on = dt.date.fromisoformat(match.group(1))
        except ValueError:
            err(f"Invalid Last verified date format in {rel}: {match.group(1)}", errors)
            continue

        age = (today - verified_on).days
        if age > max_age_days:
            err(
                f"Stale docs freshness marker in {rel}: {verified_on} ({age} days old, max {max_age_days})",
                errors,
            )


def validate_quality_score_structure(root: Path, errors: list[str]) -> None:
    path = root / "docs" / "QUALITY_SCORE.md"
    if not path.exists():
        return

    content = path.read_text(encoding="utf-8")
    for heading in REQUIRED_QUALITY_HEADINGS:
        if heading not in content:
            err(f"docs/QUALITY_SCORE.md missing required heading: {heading}", errors)


def validate_agents_index_link(root: Path, errors: list[str]) -> None:
    agents = root / "AGENTS.md"
    if not agents.exists():
        err("Missing AGENTS.md", errors)
        return

    content = agents.read_text(encoding="utf-8")
    if "docs/index.md" not in content:
        err("AGENTS.md must reference docs/index.md", errors)


def is_external(link: str) -> bool:
    return (
        link.startswith("http://")
        or link.startswith("https://")
        or link.startswith("mailto:")
        or link.startswith("#")
    )


def validate_index_links(root: Path, errors: list[str]) -> None:
    index_path = root / "docs" / "index.md"
    if not index_path.exists():
        return

    content = index_path.read_text(encoding="utf-8")
    for raw in LINK_RE.findall(content):
        link = raw.strip()
        if is_external(link):
            continue

        target = link.split("#", 1)[0].strip()
        if not target:
            continue

        if target.startswith("/"):
            err(f"Absolute path link is not allowed in docs/index.md: {link}", errors)
            continue

        resolved = (index_path.parent / target).resolve()
        if not resolved.exists():
            err(f"Broken docs/index.md link: {link}", errors)


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parent.parent
    errors: list[str] = []

    validate_required_paths(root, errors)
    validate_freshness(root, args.max_age_days, errors)
    validate_quality_score_structure(root, errors)
    validate_agents_index_link(root, errors)
    validate_index_links(root, errors)

    if errors:
        print("Docs harness check failed:")
        for message in errors:
            print(f"- {message}")
        return 1

    print("Docs harness check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

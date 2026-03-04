# Plans Lifecycle

Last verified: 2026-03-05

Use plans as the execution record for multi-step work.

## Folders

- `docs/plans/active/`: plans in progress
- `docs/plans/completed/`: finished plans
- `docs/plans/tech-debt.md`: ongoing debt register

## Lifecycle

1. Create a plan in `active/` using `active/TEMPLATE.md`.
2. Update tasks and decision log as work progresses.
3. When complete, move the plan file to `completed/`.
4. Update `tech-debt.md` if debt status changed.

## Naming

- Prefer `YYYY-MM-DD-short-topic.md` for plan files.
- Keep one plan per cohesive workstream.

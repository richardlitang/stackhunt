# Repo Structure Cleanup

Last verified: 2026-06-18

## Goal

Reduce flat directories, remove stale generated artifacts, delete verified unused UI code, and make future feature work easier to navigate without changing published behavior.

## Scope

In scope:

- Remove tracked generated output that should not live in git.
- Delete components and local icons that have no live source imports.
- Reorganize large flat directories into domain folders while preserving stable public imports.
- Update tests, guard scripts, and docs affected by file moves.

Out of scope:

- Schema changes.
- Product behavior changes.
- Broad rewrites of `src/pages/tool/[slug].astro`, `src/pages/best/[slug].astro`, or `src/lib/hunter/phases/persistence.ts`.
- Deleting manual operations scripts unless a dedicated verification pass proves they are obsolete.

## Findings

- `src/lib/tool-page` has 189 flat files and is already tracked as `tool-page-mega-namespace` debt.
- `src/components` has 73 flat files that mix shared components, tool-page sections, pricing widgets, compare sections, and React islands.
- `scripts` has 93 files with core CLIs, QA gates, backfills, reports, one-off maintenance, and migration helpers in one directory.
- `.lighthouseci` contains tracked generated Lighthouse reports.
- Several UI components and local icon wrappers have no live imports from source, tests, scripts, or current package scripts.

## Target Shape

### `src/lib/tool-page`

Move implementation modules into domain folders while keeping `src/lib/tool-page/index.ts` as the compatibility barrel:

- `alternatives/`
- `data/`
- `decision/`
- `evidence/`
- `navigation/`
- `policy/`
- `pricing/`
- `presentation/`
- `route-state/`
- `runtime/`
- `sections/`
- `shared/`

### `src/components`

Move components by product surface:

- `tool-page/`
- `compare/`
- `pricing/`
- `interactive/`
- `shared/`
- `ui/`
- `icons/`

### `scripts`

Defer physical script moves until package commands and ops docs can be updated in one slice:

- `core/`
- `qa/`
- `backfills/`
- `db/`
- `reports/`
- `maintenance/`
- `dev/`
- `lib/`

## Execution Order

1. Remove tracked generated artifacts and update ignore rules.
2. Delete verified unused UI components and local icons.
3. Move low-risk component groups and update imports.
4. Move `src/lib/tool-page` in small domain batches, keeping compatibility exports.
5. Update tests to mirror source domains after source moves are stable.
6. Reclassify scripts and move only the groups referenced by package scripts or docs in the same commit.
7. Run focused tests after each structural slice, then `npm run typecheck`, `npm run build`, and the project QA gate before final push.

## Validation

Minimum checks:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Before pushing:

- `npm run qa:prepush`
